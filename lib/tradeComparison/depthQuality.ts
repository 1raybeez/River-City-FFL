import type { CurrentSeasonPlayerValue } from "./currentValue";
import type { ExpertRosEvidence } from "./recommendationEngine";
import type { LineupAllocation } from "./lineupImpact";
import type { TradeComparisonPlayer } from "./types";

export type DepthQuality = "STARTER" | "HIGH_VALUE_DEPTH" | "VIABLE_DEPTH" | "REPLACEMENT_DEPTH" | "THIN";
export type DepthQualityMap = Record<string, DepthQuality>;

function hasFreshEvidence(player: TradeComparisonPlayer, values: ReadonlyMap<string, CurrentSeasonPlayerValue>, ros: ReadonlyMap<string, ExpertRosEvidence>) {
  const current = values.get(player.playerId);
  const expert = ros.get(player.playerId);
  return Boolean(
    (expert && expert.freshness === "FRESH" && expert.confidence !== "UNAVAILABLE") ||
    (current && current.freshness === "FRESH" && current.safeAsPrimaryCurrentValue),
  );
}

function isHighValue(player: TradeComparisonPlayer, values: ReadonlyMap<string, CurrentSeasonPlayerValue>, ros: ReadonlyMap<string, ExpertRosEvidence>) {
  const expert = ros.get(player.playerId);
  const current = values.get(player.playerId);
  return Boolean(
    (expert?.freshness === "FRESH" && (expert.consensusPositionalRank !== null && expert.consensusPositionalRank <= 12 || expert.consensusOverallRank !== null && expert.consensusOverallRank <= 36)) ||
    (current?.safeAsPrimaryCurrentValue && current.positionalRank !== null && current.positionalRank <= 12),
  );
}

export function classifyDepthQuality({ players, allocation, position, values, ros }: { players: readonly TradeComparisonPlayer[]; allocation: LineupAllocation; position: string; values: ReadonlyMap<string, CurrentSeasonPlayerValue>; ros: ReadonlyMap<string, ExpertRosEvidence> }): DepthQuality {
  const starterIds = new Set(allocation.slots.filter((slot) => slot.playerId && players.find((player) => player.playerId === slot.playerId)?.position === position).map((slot) => slot.playerId as string));
  const depth = players.filter((player) => player.position === position && !starterIds.has(player.playerId));
  if (depth.length === 0) return "THIN";
  if (depth.some((player) => isHighValue(player, values, ros))) return "HIGH_VALUE_DEPTH";
  if (depth.some((player) => hasFreshEvidence(player, values, ros))) return "VIABLE_DEPTH";
  return "REPLACEMENT_DEPTH";
}

export function buildDepthQuality({ players, allocation, values, ros }: { players: readonly TradeComparisonPlayer[]; allocation: LineupAllocation; values: ReadonlyMap<string, CurrentSeasonPlayerValue>; ros: ReadonlyMap<string, ExpertRosEvidence> }): DepthQualityMap {
  return Object.fromEntries(["QB", "RB", "WR", "TE", "K", "DEF"].map((position) => [position, classifyDepthQuality({ players, allocation, position, values, ros })]));
}
