'use client';

import Image from 'next/image';
import type { RecommendedNowResult } from '@/lib/auction/recommendedNow';

const positionStyles: Record<string, string> = {
  QB: 'bg-orange-600/15 text-orange-700 dark:text-orange-300',
  RB: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300',
  WR: 'bg-blue-600/15 text-blue-700 dark:text-blue-300',
  TE: 'bg-purple-600/15 text-purple-700 dark:text-purple-300',
  K: 'bg-yellow-600/15 text-yellow-700 dark:text-yellow-300',
  DEF: 'bg-slate-600/15 text-slate-700 dark:text-slate-300',
};

const categoryStyles: Record<string, string> = {
  'BEST OVERALL': 'border-orange-600/25 bg-orange-600/10 text-orange-700 dark:text-orange-300',
  'BEST VALUE': 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
  'ROSTER FIT': 'border-blue-600/25 bg-blue-600/10 text-blue-700 dark:text-blue-300',
  'SCARCITY PLAY': 'border-purple-600/25 bg-purple-600/10 text-purple-700 dark:text-purple-300',
  'BUDGET PLAY': 'border-cyan-600/25 bg-cyan-600/10 text-cyan-700 dark:text-cyan-300',
};

function money(value: number | null) {
  return value === null ? '—' : `$${Math.round(value)}`;
}

export default function RecommendedNow({ result, loading, error }: {
  result: RecommendedNowResult | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-orange-600/25 bg-white p-4 shadow-sm dark:bg-[#121212]" aria-labelledby="recommended-now-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">Private War Room Intelligence</p>
          <h2 id="recommended-now-heading" className="mt-1 text-xl font-black uppercase italic">Recommended Now</h2>
        </div>
        <p className="text-[10px] font-bold text-black/45 dark:text-white/45">Up to six distinct decision lanes · {result?.version ?? 'WR M12'}</p>
      </div>

      {loading && <p className="rounded-xl border border-black/10 bg-black/[0.03] p-4 text-xs font-bold text-black/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">Refreshing current available-player read…</p>}
      {error && !loading && <p className="rounded-xl border border-rose-600/20 bg-rose-600/10 p-4 text-xs font-bold text-rose-700 dark:text-rose-300">{error} Core War Room controls remain available.</p>}
      {!loading && !error && result && result.recommendations.length === 0 && <p className="rounded-xl border border-black/10 bg-black/[0.03] p-4 text-xs font-bold text-black/55 dark:border-white/10 dark:bg-white/5 dark:text-white/55">No defensible available-player recommendation is ready yet.</p>}

      {!loading && !error && result && result.recommendations.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.recommendations.map((recommendation, index) => (
            <article key={recommendation.playerId} className="min-w-0 rounded-xl border border-black/10 bg-black/[0.025] p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#071a33] text-xs font-black text-white">{index + 1}</span>
                <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${categoryStyles[recommendation.category] ?? 'border-black/10 bg-black/5 text-black/60'}`}>{recommendation.category}</span>
              </div>
              <div className="flex min-w-0 gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/5">
                  <Image src={recommendation.headshotUrl} alt="" fill sizes="56px" className="object-cover object-top" unoptimized />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black uppercase">{recommendation.playerName}</h3>
                  <div className="mt-1 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-black/50 dark:text-white/50">
                    <span className={`rounded px-1.5 py-0.5 ${positionStyles[recommendation.position ?? ''] ?? 'bg-black/10'}`}>{recommendation.position ?? '—'}</span>
                    <span>{recommendation.nflTeam ?? 'NFL —'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-y border-black/10 py-2 dark:border-white/10">
                <div><p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">Auction</p><p className="mt-1 text-sm font-black">{money(recommendation.auctionConsensus)}</p></div>
                <div><p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">ADP</p><p className="mt-1 text-sm font-black">{recommendation.adp === null ? '—' : recommendation.adp.toFixed(1)}</p></div>
                <div><p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">Budget</p><p className="mt-1 text-[9px] font-black uppercase">{recommendation.affordability}</p></div>
              </div>
              <p className="mt-3 text-[10px] font-medium leading-4 text-black/65 dark:text-white/65"><span className="font-black uppercase tracking-widest text-black/40 dark:text-white/40">Why: </span>{recommendation.why}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[8px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
                <span>Target {money(recommendation.targetLow)}–{money(recommendation.targetHigh)}</span>
                <span>Stretch {money(recommendation.stretchMax)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
