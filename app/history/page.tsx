import Link from 'next/link';
import SiteShell from '@/components/SiteShell';
import { calculateAllTimeStats } from '../../lib/stats';

export default function HistoryPage() {
  const rankings = calculateAllTimeStats();

  return (
    <SiteShell activePath="/history">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="history-title">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League History</p>
          <h1 id="history-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">
            River City Hall of Fame
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Championships, finishes, and seasons across River City FFL history.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="hall-of-fame-heading">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Hall of Fame</p>
            <h2 id="hall-of-fame-heading" className="mt-1 font-sans text-2xl font-black italic uppercase tracking-tight text-slate-950">
              All-Time Rankings
            </h2>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full">
              <caption className="sr-only">River City FFL all-time Hall of Fame rankings</caption>
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Rank</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Manager</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Titles 💍</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Avg Finish</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Seasons</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((manager, index) => (
                  <tr key={manager.manager} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 focus-within:bg-slate-50">
                    <td className="px-6 py-5 align-top text-lg font-black italic text-slate-400">{index + 1}</td>
                    <th scope="row" className="px-6 py-5 text-left font-bold text-slate-900">{manager.manager}</th>
                    <td className="px-6 py-5 text-center align-top">
                      <span className={`font-black ${manager.wins > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{manager.wins}</span>
                      {manager.titles.length > 0 && <div className="mt-1 text-xs font-medium text-slate-500">{manager.titles.join(', ')}</div>}
                    </td>
                    <td className="px-6 py-5 text-center align-top text-slate-700">{manager.avgRank}</td>
                    <td className="px-6 py-5 text-center align-top text-slate-500">{manager.seasons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden" aria-label="Hall of Fame rankings">
            {rankings.map((manager, index) => (
              <article key={manager.manager} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg font-black italic text-slate-400" aria-label={`Rank ${index + 1}`}>#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-bold text-slate-900">{manager.manager}</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Titles</dt><dd className={`mt-1 font-black ${manager.wins > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{manager.wins}</dd></div>
                      <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Title years</dt><dd className="mt-1 break-words text-slate-700">{manager.titles.length > 0 ? manager.titles.join(', ') : '—'}</dd></div>
                      <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Avg Finish</dt><dd className="mt-1 text-slate-700">{manager.avgRank}</dd></div>
                      <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Seasons</dt><dd className="mt-1 text-slate-700">{manager.seasons}</dd></div>
                    </dl>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Link href="/" className="mt-6 inline-flex rounded-lg px-2 py-2 text-sm font-bold text-orange-600 transition hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
          Return to Home
        </Link>
      </main>
    </SiteShell>
  );
}
