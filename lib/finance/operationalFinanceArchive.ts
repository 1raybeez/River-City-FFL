import { createHash } from "node:crypto";

import type { OperationalFinanceProposalSet } from "@/lib/finance/operationalFinanceProposals";
import {
  reconcileOperationalFinance,
  type OperationalFinanceReconciliation,
} from "@/lib/finance/operationalFinanceReconciliation";
import type {
  OperationalFinanceActor,
  OperationalFinanceArchive,
  OperationalFinanceLedgerRepository,
  OperationalFinanceLedgerSnapshot,
  OperationalFinanceSeasonLedger,
} from "@/lib/finance/operationalFinanceLedgerTypes";
import { OPERATIONAL_FINANCE_SCHEMA_VERSION } from "@/lib/finance/operationalFinanceRules";
import { OPERATIONAL_FINANCE_2026_LEAGUE_ID } from "@/lib/finance/operationalFinanceLedger";

export const OPERATIONAL_FINANCE_ARCHIVE_SCHEMA_VERSION = "operational-finance-archive:1";

export type OperationalFinanceCloseContext = Readonly<{
  seasonState: "preseason" | "regular-season" | "postseason" | "complete";
  proposalSet?: OperationalFinanceProposalSet | null;
  unresolvedAwardCorrection?: boolean;
}>;

export type OperationalFinanceCloseReview = Readonly<{
  season: 2026;
  readyToClose: boolean;
  reconciliation: OperationalFinanceReconciliation;
  blockers: readonly string[];
}>;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

export function canonicalOperationalFinanceArchiveJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function archiveHash(value: Omit<OperationalFinanceArchive, "archiveHash">) {
  return createHash("sha256")
    .update(canonicalOperationalFinanceArchiveJson(value))
    .digest("hex");
}

function withoutKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const excluded = new Set(keys);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !excluded.has(key)));
}

function cleanObligation(value: OperationalFinanceLedgerSnapshot["obligations"][number]) {
  const expenseEvidence = value.expenseEvidence
    ? { ...value.expenseEvidence, commissionerNote: null }
    : null;
  return { ...withoutKeys(value as unknown as Record<string, unknown>, ["idempotencyKey"]), expenseEvidence };
}

function cleanSettlement(value: OperationalFinanceLedgerSnapshot["settlements"][number]) {
  return withoutKeys(value as unknown as Record<string, unknown>, ["externalReference", "commissionerNote", "idempotencyKey"]);
}

function cleanReconciliation(value: OperationalFinanceReconciliation) {
  return {
    ...value,
    expenses: value.expenses.map((expense) => ({ ...expense, commissionerNote: null })),
  };
}

function blockersFor(
  reconciliation: OperationalFinanceReconciliation,
  context: OperationalFinanceCloseContext
) {
  const blockers: string[] = [];
  if (!reconciliation.readyToClose) blockers.push("Reconciliation is not ready to close.");
  if (context.seasonState !== "complete") blockers.push("The league season is not complete.");
  for (const check of reconciliation.checks) {
    if (check.state !== "PASS") blockers.push(`${check.label}: ${check.detail}`);
  }
  return [...new Set(blockers)];
}

export function reviewOperationalFinanceSeasonClose(
  snapshot: OperationalFinanceLedgerSnapshot,
  context: OperationalFinanceCloseContext
): OperationalFinanceCloseReview {
  const reconciliation = reconcileOperationalFinance(snapshot, {
    seasonState: context.seasonState,
    proposalSet: context.proposalSet,
    unresolvedAwardCorrection: context.unresolvedAwardCorrection,
  });
  const blockers = blockersFor(reconciliation, context);
  return Object.freeze({
    season: 2026,
    readyToClose: blockers.length === 0,
    reconciliation,
    blockers: Object.freeze(blockers),
  });
}

function buildArchive(
  snapshot: OperationalFinanceLedgerSnapshot,
  season: OperationalFinanceSeasonLedger,
  review: OperationalFinanceCloseReview,
  actor: OperationalFinanceActor,
  closedAt: string,
  proposalSet?: OperationalFinanceProposalSet | null
): OperationalFinanceArchive {
  const obligations = snapshot.obligations.filter((entry) => entry.season === 2026).sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map(cleanObligation);
  const settlements = snapshot.settlements.filter((entry) => entry.season === 2026).sort((a, b) => a.settlementId.localeCompare(b.settlementId)).map(cleanSettlement);
  const reversals = snapshot.reversals.filter((entry) => entry.season === 2026).sort((a, b) => a.reversalId.localeCompare(b.reversalId)).map((entry) => withoutKeys(entry as unknown as Record<string, unknown>, ["idempotencyKey"]));
  const expenses = review.reconciliation.expenses.slice().sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map((expense) => withoutKeys(expense as unknown as Record<string, unknown>, ["commissionerNote"]));
  const contributions = settlements.filter((entry) => entry.direction === "incoming-separate-contribution");
  const base = {
    archiveId: `operational-finance-archive:2026`,
    season: 2026,
    schemaVersion: OPERATIONAL_FINANCE_ARCHIVE_SCHEMA_VERSION,
    rulesVersion: season.rulesVersion || OPERATIONAL_FINANCE_SCHEMA_VERSION,
    sourceLeagueId: season.sourceLeagueId || OPERATIONAL_FINANCE_2026_LEAGUE_ID,
    closedAt,
    closedBy: { ...actor },
    reconciliation: cleanReconciliation(review.reconciliation),
    obligations,
    settlements,
    reversals,
    expenses,
    contributions,
    coverage: proposalSet?.coverage ? { ...proposalSet.coverage } : null,
  } satisfies Omit<OperationalFinanceArchive, "archiveHash">;
  return Object.freeze({ ...base, archiveHash: archiveHash(base) });
}

export async function closeOperationalFinanceSeason(
  repository: OperationalFinanceLedgerRepository,
  context: OperationalFinanceCloseContext,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  closedAt: string,
  confirmed: boolean
) {
  if (actor.role !== "commissioner" || !actor.actorId.trim()) throw new Error("Commissioner authorization is required to close the season.");
  if (!confirmed) throw new Error("Explicit commissioner close confirmation is required.");
  if (!/^[a-zA-Z0-9:._-]{8,240}$/.test(idempotencyKey)) throw new Error("A stable close idempotency key is required.");
  return repository.runTransaction(async (transaction) => {
    const existingKey = await transaction.getIdempotency(idempotencyKey);
    if (existingKey) {
      if (existingKey.operation !== "season-closed") throw new Error("Idempotency key was already used for a different operation.");
      const archive = await transaction.getArchive(2026);
      if (!archive || archive.archiveHash !== existingKey.targetId) throw new Error("Close idempotency evidence is invalid.");
      return Object.freeze({ created: false, archive });
    }
    const season = await transaction.getSeason(2026);
    if (!season) throw new Error("The 2026 operational finance ledger was not found.");
    if (season.status === "closed") {
      const archive = await transaction.getArchive(2026);
      if (archive) throw new Error("The 2026 season is already closed and immutable.");
      throw new Error("Closed season archive is missing.");
    }
    const snapshot: OperationalFinanceLedgerSnapshot = {
      seasons: [season],
      obligations: await transaction.getAllObligations(2026),
      settlements: await transaction.getAllSettlements(2026),
      reversals: await transaction.getAllReversals(2026),
      auditEvents: [],
      migrationRecords: [],
      idempotencyRecords: [],
    };
    const review = reviewOperationalFinanceSeasonClose(snapshot, context);
    if (!review.readyToClose) throw new Error(`Season close blocked: ${review.blockers.join(" ")}`);
    const archive = buildArchive(snapshot, season, review, actor, closedAt, context.proposalSet);
    const closedSeason = {
      ...season,
      status: "closed" as const,
      updatedAt: closedAt,
      closedAt,
      closedBy: actor.actorId,
      archiveId: archive.archiveId,
      archiveHash: archive.archiveHash,
    };
    await transaction.putArchive(archive);
    await transaction.updateSeason(closedSeason);
    await transaction.putAuditEvent({
      eventId: `operational-finance-audit:${idempotencyKey}`,
      season: 2026,
      eventType: "season-closed",
      actorId: actor.actorId,
      actorRole: actor.role,
      targetType: "season",
      targetId: "2026",
      createdAt: closedAt,
      reason: "Commissioner explicitly closed the fully reconciled season; immutable archive verified before close metadata was written.",
      idempotencyKey,
      beforeRef: null,
      afterRef: archive.archiveId,
      metadata: { archiveHash: archive.archiveHash },
    });
    await transaction.putIdempotency({
      idempotencyKey,
      season: 2026,
      operation: "season-closed",
      targetType: "season",
      targetId: archive.archiveHash,
      createdAt: closedAt,
    });
    return Object.freeze({ created: true, archive });
  });
}
