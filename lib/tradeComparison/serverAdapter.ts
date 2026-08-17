import "server-only";
import { getLeagueRosters, getSleeperPlayerIdentityDirectory } from "@/lib/sleeper";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import { buildCurrentFranchiseRosters, buildTradeComparison, type CanonicalTradeComparisonTeam } from "./adapter";
import type { PublishedAuctionValue, TradeComparisonInput } from "./types";

export async function loadTradeComparisonContext() {
  const [rosters, playerDirectory, publishedValues] = await Promise.all([getLeagueRosters(), getSleeperPlayerIdentityDirectory(), readPublishedMasterviewFromFirestore().catch(() => null)]);
  const teams: CanonicalTradeComparisonTeam[] = canonicalAuctionTeams.map((team) => ({ franchiseId: team.franchiseId, franchiseName: team.teamName, rosterId: team.rosterId }));
  const currentRosters = buildCurrentFranchiseRosters({ teams, rosters, playerDirectory });
  const auctionValues = new Map<string, PublishedAuctionValue>();
  publishedValues?.rows.forEach((row) => {
    if (!row.sleeperPlayerId) return;
    auctionValues.set(row.sleeperPlayerId, { playerId: row.sleeperPlayerId, value: Number.isFinite(row.averageValue) ? row.averageValue : null, season: row.season, sourceLabel: "Published auction consensus" });
  });
  return { rosters: currentRosters, auctionValues };
}

export async function buildServerTradeComparison(input: TradeComparisonInput) {
  return buildTradeComparison({ input, ...(await loadTradeComparisonContext()) });
}
