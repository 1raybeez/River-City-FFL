import { recommendRayJeffreyMaxBid } from "@/lib/auction/bidRecommendations";
import type { RecommendedNowEvaluation } from "@/lib/auction/recommendedNow";
import { calculateLiveOpportunity, classifyShadowLiveOpportunity, type ShadowLiveOpportunityBand } from "@/lib/auction/decisionScoreCalibration";

export const NOMINATION_ADVISOR_VERSION = "wr-m12b-nomination-advisor-v1";

export type NominationAdviceState = "BUY" | "STRETCH" | "PASS" | "UNAVAILABLE";

export type CurrentNominationInput = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  currentBid: number | null;
  nominatedByFranchiseId: string | null;
  nominatedByRosterId: number | null;
  status: "active";
};

export type NominatedPlayerAdvice = {
  version: string;
  player: {
    playerId: string;
    playerName: string;
    position: string | null;
    nflTeam: string | null;
  };
  currentBid: number | null;
  liveOpportunity: { label: ShadowLiveOpportunityBand; absoluteDifference: number; percentageDifference: number | null } | null;
  recommendationState: NominationAdviceState;
  targetLow: number | null;
  targetHigh: number | null;
  privateMax: number | null;
  recommendedMax: number | null;
  budgetSafeMax: number | null;
  affordability: RecommendedNowEvaluation["affordability"] | null;
  auctionConsensus: number | null;
  auctionLow: number | null;
  auctionHigh: number | null;
  adp: number | null;
  recommendationRank: number | null;
  recommendationCategory: string | null;
  rosterFit: number | null;
  scarcity: number | null;
  leaguePressure: number | null;
  reasons: string[];
  warnings: string[];
  coverage: {
    market: "available" | "missing";
    adp: "available" | "missing";
    ownerState: "available" | "missing";
    currentBid: "available" | "missing";
  };
};

function buildUnavailable(
  nomination: CurrentNominationInput | null,
  warnings: string[]
): NominatedPlayerAdvice {
  return {
    version: NOMINATION_ADVISOR_VERSION,
    player: nomination
      ? {
          playerId: nomination.playerId,
          playerName: nomination.playerName,
          position: nomination.position,
          nflTeam: nomination.nflTeam,
        }
      : { playerId: "", playerName: "", position: null, nflTeam: null },
    currentBid: nomination?.currentBid ?? null,
    liveOpportunity: null,
    recommendationState: "UNAVAILABLE",
    targetLow: null,
    targetHigh: null,
    privateMax: null,
    recommendedMax: null,
    budgetSafeMax: null,
    affordability: null,
    auctionConsensus: null,
    auctionLow: null,
    auctionHigh: null,
    adp: null,
    recommendationRank: null,
    recommendationCategory: null,
    rosterFit: null,
    scarcity: null,
    leaguePressure: null,
    reasons: [],
    warnings,
    coverage: {
      market: "missing",
      adp: "missing",
      ownerState: "missing",
      currentBid: nomination?.currentBid === null ? "missing" : "available",
    },
  };
}

export function buildNominatedPlayerAdvice({
  nomination,
  evaluation,
  recommendationRank,
}: {
  nomination: CurrentNominationInput;
  evaluation: RecommendedNowEvaluation | null;
  recommendationRank: number | null;
}): NominatedPlayerAdvice {
  if (!evaluation) {
    return buildUnavailable(nomination, [
      "The nominated player is unavailable from the authoritative current-player data.",
    ]);
  }

  const recommendation = recommendRayJeffreyMaxBid({
    player: {
      playerName: evaluation.playerName,
      position: evaluation.position,
      lowValue: evaluation.auctionLow,
      highValue: evaluation.auctionHigh,
      averageValue: evaluation.auctionConsensus,
    },
    teamBudget: {
      maxBid: evaluation.budgetSafeMax,
      remainingBudget: evaluation.budgetSafeMax,
      rosterSpotsRemaining: 1,
    },
    rosterGuidance: {
      needLevel:
        evaluation.starterNeed > 0
          ? "need"
          : evaluation.benchNeed > 0
            ? "depth"
            : "surplus",
      starterNeed: evaluation.starterNeed,
      benchNeed: evaluation.benchNeed,
    },
    preference:
      evaluation.preferenceTag === null || evaluation.preferenceTag === "open"
        ? "none"
        : evaluation.preferenceTag,
  });
  const modelRecommendedMax = Math.min(
    evaluation.budgetSafeMax,
    recommendation.recommendedMaxBid
  );
  const privateMax = evaluation.targetHigh;
  const recommendedMax =
    privateMax === null
      ? modelRecommendedMax
      : Math.min(modelRecommendedMax, privateMax);
  const player = {
    playerId: evaluation.playerId,
    playerName: evaluation.playerName,
    position: evaluation.position,
    nflTeam: evaluation.nflTeam,
  };
  const base = {
    version: NOMINATION_ADVISOR_VERSION,
    player,
    currentBid: nomination.currentBid,
    liveOpportunity: nomination.currentBid === null || evaluation.auctionConsensus === null
      ? null
      : { label: classifyShadowLiveOpportunity(evaluation.auctionConsensus, nomination.currentBid), ...calculateLiveOpportunity(evaluation.auctionConsensus, nomination.currentBid) },
    targetLow: evaluation.targetLow,
    targetHigh: evaluation.targetHigh,
    privateMax,
    recommendedMax,
    budgetSafeMax: evaluation.budgetSafeMax,
    affordability: evaluation.affordability,
    auctionConsensus: evaluation.auctionConsensus,
    auctionLow: evaluation.auctionLow,
    auctionHigh: evaluation.auctionHigh,
    adp: evaluation.adp,
    recommendationRank,
    recommendationCategory: evaluation.recommendationCategory,
    rosterFit: evaluation.rosterFit,
    scarcity: evaluation.scarcity,
    leaguePressure: evaluation.leaguePressure,
    coverage: {
      market: "available" as const,
      adp: evaluation.adp === null ? "missing" as const : "available" as const,
      ownerState: "available" as const,
      currentBid: nomination.currentBid === null ? "missing" as const : "available" as const,
    },
  };

  if (nomination.currentBid === null || !Number.isFinite(nomination.currentBid)) {
    return {
      ...base,
      recommendationState: "UNAVAILABLE",
      reasons: [],
      warnings: ["Current bid is unavailable; no bidding advice was generated."],
    };
  }
  if (evaluation.preferenceTag === "fade") {
    return {
      ...base,
      recommendationState: "PASS",
      reasons: ["Marked as a private fade in your War Room."],
      warnings: [],
    };
  }
  if (recommendedMax <= 0) {
    return {
      ...base,
      recommendationState: "UNAVAILABLE",
      reasons: [],
      warnings: ["A safe recommended maximum could not be computed."],
    };
  }
  if (nomination.currentBid > evaluation.budgetSafeMax) {
    return {
      ...base,
      recommendationState: "PASS",
      reasons: ["Current bid exceeds the maximum amount you can spend while preserving the roster reserve."],
      warnings: [],
    };
  }
  if (privateMax !== null && nomination.currentBid > privateMax) {
    return {
      ...base,
      recommendationState: "PASS",
      reasons: [`Current bid exceeds your private $${privateMax} maximum.`],
      warnings: [],
    };
  }
  if (nomination.currentBid > recommendedMax) {
    return {
      ...base,
      recommendationState: "PASS",
      reasons: ["Current bid exceeds your recommended max."],
      warnings: recommendation.warnings,
    };
  }

  const preferredEntry = evaluation.targetLow ?? evaluation.auctionConsensus;
  const reasons = [
    preferredEntry !== null && nomination.currentBid <= preferredEntry
      ? "Current bid remains within the preferred entry range."
      : "Current bid is above the preferred entry range but remains within your recommended max.",
    evaluation.starterNeed > 0
      ? `The player fills an open ${evaluation.position ?? "position"} need.`
      : evaluation.benchNeed > 0
        ? `The player supports remaining ${evaluation.position ?? "position"} depth.`
        : "Roster construction does not require this position.",
    evaluation.preferenceTag === "target"
      ? "Your TARGET preference supports continued bidding within safe limits."
      : evaluation.preferenceTag === "watch"
        ? "Your WATCH preference supports measured bidding without chasing."
        : null,
  ].filter((reason): reason is string => Boolean(reason));
  const warnings = [...recommendation.warnings];
  if (privateMax !== null && nomination.currentBid === privateMax) {
    reasons.push(`You've reached your private $${privateMax} maximum.`);
  }

  return {
    ...base,
    recommendationState:
      privateMax !== null && nomination.currentBid === privateMax
        ? "STRETCH"
        : preferredEntry !== null && nomination.currentBid <= preferredEntry
          ? "BUY"
          : "STRETCH",
    reasons,
    warnings,
  };
}
