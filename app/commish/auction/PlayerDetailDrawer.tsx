'use client';

import { useEffect, useState } from 'react';
import { Gavel, History, Info, MessageCircle, RefreshCw, Save, Target, Trash2, X } from 'lucide-react';
import type { SoldPlayerState } from '@/lib/auction/soldPlayerState';
import type { AuctionTeamId } from '@/lib/auction/types';

type DrawerTab = 'overview' | 'plan' | 'history' | 'coach';
type PreferenceTag = 'open' | 'target' | 'watch' | 'fade';

type HistoricalSeasonRow = {
  season: number;
  expectedValue: number | null;
  actualSalePrice: number | null;
  difference: number | null;
  differencePercent: number | null;
  buyerName: string | null;
  teamName: string | null;
  result: string;
  isKeeper: boolean;
};

type ValueSheetOnlySeason = {
  season: number;
  expectedValue: number | null;
};


type CoachMessage = {
  id: string;
  question: string;
  answer: string;
  buddyMessage: string;
  decision: string;
  timestamp: string;
  sourceLabel: string;
  budgetPace: {
    label: string;
    message: string;
  };
  riskGuidance: string;
  spendGuidance: {
    mustReserve: number;
    rosterMinimumReserve: number;
    strategicReserve: number | null;
    effectiveReserve: number;
    suggestedNextBid?: number;
    justifiedOverpayAmount?: number;
  };
  intelSummary: string[];
  reasons: string[];
  warnings: string[];
};

type CoachState = {
  messages: CoachMessage[];
  input: string;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
};

export type PlayerDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  saleComplete: SoldPlayerState | null;
  player: {
    sleeperPlayerId: string | null;
    name: string;
    position: string | null;
    nflTeam: string | null;
    byeWeek: number | null;
    status: string | null;
    lowValue: number | null;
    averageValue: number | null;
    highValue: number | null;
    adp: number | null;
    demandTier: string | null;
    sourceCount: number | null;
    confidenceScore: number | null;
  } | null;
  recommendation: {
    decision: string;
    recommendedMax: number | null;
    currentAiCeiling: number | null;
    predictedWinningBid: number | null;
    legalMax: number | null;
    marketValue: number | null;
    reasons: string[];
    warnings: string[];
  } | null;
  history: {
    seasonsCompared: number;
    pricingStyle: string;
    trend: string;
    averageExpectedValue: number | null;
    averageActualPrice: number | null;
    averageDifference: number | null;
    averageDifferencePercent: number | null;
    recentAverageActual: number | null;
    mostRecentActualPrice: number | null;
    lowestActualPrice: number | null;
    highestActualPrice: number | null;
    verdict: string;
    seasons: HistoricalSeasonRow[];
    valueSheetOnlySeasons: ValueSheetOnlySeason[];
    warnings: string[];
  } | null;
  plan: {
    tag: PreferenceTag;
    preferredEntry: string;
    plannedCap: string;
    note: string;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    error: string | null;
  };
  onTagChange: (tag: PreferenceTag) => void;
  onPreferredEntryChange: (value: string) => void;
  onPlannedCapChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSavePlan: () => void;
  onClearPlan: () => void;
  coach: CoachState;
  onCoachInputChange: (value: string) => void;
  onAskCoach: (question: string) => void | Promise<void>;
  onClearCoach: () => void;
  sale: {
    canRecordSale: boolean;
    buyerOptions: Array<{
      id: AuctionTeamId;
      label: string;
    }>;
    selectedBuyer: AuctionTeamId | '';
    price: string;
    canSubmit: boolean;
    validationMessage: string | null;
    purchase: {
      teamName: string;
      managerName: string | null;
      price: number;
    } | null;
  };
  onBuyerChange: (teamId: AuctionTeamId | '') => void;
  onSalePriceChange: (value: string) => void;
  onRecordSale: () => void;
};

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

function signedMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  if (value > 0) return `+${money(value)}`;
  if (value < 0) return `-${money(Math.abs(value))}`;
  return '$0';
}

function percent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return 'N/A';
  const formatted = Math.round(value * 1000) / 10;
  return `${formatted > 0 ? '+' : ''}${Number.isInteger(formatted) ? formatted : formatted.toFixed(1)}%`;
}

function decisionClass(decision: string) {
  if (decision === 'BID' || decision === 'BID NOW' || decision === 'BUY NOW') {
    return 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }
  if (decision === 'PASS' || decision === 'LET HIM GO' || decision === 'DO NOT BID') {
    return 'border-rose-600/25 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }
  return 'border-orange-600/25 bg-orange-600/10 text-orange-700 dark:text-orange-300';
}

function resultClass(result: string) {
  if (result === 'bargain') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }
  if (result === 'overpay') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }
  if (result === 'fair') {
    return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }
  return 'border-black/10 bg-black/[0.03] text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300';
}

function headshotUrl(playerId: string | null) {
  return playerId
    ? `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
    : null;
}

function normalizedStatus(status: string | null) {
  if (!status || status.toLowerCase() === 'none') return 'Available';
  return status;
}

function SaleCompleteSummary({
  saleComplete,
}: {
  saleComplete: SoldPlayerState;
}) {
  return (
    <section className="rounded-2xl border border-emerald-600/25 bg-emerald-600/10 p-4 text-emerald-700 dark:text-emerald-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] opacity-70">
            Sale Complete
          </p>
          <p className="mt-1 text-3xl font-black uppercase italic tracking-tight">
            {saleComplete.statusLabel}
          </p>
          <p className="mt-2 text-sm font-black uppercase">
            {saleComplete.teamName}
          </p>
          {saleComplete.managerName ? (
            <p className="mt-0.5 text-xs font-bold">
              {saleComplete.managerName}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-2xl font-black">{money(saleComplete.price)}</p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-widest opacity-70">
            {saleComplete.sourceLabel}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['Vs Market', saleComplete.marketValueDifference],
          ['Vs Expected', saleComplete.expectedSaleDifference],
          ['Vs Ceiling', saleComplete.recommendationCeilingDifference],
        ].map(([label, difference]) => (
          <div
            key={label as string}
            className="rounded-xl bg-white/55 p-2.5 text-center dark:bg-black/20"
          >
            <p className="text-[8px] font-black uppercase tracking-widest opacity-60">
              {label}
            </p>
            <p className="mt-1 text-sm font-black">
              {signedMoney(difference as number | null)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeCoachQuestion(questionText: string) {
  return questionText
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9$]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCoachActionAmountLabel(questionText: string) {
  const normalizedQuestion = normalizeCoachQuestion(questionText);

  if (
    /\b(alternative|alternatives|instead|similar|comparable)\b/.test(
      normalizedQuestion
    ) ||
    normalizedQuestion.includes('who else') ||
    normalizedQuestion.includes('other options')
  ) {
    return 'Top Alternative Max';
  }

  if (
    normalizedQuestion.includes('remaining budget') ||
    normalizedQuestion.includes('affect my budget') ||
    normalizedQuestion.includes('budget impact')
  ) {
    return 'Assumed Purchase Price';
  }

  if (normalizedQuestion.includes('nominate')) {
    return 'Comfortable Winning Up To';
  }

  if (
    /\$\s*\d+/.test(questionText) ||
    normalizedQuestion.includes('highest') ||
    normalizedQuestion.includes('recommended max') ||
    normalizedQuestion.includes('max bid') ||
    normalizedQuestion.includes('ceiling')
  ) {
    return 'Recommended Max';
  }

  return 'Suggested Next Bid';
}

export function PlayerDetailDrawer({
  open,
  onClose,
  saleComplete,
  player,
  recommendation,
  history,
  plan,
  onTagChange,
  onPreferredEntryChange,
  onPlannedCapChange,
  onNoteChange,
  onSavePlan,
  onClearPlan,
  coach,
  onCoachInputChange,
  onAskCoach,
  onClearCoach,
  sale,
  onBuyerChange,
  onSalePriceChange,
  onRecordSale,
}: PlayerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (open) setActiveTab('overview');
  }, [open, player?.sleeperPlayerId]);

  if (!open || !player) return null;

  const imageUrl = headshotUrl(player.sleeperPlayerId);
  const marketValue = recommendation?.marketValue ?? player.averageValue;
  const recommendedMax = recommendation?.recommendedMax ?? null;
  const expectedSale = recommendation?.predictedWinningBid ?? null;
  const plannedCapAmount = /^\d+$/.test(plan.plannedCap.trim())
    ? Number(plan.plannedCap.trim())
    : null;
  const playerFirstName = player.name.split(/\s+/)[0] ?? player.name;
  const coachQuickQuestions = saleComplete
    ? [
        `How should I evaluate the ${saleComplete.statusLabel.toLowerCase()} price for ${player.name}?`,
        `Was ${player.name} a value at ${money(saleComplete.price)}?`,
        `How does this sale affect the remaining market?`,
        `Who are the best available alternatives to ${player.name}?`,
      ]
    : [
        `Should I bid on ${player.name}?`,
        `What is the highest I should go on ${player.name}?`,
        `Is ${recommendedMax === null ? 'the current price' : money(recommendedMax)} too much for ${player.name}?`,
        `Should I nominate ${player.name}?`,
        `Who are the best alternatives to ${player.name}?`,
        `How would buying ${player.name} affect my remaining budget?`,
      ];
  const tabs: Array<{ id: DrawerTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'plan', label: 'Draft Plan' },
    { id: 'history', label: 'History' },
    { id: 'coach', label: 'AI Coach' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 lg:p-6">
      <button
        type="button"
        aria-label="Close player details"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} player details`}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f6f6f4] shadow-2xl dark:bg-[#101010] sm:h-auto sm:max-h-[92vh] sm:max-w-[900px] sm:rounded-[2rem] sm:border sm:border-black/10 dark:sm:border-white/10 lg:max-w-[980px]"
      >
        <header className="border-b border-black/10 bg-white px-5 pb-4 pt-5 dark:border-white/10 dark:bg-[#151515] sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden rounded-2xl bg-black/5 dark:bg-white/10">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="pb-5 text-xl font-black text-gray-400">
                    {player.position ?? '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-600">
                  Player Detail
                </p>
                <h2 className="mt-1 truncate text-2xl font-black uppercase italic tracking-tight">
                  {player.name}
                </h2>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {player.position ?? 'N/A'} · {player.nflTeam ?? 'N/A'} · Bye {player.byeWeek ?? 'N/A'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-black/5 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {normalizedStatus(player.status)}
                  </span>
                  {plan.tag !== 'open' ? (
                    <span className="rounded-full bg-orange-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                      {plan.tag}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-black/10 bg-black/[0.03] p-2 text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.04]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {saleComplete ? (
            <div className="mt-4">
              <SaleCompleteSummary saleComplete={saleComplete} />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Market Value</p>
                <p className="mt-1 text-xl font-black">{money(marketValue)}</p>
              </div>
              <div className="rounded-xl bg-orange-600/10 p-3 text-orange-700 dark:text-orange-300">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Recommended Max</p>
                <p className="mt-1 text-xl font-black">{money(recommendedMax)}</p>
              </div>
              <div className="rounded-xl bg-blue-600/10 p-3 text-blue-700 dark:text-blue-300">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Expected Sale</p>
                <p className="mt-1 text-xl font-black">{money(expectedSale)}</p>
              </div>
            </div>
          )}
        </header>

        <nav className="grid grid-cols-4 border-b border-black/10 bg-white px-2 dark:border-white/10 dark:bg-[#151515] sm:px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-2 py-3 text-[9px] font-black uppercase tracking-widest transition ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {sale.canRecordSale ? (
                <section className="rounded-2xl border border-orange-600/20 bg-white p-4 shadow-sm dark:bg-[#171717]">
                  <div className="mb-3 flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">
                        Record Sale
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                        Player locked to {player.name}
                      </p>
                    </div>
                  </div>

                  {sale.purchase ? (
                    <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 p-4 text-emerald-700 dark:text-emerald-300">
                      <p className="text-[9px] font-black uppercase tracking-widest">
                        Sold
                      </p>
                      <p className="mt-1 text-lg font-black uppercase italic">
                        {sale.purchase.teamName} · {money(sale.purchase.price)}
                      </p>
                      {sale.purchase.managerName ? (
                        <p className="mt-1 text-xs font-bold">
                          {sale.purchase.managerName}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <form
                      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onRecordSale();
                      }}
                    >
                      <label className="grid gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Buyer
                        </span>
                        <select
                          value={sale.selectedBuyer}
                          onChange={(event) =>
                            onBuyerChange(event.target.value as AuctionTeamId | '')
                          }
                          className="h-11 min-w-0 rounded-xl border border-black/10 bg-black/[0.025] px-3 text-sm font-black outline-none focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                        >
                          <option value="">Select buyer</option>
                          {sale.buyerOptions.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Sale Price
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          value={sale.price}
                          onChange={(event) => onSalePriceChange(event.target.value)}
                          placeholder="$"
                          className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.025] px-3 text-center text-sm font-black outline-none focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!sale.canSubmit}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-black/[0.06] disabled:text-gray-400 dark:disabled:bg-white/[0.06]"
                      >
                        <Gavel className="h-4 w-4" />
                        Record Sale
                      </button>
                      {sale.validationMessage ? (
                        <p className="rounded-xl border border-rose-600/20 bg-rose-600/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300 sm:col-span-3">
                          {sale.validationMessage}
                        </p>
                      ) : null}
                    </form>
                  )}
                </section>
              ) : null}

              {saleComplete ? (
                <SaleCompleteSummary saleComplete={saleComplete} />
              ) : (
                <section className={`rounded-2xl border p-5 text-center ${decisionClass(recommendation?.decision ?? 'WAIT')}`}>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">Recommendation</p>
                  <p className="mt-2 text-4xl font-black uppercase italic tracking-tight">
                    {recommendation?.decision ?? 'WAIT'}
                  </p>
                  <p className="mt-2 text-xs font-bold opacity-80">
                    Recommended Max {money(recommendedMax)} · Expected Sale {money(expectedSale)}
                  </p>
                </section>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('coach')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700"
              >
                <MessageCircle className="h-4 w-4" />
                {saleComplete
                  ? 'Review Sale With Coach'
                  : `Ask Coach About ${playerFirstName}`}
              </button>

              {!saleComplete ? (
              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <div className="mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest">What the numbers mean</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Market Value</p>
                    <p className="mt-1 text-sm font-black">{money(marketValue)}</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                      Baseline consensus from the published auction-value sources.
                    </p>
                  </div>
                  <div className="rounded-xl bg-orange-600/10 p-3 text-orange-800 dark:text-orange-200">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Recommended Max</p>
                    <p className="mt-1 text-sm font-black">{money(recommendedMax)}</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed opacity-80">
                      The War Room’s one primary personalized bidding ceiling.
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-600/10 p-3 text-blue-800 dark:text-blue-200">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Expected Sale</p>
                    <p className="mt-1 text-sm font-black">{money(expectedSale)}</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed opacity-80">
                      The estimated price the room is likely to pay today.
                    </p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Your Planned Cap</p>
                    <p className="mt-1 text-sm font-black">{money(plannedCapAmount)}</p>
                    <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                      Your saved pre-draft plan. It can be changed as the auction develops.
                    </p>
                  </div>
                </div>
                <details className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Advanced live guardrails
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Live Context Ceiling</p>
                      <p className="mt-1 text-sm font-black">{money(recommendation?.currentAiCeiling ?? null)}</p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                        A secondary draft-day stress test. It does not replace Recommended Max.
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Legal Max</p>
                      <p className="mt-1 text-sm font-black">{money(recommendation?.legalMax ?? null)}</p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                        Budget math only: the most you can spend and still complete a legal roster.
                      </p>
                    </div>
                  </div>
                </details>
              </section>
              ) : null}

              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Source Range — not separate recommendations</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Low</p>
                    <p className="mt-1 text-lg font-black">{money(player.lowValue)}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Average</p>
                    <p className="mt-1 text-lg font-black">{money(player.averageValue)}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">High</p>
                    <p className="mt-1 text-lg font-black">{money(player.highValue)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">ADP</p>
                    <p className="mt-1 font-black">{player.adp === null ? 'N/A' : player.adp.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Demand</p>
                    <p className="mt-1 font-black">{player.demandTier ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Sources</p>
                    <p className="mt-1 font-black">{player.sourceCount ?? 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Confidence</p>
                    <p className="mt-1 font-black">{player.confidenceScore === null ? 'N/A' : `${Math.round(player.confidenceScore)}%`}</p>
                  </div>
                </div>
              </section>

              {!saleComplete && recommendation?.reasons.length ? (
                <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Why</p>
                  <ul className="space-y-2">
                    {recommendation.reasons.slice(0, 6).map((reason) => (
                      <li key={reason} className="text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {!saleComplete && recommendation?.warnings.length ? (
                <section className="rounded-2xl border border-rose-600/20 bg-rose-600/10 p-4 text-rose-700 dark:text-rose-300">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest">Warnings</p>
                  <ul className="space-y-2">
                    {recommendation.warnings.slice(0, 5).map((warning) => (
                      <li key={warning} className="text-sm font-bold leading-relaxed">{warning}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'plan' ? (
            <div className="space-y-4">
              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-600" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Preference</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['open', 'target', 'watch', 'fade'] as PreferenceTag[]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onTagChange(tag)}
                      className={`rounded-xl border px-2 py-2 text-[9px] font-black uppercase tracking-widest transition ${
                        plan.tag === tag
                          ? 'border-orange-600 bg-orange-600 text-white'
                          : 'border-black/10 bg-black/[0.03] text-gray-500 dark:border-white/10 dark:bg-white/[0.04]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Preferred Entry</span>
                    <input
                      inputMode="numeric"
                      value={plan.preferredEntry}
                      onChange={(event) => onPreferredEntryChange(event.target.value)}
                      placeholder="$"
                      className="rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2.5 text-sm font-black outline-none focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Planned Cap</span>
                    <input
                      inputMode="numeric"
                      value={plan.plannedCap}
                      onChange={(event) => onPlannedCapChange(event.target.value)}
                      placeholder="$"
                      className="rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2.5 text-sm font-black outline-none focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    />
                  </label>
                </div>
                <label className="mt-3 grid gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Notes</span>
                  <textarea
                    value={plan.note}
                    onChange={(event) => onNoteChange(event.target.value)}
                    rows={5}
                    placeholder="Draft-day plan, nomination idea, or reminder..."
                    className="resize-none rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                  />
                </label>
              </section>

              {saleComplete ? (
                <SaleCompleteSummary saleComplete={saleComplete} />
              ) : (
                <section className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Market Value</p>
                    <p className="mt-1 text-sm font-black">{money(marketValue)}</p>
                  </div>
                  <div className="rounded-xl bg-orange-600/10 p-3 text-orange-800 dark:text-orange-200">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Recommended Max</p>
                    <p className="mt-1 text-sm font-black">{money(recommendedMax)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-600/10 p-3 text-blue-800 dark:text-blue-200">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Expected Sale</p>
                    <p className="mt-1 text-sm font-black">{money(expectedSale)}</p>
                  </div>
                </section>
              )}

              {plan.error ? (
                <p className="rounded-xl border border-rose-600/20 bg-rose-600/10 p-3 text-sm font-bold text-rose-700 dark:text-rose-300">
                  {plan.error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onSavePlan}
                  disabled={plan.saveStatus === 'saving'}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {plan.saveStatus === 'saving' ? 'Saving' : plan.saveStatus === 'saved' ? 'Saved' : 'Save Plan'}
                </button>
                <button
                  type="button"
                  onClick={onClearPlan}
                  className="rounded-xl border border-black/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 transition hover:border-rose-600 hover:text-rose-600 dark:border-white/10"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {activeTab === 'coach' ? (
            <div className="space-y-4">
              <section className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-4 text-orange-900 dark:text-orange-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-orange-600">
                      Player-Locked AI Draft Coach
                    </p>
                    <h3 className="mt-1 text-xl font-black uppercase italic tracking-tight">
                      {saleComplete
                        ? `Review Sale: ${player.name}`
                        : `Ask About ${player.name}`}
                    </h3>
                    <p className="mt-2 max-w-2xl text-xs font-bold leading-relaxed text-orange-800/80 dark:text-orange-200/80">
                      {saleComplete
                        ? `${player.name} is already ${saleComplete.statusLabel === 'KEEPER' ? 'rostered as a keeper' : 'sold'}. Questions stay locked to post-sale review and available-player implications.`
                        : `Questions from this tab stay locked to ${player.name}. This is the same shared conversation used by the floating robot.`}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-orange-600/20 bg-white/55 px-3 py-1.5 text-[8px] font-black uppercase tracking-widest dark:bg-black/20">
                    {coach.status === 'loading' ? 'Thinking' : `${coach.messages.length} message${coach.messages.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                {saleComplete ? (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Status</p>
                      <p className="mt-1 text-lg font-black">{saleComplete.statusLabel}</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Team</p>
                      <p className="mt-1 truncate text-sm font-black">{saleComplete.teamName}</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Price</p>
                      <p className="mt-1 text-lg font-black">{money(saleComplete.price)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Market</p>
                      <p className="mt-1 text-lg font-black">{money(marketValue)}</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Recommended Max</p>
                      <p className="mt-1 text-lg font-black">{money(recommendedMax)}</p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3 dark:bg-black/20">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Expected Sale</p>
                      <p className="mt-1 text-lg font-black">{money(expectedSale)}</p>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Suggested Questions</p>
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">Tap one or ask your own question below.</p>
                  </div>
                  {coach.messages.length > 0 ? (
                    <button
                      type="button"
                      onClick={onClearCoach}
                      className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:bg-rose-600/10 hover:text-rose-600 dark:text-gray-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear Shared Chat
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {coachQuickQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void onAskCoach(question)}
                      disabled={coach.status === 'loading'}
                      className="rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <form
                  className="mt-4 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const question = coach.input.trim();
                    if (!question) return;
                    void onAskCoach(question);
                  }}
                >
                  <input
                    type="text"
                    value={coach.input}
                    onChange={(event) => onCoachInputChange(event.target.value)}
                    placeholder={
                      saleComplete
                        ? `Review the sale of ${player.name}`
                        : `Ask the Coach about ${player.name}`
                    }
                    disabled={coach.status === 'loading'}
                    className="min-h-11 flex-1 rounded-xl border border-black/10 bg-black/[0.025] px-3 py-2 text-sm font-bold text-black outline-none transition placeholder:text-gray-400 focus:border-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={coach.status === 'loading' || !coach.input.trim()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:opacity-50"
                  >
                    {coach.status === 'loading' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Ask
                  </button>
                </form>

                {coach.error ? (
                  <p className="mt-3 rounded-xl border border-rose-600/20 bg-rose-600/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                    {coach.error}
                  </p>
                ) : null}
              </section>

              <section className="space-y-3">
                {coach.messages.length > 0 ? (
                  coach.messages.slice(-6).map((message) => {
                    const isCompletedSaleMessage =
                      message.decision === 'SOLD' ||
                      message.decision === 'KEEPER';
                    const suggestedBid =
                      typeof message.spendGuidance.suggestedNextBid === 'number'
                        ? Math.round(message.spendGuidance.suggestedNextBid)
                        : null;
                    const justifiedOverpay =
                      typeof message.spendGuidance.justifiedOverpayAmount === 'number' &&
                      message.spendGuidance.justifiedOverpayAmount > 0
                        ? Math.round(message.spendGuidance.justifiedOverpayAmount)
                        : null;

                    return (
                      <article
                        key={message.id}
                        className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">{message.sourceLabel}</p>
                            <p className="mt-1 font-black uppercase italic">{message.question}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                            {message.decision}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Coach Answer</p>
                            <p className="mt-1 text-sm font-bold leading-relaxed text-gray-700 dark:text-gray-200">
                              {message.answer || message.buddyMessage}
                            </p>
                          </div>
                          <div className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Budget &amp; Risk</p>
                            <p className="mt-1 text-sm font-black">{message.budgetPace.label}</p>
                            <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">{message.budgetPace.message}</p>
                            <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">{message.riskGuidance}</p>
                          </div>
                        </div>

                        <div className={`mt-2 grid gap-2 ${isCompletedSaleMessage || justifiedOverpay === null ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Effective Reserve</p>
                            <p className="mt-1 font-black">{money(Math.round(message.spendGuidance.effectiveReserve))}</p>
                            <p className="mt-1 text-[8px] font-bold text-gray-400">
                              Roster {money(Math.round(message.spendGuidance.rosterMinimumReserve))}
                              {message.spendGuidance.strategicReserve === null
                                ? ''
                                : ` · Strategy ${money(Math.round(message.spendGuidance.strategicReserve))}`}
                            </p>
                          </div>
                          {isCompletedSaleMessage ? (
                            <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Player State</p>
                              <p className="mt-1 font-black">{message.decision}</p>
                            </div>
                          ) : (
                            <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                {getCoachActionAmountLabel(message.question)}
                              </p>
                              <p className="mt-1 font-black">{suggestedBid === null ? 'N/A' : money(suggestedBid)}</p>
                            </div>
                          )}
                          {!isCompletedSaleMessage && justifiedOverpay !== null ? (
                            <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Justified Overpay</p>
                              <p className="mt-1 font-black">{money(justifiedOverpay)}</p>
                            </div>
                          ) : null}
                        </div>

                        {message.intelSummary.length > 0 ? (
                          <div className="mt-3">
                            <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-gray-400">Live Context</p>
                            <ul className="grid gap-1.5">
                              {message.intelSummary.map((item) => (
                                <li key={item} className="rounded-lg bg-blue-600/10 px-3 py-2 text-xs font-bold leading-relaxed text-blue-700 dark:text-blue-300">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-gray-400">Reasons</p>
                            <ul className="space-y-1.5">
                              {(message.reasons.length > 0 ? message.reasons : ['No additional reasons were returned.']).map((reason) => (
                                <li key={reason} className="rounded-lg bg-emerald-600/10 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-gray-400">Warnings</p>
                            {message.warnings.length > 0 ? (
                              <ul className="space-y-1.5">
                                {message.warnings.map((warning) => (
                                  <li key={warning} className="rounded-lg bg-rose-600/10 px-3 py-2 text-xs font-bold leading-relaxed text-rose-700 dark:text-rose-300">
                                    {warning}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="rounded-lg bg-emerald-600/10 px-3 py-2 text-xs font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                                No active warnings
                              </p>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-[#171717]">
                    <MessageCircle className="mx-auto h-7 w-7 text-orange-600" />
                    <p className="mt-3 text-sm font-black uppercase italic">No Coach questions yet</p>
                    <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">Ask about price, alternatives, nomination strategy, or budget impact.</p>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <div className="space-y-4">
              <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#171717]">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-black uppercase italic">River City History</h3>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Actual Seasons</p>
                    <p className="mt-1 text-xl font-black">{history?.seasonsCompared ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Average Sale</p>
                    <p className="mt-1 text-xl font-black">{money(history?.averageActualPrice ?? null)}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Recent Average</p>
                    <p className="mt-1 text-xl font-black">{money(history?.recentAverageActual ?? null)}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.035] p-3 dark:bg-white/[0.05]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Actual Range</p>
                    <p className="mt-1 text-sm font-black">{money(history?.lowestActualPrice ?? null)}–{money(history?.highestActualPrice ?? null)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Pricing Style</p>
                    <p className="mt-1 text-sm font-black uppercase">{history?.pricingStyle ?? 'Insufficient'}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Trend</p>
                    <p className="mt-1 text-sm font-black uppercase">{history?.trend ?? 'Insufficient'}</p>
                  </div>
                </div>
              </section>

              {history?.seasons.length ? (
                <section className="space-y-2">
                  {history.seasons.map((season) => (
                    <article key={season.season} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xl font-black italic">{season.season}</p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                            {season.buyerName ?? 'Buyer unavailable'}{season.teamName ? ` · ${season.teamName}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Actual Sale</p>
                          <p className="mt-1 text-2xl font-black">{money(season.actualSalePrice)}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Expected</p>
                          <p className="mt-1 text-sm font-black">{money(season.expectedValue)}</p>
                        </div>
                        <div className="rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Difference</p>
                          <p className="mt-1 text-sm font-black">{signedMoney(season.difference)}</p>
                          <p className="text-[8px] font-bold text-gray-400">{percent(season.differencePercent)}</p>
                        </div>
                        <div className="flex items-center justify-center rounded-xl bg-black/[0.03] p-2.5 dark:bg-white/[0.04]">
                          <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${resultClass(season.result)}`}>
                            {season.result}
                          </span>
                        </div>
                      </div>
                      {season.isKeeper ? (
                        <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-orange-600">Keeper transaction</p>
                      ) : null}
                    </article>
                  ))}
                </section>
              ) : (
                <p className="rounded-2xl border border-black/10 bg-white p-4 text-sm font-bold text-gray-500 shadow-sm dark:border-white/10 dark:bg-[#171717] dark:text-gray-400">
                  No actual Sleeper auction sale was found for this player.
                </p>
              )}

              {history?.valueSheetOnlySeasons.length ? (
                <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#171717]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Value-sheet history without an actual Sleeper sale</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {history.valueSheetOnlySeasons.map((season) => (
                      <span key={season.season} className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest dark:border-white/10 dark:bg-white/[0.04]">
                        {season.season}: {money(season.expectedValue)}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              {history?.verdict ? (
                <p className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-4 text-sm font-bold leading-relaxed text-orange-800 dark:text-orange-200">
                  {history.verdict}
                </p>
              ) : null}

              {history?.warnings.length ? (
                <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-widest">History notes</p>
                  {history.warnings.slice(0, 4).map((warning) => (
                    <p key={warning} className="text-xs font-bold leading-relaxed">{warning}</p>
                  ))}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
