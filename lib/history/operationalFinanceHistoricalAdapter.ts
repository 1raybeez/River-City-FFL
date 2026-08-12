import type { OperationalFinanceArchive } from "@/lib/finance/operationalFinanceLedgerTypes";
import type {
  FinancialTransactionCategory,
  HistoricalFinancialTransaction,
} from "@/lib/history/historicalFinancialData";

function dollars(cents: number) {
  return cents / 100;
}

function awardCategory(category: string): FinancialTransactionCategory {
  if (category === "weekly-high-score") return "weekly-prize";
  if (category === "division-winner") return "division-winner";
  if (category === "third-place") return "third-place";
  if (category === "runner-up") return "runner-up";
  return "champion";
}

export function operationalFinanceArchiveToHistoricalTransactions(
  archive: OperationalFinanceArchive
): readonly HistoricalFinancialTransaction[] {
  if (archive.archiveHash.length !== 64 || archive.season < 2026) {
    throw new Error("Only valid closed operational finance archives can enter historical finance.");
  }
  const settlements = archive.settlements as readonly Readonly<Record<string, unknown>>[];
  const paidFor = (obligationId: string, direction: string) =>
    settlements
      .filter((entry) => entry.obligationId === obligationId && entry.direction === direction)
      .reduce((sum, entry) => sum + (typeof entry.amountCents === "number" ? entry.amountCents : 0), 0);
  const obligations = archive.obligations as readonly Readonly<Record<string, unknown>>[];
  return Object.freeze(obligations.map((entry) => {
    const obligationId = String(entry.obligationId);
    const category = String(entry.category);
    const amountCents = Number(entry.amountCents);
    const isDues = category === "dues-assessment";
    const isAward = ["weekly-high-score", "division-winner", "third-place", "runner-up", "champion"].includes(category);
    const isRing = category === "championship-ring";
    const isFood = category === "auctioneer-food";
    const transactionCategory: FinancialTransactionCategory = isDues
      ? "dues"
      : isAward
        ? awardCategory(category)
        : isRing
          ? "championship-ring-expense"
          : "food-expense";
    const duesPaid = isDues ? paidFor(obligationId, "incoming-dues") : 0;
    const awardPaid = isAward ? paidFor(obligationId, "outgoing-award") : 0;
    const expensePaid = isRing || isFood ? paidFor(obligationId, "outgoing-expense") : 0;
    const financialOwnerId = typeof entry.financialOwnerId === "string" ? entry.financialOwnerId : null;
    const franchiseId = typeof entry.franchiseId === "string" ? entry.franchiseId : null;
    return {
      transactionKey: `operational-archive:${archive.season}:${obligationId}`,
      season: archive.season,
      transactionType: isDues ? "dues" : isAward ? "winnings" : "expense",
      category: transactionCategory,
      amount: dollars(amountCents),
      duesAssessedAmount: isDues ? dollars(amountCents) : 0,
      duesPaidAmount: isDues ? dollars(duesPaid) : 0,
      recordedWinningsAmount: isAward ? dollars(amountCents) : 0,
      cashPaidAmount: isAward ? dollars(awardPaid) : 0,
      outstandingAmount: isDues ? dollars(amountCents - duesPaid) : isAward ? dollars(amountCents - awardPaid) : dollars(amountCents - expensePaid),
      forfeitedRolledAmount: 0,
      financialOwnerId,
      originatingFinancialOwnerId: null,
      franchiseId,
      rawOwnerLabel: financialOwnerId,
      rawTeamLabel: franchiseId,
      paymentState: isDues || isAward ? "paid" : "expense-paid",
      fundingSource: entry.fundingSource === "separately-funded" ? "separate" : "dues",
      sourceWorkbook: `operational-finance-archive:${archive.season}.json`,
      sourceWorkbookSha256: archive.archiveHash,
      sourceSheet: "operational-ledger",
      sourceCellRange: obligationId,
      description: `Closed ${archive.season} operational finance ${category}.`,
      notes: [],
      resolutionState: "commissioner-ruling",
    } satisfies HistoricalFinancialTransaction;
  }).sort((first, second) => first.transactionKey.localeCompare(second.transactionKey)));
}

export function closedOperationalFinanceArchivesToHistoricalTransactions(
  archives: readonly OperationalFinanceArchive[]
) {
  return Object.freeze(
    archives
      .filter((archive) => archive.archiveHash.length === 64)
      .flatMap(operationalFinanceArchiveToHistoricalTransactions)
  );
}
