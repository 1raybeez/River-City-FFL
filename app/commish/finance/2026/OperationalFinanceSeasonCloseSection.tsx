"use client";

import { useState } from "react";
import type { OperationalFinanceCommissionerDashboardPresentation } from "@/lib/finance/operationalFinanceAwardReview";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
export default function OperationalFinanceSeasonCloseSection({
  dashboard,
  onDashboard,
  onConfirmation,
}: {
  dashboard: OperationalFinanceCommissionerDashboardPresentation;
  onDashboard: (value: OperationalFinanceCommissionerDashboardPresentation) => void;
  onConfirmation: (value: string | null) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconciliation = dashboard.reconciliation;
  const blockers = reconciliation.checks.filter((entry) => entry.state !== "PASS");

  const closeSeason = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!confirmed || pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/commish/finance/2026/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, idempotencyKey: `commissioner-close-2026-${crypto.randomUUID()}` }),
      });
      const payload = await response.json() as { archiveHash?: string; error?: string };
      if (!response.ok || !payload.archiveHash) throw new Error(payload.error || "Season close failed.");
      onConfirmation(`2026 is closed and archived immutably. Archive ${payload.archiveHash.slice(0, 12)}…`);
      onDashboard(dashboard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Season close failed.");
    } finally {
      setPending(false);
    }
  };

  return <section aria-labelledby="season-close-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Commissioner Close</p>
    <h2 id="season-close-heading" className="text-2xl font-black uppercase italic tracking-tight">Season Close / Historical Archive</h2>
    <p className="mt-1 text-sm font-semibold text-gray-500">Closing freezes the reconciled season into private historical finance. Closed history cannot be edited or casually reopened.</p>
    {blockers.length > 0 ? <div className="mt-4 rounded-2xl border border-amber-600/25 bg-amber-600/10 p-4"><p className="text-sm font-black uppercase text-amber-800 dark:text-amber-200">Close blocked</p><ul className="mt-2 space-y-2 text-sm font-semibold text-amber-900 dark:text-amber-100">{blockers.map((blocker) => <li key={blocker.id}><span className="font-black">{blocker.state} · {blocker.label}:</span> {blocker.detail}</li>)}</ul></div> : <form onSubmit={closeSeason} className="mt-4 rounded-2xl border border-emerald-600/25 bg-emerald-600/10 p-4"><p className="text-sm font-black uppercase text-emerald-800 dark:text-emerald-200">Ready to close</p><p className="mt-2 text-sm font-semibold">Final allocation {money(reconciliation.currentlyAllocatedCents)} · no unexplained dues-pool cents.</p><label className="mt-4 flex items-start gap-3 text-sm font-bold"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-orange-600" />I confirm this final reconciliation and understand that close creates an immutable historical archive.</label><button disabled={!confirmed || pending} className="mt-4 min-h-11 rounded-xl bg-orange-600 px-4 text-sm font-black uppercase text-white disabled:opacity-50">{pending ? "Closing…" : "Close 2026 Season"}</button></form>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-600/10 p-3 text-sm font-bold text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
