"use client";

import Link from "next/link";
import type { CommissionerPostDraftReportRow } from "@/lib/commissionerPostDraftIndex";

const gradeRank: Record<string, number> = { "A+": 13, A: 12, "A-": 11, "B+": 10, B: 9, "B-": 8, "C+": 7, C: 6, "C-": 5, "D+": 4, D: 3, "D-": 2, F: 1 };

function bestBy(rows: CommissionerPostDraftReportRow[], value: (row: CommissionerPostDraftReportRow) => number | null, descending = true) {
  return rows.filter((row) => value(row) !== null).sort((a, b) => (value(b)! - value(a)!) * (descending ? 1 : -1))[0] ?? null;
}

export default function ReportCardOverview({ reportIndex, ownerMode = false }: { reportIndex: CommissionerPostDraftReportRow[]; ownerMode?: boolean }) {
  const rows = [...reportIndex].sort((a, b) => (b.draftScore ?? -Infinity) - (a.draftScore ?? -Infinity));
  const summaries = [
    ["Best Draft Grade", bestBy(rows, (row) => row.draftGrade ? gradeRank[row.draftGrade] ?? null : null), (row: CommissionerPostDraftReportRow) => row.draftGrade],
    ["Highest Draft Score", bestBy(rows, (row) => row.draftScore), (row: CommissionerPostDraftReportRow) => row.draftScore?.toFixed(1)],
    ["Best Value Efficiency", bestBy(rows, (row) => row.valueEfficiency), (row: CommissionerPostDraftReportRow) => row.valueEfficiency?.toFixed(1)],
    ["Best Roster Construction", bestBy(rows, (row) => row.rosterConstruction), (row: CommissionerPostDraftReportRow) => row.rosterConstruction?.toFixed(1)],
    ["Best Budget Management", bestBy(rows, (row) => row.budgetManagement), (row: CommissionerPostDraftReportRow) => row.budgetManagement?.toFixed(1)],
    ["Best Keeper Efficiency", bestBy(rows, (row) => row.keeperEfficiency), (row: CommissionerPostDraftReportRow) => row.keeperEfficiency?.toFixed(1)],
    ["Lowest Draft Score", bestBy(rows, (row) => row.draftScore, false), (row: CommissionerPostDraftReportRow) => row.draftScore?.toFixed(1)],
  ] as const;

  return <section className="rounded-3xl border-2 border-orange-600/30 bg-white p-5 shadow-sm dark:border-orange-400/30 dark:bg-[#121212]" aria-labelledby="report-card-overview-title">
    <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">League overview</p><h2 id="report-card-overview-title" className="mt-1 text-3xl font-black uppercase italic">Post-Draft Report Cards</h2><p className="mt-2 text-sm font-semibold text-slate-500">Current 2026 team names · factual reports · private strategy remains owner-scoped.</p></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summaries.filter(([, row]) => row).map(([label, row, display]) => <div key={label} className="rounded-xl border border-slate-900/10 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 truncate text-sm font-black">{display(row!)}</p>{label !== "Best Draft Grade" && <p className="mt-1 truncate text-xs font-bold text-orange-700">{row!.teamName}</p>}</div>)}</div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row, index) => <article key={row.franchiseId} className="rounded-2xl border border-slate-900/10 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Rank #{index + 1}</p><h3 className="mt-1 text-lg font-black">{row.teamName}</h3><p className="text-xs font-semibold text-slate-500">{row.ownerName}</p></div><div className="text-right"><p className="text-2xl font-black">{row.draftGrade ?? "N/A"}</p><p className="text-xs font-bold">{row.draftScore === null ? "N/A" : row.draftScore.toFixed(2)}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-[9px] font-black uppercase text-slate-500">Value</p><p className="font-black">{row.valueEfficiency?.toFixed(1) ?? "N/A"}</p></div><div><p className="text-[9px] font-black uppercase text-slate-500">Roster</p><p className="font-black">{row.rosterConstruction?.toFixed(1) ?? "N/A"}</p></div><div><p className="text-[9px] font-black uppercase text-slate-500">Budget</p><p className="font-black">{row.budgetManagement?.toFixed(1) ?? "N/A"}</p></div></div><Link href={`/commish/post-draft/report?franchiseId=${encodeURIComponent(row.franchiseId)}`} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-orange-600 px-3 text-[10px] font-black uppercase tracking-widest text-white">View report</Link></article>)}</div>
  </section>;
}
