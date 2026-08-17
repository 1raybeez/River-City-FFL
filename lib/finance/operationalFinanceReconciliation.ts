import type { OperationalFinanceLedgerSnapshot } from "@/lib/finance/operationalFinanceLedgerTypes";
import type { OperationalFinanceProposalSet } from "@/lib/finance/operationalFinanceProposals";
import {
  OPERATIONAL_FINANCE_SEASON_2026,
  calculateChampionPayout,
  validateRingExpense,
} from "@/lib/finance/operationalFinanceRules";

export type OperationalFinanceCheckState = "PASS" | "PENDING" | "ISSUE";

export type OperationalFinanceReconciliationCheck = Readonly<{
  id: string;
  state: OperationalFinanceCheckState;
  label: string;
  detail: string;
}>;

export type OperationalFinanceReconciliation = Readonly<{
  season: 2026;
  status: "season-in-progress" | "ready-to-close" | "issues-found";
  duesPoolCents: number;
  duesAssessedCents: number;
  duesCollectedCents: number;
  duesOutstandingCents: number;
  expectedPrizeBudgetCents: number;
  expectedPrizeStructure: readonly Readonly<{ label: string; amountCents: number }>[];
  fixedPrizeBudgetCents: number;
  championshipAllocationCents: number;
  approvedAwardCents: number;
  paidAwardCents: number;
  outstandingAwardCents: number;
  approvedDuesFundedExpenseCents: number;
  paidDuesFundedExpenseCents: number;
  separatelyFundedExpenseCents: number;
  paidSeparatelyFundedExpenseCents: number;
  separatelyFundedContributionCents: number;
  reconciliationAdjustmentCents: number;
  approvedRingExpenseCents: number | null;
  projectedChampionCashCents: number | null;
  approvedChampionCashCents: number | null;
  currentlyAllocatedCents: number;
  currentlyUnallocatedCents: number;
  cashOnHandCents: number;
  checks: readonly OperationalFinanceReconciliationCheck[];
  issues: readonly OperationalFinanceReconciliationCheck[];
  pendingChecks: readonly OperationalFinanceReconciliationCheck[];
  readyToClose: boolean;
  expenses: readonly Readonly<{
    obligationId: string;
    category: "championship-ring" | "auctioneer-food";
    fundingSource: "dues-funded" | "separately-funded";
    amountCents: number;
    paidCents: number;
    outstandingCents: number;
    contributedCents: number;
    commissionerNote: string | null;
    effectiveDate: string | null;
    description: string | null;
    evidenceReference: string | null;
  }>[];
  adjustments: readonly Readonly<{
    adjustmentId: string;
    category: "cash_variance" | "bank_fee" | "refund" | "rounding_correction" | "other_approved";
    amountCents: number;
    reason: string;
    effectiveDate: string;
    createdAt: string;
    createdBy: string;
  }>[];
}>; 

type ReconciliationContext = Readonly<{
  seasonState?: "preseason" | "regular-season" | "postseason" | "complete";
  proposalSet?: OperationalFinanceProposalSet | null;
  unresolvedAwardCorrection?: boolean;
}>;

const AWARD_CATEGORIES = new Set([
  "weekly-high-score",
  "division-winner",
  "third-place",
  "runner-up",
  "champion",
]);

function sum<T>(values: readonly T[], pick: (value: T) => number) {
  return values.reduce((total, value) => total + pick(value), 0);
}

function check(
  id: string,
  state: OperationalFinanceCheckState,
  label: string,
  detail: string
): OperationalFinanceReconciliationCheck {
  return Object.freeze({ id, state, label, detail });
}

export function reconcileOperationalFinance(
  snapshot: OperationalFinanceLedgerSnapshot,
  context: ReconciliationContext = {}
): OperationalFinanceReconciliation {
  const season = 2026;
  const reversals = snapshot.reversals.filter((entry) => entry.season === season);
  const reversedObligations = new Set(
    reversals.filter((entry) => entry.targetType === "obligation").map((entry) => entry.targetId)
  );
  const reversedSettlements = new Set(
    reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId)
  );
  const seasonObligations = snapshot.obligations.filter((entry) => entry.season === season);
  const obligations = seasonObligations.filter(
    (entry) => !reversedObligations.has(entry.obligationId)
  );
  const settlements = snapshot.settlements.filter(
    (entry) => entry.season === season && !reversedSettlements.has(entry.settlementId)
  );
  const dues = obligations.filter((entry) => entry.category === "dues-assessment");
  const awards = obligations.filter((entry) => AWARD_CATEGORIES.has(entry.category));
  const duesFundedExpenses = obligations.filter(
    (entry) => entry.fundingSource === "dues-funded" && entry.category !== "dues-assessment"
      && !AWARD_CATEGORIES.has(entry.category)
  );
  const separateExpenses = obligations.filter(
    (entry) => entry.fundingSource === "separately-funded"
  );
  const duesCollectedCents = sum(
    settlements.filter((entry) => entry.direction === "incoming-dues"),
    (entry) => entry.amountCents
  );
  const paidAwardCents = sum(
    settlements.filter((entry) => entry.direction === "outgoing-award"),
    (entry) => entry.amountCents
  );
  const paidDuesFundedExpenseCents = sum(
    settlements.filter((entry) => {
      if (entry.direction !== "outgoing-expense") return false;
      return duesFundedExpenses.some((expense) => expense.obligationId === entry.obligationId);
    }),
    (entry) => entry.amountCents
  );
  const paidSeparatelyFundedExpenseCents = sum(
    settlements.filter((entry) => {
      if (entry.direction !== "outgoing-expense") return false;
      return separateExpenses.some((expense) => expense.obligationId === entry.obligationId);
    }),
    (entry) => entry.amountCents
  );
  const separatelyFundedContributionCents = sum(
    settlements.filter((entry) => entry.direction === "incoming-separate-contribution"),
    (entry) => entry.amountCents
  );
  const adjustments = snapshot.adjustments.filter((entry) => entry.season === season);
  const reconciliationAdjustmentCents = sum(adjustments, (entry) => entry.amountCents);
  const approvedAwardCents = sum(awards, (entry) => entry.amountCents);
  const approvedDuesFundedExpenseCents = sum(duesFundedExpenses, (entry) => entry.amountCents);
  const separatelyFundedExpenseCents = sum(separateExpenses, (entry) => entry.amountCents);
  const duesAssessedCents = sum(dues, (entry) => entry.amountCents);
  const ring = duesFundedExpenses.find((entry) => entry.category === "championship-ring") ?? null;
  const champion = awards.find((entry) => entry.category === "champion") ?? null;
  const ringValidation = ring
    ? validateRingExpense(
        ring.amountCents,
        ring.expenseEvidence?.overrideApproved
          ? ring.expenseEvidence.approvedFundingCapCents ?? undefined
          : undefined
      )
    : null;
  const projectedChampionCashCents = ringValidation?.resolved
    ? calculateChampionPayout(
        ring!.amountCents,
        ring!.expenseEvidence?.overrideApproved
          ? ring!.expenseEvidence?.approvedFundingCapCents ?? undefined
          : undefined
      ).championCashCents
    : null;
  const settlementTotals = new Map<string, number>();
  for (const settlement of settlements) {
    if (settlement.direction === "incoming-separate-contribution") continue;
    settlementTotals.set(
      settlement.obligationId,
      (settlementTotals.get(settlement.obligationId) ?? 0) + settlement.amountCents
    );
  }
  const duplicateIds = seasonObligations.length - new Set(seasonObligations.map((entry) => entry.obligationId)).size;
  const invalidIdentities = [...dues, ...awards].filter(
    (entry) =>
      !entry.financialOwnerId ||
      !entry.franchiseId ||
      !OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.some(
        (mapping) =>
          mapping.financialOwnerId === entry.financialOwnerId &&
          mapping.franchiseId === entry.franchiseId
      )
  );
  const overSettled = obligations.filter(
    (entry) => (settlementTotals.get(entry.obligationId) ?? 0) > entry.amountCents
  );
  const duplicateProposals = awards.filter((entry) => entry.proposalKey).length -
    new Set(awards.map((entry) => entry.proposalKey).filter(Boolean)).size;
  const obligationById = new Map(obligations.map((entry) => [entry.obligationId, entry]));
  const invalidSettlements = settlements.filter((entry) => {
    const obligation = obligationById.get(entry.obligationId);
    if (!obligation) return true;
    if ((entry.direction === "incoming-dues" || entry.direction === "outgoing-award") && entry.paymentMethod !== "venmo") return true;
    if (entry.direction === "incoming-dues") return obligation.category !== "dues-assessment";
    if (entry.direction === "outgoing-award") return !AWARD_CATEGORIES.has(obligation.category);
    if (entry.direction === "outgoing-expense") return !["championship-ring", "auctioneer-food"].includes(obligation.category);
    return obligation.category !== "auctioneer-food" || obligation.fundingSource !== "separately-funded";
  });
  const invalidAwards = awards.filter((entry) => {
    if (entry.category === "weekly-high-score") return entry.amountCents !== 1_000;
    if (entry.category === "division-winner") return entry.amountCents !== 2_500;
    if (entry.category === "third-place") return entry.amountCents !== 5_000;
    if (entry.category === "runner-up") return entry.amountCents !== 10_000;
    return entry.category === "champion" && (projectedChampionCashCents === null || entry.amountCents !== projectedChampionCashCents);
  });
  const expectedPrizeStructure = Object.freeze([
    { label: "Weekly Awards", amountCents: 14_000 },
    { label: "Division Awards", amountCents: 7_500 },
    { label: "Third Place", amountCents: 5_000 },
    { label: "Runner-Up", amountCents: 10_000 },
    { label: "Championship", amountCents: 23_500 },
  ]);
  const completeSeason = context.seasonState === "complete";
  const requiredAwardCount = 20;
  const proposalUnresolved = context.proposalSet
    ? context.proposalSet.coverage.unresolved > 0 || context.proposalSet.issues.some((entry) => entry.severity === "error")
    : false;
  const checks = [
    check("dues-assessments", dues.length === 12 && duesAssessedCents === 60_000 ? "PASS" : "ISSUE", "12 valid dues assessments", `${dues.length} assessments total ${duesAssessedCents} cents.`),
    check("unique-obligations", duplicateIds === 0 ? "PASS" : "ISSUE", "No duplicate obligation IDs", duplicateIds === 0 ? "Every obligation ID is unique." : `${duplicateIds} duplicate obligation ID(s) found.`),
    check("canonical-identities", invalidIdentities.length === 0 ? "PASS" : "ISSUE", "Canonical financial owners resolved", invalidIdentities.length === 0 ? "Every dues assessment maps to one approved 2026 owner and franchise." : `${invalidIdentities.length} assessment identity issue(s) found.`),
    check("settlements", overSettled.length === 0 && invalidSettlements.length === 0 ? "PASS" : "ISSUE", "Settlements are valid and not over-settled", overSettled.length === 0 && invalidSettlements.length === 0 ? "Every active settlement follows its obligation and payment policy." : `${overSettled.length} over-settlement(s) and ${invalidSettlements.length} invalid settlement(s) found.`),
    check("award-rules", invalidAwards.length === 0 ? "PASS" : "ISSUE", "Approved awards match finance rules", invalidAwards.length === 0 ? "Approved award amounts match their categories and championship input." : `${invalidAwards.length} approved award obligation(s) conflict with current rules.`),
    check("ring", !ring ? "PENDING" : ringValidation?.resolved ? "PASS" : "ISSUE", "Championship ring approved", !ring ? "Actual ring cost has not been entered." : ringValidation?.resolved ? "The approved cost is within its effective funding cap." : "The approved ring cost lacks the required over-cap approval."),
    check("championship", !ring || !champion ? "PENDING" : champion.amountCents + ring.amountCents === 23_500 ? "PASS" : "ISSUE", "Champion cash plus ring equals $235", !ring || !champion ? "Championship winner and ring allocation are not both resolved yet." : `${champion.amountCents + ring.amountCents} cents are allocated to the championship.`),
    check("separate-funding", separateExpenses.every((entry) => entry.fundingSource === "separately-funded") ? "PASS" : "ISSUE", "Separately funded expenses stay outside dues", "Auctioneer-food amounts do not reduce the $600 prize pool."),
    check("contributions", separateExpenses.length === 0 ? "PASS" : separatelyFundedContributionCents === separatelyFundedExpenseCents ? "PASS" : completeSeason ? "ISSUE" : "PENDING", "Separate contributions reconcile", separateExpenses.length === 0 ? "No optional separately funded expense exists." : `${separatelyFundedContributionCents} cents contributed toward ${separatelyFundedExpenseCents} cents approved.`),
    check("proposal-uniqueness", duplicateProposals === 0 ? "PASS" : "ISSUE", "No duplicate Sleeper proposal obligations", duplicateProposals === 0 ? "Each approved proposal appears at most once." : `${duplicateProposals} duplicate proposal obligation(s) found.`),
    check("corrections", context.unresolvedAwardCorrection || proposalUnresolved ? "ISSUE" : "PASS", "No unresolved finance correction", context.unresolvedAwardCorrection || proposalUnresolved ? "A proposal or approved award needs commissioner resolution." : "No unresolved correction is currently detected."),
    check("required-awards", awards.length === requiredAwardCount ? "PASS" : completeSeason ? "ISSUE" : "PENDING", "All required awards accounted for", `${awards.length} of ${requiredAwardCount} required award obligations are approved.`),
    check("allocation", approvedAwardCents + approvedDuesFundedExpenseCents > 60_000 ? "ISSUE" : approvedAwardCents + approvedDuesFundedExpenseCents === 60_000 ? "PASS" : completeSeason ? "ISSUE" : "PENDING", "No unexplained dues-pool cents", `${approvedAwardCents + approvedDuesFundedExpenseCents} of 60000 cents are currently allocated.`),
    check("cash-settlement", duesAssessedCents === duesCollectedCents && approvedAwardCents === paidAwardCents && approvedDuesFundedExpenseCents === paidDuesFundedExpenseCents ? "PASS" : completeSeason ? "ISSUE" : "PENDING", "Required cash movements complete", "Dues, awards, and dues-funded expenses remain tracked independently."),
    check("reconciliation-adjustments", adjustments.every((entry) => Number.isSafeInteger(entry.amountCents) && entry.amountCents !== 0 && entry.reason.trim() && !Number.isNaN(Date.parse(entry.effectiveDate))) ? "PASS" : "ISSUE", "Reconciliation adjustments are explicit and valid", adjustments.length ? `${adjustments.length} commissioner-recorded adjustment(s) included.` : "No explicit reconciliation adjustment has been recorded."),
  ] as const;
  const currentlyAllocatedCents = approvedAwardCents + approvedDuesFundedExpenseCents;
  const issues = checks.filter((entry) => entry.state === "ISSUE");
  const pendingChecks = checks.filter((entry) => entry.state === "PENDING");
  const readyToClose = completeSeason && issues.length === 0 && pendingChecks.length === 0 && currentlyAllocatedCents === 60_000;
  const expenses = [...duesFundedExpenses, ...separateExpenses].map((expense) => {
    const paidCents = sum(
      settlements.filter(
        (entry) => entry.obligationId === expense.obligationId && entry.direction === "outgoing-expense"
      ),
      (entry) => entry.amountCents
    );
    const contributedCents = sum(
      settlements.filter(
        (entry) => entry.obligationId === expense.obligationId && entry.direction === "incoming-separate-contribution"
      ),
      (entry) => entry.amountCents
    );
    return Object.freeze({
      obligationId: expense.obligationId,
      category: expense.category as "championship-ring" | "auctioneer-food",
      fundingSource: expense.fundingSource,
      amountCents: expense.amountCents,
      paidCents,
      outstandingCents: expense.amountCents - paidCents,
      contributedCents,
      commissionerNote: expense.expenseEvidence?.commissionerNote ?? null,
      effectiveDate: expense.expenseEvidence?.effectiveDate ?? null,
      description: expense.expenseEvidence?.description ?? null,
      evidenceReference: expense.expenseEvidence?.evidenceReference ?? null,
    });
  });
  const adjustmentDetails = adjustments.map((entry) => Object.freeze({
    adjustmentId: entry.adjustmentId,
    category: entry.category,
    amountCents: entry.amountCents,
    reason: entry.reason,
    effectiveDate: entry.effectiveDate,
    createdAt: entry.createdAt,
    createdBy: entry.createdBy.actorId,
  }));
  return Object.freeze({
    season,
    status: readyToClose ? "ready-to-close" : issues.length ? "issues-found" : "season-in-progress",
    duesPoolCents: 60_000,
    duesAssessedCents,
    duesCollectedCents,
    duesOutstandingCents: duesAssessedCents - duesCollectedCents,
    expectedPrizeBudgetCents: 60_000,
    expectedPrizeStructure,
    fixedPrizeBudgetCents: 36_500,
    championshipAllocationCents: 23_500,
    approvedAwardCents,
    paidAwardCents,
    outstandingAwardCents: approvedAwardCents - paidAwardCents,
    approvedDuesFundedExpenseCents,
    paidDuesFundedExpenseCents,
    separatelyFundedExpenseCents,
    paidSeparatelyFundedExpenseCents,
    separatelyFundedContributionCents,
    reconciliationAdjustmentCents,
    approvedRingExpenseCents: ring?.amountCents ?? null,
    projectedChampionCashCents,
    approvedChampionCashCents: champion?.amountCents ?? null,
    currentlyAllocatedCents,
    currentlyUnallocatedCents: 60_000 - currentlyAllocatedCents,
    cashOnHandCents: duesCollectedCents + reconciliationAdjustmentCents - paidAwardCents - paidDuesFundedExpenseCents,
    checks: Object.freeze(checks),
    issues: Object.freeze(issues),
    pendingChecks: Object.freeze(pendingChecks),
    readyToClose,
    expenses: Object.freeze(expenses),
    adjustments: Object.freeze(adjustmentDetails),
  });
}
