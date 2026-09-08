import { getLeagueInfo, getLeagueRosters, getLeagueUsers, getSleeperAuctionDraftSnapshot, getSleeperPlayerIdentityDirectory } from "@/lib/sleeper";
import { normalizeSleeperAuctionSyncSnapshot } from "@/lib/auction/sleeperAuctionSync";
import { resolveDraftNightRosters } from "@/lib/postDraftDraftNightRoster";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { buildCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentity";
import type { DraftReportV2SnapshotBuildInput } from "@/lib/draftReportV2/types";

function normalizePosition(position: string | null) {
  const value = position?.trim().toUpperCase() ?? "";
  if (value === "DST" || value === "D/ST" || value === "DEFENSE") return "DEF";
  return value || "OTHER";
}

function rosterRequirements(value: unknown) {
  if (!Array.isArray(value)) return null;
  const rosterPositions = value.filter((position): position is string => typeof position === "string").map(normalizePosition);
  if (!rosterPositions.length) return null;
  const requiredStarterSlots: Record<string, number> = {};
  rosterPositions.filter((position) => position !== "BN" && position !== "FLEX" && position !== "IR").forEach((position) => { requiredStarterSlots[position] = (requiredStarterSlots[position] ?? 0) + 1; });
  return { rosterPositions, requiredStarterSlots, flexSlots: rosterPositions.filter((position) => position === "FLEX").length, flexEligiblePositions: ["RB", "WR", "TE"], rosterSlotCapacity: rosterPositions.length, source: "Sleeper league.roster_positions" as const };
}

/** Read-only V2 adapter. It intentionally does not import postDraftMetrics or Power Rankings. */
export async function loadDraftReportV2SourceInput(season = 2026): Promise<{ input: DraftReportV2SnapshotBuildInput; currentDisplayNames: ReadonlyMap<string, string>; evidence: { values: { activeRunId: string | null; generatedAt: string | null }; adp: { activeRunId: string | null; generatedAt: string | null } } }> {
  const [snapshot, values, adp] = await Promise.all([
    getSleeperAuctionDraftSnapshot(season),
    import("@/lib/auction/valueRefreshService").then(({ readPublishedMasterviewFromFirestore }) => readPublishedMasterviewFromFirestore(season)),
    import("@/lib/auction/adpRefreshService").then(({ readPublishedAdpConsensusFromFirestore }) => readPublishedAdpConsensusFromFirestore(season)),
  ]);
  const [rosters, users, sleeperPlayers, leagueInfo] = await Promise.all([
    getLeagueRosters(snapshot.leagueId ?? undefined),
    getLeagueUsers(snapshot.leagueId ?? undefined),
    getSleeperPlayerIdentityDirectory(),
    getLeagueInfo(snapshot.leagueId ?? undefined),
  ]);
  const stats = new Map((values?.rows ?? []).flatMap((row) => row.sleeperPlayerId ? [[String(row.sleeperPlayerId), row.averageValue] as const] : []));
  const adpById = new Map((adp?.rows ?? []).map((row) => [row.playerId, row.consensusOverallAdp]));
  const players = new Map(Object.entries(sleeperPlayers).map(([playerId, player]) => {
    const publishedValue = stats.get(playerId) ?? null;
    return [playerId, { playerName: player.displayName ?? playerId, position: player.position ?? null, nflTeam: player.nflTeam ?? null, publishedValue: typeof publishedValue === "number" ? publishedValue : null, adp: adpById.get(playerId) ?? null }] as const;
  }));
  const normalizedAuction = normalizeSleeperAuctionSyncSnapshot({ leagueId: snapshot.leagueId, season, fetchedAt: snapshot.generatedAt, draftId: snapshot.draft?.draft_id ?? null, picks: snapshot.picks.map((pick) => ({ draftId: pick.draftId, playerId: pick.playerId, playerName: pick.playerName, position: pick.position, nflTeam: pick.nflTeam, pickedByUserId: pick.pickedByUserId, rosterId: pick.rosterId, round: pick.round, draftSlot: pick.draftSlot, pickNo: pick.pickNo, isKeeper: pick.isKeeper, auctionPrice: pick.auctionPrice, needsAuctionPriceReview: pick.needsAuctionPriceReview })), rosters, users, playersById: Object.fromEntries(Object.entries(sleeperPlayers).map(([id, player]) => [id, { full_name: player.displayName, position: player.position, team: player.nflTeam }])), warnings: snapshot.warnings, includeRosterKeepers: false });
  const requirements = rosterRequirements((leagueInfo as { roster_positions?: unknown }).roster_positions);
  const draftNight = resolveDraftNightRosters({ auction: normalizedAuction, players: new Map([...players].map(([playerId, player]) => [playerId, { playerId, ...player }])), requirements, budget: riverCityAuctionLeagueSettings.auctionBudgetPerTeam });
  const currentIdentity = buildCurrentSeasonTeamIdentityMap({ users, rosters });
  return { input: { season, draftId: snapshot.draft?.draft_id ?? null, draftStatus: snapshot.draft?.status ?? "unknown", generatedAt: snapshot.generatedAt, rosters: draftNight.rosters, acquisitions: draftNight.acquisitions, players, rosterRequirements: requirements }, currentDisplayNames: new Map([...currentIdentity].map(([franchiseId, identity]) => [franchiseId, identity.currentTeamName])), evidence: { values: { activeRunId: values?.activeRunId ?? null, generatedAt: values?.generatedAt ?? null }, adp: { activeRunId: adp?.activeRunId ?? null, generatedAt: adp?.generatedAt ?? null } } };
}
