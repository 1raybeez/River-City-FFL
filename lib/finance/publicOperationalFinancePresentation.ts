import type { OperationalFinanceLedgerSnapshot } from "@/lib/finance/operationalFinanceLedgerTypes";
import {
  calculateChampionPayout,
  getChampionshipAllocation,
  getExpectedDivisionAllocation,
  getExpectedDuesPool,
  getExpectedWeeklyAllocation,
  OPERATIONAL_FINANCE_SEASON_2026,
} from "@/lib/finance/operationalFinanceRules";
import { getFranchiseById, getOwnerProfileById } from "@/lib/managers/identityData";

export type PublicOperationalFinanceAward = Readonly<{
  label: string;
  recipient: string;
  amountCents: number;
  status: "PENDING" | "APPROVED" | "PAID";
}>;

export type PublicOperationalFinanceExpense = Readonly<{
  label: "Championship Ring" | "Auctioneer Food";
  amountCents: number;
  funding: "Dues funded" | "Separately funded";
}>;

export type PublicOperationalFinancePresentation = Readonly<{
  season: 2026;
  statusLabel: "Operational / Provisional" | "Closed / Archived";
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
  approvedAwards: readonly PublicOperationalFinanceAward[];
  approvedExpenses: readonly PublicOperationalFinanceExpense[];
  championshipAllocationCents: number;
  approvedRingExpenseCents: number | null;
  projectedChampionCashCents: number | null;
  reconciliationStatus: string;
  fundLocationSummary: readonly string[];
}>;

const AWARD_CATEGORIES = new Set([
  "weekly-high-score",
  "division-winner",
  "third-place",
  "runner-up",
  "champion",
]);

function moneyLabel(category: string, facts: Readonly<Record<string, string | number | boolean | null>>) {
  if (category === "weekly-high-score" && typeof facts.week === "number") return `Week ${facts.week} High Score`;
  if (category === "division-winner") return "Division Winner";
  if (category === "third-place") return "Third Place";
  if (category === "runner-up") return "Runner-Up";
  return "Champion";
}

function paidCents(snapshot: OperationalFinanceLedgerSnapshot, obligationId: string, direction: string) {
  const reversed = new Set(snapshot.reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId));
  return snapshot.settlements
    .filter((entry) => entry.obligationId === obligationId && entry.direction === direction && !reversed.has(entry.settlementId))
    .reduce((total, entry) => total + entry.amountCents, 0);
}

export function buildPublicOperationalFinancePresentation(
  snapshot: OperationalFinanceLedgerSnapshot
): PublicOperationalFinancePresentation {
  const season = snapshot.seasons.find((entry) => entry.season === 2026);
  if (!season) throw new Error("The 2026 operational finance ledger was not found.");
  const reversed = new Set(snapshot.reversals.filter((entry) => entry.targetType === "obligation").map((entry) => entry.targetId));
  const obligations = snapshot.obligations.filter((entry) => entry.season === 2026 && !reversed.has(entry.obligationId));
  const dues = obligations.filter((entry) => entry.category === "dues-assessment");
  const duesStatuses = dues.map((entry) =>
    paidCents(snapshot, entry.obligationId, "incoming-dues") >= entry.amountCents
      ? "PAID" as const
      : "OWED" as const
  );
  const awards = obligations.filter((entry) => AWARD_CATEGORIES.has(entry.category)).map((entry) => {
    const owner = getOwnerProfileById(entry.financialOwnerId ?? "");
    const franchise = getFranchiseById(entry.franchiseId ?? "");
    const isFinalized = entry.proposalEvidence?.finalityState === "sleeper-final" && Boolean(owner) && Boolean(franchise);
    const settled = paidCents(snapshot, entry.obligationId, "outgoing-award") >= entry.amountCents;
    return {
      label: moneyLabel(entry.category, entry.proposalEvidence?.facts ?? {}),
      recipient: isFinalized ? owner!.fullName : "Pending",
      amountCents: entry.amountCents,
      status: isFinalized ? (settled ? "PAID" as const : "APPROVED" as const) : "PENDING" as const,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
  const expenses = obligations.filter((entry) => entry.category === "championship-ring" || entry.category === "auctioneer-food").map((entry) => ({
    label: entry.category === "championship-ring" ? "Championship Ring" as const : "Auctioneer Food" as const,
    amountCents: entry.amountCents,
    funding: entry.fundingSource === "dues-funded" ? "Dues funded" as const : "Separately funded" as const,
  })).sort((a, b) => a.label.localeCompare(b.label));
  const ring = expenses.find((entry) => entry.label === "Championship Ring");
  const ringObligation = obligations.find((entry) => entry.category === "championship-ring");
  const duesAssessedCents = dues.reduce((total, entry) => total + entry.amountCents, 0);
  const duesCollectedCents = dues.reduce((total, entry) => total + Math.min(entry.amountCents, paidCents(snapshot, entry.obligationId, "incoming-dues")), 0);
  const awardCount = awards.length;
  const requiredAwardCount =
    OPERATIONAL_FINANCE_SEASON_2026.weeklyAward.awardCount +
    OPERATIONAL_FINANCE_SEASON_2026.divisionAwards.awardCount +
    OPERATIONAL_FINANCE_SEASON_2026.placementAwards.reduce(
      (total, award) => total + award.awardCount,
      0
    ) +
    1;
  const operationalStatus = season.status === "closed" ? "Historical archive available" : duesCollectedCents < duesAssessedCents ? "Dues collection underway" : awardCount < requiredAwardCount ? "Awards pending" : "Season in progress";
  const reconciliationStatus = season.status === "closed" ? "Closed and archived" : "Reconciliation not yet final";
  const config = OPERATIONAL_FINANCE_SEASON_2026;
  return Object.freeze({
    season: 2026,
    statusLabel: season.status === "closed" ? "Closed / Archived" : "Operational / Provisional",
    operationalStatus,
    leagueDuesCents: config.entryFeeCents,
    ownerCount: config.competitiveFranchiseCount,
    duesPoolCents: getExpectedDuesPool(config),
    duesAssessedCents,
    duesCollectedCents,
    duesOutstandingCents: duesAssessedCents - duesCollectedCents,
    paidCount: duesStatuses.filter((status) => status === "PAID").length,
    owedCount: duesStatuses.filter((status) => status === "OWED").length,
    expectedPrizeStructure: Object.freeze([
      { label: "Weekly Awards", amountCents: getExpectedWeeklyAllocation(config) },
      { label: "Division Awards", amountCents: getExpectedDivisionAllocation(config) },
      ...config.placementAwards.map((award) => ({
        label: award.category === "third-place" ? "Third Place" : "Runner-Up",
        amountCents: award.amountCents * award.awardCount,
      })),
      { label: "Championship Allocation", amountCents: getChampionshipAllocation(config) },
    ]),
    approvedAwards: Object.freeze(awards),
    approvedExpenses: Object.freeze(expenses),
    championshipAllocationCents: getChampionshipAllocation(config),
    approvedRingExpenseCents: ring?.amountCents ?? null,
    projectedChampionCashCents: ring && ringObligation
      ? calculateChampionPayout(
          ring.amountCents,
          ringObligation.expenseEvidence?.overrideApproved
            ? ringObligation.expenseEvidence.approvedFundingCapCents ?? undefined
            : undefined
        ).championCashCents
      : null,
    reconciliationStatus,
    fundLocationSummary: Object.freeze([
      "Venmo",
      "VACU reserve/escrow",
      "PayPal when applicable",
    ]),
  });
}
