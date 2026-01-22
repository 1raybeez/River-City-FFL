import { getTransactions } from "@/lib/sleeper";
import { LEAGUE_IDS } from "@/lib/sleeper";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get("season")) || 2026;
    const week = Number(searchParams.get("week")) || 1;
    const leagueId = LEAGUE_IDS[season];

    if (!leagueId) {
      return NextResponse.json({ error: "Invalid season or missing league ID." }, { status: 400 });
    }

    const tx = await getTransactions(week, leagueId);
    return NextResponse.json(tx);
  } catch (error) {
    console.error("Error loading transactions:", error);
    return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
  }
}
