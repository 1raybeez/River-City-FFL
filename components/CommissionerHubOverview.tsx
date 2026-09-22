import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, CircleAlert, Clock3, Shield } from "lucide-react";
import type { AttentionItem, CommissionerHubModel, OperationalBlocker, WeeklyOperations } from "@/lib/commissionerHub";

function attentionTone(item: AttentionItem) {
  if (item.severity === "ERROR") return "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10";
  if (item.severity === "WARNING") return "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10";
  return "border-sky-200 bg-sky-50 dark:border-sky-500/20 dark:bg-sky-500/10";
}

function blockerTone(blocker: OperationalBlocker) {
  if (blocker.requiresHumanAction || blocker.severity === "ERROR") return "text-red-700 dark:text-red-300";
  if (blocker.severity === "WARNING") return "text-amber-700 dark:text-amber-300";
  return "text-slate-600 dark:text-white/60";
}

function operationSummary(weekly: WeeklyOperations) {
  const week = weekly.week === null ? "Current week" : `Week ${weekly.week}`;
  return `${week} · ${weekly.lifecycle.replaceAll("_", " ")}`;
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const destination = item.destination;
  return (
    <article className={`rounded-2xl border p-4 ${attentionTone(item)}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-orange-600" aria-hidden="true"><CircleAlert className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black uppercase tracking-tight text-[#071a33] dark:text-white">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-white/70">{item.description}</p>
          {destination ? (
            <Link href={destination} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
              {item.ctaLabel}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : <span className="mt-3 inline-flex text-[10px] font-black uppercase tracking-widest text-slate-500">{item.ctaLabel}</span>}
        </div>
      </div>
    </article>
  );
}

function WeeklyOperationsSummary({ weekly }: { weekly: WeeklyOperations }) {
  const blockers = weekly.blockers.filter((blocker) => blocker.state === "ACTIVE");
  const rows = [
    ["Matchups", weekly.matchupState],
    ["Finalization", weekly.finalizationState],
    ["Awards", weekly.awardState],
    ["Standings", weekly.standingsState],
    ["Rankings", weekly.rankingsState],
    ["Predictor", weekly.predictorState],
  ] as const;
  return (
    <section aria-labelledby="weekly-operations-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-[#121212]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Operations</p>
          <h2 id="weekly-operations-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">Weekly Operations</h2>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-white/60">{operationSummary(weekly)}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {weekly.automationHealth ?? "Status unknown"}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-xs font-black uppercase text-slate-800 dark:text-white">{value ?? "Unknown"}</p></div>)}
      </div>
      <details className="mt-4 rounded-xl border border-slate-200 dark:border-white/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-white/60">
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" aria-hidden="true" />Operational detail</span><ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-slate-200 px-4 py-4 text-sm dark:border-white/10">
          <p className="text-slate-600 dark:text-white/60">Latest safely completed week: <span className="font-black text-slate-900 dark:text-white">{weekly.latestSafelyCompletedWeek ?? "None reported"}</span></p>
          <p className="text-slate-600 dark:text-white/60">Freshness: <span className="font-black text-slate-900 dark:text-white">{weekly.freshness ?? "Unknown"}</span></p>
          <p className="text-slate-600 dark:text-white/60">Automation: <span className="font-black text-slate-900 dark:text-white">{weekly.automationHealth ?? "Unknown"}</span></p>
          {blockers.length > 0 ? <ul className="space-y-2" aria-label="Operational blockers">{blockers.map((blocker) => <li key={blocker.code} className="flex gap-2"><AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${blockerTone(blocker)}`} aria-hidden="true" /><span><span className="font-black text-slate-900 dark:text-white">{blocker.title}</span><span className="ml-1 text-slate-600 dark:text-white/60">{blocker.description}</span></span></li>)}</ul> : <p className="text-emerald-700 dark:text-emerald-300">No active operational blockers.</p>}
        </div>
      </details>
    </section>
  );
}

export default function CommissionerHubOverview({ model }: { model: CommissionerHubModel }) {
  const attention = model.attentionItems;
  return <div className="space-y-6">
    <section aria-labelledby="commissioner-hub-identity" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-[#121212]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg"><Shield className="h-7 w-7" aria-hidden="true" /></div>
        <div>
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Commissioner Hub</p>
          <h1 id="commissioner-hub-identity" className="text-4xl font-black uppercase italic tracking-tighter text-[#071a33] sm:text-5xl dark:text-white">{model.leagueIdentity.leagueName} Commissioner Hub</h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-gray-400">Season {model.leagueIdentity.season} · {model.leagueIdentity.teamCount ?? "—"} teams · read-only operating overview.</p>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-gray-400">League administration, finance, governance, maintenance, and draft operations.</p>
        </div>
      </div>
    </section>
    <section aria-labelledby="needs-attention-heading">
      <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Commissioner queue</p><h2 id="needs-attention-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">Needs Attention</h2></div>{attention.length > 0 && <span className="rounded-full bg-orange-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white">{attention.length} item{attention.length === 1 ? "" : "s"}</span>}</div>
      {attention.length === 0 ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black uppercase tracking-widest text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />All caught up <span className="font-medium normal-case tracking-normal text-emerald-700 dark:text-emerald-200">No commissioner action required.</span></div> : <div className="grid gap-3 md:grid-cols-2">{attention.map((item) => <AttentionCard key={item.id} item={item} />)}</div>}
    </section>
    <WeeklyOperationsSummary weekly={model.weeklyOperations} />
  </div>;
}
