import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Map of league IDs by season
const LEAGUE_IDS: Record<number, string> = {
  2026: "1312149033254416384",
  2025: "1199749375539027968",
  2024: "1072545817749331968",
  2023: "997510104398315520",
  2022: "784542934581256192",
  2021: "677751457528762368",
  2020: "530115541505298432",
  2019: "466632190273253376",
  2018: "342868033913540608"
};

// Determine the correct league ID automatically
function getActiveLeagueId() {
  const currentYear = new Date().getFullYear();

  // If we have a league for this year, use it
  if (LEAGUE_IDS[currentYear]) return LEAGUE_IDS[currentYear];

  // Otherwise fall back to the most recent season
  const latestYear = Math.max(...Object.keys(LEAGUE_IDS).map(Number));
  return LEAGUE_IDS[latestYear];
}

export async function GET() {
  const LEAGUE_ID = getActiveLeagueId();

  try {
    // Fetch rosters + player metadata
    const [rosterRes, playerRes] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`, {
        cache: "no-store"
      }),
      fetch("https://api.sleeper.app/v1/players/nfl", {
        cache: "no-store"
      })
    ]);

    if (!rosterRes.ok || !playerRes.ok) {
      throw new Error("Failed to fetch Sleeper data");
    }

    const rosters = await rosterRes.json();
    const players = await playerRes.json();

    // Enrich roster data with player metadata
    const mappedRosters = rosters.map((team: any) => ({
      owner_id: team.owner_id,
      players:
        team.players?.map((pId: string) => {
          const p = players[pId];
          return {
            id: pId,
            name: p?.full_name || "Unknown Player",
            pos: p?.position || "BN",
            team: p?.team || "FA"
          };
        }) || []
    }));

    return NextResponse.json(mappedRosters);
  } catch (error) {
    console.error("Internal API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sleeper data" },
      { status: 500 }
    );
  }
}
