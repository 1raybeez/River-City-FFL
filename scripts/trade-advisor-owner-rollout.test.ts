import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveCanonicalOwnerAuthorization } from "../lib/auth/canonicalAuctionAuthorization";
import { franchisesById } from "../lib/managers/identityData";

const route = readFileSync("app/api/trade-comparison/multi-team/route.ts", "utf8");
const client = readFileSync("components/TradeComparison.tsx", "utf8");
const adapter = readFileSync("lib/tradeComparison/serverRecommendationAdapter.ts", "utf8");

const expected = [
  ["ray-long", "prestigio-mundial"], ["jeffrey-hudgins", "prestigio-mundial"],
  ["jordan-maslyn", "shake-n-bakers"], ["landon-elliott", "shake-n-bakers"],
] as const;
for (const [ownerId, franchiseId] of expected) {
  assert.equal(resolveCanonicalOwnerAuthorization(ownerId)?.authorizedFranchiseId, franchiseId);
  assert.ok(franchisesById[franchiseId]?.activeOwnerIds.includes(ownerId));
}

assert.match(route, /verifyAuctionSession/);
assert.match(route, /authorizedFranchiseId/);
assert.match(route, /ownerIsParticipant/);
assert.match(route, /teamRecommendations\.filter/);
assert.match(route, /Trade Advisor is available when your franchise is part of the trade/);
assert.match(route, /Trade Advisor is available only for valid two-team league trades/);
assert.match(route, /\[actor|member/);
assert.match(adapter, /request\.mode !== "LEAGUE_TRADE"/);
assert.match(adapter, /request\.participants\.length !== 2/);
assert.match(client, /result\.tradeAdvisorNotice/);
assert.match(client, /Your trade verdict/);
assert.match(client, /result\.tradeAdvisor\?\.status === "READY"/);

console.log("Trade Advisor owner rollout authorization checks passed.");
