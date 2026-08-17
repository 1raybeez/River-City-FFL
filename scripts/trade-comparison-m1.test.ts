import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCurrentFranchiseRosters, buildTradeComparison } from "../lib/tradeComparison/adapter";
import { serializePublicTradeComparison } from "../lib/tradeComparison/publicSerializer";
import type { PublishedAuctionValue } from "../lib/tradeComparison/types";

const rosters = buildCurrentFranchiseRosters({
  teams: [{ franchiseId: "a", franchiseName: "Alpha", rosterId: 1 }, { franchiseId: "b", franchiseName: "Beta", rosterId: 2 }],
  rosters: [{ roster_id: 1, players: ["qb-a", "rb-a", "wr-a"] }, { roster_id: 2, players: ["qb-b", "wr-b", "te-b"] }],
  playerDirectory: {
    "qb-a": { playerId: "qb-a", displayName: "QB Alpha", position: "QB", nflTeam: "ATL" },
    "rb-a": { playerId: "rb-a", displayName: "RB Alpha", position: "RB", nflTeam: "ATL" },
    "wr-a": { playerId: "wr-a", displayName: "WR Alpha", position: "WR", nflTeam: "ATL" },
    "qb-b": { playerId: "qb-b", displayName: "QB Beta", position: "QB", nflTeam: "CAR" },
    "wr-b": { playerId: "wr-b", displayName: "WR Beta", position: "WR", nflTeam: "CAR" },
    "te-b": { playerId: "te-b", displayName: "TE Beta", position: "TE", nflTeam: "CAR" },
  },
});
const values = new Map<string, PublishedAuctionValue>([
  ["rb-a", { playerId: "rb-a", value: 30, season: 2026, sourceLabel: "Published auction consensus" }],
  ["wr-b", { playerId: "wr-b", value: 20, season: 2026, sourceLabel: "Published auction consensus" }],
]);

const ready = buildTradeComparison({ input: { season: 2026, sideA: { franchiseId: "a", playerIds: ["rb-a"] }, sideB: { franchiseId: "b", playerIds: ["wr-b"] } }, rosters, auctionValues: values });
assert.equal(ready.status, "READY");
assert.equal(ready.coverage, "COMPLETE");
assert.deepEqual(ready.auctionValueContext, { sideA: 30, sideB: 20, season: 2026, sourceLabel: "Published auction consensus" });
assert.equal(ready.sides?.[0].positionalBefore.RB, 1);
assert.equal(ready.sides?.[0].positionalAfter.RB, 0);
assert.equal(ready.sides?.[0].positionalAfter.WR, 2);

const unavailable = buildTradeComparison({ input: { season: 2026, sideA: { franchiseId: "a", playerIds: ["qb-a"] }, sideB: { franchiseId: "b", playerIds: ["te-b"] } }, rosters, auctionValues: values });
assert.equal(unavailable.coverage, "UNAVAILABLE");
assert.equal(unavailable.auctionValueContext.sideA, null);

const wrongOwner = buildTradeComparison({ input: { season: 2026, sideA: { franchiseId: "a", playerIds: ["wr-b"] }, sideB: { franchiseId: "b", playerIds: ["te-b"] } }, rosters, auctionValues: values });
assert.equal(wrongOwner.status, "INVALID");
assert.match(wrongOwner.errors[0]?.message ?? "", /not currently rostered/);

const duplicate = buildTradeComparison({ input: { season: 2026, sideA: { franchiseId: "a", playerIds: ["rb-a"] }, sideB: { franchiseId: "b", playerIds: ["rb-a"] } }, rosters, auctionValues: values });
assert.equal(duplicate.status, "INVALID");
assert.ok(duplicate.errors.some((error) => /same player/i.test(error.message)));

const sameFranchise = buildTradeComparison({ input: { season: 2026, sideA: { franchiseId: "a", playerIds: ["rb-a"] }, sideB: { franchiseId: "a", playerIds: ["wr-a"] } }, rosters, auctionValues: values });
assert.equal(sameFranchise.status, "INVALID");
assert.ok(sameFranchise.errors.some((error) => /different franchises/i.test(error.message)));

const serialized = JSON.stringify(serializePublicTradeComparison(ready));
assert.doesNotMatch(serialized, /keeper|warRoom|target|cap|strategy|note|budget|finance|email|uid|fairness|winner|loser|probability|draft.?pick|trade value|trade grade|fleece/i);

const domainSources = ["types.ts", "validation.ts", "adapter.ts", "publicSerializer.ts"].map((file) => readFileSync(`lib/tradeComparison/${file}`, "utf8"));
assert.ok(domainSources.every((source) => !/tradeFairnessEngine|computeImbalance|TradeAnalyzer|PowerRankings|projection/i.test(source)));
assert.doesNotMatch(readFileSync("lib/tradeComparison/serverAdapter.ts", "utf8"), /forEach\(async|fetch\(.*player/i);

console.log("Trade Comparison M1 contract checks passed.");
