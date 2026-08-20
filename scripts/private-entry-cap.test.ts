import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildNominatedPlayerAdvice } from "../lib/auction/nominationAdvisor";
import type { RecommendedNowEvaluation } from "../lib/auction/recommendedNow";

const nomination = (currentBid: number | null) => ({
  playerId: "player-1",
  playerName: "Player One",
  position: "WR",
  nflTeam: "BUF",
  currentBid,
  nominatedByFranchiseId: null,
  nominatedByRosterId: null,
  status: "active" as const,
});

function evaluation(overrides: Partial<RecommendedNowEvaluation> = {}): RecommendedNowEvaluation {
  return {
    playerId: "player-1",
    playerName: "Player One",
    position: "WR",
    nflTeam: "BUF",
    auctionConsensus: 42,
    auctionLow: 38,
    auctionHigh: 46,
    auctionSourceCount: 5,
    adp: 20,
    adpSourceCount: 5,
    targetLow: 6,
    targetHigh: null,
    preferenceTag: "target",
    valuePercentile: 0.8,
    demandPercentile: 0.8,
    scarcity: 0.7,
    rosterFit: 0.8,
    starterNeed: 1,
    benchNeed: 1,
    affordability: "AFFORDABLE",
    affordabilityScore: 1,
    budgetSafeMax: 50,
    leaguePressure: 0.5,
    privatePreference: 0,
    categoryScores: { "BEST OVERALL": 0.8 },
    recommendationCategory: "BEST OVERALL",
    ...overrides,
  };
}

const advice = (currentBid: number, overrides: Partial<RecommendedNowEvaluation> = {}) =>
  buildNominatedPlayerAdvice({
    nomination: nomination(currentBid),
    evaluation: evaluation(overrides),
    recommendationRank: 1,
  });

// Entry is soft; a bid above Entry may still be STRETCH when no private cap exists.
assert.equal(advice(7).privateMax, null);
assert.equal(advice(7).recommendationState, "STRETCH");
assert.equal(advice(6).recommendationState, "BUY");

// Private Max is a hard ceiling, including for TARGET and WATCH players.
assert.equal(advice(10, { targetHigh: 10 }).recommendationState, "STRETCH");
assert.match(advice(10, { targetHigh: 10 }).reasons.join(" "), /private \$10 maximum/i);
assert.equal(advice(11, { targetHigh: 10 }).recommendationState, "PASS");
assert.match(advice(11, { targetHigh: 10 }).reasons.join(" "), /private \$10 maximum/i);
assert.equal(advice(11, { targetHigh: 10, preferenceTag: "watch" }).recommendationState, "PASS");

// Budget-safe max remains the lower hard ceiling, even when private Max is higher.
assert.equal(advice(18, { targetHigh: 25, budgetSafeMax: 17 }).recommendationState, "PASS");
assert.equal(advice(17, { targetHigh: 25, budgetSafeMax: 17 }).recommendationState, "STRETCH");

// Missing cap remains null; it is never converted to zero or inferred from market value.
const missingCap = advice(20, { targetHigh: null });
assert.equal(missingCap.privateMax, null);
assert.notEqual(missingCap.recommendedMax, 0);

// Two owners can receive different private ceilings for the same player.
assert.equal(advice(11, { targetHigh: 10 }).recommendationState, "PASS");
assert.notEqual(advice(11, { targetHigh: 15 }).recommendationState, "PASS");

const drawer = readFileSync("app/commish/auction/PlayerDetailDrawer.tsx", "utf8");
const board = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const card = readFileSync("app/commish/auction/RecommendedNow.tsx", "utf8");
assert.match(drawer, /Preferred Entry/);
assert.match(drawer, /Soft desired price to start\/target buying/);
assert.match(drawer, /Private Max/);
assert.match(drawer, /Hard stop\. Advisor passes above this price/);
assert.match(board, /ENTRY \{formatMoney\(preference\.preferredEntry\)\}/);
assert.match(board, /MAX \{formatMoney\(preference\.plannedCap\)\}/);
assert.match(card, /Private Max \{money\(recommendation\.targetHigh\)\}/);
assert.match(board, /Math\.min\(currentNominationBaselineMaxBid, selectedPlayerSavedPlannedCap\)/);
assert.match(board, /Private Max keeps the Live Context Ceiling/);

console.log("private entry/cap semantics: PASS");
