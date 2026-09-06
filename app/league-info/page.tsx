import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Gavel, Landmark } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import constitutionData from '@/lib/constitutionData';
import { riverCityAuctionLeagueSettings } from '@/lib/auction/leagueSettings';
import { LEAGUE_ID } from '@/lib/sleeper';

const governanceSummary = constitutionData
  .find((section) => section.anchor === 'governance')
  ?.subsections?.find((subsection) => subsection.id === '1.1')
  ?.content?.[0] ?? 'The league is governed by the Commissioner and the Assistant to the Commissioner.';

const facts = [
  ['League', riverCityAuctionLeagueSettings.leagueName],
  ['Founded', '2011'],
  ['Home base', 'Richmond, VA'],
  ['Owners', `${riverCityAuctionLeagueSettings.teamCount}`],
  ['Scoring', 'Half-PPR'],
  ['Season', `${riverCityAuctionLeagueSettings.season}`],
] as const;

export default function LeagueInfoPage() {
  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section aria-labelledby="overview-title" className="border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Overview</p>
          <h2 id="overview-title" className="mt-2 max-w-3xl font-sans text-3xl font-black italic uppercase tracking-tight text-slate-950 sm:text-4xl">River City FFL at a glance</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">The public reference point for how the league is organized, what defines the current season, and where to find its records.</p>
        </section>

        <section className="mt-6" aria-labelledby="snapshot-title">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">The essentials</p>
          <h3 id="snapshot-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">League Snapshot</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {facts.map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><dt className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</dt><dd className="mt-2 break-words text-base font-black text-slate-950">{value}</dd></div>)}
          </dl>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="season-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 text-orange-600" size={22} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Right now</p><h3 id="season-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">Current Season</h3></div></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">The {riverCityAuctionLeagueSettings.season} league is the active River City season, represented by the current Sleeper league record.</p>
            <p className="mt-3 text-xs text-slate-500">Public league record: {LEAGUE_ID}</p>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest"><Link href="/league-info/draft" className="inline-flex min-h-11 items-center gap-2 text-orange-700 underline decoration-orange-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View draft details <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/league-info/draft-report/overview" className="inline-flex min-h-11 items-center gap-2 text-orange-700 underline decoration-orange-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View draft report cards <ArrowRight size={15} aria-hidden="true" /></Link></div>
          </section>

          <section aria-labelledby="format-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><BookOpen className="mt-0.5 text-blue-700" size={22} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">The game</p><h3 id="format-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">League Format</h3></div></div>
            <ul className="mt-4 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2"><li>{riverCityAuctionLeagueSettings.teamCount}-team keeper league</li><li>Auction draft</li><li>${riverCityAuctionLeagueSettings.auctionBudgetPerTeam} budget per team</li><li>Up to 2 keepers</li><li>16-player rosters</li><li>Half-PPR scoring</li><li>$200 FAAB</li></ul>
            <Link href="/league-info/constitution" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700 underline decoration-blue-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Read the Constitution <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>

          <section aria-labelledby="governance-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><Gavel className="mt-0.5 text-slate-700" size={22} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">How it is run</p><h3 id="governance-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">Governance</h3></div></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{governanceSummary} Rules and approved changes are recorded publicly.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-black uppercase tracking-widest"><Link href="/league-info/constitution" className="inline-flex min-h-11 items-center gap-2 text-slate-700 underline decoration-slate-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700">Constitution <ArrowRight size={15} aria-hidden="true" /></Link><Link href="/league-info/legislative" className="inline-flex min-h-11 items-center gap-2 text-orange-700 underline decoration-orange-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Legislation <ArrowRight size={15} aria-hidden="true" /></Link></div>
          </section>

          <section aria-labelledby="history-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3"><Landmark className="mt-0.5 text-emerald-700" size={22} aria-hidden="true" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">The identity</p><h3 id="history-title" className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">History</h3></div></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">River City FFL’s records begin with the 2011 season. Champions, standings, and league milestones live in the historical record.</p>
            <Link href="/history" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700 underline decoration-emerald-300 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Explore league history <ArrowRight size={15} aria-hidden="true" /></Link>
          </section>
        </div>

      </main>
    </SiteShell>
  );
}
