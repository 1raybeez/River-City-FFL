import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { buildPublicOperationalFinancePresentation } from "../lib/finance/publicOperationalFinancePresentation";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "../lib/finance/operationalFinanceRules";
import type { OperationalFinanceObligation, OperationalFinanceLedgerSnapshot } from "../lib/finance/operationalFinanceLedgerTypes";

async function main() {
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, { actorId: "system:public-fixture", role: "system" }, "2026-08-12T12:00:00.000Z");
  const presentation = buildPublicOperationalFinancePresentation(await repository.getSnapshot());
  assert.equal(presentation.season, 2026);
  assert.equal(presentation.statusLabel, "Operational / Provisional");
  assert.equal(presentation.duesRows.length, 12);
  assert.equal(presentation.paidCount, 5);
  assert.equal(presentation.notPaidCount, 7);
  assert.equal(presentation.duesAssessedCents, 60_000);
  assert.equal(presentation.duesCollectedCents, 25_000);
  assert.equal(presentation.duesOutstandingCents, 35_000);
  assert.equal(presentation.expectedPrizeStructure.reduce((sum, item) => sum + item.amountCents, 0), 60_000);
  assert.equal(presentation.approvedAwards.length, 0);
  assert.equal(presentation.approvedExpenses.length, 0);
  assert.equal(presentation.approvedRingExpenseCents, null);
  assert.equal(presentation.projectedChampionCashCents, null);
  assert.equal(JSON.stringify(presentation).includes("owed"), false);
  assert.equal(JSON.stringify(presentation).includes("venmo"), false);
  assert.equal(JSON.stringify(presentation).includes("idempotency"), false);
  assert.equal(JSON.stringify(presentation).includes("audit"), false);
  assert.equal(JSON.stringify(presentation).includes("2026.1"), false);

  const client = readFileSync("components/league-info/FinancialHistoryClient.tsx", "utf8");
  const page = readFileSync("app/league-info/payouts/page.tsx", "utf8");
  const loader = readFileSync("lib/finance/publicOperationalFinanceLoader.ts", "utf8");
  assert.match(page, /loadPublicOperationalFinancePresentation/);
  assert.match(loader, /import\s+["']server-only["']/);
  assert.doesNotMatch(client, /firebase\/firestore|@\/lib\/firebase/);
  assert.match(client, /2026 Current Season/);
  assert.doesNotMatch(client, /\$50 owed|owed.*\$/i);
  assert.match(client, /Historical Finance \(2016–2025 reconciled\)/);
  assert.equal(OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.some((entry) => entry.financialOwnerId === "jeffrey-hudgins"), false);

  const opening = await repository.getSnapshot();
  const template = opening.obligations[0];
  const ring: OperationalFinanceObligation = { ...template, obligationId: "public-fixture-ring", category: "championship-ring", amountCents: 1_600, financialOwnerId: null, franchiseId: null, expenseEvidence: { actualCostCents: 1_600, defaultFundingCapCents: 8_000, approvedFundingCapCents: 8_000, overCapCents: 0, overrideApproved: false, commissionerNote: "private" } };
  const champion: OperationalFinanceObligation = { ...template, obligationId: "public-fixture-champion", category: "champion", amountCents: 21_900, proposalKey: "public-fixture-approved", financialOwnerId: "ray-long", franchiseId: "prestigio-mundial", proposalEvidence: { proposalVersion: "2026.1", sourceType: "fixture", sourceRef: "fixture", sourceSnapshotAt: null, leagueId: "fixture", eventKey: "fixture", finalityState: "sleeper-final", facts: {} } };
  const resolved: OperationalFinanceLedgerSnapshot = { ...opening, obligations: [...opening.obligations, ring, champion] };
  const approved = buildPublicOperationalFinancePresentation(resolved);
  assert.equal(approved.approvedAwards.length, 1);
  assert.equal(approved.approvedAwards[0].label, "Champion");
  assert.equal(approved.approvedRingExpenseCents, 1_600);
  assert.equal(approved.projectedChampionCashCents, 21_900);
  console.log("Public operational finance checks passed (fixtures/in-memory only; production untouched).");
}

void main();
