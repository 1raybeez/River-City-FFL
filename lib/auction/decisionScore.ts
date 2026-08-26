import { calculateMaxBid } from "@/lib/auction/calculations";
import {
  calculateBenchDepthNeeds,
  calculatePositionCounts,
  calculateStarterNeeds,
  defaultBenchDepthTargets,
  defaultStarterPlan,
} from "@/lib/auction/rosterGuidance";
import {
  applyRayModifierSystem,
  calculateQualityScore,
  scoreQualityVariant,
  type CalibrationPlayer,
} from "@/lib/auction/decisionScoreCalibration";

export const DECISION_SCORE_SHADOW_VERSION = "decision-score-shadow-v1";
export const DECISION_SCORE_SHADOW_POLICY = "60/30/10-market-quality-system-b";

export type ShadowAffordability = "AFFORDABLE" | "STRETCH" | "NOT_REALISTIC";

export type ShadowRosterEntry = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  price: number;
};

export type ShadowDecisionState = {
  roster: readonly ShadowRosterEntry[];
  remainingBudget: number;
  rosterSlotsRemaining: number;
};

export type ShadowDecisionResult = {
  sleeperPlayerId: string;
  playerName: string;
  marketScore: number;
  marketRank: number | null;
  auctionComponent: number;
  adpComponent: number | null;
  qualityComponent: number;
  qualityInputs: {
    auctionSourceCount: number;
    adpSourceCount: number;
    auctionConfidenceScore: number | null;
  };
  missingAdpReweighted: boolean;
  rosterFitModifier: number;
  scarcityModifier: number;
  rayModifier: number;
  rawRayModifier: number;
  decisionScore: number;
  affordability: ShadowAffordability;
  budgetSafeMax: number;
  eligibleForAcquireNow: boolean;
  hardGateReason: string | null;
  explanations: string[];
  policyVersion: string;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizePosition(position: string | null) {
  const normalized = position?.trim().toUpperCase() ?? "";
  return normalized === "DST" || normalized === "D/ST" ? "DEF" : normalized;
}

function marketRows(players: readonly CalibrationPlayer[]) {
  return scoreQualityVariant(players, "QUALITY 10%").map((row) => ({
    ...row,
    marketRank: row.rank,
  }));
}

function calculateRosterModifier(
  player: CalibrationPlayer,
  state: ShadowDecisionState
) {
  const rosterPlayers = state.roster.map((entry) => ({ position: entry.position }));
  const counts = calculatePositionCounts(rosterPlayers);
  const starterNeed = calculateStarterNeeds(counts, defaultStarterPlan)
    .find((need) => need.label === normalizePosition(player.position))?.needed ?? 0;
  const depthNeed = calculateBenchDepthNeeds(counts, defaultBenchDepthTargets)
    .find((need) => need.label === normalizePosition(player.position))?.needed ?? 0;
  const flexSurplus = defaultStarterPlan.flexPositions.reduce((sum, position) => {
    const normalized = normalizePosition(position);
    const core = (defaultStarterPlan.coreStarters as Readonly<Record<string, number>>)[normalized] ?? 0;
    return sum + Math.max((counts[normalized] ?? 0) - core, 0);
  }, 0);
  const flexNeed = Math.max(defaultStarterPlan.flexSlots - flexSurplus, 0);
  const isFlexEligible = (defaultStarterPlan.flexPositions as readonly string[]).includes(normalizePosition(player.position));
  const raw = starterNeed > 0
    ? 5
    : depthNeed > 0
      ? 2
      : isFlexEligible && flexNeed > 0
        ? 1
        : -2;
  const modifier = clamp(raw, -5, 5);
  return {
    modifier,
    starterNeed,
    depthNeed,
    flexNeed: isFlexEligible ? flexNeed : 0,
    explanation: starterNeed > 0
      ? `Starter need contributes +${modifier}.`
      : depthNeed > 0
        ? `Depth need contributes +${modifier}; a filled starter slot does not erase remaining ${normalizePosition(player.position)} depth value.`
        : isFlexEligible && flexNeed > 0
          ? `FLEX opportunity contributes +${modifier}.`
          : `Roster surplus contributes ${modifier}.`,
  };
}

function calculateScarcityModifier(player: CalibrationPlayer, players: readonly CalibrationPlayer[]) {
  const position = normalizePosition(player.position);
  const values = players
    .filter((candidate) => normalizePosition(candidate.position) === position)
    .map((candidate) => candidate.auctionConsensus);
  if (values.length === 0) return { modifier: 0, explanation: "No positional scarcity signal available." };
  const top = Math.max(...values);
  const strongThreshold = Math.max(player.auctionConsensus * 0.85, top * 0.65);
  const strongRemaining = values.filter((value) => value >= strongThreshold).length;
  const modifier = strongRemaining <= 1 ? 2 : strongRemaining <= 2 ? 1 : strongRemaining >= 6 ? -1 : 0;
  const label = strongRemaining <= 1 ? "critical" : strongRemaining <= 2 ? "thin" : strongRemaining >= 6 ? "plentiful" : "normal";
  return { modifier, explanation: `${label} ${position} inventory (${strongRemaining} strong players remain) maps to ${modifier >= 0 ? "+" : ""}${modifier}.` };
}

function calculateAffordability(player: CalibrationPlayer, state: ShadowDecisionState) {
  const budgetSafeMax = calculateMaxBid(state.remainingBudget, state.rosterSlotsRemaining);
  if (player.auctionConsensus <= budgetSafeMax) return { affordability: "AFFORDABLE" as const, budgetSafeMax };
  if (player.auctionLow !== null && player.auctionLow <= budgetSafeMax) return { affordability: "STRETCH" as const, budgetSafeMax };
  return { affordability: "NOT_REALISTIC" as const, budgetSafeMax };
}

export function calculateShadowDecisionScore({
  player,
  marketPlayers,
  state,
}: {
  player: CalibrationPlayer;
  marketPlayers: readonly CalibrationPlayer[];
  state: ShadowDecisionState;
}): ShadowDecisionResult {
  const rows = marketRows(marketPlayers);
  const row = rows.find((candidate) => candidate.playerId === player.playerId);
  const marketScore = row?.score ?? 0;
  const roster = calculateRosterModifier(player, state);
  const scarcity = calculateScarcityModifier(player, marketPlayers);
  const affordability = calculateAffordability(player, state);
  const modifier = applyRayModifierSystem({
    marketScore,
    rosterFit: roster.modifier,
    scarcity: scarcity.modifier,
    budgetFit: 0,
    affordability: affordability.affordability,
  }, {
    rosterMaximum: 5,
    scarcityMaximum: 2,
    budgetMaximum: 0,
    totalMaximum: 7,
    budgetMode: "GATE",
  });
  const rawRayModifier = roster.modifier + scarcity.modifier;
  const rayModifier = modifier?.total ?? clamp(rawRayModifier, -7, 7);
  const eligibleForAcquireNow = affordability.affordability !== "NOT_REALISTIC";
  return {
    sleeperPlayerId: player.playerId,
    playerName: player.playerName,
    marketScore: round(marketScore),
    marketRank: row?.marketRank ?? null,
    auctionComponent: row?.components.auction ?? 0,
    adpComponent: row?.components.adp ?? null,
    qualityComponent: row?.components.quality ?? calculateQualityScore(player),
    qualityInputs: {
      auctionSourceCount: player.auctionSourceCount,
      adpSourceCount: player.adpSourceCount,
      auctionConfidenceScore: player.auctionConfidenceScore,
    },
    missingAdpReweighted: player.adp === null,
    rosterFitModifier: roster.modifier,
    scarcityModifier: scarcity.modifier,
    rayModifier,
    rawRayModifier,
    decisionScore: round(modifier?.score ?? marketScore),
    affordability: affordability.affordability,
    budgetSafeMax: affordability.budgetSafeMax,
    eligibleForAcquireNow,
    hardGateReason: eligibleForAcquireNow ? null : `Auction consensus and low value exceed the canonical budget-safe max of $${affordability.budgetSafeMax}.`,
    explanations: [
      `Market Score ${round(marketScore)} = Auction ${row?.components.auction ?? 0} × 60% + ADP ${row?.components.adp ?? "available-only"} × 30% + Quality ${row?.components.quality ?? 0} × 10%.`,
      roster.explanation,
      scarcity.explanation,
      affordability.affordability === "NOT_REALISTIC" ? `Hard gate: ${affordability.affordability}.` : `Budget feasibility: ${affordability.affordability}.`,
      `Decision Score ${round(modifier?.score ?? marketScore)} = Market Score + bounded Ray modifier ${rayModifier >= 0 ? "+" : ""}${rayModifier}.`,
    ],
    policyVersion: DECISION_SCORE_SHADOW_VERSION,
  };
}

export function rankShadowDecisionScores(players: readonly CalibrationPlayer[], state: ShadowDecisionState) {
  return players
    .map((player) => calculateShadowDecisionScore({ player, marketPlayers: players, state }))
    .sort((first, second) => Number(second.eligibleForAcquireNow) - Number(first.eligibleForAcquireNow) || second.decisionScore - first.decisionScore || first.playerName.localeCompare(second.playerName));
}

export function compareShadowToRecommendedNow(
  shadowResults: readonly ShadowDecisionResult[],
  currentSelections: readonly { playerId: string; playerName: string; category: string }[]
) {
  const ranks = new Map(shadowResults.map((result, index) => [result.sleeperPlayerId, index + 1]));
  const currentIds = new Set(currentSelections.map((selection) => selection.playerId));
  return {
    shadowTop20: shadowResults.slice(0, 20),
    currentSelections: currentSelections.map((selection) => ({ ...selection, shadowRank: ranks.get(selection.playerId) ?? null })),
    shadowOmittedByRecommendedNow: shadowResults.filter((result) => !currentIds.has(result.sleeperPlayerId)).slice(0, 20),
    agreementCount: currentSelections.filter((selection) => ranks.has(selection.playerId)).length,
  };
}
