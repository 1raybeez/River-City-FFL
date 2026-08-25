import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import HallOfFameResumeExplorer from "./HallOfFameResumeExplorer";
import TrophyRoomExplorer from "./TrophyRoomExplorer";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { franchises, ownerProfilesById } from "@/lib/managers/identityData";
import { FranchiseStatus } from "@/lib/managers/identityTypes";
import {
  getCanonicalChampionNames, getCanonicalChampionshipResults, getCanonicalHallOfFameResumes,
  getCompletedHistoryResults, getHistoricalPostseasonEra, getHistoryMatchupCoverageNote,
  HISTORY_CURRENT_SEASON, HISTORY_FIRST_COMPLETED_SEASON, HISTORY_LAST_COMPLETED_SEASON,
} from "@/lib/history/historyAuthority";

type HistoryView = "overview" | "champions" | "hall-of-fame" | "trophy-room";
const historyViews: Array<{ value: HistoryView; label: string }> = [
  { value: "overview", label: "OVERVIEW" }, { value: "champions", label: "CHAMPIONS" },
  { value: "hall-of-fame", label: "HALL OF FAME" }, { value: "trophy-room", label: "TROPHY ROOM" },
];
const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const linkClass = "rounded-lg text-sm font-bold text-blue-800 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

function normalizeHistoryView(value: string | string[] | undefined): HistoryView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return historyViews.some((view) => view.value === candidate) ? candidate as HistoryView : "overview";
}

function HistorySelector({ activeView }: { activeView: HistoryView }) {
  return <nav className="mt-5 flex flex-wrap gap-2" aria-label="History sections">
    {historyViews.map(({ value, label }) => <Link key={value} href={value === "overview" ? "/history" : `/history?view=${value}`} aria-current={activeView === value ? "page" : undefined} className={`rounded-full border px-4 py-2 text-xs font-black tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${activeView === value ? "border-[#071a33] bg-[#071a33] text-white" : "border-slate-300 bg-white text-slate-700 hover:border-[#071a33] hover:text-[#071a33]"}`}>{label}</Link>)}
  </nav>;
}

type RecentChampionship = { season: number; champions: string[]; teams: string[] };
function Overview({ completedSeasons, uniqueChampionCount, recentChampionships }: { completedSeasons: number[]; uniqueChampionCount: number; recentChampionships: RecentChampionship[] }) {
  return <>
    <section className="mt-8" aria-labelledby="glance-title"><h2 id="glance-title" className="text-2xl font-black">League at a glance</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">Seasons completed</p><p className="mt-2 text-3xl font-black">{completedSeasons.length}</p><p className="mt-1 text-sm text-slate-600">{HISTORY_FIRST_COMPLETED_SEASON}–{HISTORY_LAST_COMPLETED_SEASON}</p></div>
      <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">Unique champions</p><p className="mt-2 text-3xl font-black">{uniqueChampionCount}</p><p className="mt-1 text-sm text-slate-600">Canonical championship credits</p></div>
      <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">History since</p><p className="mt-2 text-3xl font-black">{HISTORY_FIRST_COMPLETED_SEASON}</p><p className="mt-1 text-sm text-slate-600">Reviewed final standings</p></div>
      <div className={cardClass}><p className="text-xs font-black uppercase tracking-widest text-slate-500">League format</p><p className="mt-2 text-3xl font-black">{riverCityAuctionLeagueSettings.teamCount}-team</p><p className="mt-1 text-sm text-slate-600">Current keeper auction league</p></div>
    </div></section>
    <section className="mt-10" aria-labelledby="recent-champions-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-amber-700">The record</p><h2 id="recent-champions-title" className="mt-1 text-2xl font-black">Recent champions</h2></div><p className="text-sm text-slate-600">Completed seasons only</p></div><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{recentChampionships.map(({ season, champions, teams }) => <article key={season} className={cardClass}><p className="text-sm font-black text-slate-500">{season}</p><h3 className="mt-2 text-lg font-black">{champions.length > 1 ? "CO-CHAMPIONS" : "Champion"}</h3><p className="mt-2 font-bold text-slate-900">{champions.join(" · ")}</p>{teams.length > 0 && <p className="mt-2 text-xs text-slate-500">{teams.join(" · ")}</p>}</article>)}</div></section>
    <section className="mt-10" aria-labelledby="eras-title"><h2 id="eras-title" className="text-2xl font-black">League eras</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className={cardClass}><h3 className="font-black">2011–2021</h3><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoricalPostseasonEra(2011).toUpperCase()}</p></div><div className={cardClass}><h3 className="font-black">2022–Present</h3><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoricalPostseasonEra(2022).toUpperCase()}</p></div></div><div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Historical data coverage</p><p className="mt-2 text-sm leading-6 text-slate-600">{getHistoryMatchupCoverageNote()} Final standings and championship history are available back to 2011.</p></div></section>
    <ExploreMoreHistory />
  </>;
}

function ChampionsClub({ rankings, uniqueChampionCount }: { rankings: ReturnType<typeof getCanonicalHallOfFameResumes>; uniqueChampionCount: number }) {
  return <section className="mt-8" aria-labelledby="club-title"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-amber-700">The honor roll</p><h2 id="club-title" className="mt-1 text-2xl font-black">Champions Club</h2></div><p className="text-sm text-slate-600">{uniqueChampionCount} managers with canonical titles</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rankings.filter((stat) => stat.championships > 0).map((stat) => <article key={stat.ownerId} className={cardClass}><h3 className="font-black text-slate-950">{stat.manager}</h3><p className="mt-2 text-xs font-black uppercase tracking-widest text-orange-700">{stat.championships} {stat.championships === 1 ? "title" : "titles"}</p><p className="mt-2 text-sm font-semibold text-slate-600">{stat.championshipYears.join(" · ")}</p></article>)}</div></section>;
}

function ExploreMoreHistory() {
  return <section className="mt-10" aria-labelledby="explore-title"><h2 id="explore-title" className="text-2xl font-black">Explore more history</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Rivalries", "/league-info/rivalries"], ["Draft history", "/league-info/draft"], ["Legislation", "/league-info/legislative"], ["Payouts", "/league-info/payouts"], ["Constitution History", "/history/version-history"]].map(([label, href]) => <Link key={href} href={href} className={`${cardClass} ${linkClass}`}>{label} <span aria-hidden="true">→</span></Link>)}</div></section>;
}

type HistoryPageProps = { searchParams?: Promise<{ view?: string | string[] }> };
export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const activeView = normalizeHistoryView(params?.view);
  const rankings = getCanonicalHallOfFameResumes();
  const completedResults = getCompletedHistoryResults();
  const championshipResults = getCanonicalChampionshipResults();
  const completedSeasons = [...new Set(completedResults.map((result) => result.season))].sort((a, b) => b - a);
  const recentChampionships: RecentChampionship[] = completedSeasons.slice(0, 5).map((season) => { const results = championshipResults.filter((result) => result.season === season); return { season, champions: results.flatMap((result) => result.ownerIds.map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId)), teams: results.map((result) => result.rawTeamName).filter((team): team is string => Boolean(team)) }; });
  const uniqueChampionCount = getCanonicalChampionNames().length;
  const globalRows = rankings.map((stat, index) => ({ ...stat, rank: index + 1, status: ownerProfilesById[stat.ownerId]?.status === "active" ? "ACTIVE" as const : "FORMER" as const }));
  const resumeByOwnerId = new Map(globalRows.map((stat) => [stat.ownerId, stat]));
  const activeFranchises = franchises.filter((franchise) => franchise.status === FranchiseStatus.Active);
  const activeOwnerIds = new Set(activeFranchises.flatMap((franchise) => franchise.activeOwnerIds));
  const retiredOwnerIds = new Set(globalRows.filter((stat) => !activeOwnerIds.has(stat.ownerId) || stat.ownerId === "landon-elliott").map((stat) => stat.ownerId));
  const resumeRows = activeFranchises.flatMap((franchise) => { const primaryOwnerId = franchise.primaryOwnerIds[0] ?? franchise.activeOwnerIds[0]; const stat = resumeByOwnerId.get(primaryOwnerId); if (!stat) return []; const coOwnerIds = franchise.coOwnerIds.filter((ownerId) => ownerId !== primaryOwnerId); return [{ ...stat, status: "ACTIVE" as const, coOwnerLabel: coOwnerIds.map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId).join(" / ") || undefined }]; }).sort((first, second) => first.rank - second.rank);
  const allTimeRows = globalRows.map((stat) => ({ ...stat, status: retiredOwnerIds.has(stat.ownerId) ? "FORMER" as const : "ACTIVE" as const }));
  return <SiteShell activePath="/league-info"><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"><Link href="/league-info" className={linkClass}>← Back to League Info</Link><section className="mt-6 rounded-3xl bg-[#071a33] px-6 py-10 text-white sm:px-10" aria-labelledby="history-title"><p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">River City History</p><h1 id="history-title" className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">A league built over time</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">The completed River City record runs from {HISTORY_FIRST_COMPLETED_SEASON} through {HISTORY_LAST_COMPLETED_SEASON}. The {HISTORY_CURRENT_SEASON} season is active and intentionally excluded from completed-history honors.</p></section><HistorySelector activeView={activeView} />{activeView === "overview" && <Overview completedSeasons={completedSeasons} uniqueChampionCount={uniqueChampionCount} recentChampionships={recentChampionships} />}{activeView === "champions" && <ChampionsClub rankings={rankings} uniqueChampionCount={uniqueChampionCount} />}{activeView === "hall-of-fame" && <section className="mt-8" aria-labelledby="hall-title"><HallOfFameResumeExplorer rankings={resumeRows} allTimeRankings={allTimeRows} championCount={uniqueChampionCount} completedSeasonCount={completedSeasons.length} activeFranchiseCount={activeFranchises.length} /></section>}{activeView === "trophy-room" && <section className="mt-8"><TrophyRoomExplorer /></section>}<div className="mt-10"><Link href="/" className={linkClass}>Return to Home</Link></div></main></SiteShell>;
}
