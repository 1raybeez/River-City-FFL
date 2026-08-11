import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import {
  OPERATIONAL_FINANCE_LEDGER_SCHEMA_VERSION,
  apply2026OpeningDuesMigration,
  build2026OpeningDuesMigrationPlan,
  deriveDuesStatus,
  deriveOperationalFinanceTotals,
} from "../lib/finance/operationalFinanceLedger";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "../lib/finance/operationalFinanceRules";
import type { OperationalFinanceLedgerSnapshot } from "../lib/finance/operationalFinanceLedgerTypes";

const EXPECTED_PROJECT_ID = "river-city-ffl";

function printPlan(mode: "dry-run" | "apply") {
  const plan = build2026OpeningDuesMigrationPlan();
  if (OPERATIONAL_FINANCE_SEASON_2026.schemaVersion !== "2026.1") {
    throw new Error("The approved 2026 rules version is not 2026.1.");
  }
  if (
    plan.assessments.length !== 12 ||
    new Set(plan.assessments.map((entry) => entry.franchiseId)).size !== 12 ||
    new Set(plan.assessments.map((entry) => entry.financialOwnerId)).size !== 12
  ) {
    throw new Error("The 2026 financial-owner assessment mapping is incomplete or duplicated.");
  }

  console.log(
    JSON.stringify(
      {
        mode,
        requiresApplyFlag: true,
        targetProject: EXPECTED_PROJECT_ID,
        season: plan.season,
        ledgerSchemaVersion: OPERATIONAL_FINANCE_LEDGER_SCHEMA_VERSION,
        rulesVersion: OPERATIONAL_FINANCE_SEASON_2026.schemaVersion,
        assessmentCount: plan.assessments.length,
        settlementCount: plan.settlements.length,
        assessedCents: plan.assessedCents,
        collectedCents: plan.collectedCents,
        outstandingCents: plan.outstandingCents,
        deletes: plan.deletes,
        legacyMutations: plan.legacyMutations,
        assessments: plan.assessments.map((entry) => ({
          obligationId: entry.obligationId,
          franchiseId: entry.franchiseId,
          financialOwnerId: entry.financialOwnerId,
          amountCents: entry.amountCents,
          duePolicy: entry.duePolicy,
          dueAt: entry.dueAt,
        })),
        settlements: plan.settlements,
      },
      null,
      2
    )
  );
  return plan;
}

function summarizeRemote(snapshot: OperationalFinanceLedgerSnapshot) {
  const obligations = snapshot.obligations.filter((entry) => entry.season === 2026);
  const settlements = snapshot.settlements.filter((entry) => entry.season === 2026);
  const reversals = snapshot.reversals.filter((entry) => entry.season === 2026);
  const dues = deriveDuesStatus(obligations, settlements, reversals);
  const totals = deriveOperationalFinanceTotals(obligations, settlements, reversals);
  const awardCategories = new Set([
    "weekly-high-score",
    "division-winner",
    "third-place",
    "runner-up",
    "champion",
  ]);
  const expenseCategories = new Set(["championship-ring", "auctioneer-food"]);
  const paidOwnerIds = dues
    .filter((entry) => entry.state === "paid")
    .map((entry) => entry.financialOwnerId)
    .sort();
  const unpaidOwnerIds = dues
    .filter((entry) => entry.state === "unpaid")
    .map((entry) => entry.financialOwnerId)
    .sort();
  const summary = {
    seasonRootCount: snapshot.seasons.filter((entry) => entry.season === 2026).length,
    duesObligationCount: obligations.filter((entry) => entry.category === "dues-assessment").length,
    duesSettlementCount: settlements.filter((entry) => entry.direction === "incoming-dues").length,
    auditEventCount: snapshot.auditEvents.filter((entry) => entry.season === 2026).length,
    migrationRecordCount: snapshot.migrationRecords.filter((entry) => entry.season === 2026).length,
    idempotencyRecordCount: snapshot.idempotencyRecords.filter((entry) => entry.season === 2026).length,
    reversalCount: reversals.length,
    awardObligationCount: obligations.filter((entry) => awardCategories.has(entry.category)).length,
    expenseObligationCount: obligations.filter((entry) => expenseCategories.has(entry.category)).length,
    paidCount: paidOwnerIds.length,
    unpaidCount: unpaidOwnerIds.length,
    partialCount: dues.filter((entry) => entry.state === "partially-paid").length,
    paidOwnerIds,
    unpaidOwnerIds,
    totals,
  };
  const empty = Object.entries(summary)
    .filter(([key]) => !["paidOwnerIds", "unpaidOwnerIds", "totals"].includes(key))
    .every(([, value]) => value === 0);
  const complete =
    summary.seasonRootCount === 1 &&
    summary.duesObligationCount === 12 &&
    summary.duesSettlementCount === 5 &&
    summary.auditEventCount === 19 &&
    summary.migrationRecordCount === 1 &&
    summary.idempotencyRecordCount === 18 &&
    summary.reversalCount === 0 &&
    summary.awardObligationCount === 0 &&
    summary.expenseObligationCount === 0 &&
    summary.paidCount === 5 &&
    summary.unpaidCount === 7 &&
    summary.partialCount === 0 &&
    totals.duesAssessedCents === 60_000 &&
    totals.duesCollectedCents === 25_000 &&
    totals.duesOutstandingCents === 35_000 &&
    totals.poolAllocatedCents === 0 &&
    totals.poolRemainingCents === 60_000;
  return {
    remoteState: empty ? "not-migrated" : complete ? "already-migrated" : "conflict",
    wouldCreateAssessments: empty ? 12 : complete ? 0 : null,
    wouldCreateSettlements: empty ? 5 : complete ? 0 : null,
    ...summary,
  } as const;
}

function serialize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(serialize);
  const possibleTimestamp = value as { toDate?: () => Date };
  if (typeof possibleTimestamp.toDate === "function") {
    return possibleTimestamp.toDate().toISOString();
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, child]) => [key, serialize(child)])
  );
}

async function readLegacyFingerprint(database: Firestore) {
  const [rules, season, owners] = await Promise.all([
    database.doc("finance_rules/2026").get(),
    database.doc("finance_seasons/2026").get(),
    database.collection("finance_seasons/2026/owners").get(),
  ]);
  const evidence = {
    rules: rules.exists ? serialize(rules.data()) : null,
    season: season.exists ? serialize(season.data()) : null,
    owners: owners.docs
      .map((entry) => ({ id: entry.id, data: serialize(entry.data()) }))
      .sort((first, second) => first.id.localeCompare(second.id)),
  };
  return {
    financeRulesExists: rules.exists,
    financeSeasonExists: season.exists,
    ownerDocumentCount: owners.size,
    fingerprint: createHash("sha256")
      .update(JSON.stringify(evidence))
      .digest("hex"),
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  printPlan(apply ? "apply" : "dry-run");
  const [{ FirestoreOperationalFinanceLedgerRepository }, adminModule] =
    await Promise.all([
      import("../lib/finance/operationalFinanceLedgerFirestore"),
      import("../lib/firebaseAdmin"),
    ]);
  const diagnostics = adminModule.getFirebaseAdminDiagnostics();
  if (diagnostics.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Refusing migration: expected Firebase project ${EXPECTED_PROJECT_ID}, received ${diagnostics.projectId ?? "unknown"}.`
    );
  }

  const repository = new FirestoreOperationalFinanceLedgerRepository(
    adminModule.firestore,
    2026
  );
  const before = summarizeRemote(await repository.getSnapshot());
  console.log(JSON.stringify({ remoteVerificationBefore: before }, null, 2));
  if (before.remoteState === "conflict") {
    throw new Error("Refusing migration because the remote operational ledger is partially populated or conflicts with the approved opening state.");
  }
  if (!apply) {
    console.log("DRY RUN ONLY — read-only verification completed; no Firestore writes were performed.");
    return;
  }

  const legacyBefore = await readLegacyFingerprint(adminModule.firestore);
  const result = await apply2026OpeningDuesMigration(
    repository,
    { actorId: "system:phase-6.4-opening-migration", role: "system" },
    new Date().toISOString()
  );
  const after = summarizeRemote(await repository.getSnapshot());
  const legacyAfter = await readLegacyFingerprint(adminModule.firestore);
  if (after.remoteState !== "already-migrated") {
    throw new Error("Post-migration ledger verification did not match the approved opening state.");
  }
  if (legacyBefore.fingerprint !== legacyAfter.fingerprint) {
    throw new Error("Legacy finance evidence changed during migration.");
  }
  console.log(
    JSON.stringify(
      {
        applied: result.created,
        migrationId: result.value.migrationId,
        projectId: diagnostics.projectId,
        remoteVerificationAfter: after,
        legacyEvidence: {
          financeRulesExists: legacyAfter.financeRulesExists,
          financeSeasonExists: legacyAfter.financeSeasonExists,
          ownerDocumentCount: legacyAfter.ownerDocumentCount,
          unchanged: true,
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
