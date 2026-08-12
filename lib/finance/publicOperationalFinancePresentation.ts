import type { OperationalFinanceLedgerSnapshot } from "@/lib/finance/operationalFinanceLedgerTypes";
import { calculateChampionPayout, OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";
import { getFranchiseById, getOwnerProfileById } from "@/lib/managers/identityData";

export type PublicOperationalFinanceDuesRow = Readonly<{
  franchiseId: string;
  franchiseName: string;
  financialOwnerId: string;
  financialOwnerName: string;
  coOwnerContext: readonly string[];
  status: "PAID" | "NOT PAID";
}>;

export type PublicOperationalFinanceAward = Readonly<{
  awardId: string;
  label: string;
  recipient: string;
  franchiseName: string;
  amountCents: number;
  paymentStatus: "PAID" | "NOT YET PAID";
}>;

export type PublicOperationalFinanceExpense = Readonly<{
  expenseId: string;
  label: "Championship Ring" | "Auctioneer Food";
  amountCents: number;
  funding: "Dues funded" | "Separately funded";
}>;

export type PublicOperationalFinancePresentation = Readonly<{
  season: 2026;
  statusLabel: "Operational / Provisional" | "Closed / Archived";
  operationalStatus: string;
  duesPoolCents: number;
  duesAssessedCents: number;
  duesCollectedCents: number;
  duesOutstandingCents: number;
  paidCount: number;
  notPaidCount: number;
  duesRows: readonly PublicOperationalFinanceDuesRow[];
  expectedPrizeStructure: readonly Readonly<{ label: string; amountCents: number }>[];
  approvedAwards: readonly PublicOperationalFinanceAward[];
  approvedExpenses: readonly PublicOperationalFinanceExpense[];
  championshipAllocationCents: number;
  approvedRingExpenseCents: number | null;
  projectedChampionCashCents: number | null;
  reconciliationStatus: string;
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
  const mappings = new Map(OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.map((entry) => [entry.franchiseId, entry]));
  const duesRows = dues.map((entry) => {
    const mapping = mappings.get(entry.franchiseId ?? "");
    const owner = getOwnerProfileById(entry.financialOwnerId ?? "");
    const franchise = getFranchiseById(entry.franchiseId ?? "");
    return {
      franchiseId: entry.franchiseId ?? "",
      franchiseName: franchise?.currentTeamName ?? entry.franchiseId ?? "League franchise",
      financialOwnerId: entry.financialOwnerId ?? "",
      financialOwnerName: owner?.fullName ?? entry.financialOwnerId ?? "Financial owner",
      coOwnerContext: (mapping?.excludedCoOwnerIds ?? []).map((id) => getOwnerProfileById(id)?.fullName ?? id),
      status: paidCents(snapshot, entry.obligationId, "incoming-dues") >= entry.amountCents ? "PAID" as const : "NOT PAID" as const,
    };
  }).sort((a, b) => a.franchiseName.localeCompare(b.franchiseName));
  const awards = obligations.filter((entry) => AWARD_CATEGORIES.has(entry.category)).map((entry) => {
    const owner = getOwnerProfileById(entry.financialOwnerId ?? "");
    const franchise = getFranchiseById(entry.franchiseId ?? "");
    return {
      awardId: entry.obligationId,
      label: moneyLabel(entry.category, entry.proposalEvidence?.facts ?? {}),
      recipient: owner?.fullName ?? entry.financialOwnerId ?? "Approved recipient",
      franchiseName: franchise?.currentTeamName ?? entry.franchiseId ?? "League franchise",
      amountCents: entry.amountCents,
      paymentStatus: paidCents(snapshot, entry.obligationId, "outgoing-award") >= entry.amountCents ? "PAID" as const : "NOT YET PAID" as const,
    };
  }).sort((a, b) => a.awardId.localeCompare(b.awardId));
  const expenses = obligations.filter((entry) => entry.category === "championship-ring" || entry.category === "auctioneer-food").map((entry) => ({
    expenseId: entry.obligationId,
    label: entry.category === "championship-ring" ? "Championship Ring" as const : "Auctioneer Food" as const,
    amountCents: entry.amountCents,
    funding: entry.fundingSource === "dues-funded" ? "Dues funded" as const : "Separately funded" as const,
  })).sort((a, b) => a.expenseId.localeCompare(b.expenseId));
  const ring = expenses.find((entry) => entry.label === "Championship Ring");
  const ringObligation = obligations.find((entry) => entry.category === "championship-ring");
  const duesAssessedCents = dues.reduce((total, entry) => total + entry.amountCents, 0);
  const duesCollectedCents = dues.reduce((total, entry) => total + Math.min(entry.amountCents, paidCents(snapshot, entry.obligationId, "incoming-dues")), 0);
  const awardCount = awards.length;
  const operationalStatus = season.status === "closed" ? "Historical archive available" : duesCollectedCents < duesAssessedCents ? "Dues collection underway" : awardCount < 20 ? "Awards pending" : "Season in progress";
  const reconciliationStatus = season.status === "closed" ? "Closed and archived" : "Reconciliation not yet final";
  return Object.freeze({
    season: 2026,
    statusLabel: season.status === "closed" ? "Closed / Archived" : "Operational / Provisional",
    operationalStatus,
    duesPoolCents: 60_000,
    duesAssessedCents,
    duesCollectedCents,
    duesOutstandingCents: duesAssessedCents - duesCollectedCents,
    paidCount: duesRows.filter((entry) => entry.status === "PAID").length,
    notPaidCount: duesRows.filter((entry) => entry.status === "NOT PAID").length,
    duesRows: Object.freeze(duesRows),
    expectedPrizeStructure: Object.freeze([
      { label: "Weekly Awards", amountCents: 14_000 },
      { label: "Division Awards", amountCents: 7_500 },
      { label: "Third Place", amountCents: 5_000 },
      { label: "Runner-Up", amountCents: 10_000 },
      { label: "Championship Allocation", amountCents: 23_500 },
    ]),
    approvedAwards: Object.freeze(awards),
    approvedExpenses: Object.freeze(expenses),
    championshipAllocationCents: 23_500,
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
  });
}
