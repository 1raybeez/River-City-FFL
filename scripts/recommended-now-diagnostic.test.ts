import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRecommendedNow } from "../lib/auction/recommendedNow";

const route = readFileSync("app/api/auction/recommended-now/route.ts", "utf8");
assert.match(route, /requireAuctionWarRoomAccess/);
assert.match(route, /searchParams\.get\("diagnostic"\) === "1"/);
assert.match(route, /diagnostic: new URL\(request\.url\)/);
assert.ok(route.indexOf("requireAuctionWarRoomAccess") < route.indexOf("diagnostic: new URL"));
assert.doesNotMatch(route, /ownerId=|userId=|franchiseId=/);

const result = buildRecommendedNow({
  values: [
    { playerId: "qb", playerName: "QB", position: "QB", nflTeam: "BUF", auctionConsensus: 20, auctionLow: 15, auctionHigh: 25, auctionSourceCount: 5 },
    { playerId: "fade", playerName: "Fade", position: "QB", nflTeam: "KC", auctionConsensus: 25, auctionLow: 20, auctionHigh: 30, auctionSourceCount: 5 },
    { playerId: "rb", playerName: "RB", position: "RB", nflTeam: "DET", auctionConsensus: 15, auctionLow: 10, auctionHigh: 20, auctionSourceCount: 5 },
  ],
  adp: [],
  preferences: new Map([
    ["fade", { tag: "fade", preferredEntry: null, plannedCap: null }],
  ]),
  purchases: [],
  teams: [{ rosterId: 1, remainingBudget: 100, rosterSlotsRemaining: 16 }],
  rayRosterId: 1,
  rayBudget: { teamBudget: 100, keeperCostTotal: 0, spentBudget: 0, rosterSlotsTotal: 16 },
  generatedAt: "2026-08-19T00:00:00.000Z",
}, { diagnostic: true });

assert.equal(result.diagnostic?.temporary, true);
assert.equal(result.diagnostic?.availablePool.counts.QB, 1);
assert.equal(result.diagnostic?.roster.counts.QB, 0);
assert.ok(result.diagnostic?.scarcity.QB);
assert.ok(result.diagnostic?.traces.every((trace) => !("note" in trace)));
assert.ok(result.diagnostic?.traces.every((trace) => !("email" in trace) && !("uid" in trace) && !("token" in trace)));

console.log("recommended-now diagnostic contract: PASS");
