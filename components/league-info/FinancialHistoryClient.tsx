"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Landmark, ReceiptText, Trophy } from "lucide-react";
import type {
  PublicPayoutCurrentSeason,
  PublicPayoutHistory,
} from "@/lib/finance/publicPayoutPresentation";
import SiteShell from "@/components/SiteShell";

function formatCurrencyCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function SummaryCard({ label, value, note }: { label: string | number; value: string; note?: string }) {
  return <div className="min-w-0 rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-black/20"><p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-45">{label}</p><p className="mt-2 break-words text-2xl font-black italic tracking-tighter text-emerald-600 sm:text-3xl">{value}</p>{note && <p className="mt-2 text-xs font-semibold leading-relaxed opacity-55">{note}</p>}</div>;
}

export default function FinancialHistoryClient({
  presentation,
  currentSeason,
}: {
  presentation: PublicPayoutHistory;
  currentSeason: PublicPayoutCurrentSeason;
}) {
  // Historical archive remains the public aggregate view.
  const [selectedSeason, setSelectedSeason] = useState(presentation.defaultSeason);
  const season = presentation.seasons.find((item) => item.season === selectedSeason);

  if (!season) return null;

  return <SiteShell activePath="/league-info">
    <main className="min-h-screen overflow-x-clip bg-[#f7f8fa] text-slate-950">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"><ArrowLeft size={14} aria-hidden="true" /> Back to League Info</Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">League Info · Public rules</p>
          <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight text-slate-950 sm:text-5xl">River City Payouts</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">League payout structure, approved award categories, and aggregate financial history. Owner payment and settlement details remain private to authorized finance administration.</p>
        </header>
        <PublicCurrentSeasonSection currentSeason={currentSeason} />
        <section aria-labelledby="overall-heading">
          <div className="mb-5 flex items-center gap-3"><Landmark className="text-emerald-600" size={22} aria-hidden="true" /><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Public aggregate history</p><h2 id="overall-heading" className="text-2xl font-black uppercase italic tracking-tighter">Overall accounting</h2></div></div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{presentation.overallSummary.map((item) => <SummaryCard key={item.label} label={item.label} value={item.kind === "currency" ? formatCurrencyCents(Math.round(item.value * 100)) : String(item.value)} note={item.note} />)}</div>
        </section>
        <section aria-labelledby="season-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Public historical payout rules</p><h2 id="season-heading" className="mt-1 text-3xl font-black uppercase italic tracking-tighter">Season summary</h2></div><label className="block w-full sm:w-56"><span className="mb-2 block text-[10px] font-black uppercase tracking-widest opacity-60">Select season</span><span className="relative block"><select value={selectedSeason} onChange={(event) => setSelectedSeason(Number(event.target.value))} className="min-h-12 w-full appearance-none rounded-2xl border border-black/15 bg-white px-4 pr-11 text-sm font-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/15 dark:bg-[#111]">{presentation.seasonOptions.map((year) => <option key={year} value={year}>{year}</option>)}</select><ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true" /></span></label></div>
          <div className="mt-7 flex flex-col gap-5 rounded-3xl border border-emerald-600/20 bg-emerald-600/10 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">{season.season} public record</p><p className="mt-1 text-2xl font-black uppercase italic tracking-tighter">{season.reconciliationState}</p></div><p className="max-w-md text-sm font-semibold leading-6 opacity-70">Aggregate league totals and award categories are shown without owner-level payment or settlement detail.</p></div>
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{season.summary.map((item) => <SummaryCard key={item.label} label={item.label} value={item.kind === "currency" ? formatCurrencyCents(Math.round(item.value * 100)) : String(item.value)} note={item.note} />)}</div>
        </section>
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
          <section aria-labelledby="awards-heading" className="min-w-0 rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7"><div className="mb-5 flex items-center gap-3"><Trophy className="text-emerald-600" size={22} aria-hidden="true" /><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Approved categories</p><h2 id="awards-heading" className="text-2xl font-black uppercase italic tracking-tighter">Award structure</h2></div></div><div className="space-y-3">{season.seasonAwards.map((award, index) => <div key={`${award.label}-${index}`} className="flex min-w-0 items-center justify-between gap-3 rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20"><p className="break-words text-sm font-black uppercase tracking-tight">{award.label}</p><p className="shrink-0 text-xl font-black italic text-emerald-600">{formatCurrencyCents(award.amountCents)}</p></div>)}</div><details className="mt-4 rounded-3xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-black/20"><summary className="min-h-11 cursor-pointer py-3 text-sm font-black uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Weekly prizes ({season.weeklyAwards.length}) · {formatCurrencyCents(season.weeklyAwards.reduce((total, award) => total + award.amountCents, 0))}</summary><div className="mt-3 space-y-2">{season.weeklyAwards.map((award, index) => <div key={`${award.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5"><p className="text-xs font-black">{award.label}</p><p className="shrink-0 text-sm font-black text-emerald-600">{formatCurrencyCents(award.amountCents)}</p></div>)}</div></details></section>
          <section aria-labelledby="expenses-heading" className="min-w-0 rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7"><div className="mb-5 flex items-center gap-3"><ReceiptText className="text-emerald-600" size={22} aria-hidden="true" /><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Separate from winnings</p><h2 id="expenses-heading" className="text-2xl font-black uppercase italic tracking-tighter">League expenses</h2></div></div>{season.expenses.length > 0 ? <div className="space-y-3">{season.expenses.map((expense, index) => <article key={`${expense.label}-${index}`} className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-black uppercase tracking-tight">{expense.label}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">{expense.funding}</p></div><p className="shrink-0 text-xl font-black italic text-emerald-600">{formatCurrencyCents(expense.amountCents)}</p></div></article>)}</div> : <p className="rounded-3xl border border-dashed border-black/10 p-5 text-sm font-bold opacity-55 dark:border-white/10">No league expense was recorded for {season.season}.</p>}</section>
        </div>
        <section aria-labelledby="coverage-heading" className="rounded-[2rem] border border-emerald-600/20 bg-emerald-600/5 p-5 sm:p-7"><h2 id="coverage-heading" className="text-lg font-black uppercase italic tracking-tighter">Coverage</h2><p className="mt-2 text-sm font-bold leading-relaxed opacity-70">{presentation.coverage.statement}</p><p className="mt-4 rounded-2xl border border-black/10 bg-white/50 p-4 text-xs font-semibold leading-relaxed opacity-65 dark:border-white/10 dark:bg-black/20">This public page presents league-safe structure and aggregate history. Owner dues, individual winnings, recipient identity, and settlement status remain restricted to commissioner finance administration.</p></section>
      </div>
    </main>
  </SiteShell>;
}

function PublicCurrentSeasonSection({ currentSeason }: { currentSeason: PublicPayoutCurrentSeason }) {
  return <div className="space-y-6">
    <section aria-labelledby="current-season-heading" className="rounded-[2rem] border border-orange-600/20 bg-orange-600/5 p-4 shadow-xl dark:border-white/10 dark:bg-orange-500/10 sm:p-7">
      <div className="mb-5 flex items-start gap-3"><Landmark className="mt-1 text-orange-600" size={22} aria-hidden="true" /><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">Current season summary</p><h2 id="current-season-heading" className="text-3xl font-black uppercase italic tracking-tighter">2026 Season</h2><p className="mt-2 text-sm font-bold opacity-65">{currentSeason.statusLabel} · {currentSeason.operationalStatus}</p></div></div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><SummaryCard label="League dues" value={formatCurrencyCents(currentSeason.leagueDuesCents)} note="Per owner" /><SummaryCard label="Owners" value={String(currentSeason.ownerCount)} /><SummaryCard label="Total prize pool" value={formatCurrencyCents(currentSeason.duesPoolCents)} note="Derived from current finance rules" /><SummaryCard label="Paid / owed" value={`${currentSeason.paidCount} / ${currentSeason.owedCount}`} note={`${currentSeason.paidCount} of ${currentSeason.ownerCount} paid`} /></div>
      <p className="mt-5 rounded-2xl border border-orange-600/15 bg-orange-600/10 px-4 py-3 text-sm font-bold">This season is still open. Public figures reflect the current reconciled state and are not a final season settlement.</p>
    </section>

    <section aria-labelledby="allocation-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
      <div className="mb-5"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Payout allocation</p><h2 id="allocation-heading" className="text-2xl font-black uppercase italic tracking-tighter">Where the {formatCurrencyCents(currentSeason.duesPoolCents)} goes</h2></div>
      <dl className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{currentSeason.expectedPrizeStructure.map((item, index) => <div key={`${item.label}-${index}`} className="rounded-2xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20"><dt className="text-xs font-bold leading-5 opacity-65">{item.label}</dt><dd className="mt-2 text-2xl font-black italic text-emerald-600">{formatCurrencyCents(item.amountCents)}</dd></div>)}</dl>
      <div className="mt-4 rounded-2xl border border-emerald-600/15 bg-emerald-600/5 p-4 text-sm font-semibold"><p><strong>Total:</strong> {formatCurrencyCents(currentSeason.expectedPrizeTotalCents)}</p><p className="mt-1"><strong>Championship allocation:</strong> {formatCurrencyCents(currentSeason.championshipAllocationCents)} · <strong>Ring cost:</strong> {currentSeason.approvedRingExpenseCents === null ? "Pending" : formatCurrencyCents(currentSeason.approvedRingExpenseCents)} · <strong>Projected champion cash:</strong> {currentSeason.projectedChampionCashCents === null ? "Pending" : formatCurrencyCents(currentSeason.projectedChampionCashCents)}</p></div>
    </section>

    <section aria-labelledby="current-awards-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
      <div className="mb-5 flex items-center gap-3"><Trophy className="text-emerald-600" size={22} aria-hidden="true" /><div><p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Awards / results</p><h2 id="current-awards-heading" className="text-2xl font-black uppercase italic tracking-tighter">Current awards</h2></div></div>
      {currentSeason.approvedAwards.length > 0 ? <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{currentSeason.approvedAwards.map((award, index) => <article key={`${award.label}-${index}`} className="rounded-2xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-black">{award.label}</p><p className="mt-1 text-xs font-semibold opacity-65">{award.recipient}</p></div><p className="shrink-0 text-lg font-black text-emerald-600">{formatCurrencyCents(award.amountCents)}</p></div><p className="mt-3 text-[10px] font-black uppercase tracking-widest opacity-55">{award.status}</p></article>)}</div> : <p className="rounded-2xl border border-dashed border-black/10 p-5 text-sm font-semibold opacity-65 dark:border-white/10">Awards are pending final results. No recipient has been presented as finalized.</p>}
    </section>

    <section aria-labelledby="fund-location-heading" className="rounded-[2rem] border border-blue-600/15 bg-blue-600/5 p-4 dark:border-white/10 dark:bg-blue-500/10 sm:p-7"><p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-700 dark:text-blue-300">Public transparency</p><h2 id="fund-location-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tighter">Where league funds are held</h2><p className="mt-2 text-sm font-semibold opacity-70">League funds are held across:</p><ul className="mt-4 grid grid-cols-1 gap-2 text-sm font-black sm:grid-cols-3">{currentSeason.fundLocationSummary.map((location) => <li key={location} className="rounded-2xl border border-blue-600/10 bg-white/60 p-3 dark:border-white/10 dark:bg-black/20">{location}</li>)}</ul><p className="mt-4 text-xs font-semibold opacity-60">No account identifiers, handles, balances, or transaction details are public.</p></section>
  </div>;
}
