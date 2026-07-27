export type DraftCoachDecision = 'BID' | 'LAST BID' | 'PASS' | 'WAIT' | 'BUY NOW';

export type DraftCoachBudgetPaceStatus =
  | 'too-conservative'
  | 'on-pace'
  | 'aggressive'
  | 'endgame-pressure';

export type DraftCoachPreference = 'target' | 'watch' | 'fade' | 'none';

export type DraftCoachNeedLevel =
  | 'must-fill'
  | 'need'
  | 'depth'
  | 'neutral'
  | 'surplus';

export type DraftCoachConfidence = 'high' | 'medium' | 'low';

export type DraftCoachOwnerSettings = {
  rosterConstruction: string;
  riskTolerance: string;
  keeperFocus: string;
  rookiePreference: string;
  positionPriorities: readonly string[];
  nominationStyle: string;
  kickerDefenseStrategy: string;
  draftGoal: string;
  additionalNotes: string | null;
} | null;

export type DraftCoachLiveStrategy = {
  riskMode: 'conservative' | 'balanced' | 'aggressive';
  priorityPositions: readonly string[];
  deemphasizedPositions: readonly string[];
  minimumBudgetReserve: number | null;
  opponentFocus: string | null;
  additionalInstructions: string | null;
} | null;

export type DraftCoachOpponentContext = {
  ownerName: string;
  teamName: string;
  remainingBudget: number | null;
  legalMaxBid: number | null;
  rosterSpotsRemaining: number | null;
  positionCounts: Readonly<Record<string, number>>;
  starterNeeds: readonly string[];
  historicalAveragePurchase: number | null;
  historicalBiggestPurchase: number | null;
  historicalPositionPreferences: readonly string[];
  purchaseTiming: string | null;
  confidence: 'High' | 'Medium' | 'Low';
  currentCompetitionSummary: string | null;
  recommendedPlayerName: string | null;
  recommendedMove: string;
  whyItCouldWork: string;
  nominationOnlyPressure: boolean;
  alternatives: readonly string[];
  warnings: readonly string[];
} | null;

export type DraftCoachInput = {
  question?: string | null;
  selectedPlayer: {
    playerName: string;
    position: string | null;
    nflTeam: string | null;
    preference: DraftCoachPreference;
    rosterNeedLevel: DraftCoachNeedLevel;
    status: string | null;
  } | null;
  currentBid: number | null;
  marketValue: number | null;
  predictedWinningBid: number | null;
  ownerMaxBid: number | null;
  confidence: DraftCoachConfidence | null;
  confidenceScore: number | null;
  recommendation: DraftCoachDecision | 'DO NOT BID' | null;
  intelligenceReasons: readonly string[];
  intelligenceWarnings: readonly string[];
  roomReasons: readonly string[];
  roomWarnings: readonly string[];
  historicalPricing: {
    kind: 'exact-history' | 'comparable-history' | 'none';
    mostRecentValue: number | null;
    recentAverage: number | null;
    currentVsRecentAverage: number | null;
    careerAverage: number | null;
    historyContextLabel: string | null;
  } | null;
  competitionContext: {
    summary: string;
    ownersAbleToAfford: number;
    ownersNeedingPosition: number;
    ownersBothNeedAndAfford: number;
    highestThreat: {
      ownerName: string;
      teamName: string;
      threatLevel: 'high' | 'medium' | 'low';
      reasons: readonly string[];
    } | null;
    warnings: readonly string[];
  } | null;
  budget: {
    remainingBudget: number | null;
    spentAmount: number | null;
    legalMaxBid: number | null;
    openRosterSpots: number | null;
    dollarsPerOpenSlot: number | null;
  } | null;
  roster: {
    remainingStarterNeeds: readonly string[];
    openStarterNeedCount: number;
    openRosterSpots: number | null;
    completedStarterNeedCount: number | null;
  } | null;
  positionContext: {
    heatLabel: string | null;
    heatPercent: number | null;
    remainingMeaningfulPlayersAtPosition: number | null;
    runStatus: string | null;
  } | null;
  kDefStrategy: {
    preferredEarlyKickerMax: number;
    preferredEarlyDefenseMax: number;
    configuredMax: number | null;
  } | null;
  draftProgress: {
    totalPurchases: number;
    rayPurchases: number;
    leagueDollarsSpent: number | null;
    totalRosterSlots: number | null;
  } | null;
  ownerSettings?: DraftCoachOwnerSettings;
  liveStrategy?: DraftCoachLiveStrategy;
  opponentContext?: DraftCoachOpponentContext;
  completedPurchase?: {
    statusLabel: 'SOLD' | 'KEEPER';
    teamName: string;
    managerName: string | null;
    price: number | null;
    sourceLabel: string;
    marketValueDifference: number | null;
    expectedSaleDifference: number | null;
    recommendationCeilingDifference: number | null;
  } | null;
};

export type DraftCoachResult = {
  decision: DraftCoachDecision | 'SOLD' | 'KEEPER';
  headline: string;
  intelSummary: string[];
  buddyMessage: string;
  riskGuidance: string;
  budgetPace: {
    status: DraftCoachBudgetPaceStatus;
    label: string;
    message: string;
  };
  spendGuidance: {
    suggestedNextBid?: number;
    justifiedOverpayAmount?: number;
    rosterMinimumReserve: number;
    strategicReserve: number | null;
    effectiveReserve: number;
    mustReserve: number;
  };
  reasons: string[];
  warnings: string[];
};

const decisionSet = new Set<DraftCoachDecision>([
  'BID',
  'LAST BID',
  'PASS',
  'WAIT',
  'BUY NOW',
]);

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatMoney(value: number | null | undefined) {
  return isFiniteNumber(value) ? `$${Math.round(value)}` : 'N/A';
}

function formatPercent(value: number | null | undefined) {
  return isFiniteNumber(value) ? `${value >= 0 ? '+' : ''}${Math.round(value)}%` : 'N/A';
}

function formatSignedMoney(value: number | null | undefined) {
  if (!isFiniteNumber(value)) return 'N/A';
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return `-${formatMoney(Math.abs(value))}`;
  return '$0';
}

function normalizePosition(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? '';
}

function normalizeQuestion(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizeRecommendation(
  recommendation: DraftCoachInput['recommendation']
): DraftCoachDecision {
  if (recommendation === 'DO NOT BID') return 'PASS';
  return recommendation && decisionSet.has(recommendation) ? recommendation : 'WAIT';
}

function formatOwnerSettingLabel(value: string | null | undefined) {
  return value
    ?.trim()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? '';
}

function isAvailableStatus(status: string | null | undefined) {
  const normalizedStatus = status?.trim().toLowerCase() ?? '';
  return (
    !normalizedStatus ||
    normalizedStatus === 'none' ||
    normalizedStatus === 'no' ||
    normalizedStatus === 'available'
  );
}

function getEffectiveOwnerMax(input: DraftCoachInput) {
  const baseMax = input.kDefStrategy?.configuredMax ?? input.ownerMaxBid;
  const remainingBudget = input.budget?.remainingBudget;
  const liveReserve = input.liveStrategy?.minimumBudgetReserve;

  if (
    !isFiniteNumber(baseMax) ||
    !isFiniteNumber(remainingBudget) ||
    !isFiniteNumber(liveReserve)
  ) {
    return baseMax;
  }

  return Math.max(0, Math.min(baseMax, remainingBudget - liveReserve));
}

function getOpenRosterSpots(input: DraftCoachInput) {
  return (
    input.budget?.openRosterSpots ??
    input.roster?.openRosterSpots ??
    null
  );
}

export function calculateDraftCoachReserveGuidance(input: DraftCoachInput) {
  const openRosterSpots = getOpenRosterSpots(input);
  const rosterMinimumReserve = isFiniteNumber(openRosterSpots)
    ? input.selectedPlayer
      ? Math.max(0, openRosterSpots - 1)
      : Math.max(0, openRosterSpots)
    : 0;
  const strategicReserve = isFiniteNumber(
    input.liveStrategy?.minimumBudgetReserve
  )
    ? Math.max(0, input.liveStrategy.minimumBudgetReserve)
    : null;
  const effectiveReserve = Math.max(
    rosterMinimumReserve,
    strategicReserve ?? 0
  );

  return {
    rosterMinimumReserve,
    strategicReserve,
    effectiveReserve,
  };
}

function buildBudgetPace(input: DraftCoachInput): DraftCoachResult['budgetPace'] {
  const remainingBudget = input.budget?.remainingBudget;
  const spentAmount = input.budget?.spentAmount;
  const dollarsPerOpenSlot = input.budget?.dollarsPerOpenSlot;
  const openRosterSpots = getOpenRosterSpots(input);
  const totalBudget =
    isFiniteNumber(remainingBudget) && isFiniteNumber(spentAmount)
      ? remainingBudget + spentAmount
      : null;
  const spentRatio =
    isFiniteNumber(totalBudget) && totalBudget > 0 && isFiniteNumber(spentAmount)
      ? spentAmount / totalBudget
      : null;
  const draftRatio =
    input.draftProgress &&
    isFiniteNumber(input.draftProgress.totalRosterSlots) &&
    input.draftProgress.totalRosterSlots > 0
      ? input.draftProgress.totalPurchases / input.draftProgress.totalRosterSlots
      : null;
  const openStarterNeedCount = input.roster?.openStarterNeedCount ?? 0;

  // Modest local thresholds: 15 points behind the draft pace means Ray is
  // hoarding, 20 points ahead or near-minimum dollars per slot means aggressive.
  if (
    (isFiniteNumber(draftRatio) && draftRatio >= 0.72 && isFiniteNumber(dollarsPerOpenSlot) && dollarsPerOpenSlot >= 8) ||
    (isFiniteNumber(openRosterSpots) && openRosterSpots <= 5 && isFiniteNumber(dollarsPerOpenSlot) && dollarsPerOpenSlot >= 8)
  ) {
    return {
      status: 'endgame-pressure',
      label: 'Endgame pressure',
      message: 'You still have real buying power late; convert it before the useful board thins.',
    };
  }

  if (
    isFiniteNumber(spentRatio) &&
    isFiniteNumber(draftRatio) &&
    draftRatio - spentRatio >= 0.15 &&
    openStarterNeedCount > 0
  ) {
    return {
      status: 'too-conservative',
      label: 'Too conservative',
      message: 'You are behind the room spend pace while starter needs remain.',
    };
  }

  if (
    (isFiniteNumber(dollarsPerOpenSlot) && dollarsPerOpenSlot <= 2.5 && openStarterNeedCount > 0) ||
    (isFiniteNumber(spentRatio) && isFiniteNumber(draftRatio) && spentRatio - draftRatio >= 0.2)
  ) {
    return {
      status: 'aggressive',
      label: 'Aggressive',
      message: 'You have spent ahead of the draft pace; protect remaining slots and avoid thin upgrades.',
    };
  }

  return {
    status: 'on-pace',
    label: 'On pace',
    message: 'Budget pace is reasonable for the current roster and draft stage.',
  };
}

function resolveBaseDecision(input: DraftCoachInput): DraftCoachDecision {
  if (!input.selectedPlayer) return normalizeRecommendation(input.recommendation);
  if (!isAvailableStatus(input.selectedPlayer.status)) return 'PASS';

  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);

  if (isFiniteNumber(currentBid) && isFiniteNumber(ownerMaxBid)) {
    if (currentBid < ownerMaxBid) return 'BID';
    if (currentBid === ownerMaxBid) return 'LAST BID';
    return 'PASS';
  }

  return normalizeRecommendation(input.recommendation);
}

function isKDefPosition(input: DraftCoachInput) {
  const position = normalizePosition(input.selectedPlayer?.position);
  return position === 'K' || position === 'DEF' || position === 'DST';
}

function getSuggestedNextBid(input: DraftCoachInput, decision: DraftCoachDecision) {
  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);
  const legalMaxBid = input.budget?.legalMaxBid ?? null;

  if (!input.selectedPlayer || decision === 'PASS' || decision === 'WAIT') return undefined;

  if (isFiniteNumber(currentBid)) {
    const nextBid = decision === 'LAST BID' ? currentBid : currentBid + 1;
    const maxAllowed = isFiniteNumber(legalMaxBid)
      ? Math.min(legalMaxBid, ownerMaxBid ?? legalMaxBid)
      : ownerMaxBid;

    return isFiniteNumber(maxAllowed) ? Math.min(nextBid, maxAllowed) : nextBid;
  }

  return isFiniteNumber(ownerMaxBid) ? Math.max(1, Math.min(ownerMaxBid, input.marketValue ?? ownerMaxBid)) : undefined;
}

function calculateStrategicOverpay(
  input: DraftCoachInput,
  budgetPace: DraftCoachResult['budgetPace'],
  mustReserve: number
) {
  const currentBid = input.currentBid;
  const ownerMaxBid = input.ownerMaxBid;
  const legalMaxBid = input.budget?.legalMaxBid;
  const remainingBudget = input.budget?.remainingBudget;
  const confidence = input.confidence;
  const confidenceScore = input.confidenceScore;
  const preference = input.selectedPlayer?.preference ?? 'none';
  const needLevel = input.selectedPlayer?.rosterNeedLevel ?? 'neutral';
  const position = normalizePosition(input.selectedPlayer?.position);
  const remainingAtPosition =
    input.positionContext?.remainingMeaningfulPlayersAtPosition;
  const openStarterNeedCount = input.roster?.openStarterNeedCount ?? 0;
  const isUrgentNeed =
    needLevel === 'must-fill' ||
    needLevel === 'need' ||
    input.roster?.remainingStarterNeeds.some(
      (need) => normalizePosition(need) === position
    );
  const hasTierPressure =
    (isFiniteNumber(remainingAtPosition) &&
      remainingAtPosition <= Math.max(2, openStarterNeedCount + 1)) ||
    input.positionContext?.heatLabel === 'Hot' ||
    input.positionContext?.runStatus === 'active';
  const behindPace =
    budgetPace.status === 'too-conservative' ||
    budgetPace.status === 'endgame-pressure';
  const confidenceOk =
    confidence === 'high' ||
    confidence === 'medium' ||
    (isFiniteNumber(confidenceScore) && confidenceScore >= 60);

  if (
    !input.selectedPlayer ||
    !isFiniteNumber(currentBid) ||
    !isFiniteNumber(ownerMaxBid) ||
    !isFiniteNumber(legalMaxBid) ||
    !isFiniteNumber(remainingBudget) ||
    isKDefPosition(input) ||
    preference !== 'target' ||
    !isUrgentNeed ||
    !hasTierPressure ||
    !behindPace ||
    !confidenceOk
  ) {
    return {};
  }

  const nextBid = currentBid + 1;
  const closeToCeiling = nextBid >= ownerMaxBid - 2 && nextBid <= ownerMaxBid + 3;
  const maxOverpay = Math.min(3, legalMaxBid - ownerMaxBid);

  if (
    !closeToCeiling ||
    maxOverpay <= 0 ||
    nextBid > ownerMaxBid + maxOverpay ||
    remainingBudget - nextBid < mustReserve
  ) {
    return {};
  }

  // Strategic overpay remains advice-only and is capped at $1-$3.
  const heatBump = input.positionContext?.heatLabel === 'Hot' ? 1 : 0;
  const confidenceCap = confidence === 'high' ? 3 : 2;
  const justifiedOverpayAmount = Math.max(
    1,
    Math.min(maxOverpay, confidenceCap, 2 + heatBump)
  );

  return {
    justifiedOverpayAmount,
    suggestedNextBid: Math.min(nextBid, ownerMaxBid + justifiedOverpayAmount),
  };
}

function buildHeadline(input: DraftCoachInput, decision: DraftCoachDecision) {
  const playerName = input.selectedPlayer?.playerName;
  if (!playerName) return 'Draft-level coach is ready.';

  if (decision === 'BUY NOW') return `Small overpay is defensible for ${playerName}.`;
  if (decision === 'BID') return `Stay in on ${playerName}.`;
  if (decision === 'LAST BID') return `${playerName} is at your ceiling.`;
  if (decision === 'PASS') return `Let ${playerName} go at this price.`;
  return `Wait for a cleaner ${playerName} price.`;
}

function buildIntelSummary(input: DraftCoachInput, decision: DraftCoachDecision) {
  const facts: string[] = [];
  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);

  if (input.selectedPlayer && isFiniteNumber(currentBid) && isFiniteNumber(ownerMaxBid)) {
    const gap = ownerMaxBid - currentBid;
    if (gap > 0) facts.push(`Current bid is ${formatMoney(gap)} below your ceiling.`);
    if (gap === 0) facts.push('Current bid is exactly at your ceiling.');
    if (gap < 0) facts.push(`Current bid is ${formatMoney(Math.abs(gap))} above your ceiling.`);
  } else if (input.selectedPlayer && isFiniteNumber(ownerMaxBid)) {
    facts.push(`Your ceiling is ${formatMoney(ownerMaxBid)} before live bidding pressure.`);
  } else {
    facts.push('No player is selected, so this is draft-level budget guidance.');
  }

  if (isFiniteNumber(input.marketValue) || isFiniteNumber(input.predictedWinningBid)) {
    facts.push(
      `Market is ${formatMoney(input.marketValue)}; likely sale is ${formatMoney(input.predictedWinningBid)}.`
    );
  }

  if (input.positionContext?.heatLabel) {
    facts.push(
      `${normalizePosition(input.selectedPlayer?.position) || 'Market'} heat is ${input.positionContext.heatLabel.toLowerCase()} at ${formatPercent(input.positionContext.heatPercent)}.`
    );
  }

  if (isFiniteNumber(input.positionContext?.remainingMeaningfulPlayersAtPosition)) {
    facts.push(
      `${input.positionContext?.remainingMeaningfulPlayersAtPosition} meaningful ${normalizePosition(input.selectedPlayer?.position) || 'position'} options remain.`
    );
  }

  if (input.historicalPricing?.kind && input.historicalPricing.kind !== 'none') {
    const label =
      input.historicalPricing.kind === 'comparable-history'
        ? 'Recent comparable value'
        : 'Recent River City value';
    facts.push(`${label} is ${formatMoney(input.historicalPricing.recentAverage ?? input.historicalPricing.mostRecentValue)}.`);
  }

  if (input.ownerSettings) {
    facts.push(
      `Draft style: ${formatOwnerSettingLabel(input.ownerSettings.rosterConstruction)} with ${formatOwnerSettingLabel(input.ownerSettings.riskTolerance).toLowerCase()} bid posture.`
    );
  }

  if (input.liveStrategy) {
    facts.push(
      `Live strategy is ${formatOwnerSettingLabel(input.liveStrategy.riskMode).toLowerCase()} with a ${formatMoney(input.liveStrategy.minimumBudgetReserve)} minimum reserve.`
    );
  }

  if (input.competitionContext && input.selectedPlayer) {
    const highestThreat = input.competitionContext.highestThreat;
    if (input.competitionContext.ownersBothNeedAndAfford > 0) {
      facts.push(
        `${input.competitionContext.ownersBothNeedAndAfford} owners both need ${normalizePosition(input.selectedPlayer.position) || 'this position'} and can afford the likely sale.`
      );
    } else {
      facts.push(input.competitionContext.summary);
    }

    if (highestThreat) {
      facts.push(
        `${highestThreat.ownerName} is the strongest current threat: ${highestThreat.reasons[0] ?? highestThreat.threatLevel}.`
      );
    }
  }

  if (decision === 'PASS' && isFiniteNumber(currentBid) && isFiniteNumber(ownerMaxBid) && currentBid > ownerMaxBid) {
    facts.push('The live price is already beyond your personal ceiling.');
  }

  return facts.slice(0, 5);
}

function buildBuddyMessage(
  input: DraftCoachInput,
  decision: DraftCoachDecision,
  budgetPace: DraftCoachResult['budgetPace'],
  overpay: { justifiedOverpayAmount?: number; suggestedNextBid?: number }
) {
  const question = normalizeQuestion(input.question);
  const playerName = input.selectedPlayer?.playerName;

  if (question.includes('reserve')) {
    const guidance = calculateDraftCoachReserveGuidance(input);
    return guidance.strategicReserve !== null
      ? `Roster legality requires ${formatMoney(guidance.rosterMinimumReserve)}, your live strategy requires ${formatMoney(guidance.strategicReserve)}, and the effective reserve is ${formatMoney(guidance.effectiveReserve)}.`
      : `Roster legality requires ${formatMoney(guidance.rosterMinimumReserve)}, so the effective reserve is ${formatMoney(guidance.effectiveReserve)}.`;
  }

  if (question.includes('conservative') || question.includes('too slow')) {
    return budgetPace.status === 'too-conservative' || budgetPace.status === 'endgame-pressure'
      ? 'Yes. You can be more assertive when the player fits a real need and the bid is still near your ceiling.'
      : 'Not really. Your budget pace is acceptable, so stay selective instead of forcing a buy.';
  }

  if (question.includes('fast') || question.includes('aggressive')) {
    return budgetPace.status === 'aggressive'
      ? 'Yes. Slow down and protect the remaining roster slots unless the value gap is obvious.'
      : 'You are not spending too fast right now. The better risk is waiting too long on real starter needs.';
  }

  if (!playerName) {
    return 'No current player is selected. Use the open starter needs and budget pace before making the next nomination.';
  }

  if (decision === 'BUY NOW') {
    return `${playerName} is one of the rare spots where a small override is defensible. Keep it modest and stop once the overpay window is gone.`;
  }

  if (decision === 'PASS') {
    return `Let ${playerName} go. The room has already pushed past the number that keeps this buy disciplined.`;
  }

  if (decision === 'LAST BID') {
    return `This is the last clean bid on ${playerName}. If someone goes higher, make them carry the risk.`;
  }

  if (decision === 'BID') {
    return `You can stay in on ${playerName}. Bid one step at a time and keep the ceiling firm.`;
  }

  if (overpay.justifiedOverpayAmount) {
    return `A small overpay is only justified if the next bid stays within ${formatMoney(overpay.justifiedOverpayAmount)} of your ceiling.`;
  }

  return `Wait for the room to set a price on ${playerName}. The current context is not forcing an early push.`;
}

function buildRiskGuidance(input: DraftCoachInput, decision: DraftCoachDecision) {
  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);
  const predictedWinningBid = input.predictedWinningBid;

  if (decision === 'BUY NOW') {
    return 'This is a conscious value override, not a new ceiling. Keep the overpay small and do not chase a second jump.';
  }

  if (isFiniteNumber(currentBid) && isFiniteNumber(ownerMaxBid) && currentBid > ownerMaxBid) {
    return 'The likely sale is now above your personal ceiling.';
  }

  if (isFiniteNumber(predictedWinningBid) && isFiniteNumber(ownerMaxBid) && predictedWinningBid > ownerMaxBid) {
    return 'The likely sale may exceed your ceiling, so be ready to stop immediately.';
  }

  if (decision === 'LAST BID') {
    return 'You have no cushion left; this bid is fine, the next one is not.';
  }

  if (input.selectedPlayer?.preference === 'fade') {
    return 'Fade tag is active, so the burden of proof is higher than normal.';
  }

  const riskMode =
    input.liveStrategy?.riskMode ?? input.ownerSettings?.riskTolerance;

  if (riskMode === 'conservative') {
    return 'Your conservative setting favors passing when the edge is thin and keeping extra room for later nominations.';
  }

  if (riskMode === 'aggressive') {
    return 'Your aggressive setting supports decisive bids on fits, but it still does not move the calculated ceiling.';
  }

  return 'Risk is controlled as long as you honor the ceiling and reserve.';
}

function uniqueStrings(values: readonly (string | null | undefined)[]) {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue || seen.has(trimmedValue)) return [];
    seen.add(trimmedValue);
    return [trimmedValue];
  });
}

function buildCompetitionReasons(input: DraftCoachInput) {
  const competitionContext = input.competitionContext;
  if (!competitionContext || !input.selectedPlayer) return [];

  const highestThreat = competitionContext.highestThreat;
  const position = normalizePosition(input.selectedPlayer.position) || 'position';

  return uniqueStrings([
    competitionContext.ownersBothNeedAndAfford > 0
      ? `${competitionContext.ownersBothNeedAndAfford} owners both need ${position} and can afford the likely sale.`
      : competitionContext.summary,
    highestThreat
      ? `${highestThreat.ownerName} is the strongest current threat because ${highestThreat.reasons[0] ?? highestThreat.threatLevel}.`
      : null,
  ]);
}

function buildOwnerSettingsReasons(input: DraftCoachInput) {
  const settings = input.ownerSettings;
  if (!settings) return [];

  const selectedPosition = normalizePosition(input.selectedPlayer?.position);
  const priorities = settings.positionPriorities
    .map((position) => normalizePosition(position))
    .filter(Boolean);

  return uniqueStrings([
    `Owner style context: ${formatOwnerSettingLabel(settings.rosterConstruction)} roster build, ${formatOwnerSettingLabel(settings.riskTolerance).toLowerCase()} bid posture, ${formatOwnerSettingLabel(settings.keeperFocus).toLowerCase()} keeper focus.`,
    selectedPosition && priorities.includes(selectedPosition)
      ? `${selectedPosition} is one of your stated priority positions.`
      : priorities.length > 0
        ? `Your stated position priorities are ${priorities.join('/')}.`
        : null,
    settings.rookiePreference === 'high'
      ? 'Your settings favor rookies and breakout-player upside as a tie-breaker.'
      : null,
    settings.nominationStyle === 'targets'
      ? 'Nomination style favors putting your own targets up when the price window is right.'
      : settings.nominationStyle === 'decoys'
        ? 'Nomination style favors draining money with players you do not want.'
        : settings.nominationStyle === 'mixed'
          ? 'Nomination style supports mixing targets and price-enforcement nominations.'
          : null,
    settings.kickerDefenseStrategy === 'minimum'
      ? 'K/DEF setting favors minimum-dollar buys unless live context forces a different decision.'
      : settings.kickerDefenseStrategy === 'elite-small-premium'
        ? 'K/DEF setting allows a small premium for an elite option.'
        : null,
    settings.additionalNotes
      ? `Owner note: ${settings.additionalNotes.slice(0, 160)}`
      : null,
  ]).slice(0, 5);
}

function buildLiveStrategyReasons(input: DraftCoachInput) {
  const strategy = input.liveStrategy;
  if (!strategy) return [];

  const selectedPosition = normalizePosition(input.selectedPlayer?.position);
  const priorities = strategy.priorityPositions.map(normalizePosition);
  const deemphasized = strategy.deemphasizedPositions.map(normalizePosition);

  return uniqueStrings([
    `Live strategy override: ${formatOwnerSettingLabel(strategy.riskMode)} risk mode.`,
    selectedPosition && priorities.includes(selectedPosition)
      ? `${selectedPosition} is a live priority position and should win close strategic ties.`
      : priorities.length > 0
        ? `Live priority positions: ${priorities.join('/')}.`
        : null,
    selectedPosition && deemphasized.includes(selectedPosition)
      ? `${selectedPosition} is de-emphasized; recommend it only for exceptional value or roster legality.`
      : deemphasized.length > 0
        ? `Live de-emphasized positions: ${deemphasized.join('/')}.`
        : null,
    strategy.minimumBudgetReserve !== null
      ? `Live strategy requires preserving at least ${formatMoney(strategy.minimumBudgetReserve)}.`
      : null,
    strategy.opponentFocus
      ? `Live opponent focus: ${strategy.opponentFocus.slice(0, 180)}`
      : null,
    strategy.additionalInstructions
      ? `Live instruction: ${strategy.additionalInstructions.slice(0, 180)}`
      : null,
  ]).slice(0, 6);
}

function buildOpponentStrategyResponse(
  input: DraftCoachInput,
  budgetPace: DraftCoachResult['budgetPace'],
  reserveGuidance: ReturnType<typeof calculateDraftCoachReserveGuidance>
): DraftCoachResult {
  const opponent = input.opponentContext;
  if (!opponent) {
    throw new Error('Opponent context is required.');
  }

  const safeExitPrice =
    input.selectedPlayer &&
    opponent.recommendedPlayerName === input.selectedPlayer.playerName &&
    isAvailableStatus(input.selectedPlayer.status) &&
    isFiniteNumber(input.ownerMaxBid)
      ? input.ownerMaxBid
      : null;
  const positionCounts = Object.entries(opponent.positionCounts)
    .filter(([, count]) => count > 0)
    .map(([position, count]) => `${position} ${count}`)
    .join(', ');
  const snapshot = [
    `${opponent.ownerName} (${opponent.teamName})`,
    `budget ${formatMoney(opponent.remainingBudget)}`,
    `legal max ${formatMoney(opponent.legalMaxBid)}`,
    `${opponent.rosterSpotsRemaining ?? 'N/A'} roster spots open`,
    opponent.starterNeeds.length > 0
      ? `needs ${opponent.starterNeeds.join('/')}`
      : 'no open starter need identified',
    positionCounts ? `roster ${positionCounts}` : null,
    `historical average buy ${formatMoney(opponent.historicalAveragePurchase)}`,
    `historical biggest buy ${formatMoney(opponent.historicalBiggestPurchase)}`,
    `${opponent.confidence.toLowerCase()} historical confidence`,
  ]
    .filter(Boolean)
    .join(' · ');
  const confidenceWarning =
    opponent.confidence === 'Low'
      ? 'Historical opponent tendencies are limited, so treat the tactic as a live-budget read rather than a fact.'
      : null;
  const guardrail =
    safeExitPrice === null
      ? 'Guardrail: nominate the player, but do not bid unless you would be comfortable winning him. Open the player detail to establish your personalized ceiling. Zero-risk price enforcement is impossible.'
      : `Guardrail: stop at the player-specific ${formatMoney(safeExitPrice)} personalized ceiling. Only continue bidding at a price you would be comfortable paying if you win.`;

  return {
    decision: 'WAIT',
    headline: `Recommended Move: ${opponent.recommendedMove}`,
    buddyMessage: `Recommended Move: ${opponent.recommendedMove}. Why It Could Work: ${opponent.whyItCouldWork}`,
    intelSummary: [
      `Opponent Snapshot: ${snapshot}.`,
      opponent.historicalPositionPreferences.length > 0
        ? `Historical position preferences: ${opponent.historicalPositionPreferences.join(', ')}.`
        : 'Historical position preferences are not reliable enough to use.',
      opponent.purchaseTiming
        ? `Purchase timing tendency: ${opponent.purchaseTiming}.`
        : 'Purchase timing history is limited.',
      opponent.currentCompetitionSummary
        ? `Current competition context: ${opponent.currentCompetitionSummary}.`
        : null,
      opponent.alternatives.length > 0
        ? `Alternatives: ${opponent.alternatives.slice(0, 3).join('; ')}.`
        : 'Alternatives: wait for a safer nomination with a clearer budget-pressure angle.',
    ].filter((item): item is string => Boolean(item)),
    riskGuidance: opponent.nominationOnlyPressure
      ? `Your Risk: zero-risk price enforcement is impossible. Use nomination-only pressure and avoid opening or continuing the bidding unless you are willing to win. ${guardrail}`
      : `Your Risk: you may win the nomination. ${guardrail}`,
    budgetPace,
    spendGuidance: {
      ...(safeExitPrice !== null ? { suggestedNextBid: safeExitPrice } : {}),
      ...reserveGuidance,
      mustReserve: reserveGuidance.effectiveReserve,
    },
    reasons: uniqueStrings([
      opponent.whyItCouldWork,
      `Opponent confidence: ${opponent.confidence}.`,
      ...buildLiveStrategyReasons(input),
    ]).slice(0, 8),
    warnings: uniqueStrings([
      confidenceWarning,
      ...opponent.warnings,
      guardrail,
    ]).slice(0, 8),
  };
}

function buildCompletedPurchaseResponse(
  input: DraftCoachInput,
  budgetPace: DraftCoachResult['budgetPace'],
  reserveGuidance: ReturnType<typeof calculateDraftCoachReserveGuidance>
): DraftCoachResult {
  const purchase = input.completedPurchase;
  if (!purchase) throw new Error('Completed purchase context is required.');

  const priceLabel = formatMoney(purchase.price);
  const ownerLabel = purchase.managerName
    ? `${purchase.teamName} (${purchase.managerName})`
    : purchase.teamName;

  return {
    decision: purchase.statusLabel,
    headline: `${purchase.statusLabel}: Sale complete`,
    buddyMessage: `${input.selectedPlayer?.playerName ?? 'This player'} is already ${purchase.statusLabel === 'KEEPER' ? 'rostered as a keeper' : 'sold'} to ${ownerLabel} for ${priceLabel}. Review the result; do not bid on or nominate this player again.`,
    intelSummary: [
      `Source: ${purchase.sourceLabel}.`,
      `Market-value difference: ${formatSignedMoney(purchase.marketValueDifference)}.`,
      `Expected-sale difference: ${formatSignedMoney(purchase.expectedSaleDifference)}.`,
      `Recommendation-ceiling difference: ${formatSignedMoney(purchase.recommendationCeilingDifference)}.`,
    ],
    riskGuidance:
      'The transaction is complete. Shift bidding and nomination decisions to available players.',
    budgetPace,
    spendGuidance: {
      ...reserveGuidance,
      mustReserve: reserveGuidance.effectiveReserve,
    },
    reasons: [
      `${purchase.statusLabel} status comes from the active merged purchase state.`,
      'Post-sale review replaces live bidding guidance for this player.',
    ],
    warnings: [],
  };
}

export function buildDraftCoachResponse(input: DraftCoachInput): DraftCoachResult {
  const budgetPace = buildBudgetPace(input);
  const reserveGuidance = calculateDraftCoachReserveGuidance(input);
  const mustReserve = reserveGuidance.effectiveReserve;
  if (input.completedPurchase) {
    return buildCompletedPurchaseResponse(
      input,
      budgetPace,
      reserveGuidance
    );
  }
  if (input.opponentContext) {
    return buildOpponentStrategyResponse(input, budgetPace, reserveGuidance);
  }
  const legalMaxBid = input.budget?.legalMaxBid;
  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);
  const rawBaseDecision = resolveBaseDecision(input);
  const selectedPosition = normalizePosition(input.selectedPlayer?.position);
  const isDeemphasizedPosition =
    Boolean(selectedPosition) &&
    Boolean(
      input.liveStrategy?.deemphasizedPositions
        .map(normalizePosition)
        .includes(selectedPosition)
    );
  const isUrgentRosterNeed =
    input.selectedPlayer?.rosterNeedLevel === 'must-fill';
  const isExceptionalValue =
    isFiniteNumber(input.currentBid) &&
    isFiniteNumber(input.marketValue) &&
    input.currentBid <= input.marketValue * 0.75;
  const baseDecision =
    isDeemphasizedPosition &&
    !isUrgentRosterNeed &&
    !isExceptionalValue &&
    (rawBaseDecision === 'BID' || rawBaseDecision === 'BUY NOW')
      ? 'WAIT'
      : rawBaseDecision;
  const overpay = calculateStrategicOverpay(input, budgetPace, mustReserve);
  const reserveViolation =
    isFiniteNumber(currentBid) &&
    isFiniteNumber(legalMaxBid) &&
    currentBid > legalMaxBid;
  const decision =
    reserveViolation
      ? 'PASS'
      : overpay.justifiedOverpayAmount &&
          isFiniteNumber(currentBid) &&
          isFiniteNumber(input.ownerMaxBid) &&
          currentBid > input.ownerMaxBid
        ? 'BUY NOW'
        : baseDecision;
  const suggestedNextBid =
    overpay.suggestedNextBid ?? getSuggestedNextBid(input, decision);
  const reserveMessage =
    reserveGuidance.strategicReserve !== null
      ? `Roster minimum is ${formatMoney(reserveGuidance.rosterMinimumReserve)}; live strategic reserve is ${formatMoney(reserveGuidance.strategicReserve)}; effective reserve is ${formatMoney(reserveGuidance.effectiveReserve)}.`
      : `Roster-legality minimum reserve is ${formatMoney(reserveGuidance.rosterMinimumReserve)}; effective reserve is ${formatMoney(reserveGuidance.effectiveReserve)}.`;
  const overpayReason = overpay.justifiedOverpayAmount
    ? `A strategic overpay up to ${formatMoney(overpay.justifiedOverpayAmount)} is justified by need, target status, scarcity, budget pace, and confidence.`
    : null;
  const currentBidReason =
    isFiniteNumber(currentBid) && isFiniteNumber(ownerMaxBid)
      ? currentBid > ownerMaxBid
        ? 'Current bidding is above your ceiling.'
        : currentBid === ownerMaxBid
          ? 'Current bidding has reached your ceiling.'
          : 'Current bidding remains below your ceiling.'
      : null;
  const predictedAboveCeilingWarning =
    isFiniteNumber(input.predictedWinningBid) &&
    isFiniteNumber(ownerMaxBid) &&
    input.predictedWinningBid > ownerMaxBid
      ? 'The likely sale may exceed your personal ceiling.'
      : null;
  const reserveWarning = reserveViolation
    ? `Current bid exceeds the legal max after reserving ${formatMoney(mustReserve)}.`
    : null;
  const kDefWarning =
    isKDefPosition(input) &&
    isFiniteNumber(currentBid) &&
    isFiniteNumber(input.kDefStrategy?.configuredMax) &&
    currentBid > input.kDefStrategy.configuredMax
      ? `${normalizePosition(input.selectedPlayer?.position)} bid is above Ray's configured cap.`
      : null;

  return {
    decision,
    headline: buildHeadline(input, decision),
    intelSummary: buildIntelSummary(input, decision),
    buddyMessage: buildBuddyMessage(input, decision, budgetPace, overpay),
    riskGuidance: buildRiskGuidance(input, decision),
    budgetPace,
    spendGuidance: {
      ...(suggestedNextBid !== undefined ? { suggestedNextBid } : {}),
      ...(overpay.justifiedOverpayAmount
        ? { justifiedOverpayAmount: overpay.justifiedOverpayAmount }
        : {}),
      ...reserveGuidance,
      mustReserve: reserveGuidance.effectiveReserve,
    },
    reasons: uniqueStrings([
      currentBidReason,
      reserveMessage,
      budgetPace.message,
      overpayReason,
      ...buildOwnerSettingsReasons(input),
      ...buildLiveStrategyReasons(input),
      ...buildCompetitionReasons(input),
      ...input.intelligenceReasons,
      ...input.roomReasons,
    ]).slice(0, 8),
    warnings: uniqueStrings([
      reserveWarning,
      predictedAboveCeilingWarning,
      kDefWarning,
      ...(input.competitionContext?.warnings ?? []),
      ...input.intelligenceWarnings,
      ...input.roomWarnings,
    ]).slice(0, 8),
  };
}
