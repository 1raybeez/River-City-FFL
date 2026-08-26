'use client';

import type { RecommendedNowResult } from '@/lib/auction/recommendedNow';

function money(value: number | null) {
  return value === null ? '—' : `$${Math.round(value)}`;
}

const shortCategory: Record<string, string> = {
  'BEST OVERALL': 'Best Overall',
  'BEST VALUE': 'Best Value',
  'ROSTER FIT': 'Roster Fit',
  'SCARCITY PLAY': 'Scarcity',
  'UPSIDE PLAY': 'Upside',
  'BUDGET PLAY': 'Budget',
};

const tacticalCategories = new Set(['BEST OVERALL', 'BEST VALUE', 'ROSTER FIT', 'SCARCITY PLAY', 'BUDGET PLAY']);

export default function RecommendedNow({ result, loading, error, onSelectPlayer, selectedPlayerId }: {
  result: RecommendedNowResult | null;
  loading: boolean;
  error: string | null;
  onSelectPlayer: (playerId: string) => void;
  selectedPlayerId: string | null;
}) {
  return (
    <section className="rounded-2xl border border-orange-600/20 bg-white px-3 py-2 shadow-sm dark:bg-[#121212]" aria-labelledby="recommended-now-heading">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <div className="col-span-2 flex min-w-0 items-center border-b border-black/10 pb-1 pr-3 dark:border-white/10 lg:col-span-1 lg:border-b-0 lg:border-r lg:pb-0">
          <p id="recommended-now-heading" className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-600">Quick Picks</p>
          <p className="ml-2 truncate text-[8px] font-bold uppercase tracking-widest text-gray-400">Live tactical lanes</p>
        </div>
        {loading ? <p className="col-span-2 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 lg:col-span-4">Refreshing…</p> : null}
        {error && !loading ? <p className="col-span-2 px-2 text-[10px] font-bold text-rose-600 lg:col-span-4">{error}</p> : null}
        {!loading && !error && result?.recommendations.filter((recommendation) => tacticalCategories.has(recommendation.category)).map((recommendation) => (
          <button
            key={recommendation.playerId}
            type="button"
            aria-pressed={selectedPlayerId === recommendation.playerId}
            aria-label={`Select ${recommendation.playerName}, ${shortCategory[recommendation.category] ?? recommendation.category}`}
            onClick={() => onSelectPlayer(recommendation.playerId)}
            className={`min-w-0 rounded-xl border px-2 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${selectedPlayerId === recommendation.playerId ? 'border-orange-600/50 bg-orange-600/10' : 'border-black/10 bg-black/[0.025] hover:border-orange-600/30 dark:border-white/10 dark:bg-white/[0.04]'}`}
          >
            <p className="text-[8px] font-black uppercase tracking-widest text-orange-600">{shortCategory[recommendation.category] ?? recommendation.category}</p>
            <p className="mt-1 truncate text-xs font-black uppercase italic">{recommendation.playerName}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              {recommendation.position ?? '—'} · {money(recommendation.auctionConsensus)}{recommendation.category === 'BEST VALUE' ? ' value' : ''}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
