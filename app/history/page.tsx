import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { ownerProfilesById } from "@/lib/managers/identityData";
import { calculateAllTimeStats } from "@/lib/stats";
import {
  getCanonicalChampionshipResults,
  getCanonicalChampionNames,
  getCompletedHistoryResults,
  getHistoricalPostseasonEra,
  getHistoryMatchupCoverageNote,
  HISTORY_CURRENT_SEASON,
  HISTORY_FIRST_COMPLETED_SEASON,
  HISTORY_LAST_COMPLETED_SEASON,
  reconcileHallOfFameStats,
} from "@/lib/history/historyAuthority";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const linkClass = "rounded-lg text-sm font-bold text-blue-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

function ownerName(ownerId: string) {
  return ownerProfilesById[ownerId]?.fullName ?? ownerId;
}

export default function HistoryPage() {
  const completedResults = getCompletedHistoryResults();
  const championshipResults = getCanonicalChampionshipResults();
  const completedSeasons = [...new Set(completedResults.map((result) => result.season))].sort((a, b) => b - a);
  const recentChampionships = completedSeasons.slice(0, 5).map((season) => {
    const results = championshipResults.filter((result) => result.season === season);
    return {
      season,
      champions: results.flatMap((result) => result.ownerIds.map(ownerName)),
      teams: results.map((result) => result.rawTeamName).filter(Boolean),
    };
  });
  const uniqueChampionCount = getCanonicalChampionNames().length;
  const rankings = reconcileHallOfFameStats(calculateAllTimeStats()).slice(0, 5);

  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <Link href="/league-info" className={linkClass}>← Back to League Info</Link>
        <section className="mt-6 rounded-3xl bg-[#071a33] px-6 py-10 text-white sm:px-10" aria-labelledby="history-title">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">River City History</p>
          <h1 id="history-title" className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">A league built over time</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">The completed River City record runs from {HISTORY_FIRST_COMPLETED_SEASON} through {HISTORY_LAST_COMPLETED_SEASON}. The {HISTORY_CURRENT_SEASON} season is active and intentionally excluded from completed-history honors.</p>
        </section>

        <section className="mt-8" aria-labelledby="glance-title">
          <h2 id="glance-title" className="text-2xl font-black">League at a glance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">Seasons completed</p><p className="mt-2 text-3xl font-black">{completedSeasons.length}</p><p className="mt-1 text-sm text-slate-600">{HISTORY_FIRST_COMPLETED_SEASON}–{HISTORY_LAST_COMPLETED_SEASON}</p></div>
            <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">Unique champions</p><p className="mt-2 text-3xl font-black">{uniqueChampionCount}</p><p className="mt-1 text-sm text-slate-600">Canonical championship credits</p></div>
            <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">History since</p><p className="mt-2 text-3xl font-black">{HISTORY_FIRST_COMPLETED_SEASON}</p><p className="mt-1 text-sm text-slate-600">Reviewed final standings</p></div>
            <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">League format</p><p className="mt-2 text-3xl font-black">{riverCityAuctionLeagueSettings.teamCount}-team</p><p className="mt-1 text-sm text-slate-600">Current keeper auction league</p></div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="champions-title">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-amber-700">The record</p><h2 id="champions-title" className="mt-1 text-2xl font-black">Recent champions</h2></div><p className="text-sm text-slate-600">Completed seasons only</p></div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {recentChampionships.map(({ season, champions, teams }) => <article key={season} className={cardClass}><p className="text-sm font-black text-slate-500">{season}</p><h3 className="mt-2 text-lg font-black">{champions.length > 1 ? "CO-CHAMPIONS" : "Champion"}</h3><p className="mt-2 font-bold text-slate-900">{champions.join(" · ")}</p>{teams.length > 0 && <p className="mt-2 text-xs text-slate-500">{teams.join(" · ")}</p>}</article>)}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="hall-title">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700">Hall of Fame</p><h2 id="hall-title" className="mt-1 text-2xl font-black">All-Time Rankings</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Career rankings across River City history.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Hall of Fame preview</caption><thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-3">Rank</th><th className="px-5 py-3">Manager</th><th className="px-5 py-3">Titles</th><th className="px-5 py-3">Avg Finish</th><th className="px-5 py-3">Seasons</th></tr></thead><tbody>{rankings.map((stat, index) => <tr key={stat.manager} className="border-t border-slate-100"><td className="px-5 py-3 font-bold">{index + 1}</td><td className="px-5 py-3 font-bold">{stat.manager}</td><td className="px-5 py-3">{stat.wins}</td><td className="px-5 py-3">{stat.avgRank}</td><td className="px-5 py-3">{stat.seasons}</td></tr>)}</tbody></table></div><div className="grid gap-3 p-4 md:hidden">{rankings.map((stat, index) => <article key={stat.manager} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><h3 className="font-black">{index + 1}. {stat.manager}</h3><span className="text-xs font-bold text-slate-500">{stat.seasons} seasons</span></div><p className="mt-2 text-sm text-slate-600">{stat.wins} titles · {stat.avgRank} average finish</p></article>)}</div></div>
        </section>

        <section className="mt-10" aria-labelledby="eras-title"><h2 id="eras-title" className="text-2xl font-black">League eras</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><div className={cardClass}><h3 className="font-black">2011–2021</h3><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoricalPostseasonEra(2011).toUpperCase()}</p></div><div className={cardClass}><h3 className="font-black">2022–Present</h3><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoricalPostseasonEra(2022).toUpperCase()}</p></div></div><div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Historical data coverage</p><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoryMatchupCoverageNote()} Final standings and championship history are available back to 2011.</p></div></section>

        <section className="mt-10" aria-labelledby="explore-title"><h2 id="explore-title" className="text-2xl font-black">Explore more history</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Rivalries", "/league-info/rivalries"], ["Draft history", "/league-info/draft"], ["Legislation", "/league-info/legislative"], ["Payouts", "/league-info/payouts"], ["Constitution History", "/history/version-history"]].map(([label, href]) => <Link key={href} href={href} className={`${cardClass} ${linkClass}`}>{label} <span aria-hidden="true">→</span></Link>)}</div></section>
        <div className="mt-10"><Link href="/" className={linkClass}>Return to Home</Link></div>
      </main>
    </SiteShell>
  );
}
