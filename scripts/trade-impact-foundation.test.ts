import assert from "node:assert/strict";
import { resolveCurrentSeasonPlayerValue } from "../lib/tradeComparison/currentValue";
import { buildLineupImpact } from "../lib/tradeComparison/lineupImpact";
import type { TradeComparisonPlayer } from "../lib/tradeComparison/types";

const base = { playerName: "Player", position: "WR", nflTeam: null };
const value = (playerId: string, currentValueScore: number | null) => resolveCurrentSeasonPlayerValue({
  playerId, playerName: playerId, position: "WR", nflTeam: null,
  sources: currentValueScore === null ? [] : [{ source: "ROS test", mode: "REST_OF_SEASON", value: currentValueScore, generatedAt: "2026-08-30T00:00:00.000Z", confidence: "HIGH" }],
  now: "2026-08-31T00:00:00.000Z",
});

const freshRos = resolveCurrentSeasonPlayerValue({ playerId: "ros", ...base, sources: [{ source: "ROS", mode: "REST_OF_SEASON", value: 80, generatedAt: "2026-08-30T00:00:00.000Z" }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(freshRos.mode, "REST_OF_SEASON");
assert.equal(freshRos.safeAsPrimaryCurrentValue, true);

const freshRanking = resolveCurrentSeasonPlayerValue({ playerId: "rank", ...base, sources: [{ source: "Current ranking", mode: "REDRAFT", overallRank: 4, generatedAt: "2026-08-29T00:00:00.000Z" }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(freshRanking.mode, "REDRAFT");
assert.equal(freshRanking.overallRank, 4);

const freshAdp = resolveCurrentSeasonPlayerValue({ playerId: "adp", ...base, sources: [{ source: "ADP", mode: "FALLBACK", overallRank: 20, generatedAt: "2026-08-25T00:00:00.000Z", allowAsFallback: true }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(freshAdp.mode, "FALLBACK");
assert.equal(freshAdp.contextOnly, true);
assert.equal(freshAdp.overallRank, 20);

const staleAdp = resolveCurrentSeasonPlayerValue({ playerId: "stale", ...base, sources: [{ source: "ADP", mode: "FALLBACK", overallRank: 20, generatedAt: "2026-07-01T00:00:00.000Z", allowAsFallback: true }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(staleAdp.freshness, "STALE");
assert.equal(staleAdp.mode, "FALLBACK");
assert.equal(staleAdp.confidence, "UNAVAILABLE");

const auctionOnly = resolveCurrentSeasonPlayerValue({ playerId: "auction", ...base, sources: [{ source: "Auction", mode: "FALLBACK", value: 50, generatedAt: "2026-08-30T00:00:00.000Z", allowAsFallback: false }], now: "2026-08-31T00:00:00.000Z" });
assert.equal(auctionOnly.currentValueScore, null);
assert.equal(auctionOnly.contextOnly, true);

const player = (playerId: string, position: TradeComparisonPlayer["position"]): TradeComparisonPlayer => ({ playerId, name: playerId, position, nflTeam: null });
const before = [player("qb", "QB"), player("rb", "RB"), player("wr1", "WR"), player("wr2", "WR"), player("te", "TE"), player("flex", "TE"), player("k", "K"), player("def", "DEF"), player("bench-wr", "WR")];
const afterUpgrade = [...before.filter((candidate) => candidate.playerId !== "wr2"), player("wr3", "WR")];
const values = new Map([
  ["qb", resolveCurrentSeasonPlayerValue({ playerId: "qb", ...base, position: "QB", sources: [{ source: "ROS", mode: "REST_OF_SEASON", value: 10, generatedAt: "2026-08-30T00:00:00.000Z" }], now: "2026-08-31T00:00:00.000Z" })],
  ["rb", value("rb", 10)], ["wr1", value("wr1", 10)], ["wr2", value("wr2", 5)], ["wr3", value("wr3", 20)], ["te", value("te", 10)], ["flex", value("flex", 5)], ["k", value("k", 5)], ["def", value("def", 5)], ["bench-wr", value("bench-wr", 1)],
]);
const impact = buildLineupImpact({ beforePlayers: before, afterPlayers: afterUpgrade, currentValues: values, starterSlots: ["QB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"] });
assert.equal(impact.status, "COMPLETE");
assert.equal(impact.starterValueDelta, 15);
assert.equal(impact.depthDeltaByPosition.WR, 0);

const partial = buildLineupImpact({ beforePlayers: before, afterPlayers: before, currentValues: new Map([["wr1", value("wr1", 10)]]), starterSlots: ["QB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"] });
assert.equal(partial.status, "PARTIAL");
assert.equal(partial.starterValueDelta, null);

const rankOnly = new Map(before.map((candidate, index) => [candidate.playerId, resolveCurrentSeasonPlayerValue({ playerId: candidate.playerId, playerName: candidate.playerId, position: candidate.position ?? "UNKNOWN", nflTeam: null, sources: [{ source: "ROS ranks", mode: "REST_OF_SEASON", overallRank: index + 1, generatedAt: "2026-08-30T00:00:00.000Z" }], now: "2026-08-31T00:00:00.000Z" })] as const));
const rankImpact = buildLineupImpact({ beforePlayers: before, afterPlayers: afterUpgrade, currentValues: rankOnly, starterSlots: ["QB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"] });
assert.equal(rankImpact.starterValueDelta, null);
assert.ok(rankImpact.after.slots.every((slot) => slot.rank !== null));

const rankValue = (playerId: string, rank: number, mode: "REST_OF_SEASON" | "FALLBACK") => resolveCurrentSeasonPlayerValue({ playerId, playerName: playerId, position: "WR", nflTeam: null, sources: [{ source: mode === "FALLBACK" ? "ADP" : "ROS", mode, overallRank: rank, generatedAt: "2026-08-30T00:00:00.000Z", allowAsFallback: mode === "FALLBACK" }], now: "2026-08-31T00:00:00.000Z" });
const fullyValued = player("fully-valued", "WR");
const fallbackOnly = player("fallback-only", "WR");
const rosOnly = player("ros-only", "WR");
const valuedVsFallback = buildLineupImpact({ beforePlayers: [fullyValued, fallbackOnly], afterPlayers: [fullyValued, fallbackOnly], currentValues: new Map([[fullyValued.playerId, value(fullyValued.playerId, 50)], [fallbackOnly.playerId, rankValue(fallbackOnly.playerId, 1, "FALLBACK")]]), starterSlots: ["WR"] });
assert.equal(valuedVsFallback.before.slots[0]?.playerId, fullyValued.playerId);
assert.equal(valuedVsFallback.before.slots[0]?.selectionEvidence, "CURRENT_VALUE");
const valuedVsRos = buildLineupImpact({ beforePlayers: [fullyValued, rosOnly], afterPlayers: [fullyValued, rosOnly], currentValues: new Map([[fullyValued.playerId, value(fullyValued.playerId, 50)], [rosOnly.playerId, rankValue(rosOnly.playerId, 1, "REST_OF_SEASON")]]), starterSlots: ["WR"] });
assert.equal(valuedVsRos.before.slots[0]?.playerId, fullyValued.playerId);
assert.equal(valuedVsRos.before.slots[0]?.selectionEvidence, "CURRENT_VALUE");
const rosVsFallback = buildLineupImpact({ beforePlayers: [rosOnly, fallbackOnly], afterPlayers: [rosOnly, fallbackOnly], currentValues: new Map([[rosOnly.playerId, rankValue(rosOnly.playerId, 50, "REST_OF_SEASON")], [fallbackOnly.playerId, rankValue(fallbackOnly.playerId, 1, "FALLBACK")]]), starterSlots: ["WR"] });
assert.equal(rosVsFallback.before.slots[0]?.playerId, rosOnly.playerId);
const twoValued = buildLineupImpact({ beforePlayers: [fullyValued, rosOnly], afterPlayers: [fullyValued, rosOnly], currentValues: new Map([[fullyValued.playerId, value(fullyValued.playerId, 100)], [rosOnly.playerId, value(rosOnly.playerId, 200)]]), starterSlots: ["WR"] });
assert.equal(twoValued.before.slots[0]?.playerId, rosOnly.playerId);
const twoRos = buildLineupImpact({ beforePlayers: [rosOnly, fallbackOnly], afterPlayers: [rosOnly, fallbackOnly], currentValues: new Map([[rosOnly.playerId, rankValue(rosOnly.playerId, 10, "REST_OF_SEASON")], [fallbackOnly.playerId, rankValue(fallbackOnly.playerId, 20, "REST_OF_SEASON")]]), starterSlots: ["WR"] });
assert.equal(twoRos.before.slots[0]?.playerId, rosOnly.playerId);
const missingBoth = buildLineupImpact({ beforePlayers: [fullyValued, { ...fallbackOnly, playerId: "missing-both" }], afterPlayers: [fullyValued, { ...fallbackOnly, playerId: "missing-both" }], currentValues: new Map([[fullyValued.playerId, value(fullyValued.playerId, 50)]]), starterSlots: ["WR"] });
assert.equal(missingBoth.before.slots[0]?.playerId, fullyValued.playerId);
const flexCompetition = buildLineupImpact({ beforePlayers: [player("rb-a", "RB"), player("wr-a", "WR"), player("te-a", "TE")], afterPlayers: [player("rb-a", "RB"), player("wr-a", "WR"), player("te-a", "TE")], currentValues: new Map([["rb-a", value("rb-a", 10)], ["wr-a", value("wr-a", 30)], ["te-a", value("te-a", 20)]]), starterSlots: ["RB", "FLEX"] });
assert.deepEqual(flexCompetition.before.slots.map((slot) => slot.playerId), ["rb-a", "wr-a"]);
const slotOnlyAssignment = buildLineupImpact({ beforePlayers: [player("wr-a", "WR"), player("wr-b", "WR")], afterPlayers: [player("wr-a", "WR"), player("wr-b", "WR")], currentValues: new Map([["wr-a", value("wr-a", 20)], ["wr-b", value("wr-b", 10)]]), starterSlots: ["WR", "FLEX"] });
assert.equal(slotOnlyAssignment.startingUnitAdded.length, 0);
assert.equal(slotOnlyAssignment.startingUnitRemoved.length, 0);
assert.notEqual(slotOnlyAssignment.before.slots[0]?.playerId, slotOnlyAssignment.before.slots[1]?.playerId);
const incomingBench = buildLineupImpact({ beforePlayers: [fullyValued], afterPlayers: [fullyValued, { ...fallbackOnly, playerId: "incoming" }], currentValues: new Map([[fullyValued.playerId, value(fullyValued.playerId, 50)], ["incoming", rankValue("incoming", 99, "FALLBACK")]]), starterSlots: ["WR"] });
assert.equal(incomingBench.after.slots[0]?.playerId, fullyValued.playerId);
const nabers = player("11632", "WR");
const tyson = player("13281", "WR");
const makai = player("13294", "WR");
const nabersTyson = buildLineupImpact({ beforePlayers: [nabers, makai], afterPlayers: [nabers, makai, tyson], currentValues: new Map([[nabers.playerId, value(nabers.playerId, 5574)], [makai.playerId, rankValue(makai.playerId, 107.7, "FALLBACK")], [tyson.playerId, rankValue(tyson.playerId, 92.5, "FALLBACK")]]), starterSlots: ["WR"] });
assert.equal(nabersTyson.before.slots[0]?.playerId, nabers.playerId);
assert.equal(nabersTyson.after.slots[0]?.playerId, nabers.playerId);
assert.equal(nabersTyson.after.slots[0]?.selectionEvidence, "CURRENT_VALUE");
assert.equal(nabersTyson.startingUnitAdded.length, 0);
assert.equal(nabersTyson.startingUnitRemoved.length, 0);
const makaiRegression = buildLineupImpact({ beforePlayers: [nabers, makai], afterPlayers: [nabers, makai], currentValues: new Map([[nabers.playerId, value(nabers.playerId, 5574)], [makai.playerId, rankValue(makai.playerId, 107.7, "FALLBACK")]]), starterSlots: ["WR"] });
assert.equal(makaiRegression.before.slots[0]?.playerId, nabers.playerId);

console.log("Trade impact foundation tests passed.");
