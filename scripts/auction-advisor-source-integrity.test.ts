import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const advisor = readFileSync("lib/auction/advisorContext.ts", "utf8");
const route = readFileSync("app/api/auction/advisor-chat/route.ts", "utf8");
const client = readFileSync(
  "app/commish/auction/AuctionWarRoomClient.tsx",
  "utf8"
);
const mockData = readFileSync("lib/auction/mockAuctionData.ts", "utf8");

assert.doesNotMatch(advisor, /mockAuctionData|mockAuctionTeams|mockAuctionKeepers|mockAuctionPurchases/);
assert.doesNotMatch(advisor, /buildMockPurchaseRows|Local Demo Data is applied/);
assert.match(advisor, /readAuthorizedWarRoomPurchaseSnapshots/);
assert.match(advisor, /readWarRoomLiveAuctionState/);
assert.match(advisor, /deriveWarRoomBudgetState/);
assert.match(advisor, /getCanonicalAuctionTeamByRosterId/);
assert.match(advisor, /source: "live"/);
assert.match(advisor, /Live purchase context is currently unavailable/);
assert.match(advisor, /dataAvailability/);
assert.match(advisor, /export async function buildAuctionAdvisorContext/);

assert.match(route, /requireAuctionWarRoomAccess/);
assert.match(route, /await buildAuctionAdvisorContext/);
assert.match(route, /access: actor\.access/);
assert.match(route, /dataAvailability: context\.dataAvailability/);
assert.doesNotMatch(route, /mockAuctionData|mockAuctionPurchases|mockAuctionTeams/);

assert.doesNotMatch(client, /mockAuctionData|mockAuctionPurchases|mockAuctionKeepers/);
assert.match(mockData, /Local Demo Data only/);

console.log("auction-advisor-source-integrity.test.ts: PASS");
