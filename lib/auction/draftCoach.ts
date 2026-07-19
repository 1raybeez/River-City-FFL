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
};

export type DraftCoachResult = {
  decision: DraftCoachDecision;
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
  return input.kDefStrategy?.configuredMax ?? input.ownerMaxBid;
}

function getOpenRosterSpots(input: DraftCoachInput) {
  return (
    input.budget?.openRosterSpots ??
    input.roster?.openRosterSpots ??
    null
  );
}

function calculateMustReserve(input: DraftCoachInput) {
  const openRosterSpots = getOpenRosterSpots(input);
  if (!isFiniteNumber(openRosterSpots)) return 0;

  const reserveSpots = input.selectedPlayer
    ? Math.max(0, openRosterSpots - 1)
    : openRosterSpots;

  return Math.max(0, reserveSpots);
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
  const reserve = calculateMustReserve(input);

  if (question.includes('reserve')) {
    return `Reserve at least ${formatMoney(reserve)} for ${reserve} remaining spots. That keeps the roster legal without changing your max-bid math.`;
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

  if (input.ownerSettings?.riskTolerance === 'conservative') {
    return 'Your conservative setting favors passing when the edge is thin and keeping extra room for later nominations.';
  }

  if (input.ownerSettings?.riskTolerance === 'aggressive') {
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

export function buildDraftCoachResponse(input: DraftCoachInput): DraftCoachResult {
  const budgetPace = buildBudgetPace(input);
  const mustReserve = calculateMustReserve(input);
  const legalMaxBid = input.budget?.legalMaxBid;
  const currentBid = input.currentBid;
  const ownerMaxBid = getEffectiveOwnerMax(input);
  const baseDecision = resolveBaseDecision(input);
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
  const reserveMessage = `Reserve at least ${formatMoney(mustReserve)} for ${mustReserve} remaining spots.`;
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
      mustReserve,
    },
    reasons: uniqueStrings([
      currentBidReason,
      reserveMessage,
      budgetPace.message,
      overpayReason,
      ...buildOwnerSettingsReasons(input),
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
