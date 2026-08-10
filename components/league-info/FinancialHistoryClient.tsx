"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  ChevronDown,
  Landmark,
  ReceiptText,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import type {
  FinancialHistoryPresentation,
  FinancialSummaryItem,
} from "@/lib/managers/financialHistoryPresentation";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryCard({ item }: { item: FinancialSummaryItem }) {
  return (
    <div className="min-w-0 rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm dark:border-white/10 dark:bg-black/20">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-45">
        {item.label}
      </p>
      <p className="mt-2 break-words text-2xl font-black italic tracking-tighter text-emerald-600 sm:text-3xl">
        {item.kind === "currency" ? formatCurrency(item.value) : item.value}
      </p>
      {item.note && (
        <p className="mt-2 text-xs font-semibold leading-relaxed opacity-55">
          {item.note}
        </p>
      )}
    </div>
  );
}

export default function FinancialHistoryClient({
  presentation,
}: {
  presentation: FinancialHistoryPresentation;
}) {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    presentation.defaultSeason
  );
  const [showAllLeaders, setShowAllLeaders] = useState(false);
  const season = presentation.seasons.find(
    (item) => item.season === selectedSeason
  );

  if (!season) return null;

  const leaders = showAllLeaders
    ? presentation.leaderboard
    : presentation.leaderboard.slice(0, 5);

  return (
    <main className="min-h-screen overflow-x-clip bg-white text-black transition-colors dark:bg-[#050505] dark:text-white">
      <header className="relative overflow-hidden border-b border-black/5 bg-emerald-600 px-4 pb-14 pt-24 text-white dark:border-white/10 sm:px-6 sm:pb-16 sm:pt-28">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_32%),radial-gradient(circle_at_80%_70%,black_0,transparent_38%)]" />
        <div className="relative mx-auto max-w-6xl">
          <Link
            href="/league-info"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition hover:bg-black/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft size={14} aria-hidden="true" /> League Info
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-100">
              Reconciled 2016–2025
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
              Financial History
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-relaxed text-emerald-50 sm:text-base">
              A season-by-season record of league dues, prizes, cash payments,
              rollovers, and expenses from the commissioner&apos;s reconciled
              records.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <section aria-labelledby="overall-heading">
          <div className="mb-5 flex items-center gap-3">
            <Landmark className="text-emerald-600" size={22} aria-hidden="true" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                Complete historical ledger
              </p>
              <h2 id="overall-heading" className="text-2xl font-black uppercase italic tracking-tighter">
                Overall accounting
              </h2>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {presentation.overallSummary.map((item) => (
              <SummaryCard key={item.label} item={item} />
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-emerald-600/15 bg-emerald-600/5 px-4 py-3 text-xs font-semibold leading-relaxed opacity-70">
            Food contributions were separately funded. Rolled prizes document
            where forfeited awards went and are not added to winnings twice.
          </p>
        </section>

        <section
          aria-labelledby="season-heading"
          className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.04] sm:p-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">
                One reconciled year at a time
              </p>
              <h2 id="season-heading" className="mt-1 text-3xl font-black uppercase italic tracking-tighter">
                Season ledger
              </h2>
            </div>
            <label className="block w-full sm:w-56">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-widest opacity-60">
                Select season
              </span>
              <span className="relative block">
                <select
                  value={selectedSeason}
                  onChange={(event) => setSelectedSeason(Number(event.target.value))}
                  className="min-h-12 w-full appearance-none rounded-2xl border border-black/15 bg-white px-4 pr-11 text-sm font-black outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/15 dark:bg-[#111]"
                >
                  {presentation.seasonOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-50"
                  aria-hidden="true"
                />
              </span>
            </label>
          </div>

          <div className="mt-7 flex flex-col gap-3 rounded-3xl border border-emerald-600/20 bg-emerald-600/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                {season.season} financial record
              </p>
              <p className="mt-1 text-2xl font-black uppercase italic tracking-tighter">
                Fully reconciled
              </p>
            </div>
            <span className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-emerald-600/20 bg-white/60 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-black/20 dark:text-emerald-300 sm:self-auto">
              <CheckCircle2 size={16} aria-hidden="true" /> {season.reconciliationState}
            </span>
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {season.summary.map((item) => (
              <SummaryCard key={item.label} item={item} />
            ))}
          </div>

          {season.specialNote && (
            <aside className="mt-5 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-5" aria-label="2022 settlement note">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
                2022 settlement record
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed opacity-80">
                {season.specialNote}
              </p>
            </aside>
          )}
        </section>

        <section aria-labelledby="recipients-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <Users className="text-emerald-600" size={22} aria-hidden="true" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Official attribution</p>
              <h2 id="recipients-heading" className="text-2xl font-black uppercase italic tracking-tighter">Recipient breakdown</h2>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
            {season.recipients.map((recipient) => (
              <article key={`${recipient.ownerId}:${recipient.franchiseId}`} className="min-w-0 rounded-3xl border border-black/5 bg-white/70 p-5 dark:border-white/10 dark:bg-black/20">
                <p className="break-words text-lg font-black uppercase italic tracking-tighter">{recipient.ownerName}</p>
                <p className="mt-1 break-words text-xs font-bold opacity-55">{recipient.franchiseName}</p>
                {recipient.coOwnerNames.length > 0 && (
                  <p className="mt-2 text-[10px] font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                    Official financial attribution is shown once under {recipient.ownerName}. Co-owner: {recipient.coOwnerNames.join(", ")}.
                  </p>
                )}
                <dl className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
                  {[
                    ["Dues", recipient.duesPaid],
                    ["Winnings", recipient.recordedWinnings],
                    ["Cash", recipient.cashPaid],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-2xl bg-black/5 p-3 dark:bg-white/5">
                      <dt className="text-[8px] font-black uppercase tracking-widest opacity-45">{label}</dt>
                      <dd className="mt-1 break-words text-base font-black text-emerald-600">{formatCurrency(value as number)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-2">
          <section aria-labelledby="awards-heading" className="min-w-0 rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
            <div className="mb-5 flex items-center gap-3">
              <Trophy className="text-emerald-600" size={22} aria-hidden="true" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Who won what</p>
                <h2 id="awards-heading" className="text-2xl font-black uppercase italic tracking-tighter">Award breakdown</h2>
              </div>
            </div>
            <div className="space-y-3">
              {season.seasonAwards.map((award) => (
                <article key={award.transactionKey} className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-black uppercase tracking-tight">{award.category}</p>
                      <p className="mt-1 break-words text-xs font-bold opacity-60">{award.recipient} · {award.franchise}</p>
                      <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-emerald-600">{award.paymentState}</p>
                    </div>
                    <p className="shrink-0 text-xl font-black italic text-emerald-600">{formatCurrency(award.amount)}</p>
                  </div>
                </article>
              ))}
            </div>
            <details className="mt-4 rounded-3xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-black/20">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-black uppercase tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                Weekly prizes ({season.weeklyAwards.length})
              </summary>
              <div className="mt-3 space-y-2">
                {season.weeklyAwards.map((award) => (
                  <div key={award.transactionKey} className="flex min-w-0 flex-col gap-1 rounded-2xl bg-black/5 p-3 dark:bg-white/5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-xs font-black">{award.description}</p>
                      <p className="mt-1 text-[10px] font-bold opacity-55">{award.recipient} · {award.paymentState}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-emerald-600">{formatCurrency(award.amount)}</p>
                  </div>
                ))}
              </div>
            </details>
          </section>

          <div className="min-w-0 space-y-8">
            <section aria-labelledby="rollovers-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <RotateCcw className="text-emerald-600" size={22} aria-hidden="true" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Forfeited prize routing</p>
                  <h2 id="rollovers-heading" className="text-2xl font-black uppercase italic tracking-tighter">Rolled prizes</h2>
                </div>
              </div>
              {season.rollovers.length > 0 ? (
                <div className="space-y-3">
                  {season.rollovers.map((rollover) => (
                    <article key={rollover.transactionKey} className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-tight">{rollover.weekLabel}: {rollover.originalWinner}</p>
                          <p className="mt-1 text-xs font-bold opacity-60">Final recipient: {rollover.finalRecipient}</p>
                        </div>
                        <p className="shrink-0 text-xl font-black italic text-emerald-600">{formatCurrency(rollover.amount)}</p>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-relaxed opacity-60">{rollover.reason}. {rollover.accountingNote}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-dashed border-black/10 p-5 text-sm font-bold opacity-55 dark:border-white/10">No forfeited or rolled prizes were recorded for {season.season}.</p>
              )}
            </section>

            <section aria-labelledby="expenses-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <ReceiptText className="text-emerald-600" size={22} aria-hidden="true" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">Separate from winnings</p>
                  <h2 id="expenses-heading" className="text-2xl font-black uppercase italic tracking-tighter">League expenses</h2>
                </div>
              </div>
              {season.expenses.length > 0 ? (
                <div className="space-y-3">
                  {season.expenses.map((expense) => (
                    <article key={expense.transactionKey} className="rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-tight">{expense.category}</p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">{expense.funding}</p>
                        </div>
                        <p className="shrink-0 text-xl font-black italic text-emerald-600">{formatCurrency(expense.amount)}</p>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-relaxed opacity-60">{expense.description}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-3xl border border-dashed border-black/10 p-5 text-sm font-bold opacity-55 dark:border-white/10">No league expense was recorded for {season.season}.</p>
              )}
            </section>
          </div>
        </div>

        <section aria-labelledby="leaders-heading" className="rounded-[2rem] border border-black/5 bg-black/[0.025] p-4 dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <BadgeDollarSign className="text-emerald-600" size={22} aria-hidden="true" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600">2016–2025 owner summaries</p>
              <h2 id="leaders-heading" className="text-2xl font-black uppercase italic tracking-tighter">Recorded winnings leaders</h2>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            {leaders.map((leader) => (
              <article key={leader.ownerId} className="flex min-w-0 items-center gap-4 rounded-3xl border border-black/5 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">#{leader.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-black uppercase tracking-tight">{leader.ownerName}</p>
                  <p className="mt-1 text-[10px] font-bold opacity-50">{leader.seasons.length} recorded season{leader.seasons.length === 1 ? "" : "s"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-black italic text-emerald-600">{formatCurrency(leader.recordedWinnings)}</p>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Recorded</p>
                </div>
              </article>
            ))}
          </div>
          {presentation.leaderboard.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllLeaders((current) => !current)}
              className="mt-5 min-h-11 w-full rounded-2xl border border-black/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition hover:border-emerald-600/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-white/10 sm:w-auto"
            >
              {showAllLeaders ? "Show top five" : `Show all ${presentation.leaderboard.length} owners`}
            </button>
          )}
        </section>

        <section aria-labelledby="coverage-heading" className="rounded-[2rem] border border-emerald-600/20 bg-emerald-600/5 p-5 sm:p-7">
          <h2 id="coverage-heading" className="text-lg font-black uppercase italic tracking-tighter">Coverage</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed opacity-70">{presentation.coverage.statement}</p>
          <details className="mt-4 rounded-2xl border border-black/10 bg-white/50 p-4 dark:border-white/10 dark:bg-black/20">
            <summary className="min-h-11 cursor-pointer py-3 text-xs font-black uppercase tracking-widest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">Accounting method</summary>
            <p className="mt-2 text-xs font-semibold leading-relaxed opacity-65">
              Recorded winnings state the official award recipient and amount.
              Cash paid preserves payment or dues-offset treatment. League
              expenses remain separate from owner winnings, and forfeiture rows
              explain routing without duplicating the final payout.
            </p>
          </details>
        </section>
      </div>
    </main>
  );
}
