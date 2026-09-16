import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPublicOperationalFinancePresentation } from "../lib/finance/publicOperationalFinancePresentation";
import { buildPublicPayoutCurrentSeason, buildPublicPayoutHistory, buildWeeklyHighScoreAwards } from "../lib/finance/publicPayoutPresentation";
import { buildFinancialHistory } from "../lib/history/financialHistory";
import { HISTORICAL_FINANCIAL_SOURCE, HISTORICAL_FINANCIAL_TRANSACTIONS } from "../lib/history/historicalFinancialData";
import { franchises, ownerProfiles, ownershipTenures } from "../lib/managers/identityData";
import { buildFinancialHistoryPresentation } from "../lib/managers/financialHistoryPresentation";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";

const page = readFileSync("app/league-info/payouts/page.tsx", "utf8");
const client = readFileSync("components/league-info/FinancialHistoryClient.tsx", "utf8");
const currentRoute = readFileSync("app/api/public-finance/summary/route.ts", "utf8");
const financeLayout = readFileSync("app/commish/finance/layout.tsx", "utf8");
const legislative = readFileSync("app/league-info/legislative/page.tsx", "utf8");
const legislativeNew = readFileSync("app/league-info/legislative/new/page.tsx", "utf8");
const legislativeApi = readFileSync("app/api/league-info/legislative/route.ts", "utf8");
const voteApi = readFileSync("app/api/league-info/legislative/vote/route.ts", "utf8");

const aggregate = buildFinancialHistory({ source: HISTORICAL_FINANCIAL_SOURCE, transactions: HISTORICAL_FINANCIAL_TRANSACTIONS });
const history = buildFinancialHistoryPresentation({
  aggregate,
  ownerDisplays: ownerProfiles.map((owner) => ({ id: owner.id, name: owner.fullName })),
  franchiseDisplays: franchises.map((franchise) => ({
    id: franchise.id,
    name: franchise.currentTeamName,
    ownerIdsBySeason: Object.fromEntries(aggregate.coverage.seasons.map((season) => [season, ownershipTenures.filter((tenure) => tenure.franchiseId === franchise.id && tenure.startSeason <= season && (tenure.endSeason === undefined || tenure.endSeason >= season)).map((tenure) => tenure.ownerId)])),
  })),
});

async function main() {
  const weekOneSettlement = {
    schemaVersion: "river-city-weekly-high-score-settlement-v1" as const,
    season: 2026,
    week: 1,
    status: "settled" as const,
    settledAt: "2026-09-16T02:21:32.234Z",
    finalityEvidence: {},
    winnerFranchiseIds: ["shake-n-bakers"],
    winnerOwnerIds: ["jordan-maslyn"],
    highScore: 134.26,
    prizePool: 1_000,
    prizePerWinner: 1_000,
    tieCount: 0,
    source: "SLEEPER" as const,
    sourceAsOf: "2026-09-16T02:21:32.234Z",
    checksum: "fixture",
  };
  const weeklyAwards = buildWeeklyHighScoreAwards([weekOneSettlement]);
  assert.deepEqual(weeklyAwards[0], { week: 1, teamNames: ["The Shake-N-Bakers"], owners: ["Jordan Maslyn", "Landon Elliott"], score: 134.26, prizeCents: 1_000 });
  assert.equal(buildWeeklyHighScoreAwards([]).length, 0);
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, { actorId: "privacy-fixture", role: "system" }, "2026-08-12T12:00:00.000Z");
  const current = buildPublicPayoutCurrentSeason(buildPublicOperationalFinancePresentation(await repository.getSnapshot()));
  assert.equal(current.weeklyHighScoreAwards.length, 0);
  assert.equal(current.expectedPrizeStructure.find((item) => item.label === "Weekly Awards")?.amountCents, 14_000);
  assert.equal(current.expectedPrizeTotalCents, 60_000);
  const publicHistory = buildPublicPayoutHistory(history);
  const serialized = JSON.stringify({ current, publicHistory });

  assert.match(page, /dynamic = "force-dynamic"/);
assert.match(page, /buildPublicPayoutCurrentSeason/);
assert.match(page, /buildPublicPayoutHistory/);
assert.match(client, /River City Payouts/);
assert.match(client, /Current season summary/);
assert.match(client, /Paid \/ owed/);
assert.doesNotMatch(client, /Who has paid|Owner dues status|duesRows|franchiseName|ownerName/);
assert.match(client, /Where league funds are held/);
assert.doesNotMatch(serialized, /financialOwnerId|financialOwnerName|coOwnerContext|paymentStatus|ownerId|rosterId|warRoomId|email|paymentReference|idempotencyKey|externalReference|commissionerNote/i);
assert.match(currentRoute, /duesCollected/);
assert.doesNotMatch(currentRoute, /duesRows|financialOwnerName|paymentStatus|recipient|ownerId|email/i);
assert.doesNotMatch(serialized, /duesRows|franchiseName|ownerName|Stan Schoppe|Ray Long/i);
assert.match(financeLayout, /requireOperationalFinanceCommissioner/);
assert.match(legislative, /member\/login\?returnTo=%2Fleague-info%2Flegislative%2Fnew/);
assert.match(legislative, /member\/login\?returnTo=%2Fleague-info%2Flegislative/);
assert.match(legislativeNew, /api\/auth\/current-member/);
assert.match(legislativeNew, /member\/login\?returnTo=%2Fleague-info%2Flegislative%2Fnew/);
assert.match(legislativeApi, /requireLegislativeOwner/);
assert.match(legislativeApi, /session\.access\.canonicalOwnerId/);
assert.match(voteApi, /requireLegislativeOwner/);
  assert.match(voteApi, /canonicalOwnerId/);

  console.log("Payout privacy and Legislative action-boundary checks passed.");
}

void main();
