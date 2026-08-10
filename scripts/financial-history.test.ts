import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildFinancialHistory,
  getAllFinancialSeasons,
  getAllFinancialTransactions,
  getFinancialCoverage,
  getFinancialReconciliationIssues,
  getFinancialSeason,
  getFinancialTransactions,
  getFranchiseFinancialSummary,
  getOwnerFinancialSummary,
} from "../lib/history/financialHistory";
import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "../lib/history/historicalFinancialData";
import {
  franchisesById,
  ownerProfilesById,
} from "../lib/managers/identityData";

assert.throws(() => getAllFinancialTransactions(), /not initialized/i);
assert.throws(() => getFinancialSeason(2022), /not initialized/i);
assert.throws(() => getFinancialCoverage(), /not initialized/i);

const dataSource = readFileSync(
  "lib/history/historicalFinancialData.ts",
  "utf8"
);
const engineSource = readFileSync("lib/history/financialHistory.ts", "utf8");
for (const source of [dataSource, engineSource]) {
  assert.doesNotMatch(source, /readFileSync\s*\(/);
  assert.doesNotMatch(source, /from ["']xlsx["']/);
  assert.doesNotMatch(source, /openpyxl|unzipSync|adm-zip/i);
}

const input = {
  source: HISTORICAL_FINANCIAL_SOURCE,
  transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
};
const aggregate = buildFinancialHistory(input);

assert.equal(
  aggregate.source.workbookSha256,
  "a042c3bba1789f2b39a5c36d3b51d494a1dc5b5074513162a754c54b692e288f"
);
assert.equal(aggregate.source.workbookFilename, "river-city-final-standings-and-payouts.xlsx");
assert.equal(aggregate.transactions.length, 310);
assert.equal(aggregate.ownerSummaries.length, 22);
assert.equal(aggregate.franchiseSummaries.length, 22);
assert.deepEqual(aggregate.coverage.seasons, [
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
]);
assert.equal(aggregate.coverage.pre2016, "no-source");
assert.equal(aggregate.coverage.season2026, "outside-historical-ledger");
assert.deepEqual(aggregate.coverage.duplicateTransactionKeys, []);
assert.deepEqual(
  aggregate.coverage.unresolvedAuthoritativeOwnerTransactionKeys,
  []
);
assert.deepEqual(getFinancialReconciliationIssues(), []);

const expectedSeasons = [
  [2016, 195, 0, 0, 405, 0, 0, 600],
  [2017, 195, 0, 0, 400, 0, 5, 595],
  [2018, 165, 30, 30, 400, 0, 5, 595],
  [2019, 165, 30, 30, 400, 0, 5, 595],
  [2020, 120, 10, 10, 440, 25, 5, 595],
  [2021, 80, 60, 60, 430, 25, 5, 595],
  [2022, 120, 20, 0, 450, 25, 5, 595],
  [2023, 100, 40, 40, 455, 0, 5, 595],
  [2024, 140, 0, 0, 455, 0, 65, 595],
  [2025, 140, 0, 0, 444, 0, 16, 584],
] as const;

for (const [
  season,
  weeklyPaid,
  forfeited,
  rolloverRecorded,
  placements,
  loserBracket,
  expenses,
  winnings,
] of expectedSeasons) {
  const ledger = getFinancialSeason(season);
  assert.ok(ledger, `Missing ${season} financial ledger.`);
  assert.equal(ledger.duesAssessed, 600);
  assert.equal(ledger.duesPaid, 600);
  assert.equal(ledger.weeklyPrizesPaid, weeklyPaid);
  assert.equal(ledger.weeklyPrizesForfeited, forfeited);
  assert.equal(ledger.rolloverRecordedWinnings, rolloverRecorded);
  assert.equal(ledger.placementChampionshipAwards, placements);
  assert.equal(ledger.loserBracketAwards, loserBracket);
  assert.equal(ledger.leagueExpenses, expenses);
  assert.equal(ledger.recordedWinnings, winnings);
  assert.equal(ledger.cashPaid, winnings);
  assert.equal(ledger.outstanding, 0);
  assert.equal(ledger.unexplained, 0);
  assert.equal(ledger.reconciliationState, "reconciled");
}

assert.deepEqual(aggregate.totals, {
  duesAssessed: 6000,
  duesPaid: 6000,
  recordedWinnings: 5944,
  cashPaid: 5944,
  leagueExpenses: 116,
  duesFundedExpenses: 56,
  separatelyFundedExpenses: 60,
  forfeitedRolled: 190,
  outstanding: 0,
  unexplained: 0,
});

const transactions2022 = getFinancialTransactions({ season: 2022 });
assert.equal(transactions2022.length, 32);
assert.equal(getFinancialSeason(2022)?.recordedWinnings, 595);
assert.equal(getFinancialSeason(2022)?.leagueExpenses, 5);
assert.equal(getFinancialSeason(2022)?.unexplained, 0);

const brianThird = transactions2022.find(
  (transaction) => transaction.category === "third-place"
);
assert.equal(brianThird?.financialOwnerId, "brian-stevens");
assert.equal(brianThird?.amount, 75);
assert.equal(brianThird?.sourceCellRange, "A34:D34");

const tommySettlement = transactions2022.find(
  (transaction) => transaction.category === "champion"
);
const daveSettlement = transactions2022.find(
  (transaction) => transaction.category === "runner-up"
);
assert.equal(tommySettlement?.amount, 175);
assert.equal(daveSettlement?.amount, 175);
assert.equal(tommySettlement?.sourceCellRange, "A36:D36");
assert.equal(daveSettlement?.sourceCellRange, "A35:D35");
assert.equal(
  transactions2022.some(
    (transaction) =>
      transaction.category === "champion" &&
      transaction.financialOwnerId === "david-besedich"
  ),
  false,
  "Sporting co-champion status must not manufacture a Dave champion payment."
);

const rollovers2022 = transactions2022.filter(
  (transaction) => transaction.category === "weekly-prize-rollover"
);
assert.equal(rollovers2022.length, 2);
assert.equal(
  rollovers2022.reduce((total, transaction) => total + transaction.amount, 0),
  20
);
assert.equal(
  rollovers2022.reduce(
    (total, transaction) => total + transaction.recordedWinningsAmount,
    0
  ),
  0,
  "The corrected 2022 settlement already contains the rollover."
);
rollovers2022.forEach((transaction) => {
  assert.equal(transaction.originatingFinancialOwnerId, "billy-biddle");
  assert.equal(transaction.financialOwnerId, "tommy-moore");
  assert.equal(transaction.paymentState, "forfeited-rolled");
});
assert.equal(getOwnerFinancialSummary("billy-biddle")?.forfeitedByOwner, 40);
assert.equal(getOwnerFinancialSummary("tommy-moore")?.recordedWinnings, 1100);

for (const transaction of aggregate.transactions) {
  assert.equal(
    transaction.sourceWorkbookSha256,
    HISTORICAL_FINANCIAL_SOURCE.workbookSha256
  );
  assert.ok(transaction.sourceCellRange.length > 0);
  if (transaction.transactionType !== "expense") {
    assert.ok(transaction.financialOwnerId);
    assert.ok(ownerProfilesById[transaction.financialOwnerId]);
    assert.ok(transaction.franchiseId);
    assert.ok(franchisesById[transaction.franchiseId]);
  }
  assert.notEqual(transaction.category, "toilet-bowl-winner");
  assert.notEqual(transaction.sourceSheet, "Paid_Earnings");
  assert.notEqual(transaction.sourceSheet, "Sheet20");
}

const loserBracketAwards = getFinancialTransactions({
  category: "loser-bracket-winner",
});
assert.deepEqual(
  loserBracketAwards.map((transaction) => [
    transaction.season,
    transaction.financialOwnerId,
    transaction.amount,
  ]),
  [
    [2020, "jordan-maslyn", 25],
    [2021, "billy-biddle", 25],
    [2022, "ray-long", 25],
  ]
);

const ray = getOwnerFinancialSummary("ray-long");
const jeffrey = getOwnerFinancialSummary("jeffrey-hudgins");
const prestigio = getFranchiseFinancialSummary("prestigio-mundial");
assert.ok(ray);
assert.equal(ray.recordedWinnings, 360);
assert.equal(jeffrey, null);
assert.deepEqual(prestigio?.financialOwnerIds, ["ray-long"]);
assert.equal(
  aggregate.transactions.some(
    (transaction) => transaction.financialOwnerId === "jeffrey-hudgins"
  ),
  false
);

const jordan2025 = getFinancialTransactions({
  season: 2025,
  financialOwnerId: "jordan-maslyn",
});
assert.equal(
  jordan2025.reduce(
    (total, transaction) => total + transaction.recordedWinningsAmount,
    0
  ),
  20
);
assert.equal(
  getFinancialTransactions({
    season: 2025,
    financialOwnerId: "landon-elliott",
  }).length,
  0
);
assert.deepEqual(
  getFranchiseFinancialSummary("shake-n-bakers")?.financialOwnerIds,
  ["jordan-maslyn"]
);

const dougWeek12 = getFinancialTransactions({ season: 2024 }).find(
  (transaction) => transaction.transactionKey === "2024:weekly:12:doug-fordham"
);
assert.equal(dougWeek12?.paymentState, "paid");
assert.equal(dougWeek12?.cashPaidAmount, 10);

const food = getFinancialTransactions({ category: "food-expense" });
assert.equal(food.length, 1);
assert.equal(food[0].amount, 60);
assert.equal(food[0].fundingSource, "separate");
assert.equal(food[0].duesPaidAmount, 0);
assert.equal(food[0].recordedWinningsAmount, 0);
assert.equal(food[0].cashPaidAmount, 0);

const ring = getFinancialTransactions({
  category: "championship-ring-expense",
});
assert.equal(ring.length, 1);
assert.equal(ring[0].amount, 16);
assert.equal(ring[0].financialOwnerId, null);
assert.equal(ring[0].recordedWinningsAmount, 0);
assert.equal(ring[0].cashPaidAmount, 0);

const keys = aggregate.transactions.map((transaction) => transaction.transactionKey);
assert.equal(new Set(keys).size, keys.length);
assert.equal(JSON.stringify(aggregate).includes("netEarnings"), false);
assert.equal(JSON.stringify(aggregate).includes("Net Earnings"), false);

const mutableTransactions = getAllFinancialTransactions();
(mutableTransactions as unknown as { amount: number }[])[0].amount = 999999;
assert.notEqual(getAllFinancialTransactions()[0].amount, 999999);
const mutableSeasons = getAllFinancialSeasons();
(mutableSeasons as unknown as { recordedWinnings: number }[])[0].recordedWinnings = -1;
assert.notEqual(getAllFinancialSeasons()[0].recordedWinnings, -1);

const beforeFailedBuild = getFinancialCoverage();
assert.throws(
  () =>
    buildFinancialHistory({
      ...input,
      transactions: [
        ...HISTORICAL_FINANCIAL_TRANSACTIONS,
        HISTORICAL_FINANCIAL_TRANSACTIONS[0],
      ],
    }),
  /duplicate/i
);
assert.deepEqual(getFinancialCoverage(), beforeFailedBuild);

const firstRebuild = buildFinancialHistory(input);
const secondRebuild = buildFinancialHistory(input);
assert.deepEqual(secondRebuild, firstRebuild);

console.log("Financial History Engine tests passed.");
