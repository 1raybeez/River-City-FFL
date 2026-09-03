import type { TradeComparisonPlayer } from "./types";
import type { CurrentSeasonPlayerValue } from "./currentValue";

export type LineupImpactStatus = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
export type LineupSelectionEvidence = "CURRENT_VALUE" | "ROS_RANK" | "FALLBACK_RANK" | "OVERALL_RANK" | "UNKNOWN";
export type LineupSlot = { slot: string; playerId: string | null; playerName: string | null; value: number | null; rank: number | null; selectionEvidence: LineupSelectionEvidence };
export type LineupAllocation = { status: LineupImpactStatus; slots: LineupSlot[]; starterValue: number | null; valuedStarterCount: number; rankedStarterCount: number; starterCount: number };
export type StartingUnitPlayer = { playerId: string; playerName: string | null };
export type StartingUnitSlotMove = StartingUnitPlayer & { beforeSlot: string; afterSlot: string };
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
  startingUnitAdded: StartingUnitPlayer[];
  startingUnitRemoved: StartingUnitPlayer[];
  slotOnlyMoves: StartingUnitSlotMove[];
};

type EvidenceKind = "CURRENT_VALUE" | "ROS_RANK" | "FALLBACK_RANK" | "UNKNOWN";
type CandidateEvidence = { kind: EvidenceKind; value: number | null; rank: number | null; playerId: string | null };
type State = { mask: number; currentValueTotal: number; known: number; slots: LineupSlot[]; evidence: CandidateEvidence[] };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);

function eligible(player: TradeComparisonPlayer, slot: string) {
  return slot === "FLEX" ? FLEX_POSITIONS.has(player.position ?? "") : player.position === slot;
}

function evidenceFor(value: CurrentSeasonPlayerValue | undefined, playerId: string): CandidateEvidence {
  const currentValue = value?.currentValueScore;
  const rank = value?.overallRank;
  const hasValue = typeof currentValue === "number" && Number.isFinite(currentValue) && !value?.contextOnly;
  const hasRank = typeof rank === "number" && Number.isFinite(rank) && rank > 0;
  if (hasValue) return { kind: "CURRENT_VALUE", value: currentValue, rank: hasRank ? rank : null, playerId };
  if (!hasRank) return { kind: "UNKNOWN", value: null, rank: null, playerId };
  if (value?.mode === "REST_OF_SEASON") return { kind: "ROS_RANK", value: null, rank, playerId };
  if (value?.mode === "FALLBACK") return { kind: "FALLBACK_RANK", value: null, rank, playerId };
  return { kind: "ROS_RANK", value: null, rank, playerId };
}

function compareCandidates(first: CandidateEvidence, second: CandidateEvidence) {
  if (first.kind === "CURRENT_VALUE" && second.kind === "CURRENT_VALUE") {
    const valueDifference = (first.value as number) - (second.value as number);
    if (valueDifference !== 0) return valueDifference;
    if (first.rank === null || second.rank === null) return first.rank === second.rank ? 0 : first.rank === null ? -1 : 1;
    return second.rank - first.rank;
  }
  if (first.kind === "ROS_RANK" && second.kind === "ROS_RANK") return (second.rank as number) - (first.rank as number);
  if (first.kind === "FALLBACK_RANK" && second.kind === "FALLBACK_RANK") return (second.rank as number) - (first.rank as number);
  if ((first.kind === "CURRENT_VALUE" && second.kind === "ROS_RANK") || (first.kind === "ROS_RANK" && second.kind === "CURRENT_VALUE")) {
    if (first.rank !== null && second.rank !== null && first.rank !== second.rank) return second.rank - first.rank;
    return first.kind === "CURRENT_VALUE" ? 1 : -1;
  }
  const priority: Record<EvidenceKind, number> = { CURRENT_VALUE: 3, ROS_RANK: 2, FALLBACK_RANK: 1, UNKNOWN: 0 };
  return priority[first.kind] - priority[second.kind];
}

function compareStates(first: State, second: State) {
  const firstEvidence = [...first.evidence].sort((a, b) => compareCandidates(a, b) > 0 ? -1 : compareCandidates(a, b) < 0 ? 1 : 0);
  const secondEvidence = [...second.evidence].sort((a, b) => compareCandidates(a, b) > 0 ? -1 : compareCandidates(a, b) < 0 ? 1 : 0);
  for (let index = 0; index < Math.max(firstEvidence.length, secondEvidence.length); index += 1) {
    const result = compareCandidates(firstEvidence[index] ?? { kind: "UNKNOWN", value: null, rank: null, playerId: null }, secondEvidence[index] ?? { kind: "UNKNOWN", value: null, rank: null, playerId: null });
    if (result !== 0) return result;
  }
  return second.known - first.known || second.currentValueTotal - first.currentValueTotal || [...second.slots].map((slot) => slot.playerId ?? "").join("|").localeCompare([...first.slots].map((slot) => slot.playerId ?? "").join("|"));
}

function allocate(players: readonly TradeComparisonPlayer[], values: ReadonlyMap<string, CurrentSeasonPlayerValue>, starterSlots: readonly string[]): LineupAllocation {
  let states = new Map<number, State>([[0, { mask: 0, currentValueTotal: 0, known: 0, slots: [], evidence: [] }]]);
  starterSlots.forEach((slot) => {
    const next = new Map<number, State>();
    states.forEach((state) => {
      const emptyState = { ...state, slots: [...state.slots, { slot, playerId: null, playerName: null, value: null, rank: null, selectionEvidence: "UNKNOWN" as const }], evidence: [...state.evidence, { kind: "UNKNOWN" as const, value: null, rank: null, playerId: null }] };
      const priorEmpty = next.get(state.mask);
      if (!priorEmpty || compareStates(emptyState, priorEmpty) > 0) next.set(state.mask, emptyState);
      players.forEach((player, index) => {
      if (state.mask & (1 << index) || !eligible(player, slot)) return;
      const playerEvidence = evidenceFor(values.get(player.playerId), player.playerId);
      const hasValue = playerEvidence.kind === "CURRENT_VALUE";
      const candidate: State = { mask: state.mask | (1 << index), currentValueTotal: state.currentValueTotal + (playerEvidence.value ?? 0), known: state.known + (hasValue ? 1 : 0), evidence: [...state.evidence, playerEvidence], slots: [...state.slots, { slot, playerId: player.playerId, playerName: player.name, value: hasValue ? playerEvidence.value : null, rank: playerEvidence.rank, selectionEvidence: playerEvidence.kind === "CURRENT_VALUE" ? "CURRENT_VALUE" : playerEvidence.kind === "ROS_RANK" ? "ROS_RANK" : playerEvidence.kind === "FALLBACK_RANK" ? "FALLBACK_RANK" : "UNKNOWN" }] };
      const prior = next.get(candidate.mask);
      if (!prior || compareStates(candidate, prior) > 0) next.set(candidate.mask, candidate);
      });
    });
    states = next;
  });
  const best = [...states.values()].reduce((bestState, state) => compareStates(state, bestState) > 0 ? state : bestState);
  if (!best) return { status: "UNAVAILABLE", slots: [], starterValue: null, valuedStarterCount: 0, rankedStarterCount: 0, starterCount: starterSlots.length };
  const ranked = best.slots.filter((slot) => slot.rank !== null).length;
  const status = best.known === starterSlots.length ? "COMPLETE" : best.known > 0 || ranked > 0 ? "PARTIAL" : "UNAVAILABLE";
  return { status, slots: best.slots, starterValue: best.known === starterSlots.length ? best.currentValueTotal : null, valuedStarterCount: best.known, rankedStarterCount: ranked, starterCount: starterSlots.length };
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
  const beforeById = new Map(before.slots.flatMap((slot) => slot.playerId ? [[slot.playerId, slot] as const] : []));
  const afterById = new Map(after.slots.flatMap((slot) => slot.playerId ? [[slot.playerId, slot] as const] : []));
  const playerName = (id: string) => beforeById.get(id)?.playerName ?? afterById.get(id)?.playerName ?? null;
  const startingUnitAdded = [...afterById.keys()].filter((id) => !beforeById.has(id)).map((playerId) => ({ playerId, playerName: playerName(playerId) }));
  const startingUnitRemoved = [...beforeById.keys()].filter((id) => !afterById.has(id)).map((playerId) => ({ playerId, playerName: playerName(playerId) }));
  const slotOnlyMoves = [...beforeById.keys()].filter((id) => afterById.has(id) && beforeById.get(id)?.slot !== afterById.get(id)?.slot).map((playerId) => ({ playerId, playerName: playerName(playerId), beforeSlot: beforeById.get(playerId)?.slot as string, afterSlot: afterById.get(playerId)?.slot as string }));
  return { status, before, after, starterValueDelta: before.starterValue !== null && after.starterValue !== null ? after.starterValue - before.starterValue : null, depthByPositionBefore: depthBefore, depthByPositionAfter: depthAfter, depthDeltaByPosition: depthDelta, surplusBefore: before.starterValue, surplusAfter: after.starterValue, surplusDelta: before.starterValue !== null && after.starterValue !== null ? after.starterValue - before.starterValue : null, starterRankChanges: starterSlots.map((slot, index) => ({ slot, beforeRank: before.slots[index]?.rank ?? null, afterRank: after.slots[index]?.rank ?? null })), startingUnitAdded, startingUnitRemoved, slotOnlyMoves };
}
