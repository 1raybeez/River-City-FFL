import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNominatedPlayerAdvice,
  NOMINATION_ADVISOR_VERSION,
} from "../lib/auction/nominationAdvisor";
import type { RecommendedNowEvaluation } from "../lib/auction/recommendedNow";

const nomination = (currentBid: number | null) => ({
  playerId: "player-1",
  playerName: "Player One",
  position: "RB",
  nflTeam: "DET",
  currentBid,
  nominatedByFranchiseId: null,
  nominatedByRosterId: null,
  status: "active" as const,
});

function evaluation(overrides: Partial<RecommendedNowEvaluation> = {}): RecommendedNowEvaluation {
  return {
    playerId: "player-1",
    playerName: "Player One",
    position: "RB",
    nflTeam: "DET",
    auctionConsensus: 20,
    auctionLow: 16,
    auctionHigh: 24,
    auctionSourceCount: 5,
    adp: 40,
    adpSourceCount: 5,
    targetLow: null,
    targetHigh: null,
    preferenceTag: null,
    valuePercentile: 0.8,
    demandPercentile: 0.8,
    scarcity: 0.7,
    rosterFit: 0.8,
    starterNeed: 1,
    benchNeed: 1,
    affordability: "AFFORDABLE",
    affordabilityScore: 1,
    budgetSafeMax: 30,
    leaguePressure: 0.5,
    privatePreference: 0,
    categoryScores: { "ROSTER FIT": 0.8 },
    recommendationCategory: "ROSTER FIT",
    ...overrides,
  };
}

const advice = (currentBid: number, overrides: Partial<RecommendedNowEvaluation> = {}) =>
  buildNominatedPlayerAdvice({ nomination: nomination(currentBid), evaluation: evaluation(overrides), recommendationRank: 2 });

assert.equal(advice(5, { targetLow: 10 }).recommendationState, "BUY");
assert.equal(advice(8, { targetLow: 10 }).recommendationState, "BUY");
assert.equal(advice(12, { targetLow: 10 }).recommendationState, "STRETCH");
assert.equal(advice(30).recommendationState, "PASS");
assert.equal(advice(31).recommendationState, "PASS");
assert.equal(advice(12, { budgetSafeMax: 10 }).recommendationState, "PASS");
assert.equal(advice(12, { targetLow: 10, targetHigh: 10 }).recommendationState, "PASS");
assert.match(advice(12, { targetLow: 10, targetHigh: 10 }).reasons.join(" "), /private \$10 maximum/i);
assert.equal(advice(12, { preferenceTag: "fade" }).recommendationState, "PASS");
assert.match(advice(12, { preferenceTag: "fade" }).reasons[0] ?? "", /private fade/i);
assert.equal(advice(20, { preferenceTag: "target", targetLow: 10, targetHigh: 22 }).recommendationState, "STRETCH");
assert.equal(advice(24, { preferenceTag: "watch" }).recommendationState, "PASS");
assert.equal(buildNominatedPlayerAdvice({ nomination: nomination(10), evaluation: null, recommendationRank: null }).recommendationState, "UNAVAILABLE");
assert.equal(advice(10, { budgetSafeMax: 0 }).recommendationState, "UNAVAILABLE");
assert.equal(buildNominatedPlayerAdvice({ nomination: nomination(null), evaluation: evaluation(), recommendationRank: null }).recommendationState, "UNAVAILABLE");

const ownerA = advice(12, { targetLow: 14, starterNeed: 1, budgetSafeMax: 30, preferenceTag: "target" });
const ownerB = advice(12, { targetLow: null, starterNeed: 0, budgetSafeMax: 10, preferenceTag: null });
assert.equal(ownerA.recommendationState, "BUY");
assert.equal(ownerB.recommendationState, "PASS");

const nominationRoute = readFileSync("app/api/auction/nomination/route.ts", "utf8");
const nominationState = readFileSync("lib/auction/globalNominationState.ts", "utf8");
const adviceRoute = readFileSync("app/api/auction/nomination-advice/route.ts", "utf8");
const advisor = readFileSync("lib/auction/nominationAdvisor.ts", "utf8");
const hud = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const adviceUi = readFileSync("app/commish/auction/NominatedPlayerAdvice.tsx", "utf8");
assert.match(nominationRoute, /readGlobalNomination/);
assert.match(nominationRoute, /export async function PATCH/);
assert.match(nominationRoute, /updateGlobalNominationBid/);
assert.match(nominationState, /currentBid: openingBid/);
assert.match(adviceRoute, /requireAuctionWarRoomAccess/);
assert.match(adviceRoute, /readGlobalNomination/);
assert.match(adviceRoute, /readRecommendedNowForActor/);
assert.doesNotMatch(adviceRoute, /request\.json|request\.text|ownerId|userId|franchiseId|rosterId|warRoomId/);
assert.doesNotMatch(adviceRoute, /purchase-decisions|recordSale|markAuctionPurchase/);
assert.match(advisor, /BUY|STRETCH|PASS|UNAVAILABLE/);
assert.match(advisor, /budgetSafeMax/);
assert.match(hud, /api\/auction\/nomination-advice/);
assert.match(adviceUi, /River City Advice/);
assert.match(hud, /Waiting for next nomination/);

console.log(`nomination advisor ${NOMINATION_ADVISOR_VERSION}: PASS`);
