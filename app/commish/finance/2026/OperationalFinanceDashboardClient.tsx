"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import { ModeToggle } from "@/components/ModeToggle";
import type { OperationalFinanceCommissionerDashboardPresentation } from "@/lib/finance/operationalFinanceAwardReview";
import type {
  OperationalFinanceDashboardDuesRow,
} from "@/lib/finance/operationalFinanceDashboardPresentation";
import OperationalFinanceAwardReviewSection from "./OperationalFinanceAwardReviewSection";
import OperationalFinanceExpenseReconciliationSection from "./OperationalFinanceExpenseReconciliationSection";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatActivityTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function dollarsToCents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function statusClasses(state: OperationalFinanceDashboardDuesRow["state"]) {
  if (state === "paid") {
    return "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300";
  }
  if (state === "partially-paid") {
    return "border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-300";
  }
  return "border-red-600/25 bg-red-600/10 text-red-700 dark:text-red-300";
}

type PaymentDraft = {
  amount: string;
  actualPaidDate: string;
  note: string;
  confirmed: boolean;
  idempotencyKey: string;
};

function newPaymentDraft(row: OperationalFinanceDashboardDuesRow): PaymentDraft {
  return {
    amount: (row.outstandingCents / 100).toFixed(2),
    actualPaidDate: "",
    note: "",
    confirmed: false,
    idempotencyKey: `commissioner-dues-${crypto.randomUUID()}`,
  };
}

export default function OperationalFinanceDashboardClient({
  initialDashboard,
}: {
  initialDashboard: OperationalFinanceCommissionerDashboardPresentation;
}) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [activeObligationId, setActiveObligationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const openPaymentForm = (row: OperationalFinanceDashboardDuesRow) => {
    setActiveObligationId(row.obligationId);
    setDraft(newPaymentDraft(row));
    setError(null);
    setConfirmation(null);
  };

  const closePaymentForm = () => {
    setActiveObligationId(null);
    setDraft(null);
    setError(null);
  };

  const submitPayment = async (
    event: React.FormEvent<HTMLFormElement>,
    row: OperationalFinanceDashboardDuesRow
  ) => {
    event.preventDefault();
    if (!draft || pending) return;
    const amountCents = dollarsToCents(draft.amount);
    if (!amountCents) {
      setError("Enter a payment amount greater than $0.00.");
      return;
    }
    if (amountCents > row.outstandingCents) {
      setError("Payment cannot exceed the remaining balance.");
      return;
    }
    if (!draft.confirmed) {
      setError("Confirm that the Venmo payment was received.");
      return;
    }

    setPending(true);
    setError(null);
    setConfirmation(null);
    try {
      const response = await fetch(
        `/api/commish/finance/2026/dues/${encodeURIComponent(row.obligationId)}/settlements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents,
            actualPaidAt: draft.actualPaidDate
              ? `${draft.actualPaidDate}T00:00:00.000Z`
              : null,
            commissionerNote: draft.note || null,
            idempotencyKey: draft.idempotencyKey,
          }),
        }
      );
      const payload = (await response.json()) as {
        dashboard?: OperationalFinanceCommissionerDashboardPresentation;
        created?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Payment could not be recorded.");
      }
      setDashboard(payload.dashboard);
      setConfirmation(
        payload.created === false
          ? "This payment was already recorded; the stored ledger remains unchanged."
          : `Venmo payment recorded for ${row.financialOwnerName}.`
      );
      setActiveObligationId(null);
      setDraft(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be recorded.");
    } finally {
      setPending(false);
    }
  };

  const summaryCards = [
    ["Assessed", dashboard.summary.duesAssessedCents],
    ["Collected", dashboard.summary.duesCollectedCents],
    ["Outstanding", dashboard.summary.duesOutstandingCents],
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-20 font-sans text-black transition-colors dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/80 sm:px-6">
        <Link
          href="/commish"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition-colors hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Commissioner Hub
        </Link>
        <ModeToggle />
      </nav>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="rounded-3xl border border-black/10 bg-black/[0.03] p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
              <WalletCards className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                  Commissioner Finance
                </p>
                <span className="max-w-full rounded-full border border-amber-600/20 bg-amber-600/10 px-2.5 py-1 text-center text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {dashboard.operationalStatusLabel}
                </span>
              </div>
              <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter sm:text-6xl">
                {dashboard.heading}
              </h1>
              <p className="mt-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                {dashboard.deadlineLabel}. Server-derived ledger values; the season is not yet reconciled.
              </p>
            </div>
          </div>
        </header>

        {confirmation && (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-600/25 bg-emerald-600/10 p-4 text-sm font-bold text-emerald-800 dark:text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            {confirmation}
          </div>
        )}

        <section aria-labelledby="dues-summary-heading" className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Current Season</p>
              <h2 id="dues-summary-heading" className="text-2xl font-black uppercase italic tracking-tight">Dues Summary</h2>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {dashboard.summary.paidCount} paid · {dashboard.summary.unpaidCount} unpaid · {dashboard.summary.partialCount} partial
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map(([label, cents]) => (
              <div key={label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#121212]">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight" aria-label={`${label}: ${formatCurrency(cents)}`}>{formatCurrency(cents)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Awards</p>
              <p className="mt-1 text-sm font-bold">Approved {formatCurrency(dashboard.summary.approvedAwardsCents)} · Paid {formatCurrency(dashboard.summary.paidAwardsCents)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Expenses</p>
              <p className="mt-1 text-sm font-bold">Approved {formatCurrency(dashboard.summary.approvedExpensesCents)}</p>
            </div>
            <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pool Allocation</p>
              <p className="mt-1 text-sm font-bold">Allocated {formatCurrency(dashboard.summary.poolAllocatedCents)} · Remaining {formatCurrency(dashboard.summary.poolRemainingCents)}</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="dues-roster-heading" className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">12 Competitive Franchises</p>
            <h2 id="dues-roster-heading" className="text-2xl font-black uppercase italic tracking-tight">Dues Roster</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {dashboard.duesRows.map((row) => {
              const formOpen = activeObligationId === row.obligationId && draft;
              const errorId = `payment-error-${row.franchiseId}`;
              return (
                <article key={row.obligationId} className="min-w-0 rounded-3xl border border-black/10 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-[#121212] sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-black uppercase italic tracking-tight">{row.financialOwnerName}</h3>
                      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{row.franchiseName}</p>
                      {row.coOwnerContext.length > 0 && (
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Co-owner context: {row.coOwnerContext.join(", ")}</p>
                      )}
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-widest ${statusClasses(row.state)}`}>
                      {row.statusLabel}
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Assessed</dt><dd className="mt-1 font-black">{formatCurrency(row.assessedCents)}</dd></div>
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Settled</dt><dd className="mt-1 font-black">{formatCurrency(row.settledCents)}</dd></div>
                    <div><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">Remaining</dt><dd className="mt-1 font-black">{formatCurrency(row.outstandingCents)}</dd></div>
                  </dl>

                  {row.settlements.length > 0 && (
                    <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Recorded Payments</p>
                      <ul className="mt-2 space-y-2">
                        {row.settlements.map((settlement) => (
                          <li key={settlement.settlementId} className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {formatCurrency(settlement.amountCents)} · {settlement.paymentMethodLabel} · Paid date: {settlement.actualPaidAtLabel}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.canRecordPayment && !formOpen && (
                    <button
                      type="button"
                      onClick={() => openPaymentForm(row)}
                      className="mt-5 min-h-11 w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121212]"
                    >
                      Record Venmo Payment
                    </button>
                  )}

                  {formOpen && (
                    <form className="mt-5 space-y-4 border-t border-black/10 pt-5 dark:border-white/10" onSubmit={(event) => void submitPayment(event, row)} noValidate>
                      <h4 className="font-black uppercase tracking-tight">Confirm Venmo Payment</h4>
                      <div>
                        <label htmlFor={`amount-${row.franchiseId}`} className="mb-1.5 block text-xs font-black uppercase tracking-wider">Amount received</label>
                        <div className="flex min-h-11 items-center rounded-xl border border-black/20 bg-white px-3 focus-within:ring-2 focus-within:ring-orange-600 dark:border-white/20 dark:bg-black/30">
                          <span aria-hidden="true" className="font-bold">$</span>
                          <input id={`amount-${row.franchiseId}`} name="amount" inputMode="decimal" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} aria-describedby={error ? errorId : undefined} className="min-w-0 flex-1 bg-transparent px-2 py-2.5 font-bold outline-none" />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Defaults to the remaining {formatCurrency(row.outstandingCents)}; a smaller partial payment is allowed.</p>
                      </div>
                      <div>
                        <label htmlFor={`date-${row.franchiseId}`} className="mb-1.5 block text-xs font-black uppercase tracking-wider">Actual payment date <span className="normal-case tracking-normal text-gray-500">(optional)</span></label>
                        <input id={`date-${row.franchiseId}`} name="actualPaidDate" type="date" value={draft.actualPaidDate} onChange={(event) => setDraft({ ...draft, actualPaidDate: event.target.value })} className="min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
                      </div>
                      <div>
                        <label htmlFor={`note-${row.franchiseId}`} className="mb-1.5 block text-xs font-black uppercase tracking-wider">Commissioner note <span className="normal-case tracking-normal text-gray-500">(optional)</span></label>
                        <textarea id={`note-${row.franchiseId}`} name="commissionerNote" maxLength={500} rows={2} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className="w-full resize-y rounded-xl border border-black/20 bg-white px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30" />
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-3 text-sm font-bold dark:border-white/10">
                        <input type="checkbox" checked={draft.confirmed} onChange={(event) => setDraft({ ...draft, confirmed: event.target.checked })} className="mt-0.5 h-4 w-4 accent-orange-600" />
                        I confirm this Venmo payment was received.
                      </label>
                      {error && <p id={errorId} role="alert" className="rounded-xl bg-red-600/10 p-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={closePaymentForm} disabled={pending} className="min-h-11 rounded-xl border border-black/15 px-3 text-sm font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15">Cancel</button>
                        <button type="submit" disabled={pending || !draft.confirmed} aria-busy={pending} className="min-h-11 rounded-xl bg-orange-600 px-3 text-sm font-black uppercase tracking-wider text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#121212]">{pending ? "Recording…" : "Record Payment"}</button>
                      </div>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
          <p className="mt-4 text-xs font-semibold text-gray-500 dark:text-gray-400">Existing payments are append-only. Corrections require a future protected reversal workflow; no payment can be edited or deleted here.</p>
        </section>

        <OperationalFinanceAwardReviewSection
          dashboard={dashboard}
          onDashboard={setDashboard}
          onConfirmation={setConfirmation}
        />

        <OperationalFinanceExpenseReconciliationSection
          dashboard={dashboard}
          onDashboard={setDashboard}
          onConfirmation={setConfirmation}
        />

        <section aria-labelledby="activity-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600"><ReceiptText className="h-5 w-5" aria-hidden="true" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Ledger Events</p><h2 id="activity-heading" className="text-2xl font-black uppercase italic tracking-tight">Recent Activity</h2></div>
          </div>
          <ol className="space-y-3">
            {dashboard.recentActivity.map((activity) => (
              <li key={activity.eventId} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div><p className="font-black">{activity.eventLabel}</p><p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{activity.targetLabel} · {activity.actorLabel}</p></div>
                  <time dateTime={activity.createdAt} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-gray-500"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{formatActivityTimestamp(activity.createdAt)}</time>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{activity.reason}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-8 flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
          <ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden="true" />
          Protected commissioner view. Finance data and mutations remain server-only.
        </footer>
      </main>
    </div>
  );
}
