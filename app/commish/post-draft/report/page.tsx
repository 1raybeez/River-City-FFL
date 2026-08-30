import Link from "next/link";
import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getCommissionerPostDraftReport } from "@/lib/postDraftWorkflow";

function value(value: number | null | undefined, prefix = "") {
  return typeof value === "number" ? `${prefix}${value.toFixed(1)}` : "N/A";
}

export default async function CommissionerPostDraftReportPage({ searchParams }: { searchParams: Promise<{ franchiseId?: string }> }) {
  const { franchiseId } = await searchParams;
  if (!franchiseId) redirect("/commish/post-draft");
  let report;
  try {
    report = await getCommissionerPostDraftReport(franchiseId);
  } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft");
    throw error;
  }
  const { publicRecord, draftGrade } = report;
  const metrics = publicRecord.metrics;
  const gradeParts = draftGrade ? [
    ["Value Efficiency", draftGrade.valueEfficiency],
    ["Roster Construction", draftGrade.rosterConstruction],
    ["Budget Management", draftGrade.budgetManagement],
    ["Keeper Efficiency", draftGrade.keeperEfficiency],
  ] as const : [];
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6"><Link href="/commish/post-draft" className="inline-flex min-h-11 items-center rounded-xl border border-slate-900/10 px-4 text-xs font-black uppercase tracking-widest dark:border-white/10">Back to Post-Draft Reports</Link><header className="rounded-3xl bg-[#071a33] p-6 text-white"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-300">Commissioner-only factual report · {publicRecord.season}</p><h1 className="mt-2 text-4xl font-black uppercase italic">{publicRecord.teamName}</h1><p className="mt-2 text-sm font-semibold text-white/65">Public/factual report view. Private War Room strategy sections are not included.</p></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[["Draft Grade", draftGrade?.letterGrade ?? "N/A"],["Draft Score", value(draftGrade?.draftScore)],["Power Rank", metrics.powerRanking.rank ? `#${metrics.powerRanking.rank}` : "N/A"],["Total Spend", value(metrics.totalSpend, "$" )],["Remaining", value(metrics.remainingBudget, "$" )],["Coverage", draftGrade?.status === "partial" ? "Partial" : draftGrade?.status ?? "N/A"]].map(([label, display]) => <div key={label} className="rounded-xl border border-slate-900/10 bg-white p-4 dark:border-white/10 dark:bg-[#121212]"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{display}</p></div>)}</section><section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Grade Components</h2><div className="mt-4 grid gap-2">{draftGrade ? gradeParts.map(([label, part]) => <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-3 text-sm dark:bg-white/[0.04]"><span className="font-bold">{label}</span><span className="font-black">{value(part.score)} · {part.status}</span></div>) : <p className="text-sm font-semibold text-slate-500">Draft grade unavailable.</p>}</div></div><div className="rounded-2xl border border-slate-900/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Coverage & Roster</h2><div className="mt-4 grid gap-2 text-sm font-semibold"><p>Roster: {metrics.rosterCompleteness.filledSlots}/{metrics.rosterCompleteness.capacity ?? "N/A"}</p><p>Starters covered: {metrics.coveredStarterSlots}</p><p>Uncovered starter slots: {metrics.uncoveredStarterSlots}</p><p>Comparable players: {metrics.valueDifferential.comparablePlayerCount}</p>{draftGrade?.coverageWarnings.map((warning) => <p key={warning} className="text-orange-700">{warning}</p>)}</div></div></section></main></SiteShell>;
}
