import "server-only";
import { getLeagueRosters, getLeagueUsers, getSleeperPlayerIdentityDirectory } from "@/lib/sleeper";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import { readPublishedAdpConsensusFromFirestore } from "@/lib/auction/adpRefreshService";
import { buildCurrentFranchiseRosters, buildTradeComparison, type CanonicalTradeComparisonTeam } from "./adapter";
import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";
import type { PublishedAuctionValue, TradeComparisonInput } from "./types";
import type { MultiTeamMarketEntry } from "./multiTeamTypes";

export async function loadTradeComparisonContext() {
  const [rosters, users, playerDirectory, publishedValues, publishedAdp, identities] = await Promise.all([getLeagueRosters(), getLeagueUsers(), getSleeperPlayerIdentityDirectory(), readPublishedMasterviewFromFirestore().catch(() => null), readPublishedAdpConsensusFromFirestore(2026).catch(() => null), getCurrentSeasonTeamIdentityMap()]);
  const avatarsByUserId = new Map(users.map((user: { user_id?: string; avatar?: string | null }) => [user.user_id, user.avatar ?? null] as const));
  const teams: CanonicalTradeComparisonTeam[] = canonicalAuctionTeams.map((team) => ({ franchiseId: team.franchiseId, franchiseName: identities.get(team.franchiseId)?.currentTeamName ?? team.teamName, rosterId: team.rosterId, avatar: identities.get(team.franchiseId)?.avatar ?? avatarsByUserId.get(team.managerId) ?? null }));
  const currentRosters = buildCurrentFranchiseRosters({ teams, rosters, playerDirectory });
  const auctionValues = new Map<string, PublishedAuctionValue>();
  publishedValues?.rows.forEach((row) => {
    if (!row.sleeperPlayerId) return;
    auctionValues.set(row.sleeperPlayerId, { playerId: row.sleeperPlayerId, value: Number.isFinite(row.averageValue) ? row.averageValue : null, season: row.season, sourceLabel: "Published auction consensus", sourceCount: row.sourceCount ?? 0 });
  });
  const marketByPlayer = new Map<string, MultiTeamMarketEntry>();
  auctionValues.forEach((value, playerId) => marketByPlayer.set(playerId, { ...value, averageAdp: null, adpSourceCount: 0 }));
  publishedAdp?.rows.forEach((row) => {
    const current = marketByPlayer.get(row.playerId);
    marketByPlayer.set(row.playerId, { playerId: row.playerId, value: current?.value ?? null, sourceCount: current?.sourceCount ?? 0, season: current?.season ?? 2026, sourceLabel: current?.sourceLabel ?? null, averageAdp: Number.isFinite(row.medianOverallAdp) ? row.medianOverallAdp : null, adpSourceCount: row.sourceCount ?? 0 });
  });
  const multiTeamPlayerDirectory = new Map(Object.values(playerDirectory).map((player) => [player.playerId, { playerId: player.playerId, name: player.displayName, position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | null, nflTeam: player.nflTeam, injuryStatus: player.injuryStatus ?? null, avatar: player.avatar ?? null, byeWeek: null }] as const));
  return { rosters: currentRosters, playerDirectory, multiTeamPlayerDirectory, auctionValues, marketByPlayer };
}

export async function buildServerTradeComparison(input: TradeComparisonInput, context = null) {
  return buildTradeComparison({ input, ...(context ?? await loadTradeComparisonContext()) });
}
