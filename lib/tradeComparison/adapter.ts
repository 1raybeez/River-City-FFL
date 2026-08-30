import type { SleeperPlayerIdentity } from "@/lib/sleeper";
import type { CurrentFranchiseRoster, PublishedAuctionValue, TradeComparisonInput, TradeComparisonPlayer, TradeComparisonPlayerContext, TradeComparisonPosition, TradeComparisonPositionCounts, TradeComparisonResult } from "./types";
import { TRADE_COMPARISON_POSITIONS } from "./types";
import { validateTradeComparisonInput } from "./validation";

export type CanonicalTradeComparisonTeam = { franchiseId: string; franchiseName: string; rosterId: number | null; avatar?: string | null };
type SleeperRosterLike = { roster_id?: number | string | null; players?: unknown; settings?: { waiver_budget_used?: unknown } };

function normalizePosition(value: string | null | undefined): TradeComparisonPosition | null {
  const position = value?.trim().toUpperCase();
  return TRADE_COMPARISON_POSITIONS.includes(position as TradeComparisonPosition) ? position as TradeComparisonPosition : null;
}
function emptyCounts(): TradeComparisonPositionCounts {
  return { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0, UNKNOWN: 0 };
}
function countPositions(players: readonly TradeComparisonPlayer[]) {
  const counts = emptyCounts();
  players.forEach((player) => { counts[player.position ?? "UNKNOWN"] += 1; });
  return counts;
}
function readPlayerIds(value: unknown) {
  return Array.isArray(value) ? value.map((playerId) => String(playerId).trim()).filter(Boolean) : [];
}

export function buildCurrentFranchiseRosters({ teams, rosters, playerDirectory, startingFaab = null }: { teams: readonly CanonicalTradeComparisonTeam[]; rosters: readonly SleeperRosterLike[]; playerDirectory: Readonly<Record<string, SleeperPlayerIdentity>>; startingFaab?: number | null }): CurrentFranchiseRoster[] {
  const rostersById = new Map(rosters.flatMap((roster) => {
    const rosterId = Number(roster.roster_id);
    return Number.isFinite(rosterId) ? [[Math.floor(rosterId), roster] as const] : [];
  }));
  return teams.map((team) => {
    const roster = team.rosterId === null ? null : rostersById.get(team.rosterId) ?? null;
    const players = readPlayerIds(roster?.players).map<TradeComparisonPlayer>((playerId) => {
      const identity = playerDirectory[playerId];
      return { playerId, name: identity?.displayName ?? null, position: normalizePosition(identity?.position), nflTeam: identity?.nflTeam ?? null, injuryStatus: identity?.injuryStatus ?? null, avatar: identity?.avatar ?? null, byeWeek: null };
    });
    const usedFaab = Number(roster?.settings?.waiver_budget_used);
    const availableFaab = roster !== null && Number.isFinite(startingFaab) && Number.isFinite(usedFaab) ? startingFaab! - usedFaab : null;
    return { franchiseId: team.franchiseId, franchiseName: team.franchiseName, rosterId: team.rosterId, avatar: team.avatar ?? null, available: roster !== null, players, availableFaab: availableFaab !== null && availableFaab >= 0 ? availableFaab : null };
  });
}

function withAuctionValue(player: TradeComparisonPlayer, values: ReadonlyMap<string, PublishedAuctionValue>): TradeComparisonPlayerContext {
  return { ...player, auctionValue: values.get(player.playerId) ?? { playerId: player.playerId, value: null, season: null, sourceLabel: null } };
}
function addPlayers(players: readonly TradeComparisonPlayer[], selected: readonly TradeComparisonPlayer[], additions: readonly TradeComparisonPlayer[]) {
  const selectedIds = new Set(selected.map((player) => player.playerId));
  return [...players.filter((player) => !selectedIds.has(player.playerId)), ...additions];
}
function packageTotal(players: readonly TradeComparisonPlayerContext[]) {
  const known = players.map((player) => player.auctionValue.value).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return known.length > 0 ? known.reduce((sum, value) => sum + value, 0) : null;
}

export function buildTradeComparison({ input, rosters, auctionValues }: { input: TradeComparisonInput; rosters: readonly CurrentFranchiseRoster[]; auctionValues: ReadonlyMap<string, PublishedAuctionValue> }): TradeComparisonResult {
  const errors = validateTradeComparisonInput(input, rosters);
  const franchiseA = rosters.find((roster) => roster.franchiseId === input.sideA.franchiseId);
  const franchiseB = rosters.find((roster) => roster.franchiseId === input.sideB.franchiseId);
  if (errors.length > 0 || !franchiseA || !franchiseB) {
    return { status: franchiseA?.available === false || franchiseB?.available === false ? "UNAVAILABLE" : "INVALID", errors, coverage: "UNAVAILABLE", auctionValueContext: { sideA: null, sideB: null, season: null, sourceLabel: null }, sides: null };
  }

  const selectedA = input.sideA.playerIds.map((playerId) => franchiseA.players.find((player) => player.playerId === playerId)!);
  const selectedB = input.sideB.playerIds.map((playerId) => franchiseB.players.find((player) => player.playerId === playerId)!);
  const playersA = selectedA.map((player) => withAuctionValue(player, auctionValues));
  const playersB = selectedB.map((player) => withAuctionValue(player, auctionValues));
  const afterA = addPlayers(franchiseA.players, selectedA, selectedB);
  const afterB = addPlayers(franchiseB.players, selectedB, selectedA);
  const values = [...playersA, ...playersB].map((player) => player.auctionValue);
  const knownValues = values.filter((value) => typeof value.value === "number" && Number.isFinite(value.value));
  const coverage = knownValues.length === 0 ? "UNAVAILABLE" : knownValues.length === values.length ? "COMPLETE" : "PARTIAL";
  const seasons = [...new Set(knownValues.map((value) => value.season).filter((season): season is number => typeof season === "number"))];
  const sources = [...new Set(knownValues.map((value) => value.sourceLabel).filter((source): source is string => Boolean(source)))];
  return {
    status: "READY",
    errors: [],
    coverage,
    auctionValueContext: { sideA: packageTotal(playersA), sideB: packageTotal(playersB), season: seasons.length === 1 ? seasons[0] : null, sourceLabel: sources.length === 1 ? sources[0] : sources.length > 1 ? "Published auction consensus" : null },
    sides: [
      { franchiseId: franchiseA.franchiseId, franchiseName: franchiseA.franchiseName, players: playersA, positionalBefore: countPositions(franchiseA.players), positionalAfter: countPositions(afterA) },
      { franchiseId: franchiseB.franchiseId, franchiseName: franchiseB.franchiseName, players: playersB, positionalBefore: countPositions(franchiseB.players), positionalAfter: countPositions(afterB) },
    ],
  };
}
