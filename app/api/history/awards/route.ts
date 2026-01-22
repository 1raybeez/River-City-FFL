import { getLeagueHistoryAwards } from "@/lib/sleeper";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const awards = await getLeagueHistoryAwards();
    return NextResponse.json(awards);
  } catch (error) {
    console.error("Error loading awards:", error);
    return NextResponse.json({ error: "Failed to load awards." }, { status: 500 });
  }
}
