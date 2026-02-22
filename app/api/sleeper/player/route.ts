import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json(
      { error: "Player ID is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch Sleeper player metadata
    const metaRes = await fetch(
      `https://api.sleeper.app/v1/players/nfl`,
      { cache: "no-store" }
    );

    if (!metaRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Sleeper player metadata" },
        { status: 500 }
      );
    }

    const allPlayers = await metaRes.json();
    const player = allPlayers[playerId];

    if (!player) {
      return NextResponse.json(
        { error: "Player not found in Sleeper data" },
        { status: 404 }
      );
    }

    // Fetch season stats (2024 season)
    const statsRes = await fetch(
      `https://api.sleeper.app/v1/stats/nfl/regular/2024`,
      { cache: "no-store" }
    );

    const stats = statsRes.ok ? await statsRes.json() : {};
    const playerStats = stats[playerId] || {};

    // Normalize the data for your analyzer
    const normalized = {
      draftPrice: player?.fantasy_positions?.includes("QB") ? 10 : 25, // placeholder until Firebase integration
      faabBids: [], // placeholder until you add FAAB history
      keeperEligible: true, // placeholder until you add keeper rules

      // Usage metrics
      ppg: playerStats?.pts_ppr ?? null,
      gamesPlayed: playerStats?.gp ?? null,
      snapsShare: playerStats?.snap_share ?? null,
      targetsPerGame: playerStats?.tgt_pg ?? null,
      carriesPerGame: playerStats?.att_pg ?? null,
      redZoneTouchesPerGame: playerStats?.rz_touches_pg ?? null,
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Sleeper Player API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch player stats" },
      { status: 500 }
    );
  }
}
