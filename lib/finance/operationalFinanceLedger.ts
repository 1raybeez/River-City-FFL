import {
  LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS,
  OPERATIONAL_FINANCE_SEASON_2026,
  calculateChampionPayout,
  validateRingExpense,
} from "@/lib/finance/operationalFinanceRules";
import type { OperationalFinanceProposal } from "@/lib/finance/operationalFinanceProposals";
import type {
  OperationalFinanceActor,
  OperationalFinanceAuditEvent,
  OperationalFinanceDuesStatus,
  OperationalFinanceFundingSource,
  OperationalFinanceIdempotencyRecord,
  OperationalFinanceLedgerRepository,
  OperationalFinanceLedgerTransaction,
  OperationalFinanceMigrationRecord,
  OperationalFinanceObligation,
  OperationalFinanceObligationCategory,
  OperationalFinanceReversal,
  OperationalFinanceSeasonLedger,
  OperationalFinanceSettlement,
  OperationalFinanceSettlementDirection,
  OperationalFinanceTotals,
} from "@/lib/finance/operationalFinanceLedgerTypes";

export const OPERATIONAL_FINANCE_LEDGER_SCHEMA_VERSION = "2026.1";
export const OPERATIONAL_FINANCE_COLLECTION = "operational_finance_seasons";
export const OPERATIONAL_FINANCE_2026_LEAGUE_ID = "1312149033254416384";

export type OperationalFinanceMutationResult<T> = Readonly<{
  created: boolean;
  value: T;
}>;

export interface RecordObligationInput {
  readonly obligationId: string;
  readonly season: number;
  readonly category: OperationalFinanceObligationCategory;
  readonly amountCents: number;
  readonly fundingSource: OperationalFinanceFundingSource;
  readonly franchiseId: string | null;
  readonly financialOwnerId: string | null;
  readonly proposalKey?: string | null;
  readonly duePolicy?: "before-draft" | null;
  readonly dueAt?: string | null;
  readonly ruleRef: string;
  readonly ruleProvenance: OperationalFinanceObligation["ruleProvenance"];
  readonly sourceRef: string;
  readonly replacesObligationId?: string | null;
  readonly replacementForReversalId?: string | null;
}

export interface RecordSettlementInput {
  readonly season: number;
  readonly obligationId: string;
  readonly direction: OperationalFinanceSettlementDirection;
  readonly amountCents: number;
  readonly paymentMethod: "venmo";
  readonly actualPaidAt: string | null;
  readonly externalReference?: string | null;
  readonly commissionerNote?: string | null;
  readonly sourceRef: string;
}

export interface RecordExpenseInput {
  readonly season: 2026;
  readonly category: "championship-ring" | "auctioneer-food";
  readonly amountCents: number;
  readonly approvedRingCapOverrideCents?: number;
  readonly sourceRef: string;
}

export interface OperationalFinanceMigrationPlan {
  readonly season: 2026;
  readonly assessments: readonly RecordObligationInput[];
  readonly settlements: readonly Readonly<{
    financialOwnerId: string;
    obligationId: string;
    amountCents: 5000;
    paymentMethod: "venmo";
    actualPaidAt: null;
    idempotencyKey: string;
    sourceRef: string;
  }>[];
  readonly assessedCents: number;
  readonly collectedCents: number;
  readonly outstandingCents: number;
  readonly deletes: 0;
  readonly legacyMutations: 0;
}

const AWARD_CATEGORIES = new Set<OperationalFinanceObligationCategory>([
  "weekly-high-score",
  "division-winner",
  "third-place",
  "runner-up",
  "champion",
]);
const EXPENSE_CATEGORIES = new Set<OperationalFinanceObligationCategory>([
  "championship-ring",
  "auctioneer-food",
]);
const OBLIGATION_CATEGORIES = new Set<OperationalFinanceObligationCategory>([
  "dues-assessment",
  ...AWARD_CATEGORIES,
  ...EXPENSE_CATEGORIES,
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function requireNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function requireCents(value: number, label: string, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be ${allowZero ? "a non-negative" : "a positive"} integer number of cents.`);
  }
}

function validateActor(actor: OperationalFinanceActor) {
  requireNonEmpty(actor.actorId, "Actor ID");
  if (actor.role !== "commissioner" && actor.role !== "system") {
    throw new Error("Finance actor role is invalid.");
  }
}

function requireCommissioner(actor: OperationalFinanceActor) {
  validateActor(actor);
  if (actor.role !== "commissioner") {
    throw new Error("Commissioner authorization is required for this ledger mutation.");
  }
}

function validateIdempotencyKey(key: string) {
  if (!/^[a-zA-Z0-9:._-]{8,240}$/.test(key)) {
    throw new Error("A stable idempotency key using safe characters is required.");
  }
}

function auditEvent(
  season: number,
  eventType: OperationalFinanceAuditEvent["eventType"],
  actor: OperationalFinanceActor,
  targetType: OperationalFinanceAuditEvent["targetType"],
  targetId: string,
  recordedAt: string,
  reason: string,
  idempotencyKey: string,
  beforeRef: string | null = null,
  afterRef: string | null = null,
  metadata: OperationalFinanceAuditEvent["metadata"] = {}
): OperationalFinanceAuditEvent {
  return deepFreeze({
    eventId: `operational-finance-audit:${idempotencyKey}`,
    season,
    eventType,
    actorId: actor.actorId,
    actorRole: actor.role,
    targetType,
    targetId,
    createdAt: recordedAt,
    reason,
    idempotencyKey,
    beforeRef,
    afterRef,
    metadata: { ...metadata },
  });
}

function idempotencyRecord(
  season: number,
  operation: string,
  targetType: OperationalFinanceIdempotencyRecord["targetType"],
  targetId: string,
  key: string,
  recordedAt: string
): OperationalFinanceIdempotencyRecord {
  return deepFreeze({
    idempotencyKey: key,
    season,
    operation,
    targetType,
    targetId,
    createdAt: recordedAt,
  });
}

export function getDuesObligationId(season: number, franchiseId: string) {
  return `operational-finance-obligation:${season}:dues:${franchiseId}`;
}

export function proposalKeyToObligationId(proposalKey: string) {
  return proposalKey.replace(
    "operational-finance-proposal:",
    "operational-finance-obligation:"
  );
}

export function createOperationalFinanceSeasonLedger(
  recordedAt: string
): OperationalFinanceSeasonLedger {
  return deepFreeze({
    season: 2026,
    schemaVersion: OPERATIONAL_FINANCE_LEDGER_SCHEMA_VERSION,
    rulesVersion: OPERATIONAL_FINANCE_SEASON_2026.schemaVersion,
    status: "open",
    createdAt: recordedAt,
    updatedAt: recordedAt,
    closedAt: null,
    closedBy: null,
    rulesSnapshotHash: `operational-finance-rules:${OPERATIONAL_FINANCE_SEASON_2026.schemaVersion}`,
    financialOwnerMappingVersion: `financial-owner-mappings:${OPERATIONAL_FINANCE_SEASON_2026.schemaVersion}`,
    sourceLeagueId: OPERATIONAL_FINANCE_2026_LEAGUE_ID,
  });
}

async function existingTarget<T>(
  transaction: OperationalFinanceLedgerTransaction,
  key: string,
  expectedOperation: string,
  getter: (targetId: string) => Promise<T | null>
): Promise<OperationalFinanceMutationResult<T> | null> {
  const existing = await transaction.getIdempotency(key);
  if (!existing) return null;
  if (existing.operation !== expectedOperation) {
    throw new Error("Idempotency key was already used for a different operation.");
  }
  const target = await getter(existing.targetId);
  if (!target) throw new Error("Idempotency evidence references a missing target.");
  return deepFreeze({ created: false, value: target });
}

async function putObligation(
  transaction: OperationalFinanceLedgerTransaction,
  input: RecordObligationInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string,
  eventType: "obligation-created" | "obligation-replaced" = "obligation-created"
) {
  validateActor(actor);
  validateIdempotencyKey(idempotencyKey);
  requireCents(input.amountCents, "Obligation amount");
  if (!OBLIGATION_CATEGORIES.has(input.category)) {
    throw new Error("Obligation category is not supported by the operational ledger.");
  }
  if (await transaction.getObligation(input.obligationId)) {
    throw new Error(`Obligation ${input.obligationId} already exists.`);
  }
  const value = deepFreeze<OperationalFinanceObligation>({
    ...input,
    proposalKey: input.proposalKey ?? null,
    duePolicy: input.duePolicy ?? null,
    dueAt: input.dueAt ?? null,
    replacesObligationId: input.replacesObligationId ?? null,
    replacementForReversalId: input.replacementForReversalId ?? null,
    createdAt: recordedAt,
    createdBy: { ...actor },
    idempotencyKey,
    ruleProvenance: input.ruleProvenance.map((entry) => ({ ...entry })),
  });
  await transaction.putObligation(value);
  await transaction.putAuditEvent(
    auditEvent(
      input.season,
      eventType,
      actor,
      "obligation",
      value.obligationId,
      recordedAt,
      eventType === "obligation-replaced"
        ? "Approved replacement obligation recorded without editing the original."
        : "Approved financial obligation recorded.",
      idempotencyKey,
      input.replacesObligationId ?? null,
      value.obligationId,
      { category: value.category, amountCents: value.amountCents }
    )
  );
  await transaction.putIdempotency(
    idempotencyRecord(input.season, eventType, "obligation", value.obligationId, idempotencyKey, recordedAt)
  );
  return value;
}

export async function recordObligation(
  repository: OperationalFinanceLedgerRepository,
  input: RecordObligationInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
): Promise<OperationalFinanceMutationResult<OperationalFinanceObligation>> {
  requireCommissioner(actor);
  return repository.runTransaction(async (transaction) => {
    const duplicate = await existingTarget(
      transaction,
      idempotencyKey,
      "obligation-created",
      (id) => transaction.getObligation(id)
    );
    if (duplicate) return duplicate;
    return deepFreeze({
      created: true,
      value: await putObligation(transaction, input, actor, idempotencyKey, recordedAt),
    });
  });
}

function expectedAwardAmount(proposal: OperationalFinanceProposal) {
  if (proposal.category === "weekly-high-score") return OPERATIONAL_FINANCE_SEASON_2026.weeklyAward.amountCents;
  const placement = OPERATIONAL_FINANCE_SEASON_2026.placementAwards.find(
    (entry) => entry.category === proposal.category
  );
  if (placement) return placement.amountCents;
  if (proposal.category === "division-winner") return OPERATIONAL_FINANCE_SEASON_2026.divisionAwards.amountCents;
  if (proposal.category === "champion") {
    const ringCost = proposal.sourceFacts.approvedRingCostCents;
    const override = proposal.sourceFacts.approvedRingCapOverrideCents;
    if (typeof ringCost !== "number") throw new Error("Champion proposal lacks approved ring cost evidence.");
    return calculateChampionPayout(
      ringCost,
      typeof override === "number" ? override : undefined
    ).championCashCents;
  }
  return null;
}

export async function recordApprovedAwardProposal(
  repository: OperationalFinanceLedgerRepository,
  proposal: OperationalFinanceProposal,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireCommissioner(actor);
  if (proposal.season !== OPERATIONAL_FINANCE_SEASON_2026.season) {
    throw new Error("Proposal season does not match the approved operational finance rules.");
  }
  if (proposal.proposalState !== "proposed" || proposal.amountCents === null) {
    throw new Error("Only a proposed award with a resolved amount may become an obligation.");
  }
  if (!AWARD_CATEGORIES.has(proposal.category as OperationalFinanceObligationCategory)) {
    throw new Error("Proposal category is not an approved award obligation category.");
  }
  const mapping = OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.find(
    (entry) => entry.franchiseId === proposal.franchiseId
  );
  if (!mapping || mapping.financialOwnerId !== proposal.financialOwnerId) {
    throw new Error("Proposal financial identity does not match the approved mapping.");
  }
  const expected = expectedAwardAmount(proposal);
  if (expected === null || proposal.amountCents !== expected) {
    throw new Error("Proposal amount does not match the approved operational rules.");
  }
  const rule =
    proposal.category === "weekly-high-score"
      ? OPERATIONAL_FINANCE_SEASON_2026.weeklyAward
      : proposal.category === "division-winner"
        ? OPERATIONAL_FINANCE_SEASON_2026.divisionAwards
        : OPERATIONAL_FINANCE_SEASON_2026.placementAwards.find(
            (entry) => entry.category === proposal.category
          );
  return recordObligation(
    repository,
    {
      obligationId: proposalKeyToObligationId(proposal.proposalKey),
      season: proposal.season,
      category: proposal.category as OperationalFinanceObligationCategory,
      amountCents: proposal.amountCents,
      fundingSource: "dues-funded",
      franchiseId: proposal.franchiseId,
      financialOwnerId: proposal.financialOwnerId,
      proposalKey: proposal.proposalKey,
      ruleRef: proposal.ruleRef,
      ruleProvenance:
        rule?.provenance ?? OPERATIONAL_FINANCE_SEASON_2026.championshipAllocation.provenance,
      sourceRef: proposal.sourceRef,
    },
    actor,
    idempotencyKey,
    recordedAt
  );
}

export async function recordApprovedExpense(
  repository: OperationalFinanceLedgerRepository,
  input: RecordExpenseInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireCommissioner(actor);
  requireCents(input.amountCents, "Expense amount");
  if (input.category === "championship-ring") {
    const validation = validateRingExpense(
      input.amountCents,
      input.approvedRingCapOverrideCents
    );
    if (!validation.resolved) throw new Error(validation.errors.map((entry) => entry.message).join(" "));
  }
  const isRing = input.category === "championship-ring";
  return recordObligation(
    repository,
    {
      obligationId: `operational-finance-obligation:${input.season}:${isRing ? "championship-ring-expense" : "auctioneer-food"}`,
      season: input.season,
      category: input.category,
      amountCents: input.amountCents,
      fundingSource: isRing ? "dues-funded" : "separately-funded",
      franchiseId: null,
      financialOwnerId: null,
      ruleRef: isRing
        ? OPERATIONAL_FINANCE_SEASON_2026.ringPolicy.id
        : OPERATIONAL_FINANCE_SEASON_2026.expensePolicies[0].id,
      ruleProvenance: isRing
        ? OPERATIONAL_FINANCE_SEASON_2026.ringPolicy.provenance
        : OPERATIONAL_FINANCE_SEASON_2026.expensePolicies[0].provenance,
      sourceRef: input.sourceRef,
    },
    actor,
    idempotencyKey,
    recordedAt
  );
}

function expectedSettlementDirection(obligation: OperationalFinanceObligation) {
  if (obligation.category === "dues-assessment") return "incoming-dues";
  if (AWARD_CATEGORIES.has(obligation.category)) return "outgoing-award";
  return "outgoing-expense";
}

async function putSettlement(
  transaction: OperationalFinanceLedgerTransaction,
  input: RecordSettlementInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  validateActor(actor);
  validateIdempotencyKey(idempotencyKey);
  requireCents(input.amountCents, "Settlement amount");
  if (input.paymentMethod !== "venmo") throw new Error("Venmo is the only approved 2026 payment method.");
  const obligation = await transaction.getObligation(input.obligationId);
  if (!obligation || obligation.season !== input.season) throw new Error("Settlement obligation was not found.");
  const reversals = await transaction.getAllReversals(input.season);
  if (reversals.some((entry) => entry.targetType === "obligation" && entry.targetId === obligation.obligationId)) {
    throw new Error("A reversed obligation cannot receive settlement.");
  }
  const expectedDirection = expectedSettlementDirection(obligation);
  if (
    input.direction !== expectedDirection &&
    !(obligation.category === "auctioneer-food" && input.direction === "incoming-separate-contribution")
  ) {
    throw new Error(`Settlement direction must be ${expectedDirection} for this obligation.`);
  }
  const settlements = await transaction.getAllSettlements(input.season);
  const reversedSettlementIds = new Set(
    reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId)
  );
  const alreadySettled = settlements
    .filter(
      (entry) =>
        entry.obligationId === input.obligationId &&
        entry.direction === expectedDirection &&
        !reversedSettlementIds.has(entry.settlementId)
    )
    .reduce((total, entry) => total + entry.amountCents, 0);
  if (input.direction === expectedDirection && alreadySettled + input.amountCents > obligation.amountCents) {
    throw new Error("Settlement would exceed the active obligation amount.");
  }
  const value = deepFreeze<OperationalFinanceSettlement>({
    settlementId: `operational-finance-settlement:${input.season}:${idempotencyKey}`,
    ...input,
    externalReference: input.externalReference ?? null,
    commissionerNote: input.commissionerNote ?? null,
    recordedAt,
    createdBy: { ...actor },
    idempotencyKey,
  });
  await transaction.putSettlement(value);
  await transaction.putAuditEvent(
    auditEvent(input.season, "settlement-created", actor, "settlement", value.settlementId, recordedAt, "Actual money movement recorded separately from its obligation.", idempotencyKey, input.obligationId, value.settlementId, { amountCents: value.amountCents, direction: value.direction })
  );
  await transaction.putIdempotency(
    idempotencyRecord(input.season, "settlement-created", "settlement", value.settlementId, idempotencyKey, recordedAt)
  );
  return value;
}

export async function recordSettlement(
  repository: OperationalFinanceLedgerRepository,
  input: RecordSettlementInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
): Promise<OperationalFinanceMutationResult<OperationalFinanceSettlement>> {
  requireCommissioner(actor);
  return repository.runTransaction(async (transaction) => {
    const duplicate = await existingTarget(transaction, idempotencyKey, "settlement-created", (id) => transaction.getSettlement(id));
    if (duplicate) {
      const existing = duplicate.value;
      const matchesRequest =
        existing.season === input.season &&
        existing.obligationId === input.obligationId &&
        existing.direction === input.direction &&
        existing.amountCents === input.amountCents &&
        existing.paymentMethod === input.paymentMethod &&
        existing.actualPaidAt === input.actualPaidAt &&
        existing.externalReference === (input.externalReference ?? null) &&
        existing.commissionerNote === (input.commissionerNote ?? null) &&
        existing.sourceRef === input.sourceRef;
      if (!matchesRequest) {
        throw new Error("Idempotency key was already used for a different settlement request.");
      }
      return duplicate;
    }
    return deepFreeze({ created: true, value: await putSettlement(transaction, input, actor, idempotencyKey, recordedAt) });
  });
}

async function putReversal(
  transaction: OperationalFinanceLedgerTransaction,
  season: number,
  targetType: "obligation" | "settlement",
  targetId: string,
  reason: string,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string,
  replacementObligationId: string | null = null
) {
  validateActor(actor);
  validateIdempotencyKey(idempotencyKey);
  requireNonEmpty(reason, "Reversal reason");
  const reversals = await transaction.getAllReversals(season);
  if (reversals.some((entry) => entry.targetType === targetType && entry.targetId === targetId)) {
    throw new Error(`${targetType} is already reversed.`);
  }
  if (targetType === "obligation" && !(await transaction.getObligation(targetId))) throw new Error("Obligation was not found.");
  if (targetType === "settlement" && !(await transaction.getSettlement(targetId))) throw new Error("Settlement was not found.");
  const value = deepFreeze<OperationalFinanceReversal>({
    reversalId: `operational-finance-reversal:${season}:${idempotencyKey}`,
    season,
    targetType,
    targetId,
    replacementObligationId,
    reason,
    createdAt: recordedAt,
    createdBy: { ...actor },
    idempotencyKey,
  });
  await transaction.putReversal(value);
  const eventType = targetType === "obligation" ? "obligation-reversed" : "settlement-reversed";
  await transaction.putAuditEvent(
    auditEvent(season, eventType, actor, "reversal", value.reversalId, recordedAt, reason, idempotencyKey, targetId, replacementObligationId, { targetType })
  );
  await transaction.putIdempotency(
    idempotencyRecord(season, eventType, "reversal", value.reversalId, idempotencyKey, recordedAt)
  );
  return value;
}

export async function reverseObligation(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  obligationId: string,
  reason: string,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireCommissioner(actor);
  return repository.runTransaction(async (transaction) => {
    const duplicate = await existingTarget(transaction, idempotencyKey, "obligation-reversed", async (id) => (await transaction.getAllReversals(season)).find((entry) => entry.reversalId === id) ?? null);
    if (duplicate) return duplicate;
    return deepFreeze({ created: true, value: await putReversal(transaction, season, "obligation", obligationId, reason, actor, idempotencyKey, recordedAt) });
  });
}

export async function reverseSettlement(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  settlementId: string,
  reason: string,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireCommissioner(actor);
  return repository.runTransaction(async (transaction) => {
    const duplicate = await existingTarget(transaction, idempotencyKey, "settlement-reversed", async (id) => (await transaction.getAllReversals(season)).find((entry) => entry.reversalId === id) ?? null);
    if (duplicate) return duplicate;
    return deepFreeze({ created: true, value: await putReversal(transaction, season, "settlement", settlementId, reason, actor, idempotencyKey, recordedAt) });
  });
}

export async function replaceObligation(
  repository: OperationalFinanceLedgerRepository,
  originalObligationId: string,
  replacement: Omit<RecordObligationInput, "replacesObligationId" | "replacementForReversalId">,
  reason: string,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireCommissioner(actor);
  return repository.runTransaction(async (transaction) => {
    const duplicate = await existingTarget(transaction, idempotencyKey, "obligation-replaced", (id) => transaction.getObligation(id));
    if (duplicate) return duplicate;
    const reversalKey = `${idempotencyKey}:reversal`;
    const reversal = await putReversal(transaction, replacement.season, "obligation", originalObligationId, reason, actor, reversalKey, recordedAt, replacement.obligationId);
    const value = await putObligation(
      transaction,
      { ...replacement, replacesObligationId: originalObligationId, replacementForReversalId: reversal.reversalId },
      actor,
      idempotencyKey,
      recordedAt,
      "obligation-replaced"
    );
    return deepFreeze({ created: true, value });
  });
}

export function build2026OpeningDuesMigrationPlan(): OperationalFinanceMigrationPlan {
  const assessments = OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.map(
    (mapping) => ({
      obligationId: getDuesObligationId(2026, mapping.franchiseId),
      season: 2026,
      category: "dues-assessment" as const,
      amountCents: OPERATIONAL_FINANCE_SEASON_2026.entryFeeCents,
      fundingSource: "dues-funded" as const,
      franchiseId: mapping.franchiseId,
      financialOwnerId: mapping.financialOwnerId,
      duePolicy: "before-draft" as const,
      dueAt: null,
      ruleRef: "2026-dues-assessment",
      ruleProvenance: [
        ...OPERATIONAL_FINANCE_SEASON_2026.duesDeadlinePolicy.provenance,
        ...mapping.provenance,
      ],
      sourceRef: "Phase 6.4 — commissioner-approved 2026 opening dues migration",
    })
  );
  const assessmentByOwner = new Map(
    assessments.map((entry) => [entry.financialOwnerId, entry])
  );
  const settlements = LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS.map((paid) => {
    const assessment = assessmentByOwner.get(paid.financialOwnerId);
    if (!assessment) throw new Error(`No dues assessment exists for ${paid.financialOwnerId}.`);
    return {
      financialOwnerId: paid.financialOwnerId,
      obligationId: assessment.obligationId,
      amountCents: 5000 as const,
      paymentMethod: "venmo" as const,
      actualPaidAt: null,
      idempotencyKey: `migration:2026:dues:${paid.financialOwnerId}-paid`,
      sourceRef: "commissioner-confirmed-after-firestore-inventory",
    };
  });
  return deepFreeze({
    season: 2026,
    assessments,
    settlements,
    assessedCents: assessments.reduce((sum, entry) => sum + entry.amountCents, 0),
    collectedCents: settlements.reduce((sum, entry) => sum + entry.amountCents, 0),
    outstandingCents:
      assessments.reduce((sum, entry) => sum + entry.amountCents, 0) -
      settlements.reduce((sum, entry) => sum + entry.amountCents, 0),
    deletes: 0,
    legacyMutations: 0,
  });
}

export async function apply2026OpeningDuesMigration(
  repository: OperationalFinanceLedgerRepository,
  actor: OperationalFinanceActor,
  recordedAt: string
): Promise<OperationalFinanceMutationResult<OperationalFinanceMigrationRecord>> {
  if (actor.role !== "system") throw new Error("Opening migration requires an explicit system actor.");
  const key = "migration:2026:opening-dues-ledger";
  const plan = build2026OpeningDuesMigrationPlan();
  return repository.runTransaction(async (transaction) => {
    const duplicate = await transaction.getIdempotency(key);
    if (duplicate) {
      const record = await transaction.getMigrationRecord(duplicate.targetId);
      if (!record) throw new Error("Migration idempotency evidence references a missing record.");
      return deepFreeze({ created: false, value: record });
    }
    if (!(await transaction.getSeason(2026))) {
      const season = createOperationalFinanceSeasonLedger(recordedAt);
      await transaction.putSeason(season);
      await transaction.putAuditEvent(auditEvent(2026, "season-metadata-created", actor, "season", "2026", recordedAt, "Operational finance season metadata created.", `${key}:season`));
    }
    for (const assessment of plan.assessments) {
      await putObligation(transaction, assessment, actor, `migration:2026:assessment:${assessment.franchiseId}`, recordedAt);
    }
    for (const settlement of plan.settlements) {
      await putSettlement(transaction, {
        season: 2026,
        obligationId: settlement.obligationId,
        direction: "incoming-dues",
        amountCents: settlement.amountCents,
        paymentMethod: settlement.paymentMethod,
        actualPaidAt: null,
        commissionerNote: "Commissioner-confirmed paid state; legacy payment timestamp is non-authoritative.",
        sourceRef: settlement.sourceRef,
      }, actor, settlement.idempotencyKey, recordedAt);
    }
    const value = deepFreeze<OperationalFinanceMigrationRecord>({
      migrationId: "operational-finance-migration:2026:opening-dues-ledger",
      season: 2026,
      migrationType: "2026-opening-dues",
      status: "recorded",
      assessmentCount: 12,
      settlementCount: 5,
      assessedCents: plan.assessedCents,
      collectedCents: plan.collectedCents,
      legacyMutations: 0,
      deletes: 0,
      recordedAt,
      recordedBy: { ...actor },
      sourceRef: "commissioner-confirmed-after-firestore-inventory",
      idempotencyKey: key,
    });
    await transaction.putMigrationRecord(value);
    await transaction.putAuditEvent(auditEvent(2026, "migration-recorded", actor, "migration", value.migrationId, recordedAt, "Twelve dues assessments and five confirmed Venmo settlements migrated without touching legacy evidence.", key, null, value.migrationId, { assessmentCount: 12, settlementCount: 5 }));
    await transaction.putIdempotency(idempotencyRecord(2026, "migration-recorded", "migration", value.migrationId, key, recordedAt));
    return deepFreeze({ created: true, value });
  });
}

function activeRecords(
  obligations: readonly OperationalFinanceObligation[],
  settlements: readonly OperationalFinanceSettlement[],
  reversals: readonly OperationalFinanceReversal[]
) {
  const reversedObligations = new Set(reversals.filter((entry) => entry.targetType === "obligation").map((entry) => entry.targetId));
  const reversedSettlements = new Set(reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId));
  return {
    obligations: obligations.filter((entry) => !reversedObligations.has(entry.obligationId)),
    settlements: settlements.filter((entry) => !reversedSettlements.has(entry.settlementId) && !reversedObligations.has(entry.obligationId)),
  };
}

export function deriveDuesStatus(
  obligations: readonly OperationalFinanceObligation[],
  settlements: readonly OperationalFinanceSettlement[],
  reversals: readonly OperationalFinanceReversal[]
): readonly OperationalFinanceDuesStatus[] {
  const active = activeRecords(obligations, settlements, reversals);
  return deepFreeze(
    active.obligations
      .filter((entry) => entry.category === "dues-assessment")
      .map((assessment) => {
        if (!assessment.franchiseId || !assessment.financialOwnerId) throw new Error("Dues assessment identity is incomplete.");
        const settledCents = active.settlements
          .filter((entry) => entry.obligationId === assessment.obligationId && entry.direction === "incoming-dues")
          .reduce((sum, entry) => sum + entry.amountCents, 0);
        const outstandingCents = assessment.amountCents - settledCents;
        return {
          obligationId: assessment.obligationId,
          franchiseId: assessment.franchiseId,
          financialOwnerId: assessment.financialOwnerId,
          assessedCents: assessment.amountCents,
          settledCents,
          outstandingCents,
          state: settledCents === 0 ? "unpaid" as const : outstandingCents === 0 ? "paid" as const : "partially-paid" as const,
        };
      })
      .sort((first, second) => first.franchiseId.localeCompare(second.franchiseId))
  );
}

export function deriveOperationalFinanceTotals(
  obligations: readonly OperationalFinanceObligation[],
  settlements: readonly OperationalFinanceSettlement[],
  reversals: readonly OperationalFinanceReversal[]
): OperationalFinanceTotals {
  const active = activeRecords(obligations, settlements, reversals);
  const sumObligations = (predicate: (entry: OperationalFinanceObligation) => boolean) =>
    active.obligations.filter(predicate).reduce((sum, entry) => sum + entry.amountCents, 0);
  const sumSettlements = (predicate: (entry: OperationalFinanceSettlement) => boolean) =>
    active.settlements.filter(predicate).reduce((sum, entry) => sum + entry.amountCents, 0);
  const duesAssessedCents = sumObligations((entry) => entry.category === "dues-assessment");
  const duesCollectedCents = sumSettlements((entry) => entry.direction === "incoming-dues");
  const approvedAwardsCents = sumObligations((entry) => AWARD_CATEGORIES.has(entry.category));
  const awardSettlementsCents = sumSettlements((entry) => entry.direction === "outgoing-award");
  const approvedExpensesCents = sumObligations((entry) => EXPENSE_CATEGORIES.has(entry.category));
  const expenseSettlementsCents = sumSettlements((entry) => entry.direction === "outgoing-expense");
  const poolAllocatedCents = sumObligations(
    (entry) => entry.fundingSource === "dues-funded" && entry.category !== "dues-assessment"
  );
  return deepFreeze({
    duesAssessedCents,
    duesCollectedCents,
    duesOutstandingCents: duesAssessedCents - duesCollectedCents,
    approvedAwardsCents,
    awardSettlementsCents,
    awardOutstandingCents: approvedAwardsCents - awardSettlementsCents,
    approvedExpensesCents,
    expenseSettlementsCents,
    expenseOutstandingCents: approvedExpensesCents - expenseSettlementsCents,
    separatelyFundedContributionsCents: sumSettlements((entry) => entry.direction === "incoming-separate-contribution"),
    poolAllocatedCents,
    poolRemainingCents: duesAssessedCents - poolAllocatedCents,
  });
}

export async function getDuesStatus(repository: OperationalFinanceLedgerRepository, season: number) {
  const snapshot = await repository.getSnapshot();
  return deriveDuesStatus(
    snapshot.obligations.filter((entry) => entry.season === season),
    snapshot.settlements.filter((entry) => entry.season === season),
    snapshot.reversals.filter((entry) => entry.season === season)
  );
}

export async function getOperationalFinanceTotals(repository: OperationalFinanceLedgerRepository, season: number) {
  const snapshot = await repository.getSnapshot();
  return deriveOperationalFinanceTotals(
    snapshot.obligations.filter((entry) => entry.season === season),
    snapshot.settlements.filter((entry) => entry.season === season),
    snapshot.reversals.filter((entry) => entry.season === season)
  );
}
