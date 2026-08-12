"use client";

const exports = [
  ["json", "Download Finance JSON"],
  ["report", "Download Reconciliation Report"],
  ["dues-status", "Download Dues CSV"],
  ["obligations", "Download Obligations CSV"],
  ["settlements", "Download Settlements CSV"],
  ["expenses", "Download Expenses CSV"],
  ["contributions", "Download Contributions CSV"],
] as const;

export default function OperationalFinanceExportSection() {
  return <section aria-labelledby="export-heading" className="mt-10 rounded-3xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-[#121212] sm:p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">Commissioner backup</p>
    <h2 id="export-heading" className="text-2xl font-black uppercase italic tracking-tight">Export Operational Finance</h2>
    <p className="mt-1 text-sm font-semibold text-gray-500">Private server-generated exports. The immutable close archive remains the canonical long-term record; payment contacts are intentionally excluded.</p>
    <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{exports.map(([format, label]) => <a key={format} href={`/api/commish/finance/2026/exports?format=${format}`} className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl border border-orange-600/30 px-3 py-2 text-center text-xs font-black uppercase text-orange-700 transition hover:bg-orange-600/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 dark:text-orange-300">{label}</a>)}</div>
  </section>;
}
