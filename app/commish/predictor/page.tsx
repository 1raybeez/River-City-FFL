import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { getPredictorCalibrationProgress } from "@/lib/predictor/calibrationStatus";
import { CloudStorageShadowResultStore } from "@/lib/predictor/durableShadowStore";
import { SHADOW_SIMULATION_COUNT } from "@/lib/predictor/shadowSimulation";
import { CloudStorageValidationHistoryStore } from "@/lib/predictor/validationHistory";
import PromotionForm from "./PromotionForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validationStatus(input: { evaluatedWeeks: number; current: boolean }) {
  if (input.evaluatedWeeks > 0) return input.current ? "VALIDATED · CURRENT" : "VALIDATED · STALE";
  return input.current ? "AWAITING OUTCOME · CURRENT" : "AWAITING OUTCOME · STALE";
}

export default async function CommissionerPredictorPage() {
  try { await requireAuctionAccess("maintenance"); } catch (error) { if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpredictor"); throw error; }
  const progress = await getPredictorCalibrationProgress();
  const shadowStore = new CloudStorageShadowResultStore();
  const [shadow, history] = await Promise.all([
    shadowStore.readLatest(2026).catch(() => null),
    new CloudStorageValidationHistoryStore().list(2026).catch(() => []),
  ]);
  const historyRows = await Promise.all(history.map(async record => ({ record, shadow: await shadowStore.read(record.shadowResultId).catch(() => null) })));
  const current = Boolean(shadow && progress.readiness === "SHADOW_READY" && shadow.inputIdentities?.standings && shadow.inputIdentities?.schedule && shadow.inputIdentities?.expectedScores);
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header className="rounded-3xl bg-[#071a33] p-6 text-white shadow-sm sm:p-10"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Commissioner-only · read-only until promotion</p><h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-6xl">Predictor Shadow Mode</h1><p className="mt-4 text-white/75">{SHADOW_SIMULATION_COUNT.toLocaleString()} simulations · readiness {progress.readiness}</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Evidence summary</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><p><b>Player samples</b><br />{progress.playerSamples} / 50</p><p><b>Team samples</b><br />{progress.teamSamples} / 12</p><p><b>Eligible weeks</b><br />{progress.eligibleWeeks.length ? progress.eligibleWeeks.join(", ") : "None"}</p></div><p className="mt-4 text-sm text-slate-600">{progress.explanation}</p>{progress.projectedStandingsReason ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Projected standings: {progress.projectedStandingsReason}</p> : null}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Current shadow result</h2>{shadow ? <><div className="mt-4 grid gap-3 sm:grid-cols-4"><p><b>Through Week</b><br />{shadow.throughWeek}</p><p><b>Simulations</b><br />{shadow.simulationCount.toLocaleString()}</p><p><b>Generated</b><br />{shadow.generatedAt}</p><p><b>Status</b><br />{current ? "CURRENT" : "STALE / GATED"}</p></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shadow.teamResults.map(team => <article key={team.franchiseId} className="rounded-xl border border-slate-200 p-3 text-sm"><p className="font-black">{team.teamName}</p><p className="mt-1 text-slate-600">Finish {team.projectedFinish} · Playoff {(team.playoffProbability * 100).toFixed(1)}%</p><p className="mt-1 text-slate-600">Championship {team.championshipProbability === null ? "unavailable" : `${(team.championshipProbability * 100).toFixed(1)}%`}</p></article>)}</div></> : <p className="mt-3 text-sm text-slate-600">No durable shadow result exists. The weekly operations pipeline remains data-gated.</p>}</section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Validation history</h2>{historyRows.length ? <div className="mt-4 space-y-3">{historyRows.map(({ record, shadow: recordedShadow }) => { const rowCurrent = Boolean(current && recordedShadow?.resultId === shadow?.resultId); const errors = Object.values(record.metrics.projectedFinishError); const summary = errors.length ? `Rank error recorded for ${errors.length} team${errors.length === 1 ? "" : "s"}; mean ${ (errors.reduce((sum, value) => sum + value, 0) / errors.length).toFixed(2) }` : "No projected-standing comparison stored"; return <article key={record.validationId} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black">Through Week {record.throughWeek}</p><p className="text-xs text-slate-500">Generated {recordedShadow?.generatedAt ?? record.evaluatedAt} · {recordedShadow?.simulationCount?.toLocaleString() ?? "Simulation count unavailable"} simulations</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700">{validationStatus({ evaluatedWeeks: record.metrics.evaluatedWeeks, current: rowCurrent })}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"><p><b>Readiness</b><br />{recordedShadow?.readinessState ?? "Unavailable"}</p><p><b>Projected standings</b><br />{summary}</p><p><b>Playoff validation</b><br />{record.metrics.playoffBrierScore === null ? "Not resolved" : `Brier ${record.metrics.playoffBrierScore.toFixed(4)}`}</p><p><b>Evidence</b><br />{recordedShadow?.inputEvidenceChecksums.length ? "Versioned inputs present" : "Unavailable"}</p></div></article>; })}</div> : <p className="mt-3 text-sm text-slate-600">Validation history will appear here after shadow predictions can be compared with later finalized outcomes.</p>}</section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Promotion</h2><p className="mt-3 text-sm text-slate-700">Promotion requires current SHADOW_READY evidence, a non-stale durable result, calibrated variance, explicit confirmation, and immutable commissioner audit metadata.</p>{shadow ? <PromotionForm shadowResultId={shadow.resultId} checksums={shadow.inputEvidenceChecksums} eligible={current} /> : null}</section>
  </main></SiteShell>;
}
