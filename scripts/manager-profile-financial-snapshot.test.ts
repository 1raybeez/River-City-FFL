import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "../lib/history/historicalFinancialData";
import { buildFinancialHistory } from "../lib/history/financialHistory";
import {
  franchisesById,
  ownerProfilesById,
  ownershipTenures,
} from "../lib/managers/identityData";
import { buildOwnerFinancialSnapshotPresentation } from "../lib/managers/ownerFinancialSnapshotPresentation";

const aggregate = buildFinancialHistory({
  source: HISTORICAL_FINANCIAL_SOURCE,
  transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
});

function snapshot(
  ownerId: string,
  options: {
    status?: "active" | "retired" | "staff";
    firstSeason?: number | null;
    latestSeason?: number | null;
  } = {}
) {
  return buildOwnerFinancialSnapshotPresentation({
    ownerId,
    ownerStatus: options.status ?? "active",
    careerFirstSeason: options.firstSeason ?? 2016,
    careerLatestSeason: options.latestSeason ?? 2025,
    summary:
      aggregate.ownerSummaries.find((summary) => summary.ownerId === ownerId) ??
      null,
    coverage: aggregate.coverage,
  });
}

const ray = snapshot("ray-long");
assert.ok(ray);
assert.equal(ray.recordedWinnings, 360);
assert.equal(ray.recordedWinningsLabel, "$360");
assert.match(ray.attributionNote ?? "", /recorded through Ray/);
assert.deepEqual(
  aggregate.franchiseSummaries.find(
    (summary) => summary.franchiseId === "prestigio-mundial"
  )?.financialOwnerIds,
  ["ray-long"]
);

const jeffrey = snapshot("jeffrey-hudgins");
assert.ok(jeffrey);
assert.equal(jeffrey.state, "attributed-to-primary-owner");
assert.equal(jeffrey.recordedWinnings, null);
assert.equal(jeffrey.recordedWinningsLabel, null);
assert.match(jeffrey.attributionNote ?? "", /Ray Long/);
assert.match(jeffrey.statusMessage ?? "", /No separate official owner total/);

const jordan = snapshot("jordan-maslyn");
assert.ok(jordan);
assert.equal(jordan.recordedWinnings, 415);
assert.match(jordan.attributionNote ?? "", /beginning in 2025/);
assert.equal(
  aggregate.transactions
    .filter(
      (transaction) =>
        transaction.season === 2025 &&
        transaction.financialOwnerId === "jordan-maslyn"
    )
    .reduce((total, transaction) => total + transaction.recordedWinningsAmount, 0),
  20
);

const landon = snapshot("landon-elliott");
assert.ok(landon);
assert.equal(landon.recordedWinnings, 135);
assert.equal(landon.activitySeasons.includes(2025), false);
assert.match(landon.attributionNote ?? "", /Jordan Maslyn/);
assert.equal(
  aggregate.transactions.some(
    (transaction) =>
      transaction.season === 2025 &&
      transaction.financialOwnerId === "landon-elliott"
  ),
  false
);

assert.equal(snapshot("tommy-moore")?.recordedWinnings, 1100);
assert.equal(snapshot("david-besedich")?.recordedWinnings, 730);
assert.equal(
  snapshot("gordie-gahagan", {
    status: "retired",
    firstSeason: 2011,
    latestSeason: 2016,
  })?.recordedWinnings,
  50
);

const zeroWinnings = snapshot("bryan-doane", {
  status: "retired",
  firstSeason: 2011,
  latestSeason: 2016,
});
assert.ok(zeroWinnings);
assert.equal(zeroWinnings.state, "activity-without-winnings");
assert.equal(zeroWinnings.recordedWinnings, 0);
assert.equal(zeroWinnings.recordedWinningsLabel, null);
assert.match(zeroWinnings.statusMessage ?? "", /No recorded winnings during/);

const preArchive = snapshot("keith-polarek", {
  status: "retired",
  firstSeason: 2011,
  latestSeason: 2015,
});
assert.ok(preArchive);
assert.equal(preArchive.state, "no-archived-source");
assert.equal(preArchive.recordedWinnings, null);
assert.match(preArchive.statusMessage ?? "", /predate the archived financial source/);

assert.equal(
  snapshot("damon-davis", {
    status: "staff",
    firstSeason: null,
    latestSeason: null,
  }),
  null
);

for (const item of [ray, jeffrey, jordan, landon, zeroWinnings, preArchive]) {
  assert.equal(item.title, "Recorded Winnings (2016–2025)");
  assert.equal(item.coverageLabel, "2016–2025 reconciled records");
  assert.equal(item.financialHistoryHref, "/league-info/payouts");
  assert.match(item.scopeNote, /private co-owner distributions are outside/);
}

assert.deepEqual(franchisesById["prestigio-mundial"].activeOwnerIds, [
  "ray-long",
  "jeffrey-hudgins",
]);
assert.deepEqual(franchisesById["shake-n-bakers"].activeOwnerIds, [
  "jordan-maslyn",
  "landon-elliott",
]);
assert.ok(
  ownershipTenures.some(
    (tenure) =>
      tenure.ownerId === "landon-elliott" &&
      tenure.franchiseId === "shake-n-bakers" &&
      tenure.startSeason === 2025
  )
);
assert.equal(ownerProfilesById["damon-davis"].status, "staff");

const loaderSource = readFileSync(
  "lib/managers/ownerFinancialSnapshotLoader.ts",
  "utf8"
);
const presentationSource = readFileSync(
  "lib/managers/ownerFinancialSnapshotPresentation.ts",
  "utf8"
);
const pageSource = readFileSync("app/managers/owners/[owner]/page.tsx", "utf8");
const componentSource = readFileSync(
  "components/managers/OwnerProfile.tsx",
  "utf8"
);
const activeSource = [loaderSource, presentationSource, pageSource, componentSource].join(
  "\n"
);

assert.match(loaderSource, /import\s+["']server-only["']/);
assert.match(loaderSource, /getOwnerFinancialSummary/);
assert.match(loaderSource, /getFinancialCoverage/);
assert.doesNotMatch(loaderSource, /financialHistoryPresentation|loadFinancialHistoryPresentation/);
assert.doesNotMatch(activeSource, /from\s+["']xlsx["']|readFileSync\s*\(/);
assert.doesNotMatch(activeSource, new RegExp("Paid" + "_Earnings"));
assert.doesNotMatch(activeSource, /payoutHistoryData|payoutHistorySelectors|payoutHistoryTypes/);
assert.doesNotMatch(activeSource, new RegExp("Career" + " Earnings"));
assert.doesNotMatch(activeSource, new RegExp("Net" + " Earnings"));
assert.doesNotMatch(activeSource, /\bprofit\b|\bROI\b/i);
assert.doesNotMatch(componentSource, /recordedWinnings\s*[+\-*/]|\.reduce\s*\(/);
assert.match(componentSource, /financialSnapshot\.recordedWinningsLabel/);
assert.match(componentSource, /financialSnapshot\.financialHistoryHref/);
assert.match(componentSource, /focus-visible:ring-2/);
assert.match(componentSource, /break-words/);

console.log("Manager Profile financial snapshot tests passed.");
