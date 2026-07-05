import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  getSleeperAuctionDraftSnapshot,
  LEAGUE_IDS,
} from "@/lib/sleeper";

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
  const missingAuctionPrices = picks.filter(
    (pick) => pick.needsAuctionPriceReview
  ).length;

  return {
    picks: picks.length,
    purchases: picks.length,
    pricedPurchases: picks.length - missingAuctionPrices,
    missingAuctionPrices,
    keepers: picks.filter((pick) => pick.isKeeper === true).length,
  };
}

export async function GET(req: Request) {
  try {
    await requireAuctionAccess();
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

    const snapshot = await getSleeperAuctionDraftSnapshot(season);
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

    return NextResponse.json({
      season,
      leagueId: snapshot.leagueId,
      status: snapshot.status,
      draft: snapshot.draft,
      purchases: snapshot.picks,
      picks: snapshot.picks,
      counts: buildCounts(snapshot.picks),
      warnings: snapshot.warnings,
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
