'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getLeagueInfoSectionForPath, LEAGUE_INFO_SECTION_ITEMS } from '@/lib/navigation/leagueInfoNavigation';

export default function LeagueInfoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/league-info';
  const activeSection = getLeagueInfoSectionForPath(pathname);

  return (
    <div className="min-w-0">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">League Info</p>
          <h1 className="mt-1 text-2xl font-black italic uppercase tracking-tight text-slate-950">River City League Hub</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Rules, history, draft resources, rivalries, and league tools.</p>
        </div>
        <nav aria-label="League Info sections" className="mx-auto mt-4 max-w-7xl overflow-x-auto px-4 pb-px sm:px-6 lg:px-8">
          <div className="flex min-w-max gap-1" role="list">
            {LEAGUE_INFO_SECTION_ITEMS.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-11 shrink-0 border-b-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 ${isActive ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
