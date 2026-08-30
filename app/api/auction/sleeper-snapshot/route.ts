import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  getLeagueRosters,
  getSleeperLeagueDrafts,
  getLeagueUsers,
  getSleeperAuctionDraftSnapshot,
  getSleeperPlayerIdentityDirectory,
  LEAGUE_IDS,
} from "@/lib/sleeper";
import { normalizeSleeperAuctionSyncSnapshot } from "@/lib/auction/sleeperAuctionSync";

const DEFAULT_SEASON = LEAGUE_IDS[2026] ? 2026 : 2025;

function parseSeason(value: string | null) {
  if (!value) return DEFAULT_SEASON;

  const season = Number(value);
  if (!Number.isInteger(season) || !LEAGUE_IDS[season]) {
    return null;
  }

  return season;
}

function buildCounts(
  picks: Awaited<ReturnType<typeof getSleeperAuctionDraftSnapshot>>["picks"]
) {
  const completedPurchasePicks = picks.filter((pick) => pick.isKeeper !== true);
  const missingAuctionPrices = completedPurchasePicks.filter(
    (pick) => pick.needsAuctionPriceReview
  ).length;

  return {
    picks: picks.length,
    purchases: completedPurchasePicks.length,
    pricedPurchases: completedPurchasePicks.length - missingAuctionPrices,
    missingAuctionPrices,
    keepers: picks.filter((pick) => pick.isKeeper === true).length,
  };
}

function readRosterKeeperIds(roster: { keepers?: unknown }) {
  const keepers = roster.keepers;

  if (Array.isArray(keepers)) {
    return keepers.filter(
      (keeper): keeper is string | number =>
        typeof keeper === "string" || typeof keeper === "number"
    );
  }

  if (keepers && typeof keepers === "object") {
    return Object.keys(keepers);
  }

  return [];
}

export async function GET(req: Request) {
  try {
    await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json(
        { error: "Auction War Room access required." },
        { status: 401 }
      );
    }

    throw error;
  }

  try {
    const { searchParams } = new URL(req.url);
    const season = parseSeason(searchParams.get("season"));

    if (season === null) {
      return NextResponse.json(
        { error: "Invalid season or missing league ID." },
        { status: 400 }
      );
    }

    const [snapshot, leagueDrafts] = await Promise.all([
      getSleeperAuctionDraftSnapshot(season),
      getSleeperLeagueDrafts(season),
    ]);
    const fetchedAt = new Date().toISOString();

    if (
      snapshot.status === "no-league" ||
      snapshot.status === "no-auction-draft" ||
      snapshot.status === "missing-draft-id"
    ) {
      return NextResponse.json(
        {
          season,
          status: snapshot.status,
          error: snapshot.warnings[0] ?? "Sleeper auction draft unavailable.",
          warnings: snapshot.warnings,
          fetchedAt,
        },
        { status: snapshot.status === "no-league" ? 400 : 404 }
      );
    }

    const playerIds = snapshot.picks.map((pick) => pick.playerId);
    const [rosters, users, playerDirectory] = await Promise.all([
      getLeagueRosters(snapshot.leagueId ?? undefined),
      getLeagueUsers(snapshot.leagueId ?? undefined),
      getSleeperPlayerIdentityDirectory(playerIds),
    ]);
    const draftId =
      typeof snapshot.draft?.draft_id === "string"
        ? snapshot.draft.draft_id
        : null;
    const syncPayload = normalizeSleeperAuctionSyncSnapshot({
      leagueId: snapshot.leagueId,
      season,
      fetchedAt,
      draftId,
      picks: snapshot.picks,
      rosters,
      users,
      playersById: Object.fromEntries(Object.entries(playerDirectory).map(([id, player]) => [id, {
        full_name: player.displayName,
        position: player.position,
        team: player.nflTeam,
      }])),
      warnings: snapshot.warnings,
    });
    const auctionDraftCount = leagueDrafts.filter(
      (draft) => draft.type === "auction"
    ).length;
    const routeWarnings = [
      ...syncPayload.warnings,
      ...(auctionDraftCount > 1
        ? [
            `${auctionDraftCount} auction drafts were found for ${season}; selected ${draftId ?? "unknown"}.`,
          ]
        : []),
    ];
    const rosterKeeperCount = rosters.reduce(
      (sum, roster) => sum + readRosterKeeperIds(roster).length,
      0
    );
    const keeperSourcesUsed = [
      ...(snapshot.picks.some((pick) => pick.isKeeper === true)
        ? ["draft-pick"]
        : []),
      ...(rosterKeeperCount > 0 ? ["roster"] : []),
    ];
    const diagnostics = {
      draftsFound: leagueDrafts.length,
      selectedDraftId: draftId,
      selectedDraftType: snapshot.draft?.type ?? null,
      selectedDraftStatus: snapshot.draft?.status ?? null,
      rawPickCount: snapshot.picks.length,
      keeperPickCount: snapshot.picks.filter((pick) => pick.isKeeper === true)
        .length,
      rosterKeeperCount,
      normalizedKeeperCount: syncPayload.keepers.length,
      completedPurchaseCount: syncPayload.completedPurchases.length,
      keeperSourcesUsed,
    };
    const responseSyncStatus =
      routeWarnings.length > 0 ? "partial" : syncPayload.syncStatus;

    return NextResponse.json({
      ...syncPayload,
      season,
      leagueId: snapshot.leagueId,
      status: snapshot.status,
      syncStatus: responseSyncStatus,
      draft: snapshot.draft,
      purchases: syncPayload.completedPurchases,
      picks: syncPayload.completedPurchases,
      counts: {
        ...buildCounts(snapshot.picks),
        keepers: syncPayload.keepers.length,
        completedPurchases: syncPayload.completedPurchases.length,
        missingKeeperPrices: syncPayload.keepers.filter(
          (keeper) => keeper.priceStatus === "missing"
        ).length,
        warnings: routeWarnings.length,
      },
      diagnostics,
      warnings: routeWarnings,
      fetchedAt,
    });
  } catch (error) {
    console.error("Error loading Sleeper auction snapshot:", error);
    return NextResponse.json(
      { error: "Failed to load Sleeper auction snapshot." },
      { status: 500 }
    );
  }
}
