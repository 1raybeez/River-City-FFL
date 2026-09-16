import type { PublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinancePresentation";
import type { FinancialHistoryPresentation } from "@/lib/managers/financialHistoryPresentation";
import { getFranchiseById, getOwnerProfileById } from "@/lib/managers/identityData";
import type { WeeklyHighScoreSettlement } from "@/lib/weeklyHighScoreSettlement";

export type PublicWeeklyHighScoreAward = Readonly<{
  week: number;
  teamNames: readonly string[];
  owners: readonly string[];
  score: number;
  prizeCents: number;
}>;

export type PublicPayoutAward = Readonly<{
  label: string;
  recipient?: string;
  amountCents: number;
  status?: "PENDING" | "APPROVED" | "PAID";
}>;

export type PublicPayoutExpense = Readonly<{
  label: string;
  amountCents: number;
  funding: string;
}>;

export type PublicPayoutCurrentSeason = Readonly<{
  season: 2026;
  statusLabel: PublicOperationalFinancePresentation["statusLabel"];
  operationalStatus: string;
  leagueDuesCents: number;
  ownerCount: number;
  duesPoolCents: number;
  duesAssessedCents: number;
  duesCollectedCents: number;
  duesOutstandingCents: number;
  paidCount: number;
  owedCount: number;
  expectedPrizeStructure: readonly Readonly<{ label: string; amountCents: number }>[];
  expectedPrizeTotalCents: number;
  approvedAwards: readonly PublicPayoutAward[];
  approvedExpenses: readonly PublicPayoutExpense[];
  championshipAllocationCents: number;
  approvedRingExpenseCents: number | null;
  projectedChampionCashCents: number | null;
  reconciliationStatus: string;
  fundLocationSummary: readonly string[];
  weeklyHighScoreAwards: readonly PublicWeeklyHighScoreAward[];
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
  presentation: PublicOperationalFinancePresentation,
  settlements: readonly WeeklyHighScoreSettlement[] = []
): PublicPayoutCurrentSeason {
  return {
    season: presentation.season,
    statusLabel: presentation.statusLabel,
    operationalStatus: presentation.operationalStatus,
    leagueDuesCents: presentation.leagueDuesCents,
    ownerCount: presentation.ownerCount,
    duesPoolCents: presentation.duesPoolCents,
    duesAssessedCents: presentation.duesAssessedCents,
    duesCollectedCents: presentation.duesCollectedCents,
    duesOutstandingCents: presentation.duesOutstandingCents,
    paidCount: presentation.paidCount,
    owedCount: presentation.owedCount,
    expectedPrizeStructure: presentation.expectedPrizeStructure,
    expectedPrizeTotalCents: presentation.expectedPrizeStructure.reduce((sum, item) => sum + item.amountCents, 0),
    approvedAwards: presentation.approvedAwards.map(({ label, recipient, amountCents, status }) => ({
      label,
      recipient,
      amountCents,
      status,
    })),
    approvedExpenses: presentation.approvedExpenses.map(({ label, amountCents, funding }) => ({
      label,
      amountCents,
      funding,
    })),
    championshipAllocationCents: presentation.championshipAllocationCents,
    approvedRingExpenseCents: presentation.approvedRingExpenseCents,
    projectedChampionCashCents: presentation.projectedChampionCashCents,
    reconciliationStatus: presentation.reconciliationStatus,
    fundLocationSummary: presentation.fundLocationSummary,
    weeklyHighScoreAwards: buildWeeklyHighScoreAwards(settlements),
  };
}

export function buildWeeklyHighScoreAwards(settlements: readonly WeeklyHighScoreSettlement[]): readonly PublicWeeklyHighScoreAward[] {
  return [...settlements]
    .filter((settlement) => settlement.season === 2026 && settlement.status === "settled")
    .sort((first, second) => first.week - second.week)
    .map((settlement) => ({
      week: settlement.week,
      teamNames: settlement.winnerFranchiseIds.flatMap((id) => {
        const franchise = getFranchiseById(id);
        return franchise ? [franchise.currentTeamName] : [];
      }),
      owners: settlement.winnerFranchiseIds.flatMap((id) => {
        const franchise = getFranchiseById(id);
        return franchise ? franchise.activeOwnerIds.flatMap((ownerId) => {
          const owner = getOwnerProfileById(ownerId);
          return owner ? [owner.fullName] : [];
        }) : [];
      }),
      score: settlement.highScore,
      prizeCents: settlement.prizePerWinner,
    }));
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
        label: award.category,
        amountCents: Math.round(award.amount * 100),
      })),
      weeklyAwards: season.weeklyAwards.map((award) => ({
        label: "Weekly high-score award",
        amountCents: Math.round(award.amount * 100),
      })),
      expenses: season.expenses.map(({ category, amount, funding }) => ({
        label: category,
        amountCents: Math.round(amount * 100),
        funding,
      })),
      specialNote: null,
    })),
    coverage: presentation.coverage,
  };
}
