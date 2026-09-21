/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { NflKickoff } from "@/lib/nflKickoffSchedule";
import { groupNflGamesByDate, NFL_SCOREBOARD_POLL_INTERVAL_MS, shouldPollNflWeek, type NflWeekScoreboardState } from "@/lib/nflWeekScoreboard";

function kickoffLabel(value: string) {
  return `${new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value))} ET`;
}

function GameRow({ game, favoriteTeam }: { game: NflKickoff; favoriteTeam?: string | null }) {
  const favorite = game.awayTeam?.abbreviation === favoriteTeam || game.homeTeam?.abbreviation === favoriteTeam;
  return <article className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-[#121212] ${favorite ? "border-orange-500 ring-1 ring-orange-500/30" : "border-slate-900/10 dark:border-white/10"}`}>
    <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/55"><span>{game.status}</span><span>{kickoffLabel(game.kickoffAt)}</span></div>
    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
      <div><img src={game.awayTeam?.logo ?? ""} alt="" className={`mx-auto h-10 w-10 object-contain ${game.awayTeam?.logo ? "" : "hidden"}`} /><p className="mt-2 font-black">{game.awayTeam?.abbreviation ?? "Away"}</p>{game.awayTeam?.score !== null && game.awayTeam?.score !== undefined && <p className="text-2xl font-black">{game.awayTeam.score}</p>}</div>
      <span className="text-xs font-black uppercase text-slate-400">at</span>
      <div><img src={game.homeTeam?.logo ?? ""} alt="" className={`mx-auto h-10 w-10 object-contain ${game.homeTeam?.logo ? "" : "hidden"}`} /><p className="mt-2 font-black">{game.homeTeam?.abbreviation ?? "Home"}</p>{game.homeTeam?.score !== null && game.homeTeam?.score !== undefined && <p className="text-2xl font-black">{game.homeTeam.score}</p>}</div>
    </div>
    <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-500 dark:text-white/55"><span>{game.broadcasts?.[0] ?? "Network unavailable"}</span>{game.status === "LIVE" && game.period && <span>Q{game.period}{game.clock ? ` · ${game.clock}` : ""}</span>}</div>
  </article>;
}

export default function NflWeekScoreboardClient({ initialState }: { initialState: NflWeekScoreboardState }) {
  const [state, setState] = useState(initialState);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/nfl/week/${initialState.week}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as NflWeekScoreboardState;
        if (active && !next.unavailable) setState(next);
      } catch { /* retain the last successful scoreboard */ }
    };
    if (!shouldPollNflWeek(initialState.week, state.games)) return () => { active = false; };
    const interval = window.setInterval(refresh, NFL_SCOREBOARD_POLL_INTERVAL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, [initialState.week, state.games]);

  return <div className="space-y-8">{state.unavailable ? <p className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 text-sm font-semibold text-amber-900">NFL scores are temporarily unavailable.</p> : groupNflGamesByDate(state.games).map((group) => <section key={group.date}><h2 className="text-sm font-black uppercase tracking-widest text-orange-600">{group.date}</h2><div className="mt-3 grid gap-4 md:grid-cols-2">{group.games.map((game) => <GameRow key={game.gameId} game={game} favoriteTeam={state.favoriteTeam} />)}</div></section>)}</div>;
}
