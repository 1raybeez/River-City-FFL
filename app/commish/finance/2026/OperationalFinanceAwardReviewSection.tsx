"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Trophy,
} from "lucide-react";

import type {
  OperationalFinanceAwardReviewItem,
  OperationalFinanceCommissionerDashboardPresentation,
} from "@/lib/finance/operationalFinanceAwardReview";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function paymentStatusClasses(status: "UNPAID" | "PARTIAL" | "PAID") {
  if (status === "PAID") {
    return "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "PARTIAL") {
    return "border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-300";
  }
  return "border-zinc-500/25 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
}

export default function OperationalFinanceAwardReviewSection({
  dashboard,
  onDashboard,
  onConfirmation,
}: {
  dashboard: OperationalFinanceCommissionerDashboardPresentation;
  onDashboard: (dashboard: OperationalFinanceCommissionerDashboardPresentation) => void;
  onConfirmation: (message: string) => void;
}) {
  const review = dashboard.awardReview;
  const [activeProposalKey, setActiveProposalKey] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openConfirmation = (proposal: OperationalFinanceAwardReviewItem) => {
    setActiveProposalKey(proposal.proposalKey);
    setIdempotencyKey(`commissioner-award-${crypto.randomUUID()}`);
    setError(null);
  };

  const closeConfirmation = () => {
    setActiveProposalKey(null);
    setIdempotencyKey(null);
    setError(null);
  };

  const approve = async (proposal: OperationalFinanceAwardReviewItem) => {
    if (!idempotencyKey || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/commish/finance/2026/awards/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalKey: proposal.proposalKey,
          proposalFingerprint: proposal.proposalFingerprint,
          idempotencyKey,
        }),
      });
      const payload = (await response.json()) as {
        dashboard?: OperationalFinanceCommissionerDashboardPresentation;
        created?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Award could not be approved.");
      }
      onDashboard(payload.dashboard);
      onConfirmation(
        payload.created === false
          ? "This award was already approved; the stored obligation remains unchanged."
          : `${proposal.eventLabel} ${proposal.categoryLabel} approved for ${proposal.financialOwnerName}. Payment was not recorded.`
      );
      closeConfirmation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Award could not be approved.");
    } finally {
      setPending(false);
    }
  };

  const summary = [
    ["Needs Review", review.summary.needsReviewCount],
    ["Waiting", review.summary.waitingCount],
    ["Approved", review.summary.approvedCount],
    ["Paid", review.summary.paidCount],
    ["Issues", review.summary.issuesCount],
  ] as const;

  return (
    <section aria-labelledby="award-review-heading" className="mt-10">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
            Sleeper → Commissioner → Ledger
          </p>
          <h2 id="award-review-heading" className="text-2xl font-black uppercase italic tracking-tight">
            Award Review
          </h2>
        </div>
        <p className="text-xs font-bold capitalize text-gray-500 dark:text-gray-400">
          {review.sourceLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {summary.map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-4 shadow-md dark:border-white/10 dark:bg-[#121212]">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-black" aria-label={`${label}: ${count}`}>{count}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl border border-black/10 bg-black/[0.025] p-5 dark:border-white/10 dark:bg-white/[0.03] sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Priority Queue</p>
            <h3 className="text-xl font-black uppercase italic tracking-tight">Needs Review</h3>
          </div>
        </div>

        {review.needsReview.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white p-5 dark:border-white/15 dark:bg-black/20">
            <p className="font-black">{review.emptyStateTitle}</p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-gray-500 dark:text-gray-400">
              {review.emptyStateDetail}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {review.needsReview.map((proposal) => {
              const expanded = activeProposalKey === proposal.proposalKey;
              const errorId = `award-error-${proposal.proposalKey.replaceAll(":", "-")}`;
              return (
                <article key={proposal.proposalKey} className="min-w-0 rounded-2xl border border-orange-600/25 bg-white p-5 shadow-lg dark:bg-[#121212]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-600">{proposal.eventLabel}</p>
                      <h4 className="mt-1 text-xl font-black uppercase italic tracking-tight">{proposal.categoryLabel}</h4>
                    </div>
                    <span className="rounded-full border border-orange-600/25 bg-orange-600/10 px-3 py-1 text-[9px] font-black tracking-widest text-orange-700 dark:text-orange-300">{proposal.statusLabel}</span>
                  </div>
                  <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Winner</dt><dd className="mt-1 font-black">{proposal.financialOwnerName}</dd></div>
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Franchise</dt><dd className="mt-1 font-black">{proposal.franchiseName}</dd></div>
                    {proposal.score !== null && <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Sleeper Score</dt><dd className="mt-1 font-black">{proposal.score}</dd></div>}
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Award</dt><dd className="mt-1 text-lg font-black">{formatCurrency(proposal.amountCents)}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Source: {proposal.sourceLabel}</p>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`award-confirm-${proposal.proposalKey.replaceAll(":", "-")}`}
                    onClick={() => expanded ? closeConfirmation() : openConfirmation(proposal)}
                    className="mt-5 min-h-11 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121212]"
                  >
                    {expanded ? "Cancel Approval" : `Approve ${formatCurrency(proposal.amountCents)} Award`}
                  </button>
                  {expanded && (
                    <div id={`award-confirm-${proposal.proposalKey.replaceAll(":", "-")}`} className="mt-4 rounded-2xl border border-orange-600/25 bg-orange-600/5 p-4">
                      <h5 className="font-black uppercase tracking-tight">Confirm Award</h5>
                      <p className="mt-2 text-sm font-semibold leading-relaxed">
                        Approving this {proposal.categoryLabel.toLowerCase()} records a {formatCurrency(proposal.amountCents)} financial obligation to {proposal.financialOwnerName} for {proposal.eventLabel}. It does not mark the award as paid.
                      </p>
                      <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">The server will reacquire Sleeper and reject approval if the result changed.</p>
                      {error && <p id={errorId} role="alert" className="mt-3 rounded-xl bg-red-600/10 p-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
                      <button
                        type="button"
                        onClick={() => void approve(proposal)}
                        disabled={pending}
                        aria-busy={pending}
                        aria-describedby={error ? errorId : undefined}
                        className="mt-4 min-h-11 w-full rounded-xl bg-black px-4 py-3 text-sm font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:focus-visible:ring-offset-[#121212]"
                      >
                        {pending ? "Revalidating Sleeper…" : "Confirm Award"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212] sm:p-6">
          <div className="flex items-center gap-3"><Clock3 className="h-5 w-5 text-orange-600" aria-hidden="true" /><h3 className="text-lg font-black uppercase italic tracking-tight">Waiting on Sleeper</h3></div>
          <p className="mt-3 text-sm font-bold">Weekly Awards · Weeks 1–{review.weeklySummary.totalCount || 14}</p>
          <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {review.weeklySummary.approvedCount} approved · {review.weeklySummary.needsReviewCount} awaiting review · {review.weeklySummary.waitingCount} upcoming · {review.weeklySummary.issuesCount} issues
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {review.waitingByCategory.map((entry) => (
              <span key={entry.categoryLabel} className="rounded-full bg-black/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                {entry.categoryLabel}: {entry.count}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212] sm:p-6">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-orange-600" aria-hidden="true" /><h3 className="text-lg font-black uppercase italic tracking-tight">Approved Awards</h3></div>
          {review.approvedAwards.length === 0 ? (
            <p className="mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400">No award obligations have been approved yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {review.approvedAwards.map((award) => (
                <li key={award.obligationId} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-black">{award.eventLabel} {award.categoryLabel}</p><p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{award.financialOwnerName} · {award.franchiseName}</p></div>
                    <p className="text-lg font-black">{formatCurrency(award.amountCents)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-1 text-[9px] font-black tracking-widest text-blue-700 dark:text-blue-300">APPROVED</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black tracking-widest ${paymentStatusClasses(award.paymentStatusLabel)}`}>{award.paymentStatusLabel}</span>
                    {award.paymentStatusLabel === "UNPAID" && <span className="text-xs font-semibold text-gray-500">Payment: Not recorded</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {review.issues.length > 0 && (
        <div className="mt-4 rounded-3xl border border-amber-600/25 bg-amber-600/5 p-5 sm:p-6">
          <div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" /><h3 className="text-lg font-black uppercase italic tracking-tight">Needs Commissioner Attention</h3></div>
          <ul className="mt-4 space-y-3">
            {review.issues.map((issue, index) => (
              <li key={`${issue.proposalKey ?? "source"}-${index}`} className="rounded-2xl bg-white/70 p-4 dark:bg-black/20">
                <p className="font-black">{issue.title}</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">{issue.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <CircleDollarSign className="h-4 w-4 text-orange-600" aria-hidden="true" />
        Approval records an immutable obligation only. Award payment remains a later workflow.
      </p>
    </section>
  );
}
