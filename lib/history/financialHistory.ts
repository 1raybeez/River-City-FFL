import type {
  FinancialPaymentState,
  FinancialTransactionCategory,
  HistoricalFinancialTransaction,
} from "@/lib/history/historicalFinancialData";

export type FinancialSeasonLedger = {
  readonly season: number;
  readonly transactionKeys: readonly string[];
  readonly duesAssessed: number;
  readonly duesPaid: number;
  readonly weeklyPrizesPaid: number;
  readonly weeklyPrizesForfeited: number;
  readonly rolloverRecordedWinnings: number;
  readonly placementChampionshipAwards: number;
  readonly loserBracketAwards: number;
  readonly leagueExpenses: number;
  readonly duesFundedExpenses: number;
  readonly separatelyFundedExpenses: number;
  readonly recordedWinnings: number;
  readonly cashPaid: number;
  readonly outstanding: number;
  readonly unexplained: number;
  readonly reconciliationState: "reconciled";
};

export type OwnerFinancialSummary = {
  readonly ownerId: string;
  readonly seasons: readonly number[];
  readonly franchiseIds: readonly string[];
  readonly transactionKeys: readonly string[];
  readonly duesAssessed: number;
  readonly duesPaid: number;
  readonly recordedWinnings: number;
  readonly cashPaid: number;
  readonly outstanding: number;
  readonly forfeitedByOwner: number;
};

export type FranchiseFinancialSummary = {
  readonly franchiseId: string;
  readonly financialOwnerIds: readonly string[];
  readonly seasons: readonly number[];
  readonly transactionKeys: readonly string[];
  readonly duesAssessed: number;
  readonly duesPaid: number;
  readonly recordedWinnings: number;
  readonly cashPaid: number;
  readonly outstanding: number;
};

export type FinancialCoverage = {
  readonly firstSeason: 2016;
  readonly latestSeason: 2025;
  readonly pre2016: "no-source";
  readonly season2026: "outside-historical-ledger";
  readonly seasons: readonly number[];
  readonly bySeason: readonly {
    readonly season: number;
    readonly state: "reconciled";
    readonly transactionCount: number;
  }[];
  readonly transactionCount: number;
  readonly ownerSummaryCount: number;
  readonly franchiseSummaryCount: number;
  readonly duplicateTransactionKeys: readonly string[];
  readonly unresolvedAuthoritativeOwnerTransactionKeys: readonly string[];
};

export type FinancialReconciliationIssue = {
  readonly issueKey: string;
  readonly season: number | null;
  readonly category:
    | "duplicate-transaction-key"
    | "unresolved-owner"
    | "unexplained-funds";
  readonly amount: number | null;
  readonly transactionKeys: readonly string[];
  readonly description: string;
};

export type FinancialHistoryTotals = {
  readonly duesAssessed: number;
  readonly duesPaid: number;
  readonly recordedWinnings: number;
  readonly cashPaid: number;
  readonly leagueExpenses: number;
  readonly duesFundedExpenses: number;
  readonly separatelyFundedExpenses: number;
  readonly forfeitedRolled: number;
  readonly outstanding: number;
  readonly unexplained: number;
};

export type FinancialHistoryAggregate = {
  readonly source: {
    readonly workbookPath: string;
    readonly workbookFilename: string;
    readonly workbookSha256: string;
  };
  readonly transactions: readonly HistoricalFinancialTransaction[];
  readonly seasons: readonly FinancialSeasonLedger[];
  readonly ownerSummaries: readonly OwnerFinancialSummary[];
  readonly franchiseSummaries: readonly FranchiseFinancialSummary[];
  readonly coverage: FinancialCoverage;
  readonly reconciliationIssues: readonly FinancialReconciliationIssue[];
  readonly totals: FinancialHistoryTotals;
};

export type FinancialHistoryInput = {
  readonly source: FinancialHistoryAggregate["source"];
  readonly transactions: readonly HistoricalFinancialTransaction[];
};

export type FinancialTransactionFilter = {
  readonly season?: number;
  readonly financialOwnerId?: string;
  readonly originatingFinancialOwnerId?: string;
  readonly franchiseId?: string;
  readonly category?: FinancialTransactionCategory;
  readonly paymentState?: FinancialPaymentState;
};

const PLACEMENT_CATEGORIES = new Set<FinancialTransactionCategory>([
  "fourth-place",
  "third-place",
  "runner-up",
  "champion",
  "division-winner",
]);

let financialHistoryCache: FinancialHistoryAggregate | null = null;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((nested) => deepFreeze(nested));
  }
  return value;
}

function sum(
  transactions: readonly HistoricalFinancialTransaction[],
  field:
    | "duesAssessedAmount"
    | "duesPaidAmount"
    | "recordedWinningsAmount"
    | "cashPaidAmount"
    | "outstandingAmount"
    | "forfeitedRolledAmount"
) {
  return transactions.reduce((total, transaction) => total + transaction[field], 0);
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((first, second) => first.localeCompare(second));
}

function uniqueSortedNumbers(values: readonly number[]) {
  return [...new Set(values)].sort((first, second) => first - second);
}

function duplicateKeys(transactions: readonly HistoricalFinancialTransaction[]) {
  const counts = new Map<string, number>();
  transactions.forEach((transaction) =>
    counts.set(transaction.transactionKey, (counts.get(transaction.transactionKey) ?? 0) + 1)
  );
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key)
    .sort((first, second) => first.localeCompare(second));
}

function buildSeasonLedger(
  season: number,
  transactions: readonly HistoricalFinancialTransaction[]
): FinancialSeasonLedger {
  const weeklyPaid = transactions.filter(
    (transaction) => transaction.category === "weekly-prize"
  );
  const weeklyRolled = transactions.filter(
    (transaction) => transaction.category === "weekly-prize-rollover"
  );
  const placements = transactions.filter((transaction) =>
    PLACEMENT_CATEGORIES.has(transaction.category)
  );
  const loserBracket = transactions.filter(
    (transaction) => transaction.category === "loser-bracket-winner"
  );
  const expenses = transactions.filter(
    (transaction) => transaction.transactionType === "expense"
  );
  const duesFundedExpenses = expenses
    .filter((transaction) => transaction.fundingSource === "dues")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const separatelyFundedExpenses = expenses
    .filter((transaction) => transaction.fundingSource === "separate")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const duesPaid = sum(transactions, "duesPaidAmount");
  const recordedWinnings = sum(transactions, "recordedWinningsAmount");
  const outstanding = sum(transactions, "outstandingAmount");
  const unexplained =
    duesPaid - recordedWinnings - duesFundedExpenses - outstanding;

  return {
    season,
    transactionKeys: transactions.map((transaction) => transaction.transactionKey),
    duesAssessed: sum(transactions, "duesAssessedAmount"),
    duesPaid,
    weeklyPrizesPaid: sum(weeklyPaid, "cashPaidAmount"),
    weeklyPrizesForfeited: sum(weeklyRolled, "forfeitedRolledAmount"),
    rolloverRecordedWinnings: sum(weeklyRolled, "recordedWinningsAmount"),
    placementChampionshipAwards: sum(placements, "recordedWinningsAmount"),
    loserBracketAwards: sum(loserBracket, "recordedWinningsAmount"),
    leagueExpenses: expenses.reduce(
      (total, transaction) => total + transaction.amount,
      0
    ),
    duesFundedExpenses,
    separatelyFundedExpenses,
    recordedWinnings,
    cashPaid: sum(transactions, "cashPaidAmount"),
    outstanding,
    unexplained,
    reconciliationState: "reconciled",
  };
}

function buildOwnerSummaries(
  transactions: readonly HistoricalFinancialTransaction[]
): OwnerFinancialSummary[] {
  const ownerIds = uniqueSorted(
    transactions.flatMap((transaction) =>
      transaction.financialOwnerId ? [transaction.financialOwnerId] : []
    )
  );

  return ownerIds.map((ownerId) => {
    const official = transactions.filter(
      (transaction) => transaction.financialOwnerId === ownerId
    );
    const originated = transactions.filter(
      (transaction) => transaction.originatingFinancialOwnerId === ownerId
    );
    return {
      ownerId,
      seasons: uniqueSortedNumbers(official.map((transaction) => transaction.season)),
      franchiseIds: uniqueSorted(
        official.flatMap((transaction) =>
          transaction.franchiseId ? [transaction.franchiseId] : []
        )
      ),
      transactionKeys: official.map((transaction) => transaction.transactionKey),
      duesAssessed: sum(official, "duesAssessedAmount"),
      duesPaid: sum(official, "duesPaidAmount"),
      recordedWinnings: sum(official, "recordedWinningsAmount"),
      cashPaid: sum(official, "cashPaidAmount"),
      outstanding: sum(official, "outstandingAmount"),
      forfeitedByOwner: sum(originated, "forfeitedRolledAmount"),
    };
  });
}

function buildFranchiseSummaries(
  transactions: readonly HistoricalFinancialTransaction[]
): FranchiseFinancialSummary[] {
  const franchiseIds = uniqueSorted(
    transactions.flatMap((transaction) =>
      transaction.franchiseId ? [transaction.franchiseId] : []
    )
  );

  return franchiseIds.map((franchiseId) => {
    const matching = transactions.filter(
      (transaction) => transaction.franchiseId === franchiseId
    );
    return {
      franchiseId,
      financialOwnerIds: uniqueSorted(
        matching.flatMap((transaction) =>
          transaction.financialOwnerId ? [transaction.financialOwnerId] : []
        )
      ),
      seasons: uniqueSortedNumbers(matching.map((transaction) => transaction.season)),
      transactionKeys: matching.map((transaction) => transaction.transactionKey),
      duesAssessed: sum(matching, "duesAssessedAmount"),
      duesPaid: sum(matching, "duesPaidAmount"),
      recordedWinnings: sum(matching, "recordedWinningsAmount"),
      cashPaid: sum(matching, "cashPaidAmount"),
      outstanding: sum(matching, "outstandingAmount"),
    };
  });
}

function requireInitialized() {
  if (!financialHistoryCache) {
    throw new Error("Financial History Engine is not initialized.");
  }
  return financialHistoryCache;
}

export function buildFinancialHistory(
  input: FinancialHistoryInput
): FinancialHistoryAggregate {
  const transactions = [...clone(input.transactions)].sort((first, second) =>
    first.transactionKey.localeCompare(second.transactionKey)
  );
  const duplicates = duplicateKeys(transactions);
  const unresolvedOwners = transactions
    .filter(
      (transaction) =>
        transaction.transactionType !== "expense" &&
        transaction.financialOwnerId === null
    )
    .map((transaction) => transaction.transactionKey);

  const validationIssues: FinancialReconciliationIssue[] = [
    ...duplicates.map((key) => ({
      issueKey: `duplicate:${key}`,
      season: null,
      category: "duplicate-transaction-key" as const,
      amount: null,
      transactionKeys: [key],
      description: `Duplicate transaction key ${key}.`,
    })),
    ...unresolvedOwners.map((key) => ({
      issueKey: `unresolved-owner:${key}`,
      season: null,
      category: "unresolved-owner" as const,
      amount: null,
      transactionKeys: [key],
      description: `Authoritative financial transaction ${key} has no owner.`,
    })),
  ];

  const seasons = uniqueSortedNumbers(transactions.map((transaction) => transaction.season));
  if (
    seasons.length !== 10 ||
    seasons.some((season, index) => season !== 2016 + index)
  ) {
    throw new Error("Historical financial input must cover every season from 2016 through 2025.");
  }

  const seasonLedgers = seasons.map((season) =>
    buildSeasonLedger(
      season,
      transactions.filter((transaction) => transaction.season === season)
    )
  );
  seasonLedgers.forEach((ledger) => {
    if (ledger.unexplained !== 0) {
      validationIssues.push({
        issueKey: `unexplained:${ledger.season}`,
        season: ledger.season,
        category: "unexplained-funds",
        amount: ledger.unexplained,
        transactionKeys: [...ledger.transactionKeys],
        description: `${ledger.season} has $${ledger.unexplained} unexplained.`,
      });
    }
  });

  if (validationIssues.length > 0) {
    throw new Error(
      `Financial History build rejected: ${validationIssues
        .map((issue) => issue.description)
        .join(" ")}`
    );
  }

  const ownerSummaries = buildOwnerSummaries(transactions);
  const franchiseSummaries = buildFranchiseSummaries(transactions);
  const expenses = transactions.filter(
    (transaction) => transaction.transactionType === "expense"
  );
  const duesFundedExpenses = expenses
    .filter((transaction) => transaction.fundingSource === "dues")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const separatelyFundedExpenses = expenses
    .filter((transaction) => transaction.fundingSource === "separate")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const aggregate: FinancialHistoryAggregate = {
    source: clone(input.source),
    transactions,
    seasons: seasonLedgers,
    ownerSummaries,
    franchiseSummaries,
    coverage: {
      firstSeason: 2016,
      latestSeason: 2025,
      pre2016: "no-source",
      season2026: "outside-historical-ledger",
      seasons,
      bySeason: seasonLedgers.map((ledger) => ({
        season: ledger.season,
        state: "reconciled",
        transactionCount: ledger.transactionKeys.length,
      })),
      transactionCount: transactions.length,
      ownerSummaryCount: ownerSummaries.length,
      franchiseSummaryCount: franchiseSummaries.length,
      duplicateTransactionKeys: [],
      unresolvedAuthoritativeOwnerTransactionKeys: [],
    },
    reconciliationIssues: [],
    totals: {
      duesAssessed: sum(transactions, "duesAssessedAmount"),
      duesPaid: sum(transactions, "duesPaidAmount"),
      recordedWinnings: sum(transactions, "recordedWinningsAmount"),
      cashPaid: sum(transactions, "cashPaidAmount"),
      leagueExpenses: expenses.reduce(
        (total, transaction) => total + transaction.amount,
        0
      ),
      duesFundedExpenses,
      separatelyFundedExpenses,
      forfeitedRolled: sum(transactions, "forfeitedRolledAmount"),
      outstanding: sum(transactions, "outstandingAmount"),
      unexplained: seasonLedgers.reduce(
        (total, ledger) => total + ledger.unexplained,
        0
      ),
    },
  };

  const frozen = deepFreeze(aggregate);
  financialHistoryCache = frozen;
  return clone(frozen);
}

export function getAllFinancialTransactions() {
  return clone(requireInitialized().transactions);
}

export function getFinancialTransactions(filter: FinancialTransactionFilter = {}) {
  const transactions = requireInitialized().transactions.filter((transaction) =>
    (filter.season === undefined || transaction.season === filter.season) &&
    (filter.financialOwnerId === undefined ||
      transaction.financialOwnerId === filter.financialOwnerId) &&
    (filter.originatingFinancialOwnerId === undefined ||
      transaction.originatingFinancialOwnerId === filter.originatingFinancialOwnerId) &&
    (filter.franchiseId === undefined || transaction.franchiseId === filter.franchiseId) &&
    (filter.category === undefined || transaction.category === filter.category) &&
    (filter.paymentState === undefined || transaction.paymentState === filter.paymentState)
  );
  return clone(transactions);
}

export function getFinancialSeason(season: number) {
  const ledger = requireInitialized().seasons.find(
    (candidate) => candidate.season === season
  );
  return ledger ? clone(ledger) : null;
}

export function getAllFinancialSeasons() {
  return clone(requireInitialized().seasons);
}

export function getOwnerFinancialSummary(ownerIdOrSlug: string) {
  const key = ownerIdOrSlug.trim().toLowerCase();
  const summary = requireInitialized().ownerSummaries.find(
    (candidate) => candidate.ownerId.toLowerCase() === key
  );
  return summary ? clone(summary) : null;
}

export function getFranchiseFinancialSummary(franchiseId: string) {
  const key = franchiseId.trim().toLowerCase();
  const summary = requireInitialized().franchiseSummaries.find(
    (candidate) => candidate.franchiseId.toLowerCase() === key
  );
  return summary ? clone(summary) : null;
}

export function getFinancialCoverage() {
  return clone(requireInitialized().coverage);
}

export function getFinancialReconciliationIssues() {
  return clone(requireInitialized().reconciliationIssues);
}
