"use client";

import { useState } from "react";
import type { CanonicalHallOfFameResume } from "@/lib/history/historyAuthority";

type ResumeRow = CanonicalHallOfFameResume & {
  rank: number;
  status: "ACTIVE" | "FORMER";
  coOwnerLabel?: string;
};

type ResumeView = "active" | "retired" | "all";

const views: Array<{ id: ResumeView; label: string }> = [
  { id: "active", label: "ACTIVE FRANCHISES" },
  { id: "retired", label: "RETIRED OWNERS" },
  { id: "all", label: "ALL-TIME OWNERS" },
];

function ResumeMetrics({ stat }: { stat: ResumeRow }) {
  return (
    <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
      <div><dt className="text-[9px] font-black uppercase tracking-wide text-slate-500">Titles</dt><dd className="mt-1 text-lg font-black text-orange-700">{stat.championships}</dd></div>
      <div><dt className="text-[9px] font-black uppercase tracking-wide text-slate-500">Podiums</dt><dd className="mt-1 text-lg font-black text-slate-800">{stat.podiumFinishes}</dd></div>
      <div><dt className="text-[9px] font-black uppercase tracking-wide text-slate-500">Avg Finish</dt><dd className="mt-1 text-lg font-black text-slate-800">{stat.averageFinish.toFixed(2)}</dd></div>
      <div><dt className="text-[9px] font-black uppercase tracking-wide text-slate-500">Seasons</dt><dd className="mt-1 text-lg font-black text-slate-800">{stat.seasonsPlayed}</dd></div>
    </dl>
  );
}

export default function HallOfFameResumeExplorer({
  rankings,
  allTimeRankings,
  championCount,
  completedSeasonCount,
  activeFranchiseCount,
}: {
  rankings: ResumeRow[];
  allTimeRankings: ResumeRow[];
  championCount: number;
  completedSeasonCount: number;
  activeFranchiseCount: number;
}) {
  const [view, setView] = useState<ResumeView>("active");
  const visibleRankings = view === "active"
    ? rankings
    : view === "retired"
      ? allTimeRankings.filter((stat) => stat.status === "FORMER")
      : allTimeRankings;
  const summary = view === "all"
    ? `${allTimeRankings.length} managers · ${championCount} champions · ${completedSeasonCount} completed seasons`
    : `${view === "active" ? activeFranchiseCount : visibleRankings.length} ${view === "active" ? "active franchises" : "retired owners"}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">Hall of Fame</p>
          <h2 id="hall-title" className="mt-1 text-2xl font-black">All-Time Résumés</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Career rankings across River City history.</p>
        </div>
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600" aria-live="polite">{summary}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Hall of Fame owner views">
        {views.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
            className={`rounded-lg border px-3 py-2 text-xs font-black tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${view === option.id ? "border-[#071a33] bg-[#071a33] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#071a33]"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden md:block">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">River City Hall of Fame all-time résumé rankings</caption>
            <thead className="bg-[#071a33] text-xs uppercase tracking-widest text-white"><tr><th scope="col" className="w-20 px-5 py-4">Rank</th><th scope="col" className="px-5 py-4">Manager</th><th scope="col" className="px-5 py-4 text-center">Titles</th><th scope="col" className="px-5 py-4 text-center">Podiums</th><th scope="col" className="px-5 py-4 text-center">Avg Finish</th><th scope="col" className="px-5 py-4 text-center">Seasons</th><th scope="col" className="px-5 py-4 text-right">Status</th></tr></thead>
            <tbody>{visibleRankings.map((stat) => <tr key={stat.ownerId} className={`border-t border-slate-100 ${stat.rank <= 3 ? "bg-amber-50/50" : ""}`}><td className="px-5 py-4"><span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 font-black ${stat.rank <= 3 ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-600"}`}>{stat.rank}</span></td><th scope="row" className="px-5 py-4 font-black text-slate-950"><span aria-label={stat.coOwnerLabel ? `${stat.manager} with ${stat.coOwnerLabel}` : stat.manager}>{stat.manager}</span>{stat.coOwnerLabel && <span className="mt-1 block text-xs font-semibold text-slate-500">with {stat.coOwnerLabel}</span>}</th><td className="px-5 py-4 text-center text-lg font-black text-orange-700">{stat.championships}</td><td className="px-5 py-4 text-center font-bold text-slate-800">{stat.podiumFinishes}</td><td className="px-5 py-4 text-center font-semibold text-slate-700">{stat.averageFinish.toFixed(2)}</td><td className="px-5 py-4 text-center text-slate-700">{stat.seasonsPlayed}</td><td className="px-5 py-4 text-right"><span className="text-xs font-black tracking-widest text-slate-500">{stat.status}</span></td></tr>)}</tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">{visibleRankings.map((stat) => <article key={stat.ownerId} className={`rounded-xl border p-4 ${stat.rank <= 3 ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-slate-50"}`} aria-labelledby={`manager-${stat.ownerId}`}><div className="flex items-start justify-between gap-3"><h3 id={`manager-${stat.ownerId}`} className="font-black text-slate-950"><span className={`mr-2 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-xs ${stat.rank <= 3 ? "bg-amber-400 text-slate-950" : "bg-slate-200"}`}>#{stat.rank}</span>{stat.manager}</h3><span className="shrink-0 text-[10px] font-black tracking-widest text-slate-500">{stat.status}</span></div>{stat.coOwnerLabel && <p className="mt-1 text-xs font-semibold text-slate-500" aria-label={`Co-owner ${stat.coOwnerLabel}`}>with {stat.coOwnerLabel}</p>}<ResumeMetrics stat={stat} /></article>)}</div>
      </div>
      <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer text-sm font-black text-slate-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Hall of Fame methodology</summary><div className="mt-3 text-sm leading-6 text-slate-600"><p>Rankings use completed River City seasons from 2011–2025.</p><ol className="mt-2 list-inside list-decimal"><li>Championships</li><li>Average finish</li><li>Podiums</li><li>Manager name</li></ol><p className="mt-2">Co-owners receive the shared season placement. Tommy Moore and David Besedich are recognized as 2022 co-champions. The active 2026 season is excluded.</p></div></details>
    </>
  );
}
