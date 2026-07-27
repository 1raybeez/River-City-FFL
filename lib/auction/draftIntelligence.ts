import type {
  BidRecommendationNeedLevel,
  BidRecommendationPreference,
} from "@/lib/auction/bidRecommendations";

export type DraftIntelligenceConfidence = "low" | "medium" | "high";
export type DraftIntelligenceRecommendation = "BID" | "LAST BID" | "PASS" | "WAIT";

export type DraftIntelligenceComparableSale = {
  purchasePrice?: number | null;
  expectedValue?: number | null;
};

export type DraftIntelligenceBudgetState = {
  remainingBudget?: number | null;
  rosterSpotsRemaining?: number | null;
  maxBid?: number | null;
};

export type DraftIntelligenceDemandContext = {
  demandTier?: string | null;
  demandScore?: number | null;
  overallAdp?: number | null;
  positionAdp?: number | null;
  waitRisk?: string | null;
  confidence?: string | null;
};

export type DraftIntelligenceInput = {
  consensusAverage?: number | null;
  consensusLow?: number | null;
  consensusHigh?: number | null;
  sourceCount?: number | null;
  existingConfidenceScore?: number | null;
  position?: string | null;
  positionInflationRate?: number | null;
  recentComparableSales?: readonly DraftIntelligenceComparableSale[] | null;
  remainingPlayersAtPosition?: number | null;
  teamBudgetState?: DraftIntelligenceBudgetState | null;
  rosterNeedLevel?: BidRecommendationNeedLevel | null;
  preference?: BidRecommendationPreference | null;
  existingRecommendedMaxBid?: number | null;
  currentBid?: number | null;
  preferredEarlyKickerMax?: number | null;
  preferredEarlyDefenseMax?: number | null;
  contextualRecommendation?: DraftIntelligenceRecommendation | null;
  demand?: DraftIntelligenceDemandContext | null;
};

export type DraftIntelligenceResult = {
  marketValue: number;
  predictedWinningBid: number;
  ownerMaxBid: number;
  confidence: DraftIntelligenceConfidence;
  confidenceScore: number;
  recommendation: DraftIntelligenceRecommendation;
  reasons: string[];
  warnings: string[];
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundAuctionDollars(value: number) {
  return Math.max(0, Math.round(value));
}

function formatMoney(value: number) {
  return `$${roundAuctionDollars(value)}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

function normalizePosition(position: string | null | undefined) {
  return position?.trim().toUpperCase() ?? "";
}

function getStrategyCap(input: DraftIntelligenceInput) {
  const normalizedPosition = normalizePosition(input.position);

  if (normalizedPosition === "K") {
    return toNonNegativeNumber(input.preferredEarlyKickerMax);
  }

  if (normalizedPosition === "DEF" || normalizedPosition === "DST" || normalizedPosition === "D/ST") {
    return toNonNegativeNumber(input.preferredEarlyDefenseMax);
  }

  return null;
}

function getStrategyPositionLabel(position: string | null | undefined) {
  const normalizedPosition = normalizePosition(position);

  if (normalizedPosition === "K") return "K";
  if (normalizedPosition === "DEF" || normalizedPosition === "DST" || normalizedPosition === "D/ST") {
    return "DEF";
  }

  return null;
}

function getConsensusAnchor(input: DraftIntelligenceInput) {
  const average = toPositiveNumber(input.consensusAverage);
  if (average !== null) return average;

  const low = toPositiveNumber(input.consensusLow);
  const high = toPositiveNumber(input.consensusHigh);
  if (low !== null && high !== null) return (low + high) / 2;
  return high ?? low ?? null;
}

function getSourceSpreadRatio(input: DraftIntelligenceInput, anchor: number | null) {
  const low = toPositiveNumber(input.consensusLow);
  const high = toPositiveNumber(input.consensusHigh);

  if (low === null || high === null || anchor === null || anchor <= 0 || high < low) {
    return null;
  }

  return (high - low) / anchor;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getConfidenceLabel(score: number): DraftIntelligenceConfidence {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function calculateConfidenceScore({
  sourceCount,
  spreadRatio,
  existingConfidenceScore,
  comparableSaleCount,
}: {
  sourceCount: number | null;
  spreadRatio: number | null;
  existingConfidenceScore: number | null;
  comparableSaleCount: number;
}) {
  const sourceScore =
    sourceCount === null
      ? 10
      : sourceCount >= 3
        ? 40
        : sourceCount === 2
          ? 28
          : sourceCount === 1
            ? 14
            : 5;
  const spreadScore =
    spreadRatio === null
      ? 8
      : spreadRatio <= 0.15
        ? 25
        : spreadRatio <= 0.3
          ? 18
          : spreadRatio <= 0.5
            ? 10
            : 4;
  const liveScore = comparableSaleCount >= 3 ? 15 : comparableSaleCount > 0 ? 8 : 0;
  const generatedScore =
    existingConfidenceScore === null
      ? 0
      : Math.round(clamp(existingConfidenceScore, 0, 100) * 0.2);

  return roundAuctionDollars(
    clamp(sourceScore + spreadScore + liveScore + generatedScore, 0, 100)
  );
}

function getScarcityAdjustment(remainingPlayersAtPosition: number | null) {
  if (remainingPlayersAtPosition === null) return 0;
  if (remainingPlayersAtPosition <= 3) return 0.08;
  if (remainingPlayersAtPosition <= 5) return 0.05;
  if (remainingPlayersAtPosition <= 8) return 0.03;
  return 0;
}

function getNeedOwnerAdjustment(
  needLevel: BidRecommendationNeedLevel | null | undefined,
  remainingPlayersAtPosition: number | null,
  preference: BidRecommendationPreference
) {
  if (preference === "fade" || remainingPlayersAtPosition === null) return 0;
  if ((needLevel === "must-fill" || needLevel === "need") && remainingPlayersAtPosition <= 3) {
    return 2;
  }
  if (needLevel === "must-fill" && remainingPlayersAtPosition <= 5) {
    return 1;
  }
  return 0;
}

function getNoBidRecommendation({
  ownerMaxBid,
  confidence,
  contextualRecommendation,
}: {
  ownerMaxBid: number;
  confidence: DraftIntelligenceConfidence;
  contextualRecommendation: DraftIntelligenceRecommendation | null | undefined;
}): DraftIntelligenceRecommendation {
  if (contextualRecommendation) return contextualRecommendation;
  if (ownerMaxBid <= 0) return "PASS";
  if (confidence === "high") return "BID";
  if (confidence === "medium") return "WAIT";
  return "PASS";
}

function getLiveContinuationAmount({
  currentBid,
  ownerMaxBid,
  comparableAverage,
  heatAdjustment,
  scarcityAdjustment,
  confidence,
  isStrategyPosition,
}: {
  currentBid: number;
  ownerMaxBid: number;
  comparableAverage: number | null;
  heatAdjustment: number;
  scarcityAdjustment: number;
  confidence: DraftIntelligenceConfidence;
  isStrategyPosition: boolean;
}) {
  if (currentBid >= ownerMaxBid) return 0;
  if (isStrategyPosition) return 1;

  let continuationAmount = 1;
  const comparableSupport =
    comparableAverage !== null && comparableAverage >= currentBid;

  if (heatAdjustment > 0.03 || scarcityAdjustment >= 0.05 || comparableSupport) {
    continuationAmount += 1;
  }

  if (
    confidence === "high" &&
    (heatAdjustment > 0.05 || scarcityAdjustment >= 0.08)
  ) {
    continuationAmount += 1;
  }

  if (confidence === "low") {
    return Math.min(continuationAmount, 1);
  }

  return Math.min(continuationAmount, 3);
}

function getDemandPressureAdjustment({
  demand,
  marketValue,
  isStrategyPosition,
  preference,
  reasons,
  warnings,
}: {
  demand: DraftIntelligenceDemandContext | null | undefined;
  marketValue: number;
  isStrategyPosition: boolean;
  preference: BidRecommendationPreference;
  reasons: string[];
  warnings: string[];
}) {
  if (!demand || isStrategyPosition || preference === "fade" || marketValue <= 0) {
    return 0;
  }

  const demandTier = demand.demandTier?.toUpperCase() ?? "UNKNOWN";
  const cap = Math.min(3, marketValue * 0.05);
  let pressureRatio = 0;

  if (demandTier === "ELITE" || demandTier === "VERY HIGH") {
    pressureRatio = 1;
  } else if (demandTier === "HIGH") {
    pressureRatio = 0.5;
  }

  if (pressureRatio <= 0) {
    if (demandTier === "LOW" || demandTier === "VERY LOW") {
      reasons.push("ADP demand is soft, so patience is reasonable.");
    }
    return 0;
  }

  const adjustment = Math.min(3, Math.floor(Math.max(0, pressureRatio * cap)));

  if (adjustment > 0) {
    reasons.push(
      `ADP demand is ${demandTier.toLowerCase()}, adding ${formatMoney(adjustment)} of predicted-sale pressure.`
    );
  }

  if (demand.waitRisk === "severe" || demand.waitRisk === "high") {
    warnings.push(
      `ADP wait risk is ${demand.waitRisk}; waiting too long may draw another owner in.`
    );
  }

  return adjustment;
}

function applyLiveCurrentBidToPrediction({
  basePredictedWinningBid,
  currentBid,
  ownerMaxBid,
  comparableAverage,
  heatAdjustment,
  scarcityAdjustment,
  confidence,
  isStrategyPosition,
  strategyCap,
  reasons,
  warnings,
}: {
  basePredictedWinningBid: number;
  currentBid: number | null;
  ownerMaxBid: number;
  comparableAverage: number | null;
  heatAdjustment: number;
  scarcityAdjustment: number;
  confidence: DraftIntelligenceConfidence;
  isStrategyPosition: boolean;
  strategyCap: number | null;
  reasons: string[];
  warnings: string[];
}) {
  if (currentBid === null) return basePredictedWinningBid;

  if (currentBid < basePredictedWinningBid) {
    if (currentBid >= ownerMaxBid || basePredictedWinningBid > ownerMaxBid) {
      warnings.push("The likely sale may exceed your recommended ceiling.");
    }

    return Math.max(basePredictedWinningBid, currentBid);
  }

  reasons.push("Current bidding has already exceeded the original market estimate.");

  if (currentBid >= ownerMaxBid) {
    warnings.push("The likely sale may exceed your recommended ceiling.");
    return currentBid;
  }

  const continuationAmount = getLiveContinuationAmount({
    currentBid,
    ownerMaxBid,
    comparableAverage,
    heatAdjustment,
    scarcityAdjustment,
    confidence,
    isStrategyPosition,
  });
  const strategyLiveCap =
    strategyCap === null || currentBid > strategyCap ? null : strategyCap;
  const liveCeiling =
    strategyLiveCap === null ? ownerMaxBid : Math.min(ownerMaxBid, strategyLiveCap);
  const adjustedPrediction = Math.max(
    currentBid,
    Math.min(currentBid + continuationAmount, liveCeiling)
  );
  const liveDelta = adjustedPrediction - currentBid;

  if (liveDelta > 0) {
    reasons.push(
      `Live bidding suggests the sale may finish ${formatMoney(liveDelta)} above the current bid.`
    );
  }

  return adjustedPrediction;
}

export function calculateDraftIntelligence(
  input: DraftIntelligenceInput
): DraftIntelligenceResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const anchor = getConsensusAnchor(input);
  const strategyCap = getStrategyCap(input);
  const isStrategyPosition = strategyCap !== null;
  const sourceCount = toNonNegativeNumber(input.sourceCount);
  const existingConfidenceScore = toNonNegativeNumber(input.existingConfidenceScore);
  const comparablePrices =
    input.recentComparableSales
      ?.map((sale) => toPositiveNumber(sale.purchasePrice))
      .filter((price): price is number => price !== null)
      .slice(-5) ?? [];
  const spreadRatio = getSourceSpreadRatio(input, anchor);
  const confidenceScore = calculateConfidenceScore({
    sourceCount,
    spreadRatio,
    existingConfidenceScore,
    comparableSaleCount: comparablePrices.length,
  });
  const confidence = getConfidenceLabel(confidenceScore);

  if (anchor === null) {
    warnings.push("No usable consensus value was available.");
  }

  if (sourceCount !== null && sourceCount <= 1) {
    warnings.push("Only one value source supports this read.");
  }

  if (spreadRatio !== null && spreadRatio > 0.5) {
    warnings.push("Value sources disagree widely.");
  }

  if (comparablePrices.length === 0) {
    warnings.push("No recent same-position sale is available.");
  }

  const rawInflationRate = toNonNegativeNumber(Math.abs(input.positionInflationRate ?? 0)) === null
    ? 0
    : input.positionInflationRate ?? 0;
  const marketAdjustment = clamp(
    rawInflationRate,
    isStrategyPosition ? -0.05 : -0.2,
    isStrategyPosition ? 0.05 : 0.2
  );
  const uncappedMarketValue =
    anchor === null ? 0 : roundAuctionDollars(anchor * (1 + marketAdjustment));
  const marketValue =
    strategyCap === null
      ? uncappedMarketValue
      : Math.min(uncappedMarketValue, strategyCap);

  if (marketAdjustment !== 0) {
    reasons.push(`Position market is ${formatPercent(marketAdjustment)} adjusted.`);
  }

  if (strategyCap !== null && marketValue < uncappedMarketValue) {
    reasons.push(`K/DEF cap keeps this read at ${formatMoney(strategyCap)}.`);
  }

  const comparableAverage = average(comparablePrices);
  const scarcityAdjustment = isStrategyPosition
    ? 0
    : getScarcityAdjustment(toNonNegativeNumber(input.remainingPlayersAtPosition));
  const heatAdjustment = clamp(rawInflationRate * 0.5, -0.08, 0.08);
  const comparableBlend =
    comparableAverage === null
      ? marketValue
      : marketValue * 0.65 + comparableAverage * 0.35;
  const scarcityAdjustedPrediction =
    comparableBlend * (1 + heatAdjustment + scarcityAdjustment);
  const confidenceAdjustedPrediction =
    confidence === "low"
      ? marketValue * 0.85 + scarcityAdjustedPrediction * 0.15
      : scarcityAdjustedPrediction;
  const strategyPredictionCap =
    strategyCap === null ? null : Math.max(strategyCap, strategyCap + 1);
  const basePredictedWinningBid = roundAuctionDollars(
    strategyPredictionCap === null
      ? confidenceAdjustedPrediction
      : Math.min(confidenceAdjustedPrediction, strategyPredictionCap)
  );

  if (comparableAverage !== null) {
    reasons.push(`Recent position sales average ${formatMoney(comparableAverage)}.`);
  }

  if (scarcityAdjustment > 0) {
    reasons.push(`Remaining same-position supply adds ${formatPercent(scarcityAdjustment)}.`);
  }

  if (confidence === "low") {
    warnings.push("Low data confidence keeps the likely sale near market value.");
  }

  const baselineOwnerMax = toNonNegativeNumber(input.existingRecommendedMaxBid) ?? 0;
  const preference = input.preference ?? "none";
  const ownerScarcityAdjustment = isStrategyPosition
    ? 0
    : getNeedOwnerAdjustment(
        input.rosterNeedLevel,
        toNonNegativeNumber(input.remainingPlayersAtPosition),
        preference
      );
  const targetAdjustment =
    !isStrategyPosition && preference === "target" && baselineOwnerMax >= marketValue
      ? 1
      : 0;
  const legalMaxBid = toNonNegativeNumber(input.teamBudgetState?.maxBid);
  const uncappedOwnerMax =
    preference === "fade"
      ? baselineOwnerMax
      : baselineOwnerMax + ownerScarcityAdjustment + targetAdjustment;
  const strategyCappedOwnerMax =
    strategyCap === null
      ? uncappedOwnerMax
      : Math.min(uncappedOwnerMax, strategyCap);
  const ownerMaxBid = roundAuctionDollars(
    legalMaxBid === null
      ? strategyCappedOwnerMax
      : Math.min(strategyCappedOwnerMax, legalMaxBid)
  );

  reasons.push(`Recommended Max starts from the existing ${formatMoney(baselineOwnerMax)} recommendation.`);

  if (preference === "fade") {
    reasons.push("Fade tag prevents an upward max adjustment.");
  }

  if (ownerScarcityAdjustment > 0) {
    reasons.push(`Roster need and scarcity add ${formatMoney(ownerScarcityAdjustment)}.`);
  }

  if (strategyCap !== null && ownerMaxBid < uncappedOwnerMax) {
    warnings.push(`K/DEF strategy caps Recommended Max at ${formatMoney(strategyCap)}.`);
  }

  if (legalMaxBid !== null && ownerMaxBid < strategyCappedOwnerMax) {
    warnings.push("Recommended Max is capped by legal max-bid budget math.");
  }

  const demandPressureAdjustment = getDemandPressureAdjustment({
    demand: input.demand,
    marketValue,
    isStrategyPosition,
    preference,
    reasons,
    warnings,
  });
  const demandAdjustedBasePrediction = roundAuctionDollars(
    basePredictedWinningBid + demandPressureAdjustment
  );
  const currentBid = toNonNegativeNumber(input.currentBid);
  const predictedWinningBid = applyLiveCurrentBidToPrediction({
    basePredictedWinningBid: demandAdjustedBasePrediction,
    currentBid,
    ownerMaxBid,
    comparableAverage,
    heatAdjustment,
    scarcityAdjustment,
    confidence,
    isStrategyPosition,
    strategyCap,
    reasons,
    warnings,
  });
  const recommendation =
    currentBid === null
      ? getNoBidRecommendation({
          ownerMaxBid,
          confidence,
          contextualRecommendation: input.contextualRecommendation,
        })
      : currentBid < ownerMaxBid
        ? "BID"
        : currentBid === ownerMaxBid
          ? "LAST BID"
          : "PASS";

  if (currentBid !== null && currentBid > ownerMaxBid) {
    warnings.push(`Current bid is ${formatMoney(currentBid - ownerMaxBid)} above Recommended Max.`);
  }

  const strategyPositionLabel = getStrategyPositionLabel(input.position);
  if (
    currentBid !== null &&
    strategyCap !== null &&
    strategyPositionLabel !== null &&
    currentBid <= strategyCap
  ) {
    reasons.push(`Fits Ray’s early ${strategyPositionLabel} value strategy.`);
  }

  return {
    marketValue,
    predictedWinningBid,
    ownerMaxBid,
    confidence,
    confidenceScore,
    recommendation,
    reasons,
    warnings,
  };
}
