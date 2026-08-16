import type { PublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinancePresentation";
import type { FinancialHistoryPresentation } from "@/lib/managers/financialHistoryPresentation";

export type PublicPayoutAward = Readonly<{
  awardId: string;
  label: string;
  amountCents: number;
}>;

export type PublicPayoutExpense = Readonly<{
  expenseId: string;
  label: string;
  amountCents: number;
  funding: string;
}>;

export type PublicPayoutCurrentSeason = Readonly<{
  season: 2026;
  statusLabel: PublicOperationalFinancePresentation["statusLabel"];
  operationalStatus: string;
  duesPoolCents: number;
  duesAssessedCents: number;
  duesCollectedCents: number;
  duesOutstandingCents: number;
  paidCount: number;
  notPaidCount: number;
  expectedPrizeStructure: readonly Readonly<{ label: string; amountCents: number }>[];
  expectedPrizeTotalCents: number;
  approvedAwards: readonly PublicPayoutAward[];
  approvedExpenses: readonly PublicPayoutExpense[];
  championshipAllocationCents: number;
  approvedRingExpenseCents: number | null;
  projectedChampionCashCents: number | null;
  reconciliationStatus: string;
}>;

export type PublicPayoutSeason = Readonly<{
  season: number;
  reconciliationState: "Reconciled";
  summary: FinancialHistoryPresentation["seasons"][number]["summary"];
  seasonAwards: readonly PublicPayoutAward[];
  weeklyAwards: readonly PublicPayoutAward[];
  expenses: readonly PublicPayoutExpense[];
  specialNote: string | null;
}>;

export type PublicPayoutHistory = Readonly<{
  defaultSeason: number;
  seasonOptions: readonly number[];
  overallSummary: FinancialHistoryPresentation["overallSummary"];
  seasons: readonly PublicPayoutSeason[];
  coverage: FinancialHistoryPresentation["coverage"];
}>;

export function buildPublicPayoutCurrentSeason(
  presentation: PublicOperationalFinancePresentation
): PublicPayoutCurrentSeason {
  return {
    season: presentation.season,
    statusLabel: presentation.statusLabel,
    operationalStatus: presentation.operationalStatus,
    duesPoolCents: presentation.duesPoolCents,
    duesAssessedCents: presentation.duesAssessedCents,
    duesCollectedCents: presentation.duesCollectedCents,
    duesOutstandingCents: presentation.duesOutstandingCents,
    paidCount: presentation.paidCount,
    notPaidCount: presentation.notPaidCount,
    expectedPrizeStructure: presentation.expectedPrizeStructure,
    expectedPrizeTotalCents: presentation.expectedPrizeStructure.reduce((sum, item) => sum + item.amountCents, 0),
    approvedAwards: presentation.approvedAwards.map(({ awardId, label, amountCents }) => ({
      awardId,
      label,
      amountCents,
    })),
    approvedExpenses: presentation.approvedExpenses.map(({ expenseId, label, amountCents, funding }) => ({
      expenseId,
      label,
      amountCents,
      funding,
    })),
    championshipAllocationCents: presentation.championshipAllocationCents,
    approvedRingExpenseCents: presentation.approvedRingExpenseCents,
    projectedChampionCashCents: presentation.projectedChampionCashCents,
    reconciliationStatus: presentation.reconciliationStatus,
  };
}

export function buildPublicPayoutHistory(
  presentation: FinancialHistoryPresentation
): PublicPayoutHistory {
  return {
    defaultSeason: presentation.defaultSeason,
    seasonOptions: presentation.seasonOptions,
    overallSummary: presentation.overallSummary,
    seasons: presentation.seasons.map((season) => ({
      season: season.season,
      reconciliationState: season.reconciliationState,
      summary: season.summary,
      seasonAwards: season.seasonAwards.map((award) => ({
        awardId: award.transactionKey,
        label: award.category,
        amountCents: Math.round(award.amount * 100),
      })),
      weeklyAwards: season.weeklyAwards.map((award) => ({
        awardId: award.transactionKey,
        label: "Weekly high-score award",
        amountCents: Math.round(award.amount * 100),
      })),
      expenses: season.expenses.map(({ transactionKey, category, amount, funding }) => ({
        expenseId: transactionKey,
        label: category,
        amountCents: Math.round(amount * 100),
        funding,
      })),
      specialNote: null,
    })),
    coverage: presentation.coverage,
  };
}
