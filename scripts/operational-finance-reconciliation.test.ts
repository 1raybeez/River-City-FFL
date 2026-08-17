import assert from "node:assert/strict";

import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { reconcileOperationalFinance } from "../lib/finance/operationalFinanceReconciliation";
import type { OperationalFinanceLedgerSnapshot, OperationalFinanceObligation, OperationalFinanceSettlement } from "../lib/finance/operationalFinanceLedgerTypes";

const at = "2026-08-11T16:00:00.000Z";

function award(template: OperationalFinanceObligation, index: number, category: OperationalFinanceObligation["category"], amountCents: number): OperationalFinanceObligation {
  return { ...template, obligationId: `fixture-award-${index}`, category, amountCents, fundingSource: "dues-funded", proposalKey: `fixture-proposal-${index}`, financialOwnerId: "ray-long", franchiseId: "prestigio-mundial" };
}

async function main() {
  const repo = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repo, { actorId: "system:reconciliation-test", role: "system" }, at);
  const opening = await repo.getSnapshot();
  const frozenInput = structuredClone(opening);
  const preseason = reconcileOperationalFinance(opening, { seasonState: "preseason" });
  assert.deepEqual(opening, frozenInput);
  assert.deepEqual(preseason, reconcileOperationalFinance(opening, { seasonState: "preseason" }));
  assert.equal(preseason.duesPoolCents, 60_000);
  assert.equal(preseason.expectedPrizeBudgetCents, 60_000);
  assert.deepEqual(preseason.expectedPrizeStructure.map((entry) => entry.amountCents), [14_000, 7_500, 5_000, 10_000, 23_500]);
  assert.equal(preseason.duesAssessedCents, 60_000);
  assert.equal(preseason.duesCollectedCents, 25_000);
  assert.equal(preseason.duesOutstandingCents, 35_000);
  assert.equal(preseason.approvedAwardCents, 0);
  assert.equal(preseason.paidAwardCents, 0);
  assert.equal(preseason.readyToClose, false);
  assert.equal(preseason.checks.find((entry) => entry.id === "required-awards")?.state, "PENDING");
  assert.equal(preseason.approvedRingExpenseCents, null);
  const adjusted = reconcileOperationalFinance({ ...opening, adjustments: [{ adjustmentId: "fixture-adjustment", season: 2026, category: "cash_variance", amountCents: -125, reason: "Fixture variance", effectiveDate: "2026-08-11", createdAt: at, createdBy: { actorId: "commissioner:test", role: "commissioner" }, idempotencyKey: "adjustment:fixture" }] }, { seasonState: "preseason" });
  assert.equal(adjusted.reconciliationAdjustmentCents, -125);
  assert.equal(adjusted.cashOnHandCents, 24_875);

  const template = opening.obligations[0];
  const ring: OperationalFinanceObligation = { ...template, obligationId: "fixture-ring", category: "championship-ring", amountCents: 1_600, fundingSource: "dues-funded", financialOwnerId: null, franchiseId: null, expenseEvidence: { actualCostCents: 1_600, effectiveDate: "2026-08-11", description: "Fixture ring", evidenceReference: null, defaultFundingCapCents: 8_000, approvedFundingCapCents: 8_000, overCapCents: 0, overrideApproved: false, commissionerNote: null } };
  const food: OperationalFinanceObligation = { ...template, obligationId: "fixture-food", category: "auctioneer-food", amountCents: 6_000, fundingSource: "separately-funded", financialOwnerId: null, franchiseId: null };
  const partial: OperationalFinanceLedgerSnapshot = { ...opening, obligations: [...opening.obligations, ring, food], settlements: [...opening.settlements, { ...opening.settlements[0], settlementId: "fixture-contribution", obligationId: food.obligationId, direction: "incoming-separate-contribution", amountCents: 2_000, contributorOwnerId: "ray-long", contributorFranchiseId: "prestigio-mundial" }] };
  const partialResult = reconcileOperationalFinance(partial, { seasonState: "regular-season" });
  assert.equal(partialResult.approvedDuesFundedExpenseCents, 1_600);
  assert.equal(partialResult.projectedChampionCashCents, 21_900);
  assert.equal(partialResult.currentlyAllocatedCents, 1_600);
  assert.equal(partialResult.currentlyUnallocatedCents, 58_400);
  assert.equal(partialResult.separatelyFundedExpenseCents, 6_000);
  assert.equal(partialResult.separatelyFundedContributionCents, 2_000);
  assert.equal(partialResult.checks.find((entry) => entry.id === "contributions")?.state, "PENDING");

  const duplicate: OperationalFinanceLedgerSnapshot = { ...partial, obligations: [...partial.obligations, ring] };
  assert.equal(reconcileOperationalFinance(duplicate).checks.find((entry) => entry.id === "unique-obligations")?.state, "ISSUE");
  const overSettlement: OperationalFinanceSettlement = { ...opening.settlements[0], settlementId: "fixture-over", obligationId: ring.obligationId, direction: "outgoing-expense", amountCents: 1_601, paymentMethod: "card" };
  assert.equal(reconcileOperationalFinance({ ...partial, settlements: [...partial.settlements, overSettlement] }).checks.find((entry) => entry.id === "settlements")?.state, "ISSUE");
  const invalidIdentity = { ...opening.obligations[0], obligationId: "fixture-invalid-dues", financialOwnerId: "unknown", franchiseId: "unknown" };
  assert.equal(reconcileOperationalFinance({ ...opening, obligations: [...opening.obligations.slice(1), invalidIdentity] }).checks.find((entry) => entry.id === "canonical-identities")?.state, "ISSUE");
  assert.equal(reconcileOperationalFinance(opening, { unresolvedAwardCorrection: true }).checks.find((entry) => entry.id === "corrections")?.state, "ISSUE");
  assert.equal(reconcileOperationalFinance({ ...partial, reversals: [{ reversalId: "fixture-reversal", season: 2026, targetType: "obligation", targetId: ring.obligationId, replacementObligationId: null, reason: "fixture", createdAt: at, createdBy: { actorId: "commissioner:test", role: "commissioner" }, idempotencyKey: "fixture-reversal-key" }] }).approvedDuesFundedExpenseCents, 0);

  const weekly = Array.from({ length: 14 }, (_, index) => award(template, index, "weekly-high-score", 1_000));
  const divisions = Array.from({ length: 3 }, (_, index) => award(template, 14 + index, "division-winner", 2_500));
  const placements = [award(template, 17, "third-place", 5_000), award(template, 18, "runner-up", 10_000), award(template, 19, "champion", 21_900)];
  const allAwards = [...weekly, ...divisions, ...placements];
  const duesSettlements = opening.obligations.map((obligation, index) => ({ ...opening.settlements[0], settlementId: `fixture-dues-${index}`, obligationId: obligation.obligationId, amountCents: 5_000, direction: "incoming-dues" as const }));
  const awardSettlements = allAwards.map((obligation, index) => ({ ...opening.settlements[0], settlementId: `fixture-award-payment-${index}`, obligationId: obligation.obligationId, amountCents: obligation.amountCents, direction: "outgoing-award" as const }));
  const ringPayment = { ...opening.settlements[0], settlementId: "fixture-ring-payment", obligationId: ring.obligationId, amountCents: ring.amountCents, direction: "outgoing-expense" as const, paymentMethod: "card" as const };
  const resolved: OperationalFinanceLedgerSnapshot = { ...opening, obligations: [...opening.obligations, ...allAwards, ring], settlements: [...duesSettlements, ...awardSettlements, ringPayment] };
  const final = reconcileOperationalFinance(resolved, { seasonState: "complete" });
  assert.equal(final.approvedAwardCents, 58_400);
  assert.equal(final.currentlyAllocatedCents, 60_000);
  assert.equal(final.currentlyUnallocatedCents, 0);
  assert.equal(final.issues.length, 0);
  assert.equal(final.pendingChecks.length, 0);
  assert.equal(final.readyToClose, true);
  console.log("Operational finance reconciliation checks passed.");
}

void main();
