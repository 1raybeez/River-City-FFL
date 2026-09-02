import "server-only";
import { getLeagueInfo, getLeagueRosters, getLeagueUsers, getNFLState, getSleeperAuctionDraftSnapshot, getSleeperPlayerIdentityDirectory, getTransactions, type Transaction } from "@/lib/sleeper";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import { readPublishedAdpConsensusFromFirestore } from "@/lib/auction/adpRefreshService";
import { buildCurrentFranchiseRosters, buildTradeComparison, type CanonicalTradeComparisonTeam } from "./adapter";
import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";
import type { PublishedAuctionValue, TradeComparisonInput } from "./types";
import type { MultiTeamMarketEntry } from "./multiTeamTypes";
import { buildAcquisitionSnapshot, type AcquisitionSnapshotRecord } from "./fairness/acquisitionSnapshot";
import { resolveCurrentSeasonPlayerValue, type CurrentSeasonPlayerValue } from "./currentValue";
import { readPublishedRosArtifact } from "./rosArtifact";
import { readPublishedFantasyCalcArtifact } from "./fantasyCalcArtifact";

function seasonMode(week: number | null, draftStatus: string) {
  if (draftStatus !== "complete" || week === null || week < 1) return "PRESEASON" as const;
  if (week <= 4) return "EARLY_SEASON" as const;
  if (week <= 10) return "MID_SEASON" as const;
  return "LATE_SEASON" as const;
}

export async function loadTradeComparisonContext(options: { includeAcquisitionSnapshot?: boolean } = {}) {
  const [league, rosters, users, playerDirectory, publishedValues, publishedAdp, identities, auctionSnapshot, transactions, nflState, rosArtifact, fantasyCalcByPlayer] = await Promise.all([
    getLeagueInfo(),
    getLeagueRosters(),
    getLeagueUsers(),
    getSleeperPlayerIdentityDirectory(),
    readPublishedMasterviewFromFirestore().catch(() => null),
    readPublishedAdpConsensusFromFirestore(2026).catch(() => null),
    getCurrentSeasonTeamIdentityMap(),
    options.includeAcquisitionSnapshot ? getSleeperAuctionDraftSnapshot(2026) : Promise.resolve(null),
    options.includeAcquisitionSnapshot
      ? Promise.all(Array.from({ length: 18 }, (_, index) => getTransactions(index + 1, "1312149033254416384"))).then((rows) => rows.flat() as Transaction[])
      : Promise.resolve([] as Transaction[]),
    getNFLState(),
    readPublishedRosArtifact(),
    Promise.resolve(readPublishedFantasyCalcArtifact().rows),
  ]);
  const avatarsByUserId = new Map(users.map((user: { user_id?: string; avatar?: string | null }) => [user.user_id, user.avatar ?? null] as const));
  const teams: CanonicalTradeComparisonTeam[] = canonicalAuctionTeams.map((team) => ({ franchiseId: team.franchiseId, franchiseName: identities.get(team.franchiseId)?.currentTeamName ?? team.teamName, rosterId: team.rosterId, avatar: identities.get(team.franchiseId)?.avatar ?? avatarsByUserId.get(team.managerId) ?? null }));
  const startingFaab = Number(league.settings?.waiver_budget);
  const currentRosters = buildCurrentFranchiseRosters({ teams, rosters, playerDirectory, startingFaab: Number.isFinite(startingFaab) ? startingFaab : null });
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
  fantasyCalcByPlayer.forEach((row, playerId) => marketByPlayer.set(playerId, { playerId, value: row.rawSourceValue, sourceCount: 1, season: 2026, sourceLabel: "FantasyCalc REDRAFT", averageAdp: null, adpSourceCount: 0, overallRank: row.fantasycalcOverallRank, positionalRank: row.fantasycalcPositionRank, trend30Day: row.fantasycalcTrend30Day, generatedAt: row.generatedAt }));
  const multiTeamPlayerDirectory = new Map(Object.values(playerDirectory).map((player) => [player.playerId, { playerId: player.playerId, name: player.displayName, position: player.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF" | null, nflTeam: player.nflTeam, injuryStatus: player.injuryStatus ?? null, avatar: player.avatar ?? null, byeWeek: null }] as const));
  const adpByPlayer = new Map((publishedAdp?.rows ?? []).map((row) => [row.playerId, row] as const));
  const currentValueByPlayer = new Map<string, CurrentSeasonPlayerValue>();
  multiTeamPlayerDirectory.forEach((player, playerId) => {
    const adp = adpByPlayer.get(playerId);
    const fantasyCalc = fantasyCalcByPlayer.get(playerId);
    currentValueByPlayer.set(playerId, resolveCurrentSeasonPlayerValue({
      playerId,
      playerName: player.name ?? playerId,
      position: player.position ?? "UNKNOWN",
      nflTeam: player.nflTeam,
      sources: fantasyCalc ? [{ source: "FantasyCalc REDRAFT", mode: "REDRAFT", overallRank: fantasyCalc.fantasycalcOverallRank, positionalRank: fantasyCalc.fantasycalcPositionRank, value: fantasyCalc.rawSourceValue, generatedAt: fantasyCalc.generatedAt, sourceCount: 1, confidence: "MEDIUM" }] : adp ? [{ source: "River City ADP consensus", mode: "FALLBACK", overallRank: adp.medianOverallAdp, positionalRank: adp.consensusPositionAdp, generatedAt: publishedAdp?.generatedAt ?? null, sourceCount: adp.sourceCount, confidence: adp.confidence, allowAsFallback: true }] : [],
    }));
  });
  const rosterPositions = (league as unknown as { roster_positions?: unknown }).roster_positions;
  const starterSlots = Array.isArray(rosterPositions)
    ? rosterPositions.filter((slot): slot is string => typeof slot === "string" && slot !== "BN" && slot !== "IR")
    : [];
  const acquisitionSnapshot: ReadonlyMap<string, AcquisitionSnapshotRecord> | null = auctionSnapshot
    ? buildAcquisitionSnapshot({ season: 2026, teams, rosters, picks: auctionSnapshot.picks, transactions, auctionValues })
    : null;
  const draftStatus = auctionSnapshot?.draft?.status ?? "unknown";
  const week = Number(nflState.week);
  return { rosters: currentRosters, playerDirectory, multiTeamPlayerDirectory, auctionValues, marketByPlayer, currentValueByPlayer, starterSlots, acquisitionSnapshot, draftStatus, seasonMode: seasonMode(Number.isFinite(week) ? week : null, draftStatus), week: Number.isFinite(week) ? week : null, expertRosByPlayer: rosArtifact.rows, rosArtifact, fantasyCalcByPlayer, keeperByPlayer: new Map() };
}

export async function buildServerTradeComparison(input: TradeComparisonInput, context = null) {
  return buildTradeComparison({ input, ...(context ?? await loadTradeComparisonContext()) });
}
