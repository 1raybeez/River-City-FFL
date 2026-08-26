import assert from "node:assert/strict";
import {
  CALIBRATION_MODELS,
  calculateLiveOpportunity,
  classifyShadowLiveOpportunity,
  calculateQualityScore,
  applyRayModifierSystem,
  QUALITY_WEIGHT_VARIANTS,
  RAY_MODIFIER_SYSTEMS,
  normalizeCalibrationPlayers,
  scoreQualityVariant,
  scoreCalibrationModel,
  scoreWithWeights,
} from "../lib/auction/decisionScoreCalibration";
import {
  calculateShadowDecisionScore,
  compareShadowToRecommendedNow,
  rankShadowDecisionScores,
} from "../lib/auction/decisionScore";

const players = [
  { playerId: "a", playerName: "Auction Strong", position: "RB", nflTeam: "RIV", auctionConsensus: 60, auctionSourceCount: 5, auctionConfidenceScore: 90, auctionLow: 55, auctionHigh: 65, adp: 20, adpSourceCount: 5 },
  { playerId: "b", playerName: "ADP Strong", position: "WR", nflTeam: "RIV", auctionConsensus: 40, auctionSourceCount: 4, auctionConfidenceScore: 80, auctionLow: 35, auctionHigh: 45, adp: 5, adpSourceCount: 4 },
  { playerId: "c", playerName: "Auction Only", position: "QB", nflTeam: "RIV", auctionConsensus: 30, auctionSourceCount: 2, auctionConfidenceScore: 55, auctionLow: 25, auctionHigh: 35, adp: null, adpSourceCount: 0 },
] as const;

const normalized = normalizeCalibrationPlayers(players);
assert.equal(normalized[0].components.auction, 100);
assert.equal(normalized[1].components.adp, 100);
assert.equal(normalized[2].components.adp, null);
assert.ok(normalized[0].components.quality <= 100);
assert.equal(calculateQualityScore(players[2]), 47.5);

for (const weights of Object.values(CALIBRATION_MODELS).filter(Boolean)) {
  assert.equal(weights!.auction + weights!.adp + weights!.quality, 100);
}
assert.ok(normalized[0].components.auction > normalized[1].components.auction);
assert.ok(normalized[1].components.adp! > normalized[0].components.adp!);
assert.equal(scoreWithWeights({ auction: 80, adp: null, quality: 60 }, { auction: 60, adp: 30, quality: 10 }, "PROPORTIONAL"), 77.1);
assert.equal(scoreWithWeights({ auction: 80, adp: null, quality: 60 }, { auction: 60, adp: 30, quality: 10 }, "NEUTRAL"), 69);
assert.equal(scoreWithWeights({ auction: 80, adp: null, quality: 60 }, { auction: 60, adp: 30, quality: 10 }, "PROPORTIONAL"), 77.1);
assert.notEqual(scoreCalibrationModel(players, "MODEL C")[2].score, 0);

const firstRun = scoreCalibrationModel(players, "MODEL C");
const secondRun = scoreCalibrationModel(players, "MODEL C");
assert.deepEqual(firstRun, secondRun);
assert.equal(calculateLiveOpportunity(60, 50).absoluteDifference, 10);
assert.equal(calculateLiveOpportunity(60, 50).percentageDifference, 16.7);
assert.equal("currentBid" in firstRun[0].components, false);
assert.equal("rosterFit" in firstRun[0].components, false);
assert.equal(Object.keys(QUALITY_WEIGHT_VARIANTS).length, 4);
for (const weights of Object.values(QUALITY_WEIGHT_VARIANTS)) assert.ok(Math.abs(weights.auction + weights.adp + weights.quality - 100) < 0.1);
assert.equal(scoreQualityVariant(players, "QUALITY 10%").length, players.length);
assert.equal(applyRayModifierSystem({ marketScore: 80, rosterFit: 8, scarcity: 4, budgetFit: 3, affordability: "AFFORDABLE" }, RAY_MODIFIER_SYSTEMS["SYSTEM A"])?.score, 90);
assert.equal(applyRayModifierSystem({ marketScore: 80, rosterFit: 8, scarcity: 4, budgetFit: 3, affordability: "NOT_REALISTIC" }, RAY_MODIFIER_SYSTEMS["SYSTEM A"]), null);
assert.equal(applyRayModifierSystem({ marketScore: 80, rosterFit: 8, scarcity: 4, budgetFit: 3, affordability: "AFFORDABLE" }, RAY_MODIFIER_SYSTEMS["SYSTEM B"])?.total, 7);
const bounded = applyRayModifierSystem({ marketScore: 80, rosterFit: 99, scarcity: 99, budgetFit: 99, affordability: "AFFORDABLE" }, RAY_MODIFIER_SYSTEMS["SYSTEM B"]);
assert.deepEqual(bounded && { roster: bounded.roster, scarcity: bounded.scarcity, budget: bounded.budget, total: bounded.total, score: bounded.score }, { roster: 5, scarcity: 2, budget: 0, total: 7, score: 87 });
assert.equal(applyRayModifierSystem({ marketScore: 80, rosterFit: 99, scarcity: 99, budgetFit: 99, affordability: "NOT_REALISTIC" }, RAY_MODIFIER_SYSTEMS["SYSTEM B"]), null);
assert.equal(applyRayModifierSystem({ marketScore: 80, rosterFit: 0, scarcity: 0, budgetFit: 99, affordability: "AFFORDABLE" }, RAY_MODIFIER_SYSTEMS["SYSTEM B"])?.score, 80);
assert.equal(classifyShadowLiveOpportunity(20, 15), "SMASH VALUE");
assert.equal(classifyShadowLiveOpportunity(20, 16), "STRONG VALUE");
assert.equal(classifyShadowLiveOpportunity(20, 18), "VALUE");
assert.equal(classifyShadowLiveOpportunity(20, 20), "FAIR");
assert.equal(classifyShadowLiveOpportunity(20, 22), "STRETCH");
assert.equal(classifyShadowLiveOpportunity(20, 24), "OVERPAY");
assert.equal(classifyShadowLiveOpportunity(20, 26), "HEAVY OVERPAY");
const bidChanged = scoreCalibrationModel(players, "MODEL C");
assert.deepEqual(scoreCalibrationModel(players, "MODEL C"), bidChanged);

const emptyState = { roster: [], remainingBudget: 150, rosterSlotsRemaining: 16 } as const;
const filledRbState = { roster: [{ playerId: "rb1", playerName: "Keeper RB 1", position: "RB", price: 20 }, { playerId: "rb2", playerName: "Keeper RB 2", position: "RB", price: 20 }], remainingBudget: 110, rosterSlotsRemaining: 14 } as const;
const shadowEmpty = calculateShadowDecisionScore({ player: players[0], marketPlayers: players, state: emptyState });
const shadowFilled = calculateShadowDecisionScore({ player: players[0], marketPlayers: players, state: filledRbState });
assert.equal(shadowEmpty.marketScore, shadowFilled.marketScore);
assert.equal(shadowEmpty.policyVersion, "decision-score-shadow-v1");
assert.ok(shadowEmpty.marketScore >= 0 && shadowEmpty.marketScore <= 100);
assert.ok(shadowEmpty.decisionScore >= 0 && shadowEmpty.decisionScore <= 100);
assert.ok(shadowEmpty.explanations.some((explanation) => explanation.includes("Market Score")));
assert.equal(shadowEmpty.missingAdpReweighted, false);
assert.equal(calculateShadowDecisionScore({ player: players[2], marketPlayers: players, state: emptyState }).missingAdpReweighted, true);
assert.notEqual(shadowEmpty.rosterFitModifier, shadowFilled.rosterFitModifier);
assert.equal(shadowEmpty.affordability, "AFFORDABLE");
const hardGated = calculateShadowDecisionScore({ player: players[0], marketPlayers: players, state: { roster: [], remainingBudget: 10, rosterSlotsRemaining: 16 } });
assert.equal(hardGated.affordability, "NOT_REALISTIC");
assert.equal(hardGated.eligibleForAcquireNow, false);
assert.ok(hardGated.hardGateReason);
assert.ok(hardGated.rayModifier >= -7 && hardGated.rayModifier <= 7);
assert.equal(hardGated.rawDecisionScore, hardGated.marketScore + hardGated.rayModifier);
assert.equal(hardGated.displayDecisionScore, hardGated.decisionScore);
const ranked = rankShadowDecisionScores(players, emptyState);
assert.equal(ranked.length, players.length);
const comparison = compareShadowToRecommendedNow(ranked, [{ playerId: "a", playerName: "Auction Strong", category: "BEST OVERALL" }]);
assert.equal(comparison.currentSelections[0].shadowRank, ranked.findIndex((row) => row.sleeperPlayerId === "a") + 1);
assert.equal(comparison.agreementCount, 1);

const representativeStates = [
  emptyState,
  filledRbState,
  { roster: [{ playerId: "rb1", playerName: "RB 1", position: "RB", price: 20 }, { playerId: "rb2", playerName: "RB 2", position: "RB", price: 20 }], remainingBudget: 110, rosterSlotsRemaining: 14 },
  { roster: [{ playerId: "wr1", playerName: "WR 1", position: "WR", price: 20 }, { playerId: "wr2", playerName: "WR 2", position: "WR", price: 20 }, { playerId: "wr3", playerName: "WR 3", position: "WR", price: 20 }], remainingBudget: 90, rosterSlotsRemaining: 13 },
  { roster: [{ playerId: "qb", playerName: "QB", position: "QB", price: 20 }], remainingBudget: 130, rosterSlotsRemaining: 15 },
  { roster: [{ playerId: "te", playerName: "TE", position: "TE", price: 10 }], remainingBudget: 140, rosterSlotsRemaining: 15 },
  { roster: [{ playerId: "rb1", playerName: "RB 1", position: "RB", price: 20 }, { playerId: "wr1", playerName: "WR 1", position: "WR", price: 15 }], remainingBudget: 35, rosterSlotsRemaining: 10 },
  { roster: [], remainingBudget: 180, rosterSlotsRemaining: 16 },
  { roster: [], remainingBudget: 160, rosterSlotsRemaining: 16 },
  { roster: [{ playerId: "qb", playerName: "QB", position: "QB", price: 15 }, { playerId: "rb1", playerName: "RB 1", position: "RB", price: 20 }, { playerId: "wr1", playerName: "WR 1", position: "WR", price: 20 }, { playerId: "te", playerName: "TE", position: "TE", price: 10 }], remainingBudget: 42, rosterSlotsRemaining: 8 },
] as const;
for (const state of representativeStates) {
  const result = calculateShadowDecisionScore({ player: players[0], marketPlayers: players, state });
  assert.ok(result.rosterFitModifier >= -5 && result.rosterFitModifier <= 5);
  assert.ok(result.scarcityModifier >= -2 && result.scarcityModifier <= 2);
  assert.ok(result.rayModifier >= -7 && result.rayModifier <= 7);
}

console.log("Decision score calibration checks passed.");
