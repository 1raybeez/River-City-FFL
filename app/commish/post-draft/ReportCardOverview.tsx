"use client";

import Link from "next/link";
import type { CommissionerPostDraftReportRow } from "@/lib/commissionerPostDraftIndex";

const gradeRank: Record<string, number> = { "A+": 13, A: 12, "A-": 11, "B+": 10, B: 9, "B-": 8, "C+": 7, C: 6, "C-": 5, "D+": 4, D: 3, "D-": 2, F: 1 };

function bestBy(rows: CommissionerPostDraftReportRow[], value: (row: CommissionerPostDraftReportRow) => number | null, descending = true) {
  return rows.filter((row) => value(row) !== null).sort((a, b) => (value(b)! - value(a)!) * (descending ? 1 : -1))[0] ?? null;
}

export default function ReportCardOverview({ reportIndex }: { reportIndex: CommissionerPostDraftReportRow[] }) {
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
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-xs"><caption className="sr-only">All 2026 post-draft report cards ordered by draft score</caption><thead className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-white/10"><tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Current Team</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3">Grade</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Power Rank</th><th className="px-3 py-3">Spend</th><th className="px-3 py-3">Coverage</th><th className="px-3 py-3">Report</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.franchiseId} className="border-b border-slate-100 dark:border-white/5"><td className="px-3 py-3 font-black">{index + 1}</td><td className="px-3 py-3 font-bold">{row.teamName}</td><td className="px-3 py-3">{row.ownerName}</td><td className="px-3 py-3 font-black">{row.draftGrade ?? "N/A"}</td><td className="px-3 py-3">{row.draftScore === null ? "N/A" : row.draftScore.toFixed(1)}</td><td className="px-3 py-3">{row.powerRank === null ? "N/A" : `#${row.powerRank}`}</td><td className="px-3 py-3">{row.totalSpend === null ? "N/A" : `$${row.totalSpend.toFixed(0)}`}</td><td className="px-3 py-3">{row.reportStatus}</td><td className="px-3 py-3"><Link href={`/commish/post-draft/report?franchiseId=${encodeURIComponent(row.franchiseId)}`} className="font-black uppercase tracking-widest text-orange-700 underline">View report</Link></td></tr>)}</tbody></table></div>
  </section>;
}
