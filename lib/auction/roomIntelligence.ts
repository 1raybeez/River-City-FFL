export type RoomIntelligencePosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
export type RoomIntelligenceRunStatus = "none" | "building" | "active" | "extreme";
export type RoomIntelligenceNeedLevel = "none" | "depth" | "starter" | "urgent";
export type RoomIntelligenceScarcityLabel =
  | "plentiful"
  | "normal"
  | "thin"
  | "critical";

export type RoomIntelligencePurchase = {
  id?: string | null;
  playerName?: string | null;
  position?: string | null;
  purchasePrice?: number | null;
  teamId?: string | null;
  rosterId?: number | null;
};

export type RoomIntelligenceOwner = {
  teamId: string;
  rosterId?: number | null;
  teamName: string;
  managerName?: string | null;
  remainingBudget: number;
  legalMaxBid: number;
  rosterSpotsRemaining?: number | null;
  positionCounts: Partial<Record<RoomIntelligencePosition, number>>;
  rosterTargets: Partial<Record<RoomIntelligencePosition, number>>;
};

export type RoomIntelligencePlayer = {
  playerId?: string | null;
  playerName: string;
  position?: string | null;
  averageValue?: number | null;
  marketValue?: number | null;
  isAvailable?: boolean | null;
};

export type RoomIntelligenceSelectedPlayer = {
  playerName: string;
  position?: string | null;
  marketValue: number;
  predictedWinningBid: number;
  ownerMaxBid: number;
  currentBid?: number | null;
};

export type RoomIntelligenceMarketContextInput = {
  position?: string | null;
  inflationPercent?: number | null;
  heatLabel?: string | null;
};

export type RoomIntelligenceInput = {
  purchases: readonly RoomIntelligencePurchase[];
  owners: readonly RoomIntelligenceOwner[];
  selectedPlayer: RoomIntelligenceSelectedPlayer;
  remainingPlayers: readonly RoomIntelligencePlayer[];
  marketContext?: RoomIntelligenceMarketContextInput | null;
  usefulValueThreshold?: number | null;
};

export type RoomIntelligencePositionRun = {
  position: RoomIntelligencePosition;
  last5: number;
  last10: number;
  last20: number;
  consecutive: number;
  overallSoldCount: number;
  status: RoomIntelligenceRunStatus;
  summary: string;
};

export type RoomIntelligenceOwnerNeed = {
  teamId: string;
  rosterId: number | null;
  teamName: string;
  managerName: string | null;
  remainingBudget: number;
  legalMaxBid: number;
  currentCount: number;
  targetCount: number;
  needLevel: RoomIntelligenceNeedLevel;
};

export type RoomIntelligenceAffordability = {
  canAffordCurrentBidCount: number;
  canAffordPredictedBidCount: number;
  canAffordOwnerMaxCount: number;
  canAffordPredictedBidOwners: RoomIntelligenceOwnerNeed[];
  highestRemainingBudgetOwner: RoomIntelligenceOwnerNeed | null;
  highestLegalMaxBidOwner: RoomIntelligenceOwnerNeed | null;
};

export type RoomIntelligenceScarcity = {
  totalAvailablePlayersRemaining: number;
  meaningfulPlayersRemaining: number;
  strongPlayersRemaining: number;
  selectedPlayerRank: number | null;
  label: RoomIntelligenceScarcityLabel;
  summary: string;
};

export type RoomIntelligenceMarketContext = {
  inflationPercent: number | null;
  heatLabel: string;
  positionRunStatus: RoomIntelligenceRunStatus;
  summary: string;
};

export type RoomIntelligenceResult = {
  positionRun: RoomIntelligencePositionRun;
  ownersNeedingPosition: RoomIntelligenceOwnerNeed[];
  affordability: RoomIntelligenceAffordability;
  scarcity: RoomIntelligenceScarcity;
  marketContext: RoomIntelligenceMarketContext;
  reasons: string[];
  warnings: string[];
};

const roomIntelligencePositions: RoomIntelligencePosition[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
];

function toNonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : null;
}

function normalizePosition(
  position: string | null | undefined
): RoomIntelligencePosition | null {
  const normalizedPosition = position?.trim().toUpperCase();
  const safePosition =
    normalizedPosition === "DST" || normalizedPosition === "D/ST"
      ? "DEF"
      : normalizedPosition;

  return roomIntelligencePositions.includes(
    safePosition as RoomIntelligencePosition
  )
    ? (safePosition as RoomIntelligencePosition)
    : null;
}

function formatMoney(value: number) {
  return `$${Math.round(value)}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
}

function countRecentPositionSales(
  purchases: readonly RoomIntelligencePurchase[],
  position: RoomIntelligencePosition,
  limit: number
) {
  return purchases
    .slice(-limit)
    .filter((purchase) => normalizePosition(purchase.position) === position)
    .length;
}

function countConsecutivePositionSales(
  purchases: readonly RoomIntelligencePurchase[],
  position: RoomIntelligencePosition
) {
  let count = 0;

  for (let index = purchases.length - 1; index >= 0; index -= 1) {
    if (normalizePosition(purchases[index].position) !== position) break;
    count += 1;
  }

  return count;
}

function getRunStatus({
  position,
  last5,
  last10,
}: {
  position: RoomIntelligencePosition;
  last5: number;
  last10: number;
}): RoomIntelligenceRunStatus {
  const isSpecialist = position === "K" || position === "DEF";

  if (isSpecialist) {
    if (last5 >= 5 || last10 >= 7) return "extreme";
    if (last5 >= 4 || last10 >= 5) return "active";
    if (last5 >= 3) return "building";
    return "none";
  }

  if (last5 >= 4 || last10 >= 6) return "extreme";
  if (last5 >= 3 || last10 >= 4) return "active";
  if (last5 >= 2) return "building";
  return "none";
}

export function calculatePositionRun(
  purchases: readonly RoomIntelligencePurchase[],
  position: RoomIntelligencePosition
): RoomIntelligencePositionRun {
  const last5 = countRecentPositionSales(purchases, position, 5);
  const last10 = countRecentPositionSales(purchases, position, 10);
  const last20 = countRecentPositionSales(purchases, position, 20);
  const consecutive = countConsecutivePositionSales(purchases, position);
  const overallSoldCount = purchases.filter(
    (purchase) => normalizePosition(purchase.position) === position
  ).length;
  const status = getRunStatus({ position, last5, last10 });

  return {
    position,
    last5,
    last10,
    last20,
    consecutive,
    overallSoldCount,
    status,
    summary:
      status === "none"
        ? `${position} run is quiet.`
        : `${position} run is ${status}: ${last5} of last 5, ${last10} of last 10.`,
  };
}

function getOwnerNeedLevel({
  position,
  currentCount,
  targetCount,
  rosterSpotsRemaining,
}: {
  position: RoomIntelligencePosition;
  currentCount: number;
  targetCount: number;
  rosterSpotsRemaining: number | null;
}): RoomIntelligenceNeedLevel {
  const missingStarterCount = Math.max(0, targetCount - currentCount);

  if (missingStarterCount >= 2) return "urgent";
  if (missingStarterCount === 1) return "starter";
  if (
    position !== "K" &&
    position !== "DEF" &&
    targetCount > 0 &&
    rosterSpotsRemaining !== null &&
    rosterSpotsRemaining > 0
  ) {
    return "depth";
  }

  return "none";
}

function buildOwnerNeed(
  owner: RoomIntelligenceOwner,
  position: RoomIntelligencePosition
): RoomIntelligenceOwnerNeed {
  const currentCount = owner.positionCounts[position] ?? 0;
  const targetCount = owner.rosterTargets[position] ?? 0;
  const rosterSpotsRemaining = toNonNegativeNumber(owner.rosterSpotsRemaining);

  return {
    teamId: owner.teamId,
    rosterId: owner.rosterId ?? null,
    teamName: owner.teamName,
    managerName: owner.managerName ?? null,
    remainingBudget: owner.remainingBudget,
    legalMaxBid: owner.legalMaxBid,
    currentCount,
    targetCount,
    needLevel: getOwnerNeedLevel({
      position,
      currentCount,
      targetCount,
      rosterSpotsRemaining,
    }),
  };
}

function calculateOwnerNeeds(
  owners: readonly RoomIntelligenceOwner[],
  position: RoomIntelligencePosition
) {
  return owners
    .map((owner) => buildOwnerNeed(owner, position))
    .filter((owner) => owner.needLevel !== "none")
    .sort((firstOwner, secondOwner) => {
      const priority: Record<RoomIntelligenceNeedLevel, number> = {
        urgent: 3,
        starter: 2,
        depth: 1,
        none: 0,
      };

      return (
        priority[secondOwner.needLevel] - priority[firstOwner.needLevel] ||
        secondOwner.legalMaxBid - firstOwner.legalMaxBid ||
        firstOwner.teamName.localeCompare(secondOwner.teamName)
      );
    });
}

function calculateAffordability({
  position,
  owners,
  ownerNeeds,
  currentBid,
  predictedWinningBid,
  ownerMaxBid,
}: {
  position: RoomIntelligencePosition;
  owners: readonly RoomIntelligenceOwner[];
  ownerNeeds: readonly RoomIntelligenceOwnerNeed[];
  currentBid: number | null;
  predictedWinningBid: number;
  ownerMaxBid: number;
}): RoomIntelligenceAffordability {
  const ownerNeedByTeamId = new Map(
    ownerNeeds.map((ownerNeed) => [ownerNeed.teamId, ownerNeed])
  );
  const allOwnerNeeds = owners.map((owner) => {
    return ownerNeedByTeamId.get(owner.teamId) ?? buildOwnerNeed(owner, position);
  });
  const canAfford = (amount: number) =>
    allOwnerNeeds.filter((owner) => owner.legalMaxBid >= amount);
  const canAffordCurrentBidOwners =
    currentBid === null ? [] : canAfford(currentBid);
  const canAffordPredictedBidOwners = canAfford(predictedWinningBid);
  const canAffordOwnerMaxOwners = canAfford(ownerMaxBid);
  const highestRemainingBudgetOwner =
    [...allOwnerNeeds].sort(
      (firstOwner, secondOwner) =>
        secondOwner.remainingBudget - firstOwner.remainingBudget
    )[0] ?? null;
  const highestLegalMaxBidOwner =
    [...allOwnerNeeds].sort(
      (firstOwner, secondOwner) =>
        secondOwner.legalMaxBid - firstOwner.legalMaxBid
    )[0] ?? null;

  return {
    canAffordCurrentBidCount: canAffordCurrentBidOwners.length,
    canAffordPredictedBidCount: canAffordPredictedBidOwners.length,
    canAffordOwnerMaxCount: canAffordOwnerMaxOwners.length,
    canAffordPredictedBidOwners,
    highestRemainingBudgetOwner,
    highestLegalMaxBidOwner,
  };
}

function getPlayerValue(player: RoomIntelligencePlayer) {
  return (
    toNonNegativeNumber(player.marketValue) ??
    toNonNegativeNumber(player.averageValue) ??
    0
  );
}

function calculateScarcity({
  position,
  selectedPlayer,
  remainingPlayers,
  ownersNeedingPosition,
  usefulValueThreshold,
}: {
  position: RoomIntelligencePosition;
  selectedPlayer: RoomIntelligenceSelectedPlayer;
  remainingPlayers: readonly RoomIntelligencePlayer[];
  ownersNeedingPosition: readonly RoomIntelligenceOwnerNeed[];
  usefulValueThreshold: number;
}): RoomIntelligenceScarcity {
  const availablePositionPlayers = remainingPlayers
    .filter((player) => player.isAvailable !== false)
    .filter((player) => normalizePosition(player.position) === position)
    .map((player) => ({
      ...player,
      roomValue: getPlayerValue(player),
    }))
    .sort((firstPlayer, secondPlayer) => {
      if (secondPlayer.roomValue !== firstPlayer.roomValue) {
        return secondPlayer.roomValue - firstPlayer.roomValue;
      }

      return firstPlayer.playerName.localeCompare(secondPlayer.playerName);
    });
  const meaningfulPlayers = availablePositionPlayers.filter(
    (player) => player.roomValue >= usefulValueThreshold
  );
  const strongValueThreshold = Math.max(
    usefulValueThreshold,
    selectedPlayer.marketValue * 0.85
  );
  const strongPlayers = availablePositionPlayers.filter(
    (player) => player.roomValue >= strongValueThreshold
  );
  const selectedPlayerRankIndex = availablePositionPlayers.findIndex(
    (player) => player.playerName === selectedPlayer.playerName
  );
  const starterNeedCount = ownersNeedingPosition.filter(
    (owner) => owner.needLevel === "starter" || owner.needLevel === "urgent"
  ).length;
  const label =
    strongPlayers.length <= 1 || meaningfulPlayers.length <= starterNeedCount
      ? "critical"
      : strongPlayers.length <= 2 ||
          meaningfulPlayers.length <= starterNeedCount + 2
        ? "thin"
        : meaningfulPlayers.length >= starterNeedCount + 6
          ? "plentiful"
          : "normal";

  return {
    totalAvailablePlayersRemaining: availablePositionPlayers.length,
    meaningfulPlayersRemaining: meaningfulPlayers.length,
    strongPlayersRemaining: strongPlayers.length,
    selectedPlayerRank:
      selectedPlayerRankIndex === -1 ? null : selectedPlayerRankIndex + 1,
    label,
    summary: `${label.toUpperCase()} · ${strongPlayers.length} strong ${position}s remain`,
  };
}

function calculateMarketContext({
  position,
  marketContext,
  positionRun,
  ownersNeedingPosition,
  scarcity,
}: {
  position: RoomIntelligencePosition;
  marketContext: RoomIntelligenceMarketContextInput | null | undefined;
  positionRun: RoomIntelligencePositionRun;
  ownersNeedingPosition: readonly RoomIntelligenceOwnerNeed[];
  scarcity: RoomIntelligenceScarcity;
}): RoomIntelligenceMarketContext {
  const inflationPercent = toNonNegativeNumber(
    Math.abs(marketContext?.inflationPercent ?? 0)
  )
    ? marketContext?.inflationPercent ?? null
    : marketContext?.inflationPercent ?? null;
  const heatLabel = marketContext?.heatLabel ?? "Normal";
  const starterNeedCount = ownersNeedingPosition.filter(
    (owner) => owner.needLevel === "starter" || owner.needLevel === "urgent"
  ).length;

  return {
    inflationPercent,
    heatLabel,
    positionRunStatus: positionRun.status,
    summary:
      positionRun.status === "none"
        ? `${position} market is ${heatLabel.toLowerCase()} with ${scarcity.label} inventory.`
        : `${position} market is ${heatLabel.toLowerCase()} and a ${position} run is ${positionRun.status}; ${starterNeedCount} owners need starters.`,
  };
}

function compactList(values: string[], limit: number) {
  return values.filter(Boolean).slice(0, limit);
}

export function calculateRoomIntelligence(
  input: RoomIntelligenceInput
): RoomIntelligenceResult | null {
  const position = normalizePosition(input.selectedPlayer.position);
  if (position === null) return null;

  const purchases = input.purchases.filter(
    (purchase) => normalizePosition(purchase.position) !== null
  );
  const positionRun = calculatePositionRun(purchases, position);
  const ownersNeedingPosition = calculateOwnerNeeds(input.owners, position);
  const currentBid = toNonNegativeNumber(input.selectedPlayer.currentBid);
  const affordability = calculateAffordability({
    position,
    owners: input.owners,
    ownerNeeds: ownersNeedingPosition,
    currentBid,
    predictedWinningBid: input.selectedPlayer.predictedWinningBid,
    ownerMaxBid: input.selectedPlayer.ownerMaxBid,
  });
  const usefulValueThreshold =
    toNonNegativeNumber(input.usefulValueThreshold) ??
    (position === "K" || position === "DEF"
      ? 1
      : Math.max(5, input.selectedPlayer.marketValue * 0.35));
  const scarcity = calculateScarcity({
    position,
    selectedPlayer: input.selectedPlayer,
    remainingPlayers: input.remainingPlayers,
    ownersNeedingPosition,
    usefulValueThreshold,
  });
  const marketContext = calculateMarketContext({
    position,
    marketContext: input.marketContext,
    positionRun,
    ownersNeedingPosition,
    scarcity,
  });
  const starterNeedCount = ownersNeedingPosition.filter(
    (owner) => owner.needLevel === "starter" || owner.needLevel === "urgent"
  ).length;
  const ownersAboveRayMax = input.owners.filter(
    (owner) => owner.legalMaxBid > input.selectedPlayer.ownerMaxBid
  ).length;
  const inflationPercent = marketContext.inflationPercent ?? 0;

  return {
    positionRun,
    ownersNeedingPosition,
    affordability,
    scarcity,
    marketContext,
    reasons: compactList(
      [
        `${starterNeedCount} owners still need a ${position} starter.`,
        `${affordability.canAffordPredictedBidCount} owners can afford the predicted ${formatMoney(input.selectedPlayer.predictedWinningBid)} sale.`,
        `${scarcity.strongPlayersRemaining} strong ${position}s remain.`,
        positionRun.status === "none"
          ? ""
          : `${position} run is ${positionRun.status}: ${positionRun.last10} of last 10 sales.`,
      ],
      4
    ),
    warnings: compactList(
      [
        ownersAboveRayMax >= 2
          ? `${ownersAboveRayMax} owners have higher legal max bids than Ray.`
          : "",
        Math.abs(inflationPercent) >= 10
          ? `${position} market is ${formatPercent(inflationPercent)} vs expected.`
          : "",
        scarcity.label === "critical"
          ? "This is the last player in the current value tier."
          : "",
      ],
      3
    ),
  };
}
