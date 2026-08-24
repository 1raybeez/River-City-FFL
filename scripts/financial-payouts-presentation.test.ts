import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "../lib/history/historicalFinancialData";
import { buildFinancialHistory } from "../lib/history/financialHistory";
import {
  franchises,
  ownerProfiles,
  ownershipTenures,
} from "../lib/managers/identityData";
import { buildFinancialHistoryPresentation } from "../lib/managers/financialHistoryPresentation";

const aggregate = buildFinancialHistory({
  source: HISTORICAL_FINANCIAL_SOURCE,
  transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
});
const presentation = buildFinancialHistoryPresentation({
  aggregate,
  ownerDisplays: ownerProfiles.map((owner) => ({
    id: owner.id,
    name: owner.fullName,
  })),
  franchiseDisplays: franchises.map((franchise) => ({
    id: franchise.id,
    name: franchise.currentTeamName,
    ownerIdsBySeason: Object.fromEntries(
      aggregate.coverage.seasons.map((season) => [
        season,
        ownershipTenures
          .filter(
            (tenure) =>
              tenure.franchiseId === franchise.id &&
              tenure.startSeason <= season &&
              (tenure.endSeason === undefined || tenure.endSeason >= season)
          )
          .map((tenure) => tenure.ownerId),
      ])
    ),
  })),
});

const pageSource = readFileSync("app/league-info/payouts/page.tsx", "utf8");
const clientSource = readFileSync(
  "components/league-info/FinancialHistoryClient.tsx",
  "utf8"
);
const loaderSource = readFileSync(
  "lib/managers/financialHistoryLoader.ts",
  "utf8"
);
const presentationSource = readFileSync(
  "lib/managers/financialHistoryPresentation.ts",
  "utf8"
);
const activeSource = [pageSource, clientSource, loaderSource, presentationSource].join("\n");

assert.match(loaderSource, /buildFinancialHistory\s*\(/);
assert.match(loaderSource, /HISTORICAL_FINANCIAL_TRANSACTIONS/);
assert.match(loaderSource, /import\s+["']server-only["']/);
assert.doesNotMatch(activeSource, /from\s+["']xlsx["']|readFileSync\s*\(/);
assert.doesNotMatch(activeSource, new RegExp("Paid" + "_Earnings"));
assert.doesNotMatch(activeSource, new RegExp("Sheet" + "20"));
assert.doesNotMatch(activeSource, /payoutHistoryData|payoutHistorySelectors|payoutHistoryTypes/);
assert.doesNotMatch(activeSource, new RegExp("Net" + " Earnings"));
assert.doesNotMatch(activeSource, /Gross Won|Firestore_Current_Ledger/);

const overall = Object.fromEntries(
  presentation.overallSummary.map((item) => [item.label, item.value])
);
assert.equal(overall["Reconciled seasons"], 10);
assert.equal(overall["Dues paid"], 6000);
assert.equal(overall["Recorded winnings"], 5944);
assert.equal(overall["Cash paid"], 5944);
assert.equal(overall["League expenses"], 116);
assert.equal(overall["Rolled prizes"], 190);
assert.equal(overall.Outstanding, 0);

assert.deepEqual(presentation.seasonOptions, [
  2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016,
]);
assert.equal(presentation.defaultSeason, 2025);
assert.equal(presentation.seasonOptions.includes(2026), false);
assert.equal(presentation.seasonOptions.some((season) => season < 2016), false);
for (const requestedSeason of [2025, 2024, 2023, 2022, 2018, 2016]) {
  assert.ok(
    presentation.seasons.some((season) => season.season === requestedSeason),
    `Missing manual-review season ${requestedSeason}.`
  );
}
for (const season of presentation.seasons) {
  const ledger = aggregate.seasons.find((item) => item.season === season.season);
  assert.ok(ledger);
  assert.equal(
    season.recipients.reduce(
      (total, recipient) => total + recipient.recordedWinnings,
      0
    ),
    ledger.recordedWinnings
  );
  assert.equal(
    season.recipients.reduce((total, recipient) => total + recipient.cashPaid, 0),
    ledger.cashPaid
  );
  assert.equal(
    season.expenses.reduce((total, expense) => total + expense.amount, 0),
    ledger.leagueExpenses
  );
}

const season2022 = presentation.seasons.find((season) => season.season === 2022);
assert.ok(season2022);
assert.equal(season2022.reconciliationState, "Reconciled");
assert.match(season2022.specialNote ?? "", /sporting co-champion/i);
assert.match(season2022.specialNote ?? "", /not added again/i);
const award2022 = new Map(
  season2022.seasonAwards.map((award) => [`${award.recipient}:${award.category}`, award.amount])
);
assert.equal(award2022.get("Brian Stevens:Third place"), 75);
assert.equal(award2022.get("Tommy Moore:Champion"), 175);
assert.equal(award2022.get("David Besedich:Runner-up"), 175);
assert.equal(award2022.get("Billy Biddle:Fourth place"), 25);
assert.equal(award2022.get("Ray Long:Loser Bracket Winner"), 25);
assert.equal(
  season2022.rollovers.reduce((total, rollover) => total + rollover.amount, 0),
  20
);
assert.equal(
  season2022.rollovers.every((rollover) => rollover.finalRecipient === "Tommy Moore"),
  true
);
assert.equal(
  season2022.summary.find((item) => item.label === "Recorded winnings")?.value,
  595
);
assert.equal(
  season2022.expenses.find((expense) => expense.category === "Trophy nameplate")?.amount,
  5
);
assert.equal(
  presentation.seasons.flatMap((season) => season.seasonAwards).some(
    (award) => award.category.toLowerCase().includes("toilet")
  ),
  false
);

const season2023 = presentation.seasons.find((season) => season.season === 2023);
assert.ok(season2023);
assert.ok(season2023.recipients.some((recipient) => recipient.ownerId === "ray-long"));
assert.equal(
  season2023.recipients.some((recipient) => recipient.ownerId === "jeffrey-hudgins"),
  false
);
const ray2023 = season2023.recipients.find((recipient) => recipient.ownerId === "ray-long");
assert.deepEqual(ray2023?.coOwnerNames, ["Jeffrey Hudgins"]);

const season2025 = presentation.seasons.find((season) => season.season === 2025);
assert.ok(season2025);
assert.ok(season2025.recipients.some((recipient) => recipient.ownerId === "jordan-maslyn"));
assert.equal(
  season2025.recipients.some((recipient) => recipient.ownerId === "landon-elliott"),
  false
);
const jordan2025 = season2025.recipients.find(
  (recipient) => recipient.ownerId === "jordan-maslyn"
);
assert.equal(jordan2025?.recordedWinnings, 20);
assert.deepEqual(jordan2025?.coOwnerNames, ["Landon Elliott"]);
const jordan2024 = presentation.seasons
  .find((season) => season.season === 2024)
  ?.recipients.find((recipient) => recipient.ownerId === "jordan-maslyn");
assert.deepEqual(jordan2024?.coOwnerNames, []);

const season2024 = presentation.seasons.find((season) => season.season === 2024);
assert.deepEqual(
  season2024?.expenses.map((expense) => [
    expense.category,
    expense.amount,
    expense.funding,
  ]),
  [
    ["League food", 60, "Separately funded"],
    ["Trophy nameplate", 5, "Dues funded"],
  ]
);

const food = presentation.seasons
  .flatMap((season) => season.expenses)
  .find((expense) => expense.category === "League food");
assert.equal(food?.amount, 60);
assert.equal(food?.funding, "Separately funded");
assert.equal(
  presentation.seasons.flatMap((season) => [...season.weeklyAwards, ...season.seasonAwards]).some(
    (award) => award.recipient === "Damon Food"
  ),
  false
);
const ring = season2025.expenses.find(
  (expense) => expense.category === "Championship ring"
);
assert.equal(ring?.amount, 16);
assert.equal(
  [...season2025.weeklyAwards, ...season2025.seasonAwards].some(
    (award) => award.description.toLowerCase().includes("ring")
  ),
  false
);

assert.equal(presentation.coverage.firstSeason, 2016);
assert.equal(presentation.coverage.latestSeason, 2025);
assert.equal(presentation.coverage.pre2016, "no-source");
assert.equal(presentation.coverage.season2026, "outside-historical-ledger");
assert.match(presentation.coverage.statement, /No source archive is available before 2016/);
assert.match(presentation.coverage.statement, /2026 is outside this historical ledger/);

assert.equal(presentation.leaderboard[0].rank, 1);
assert.equal(
  presentation.leaderboard[0].recordedWinnings,
  aggregate.ownerSummaries
    .slice()
    .sort((first, second) => second.recordedWinnings - first.recordedWinnings)[0]
    .recordedWinnings
);
assert.equal(
  JSON.stringify(presentation).includes("sourceCellRange"),
  false,
  "Presentation data must not carry workbook-cell detail to mobile clients."
);
assert.equal(JSON.stringify(presentation).includes("sourceWorkbook"), false);
assert.doesNotMatch(clientSource, /Who has paid|Owner dues status|duesRows/);
assert.doesNotMatch(clientSource, /financialOwnerId|financialOwnerName|coOwnerContext|paymentStatus|leaderboard|cashPaid/);
assert.match(clientSource, /<select/);
assert.match(clientSource, /grid-cols-1/);
assert.match(clientSource, /overflow-x-clip/);

console.log("Financial payouts presentation tests passed.");
