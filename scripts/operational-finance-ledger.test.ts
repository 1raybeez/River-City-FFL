import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  apply2026OpeningDuesMigration,
  build2026OpeningDuesMigrationPlan,
  deriveOperationalFinanceTotals,
  getDuesStatus,
  getOperationalFinanceTotals,
  recordApprovedAwardProposal,
  recordApprovedExpense,
  recordObligation,
  recordSettlement,
  replaceObligation,
  reverseObligation,
  reverseSettlement,
} from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "../lib/finance/operationalFinanceRules";
import {
  buildOperationalFinanceProposals,
  type OperationalFinanceProposalInput,
} from "../lib/finance/operationalFinanceProposals";
import type {
  OperationalFinanceActor,
  OperationalFinanceObligation,
} from "../lib/finance/operationalFinanceLedgerTypes";

const RECORDED_AT = "2026-08-11T13:30:00.000Z";
const systemActor: OperationalFinanceActor = {
  actorId: "system:test-migration",
  role: "system",
};
const commissioner: OperationalFinanceActor = {
  actorId: "commissioner:ray-long",
  role: "commissioner",
};

async function rejects(operation: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(operation, pattern);
}

async function main() {
const plan = build2026OpeningDuesMigrationPlan();
assert.equal(plan.assessments.length, 12);
assert.equal(new Set(plan.assessments.map((entry) => entry.franchiseId)).size, 12);
assert.equal(plan.assessedCents, 60_000);
assert.equal(plan.settlements.length, 5);
assert.equal(plan.collectedCents, 25_000);
assert.equal(plan.outstandingCents, 35_000);
assert.equal(plan.deletes, 0);
assert.equal(plan.legacyMutations, 0);

const prestigio = plan.assessments.find(
  (entry) => entry.franchiseId === "prestigio-mundial"
);
assert.equal(prestigio?.financialOwnerId, "ray-long");
assert.ok(!plan.assessments.some((entry) => entry.financialOwnerId === "jeffrey-hudgins"));
const shake = plan.assessments.find(
  (entry) => entry.franchiseId === "shake-n-bakers"
);
assert.equal(shake?.financialOwnerId, "jordan-maslyn");
assert.ok(!plan.assessments.some((entry) => entry.financialOwnerId === "landon-elliott"));
assert.ok(plan.assessments.every((entry) => entry.amountCents === 5_000));
assert.ok(plan.assessments.every((entry) => entry.duePolicy === "before-draft"));
assert.ok(plan.assessments.every((entry) => entry.dueAt === null));
assert.ok(plan.settlements.every((entry) => entry.paymentMethod === "venmo"));
assert.ok(plan.settlements.every((entry) => entry.actualPaidAt === null));
assert.deepEqual(
  plan.settlements.map((entry) => entry.financialOwnerId),
  ["david-besedich", "jd-dowling", "rashad-gresham", "ray-long", "wade-cameron"]
);

const repository = new InMemoryOperationalFinanceLedgerRepository();
const migration = await apply2026OpeningDuesMigration(
  repository,
  systemActor,
  RECORDED_AT
);
assert.equal(migration.created, true);
const duplicateMigration = await apply2026OpeningDuesMigration(
  repository,
  systemActor,
  RECORDED_AT
);
assert.equal(duplicateMigration.created, false);
assert.equal(duplicateMigration.value.migrationId, migration.value.migrationId);

const migratedSnapshot = await repository.getSnapshot();
assert.equal(migratedSnapshot.seasons.length, 1);
assert.equal(migratedSnapshot.seasons[0].status, "open");
assert.equal(migratedSnapshot.seasons[0].closedAt, null);
assert.equal(migratedSnapshot.obligations.length, 12);
assert.equal(migratedSnapshot.settlements.length, 5);
assert.equal(migratedSnapshot.migrationRecords.length, 1);
assert.equal(migratedSnapshot.auditEvents.length, 19);
assert.ok(migratedSnapshot.auditEvents.every((entry) => entry.actorId));
assert.ok(migratedSnapshot.auditEvents.every((entry) => entry.idempotencyKey));
assert.ok(migratedSnapshot.settlements.every((entry) => entry.actualPaidAt === null));

const initialDues = await getDuesStatus(repository, 2026);
assert.equal(initialDues.length, 12);
assert.equal(initialDues.filter((entry) => entry.state === "paid").length, 5);
assert.equal(initialDues.filter((entry) => entry.state === "unpaid").length, 7);
assert.equal(initialDues.filter((entry) => entry.state === "partially-paid").length, 0);
assert.deepEqual(
  initialDues.filter((entry) => entry.state === "paid").map((entry) => entry.financialOwnerId).sort(),
  ["david-besedich", "jd-dowling", "rashad-gresham", "ray-long", "wade-cameron"].sort()
);
const initialTotals = await getOperationalFinanceTotals(repository, 2026);
assert.equal(initialTotals.duesAssessedCents, 60_000);
assert.equal(initialTotals.duesCollectedCents, 25_000);
assert.equal(initialTotals.duesOutstandingCents, 35_000);
assert.equal(initialTotals.approvedAwardsCents, 0);
assert.equal(initialTotals.approvedExpensesCents, 0);
assert.equal(initialTotals.poolAllocatedCents, 0);
assert.equal(initialTotals.poolRemainingCents, 60_000);

await rejects(
  () =>
    recordObligation(
      repository,
      plan.assessments[0],
      commissioner,
      "test:duplicate-assessment-different-request",
      RECORDED_AT
    ),
  /already exists/
);

const stanAssessment = plan.assessments.find(
  (entry) => entry.financialOwnerId === "stan-schoppe"
)!;
const partial = await recordSettlement(
  repository,
  {
    season: 2026,
    obligationId: stanAssessment.obligationId,
    direction: "incoming-dues",
    amountCents: 2_000,
    paymentMethod: "venmo",
    actualPaidAt: null,
    sourceRef: "fixture:partial-dues",
  },
  commissioner,
  "test:settlement:stan-partial",
  RECORDED_AT
);
assert.equal(partial.created, true);
const duplicatePartial = await recordSettlement(
  repository,
  {
    season: 2026,
    obligationId: stanAssessment.obligationId,
    direction: "incoming-dues",
    amountCents: 2_000,
    paymentMethod: "venmo",
    actualPaidAt: null,
    sourceRef: "fixture:partial-dues",
  },
  commissioner,
  "test:settlement:stan-partial",
  RECORDED_AT
);
assert.equal(duplicatePartial.created, false);
assert.equal(
  (await getDuesStatus(repository, 2026)).find(
    (entry) => entry.financialOwnerId === "stan-schoppe"
  )?.state,
  "partially-paid"
);
await rejects(
  () =>
    recordSettlement(
      repository,
      {
        season: 2026,
        obligationId: stanAssessment.obligationId,
        direction: "incoming-dues",
        amountCents: 3_001,
        paymentMethod: "venmo",
        actualPaidAt: null,
        sourceRef: "fixture:over-settlement",
      },
      commissioner,
      "test:settlement:stan-over",
      RECORDED_AT
    ),
  /exceed/
);

const rosterMappings = OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.map(
  (mapping, index) => ({
    rosterId: index + 1,
    franchiseId: mapping.franchiseId,
    sourceRef: `fixture:roster-${index + 1}`,
  })
);
const proposalInput: OperationalFinanceProposalInput = {
  rules: OPERATIONAL_FINANCE_SEASON_2026,
  season: 2026,
  leagueId: "fixture-2026",
  currentWeek: 2,
  leagueState: "regular-season",
  rosterMappings,
  weeklyResults: [
    {
      week: 1,
      finalityState: "sleeper-final",
      officialWinnerRosterId: 4,
      officialWinnerPoints: 140,
      sourceRef: "fixture:week-1",
      finalityEvidence: "Fixture final result.",
    },
  ],
  divisions: [1, 2, 3].map((id) => ({
    divisionId: String(id),
    finalityState: "in-progress" as const,
    sourceRef: `fixture:division-${id}`,
    finalityEvidence: "Fixture in progress.",
  })),
  snapshotTimestamp: RECORDED_AT,
};
const proposalSet = buildOperationalFinanceProposals(proposalInput);
const approvedWeekly = proposalSet.proposals.find(
  (entry) => entry.proposalKey.endsWith("week-1")
)!;
const pendingWeekly = proposalSet.proposals.find(
  (entry) => entry.proposalKey.endsWith("week-2")
)!;
assert.equal(
  (await repository.getSnapshot()).obligations.some(
    (entry) => entry.proposalKey === approvedWeekly.proposalKey
  ),
  false
);
const award = await recordApprovedAwardProposal(
  repository,
  approvedWeekly,
  commissioner,
  "test:award:week-1",
  RECORDED_AT
);
assert.equal(award.value.amountCents, 1_000);
assert.equal(award.value.category, "weekly-high-score");
await rejects(
  () =>
    recordApprovedAwardProposal(
      repository,
      pendingWeekly,
      commissioner,
      "test:award:week-2-pending",
      RECORDED_AT
    ),
  /Only a proposed award/
);
const wrongAmount = {
  ...structuredClone(approvedWeekly),
  amountCents: 999,
  proposalKey: "operational-finance-proposal:2026:weekly-high-score:week-3",
};
await rejects(
  () =>
    recordApprovedAwardProposal(
      repository,
      wrongAmount,
      commissioner,
      "test:award:wrong-amount",
      RECORDED_AT
    ),
  /does not match/
);

await rejects(
  () =>
    recordApprovedExpense(
      repository,
      {
        season: 2026,
        category: "championship-ring",
        amountCents: 8_600,
        sourceRef: "fixture:ring-over-cap",
      },
      commissioner,
      "test:expense:ring-over-cap",
      RECORDED_AT
    ),
  /exceeds/
);
const ring = await recordApprovedExpense(
  repository,
  {
    season: 2026,
    category: "championship-ring",
    amountCents: 8_600,
    approvedRingCapOverrideCents: 8_600,
    sourceRef: "fixture:ring-approved",
  },
  commissioner,
  "test:expense:ring-approved",
  RECORDED_AT
);
assert.equal(ring.value.fundingSource, "dues-funded");
const food = await recordApprovedExpense(
  repository,
  {
    season: 2026,
    category: "auctioneer-food",
    amountCents: 1_200,
    sourceRef: "fixture:food",
  },
  commissioner,
  "test:expense:food",
  RECORDED_AT
);
assert.equal(food.value.fundingSource, "separately-funded");

const awardBeforeReversal = await getOperationalFinanceTotals(repository, 2026);
assert.equal(awardBeforeReversal.approvedAwardsCents, 1_000);
const reversedAward = await reverseObligation(
  repository,
  2026,
  award.value.obligationId,
  "Sleeper correction after approval requires explicit reversal.",
  commissioner,
  "test:reverse:week-1",
  RECORDED_AT
);
assert.equal(reversedAward.value.targetId, award.value.obligationId);
assert.ok(
  (await repository.getSnapshot()).obligations.some(
    (entry) => entry.obligationId === award.value.obligationId
  )
);
assert.equal((await getOperationalFinanceTotals(repository, 2026)).approvedAwardsCents, 0);

const replacementInput = {
  ...structuredClone(award.value),
  obligationId: "operational-finance-obligation:2026:weekly-high-score:week-1:replacement-1",
  amountCents: 1_000,
  proposalKey: null,
  sourceRef: "fixture:corrected-week-1",
};
for (const key of [
  "createdAt",
  "createdBy",
  "idempotencyKey",
  "replacesObligationId",
  "replacementForReversalId",
] as const) {
  delete (replacementInput as Partial<OperationalFinanceObligation>)[key];
}
const replacement = await replaceObligation(
  repository,
  ring.value.obligationId,
  {
    ...(replacementInput as Omit<
      typeof replacementInput,
      "replacesObligationId" | "replacementForReversalId"
    >),
    category: "championship-ring",
    amountCents: 8_000,
    obligationId: "operational-finance-obligation:2026:championship-ring-expense:replacement-1",
    financialOwnerId: null,
    franchiseId: null,
    ruleRef: ring.value.ruleRef,
    ruleProvenance: ring.value.ruleProvenance,
  },
  "Correct approved ring obligation with preserved history.",
  commissioner,
  "test:replace:ring",
  RECORDED_AT
);
assert.equal(replacement.value.replacesObligationId, ring.value.obligationId);
assert.ok(replacement.value.replacementForReversalId);

const awardSettlement = await recordSettlement(
  repository,
  {
    season: 2026,
    obligationId: replacement.value.obligationId,
    direction: "outgoing-expense",
    amountCents: 8_000,
    paymentMethod: "venmo",
    actualPaidAt: RECORDED_AT,
    sourceRef: "fixture:ring-payment",
  },
  commissioner,
  "test:settlement:ring",
  RECORDED_AT
);
assert.equal((await getOperationalFinanceTotals(repository, 2026)).expenseSettlementsCents, 8_000);
await reverseSettlement(
  repository,
  2026,
  awardSettlement.value.settlementId,
  "Payment record corrected.",
  commissioner,
  "test:reverse:ring-settlement",
  RECORDED_AT
);
assert.equal((await getOperationalFinanceTotals(repository, 2026)).expenseSettlementsCents, 0);

const snapshotBeforeFailure = await repository.getSnapshot();
await rejects(
  () =>
    repository.runTransaction(async (transaction) => {
      await transaction.putAuditEvent({
        eventId: "fixture:orphan-audit",
        season: 2026,
        eventType: "migration-recorded",
        actorId: systemActor.actorId,
        actorRole: systemActor.role,
        targetType: "migration",
        targetId: "fixture",
        createdAt: RECORDED_AT,
        reason: "Atomic failure fixture.",
        idempotencyKey: "fixture:atomic-failure",
        beforeRef: null,
        afterRef: null,
        metadata: {},
      });
      throw new Error("fixture failure");
    }),
  /fixture failure/
);
assert.deepEqual(await repository.getSnapshot(), snapshotBeforeFailure);

const finalSnapshot = await repository.getSnapshot();
assert.equal(Object.isFrozen(finalSnapshot), true);
assert.equal(Object.isFrozen(finalSnapshot.obligations), true);
assert.ok(finalSnapshot.auditEvents.length > migratedSnapshot.auditEvents.length);
assert.equal(new Set(finalSnapshot.auditEvents.map((entry) => entry.eventId)).size, finalSnapshot.auditEvents.length);
assert.ok(finalSnapshot.auditEvents.every((entry) => entry.actorId && entry.idempotencyKey));
assert.ok(
  Object.values(deriveOperationalFinanceTotals([], [], [])).every((value) =>
    Number.isSafeInteger(value)
  )
);

const root = process.cwd();
const domainSource = fs.readFileSync(
  path.join(root, "lib/finance/operationalFinanceLedger.ts"),
  "utf8"
);
const firestoreSource = fs.readFileSync(
  path.join(root, "lib/finance/operationalFinanceLedgerFirestore.ts"),
  "utf8"
);
const migrationSource = fs.readFileSync(
  path.join(root, "scripts/migrate-2026-operational-finance.ts"),
  "utf8"
);
assert.doesNotMatch(
  domainSource,
  /firebase-admin|firebase\/firestore|@\/lib\/firebase|\.collection\(/
);
assert.doesNotMatch(domainSource, /finance_seasons\/2026\/owners/);
assert.match(firestoreSource, /@\/lib\/firebaseAdmin/);
assert.doesNotMatch(firestoreSource, /firebase\/firestore|@\/lib\/firebase"/);
assert.doesNotMatch(firestoreSource, /\.(?:delete|recursiveDelete)\s*\(/);
assert.match(migrationSource, /readLegacyFingerprint/);
assert.match(migrationSource, /finance_rules\/2026/);
assert.match(migrationSource, /finance_seasons\/2026\/owners/);
assert.doesNotMatch(
  migrationSource,
  /(?:finance_rules|finance_seasons)[\s\S]{0,120}\.(?:set|update|delete)\s*\(/
);
assert.match(migrationSource, /if \(!apply\)/);
assert.match(migrationSource, /DRY RUN ONLY/);
assert.ok(!domainSource.includes("fourth-place"));
assert.ok(!domainSource.includes("lower-bracket"));
assert.ok(!domainSource.includes("toilet-bowl"));
assert.ok(!domainSource.includes("season-high-score"));
assert.ok(!domainSource.includes("commissioner-fee"));

console.log("Operational finance ledger foundation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
