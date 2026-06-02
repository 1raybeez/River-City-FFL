// ---------------------------------------------------------
// File: /app/api/projections/week/route.ts
// Purpose: Derived weekly projections (4pt pass TD)
// Source: Season projections → split into weeks
// ---------------------------------------------------------

import { NextResponse } from "next/server";

const GAMES_PER_SEASON = 17;

// Simple positional volatility multipliers (can tune later)
const POSITION_VOLATILITY: Record<string, number> = {
  QB: 0.9,
  RB: 1.05,
  WR: 1.1,
  TE: 1.0,
  K: 0.95,
  DEF: 0.95,
};

function getPositionVolatility(pos: string) {
  return POSITION_VOLATILITY[pos] ?? 1.0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week") || "1";
    const week = Number(weekParam);

    // 1) Fetch season projections (from FantasyData)
    const seasonUrl =
      "https://fantasydata.com/NFL_Fantasy_Football_Projections/GetSeasonProjections?format=json";

    const res = await fetch(seasonUrl, { cache: "no-store" });

    if (!res.ok) {
      console.error("Season projections failed:", res.status);
      return NextResponse.json(
        { error: "Failed to fetch season projections" },
        { status: 500 }
      );
    }

    const seasonData = await res.json();

    // 2) Derive weekly projections from season totals
    const weekly = seasonData.map((p: any) => {
      const position = p.Position as string;
      const vol = getPositionVolatility(position);

      const seasonPtsPpr = p.FantasyPointsPPR ?? 0;
      const seasonPassYds = p.PassingYards ?? 0;
      const seasonRushYds = p.RushingYards ?? 0;
      const seasonRecYds = p.ReceivingYards ?? 0;
      const seasonPassTd = p.PassingTouchdowns ?? 0;
      const seasonRushTd = p.RushingTouchdowns ?? 0;
      const seasonRecTd = p.ReceivingTouchdowns ?? 0;
      const seasonRec = p.Receptions ?? 0;

      // Base per-game rates
      const baseGames = GAMES_PER_SEASON;
      const ptsPerGame = seasonPtsPpr / baseGames;
      const passYdsPerGame = seasonPassYds / baseGames;
      const rushYdsPerGame = seasonRushYds / baseGames;
      const recYdsPerGame = seasonRecYds / baseGames;
      const passTdPerGame = seasonPassTd / baseGames;
      const rushTdPerGame = seasonRushTd / baseGames;
      const recTdPerGame = seasonRecTd / baseGames;
      const recPerGame = seasonRec / baseGames;

      // Apply positional volatility (WR/RB swingier than QB, etc.)
      const weeklyPoints = ptsPerGame * vol;

      return {
        playerName: p.Player,
        team: p.Team,
        position,
        week,
        points: weeklyPoints,
        passYds: passYdsPerGame,
        rushYds: rushYdsPerGame,
        recYds: recYdsPerGame,
        passTd: passTdPerGame,
        rushTd: rushTdPerGame,
        recTd: recTdPerGame,
        receptions: recPerGame,
      };
    });

    return NextResponse.json({ week, projections: weekly });
  } catch (err) {
    console.error("Derived weekly projections error:", err);
    return NextResponse.json(
      { error: "Failed to build weekly projections" },
      { status: 500 }
    );
  }
}
