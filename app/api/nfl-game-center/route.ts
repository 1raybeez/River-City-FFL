import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getHomeNflGameCenter } from "@/lib/nflGameCenter";

export const dynamic = "force-dynamic";

export async function GET() {
  const season = new Date().getUTCFullYear();
  try {
    let favoriteTeam = undefined;
    try {
      favoriteTeam = (await getCurrentMember()).favoriteNflTeam;
    } catch {
      // Personalization is optional; public Game Center must still use neutral selection.
    }
    return NextResponse.json(await getHomeNflGameCenter({ favoriteTeam }));
  } catch {
    return NextResponse.json({ card: null, unavailable: true, reasonCode: "UNKNOWN_GAME_CENTER_ERROR", season, week: null });
  }
}
