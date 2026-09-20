import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getHomeNflGameCenter } from "@/lib/nflGameCenter";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const member = await getCurrentMember();
    return NextResponse.json(await getHomeNflGameCenter({ favoriteTeam: member.favoriteNflTeam }));
  } catch {
    return NextResponse.json({ card: null, unavailable: true, season: new Date().getUTCFullYear(), week: null });
  }
}
