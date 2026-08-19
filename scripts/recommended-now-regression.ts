import assert from "node:assert/strict";
import { buildRecommendedNow, RECOMMENDATION_ENGINE_VERSION } from "@/lib/auction/recommendedNow";

const values = [
  { playerId: "qb-expensive", playerName: "QB Expensive", position: "QB", nflTeam: "BUF", auctionConsensus: 50, auctionLow: 45, auctionHigh: 55, auctionSourceCount: 5 },
  { playerId: "rb-value", playerName: "RB Value", position: "RB", nflTeam: "DET", auctionConsensus: 35, auctionLow: 30, auctionHigh: 40, auctionSourceCount: 5 },
  { playerId: "wr-value", playerName: "WR Value", position: "WR", nflTeam: "CIN", auctionConsensus: 34, auctionLow: 30, auctionHigh: 38, auctionSourceCount: 5 },
  { playerId: "te-scarce", playerName: "TE Scarce", position: "TE", nflTeam: "KC", auctionConsensus: 25, auctionLow: 22, auctionHigh: 28, auctionSourceCount: 5 },
  { playerId: "rb-depth", playerName: "RB Depth", position: "RB", nflTeam: "ATL", auctionConsensus: 10, auctionLow: 8, auctionHigh: 12, auctionSourceCount: 5 },
  { playerId: "wr-cheap", playerName: "WR Cheap", position: "WR", nflTeam: "LAR", auctionConsensus: 8, auctionLow: 6, auctionHigh: 10, auctionSourceCount: 5 },
  { playerId: "fade-me", playerName: "Fade Me", position: "WR", nflTeam: "NYG", auctionConsensus: 40, auctionLow: 35, auctionHigh: 45, auctionSourceCount: 5 },
  { playerId: "already-gone", playerName: "Already Gone", position: "RB", nflTeam: "MIA", auctionConsensus: 42, auctionLow: 38, auctionHigh: 46, auctionSourceCount: 5 },
];

const adp = values.map((value, index) => ({ playerId: value.playerId, adp: index + 1, sourceCount: 5 }));

function build(overrides: Partial<Parameters<typeof buildRecommendedNow>[0]> = {}) {
  return buildRecommendedNow({
    values,
    adp,
    preferences: new Map([
      ["wr-value", { tag: "target", preferredEntry: 20, plannedCap: 36 }],
      ["fade-me", { tag: "fade", preferredEntry: null, plannedCap: null }],
    ]),
    purchases: [{ playerId: "already-gone", playerName: "Already Gone", position: "RB", price: 42, rosterId: 2, isKeeper: false }],
    teams: [
      { rosterId: 1, remainingBudget: 120, rosterSlotsRemaining: 10 },
      { rosterId: 2, remainingBudget: 100, rosterSlotsRemaining: 10 },
      { rosterId: 3, remainingBudget: 90, rosterSlotsRemaining: 10 },
    ],
    rayRosterId: 1,
    rayBudget: { teamBudget: 200, keeperCostTotal: 0, spentBudget: 80, rosterSlotsTotal: 16 },
    generatedAt: "2026-08-19T00:00:00.000Z",
    ...overrides,
  });
}

const result = build();
assert.equal(result.version, RECOMMENDATION_ENGINE_VERSION);
assert.ok(result.recommendations.length <= 6);
assert.equal(new Set(result.recommendations.map((row) => row.playerId)).size, result.recommendations.length);
assert.ok(!result.recommendations.some((row) => row.playerId === "already-gone"));
assert.ok(!result.recommendations.some((row) => row.playerId === "fade-me"));
assert.deepEqual(result.unavailableCategories, ["UPSIDE PLAY"]);
assert.ok(result.recommendations.some((row) => row.category === "BEST OVERALL"));
assert.ok(result.recommendations.some((row) => row.category === "BEST VALUE"));
assert.ok(result.recommendations.some((row) => row.category === "ROSTER FIT"));
assert.ok(result.recommendations.some((row) => row.category === "SCARCITY PLAY"));
assert.ok(result.recommendations.some((row) => row.category === "BUDGET PLAY"));
assert.ok(result.recommendations.some((row) => row.playerId === "wr-value"));
assert.equal(result.recommendations.find((row) => row.playerId === "wr-value")?.targetLow, 20);
assert.equal(result.recommendations.find((row) => row.playerId === "wr-value")?.targetHigh, 36);
assert.ok(result.recommendations.every((row) => !("note" in row)));
assert.ok(result.recommendations.every((row) => row.why.length > 0));
assert.deepEqual(build().recommendations, result.recommendations);

const fadeMustNotChangeScarcity = build({
  values: [
    { playerId: "qb-top", playerName: "QB Top", position: "QB", nflTeam: "BUF", auctionConsensus: 100, auctionLow: 90, auctionHigh: 110, auctionSourceCount: 5 },
    { playerId: "qb-faded-top", playerName: "QB Faded Top", position: "QB", nflTeam: "KC", auctionConsensus: 100, auctionLow: 90, auctionHigh: 110, auctionSourceCount: 5 },
    { playerId: "qb-depth", playerName: "QB Depth", position: "QB", nflTeam: "NE", auctionConsensus: 65, auctionLow: 55, auctionHigh: 70, auctionSourceCount: 5 },
    { playerId: "rb-only", playerName: "RB Only", position: "RB", nflTeam: "DET", auctionConsensus: 30, auctionLow: 25, auctionHigh: 35, auctionSourceCount: 5 },
    { playerId: "wr-only", playerName: "WR Only", position: "WR", nflTeam: "CIN", auctionConsensus: 30, auctionLow: 25, auctionHigh: 35, auctionSourceCount: 5 },
    { playerId: "te-only", playerName: "TE Only", position: "TE", nflTeam: "KC", auctionConsensus: 30, auctionLow: 25, auctionHigh: 35, auctionSourceCount: 5 },
  ],
  adp: [],
  preferences: new Map([["qb-faded-top", { tag: "fade", preferredEntry: null, plannedCap: null }]]),
});
assert.notEqual(fadeMustNotChangeScarcity.recommendations.find((row) => row.category === "SCARCITY PLAY")?.playerId, "qb-faded-top");

const tightBudget = build({
  rayBudget: { teamBudget: 200, keeperCostTotal: 0, spentBudget: 190, rosterSlotsTotal: 16 },
});
assert.ok(!tightBudget.recommendations.some((row) => row.auctionConsensus !== null && row.auctionConsensus > 1));

const minimumRosterProtected = build({
  rayBudget: { teamBudget: 200, keeperCostTotal: 0, spentBudget: 195, rosterSlotsTotal: 16 },
  purchases: Array.from({ length: 14 }, (_, index) => ({
    playerId: `roster-${index}`,
    playerName: `Roster ${index}`,
    position: "WR",
    price: 1,
    rosterId: 1,
    isKeeper: false,
  })),
});
assert.equal(minimumRosterProtected.recommendations.length, 0);

console.log("recommended-now regression: PASS");
