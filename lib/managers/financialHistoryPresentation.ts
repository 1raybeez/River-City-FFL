import type {
  FinancialHistoryAggregate,
  FinancialSeasonLedger,
} from "@/lib/history/financialHistory";
import type {
  FinancialPaymentState,
  FinancialTransactionCategory,
  HistoricalFinancialTransaction,
} from "@/lib/history/historicalFinancialData";

export type FinancialIdentityDisplay = Readonly<{
  id: string;
  name: string;
  ownerIdsBySeason?: Readonly<Record<number, readonly string[]>>;
}>;

export type FinancialSummaryItem = Readonly<{
  label: string;
  value: number;
  kind: "count" | "currency";
  note?: string;
}>;

export type FinancialRecipientPresentation = Readonly<{
  ownerId: string;
  ownerName: string;
  franchiseId: string;
  franchiseName: string;
  coOwnerNames: readonly string[];
  duesPaid: number;
  recordedWinnings: number;
  cashPaid: number;
}>;

export type FinancialAwardPresentation = Readonly<{
  transactionKey: string;
  recipient: string;
  franchise: string;
  category: string;
  description: string;
  amount: number;
  paymentState: string;
}>;

export type FinancialRolloverPresentation = Readonly<{
  transactionKey: string;
  weekLabel: string;
  originalWinner: string;
  amount: number;
  reason: string;
  finalRecipient: string;
  accountingNote: string;
}>;

export type FinancialExpensePresentation = Readonly<{
  transactionKey: string;
  category: string;
  amount: number;
  funding: "Dues funded" | "Separately funded";
  description: string;
}>;

export type FinancialSeasonPresentation = Readonly<{
  season: number;
  reconciliationState: "Reconciled";
  summary: readonly FinancialSummaryItem[];
  recipients: readonly FinancialRecipientPresentation[];
  weeklyAwards: readonly FinancialAwardPresentation[];
  seasonAwards: readonly FinancialAwardPresentation[];
  rollovers: readonly FinancialRolloverPresentation[];
  expenses: readonly FinancialExpensePresentation[];
  specialNote: string | null;
}>;

export type FinancialLeaderboardRow = Readonly<{
  rank: number;
  ownerId: string;
  ownerName: string;
  seasons: readonly number[];
  recordedWinnings: number;
  cashPaid: number;
}>;

export type FinancialHistoryPresentation = Readonly<{
  defaultSeason: 2025;
  seasonOptions: readonly number[];
  overallSummary: readonly FinancialSummaryItem[];
  seasons: readonly FinancialSeasonPresentation[];
  leaderboard: readonly FinancialLeaderboardRow[];
  coverage: Readonly<{
    firstSeason: 2016;
    latestSeason: 2025;
    pre2016: "no-source";
    season2026: "outside-historical-ledger";
    statement: string;
  }>;
}>;

const CATEGORY_LABELS: Record<FinancialTransactionCategory, string> = {
  dues: "League dues",
  "weekly-prize": "Weekly high-score prize",
  "weekly-prize-rollover": "Forfeited weekly prize",
  "fourth-place": "Fourth place",
  "third-place": "Third place",
  "runner-up": "Runner-up",
  champion: "Champion",
  "loser-bracket-winner": "Loser Bracket Winner",
  "division-winner": "Division winner",
  "trophy-nameplate-expense": "Trophy nameplate",
  "food-expense": "League food",
  "championship-ring-expense": "Championship ring",
};

const PAYMENT_LABELS: Record<FinancialPaymentState, string> = {
  paid: "Paid",
  offset: "Applied as dues offset",
  "forfeited-rolled": "Forfeited and rolled",
  "expense-paid": "Paid expense",
};

const SEASON_AWARD_CATEGORIES = new Set<FinancialTransactionCategory>([
  "fourth-place",
  "third-place",
  "runner-up",
  "champion",
  "loser-bracket-winner",
  "division-winner",
]);

function ownerName(
  ownerId: string | null,
  ownerDisplays: ReadonlyMap<string, FinancialIdentityDisplay>,
  fallback?: string | null
) {
  if (!ownerId) return fallback ?? "League";
  return ownerDisplays.get(ownerId)?.name ?? fallback ?? ownerId;
}

function franchiseName(
  franchiseId: string | null,
  franchiseDisplays: ReadonlyMap<string, FinancialIdentityDisplay>,
  fallback?: string | null
) {
  if (!franchiseId) return fallback ?? "River City FFL";
  return franchiseDisplays.get(franchiseId)?.name ?? fallback ?? franchiseId;
}

function getWeekLabel(transaction: HistoricalFinancialTransaction) {
  const match = transaction.description.match(/Week\s+(\d+)/i);
  return match ? `Week ${match[1]}` : "Weekly prize";
}

function buildAward(
  transaction: HistoricalFinancialTransaction,
  ownerDisplays: ReadonlyMap<string, FinancialIdentityDisplay>,
  franchiseDisplays: ReadonlyMap<string, FinancialIdentityDisplay>
): FinancialAwardPresentation {
  return {
    transactionKey: transaction.transactionKey,
    recipient: ownerName(
      transaction.financialOwnerId,
      ownerDisplays,
      transaction.rawOwnerLabel
    ),
    franchise: franchiseName(
      transaction.franchiseId,
      franchiseDisplays,
      transaction.rawTeamLabel
    ),
    category: CATEGORY_LABELS[transaction.category],
    description: transaction.description,
    amount: transaction.recordedWinningsAmount,
    paymentState: PAYMENT_LABELS[transaction.paymentState],
  };
}

function buildSeasonSummary(ledger: FinancialSeasonLedger) {
  return [
    { label: "Dues paid", value: ledger.duesPaid, kind: "currency" as const },
    {
      label: "Recorded winnings",
      value: ledger.recordedWinnings,
      kind: "currency" as const,
    },
    { label: "Cash paid", value: ledger.cashPaid, kind: "currency" as const },
    {
      label: "League expenses",
      value: ledger.leagueExpenses,
      kind: "currency" as const,
    },
    {
      label: "Rolled prizes",
      value: ledger.weeklyPrizesForfeited,
      kind: "currency" as const,
      note: "Routing record; not added to winnings a second time.",
    },
    {
      label: "Outstanding",
      value: ledger.outstanding,
      kind: "currency" as const,
    },
  ];
}

function buildRecipients(
  season: number,
  transactions: readonly HistoricalFinancialTransaction[],
  ownerDisplays: ReadonlyMap<string, FinancialIdentityDisplay>,
  franchiseDisplays: ReadonlyMap<string, FinancialIdentityDisplay>
) {
  const recipients = new Map<string, FinancialRecipientPresentation>();

  transactions.forEach((transaction) => {
    if (!transaction.financialOwnerId || !transaction.franchiseId) return;
    if (
      transaction.duesPaidAmount === 0 &&
      transaction.recordedWinningsAmount === 0 &&
      transaction.cashPaidAmount === 0
    ) {
      return;
    }

    const key = `${transaction.financialOwnerId}:${transaction.franchiseId}`;
    const current = recipients.get(key);
    const franchise = franchiseDisplays.get(transaction.franchiseId);
    recipients.set(key, {
      ownerId: transaction.financialOwnerId,
      ownerName: ownerName(
        transaction.financialOwnerId,
        ownerDisplays,
        transaction.rawOwnerLabel
      ),
      franchiseId: transaction.franchiseId,
      franchiseName: franchiseName(
        transaction.franchiseId,
        franchiseDisplays,
        transaction.rawTeamLabel
      ),
      coOwnerNames: (franchise?.ownerIdsBySeason?.[season] ?? [])
        .filter((ownerId) => ownerId !== transaction.financialOwnerId)
        .map((ownerId) => ownerName(ownerId, ownerDisplays)),
      duesPaid: (current?.duesPaid ?? 0) + transaction.duesPaidAmount,
      recordedWinnings:
        (current?.recordedWinnings ?? 0) + transaction.recordedWinningsAmount,
      cashPaid: (current?.cashPaid ?? 0) + transaction.cashPaidAmount,
    });
  });

  return [...recipients.values()].sort(
    (first, second) =>
      second.recordedWinnings - first.recordedWinnings ||
      first.ownerName.localeCompare(second.ownerName)
  );
}

function buildSpecialNote(season: number) {
  if (season !== 2022) return null;
  return "The 2022 record follows the explicit final settlement: Tommy Moore received $175 as champion, including the $20 rolled championship pot; David Besedich received the separate $175 runner-up settlement; Brian Stevens received $75 for third place; Billy Biddle received $25 for fourth place; and Ray Long received $25 as Loser Bracket Winner. The sporting co-champion designation does not replace those settlement transactions. Billy's two $10 forfeitures route to Tommy but are not added again. A $5 trophy nameplate expense completes the $600 reconciliation.";
}

export function buildFinancialHistoryPresentation(input: {
  aggregate: FinancialHistoryAggregate;
  ownerDisplays: readonly FinancialIdentityDisplay[];
  franchiseDisplays: readonly FinancialIdentityDisplay[];
}): FinancialHistoryPresentation {
  const ownerDisplays = new Map(input.ownerDisplays.map((owner) => [owner.id, owner]));
  const franchiseDisplays = new Map(
    input.franchiseDisplays.map((franchise) => [franchise.id, franchise])
  );
  const seasonOptions = [...input.aggregate.coverage.seasons].sort(
    (first, second) => second - first
  );
  const seasons = seasonOptions.map((season) => {
    const ledger = input.aggregate.seasons.find((item) => item.season === season);
    if (!ledger) throw new Error(`Missing reconciled financial season ${season}.`);
    const transactions = input.aggregate.transactions.filter(
      (transaction) => transaction.season === season
    );
    const weeklyAwards = transactions
      .filter((transaction) => transaction.category === "weekly-prize")
      .map((transaction) => buildAward(transaction, ownerDisplays, franchiseDisplays))
      .sort((first, second) => first.description.localeCompare(second.description, undefined, { numeric: true }));
    const seasonAwards = transactions
      .filter((transaction) => SEASON_AWARD_CATEGORIES.has(transaction.category))
      .map((transaction) => buildAward(transaction, ownerDisplays, franchiseDisplays));
    const rollovers = transactions
      .filter((transaction) => transaction.category === "weekly-prize-rollover")
      .map((transaction) => ({
        transactionKey: transaction.transactionKey,
        weekLabel: getWeekLabel(transaction),
        originalWinner: ownerName(
          transaction.originatingFinancialOwnerId,
          ownerDisplays,
          transaction.rawOwnerLabel
        ),
        amount: transaction.forfeitedRolledAmount,
        reason: transaction.notes[0] ?? "Forfeited under league rules.",
        finalRecipient: ownerName(transaction.financialOwnerId, ownerDisplays),
        accountingNote:
          transaction.notes[1] ??
          "The final recipient is reflected in recorded winnings; this routing row is not added again.",
      }));
    const expenses = transactions
      .filter((transaction) => transaction.transactionType === "expense")
      .map((transaction) => ({
        transactionKey: transaction.transactionKey,
        category: CATEGORY_LABELS[transaction.category],
        amount: transaction.amount,
        funding:
          transaction.fundingSource === "separate"
            ? ("Separately funded" as const)
            : ("Dues funded" as const),
        description: transaction.notes[0] ?? transaction.description,
      }));

    return {
      season,
      reconciliationState: "Reconciled" as const,
      summary: buildSeasonSummary(ledger),
      recipients: buildRecipients(
        season,
        transactions,
        ownerDisplays,
        franchiseDisplays
      ),
      weeklyAwards,
      seasonAwards,
      rollovers,
      expenses,
      specialNote: buildSpecialNote(season),
    };
  });
  const leaderboard = [...input.aggregate.ownerSummaries]
    .filter((summary) => summary.recordedWinnings > 0)
    .sort(
      (first, second) =>
        second.recordedWinnings - first.recordedWinnings ||
        ownerName(first.ownerId, ownerDisplays).localeCompare(
          ownerName(second.ownerId, ownerDisplays)
        )
    )
    .map((summary, index) => ({
      rank: index + 1,
      ownerId: summary.ownerId,
      ownerName: ownerName(summary.ownerId, ownerDisplays),
      seasons: summary.seasons,
      recordedWinnings: summary.recordedWinnings,
      cashPaid: summary.cashPaid,
    }));

  return {
    defaultSeason: 2025,
    seasonOptions,
    overallSummary: [
      { label: "Reconciled seasons", value: seasonOptions.length, kind: "count" },
      { label: "Dues paid", value: input.aggregate.totals.duesPaid, kind: "currency" },
      {
        label: "Recorded winnings",
        value: input.aggregate.totals.recordedWinnings,
        kind: "currency",
      },
      { label: "Cash paid", value: input.aggregate.totals.cashPaid, kind: "currency" },
      {
        label: "League expenses",
        value: input.aggregate.totals.leagueExpenses,
        kind: "currency",
        note: `$${input.aggregate.totals.duesFundedExpenses} from dues; $${input.aggregate.totals.separatelyFundedExpenses} separately funded.`,
      },
      {
        label: "Rolled prizes",
        value: input.aggregate.totals.forfeitedRolled,
        kind: "currency",
        note: "Already reflected in final payout totals where applicable.",
      },
      {
        label: "Outstanding",
        value: input.aggregate.totals.outstanding,
        kind: "currency",
      },
    ],
    seasons,
    leaderboard,
    coverage: {
      firstSeason: input.aggregate.coverage.firstSeason,
      latestSeason: input.aggregate.coverage.latestSeason,
      pre2016: input.aggregate.coverage.pre2016,
      season2026: input.aggregate.coverage.season2026,
      statement:
        "Commissioner financial records are reconciled for 2016–2025. No source archive is available before 2016, and 2026 is outside this historical ledger.",
    },
  };
}
