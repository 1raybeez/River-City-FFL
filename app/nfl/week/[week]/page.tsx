import Link from "next/link";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getNflWeekScoreboard } from "@/lib/nflWeekScoreboard";
import NflWeekScoreboardClient from "./NflWeekScoreboardClient";

export const dynamic = "force-dynamic";

export default async function NflWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: rawWeek } = await params;
  const week = Number(rawWeek);
  const season = new Date().getUTCFullYear();
  if (!Number.isInteger(week) || week < 1 || week > 18) return <main className="mx-auto max-w-5xl px-4 py-10"><h1 className="text-3xl font-black uppercase italic">NFL Week Unavailable</h1></main>;
  let favoriteTeam = undefined;
  try { favoriteTeam = (await getCurrentMember()).favoriteNflTeam; } catch { /* basic scores are public */ }
  const state = await getNflWeekScoreboard(season, week, favoriteTeam);
  return <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 lg:px-8"><div><Link href="/" className="text-xs font-black uppercase tracking-widest text-orange-600 hover:underline">← Home</Link><p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-orange-600">NFL scoreboard</p><h1 className="mt-2 text-4xl font-black uppercase italic">NFL Week {week} Scores</h1><p className="mt-3 text-sm text-slate-500 dark:text-white/55">Regular-season games from ESPN. River City fantasy Matchups are separate.</p></div><NflWeekScoreboardClient initialState={state} /></main>;
}
