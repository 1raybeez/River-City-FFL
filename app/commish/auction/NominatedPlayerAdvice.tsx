'use client';

import type { NominatedPlayerAdvice as NominatedPlayerAdviceResult } from '@/lib/auction/nominationAdvisor';

function money(value: number | null) {
  return value === null ? '—' : `$${Math.round(value)}`;
}

const stateStyles = {
  BUY: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
  STRETCH: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  PASS: 'border-rose-600/25 bg-rose-600/10 text-rose-700 dark:text-rose-300',
  UNAVAILABLE: 'border-black/10 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300',
} as const;

export default function NominatedPlayerAdvice({ advice }: { advice: NominatedPlayerAdviceResult }) {
  return (
    <div className={`rounded-3xl border px-5 py-5 ${stateStyles[advice.recommendationState]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-70">River City Advice</p>
          <p className="mt-2 text-3xl font-black uppercase italic leading-none tracking-tight">{advice.recommendationState}</p>
          <p className="mt-2 truncate text-sm font-black uppercase">{advice.player.playerName}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest opacity-70">
            {advice.player.position ?? 'N/A'} · {advice.player.nflTeam ?? 'N/A'}
          </p>
        </div>
        <div className="grid min-w-[130px] gap-2 text-right text-[9px] font-black uppercase tracking-widest">
          <span>Current Bid <strong className="ml-1 text-base tracking-normal">{money(advice.currentBid)}</strong></span>
          <span>Recommended Max <strong className="ml-1 text-base tracking-normal">{money(advice.recommendedMax)}</strong></span>
          <span>Private Max <strong className="ml-1 text-base tracking-normal">{money(advice.privateMax)}</strong></span>
          <span>Budget-Safe Max <strong className="ml-1 text-base tracking-normal">{money(advice.budgetSafeMax)}</strong></span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-y border-current/10 py-3 text-[9px] font-black uppercase tracking-widest sm:grid-cols-4">
        <span>Entry {money(advice.targetLow)}</span>
        <span>Auction {money(advice.auctionConsensus)}</span>
        <span>ADP {advice.adp === null ? '—' : advice.adp.toFixed(1)}</span>
        <span>{advice.recommendationCategory ? `${advice.recommendationCategory}${advice.recommendationRank ? ` #${advice.recommendationRank}` : ''}` : 'No category card'}</span>
      </div>
      {advice.reasons.length > 0 ? <p className="mt-3 text-[10px] font-medium leading-4"><span className="font-black uppercase tracking-widest opacity-60">Why: </span>{advice.reasons.join(' ')}</p> : null}
      {advice.warnings.length > 0 ? <p className="mt-2 text-[10px] font-bold leading-4 opacity-80">{advice.warnings.join(' ')}</p> : null}
    </div>
  );
}
