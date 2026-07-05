import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";

export type BidRecommendationConfidence = "low" | "medium" | "high";
export type BidRecommendationPreference = "target" | "fade" | "watch" | "none";
export type BidRecommendationNeedLevel =
  | "must-fill"
  | "need"
  | "depth"
  | "neutral"
  | "surplus";
export type BidRecommendationByeWeekRiskLevel = "none" | "watch" | "danger";
export type AuctionMarketDirection =
  | "inflated"
  | "deflated"
  | "neutral"
  | "unknown";

export interface BidRecommendationPlayerValue {
  playerName: string;
  position?: string | null;
  nflTeam?: string | null;
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  projectedValue?: number | null;
}

export interface BidRecommendationTeamBudgetState {
  remainingBudget?: number | null;
  rosterSpotsRemaining?: number | null;
  maxBid?: number | null;
  averageDollarsPerOpenSlot?: number | null;
}

export interface BidRecommendationRosterGuidanceState {
  needLevel?: BidRecommendationNeedLevel | null;
  starterNeed?: number | boolean | null;
  benchNeed?: number | boolean | null;
  positionCount?: number | null;
  targetPositionCount?: number | null;
}

export interface BidRecommendationByeWeekRisk {
  byeWeek?: number | null;
  sameByeWeekRosterCount?: number | null;
  riskLevel?: BidRecommendationByeWeekRiskLevel | null;
}

export interface BidRecommendationPurchaseSample {
  purchasePrice?: number | null;
  projectedValue?: number | null;
  averageValue?: number | null;
  highValue?: number | null;
  lowValue?: number | null;
  status?: string | null;
}

export interface AuctionInflationState {
  multiplier: number | null;
  sampleSize: number;
  direction: AuctionMarketDirection;
}

export interface BidRecommendationMarketState {
  inflation?: AuctionInflationState | null;
  purchases?: readonly BidRecommendationPurchaseSample[] | null;
}

export interface BidRecommendationInput {
  player: BidRecommendationPlayerValue;
  teamBudget: BidRecommendationTeamBudgetState;
  rosterGuidance?: BidRecommendationRosterGuidanceState | null;
  preference?: BidRecommendationPreference | null;
  byeWeekRisk?: BidRecommendationByeWeekRisk | null;
  market?: BidRecommendationMarketState | null;
}

export interface BidRecommendationResult {
  recommendedMaxBid: number;
  confidence: BidRecommendationConfidence;
  reasons: string[];
  warnings: string[];
}

type ValueAnchorSource = "average" | "range" | "high" | "projected" | "low";

type ValueAnchor = {
  value: number;
  source: ValueAnchorSource;
};

const preferenceMultipliers: Record<BidRecommendationPreference, number> = {
  target: 1.1,
  watch: 1.05,
  fade: 0.75,
  none: 1,
};

const needLevelMultipliers: Record<BidRecommendationNeedLevel, number> = {
  "must-fill": 1.12,
  need: 1.08,
  depth: 1.03,
  neutral: 1,
  surplus: 0.9,
};

const byeWeekRiskMultipliers: Record<BidRecommendationByeWeekRiskLevel, number> = {
  none: 1,
  watch: 0.95,
  danger: 0.88,
};

function toNonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : null;
}

function toPositiveNumber(value: number | null | undefined) {
  const safeValue = toNonNegativeNumber(value);
  return safeValue !== null && safeValue > 0 ? safeValue : null;
}

function toNonNegativeInteger(value: number | null | undefined) {
  const safeValue = toNonNegativeNumber(value);
  return safeValue === null ? null : Math.floor(safeValue);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizePosition(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) return "UNK";
  if (normalized === "DST" || normalized === "D/ST") return "DEF";

  return normalized;
}

function getRayKDefStrategyMax(position: string | null | undefined) {
  const normalizedPosition = normalizePosition(position);

  if (normalizedPosition === "K") {
    return riverCityAuctionLeagueSettings.preferredEarlyKickerMax;
  }

  if (normalizedPosition === "DEF") {
    return riverCityAuctionLeagueSettings.preferredEarlyDefenseMax;
  }

  return null;
}

function getValueAnchor(player: BidRecommendationPlayerValue): ValueAnchor | null {
  const averageValue = toPositiveNumber(player.averageValue);
  if (averageValue !== null) return { value: averageValue, source: "average" };

  const lowValue = toPositiveNumber(player.lowValue);
  const highValue = toPositiveNumber(player.highValue);
  if (lowValue !== null && highValue !== null) {
    return { value: (lowValue + highValue) / 2, source: "range" };
  }

  if (highValue !== null) return { value: highValue, source: "high" };

  const projectedValue = toPositiveNumber(player.projectedValue);
  if (projectedValue !== null) {
    return { value: projectedValue, source: "projected" };
  }

  if (lowValue !== null) return { value: lowValue, source: "low" };

  return null;
}

function getPurchaseValueAnchor(
  purchase: BidRecommendationPurchaseSample
): number | null {
  return (
    toPositiveNumber(purchase.averageValue) ??
    toPositiveNumber(purchase.projectedValue) ??
    toPositiveNumber(purchase.highValue) ??
    toPositiveNumber(purchase.lowValue)
  );
}

function getMarketDirection(multiplier: number | null): AuctionMarketDirection {
  if (multiplier === null) return "unknown";
  if (multiplier >= 1.05) return "inflated";
  if (multiplier <= 0.95) return "deflated";
  return "neutral";
}

function formatMarketMultiplier(multiplier: number | null) {
  return multiplier === null ? "unknown" : `${multiplier.toFixed(2)}x`;
}

function resolveInflationState(
  market: BidRecommendationMarketState | null | undefined
): AuctionInflationState {
  const explicitMultiplier = toPositiveNumber(market?.inflation?.multiplier);

  if (explicitMultiplier !== null) {
    return {
      multiplier: explicitMultiplier,
      sampleSize: Math.max(
        toNonNegativeInteger(market?.inflation?.sampleSize) ?? 0,
        0
      ),
      direction:
        market?.inflation?.direction ?? getMarketDirection(explicitMultiplier),
    };
  }

  return calculateAuctionInflationState(market?.purchases ?? []);
}

function getBudgetCap(teamBudget: BidRecommendationTeamBudgetState) {
  const explicitMaxBid = toNonNegativeNumber(teamBudget.maxBid);
  if (explicitMaxBid !== null) return Math.floor(explicitMaxBid);

  const remainingBudget = toNonNegativeNumber(teamBudget.remainingBudget);
  const rosterSpotsRemaining = toNonNegativeInteger(
    teamBudget.rosterSpotsRemaining
  );

  if (remainingBudget === null || rosterSpotsRemaining === null) return 0;
  if (rosterSpotsRemaining <= 0) return 0;

  return Math.max(0, Math.floor(remainingBudget - rosterSpotsRemaining + 1));
}

function getNeedLevel(
  rosterGuidance: BidRecommendationRosterGuidanceState | null | undefined
): BidRecommendationNeedLevel {
  if (rosterGuidance?.needLevel) return rosterGuidance.needLevel;

  const starterNeed =
    typeof rosterGuidance?.starterNeed === "boolean"
      ? rosterGuidance.starterNeed
      : (toNonNegativeInteger(rosterGuidance?.starterNeed) ?? 0) > 0;
  if (starterNeed) return "need";

  const benchNeed =
    typeof rosterGuidance?.benchNeed === "boolean"
      ? rosterGuidance.benchNeed
      : (toNonNegativeInteger(rosterGuidance?.benchNeed) ?? 0) > 0;
  if (benchNeed) return "depth";

  const positionCount = toNonNegativeInteger(rosterGuidance?.positionCount);
  const targetPositionCount = toNonNegativeInteger(
    rosterGuidance?.targetPositionCount
  );

  if (
    positionCount !== null &&
    targetPositionCount !== null &&
    positionCount >= targetPositionCount
  ) {
    return "surplus";
  }

  return "neutral";
}

function getByeWeekRiskLevel(
  byeWeekRisk: BidRecommendationByeWeekRisk | null | undefined
): BidRecommendationByeWeekRiskLevel {
  if (byeWeekRisk?.riskLevel) return byeWeekRisk.riskLevel;

  const sameByeWeekRosterCount = toNonNegativeInteger(
    byeWeekRisk?.sameByeWeekRosterCount
  );
  if (sameByeWeekRosterCount === null || sameByeWeekRosterCount <= 1) {
    return "none";
  }

  return sameByeWeekRosterCount >= 3 ? "danger" : "watch";
}

function getConfidence(score: number): BidRecommendationConfidence {
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function addPreferenceReason(
  preference: BidRecommendationPreference,
  reasons: string[]
) {
  if (preference === "target") {
    reasons.push("Target tag adds a small premium.");
  } else if (preference === "watch") {
    reasons.push("Watch tag adds a modest bump without chasing.");
  } else if (preference === "fade") {
    reasons.push("Fade tag applies a conservative discount.");
  }
}

function addNeedReason(needLevel: BidRecommendationNeedLevel, reasons: string[]) {
  if (needLevel === "must-fill") {
    reasons.push("Roster guidance marks this position as a must-fill need.");
  } else if (needLevel === "need") {
    reasons.push("Roster guidance marks this position as a starter need.");
  } else if (needLevel === "depth") {
    reasons.push("Roster guidance marks this position as a bench depth need.");
  } else if (needLevel === "surplus") {
    reasons.push("Roster guidance shows this position is already stocked.");
  }
}

export function calculateAuctionInflationState(
  purchases: readonly BidRecommendationPurchaseSample[]
): AuctionInflationState {
  const ratios = purchases.flatMap((purchase) => {
    if (purchase.status === "voided") return [];

    const purchasePrice = toPositiveNumber(purchase.purchasePrice);
    const valueAnchor = getPurchaseValueAnchor(purchase);
    if (purchasePrice === null || valueAnchor === null) return [];

    return [clamp(purchasePrice / valueAnchor, 0.5, 1.75)];
  });

  if (ratios.length === 0) {
    return {
      multiplier: null,
      sampleSize: 0,
      direction: "unknown",
    };
  }

  const multiplier =
    ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;

  return {
    multiplier,
    sampleSize: ratios.length,
    direction: getMarketDirection(multiplier),
  };
}

export function recommendRayJeffreyMaxBid(
  input: BidRecommendationInput
): BidRecommendationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const valueAnchor = getValueAnchor(input.player);
  const budgetCap = getBudgetCap(input.teamBudget);
  const rosterSpotsRemaining = toNonNegativeInteger(
    input.teamBudget.rosterSpotsRemaining
  );
  let confidenceScore = 0;

  if (rosterSpotsRemaining !== null && rosterSpotsRemaining <= 0) {
    warnings.push("No open roster spots remain.");
  }

  if (budgetCap <= 0) {
    warnings.push("Current budget state leaves no legal max bid.");
  }

  if (valueAnchor === null) {
    warnings.push("No usable player value was available.");

    return {
      recommendedMaxBid: 0,
      confidence: "low",
      reasons,
      warnings,
    };
  }

  confidenceScore += valueAnchor.source === "average" ? 2 : 1;
  reasons.push(
    `Anchored to $${valueAnchor.value.toFixed(1)} ${valueAnchor.source} value.`
  );

  const preference = input.preference ?? "none";
  const needLevel = getNeedLevel(input.rosterGuidance);
  const byeWeekRiskLevel = getByeWeekRiskLevel(input.byeWeekRisk);
  const inflationState = resolveInflationState(input.market);
  const marketMultiplier =
    inflationState.multiplier === null
      ? 1
      : clamp(inflationState.multiplier, 0.85, 1.2);

  if (inflationState.sampleSize >= 5) {
    confidenceScore += 1;
  } else if (inflationState.sampleSize > 0) {
    warnings.push("Auction inflation sample is still small.");
  }

  if (inflationState.direction === "inflated") {
    reasons.push(
      `Auction market is inflated at ${formatMarketMultiplier(inflationState.multiplier)}.`
    );
  } else if (inflationState.direction === "deflated") {
    reasons.push(
      `Auction market is deflated at ${formatMarketMultiplier(inflationState.multiplier)}.`
    );
  }

  addPreferenceReason(preference, reasons);
  addNeedReason(needLevel, reasons);

  if (byeWeekRiskLevel === "watch") {
    warnings.push("Bye week overlap is worth monitoring.");
  } else if (byeWeekRiskLevel === "danger") {
    warnings.push("Bye week concentration is high for this player.");
  }

  const averageDollarsPerOpenSlot = toNonNegativeNumber(
    input.teamBudget.averageDollarsPerOpenSlot
  );
  if (
    averageDollarsPerOpenSlot !== null &&
    averageDollarsPerOpenSlot < Math.max(valueAnchor.value * 0.2, 4)
  ) {
    warnings.push("Average dollars per open slot is tight.");
  }

  const adjustedValue =
    valueAnchor.value *
    marketMultiplier *
    preferenceMultipliers[preference] *
    needLevelMultipliers[needLevel] *
    byeWeekRiskMultipliers[byeWeekRiskLevel];
  const uncappedRecommendation = Math.max(1, Math.round(adjustedValue));
  const strategyMaxBid = getRayKDefStrategyMax(input.player.position);
  const strategyCappedRecommendation =
    strategyMaxBid === null
      ? uncappedRecommendation
      : Math.min(uncappedRecommendation, strategyMaxBid);
  const recommendedMaxBid = Math.max(
    0,
    Math.min(strategyCappedRecommendation, budgetCap)
  );
  const wasStrategyCapped =
    strategyMaxBid !== null &&
    strategyCappedRecommendation < uncappedRecommendation;
  const wasBudgetCapped = recommendedMaxBid < strategyCappedRecommendation;

  if (wasStrategyCapped) {
    reasons.push(
      `Ray's early K/DEF value strategy caps this position at $${strategyMaxBid}.`
    );
  }

  if (wasBudgetCapped) {
    warnings.push("Recommendation is capped by current max-bid budget math.");
  } else if (wasStrategyCapped) {
    warnings.push("Recommendation is capped by Ray's K/DEF strategy max.");
  } else {
    confidenceScore += 1;
  }

  if (byeWeekRiskLevel !== "danger" && preference !== "fade") {
    confidenceScore += 1;
  }

  return {
    recommendedMaxBid,
    confidence: recommendedMaxBid <= 0 ? "low" : getConfidence(confidenceScore),
    reasons,
    warnings,
  };
}
