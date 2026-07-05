export type RosterGuidanceSeverity = "ok" | "watch" | "danger";

export interface RosterGuidancePlayer {
  id: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  cost: number | null;
  projectedValue?: number | null;
  byeWeek?: number | null;
  source: "Keeper" | "Purchase" | "Mock";
}

export interface RosterGuidancePlayerValue {
  playerName: string;
  matchedPlayerName?: string | null;
  position?: string | null;
  averageValue?: number | null;
  highValue?: number | null;
}

export interface RosterNeed {
  label: string;
  current: number;
  target: number;
  needed: number;
  detail: string;
  severity: RosterGuidanceSeverity;
}

export interface RosterGuidanceWarning {
  id: string;
  title: string;
  message: string;
  severity: Exclude<RosterGuidanceSeverity, "ok">;
}

export interface StarterPlan {
  coreStarters: Readonly<Record<string, number>>;
  flexPositions: readonly string[];
  flexSlots: number;
}

export interface MaxBidPressureState {
  remainingBudget: number | null;
  rosterSpotsRemaining: number | null;
  maxBid: number | null;
  averageDollarsPerOpenSlot: number | null;
}

export const defaultStarterPlan = {
  coreStarters: {
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    K: 1,
    DEF: 1,
  },
  flexPositions: ["RB", "WR", "TE"],
  flexSlots: 1,
} as const satisfies StarterPlan;

export const defaultBenchDepthTargets = {
  QB: 2,
  RB: 5,
  WR: 5,
  TE: 2,
  K: 1,
  DEF: 1,
} as const;

export const rosterGuidancePositionOrder = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;

function normalizeName(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[.'’]/g, "")
      .replace(/\s+/g, " ") ?? ""
  );
}

function normalizePosition(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) return "UNK";
  if (normalized === "DST" || normalized === "D/ST") return "DEF";

  return normalized;
}

function toNonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : null;
}

function toNonNegativeInteger(value: number | null | undefined) {
  const safeValue = toNonNegativeNumber(value);
  return safeValue === null ? null : Math.floor(safeValue);
}

function getNeedSeverity(needed: number): RosterGuidanceSeverity {
  if (needed <= 0) return "ok";
  if (needed === 1) return "watch";
  return "danger";
}

function getPlayerValueNames(playerValue: RosterGuidancePlayerValue) {
  return [playerValue.playerName, playerValue.matchedPlayerName]
    .map(normalizeName)
    .filter(Boolean);
}

function findMatchingPlayerValue(
  player: RosterGuidancePlayer,
  playerValues: readonly RosterGuidancePlayerValue[]
) {
  const playerName = normalizeName(player.playerName);
  const playerPosition = normalizePosition(player.position);

  return playerValues.find((playerValue) => {
    const valueNames = getPlayerValueNames(playerValue);
    const valuePosition = normalizePosition(playerValue.position);
    const positionsAreCompatible =
      playerPosition === "UNK" ||
      valuePosition === "UNK" ||
      playerPosition === valuePosition;

    return valueNames.includes(playerName) && positionsAreCompatible;
  });
}

export function calculatePositionCounts(
  players: readonly Pick<RosterGuidancePlayer, "position">[]
) {
  return players.reduce<Record<string, number>>((counts, player) => {
    const position = normalizePosition(player.position);
    counts[position] = (counts[position] ?? 0) + 1;
    return counts;
  }, {});
}

export function calculateStarterNeeds(
  positionCounts: Readonly<Record<string, number>>,
  starterPlan: StarterPlan = defaultStarterPlan
) {
  const needs = Object.entries(starterPlan.coreStarters).map(
    ([position, target]) => {
      const current = Math.max(positionCounts[normalizePosition(position)] ?? 0, 0);
      const needed = Math.max(target - current, 0);

      return {
        label: position,
        current,
        target,
        needed,
        detail: `${current}/${target} starters`,
        severity: getNeedSeverity(needed),
      } satisfies RosterNeed;
    }
  );

  const flexCurrent = starterPlan.flexPositions.reduce((sum, position) => {
    const normalizedPosition = normalizePosition(position);
    const current = Math.max(positionCounts[normalizedPosition] ?? 0, 0);
    const coreTarget = Math.max(
      starterPlan.coreStarters[normalizedPosition] ?? 0,
      0
    );

    return sum + Math.max(current - coreTarget, 0);
  }, 0);
  const flexTarget = Math.max(starterPlan.flexSlots, 0);
  const flexNeeded = Math.max(flexTarget - flexCurrent, 0);

  needs.push({
    label: "FLEX",
    current: flexCurrent,
    target: flexTarget,
    needed: flexNeeded,
    detail: starterPlan.flexPositions.join("/"),
    severity: getNeedSeverity(flexNeeded),
  });

  return needs;
}

export function calculateBenchDepthNeeds(
  positionCounts: Readonly<Record<string, number>>,
  depthTargets: Readonly<Record<string, number>> = defaultBenchDepthTargets
) {
  return Object.entries(depthTargets).map(([position, target]) => {
    const current = Math.max(positionCounts[normalizePosition(position)] ?? 0, 0);
    const safeTarget = Math.max(target, 0);
    const needed = Math.max(safeTarget - current, 0);

    return {
      label: position,
      current,
      target: safeTarget,
      needed,
      detail: `${current}/${safeTarget} total depth`,
      severity: getNeedSeverity(needed),
    } satisfies RosterNeed;
  });
}

export function calculateOverspendingWarnings(
  players: readonly RosterGuidancePlayer[],
  playerValues: readonly RosterGuidancePlayerValue[],
  warningThreshold = 8,
  dangerThreshold = 15
) {
  return players.reduce<RosterGuidanceWarning[]>((warnings, player) => {
    const cost = toNonNegativeNumber(player.cost);
    if (cost === null) return warnings;

    const matchingValue = findMatchingPlayerValue(player, playerValues);
    const averageValue = toNonNegativeNumber(matchingValue?.averageValue);
    const highValue = toNonNegativeNumber(matchingValue?.highValue);
    const benchmarkValue = averageValue ?? highValue;
    if (benchmarkValue === null) return warnings;

    const overage = cost - benchmarkValue;
    if (overage < warningThreshold) return warnings;

    warnings.push({
      id: `overspend:${player.id}`,
      title: `${player.playerName} cost check`,
      message: `$${cost} ${player.source.toLowerCase()} cost is $${overage.toFixed(1)} over the 2025 local value benchmark.`,
      severity: overage >= dangerThreshold ? "danger" : "watch",
    });

    return warnings;
  }, []);
}

export function calculateByeWeekConcentrationWarnings(
  players: readonly RosterGuidancePlayer[],
  maxPlayersPerByeWeek = 2
) {
  const playersByByeWeek = players.reduce<Map<number, RosterGuidancePlayer[]>>(
    (groups, player) => {
      const byeWeek = toNonNegativeInteger(player.byeWeek);
      if (byeWeek === null) return groups;

      const playersForWeek = groups.get(byeWeek) ?? [];
      playersForWeek.push(player);
      groups.set(byeWeek, playersForWeek);
      return groups;
    },
    new Map()
  );

  return Array.from(playersByByeWeek.entries()).reduce<RosterGuidanceWarning[]>(
    (warnings, [byeWeek, playersForWeek]) => {
      if (playersForWeek.length <= maxPlayersPerByeWeek) return warnings;

      warnings.push({
        id: `bye-week:${byeWeek}`,
        title: `Week ${byeWeek} bye concentration`,
        message: `${playersForWeek.length} rostered players share that bye: ${playersForWeek
          .map((player) => player.playerName)
          .join(", ")}.`,
        severity:
          playersForWeek.length >= maxPlayersPerByeWeek + 2 ? "danger" : "watch",
      });

      return warnings;
    },
    []
  );
}

export function calculateMaxBidPressureWarnings(
  budgetState: MaxBidPressureState,
  lowMaxBidThreshold = 25,
  lowAveragePerSlotThreshold = 4
) {
  const remainingBudget = toNonNegativeNumber(budgetState.remainingBudget);
  const rosterSpotsRemaining = toNonNegativeInteger(
    budgetState.rosterSpotsRemaining
  );
  const maxBid = toNonNegativeNumber(budgetState.maxBid);
  const averageDollarsPerOpenSlot = toNonNegativeNumber(
    budgetState.averageDollarsPerOpenSlot
  );
  const warnings: RosterGuidanceWarning[] = [];

  if (rosterSpotsRemaining === null || rosterSpotsRemaining <= 0) {
    return warnings;
  }

  if (
    remainingBudget !== null &&
    remainingBudget < Math.max(rosterSpotsRemaining, 1)
  ) {
    warnings.push({
      id: "budget:min-bid-shortfall",
      title: "Minimum bid shortfall",
      message: "Remaining budget is below the number of open roster slots.",
      severity: "danger",
    });
  }

  if (maxBid !== null && maxBid < lowMaxBidThreshold) {
    warnings.push({
      id: "budget:max-bid-pressure",
      title: "Max bid pressure",
      message: `Current calculated max bid is $${maxBid}, below the $${lowMaxBidThreshold} watch line.`,
      severity: maxBid <= Math.floor(lowMaxBidThreshold / 2) ? "danger" : "watch",
    });
  }

  if (
    averageDollarsPerOpenSlot !== null &&
    averageDollarsPerOpenSlot < lowAveragePerSlotThreshold
  ) {
    warnings.push({
      id: "budget:average-open-slot-pressure",
      title: "Open-slot budget pressure",
      message: `Average dollars per open slot is $${averageDollarsPerOpenSlot.toFixed(1)}.`,
      severity:
        averageDollarsPerOpenSlot < Math.max(lowAveragePerSlotThreshold / 2, 1)
          ? "danger"
          : "watch",
    });
  }

  return warnings;
}
