// ---------------------------------------------------------
// File: /app/api/transactions/route.ts
// Purpose: Fetch Sleeper league transactions for a given week
// ---------------------------------------------------------

import { NextResponse } from "next/server";
import { getTransactions, LEAGUE_IDS } from "@/lib/sleeper";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const season = Number(searchParams.get("season")) || 2026;
    const week = Number(searchParams.get("week")) || 1;

    const leagueId = LEAGUE_IDS[season];

    if (!leagueId) {
      return NextResponse.json(
        { error: "Invalid season or missing league ID." },
        { status: 400 }
      );
    }

    // FIX: Sleeper league IDs are strings, so ensure correct type
    const tx = await getTransactions(week, String(leagueId));

    return NextResponse.json(tx);
  } catch (error) {
    console.error("Error loading transactions:", error);
    return NextResponse.json(
      { error: "Failed to load transactions." },
      { status: 500 }
    );
  }
}
