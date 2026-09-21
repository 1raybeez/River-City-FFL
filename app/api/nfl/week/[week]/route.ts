import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getNflWeekScoreboard } from "@/lib/nflWeekScoreboard";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week: rawWeek } = await params;
  const week = Number(rawWeek);
  const season = new Date().getUTCFullYear();
  if (!Number.isInteger(week) || week < 1 || week > 18) return NextResponse.json({ season, week, games: [], unavailable: true }, { status: 400 });
  let favoriteTeam = undefined;
  try { favoriteTeam = (await getCurrentMember()).favoriteNflTeam; } catch { /* public scoreboard remains available */ }
  return NextResponse.json(await getNflWeekScoreboard(season, week, favoriteTeam));
}
