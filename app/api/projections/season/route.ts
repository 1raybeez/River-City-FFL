// ---------------------------------------------------------
// File: /app/api/projections/season/route.ts
// Purpose: Free, stable season-long projections from FantasyData
// ---------------------------------------------------------

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url =
      "https://fantasydata.com/NFL_Fantasy_Football_Projections/GetSeasonProjections?format=json";

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error("FantasyData season projections failed:", res.status);
      return NextResponse.json(
        { error: "Failed to fetch season projections" },
        { status: 500 }
      );
    }

    const data = await res.json();

    const projections = data.map((p: any) => ({
      playerName: p.Player,
      team: p.Team,
      position: p.Position,
      points: p.FantasyPointsPPR ?? 0,
      passYds: p.PassingYards ?? 0,
      rushYds: p.RushingYards ?? 0,
      recYds: p.ReceivingYards ?? 0,
      passTd: p.PassingTouchdowns ?? 0,
      rushTd: p.RushingTouchdowns ?? 0,
      recTd: p.ReceivingTouchdowns ?? 0,
      receptions: p.Receptions ?? 0,
    }));

    return NextResponse.json({ projections });
  } catch (err) {
    console.error("FantasyData API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch season projections" },
      { status: 500 }
    );
  }
}
