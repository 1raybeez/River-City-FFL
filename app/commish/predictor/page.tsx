import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { getPredictorCalibrationProgress } from "@/lib/predictor/calibrationStatus";
import { SHADOW_SIMULATION_COUNT } from "@/lib/predictor/shadowSimulation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CommissionerPredictorPage() {
  try { await requireAuctionAccess("maintenance"); } catch (error) { if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpredictor"); throw error; }
  const progress = await getPredictorCalibrationProgress();
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><header className="rounded-3xl bg-[#071a33] p-6 text-white shadow-sm sm:p-10"><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Commissioner-only · read-only</p><h1 className="mt-3 text-4xl font-black uppercase italic tracking-tight sm:text-6xl">Predictor Shadow Mode</h1><p className="mt-4 text-white/75">{SHADOW_SIMULATION_COUNT.toLocaleString()} simulations · readiness {progress.readiness}</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Evidence summary</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><p><b>Player samples</b><br />{progress.playerSamples} / 50</p><p><b>Team samples</b><br />{progress.teamSamples} / 12</p><p><b>Eligible weeks</b><br />{progress.eligibleWeeks.length ? progress.eligibleWeeks.join(", ") : "None"}</p></div><p className="mt-4 text-sm text-slate-600">{progress.explanation}</p></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><h2 className="text-xl font-black uppercase italic text-[#071a33]">Promotion</h2><p className="mt-3 text-sm text-slate-700">A shadow result is not currently generated or persisted. Production promotion requires a valid 10,000-run shadow result and explicit commissioner approval; no promotion action is available from this read-only view.</p></section></main></SiteShell>;
}
