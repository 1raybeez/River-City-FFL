"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, CircleEllipsis } from "lucide-react";

import type { OperationalFinanceCommissionerDashboardPresentation } from "@/lib/finance/operationalFinanceAwardReview";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function cents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const result = Math.round(Number(value) * 100);
  return Number.isSafeInteger(result) && result > 0 ? result : null;
}

type Props = Readonly<{
  dashboard: OperationalFinanceCommissionerDashboardPresentation;
  onDashboard(value: OperationalFinanceCommissionerDashboardPresentation): void;
  onConfirmation(value: string): void;
}>;

export default function OperationalFinanceExpenseReconciliationSection({ dashboard, onDashboard, onConfirmation }: Props) {
  const data = dashboard.reconciliation;
  const ring = data.expenses.find((entry) => entry.category === "championship-ring");
  const food = data.expenses.find((entry) => entry.category === "auctioneer-food");
  const [form, setForm] = useState<"championship-ring" | "auctioneer-food" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [method, setMethod] = useState<"venmo" | "card" | "cash" | "other">("card");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [contributor, setContributor] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = cents(amount);
  const overCap = form === "championship-ring" && parsed ? Math.max(0, parsed - 8_000) : 0;
  const championCash = parsed && parsed <= 23_500 ? 23_500 - parsed : null;
  const control = "min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/20 dark:bg-black/30";

  async function post(url: string, body: Record<string, unknown>, success: string) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json() as { dashboard?: OperationalFinanceCommissionerDashboardPresentation; error?: string };
      if (!response.ok || !payload.dashboard) throw new Error(payload.error || "The finance record could not be saved.");
      onDashboard(payload.dashboard);
      onConfirmation(success);
      setForm(null); setAmount(""); setNote(""); setConfirmed(false);
      setPaymentFor(null); setPaymentConfirmed(false); setContributionAmount(""); setContributor("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The finance record could not be saved.");
    } finally { setPending(false); }
  }

  async function createExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !parsed) return setError("Enter an actual amount greater than $0.00.");
    if (form === "championship-ring" && parsed > 23_500) return setError("Ring cost cannot exceed the $235 championship allocation.");
    if (!confirmed) return setError(overCap ? "Explicitly approve the expanded ring funding." : "Confirm the expense first.");
    await post("/api/commish/finance/2026/expenses", {
      category: form,
      amountCents: parsed,
      ...(overCap ? { approvedRingCapOverrideCents: parsed } : {}),
      commissionerNote: note || null,
      confirmed: true,
      idempotencyKey: `commissioner-expense-${crypto.randomUUID()}`,
    }, form === "championship-ring" ? "Ring expense approved; no vendor payment was recorded." : "Separately funded food expense approved.");
  }

  async function payExpense(event: React.FormEvent, obligationId: string, remaining: number) {
    event.preventDefault();
    const value = cents(paymentAmount);
    if (!value || value > remaining) return setError("Enter a payment no greater than the expense balance.");
    if (!paymentConfirmed) return setError("Confirm the actual expense payment.");
    await post(`/api/commish/finance/2026/expenses/${encodeURIComponent(obligationId)}/settlements`, {
      amountCents: value, paymentMethod: method, actualPaidAt: null, commissionerNote: null,
      confirmed: true, idempotencyKey: `commissioner-expense-payment-${crypto.randomUUID()}`,
    }, "Actual expense payment recorded separately from approval.");
  }

  async function addContribution(event: React.FormEvent) {
    event.preventDefault();
    const value = cents(contributionAmount);
    if (!food || !value) return setError("Enter an actual contribution amount.");
    await post("/api/commish/finance/2026/contributions", {
      expenseObligationId: food.obligationId, contributorOwnerId: contributor || null,
      amountCents: value, paymentMethod: method, actualPaidAt: null, commissionerNote: null,
      confirmed: true, idempotencyKey: `commissioner-contribution-${crypto.randomUUID()}`,
    }, "Separate contribution recorded without changing dues collected.");
  }

  return <>
    <section aria-labelledby="championship-allocation-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Prize Structure</p>
      <h2 id="championship-allocation-heading" className="text-2xl font-black uppercase italic tracking-tight">Championship Allocation</h2>
      <dl className="mt-5 grid gap-3 sm:grid-cols-4">
        {[ ["Allocation", "$235"], ["Ring Cost", ring ? money(ring.amountCents) : "Not entered"], [data.approvedChampionCashCents === null ? "Projected Champion Cash" : "Champion Cash", data.projectedChampionCashCents === null ? "Pending" : money(data.projectedChampionCashCents)], ["Remaining", ring ? "$0" : "Pending"] ].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]"><dt className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</dt><dd className="mt-1 break-words text-2xl font-black">{value}</dd></div>)}
      </dl>
      {!ring && form !== "championship-ring" && <button type="button" onClick={() => { setForm("championship-ring"); setError(null); }} className="mt-5 min-h-11 w-full rounded-xl bg-orange-600 px-4 text-sm font-black uppercase text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 sm:w-auto">Enter Ring Cost</button>}
      {!ring && form === "championship-ring" && <form onSubmit={createExpense} className="mt-5 grid gap-4 rounded-2xl border border-black/10 p-4 dark:border-white/10 sm:grid-cols-2" noValidate>
        <label className="text-xs font-black uppercase">Actual ring cost<input aria-label="Actual ring cost" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${control} mt-1.5`} /></label>
        <label className="text-xs font-black uppercase">Optional note<input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className={`${control} mt-1.5`} /></label>
        {parsed && <p className="rounded-xl bg-black/[0.03] p-3 text-sm font-bold dark:bg-white/[0.04] sm:col-span-2">Default cap $80 · Over cap {money(overCap)} · Projected champion cash {championCash === null ? "Invalid" : money(championCash)}</p>}
        <label className="flex items-start gap-3 rounded-xl border border-black/10 p-3 text-sm font-bold dark:border-white/10 sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />{overCap && parsed && championCash !== null ? `I approve ${money(parsed)} of ring funding. This reduces the champion cash payout to ${money(championCash)}.` : "I confirm this actual ring cost and approve the expense obligation."}</label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2"><button type="button" onClick={() => setForm(null)} className="min-h-11 rounded-xl border border-black/15 text-sm font-black uppercase">Cancel</button><button disabled={pending || !confirmed} className="min-h-11 rounded-xl bg-orange-600 px-2 text-sm font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50">{overCap && parsed ? `Approve ${money(parsed)} Ring Funding` : "Confirm Ring Cost"}</button></div>
      </form>}
      {ring && <p className="mt-4 text-xs font-semibold text-gray-500">Approved expenses are immutable. Corrections require reversal/replacement; there is no edit or delete action.</p>}
    </section>

    <section aria-labelledby="expenses-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Actual Costs</p><h2 id="expenses-heading" className="text-2xl font-black uppercase italic tracking-tight">Expenses & Contributions</h2>
      <div className="mt-5 space-y-3">{data.expenses.map((expense) => <article key={expense.obligationId} className="rounded-2xl border border-black/10 p-4 dark:border-white/10"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><h3 className="font-black">{expense.category === "championship-ring" ? "Championship Ring" : "Auctioneer Food"}</h3><p className="text-xs font-semibold text-gray-500">{expense.fundingSource === "dues-funded" ? "Dues-funded" : "Separately funded"} · Approved {money(expense.amountCents)} · Paid {money(expense.paidCents)}</p>{expense.category === "auctioneer-food" && <p className="text-xs font-semibold text-gray-500">Contributions {money(expense.contributedCents)}</p>}</div>{expense.outstandingCents > 0 && <button type="button" onClick={() => { setPaymentFor(expense.obligationId); setPaymentAmount((expense.outstandingCents / 100).toFixed(2)); }} className="min-h-11 rounded-xl border border-orange-600 px-3 text-xs font-black uppercase text-orange-700 dark:text-orange-300">Record Payment</button>}</div>
        {paymentFor === expense.obligationId && <form onSubmit={(event) => payExpense(event, expense.obligationId, expense.outstandingCents)} className="mt-4 grid gap-3 border-t border-black/10 pt-4 sm:grid-cols-2"><label className="text-xs font-black uppercase">Amount paid<input inputMode="decimal" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className={`${control} mt-1`} /></label><label className="text-xs font-black uppercase">Payment method<select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className={`${control} mt-1`}><option value="card">Card</option><option value="cash">Cash</option><option value="venmo">Venmo</option><option value="other">Other</option></select></label><label className="flex items-start gap-3 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={paymentConfirmed} onChange={(event) => setPaymentConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />I confirm this actual expense payment.</label><button disabled={pending || !paymentConfirmed} className="min-h-11 rounded-xl bg-orange-600 text-sm font-black uppercase text-white disabled:opacity-50 sm:col-span-2">Record Expense Payment</button></form>}
      </article>)}</div>
      {!food && form !== "auctioneer-food" && <details className="mt-5 rounded-2xl border border-black/10 p-4 dark:border-white/10"><summary className="min-h-11 cursor-pointer font-black uppercase leading-[44px]">Add optional auctioneer-food expense</summary><p className="text-sm text-gray-500">Only add an actual 2026 expense. It stays outside the $600 pool.</p><button type="button" onClick={() => setForm("auctioneer-food")} className="mt-3 min-h-11 rounded-xl bg-orange-600 px-4 text-sm font-black uppercase text-white">Enter Actual Expense</button></details>}
      {!food && form === "auctioneer-food" && <form onSubmit={createExpense} className="mt-5 grid gap-4 rounded-2xl border border-black/10 p-4 dark:border-white/10 sm:grid-cols-2"><label className="text-xs font-black uppercase">Actual food cost<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${control} mt-1`} /></label><label className="text-xs font-black uppercase">Optional note<input value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} className={`${control} mt-1`} /></label><label className="flex items-start gap-3 text-sm font-bold sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />I confirm this actual expense is separately funded and outside the $600 dues pool.</label><button disabled={pending || !confirmed} className="min-h-11 rounded-xl bg-orange-600 text-sm font-black uppercase text-white disabled:opacity-50 sm:col-span-2">Approve Expense</button></form>}
      {food && <details className="mt-5 rounded-2xl border border-black/10 p-4 dark:border-white/10"><summary className="min-h-11 cursor-pointer font-black uppercase leading-[44px]">Record actual contribution</summary><form onSubmit={addContribution} className="grid gap-3 pt-3 sm:grid-cols-2"><label className="text-xs font-black uppercase">Contributor (optional)<select value={contributor} onChange={(event) => setContributor(event.target.value)} className={`${control} mt-1`}><option value="">League / not attributed</option>{dashboard.duesRows.map((row) => <option key={row.financialOwnerId} value={row.financialOwnerId}>{row.financialOwnerName}</option>)}</select></label><label className="text-xs font-black uppercase">Actual amount<input inputMode="decimal" value={contributionAmount} onChange={(event) => setContributionAmount(event.target.value)} className={`${control} mt-1`} /></label><label className="text-xs font-black uppercase">Method<select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className={`${control} mt-1`}><option value="venmo">Venmo</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option></select></label><button disabled={pending} className="min-h-11 self-end rounded-xl bg-orange-600 text-sm font-black uppercase text-white disabled:opacity-50">Record Contribution</button></form></details>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-600/10 p-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
    </section>

    <section aria-labelledby="reconciliation-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Pre-Close Checks</p><h2 id="reconciliation-heading" className="text-2xl font-black uppercase italic tracking-tight">Operational Reconciliation</h2><p className="mt-1 text-sm font-semibold text-gray-500">Season in progress · {data.readyToClose ? "Ready to close" : "Not ready to close"}. No close action is available.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><Accounting title="Allocation View" rows={[["Dues pool", data.duesPoolCents], ["Fixed prize budget", data.fixedPrizeBudgetCents], ["Championship allocation", data.championshipAllocationCents], ["Approved awards", data.approvedAwardCents], ["Approved dues-funded expenses", data.approvedDuesFundedExpenseCents], ["Currently allocated", data.currentlyAllocatedCents], ["Unallocated / remaining", data.currentlyUnallocatedCents]]} /><Accounting title="Cash View" rows={[["Dues collected", data.duesCollectedCents], ["Award payments", data.paidAwardCents], ["Expense payments", data.paidDuesFundedExpenseCents], ["Cash currently held", data.cashOnHandCents], ["Outstanding dues", data.duesOutstandingCents], ["Outstanding awards", data.outstandingAwardCents]]} /></div>
      <details className="mt-4 rounded-2xl border border-black/10 p-4 dark:border-white/10"><summary className="min-h-11 cursor-pointer font-black uppercase leading-[44px]">Expected Season Prize Structure · $600</summary><dl className="mt-2 space-y-2 text-sm">{data.expectedPrizeStructure.map((entry) => <div key={entry.label} className="flex justify-between gap-2"><dt>{entry.label}</dt><dd className="font-black">{money(entry.amountCents)}</dd></div>)}</dl></details>
      <div className="mt-4 grid gap-2">{data.checks.map((item) => { const Icon = item.state === "PASS" ? CheckCircle2 : item.state === "ISSUE" ? AlertTriangle : CircleEllipsis; const tone = item.state === "PASS" ? "text-emerald-700 dark:text-emerald-300" : item.state === "ISSUE" ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"; return <div key={item.id} className="flex items-start gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" /><div className="min-w-0"><p className={`text-xs font-black ${tone}`}>{item.state} · {item.label}</p><p className="mt-0.5 text-xs text-gray-500">{item.detail}</p></div></div>; })}</div>
    </section>
  </>;
}

function Accounting({ title, rows }: { title: string; rows: readonly (readonly [string, number])[] }) {
  return <div className="min-w-0 rounded-2xl border border-black/10 p-4 dark:border-white/10"><h3 className="font-black uppercase">{title}</h3><dl className="mt-3 space-y-2 text-sm">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{label}</dt><dd className="font-black">{money(value)}</dd></div>)}</dl></div>;
}
