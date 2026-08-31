import type { TradeComparisonPlayer } from "./types";
import type { CurrentSeasonPlayerValue } from "./currentValue";

export type LineupImpactStatus = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
export type LineupSlot = { slot: string; playerId: string | null; playerName: string | null; value: number | null; rank: number | null };
export type LineupAllocation = { status: LineupImpactStatus; slots: LineupSlot[]; starterValue: number | null; valuedStarterCount: number; rankedStarterCount: number; starterCount: number };
export type LineupImpactResult = {
  status: LineupImpactStatus;
  before: LineupAllocation;
  after: LineupAllocation;
  starterValueDelta: number | null;
  depthByPositionBefore: Record<string, number>;
  depthByPositionAfter: Record<string, number>;
  depthDeltaByPosition: Record<string, number>;
  surplusBefore: number | null;
  surplusAfter: number | null;
  surplusDelta: number | null;
  starterRankChanges: Array<{ slot: string; beforeRank: number | null; afterRank: number | null }>;
};

type State = { mask: number; value: number; known: number; slots: LineupSlot[] };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

function eligible(player: TradeComparisonPlayer, slot: string) {
  return slot === "FLEX" ? FLEX_POSITIONS.has(player.position ?? "") : player.position === slot;
}

function allocate(players: readonly TradeComparisonPlayer[], values: ReadonlyMap<string, CurrentSeasonPlayerValue>, starterSlots: readonly string[]): LineupAllocation {
  let states = new Map<number, State>([[0, { mask: 0, value: 0, known: 0, slots: [] }]]);
  starterSlots.forEach((slot) => {
    const next = new Map<number, State>();
    states.forEach((state) => players.forEach((player, index) => {
      if (state.mask & (1 << index) || !eligible(player, slot)) return;
      const playerValue = values.get(player.playerId)?.currentValueScore;
      const playerRank = values.get(player.playerId)?.overallRank;
      const hasValue = typeof playerValue === "number" && Number.isFinite(playerValue);
      const hasRank = typeof playerRank === "number" && Number.isFinite(playerRank) && playerRank > 0;
      const value = hasValue ? playerValue : hasRank ? 100000 - playerRank : 0;
      const candidate: State = { mask: state.mask | (1 << index), value: state.value + value, known: state.known + (hasValue ? 1 : 0), slots: [...state.slots, { slot, playerId: player.playerId, playerName: player.name, value: hasValue ? playerValue : null, rank: hasRank ? playerRank : null }] };
      const prior = next.get(candidate.mask);
      if (!prior || candidate.value > prior.value || candidate.value === prior.value && candidate.known > prior.known) next.set(candidate.mask, candidate);
    }));
    states = next;
  });
  const best = [...states.values()].sort((first, second) => second.value - first.value || second.known - first.known)[0];
  if (!best) return { status: "UNAVAILABLE", slots: [], starterValue: null, valuedStarterCount: 0, rankedStarterCount: 0, starterCount: starterSlots.length };
  const ranked = best.slots.filter((slot) => slot.rank !== null).length;
  const status = best.known === starterSlots.length ? "COMPLETE" : best.known > 0 || ranked > 0 ? "PARTIAL" : "UNAVAILABLE";
  return { status, slots: best.slots, starterValue: best.known === starterSlots.length ? best.value : null, valuedStarterCount: best.known, rankedStarterCount: ranked, starterCount: starterSlots.length };
}

function depth(players: readonly TradeComparisonPlayer[]) {
  return players.reduce<Record<string, number>>((result, player) => { const position = player.position ?? "UNKNOWN"; result[position] = (result[position] ?? 0) + 1; return result; }, {});
}

export function buildLineupImpact({ beforePlayers, afterPlayers, currentValues, starterSlots }: { beforePlayers: readonly TradeComparisonPlayer[]; afterPlayers: readonly TradeComparisonPlayer[]; currentValues: ReadonlyMap<string, CurrentSeasonPlayerValue>; starterSlots: readonly string[] }): LineupImpactResult {
  const before = allocate(beforePlayers, currentValues, starterSlots);
  const after = allocate(afterPlayers, currentValues, starterSlots);
  const depthBefore = depth(beforePlayers);
  const depthAfter = depth(afterPlayers);
  const positions = new Set([...Object.keys(depthBefore), ...Object.keys(depthAfter)]);
  const depthDelta = Object.fromEntries([...positions].map((position) => [position, (depthAfter[position] ?? 0) - (depthBefore[position] ?? 0)]));
  const status = before.status === "UNAVAILABLE" || after.status === "UNAVAILABLE" ? "UNAVAILABLE" : before.status === "PARTIAL" || after.status === "PARTIAL" ? "PARTIAL" : "COMPLETE";
  return { status, before, after, starterValueDelta: before.starterValue !== null && after.starterValue !== null ? after.starterValue - before.starterValue : null, depthByPositionBefore: depthBefore, depthByPositionAfter: depthAfter, depthDeltaByPosition: depthDelta, surplusBefore: before.starterValue, surplusAfter: after.starterValue, surplusDelta: before.starterValue !== null && after.starterValue !== null ? after.starterValue - before.starterValue : null, starterRankChanges: starterSlots.map((slot, index) => ({ slot, beforeRank: before.slots[index]?.rank ?? null, afterRank: after.slots[index]?.rank ?? null })) };
}
