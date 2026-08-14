import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  ArrowRightLeft,
  DollarSign,
  FileText,
  Gavel,
  Grid3X3,
  Scale,
  Swords,
  Trophy,
} from 'lucide-react';
import SiteShell from '@/components/SiteShell';

const cards = [
  { title: 'Constitution', description: 'League rules and approved amendments.', href: '/league-info/constitution', icon: Scale, accent: 'text-blue-700', tint: 'bg-blue-50' },
  { title: 'Payouts', description: 'Current-season finance and historical payouts.', href: '/league-info/payouts', icon: DollarSign, accent: 'text-emerald-700', tint: 'bg-emerald-50' },
  { title: 'Draft Board', description: 'Draft-day board and Sleeper draft information.', href: '/league-info/draft', icon: Grid3X3, accent: 'text-green-700', tint: 'bg-green-50' },
  { title: 'Archives', description: 'Historical drafts, transactions, and league records.', href: '/league-info/archives', icon: Archive, accent: 'text-slate-600', tint: 'bg-slate-100' },
  { title: 'Resources', description: 'Useful league references and tools.', href: '/league-info/resources', icon: FileText, accent: 'text-purple-700', tint: 'bg-purple-50' },
  { title: 'Rivalries', description: 'Calculated and recognized rivalry history.', href: '/league-info/rivalries', icon: Swords, accent: 'text-red-700', tint: 'bg-red-50' },
  { title: 'Trophy Room', description: 'Champions, podium finishes, and league honors.', href: '/league-info/trophy-room', icon: Trophy, accent: 'text-amber-700', tint: 'bg-amber-50' },
  { title: 'Trade Analyzer', description: 'The existing trade-evaluation tool.', href: '/league-info/analyzer', icon: ArrowRightLeft, accent: 'text-orange-700', tint: 'bg-orange-50' },
  { title: 'Legislative Hub', description: 'Submit proposals, follow league meeting business, vote when eligible, and review session history.', href: '/league-info/legislative', icon: Gavel, accent: 'text-orange-700', tint: 'bg-orange-50' },
  { title: 'Matchups', description: 'Weekly head-to-heads, starters, projected scores, Series History, and playoffs.', href: '/matchups', icon: Swords, accent: 'text-blue-700', tint: 'bg-blue-50' },
] as const;

export default function LeagueInfoPage() {
  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="league-info-title">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info</p>
          <h1 id="league-info-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">
            River City League Hub
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Rules, payouts, draft resources, archives, rivalries, awards, and league tools in one place.
          </p>
        </section>

        <section className="mt-6" aria-labelledby="league-destinations-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Explore the league</p>
              <h2 id="league-destinations-title" className="mt-1 font-sans text-2xl font-black italic uppercase tracking-tight text-slate-950">League destinations</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ title, description, href, icon: Icon, accent, tint }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-52 min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 sm:p-6"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint} ${accent}`}>
                  <Icon size={21} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-black italic uppercase tracking-tight text-slate-950">{title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">{description}</p>
                <span className={`mt-auto flex items-center gap-2 pt-5 text-xs font-black uppercase tracking-widest ${accent}`}>
                  Open {title} <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
