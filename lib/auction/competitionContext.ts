export type CompetitionThreatLevel = 'high' | 'medium' | 'low';

export type CompetitionNeedLevel =
  | 'urgent'
  | 'starter'
  | 'depth'
  | 'surplus'
  | 'unknown';

export type CompetitionTimingLabel =
  | 'early'
  | 'middle'
  | 'late'
  | 'mixed'
  | 'insufficient';

export type CompetitionOwnerConfidence = 'High' | 'Medium' | 'Low';

export type CompetitionPositionSpend = {
  position: string;
  percentOfOpenMarketSpend: number | null;
  averageFirstPurchaseOrder: number | null;
  timingLabel: CompetitionTimingLabel;
};

export type CompetitionOwnerProfile = {
  ownerId: string;
  ownerName: string;
  currentManagerName: string | null;
  currentTeamName: string | null;
  averageTopPurchase: number | null;
  positionSpending: readonly CompetitionPositionSpend[];
  purchaseTiming: {
    timingLabel: CompetitionTimingLabel;
  };
  confidence: CompetitionOwnerConfidence;
};

export type CompetitionOwnerTeam = {
  teamId: string;
  ownerId: string;
  ownerName: string;
  teamName: string;
  remainingBudget: number;
  legalMaxBid: number;
  selectedPositionCount: number;
  selectedPositionStarterTarget: number;
  needLevel: CompetitionNeedLevel;
};

export type CompetitionSelectedPlayer = {
  playerName: string;
  position: string | null;
  predictedWinningBid: number | null;
  ownerMaxBid: number | null;
  currentBid: number | null;
};

export type CompetitionContextInput = {
  selectedPlayer: CompetitionSelectedPlayer | null;
  teams: readonly CompetitionOwnerTeam[];
  ownerProfiles: readonly CompetitionOwnerProfile[];
  excludedOwnerIds?: readonly string[];
  excludedTeamIds?: readonly string[];
  draftStagePercent: number | null;
};

export type CompetitionThreat = {
  ownerId: string;
  ownerName: string;
  teamName: string;
  remainingBudget: number;
  legalMaxBid: number;
  needLevel: CompetitionNeedLevel;
  historicalPositionSpendShare: number | null;
  averageTopPurchase: number | null;
  timingLabel: CompetitionTimingLabel;
  threatLevel: CompetitionThreatLevel;
  reasons: string[];
};

export type CompetitionContext = {
  threats: CompetitionThreat[];
  ownersAbleToAfford: number;
  ownersNeedingPosition: number;
  ownersBothNeedAndAfford: number;
  highestThreat: CompetitionThreat | null;
  summary: string;
  warnings: string[];
};

type ScoredThreat = CompetitionThreat & {
  score: number;
  canAffordPredictedSale: boolean;
  hasNeed: boolean;
};

const threatLevelRank: Record<CompetitionThreatLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizePosition(value: string | null | undefined) {
  const position = value?.trim().toUpperCase() ?? '';

  if (position === 'DST' || position === 'D/ST' || position === 'DEFENSE') {
    return 'DEF';
  }

  return position;
}

function formatMoney(value: number | null | undefined) {
  return isFiniteNumber(value) ? `$${Math.round(value)}` : 'N/A';
}

function formatShare(value: number) {
  return `${Math.round(value * 100)}%`;
}

function isStarterNeed(needLevel: CompetitionNeedLevel) {
  return needLevel === 'urgent' || needLevel === 'starter';
}

function isPositionNeed(needLevel: CompetitionNeedLevel) {
  return isStarterNeed(needLevel) || needLevel === 'depth';
}

function getPriceFloor(player: CompetitionSelectedPlayer) {
  const values = [player.predictedWinningBid, player.currentBid].filter(
    isFiniteNumber
  );

  return values.length > 0 ? Math.max(...values) : null;
}

function getTimingSupport(
  timingLabel: CompetitionTimingLabel,
  draftStagePercent: number | null
) {
  if (!isFiniteNumber(draftStagePercent)) return false;

  if (timingLabel === 'early') return draftStagePercent <= 0.33;
  if (timingLabel === 'middle') {
    return draftStagePercent > 0.25 && draftStagePercent <= 0.7;
  }
  if (timingLabel === 'late') return draftStagePercent >= 0.55;

  return false;
}

function getPositionSpend(
  profile: CompetitionOwnerProfile | null,
  position: string
) {
  return (
    profile?.positionSpending.find(
      (spend) => normalizePosition(spend.position) === position
    ) ?? null
  );
}

function getThreatLevel({
  canAffordPredictedSale,
  hasStarterNeed,
  hasHistoricalSupport,
  hasNeed,
}: {
  canAffordPredictedSale: boolean;
  hasStarterNeed: boolean;
  hasHistoricalSupport: boolean;
  hasNeed: boolean;
}): CompetitionThreatLevel {
  if (canAffordPredictedSale && hasStarterNeed && hasHistoricalSupport) {
    return 'high';
  }

  if (canAffordPredictedSale && (hasNeed || hasHistoricalSupport)) {
    return 'medium';
  }

  return 'low';
}

function buildSummary(threats: readonly CompetitionThreat[]) {
  const realThreats = threats.filter(
    (threat) => threat.threatLevel === 'high' || threat.threatLevel === 'medium'
  );
  const highestThreat = realThreats[0] ?? threats[0] ?? null;

  if (!highestThreat || realThreats.length === 0) {
    return 'No strong live bidding threats identified';
  }

  return `${realThreats.length} real ${
    realThreats.length === 1 ? 'threat' : 'threats'
  } · ${highestThreat.ownerName} highest`;
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

export function calculateCompetitionContext(
  input: CompetitionContextInput
): CompetitionContext {
  const selectedPlayer = input.selectedPlayer;

  if (!selectedPlayer) {
    return {
      threats: [],
      ownersAbleToAfford: 0,
      ownersNeedingPosition: 0,
      ownersBothNeedAndAfford: 0,
      highestThreat: null,
      summary: 'No selected player for live competition context',
      warnings: [],
    };
  }

  const selectedPosition = normalizePosition(selectedPlayer.position);
  const priceFloor = getPriceFloor(selectedPlayer);
  const excludedOwnerIds = new Set(input.excludedOwnerIds?.map(normalizeId) ?? []);
  const excludedTeamIds = new Set(input.excludedTeamIds?.map(normalizeId) ?? []);
  const profilesByOwnerId = new Map(
    input.ownerProfiles.map((profile) => [normalizeId(profile.ownerId), profile])
  );
  const ownerProfilesLimited = input.ownerProfiles.length === 0;

  const scoredThreats = input.teams
    .filter((team) => !excludedTeamIds.has(normalizeId(team.teamId)))
    .filter((team) => !excludedOwnerIds.has(normalizeId(team.ownerId)))
    .map<ScoredThreat>((team) => {
      const ownerId = normalizeId(team.ownerId);
      const profile = profilesByOwnerId.get(ownerId) ?? null;
      const positionSpend = selectedPosition
        ? getPositionSpend(profile, selectedPosition)
        : null;
      const rawHistoricalPositionSpendShare =
        positionSpend?.percentOfOpenMarketSpend ?? null;
      const historicalPositionSpendShare =
        profile?.confidence === 'Low' ? null : rawHistoricalPositionSpendShare;
      const averageTopPurchase =
        profile?.confidence === 'Low'
          ? null
          : profile?.averageTopPurchase ?? null;
      const timingLabel =
        positionSpend?.timingLabel ??
        profile?.purchaseTiming.timingLabel ??
        'insufficient';
      const canAffordPredictedSale =
        priceFloor !== null && team.legalMaxBid >= priceFloor;
      const canAffordAboveRayMax =
        isFiniteNumber(selectedPlayer.ownerMaxBid) &&
        team.legalMaxBid > selectedPlayer.ownerMaxBid;
      const hasStarterNeed = isStarterNeed(team.needLevel);
      const hasNeed = isPositionNeed(team.needLevel);
      const hasHighSpendShare =
        profile?.confidence !== 'Low' &&
        isFiniteNumber(historicalPositionSpendShare) &&
        historicalPositionSpendShare >= 0.22;
      const averageTopPurchaseSupportsPrice =
        profile?.confidence !== 'Low' &&
        priceFloor !== null &&
        isFiniteNumber(averageTopPurchase) &&
        averageTopPurchase >= priceFloor * 0.85;
      const timingSupportsStage =
        profile?.confidence !== 'Low' &&
        getTimingSupport(timingLabel, input.draftStagePercent);
      const hasHistoricalSupport =
        hasHighSpendShare ||
        averageTopPurchaseSupportsPrice ||
        timingSupportsStage;
      const threatLevel = getThreatLevel({
        canAffordPredictedSale,
        hasStarterNeed,
        hasHistoricalSupport,
        hasNeed,
      });
      const score =
        (canAffordPredictedSale ? 3 : 0) +
        (canAffordAboveRayMax ? 1 : 0) +
        (team.needLevel === 'urgent' ? 3 : team.needLevel === 'starter' ? 2 : hasNeed ? 1 : 0) +
        (hasHighSpendShare ? 2 : 0) +
        (averageTopPurchaseSupportsPrice ? 1 : 0) +
        (timingSupportsStage ? 1 : 0);
      const reasons = uniqueStrings([
        canAffordPredictedSale && priceFloor !== null
          ? `Can afford likely sale at ${formatMoney(priceFloor)}.`
          : null,
        canAffordAboveRayMax && isFiniteNumber(selectedPlayer.ownerMaxBid)
          ? `Legal max is above Ray's ceiling of ${formatMoney(selectedPlayer.ownerMaxBid)}.`
          : null,
        hasStarterNeed
          ? `${selectedPosition || 'Position'} starter need remains.`
          : hasNeed
            ? `${selectedPosition || 'Position'} depth need remains.`
            : null,
        team.selectedPositionCount < team.selectedPositionStarterTarget
          ? `${team.selectedPositionCount}/${team.selectedPositionStarterTarget} ${selectedPosition || 'position'} starters filled.`
          : null,
        hasHighSpendShare && isFiniteNumber(historicalPositionSpendShare)
          ? `Historical ${selectedPosition} spend share is ${formatShare(historicalPositionSpendShare)}.`
          : null,
        averageTopPurchaseSupportsPrice
          ? `Average top purchase is ${formatMoney(averageTopPurchase)}.`
          : null,
        timingSupportsStage
          ? `Historical timing is ${timingLabel}.`
          : null,
        profile?.confidence === 'Low'
          ? 'Historical owner context is limited.'
          : null,
      ]).slice(0, 6);

      return {
        ownerId,
        ownerName:
          profile?.currentManagerName ??
          profile?.ownerName ??
          team.ownerName,
        teamName: profile?.currentTeamName ?? team.teamName,
        remainingBudget: team.remainingBudget,
        legalMaxBid: team.legalMaxBid,
        needLevel: team.needLevel,
        historicalPositionSpendShare,
        averageTopPurchase,
        timingLabel,
        threatLevel,
        reasons,
        score,
        canAffordPredictedSale,
        hasNeed,
      };
    })
    .sort((firstThreat, secondThreat) => {
      const levelDifference =
        threatLevelRank[secondThreat.threatLevel] -
        threatLevelRank[firstThreat.threatLevel];

      if (levelDifference !== 0) return levelDifference;
      if (secondThreat.score !== firstThreat.score) {
        return secondThreat.score - firstThreat.score;
      }
      if (secondThreat.legalMaxBid !== firstThreat.legalMaxBid) {
        return secondThreat.legalMaxBid - firstThreat.legalMaxBid;
      }
      return firstThreat.ownerName.localeCompare(secondThreat.ownerName);
    });
  const threats = scoredThreats.map<CompetitionThreat>((threat) => ({
    ownerId: threat.ownerId,
    ownerName: threat.ownerName,
    teamName: threat.teamName,
    remainingBudget: threat.remainingBudget,
    legalMaxBid: threat.legalMaxBid,
    needLevel: threat.needLevel,
    historicalPositionSpendShare: threat.historicalPositionSpendShare,
    averageTopPurchase: threat.averageTopPurchase,
    timingLabel: threat.timingLabel,
    threatLevel: threat.threatLevel,
    reasons: threat.reasons,
  }));
  const ownersAbleToAfford = scoredThreats.filter(
    (threat) => threat.canAffordPredictedSale
  ).length;
  const ownersNeedingPosition = scoredThreats.filter(
    (threat) => threat.hasNeed
  ).length;
  const ownersBothNeedAndAfford = scoredThreats.filter(
    (threat) => threat.canAffordPredictedSale && threat.hasNeed
  ).length;
  const highestThreat =
    threats.find((threat) => threat.threatLevel === 'high') ??
    threats.find((threat) => threat.threatLevel === 'medium') ??
    threats[0] ??
    null;
  const warnings = uniqueStrings([
    ownerProfilesLimited ? 'Historical owner context is limited.' : null,
    input.ownerProfiles.some((profile) => profile.confidence === 'Low')
      ? 'Some owner tendency profiles have limited history.'
      : null,
  ]);

  return {
    threats,
    ownersAbleToAfford,
    ownersNeedingPosition,
    ownersBothNeedAndAfford,
    highestThreat,
    summary: buildSummary(threats),
    warnings,
  };
}
