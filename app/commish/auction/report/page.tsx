import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, ShieldAlert } from "lucide-react";
import { SignOutControl } from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getAuthorizedWarRoomPostDraftReport } from "@/lib/warRoomPostDraftReport";

function money(value: number | null | undefined) {
  return typeof value === "number" ? `$${value.toFixed(0)}` : "N/A";
}

function display(value: number | null | undefined) {
  return typeof value === "number" ? String(value) : "N/A";
}

function score(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "N/A";
}

function numeric(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(1) : "N/A";
}

function Status({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-orange-600/25 bg-orange-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">{children}</span>;
}

function Card({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-6">
    {eyebrow ? <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-600">{eyebrow}</p> : null}
    <h2 className="mt-1 text-xl font-black uppercase italic tracking-tight">{title}</h2>
    {children}
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return <div className="rounded-xl border border-slate-900/10 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">{label}</p>
    <p className="mt-2 text-2xl font-black">{value}</p>
    {detail ? <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/55">{detail}</p> : null}
  </div>;
}

function PrivateLabel() {
  return <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-600">Private War Room Analysis</p>;
}

export default async function WarRoomPostDraftReportPage() {
  let report;
  try {
    report = await getAuthorizedWarRoomPostDraftReport();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/auction/login?returnTo=%2Fcommish%2Fauction%2Freport");
    }
    throw error;
  }

  if (!report.report) {
    return <ReportFrame>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/commish/auction" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-900/10 px-4 text-xs font-black uppercase tracking-widest transition hover:border-orange-600/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/10">
          <ArrowLeft className="h-4 w-4" /> Back to War Room
        </Link>
        <Card title="Post-Draft Report Not Ready" eyebrow="Factual status">
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-orange-600/25 bg-orange-600/10 p-4 text-sm font-semibold text-orange-800 dark:text-orange-200">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div><p>Final Sleeper auction draft completion is required before this report is available.</p><p className="mt-1 text-xs">Current source status: {report.sourceDraftStatus || "unknown"}.</p></div>
          </div>
          {report.coverageWarnings.length > 0 ? <ul className="mt-5 space-y-2 text-xs font-semibold text-slate-600 dark:text-white/60">{report.coverageWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
        </Card>
      </div>
    </ReportFrame>;
  }

  const data = report.report;
  const metrics = data.publicRecord.metrics;
  const grade = data.draftGrade;
  const strategy = data.strategyExecution;
  const gradeParts = grade ? [
    ["Value Efficiency", grade.valueEfficiency],
    ["Roster Construction", grade.rosterConstruction],
    ["Budget Management", grade.budgetManagement],
    ["Keeper Efficiency", grade.keeperEfficiency],
  ] as const : [];
  const strategyParts = strategy ? [
    ["Target Execution", strategy.targetExecution],
    ["Cap Discipline", strategy.capDiscipline],
    ["Roster Plan Execution", strategy.rosterPlanExecution],
  ] as const : [];

  return <ReportFrame>
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-7 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/commish/auction" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-900/10 px-4 text-xs font-black uppercase tracking-widest transition hover:border-orange-600/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/10"><ArrowLeft className="h-4 w-4" /> Back to War Room</Link>
        <Status>{report.status === "partial" ? "Partial coverage" : "Final factual report"}</Status>
      </div>

      <header className="rounded-3xl bg-[#071a33] p-6 text-white shadow-xl sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-300">Private War Room · {report.season}</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">Post-Draft Report</h1><p className="mt-3 text-sm font-semibold text-white/65">{report.teamName} · factual franchise analysis</p></div><Lock className="h-8 w-8 text-orange-300" aria-label="Private report" /> </div>
      </header>

      <section aria-labelledby="report-summary" className="space-y-3">
        <h2 id="report-summary" className="sr-only">Report summary</h2>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Executive Summary</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Draft Grade" value={grade?.letterGrade ?? "N/A"} detail={`Score ${score(grade?.draftScore)}`} />
          <Metric label="Draft Score" value={score(grade?.draftScore)} detail={grade?.status ?? "Unavailable"} />
          <Metric label="Strategy Execution" value={strategy?.strategyExecutionScore === null || strategy?.strategyExecutionScore === undefined ? "N/A" : score(strategy.strategyExecutionScore)} detail={strategy?.executionLabel ?? "Unavailable"} />
          <Metric label="Power Rank" value={metrics.powerRanking.rank ? `#${metrics.powerRanking.rank}` : "N/A"} detail={metrics.powerRanking.status ?? "Unavailable"} />
          <Metric label="Total Spend" value={money(metrics.totalSpend)} detail="Authoritative budget $200" />
          <Metric label="Remaining" value={money(metrics.remainingBudget)} detail="Post-draft budget" />
        </div>
      </section>

      <section aria-labelledby="what-happened" className="space-y-3">
        <h2 id="what-happened" className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">What Happened</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Value" eyebrow="Public-safe factual metrics"><div className="mt-5 grid gap-3 sm:grid-cols-3"><Metric label="Value differential" value={numeric(metrics.valueDifferential.total)} detail={`${metrics.valueDifferential.comparablePlayerCount} comparable players`} /><Metric label="Best Buy" value={metrics.bestBuy?.playerName ?? "N/A"} detail={metrics.bestBuy ? `${numeric(metrics.bestBuy.valueDifferential)} differential` : undefined} /><Metric label="Biggest Reach" value={metrics.biggestReach?.playerName ?? "N/A"} detail={metrics.biggestReach ? `${numeric(metrics.biggestReach.valueDifferential)} differential` : undefined} /></div></Card>
          <Card title="Roster" eyebrow="Deterministic post-draft metrics"><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Starters" value={`${metrics.coveredStarterSlots}/${Object.values(metrics.requiredStarterSlots).reduce((sum, count) => sum + count, 0)}`} /><Metric label="Uncovered" value={metrics.uncoveredStarterSlots} /><Metric label="Useful depth" value={metrics.totalDepth} /><Metric label="Roster" value={`${metrics.rosterCompleteness.filledSlots}/${display(metrics.rosterCompleteness.capacity)}`} /></div><p className="mt-4 text-sm font-semibold">{metrics.uncoveredStarterSlots > 0 ? `${metrics.uncoveredStarterSlots} required starter slot${metrics.uncoveredStarterSlots === 1 ? "" : "s"} uncovered.` : "All required starter slots covered."}</p></Card>
          <Card title="Budget" eyebrow="Authoritative $200 budget"><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Total spend" value={money(metrics.totalSpend)} /><Metric label="Remaining" value={money(metrics.remainingBudget)} /><Metric label="Non-keeper spend" value={money(metrics.nonKeeperAuctionSpend)} /></div></Card>
          <Card title="Keepers" eyebrow="Public-safe factual metrics"><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Keeper count" value={metrics.keeperCount} /><Metric label="Keeper cost" value={money(metrics.totalKeeperCost)} /><Metric label="Value differential" value={numeric(metrics.keeperValueDifferential)} /></div></Card>
        </div>
      </section>

      <section aria-labelledby="detail" className="space-y-3">
        <h2 id="detail" className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Detail</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Draft Grade Breakdown" eyebrow="Public model · river-city-draft-grade-v1"><div className="mt-5 grid gap-3 sm:grid-cols-2">{gradeParts.map(([label, part]) => <div key={label} className="rounded-xl border border-slate-900/10 p-4 dark:border-white/10"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black uppercase">{label}</p><Status>{part.status}</Status></div><p className="mt-3 text-3xl font-black">{score(part.score)}</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/50">Effective weight {part.effectiveWeight}% · Base {part.baseWeight}%</p></div>)}</div></Card>
          <Card title="Strategy Execution" eyebrow="Private model · river-city-strategy-execution-v1"><PrivateLabel />{strategy ? <div className="mt-5 grid gap-3">{strategyParts.map(([label, part]) => <div key={label} className="rounded-xl border border-slate-900/10 p-4 dark:border-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black uppercase">{label}</p><Status>{part.status}</Status></div><div className="mt-2 flex items-baseline justify-between gap-3"><p className="text-2xl font-black">{score(part.score)}</p><p className="text-xs font-bold text-slate-500 dark:text-white/50">Effective {part.effectiveWeight}%</p></div></div>)}</div> : <p className="mt-5 text-sm font-semibold text-slate-500">Strategy Execution unavailable.</p>}</Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Roster Construction" eyebrow="Deterministic post-draft metrics"><div className="mt-5 grid gap-2 sm:grid-cols-2">{Object.entries(metrics.starterCoverageByPosition).map(([position, slot]) => <div key={position} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold dark:bg-white/[0.04]"><span>{position}</span><span>{slot.covered}/{slot.required} covered</span></div>)}</div><p className="mt-4 text-sm font-semibold">Depth: {Object.entries(metrics.depthByPosition).map(([position, count]) => `${position} ${count}`).join(" · ") || "Unavailable"}. Roster completeness: {metrics.rosterCompleteness.filledSlots}/{display(metrics.rosterCompleteness.capacity)}.</p></Card>
          <Card title="Position Spend" eyebrow="Factual acquisition overview"><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><caption className="sr-only">Position spending overview</caption><thead className="text-[9px] font-black uppercase tracking-widest text-slate-500"><tr><th className="pb-2 pr-3">Position</th><th className="pb-2 pr-3">Players</th><th className="pb-2">Spend</th></tr></thead><tbody className="divide-y divide-slate-900/10 dark:divide-white/10">{Object.entries(metrics.positionSpend).map(([position, detail]) => <tr key={position}><th scope="row" className="py-2 pr-3 font-black">{position}</th><td className="py-2 pr-3">{detail.playerCount}</td><td className="py-2">{money(detail.totalSpend)}</td></tr>)}</tbody></table></div></Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Keepers" eyebrow="Factual keeper metrics"><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Count" value={metrics.keeperCount} /><Metric label="Cost" value={money(metrics.totalKeeperCost)} /><Metric label="Published value" value={numeric(metrics.keeperPublishedValue)} /><Metric label="Differential" value={numeric(metrics.keeperValueDifferential)} /></div><p className="mt-4 text-xs font-semibold text-slate-500 dark:text-white/50">Keeper player rows are not included in the current report contract.</p></Card>
          <Card title="Power Rank Context" eyebrow="Preseason roster-strength context"><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Rank" value={metrics.powerRanking.rank ? `#${metrics.powerRanking.rank}` : "N/A"} /><Metric label="Roster value" value={numeric(metrics.powerRanking.rosterValue)} /><Metric label="Average SOS" value={numeric(metrics.powerRanking.averageSOS)} /><Metric label="Index" value={numeric(metrics.powerRanking.normalizedIndex)} /></div><p className="mt-4 text-sm font-semibold">This is roster-strength context, not playoff odds or win probability.</p></Card>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Target Execution" eyebrow="Private War Room Analysis"><PrivateLabel /><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Explicit targets" value={strategy?.explanation.targetedCount ?? "N/A"} /><Metric label="Acquired" value={strategy?.explanation.acquiredTargetCount ?? "N/A"} /><Metric label="Missed" value={strategy?.explanation.missedTargetCount ?? "N/A"} /></div><p className="mt-4 text-sm font-bold">Hit rate: {strategy?.targetExecution.score === null || strategy?.targetExecution.score === undefined ? "N/A" : `${score(strategy.targetExecution.score)}%`}</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Acquired targets</h3><ul className="mt-2 space-y-1 text-sm font-semibold">{(strategy?.explanation.acquiredTargets ?? []).map((target) => <li key={target.playerId}>{target.playerName}</li>)}</ul></div><div><h3 className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">Missed targets</h3><ul className="mt-2 space-y-1 text-sm font-semibold">{(strategy?.explanation.missedTargets ?? []).map((target) => <li key={target.playerId}>{target.playerName}</li>)}</ul></div></div></Card>
          <Card title="Cap Discipline" eyebrow="Private War Room Analysis"><PrivateLabel /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><caption className="sr-only">Private planned cap and purchase comparison</caption><thead className="text-[9px] font-black uppercase tracking-widest text-slate-500"><tr><th className="pb-2 pr-3">Player</th><th className="pb-2 pr-3">Plan</th><th className="pb-2 pr-3">Paid</th><th className="pb-2 pr-3">Variance</th><th className="pb-2">Score</th></tr></thead><tbody className="divide-y divide-slate-900/10 dark:divide-white/10">{data.privateCapPurchases.map((purchase) => <tr key={purchase.playerId}><td className="py-2 pr-3 font-bold">{purchase.playerName}</td><td className="py-2 pr-3">{money(purchase.plannedCap)}</td><td className="py-2 pr-3">{money(purchase.purchasePrice)}</td><td className={`py-2 pr-3 ${purchase.variance > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>{purchase.variance > 0 ? "+" : ""}{money(purchase.variance)}</td><td className="py-2 font-black">{score(purchase.purchaseCapScore)}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs font-semibold text-slate-500 dark:text-white/50">{data.privateCapPurchases.length} valid capped acquisitions · {data.privateCapPurchases.filter((purchase) => purchase.variance > 0).length} over cap · {money(data.privateCapPurchases.reduce((sum, purchase) => sum + Math.max(purchase.variance, 0), 0))} total over cap.</p></Card>
        </div>
        <Card title="Roster Plan Execution" eyebrow="Private War Room Analysis"><PrivateLabel /><p className="mt-4 text-sm font-bold">Priority order: {data.positionPriorities.length > 0 ? data.positionPriorities.join(" → ") : "N/A"}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.positionPriorities.length > 0 ? data.positionPriorities.map((position) => <div key={position} className="flex items-center justify-between rounded-xl border border-slate-900/10 px-4 py-3 text-sm dark:border-white/10"><span className="font-black">{position}</span><span className="font-semibold">Actual spend {money(metrics.positionSpend[position]?.totalSpend ?? 0)}</span></div>) : <p className="text-sm font-semibold text-slate-500">No position priorities entered.</p>}</div><p className="mt-4 text-xs font-semibold text-slate-500 dark:text-white/50">Total spend {money(metrics.totalSpend)} · Score {score(strategy?.rosterPlanExecution.score)}</p></Card>
      </section>

      {report.coverageWarnings.length > 0 ? <Card title="Coverage & Warnings" eyebrow="Factual status"><ul className="mt-4 space-y-2 text-sm font-semibold">{report.coverageWarnings.map((warning) => <li key={warning} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />{warning}</li>)}</ul></Card> : null}
    </main>
  </ReportFrame>;
}

function ReportFrame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white"><header className="sticky top-0 z-40 border-b border-white/10 bg-[#071a33]/95 px-4 py-3 text-white backdrop-blur-md sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/commish/auction" className="flex min-w-0 items-center gap-3" aria-label="Back to River City Auction War Room"><span className="hidden text-lg font-black uppercase italic sm:block">River City Auction War Room</span><span className="text-[10px] font-black uppercase tracking-widest text-orange-300 sm:hidden">War Room Report</span></Link><div className="flex items-center gap-2"><Link href="/commish/auction" className="hidden rounded-lg border border-white/25 px-3 py-2 text-[10px] font-black uppercase tracking-widest transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:inline-flex">War Room</Link><SignOutControl /></div></div></header>{children}</div>;
}
