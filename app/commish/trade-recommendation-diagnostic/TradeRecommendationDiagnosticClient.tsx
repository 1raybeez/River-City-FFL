"use client";

import { useState } from "react";
import type { ServerDiagnosticPreset, ServerRecommendationDiagnostic } from "@/lib/tradeComparison/serverRecommendationAdapter";

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "N/A";
  return String(value);
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className={ok ? "text-emerald-700" : "text-amber-700"}>{ok ? "PASS" : "PARTIAL"} · {children}</li>;
}

function ResultCard({ result }: { result: ServerRecommendationDiagnostic["teamRecommendations"][number] }) {
  const noStarterChange = result.starterChanges.every((change) => change.evidenceDirection === "SAME" || change.evidenceDirection === "UNKNOWN");
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
    <h3 className="text-xl font-black uppercase italic">{result.franchiseName}</h3>
    <p className="mt-2 text-sm font-black uppercase tracking-wide">{result.recommendation} · {result.confidence} · {result.seasonMode}</p>
    <p className="mt-3 text-sm leading-6">{result.bottomLine}</p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section><h4 className="text-xs font-black uppercase tracking-widest text-orange-700">Why I like it</h4><ul className="mt-2 list-disc pl-5 text-sm">{result.whyILikeIt.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h4 className="text-xs font-black uppercase tracking-widest text-orange-700">What gives me pause</h4><ul className="mt-2 list-disc pl-5 text-sm">{result.whatGivesMePause.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section><h4 className="text-xs font-black uppercase tracking-widest text-orange-700">Supporting context</h4><ul className="mt-2 list-disc pl-5 text-sm">{result.supportingReasons.map((item) => <li key={item}>{item}</li>)}</ul></section>
    </div>
    <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-white/[0.05]">Diagnostic policy: {result.recommendation === "HOLD" && noStarterChange ? "No optimized starter changed, so depth and market improvement remain secondary." : "Starter, depth, market, ROS, keeper, and fairness signals are displayed separately."}</p>
    <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
      <div><h4 className="font-black uppercase tracking-widest">Starters / depth</h4><p className="mt-1">{result.lineupImpact.status} · before {result.lineupImpact.coreCompleteness} · after {result.lineupImpact.fullCompleteness}</p><p className="mt-1">Starter changes: {value(result.starterChanges.filter((change) => change.evidenceDirection !== "SAME").map((change) => `${change.slot}: ${change.before ?? "empty"} → ${change.after ?? "empty"}`).join("; "))}</p><p className="mt-1">Starting unit added: {value(result.lineupImpact.startingUnitAdded.map((player) => player.playerName ?? player.playerId).join(", "))}</p><p className="mt-1">Starting unit removed: {value(result.lineupImpact.startingUnitRemoved.map((player) => player.playerName ?? player.playerId).join(", "))}</p><p className="mt-1">Slot-only moves: {value(result.lineupImpact.slotOnlyMoves.map((move) => `${move.playerName ?? move.playerId} ${move.beforeSlot} → ${move.afterSlot}`).join("; "))}</p><p className="mt-1">Depth before: {Object.entries(result.depthQuality.before).map(([id, item]) => `${id} ${item}`).join(" · ")}</p><p className="mt-1">Depth after: {Object.entries(result.depthQuality.after).map(([id, item]) => `${id} ${item}`).join(" · ")}</p><p className="mt-1">Depth changes: {value(result.depthQuality.changes.join("; "))}</p></div>
      <div><h4 className="font-black uppercase tracking-widest">Positional states</h4><p className="mt-1">Before: {Object.entries(result.positionalImpact.before).map(([key, item]) => `${key} ${item}`).join(" · ")}</p><p className="mt-1">After: {Object.entries(result.positionalImpact.after).map(([key, item]) => `${key} ${item}`).join(" · ")}</p></div>
    </div>
    <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
      <div><h4 className="font-black uppercase tracking-widest">ROS</h4><p className="mt-1">{result.expertRos.packageAssessment} · {result.expertRos.confidence}</p>{[...result.expertRos.outgoing, ...result.expertRos.incoming].map((row) => <p key={row.playerId} className="mt-1">{row.playerName}: #{value(row.consensusOverallRank)} · {row.sourceCount} sources · {row.freshness}</p>)}</div>
      <div><h4 className="font-black uppercase tracking-widest">FantasyCalc REDRAFT</h4><p className="mt-1">{result.tradeMarket.direction} · Δ {value(result.tradeMarket.difference)}</p><p className="mt-1">Outgoing {value(result.tradeMarket.outgoingValue)} · incoming {value(result.tradeMarket.incomingValue)}</p></div>
      <div><h4 className="font-black uppercase tracking-widest">Keeper / fairness</h4><p className="mt-1">Keeper: {result.keeperImpact.assessment}</p><p className="mt-1">Fairness is supporting-only: {result.fairness.relationshipToRecommendation} · {value(result.fairness.verdict)}</p></div>
    </div>
    <p className="mt-4 text-xs font-bold uppercase tracking-wide">Preseason context: {result.preseasonContext.relevance} · auction {value(result.preseasonContext.auctionConsensus)} · ADP {value(result.preseasonContext.adp)}</p>
  </article>;
}

function Coverage({ diagnostic }: { diagnostic: ServerRecommendationDiagnostic }) {
  const coverage = diagnostic.contextCoverage;
  const checks = [coverage.sleeperLeague, coverage.rosters, coverage.ownership, coverage.expertRos.available, coverage.fantasyCalcRedraft.available, coverage.acquisitionSnapshot, coverage.keeperHistory, coverage.fairnessEngine];
  const overall = checks.every(Boolean) ? "PASS" : checks.some(Boolean) ? "PARTIAL" : "FAIL";
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Server context coverage · {overall}</h2><ul className="mt-3 grid gap-2 text-sm font-bold md:grid-cols-2"><Status ok={coverage.sleeperLeague}>Sleeper league</Status><Status ok={coverage.rosters}>Rosters</Status><Status ok={coverage.ownership}>Authoritative ownership</Status><Status ok={coverage.expertRos.available}>Expert ROS: {coverage.expertRos.playerCount} players · {coverage.expertRos.runtime}</Status><Status ok={coverage.fantasyCalcRedraft.available}>FantasyCalc REDRAFT: {coverage.fantasyCalcRedraft.playerCount} players · 1 QB / 12 teams / 0.5 PPR / isDynasty=false</Status><Status ok={coverage.acquisitionSnapshot}>Acquisition snapshot</Status><Status ok={coverage.keeperHistory}>Keeper history</Status><Status ok={coverage.fairnessEngine}>Fairness engine</Status><Status ok={coverage.seasonMode !== "UNAVAILABLE"}>Season mode: {coverage.seasonMode}</Status></ul><p className="mt-4 text-xs font-bold leading-5 text-amber-700">ROS is intentionally a local candidate-file runtime dependency for this internal diagnostic; it is not published or written to Firebase.</p></section>;
}

export default function TradeRecommendationDiagnosticClient({ presets }: { presets: ServerDiagnosticPreset[] }) {
  const [diagnostic, setDiagnostic] = useState<ServerRecommendationDiagnostic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  async function run(preset: ServerDiagnosticPreset) {
    if (!preset.request) return;
    setBusy(preset.key); setError(null);
    try {
      const response = await fetch("/api/commish/trade-recommendation-diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preset.request) });
      const payload = await response.json() as { diagnostic?: ServerRecommendationDiagnostic; error?: string };
      if (!payload.diagnostic) throw new Error(payload.error ?? "Diagnostic unavailable.");
      setDiagnostic(payload.diagnostic);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Diagnostic unavailable."); }
    finally { setBusy(null); }
  }
  return <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <header><p className="text-xs font-black uppercase tracking-[0.25em] text-orange-700">Commissioner-only · Phase 1F</p><h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight">Trade Recommendation Diagnostic</h1><p className="mt-3 max-w-3xl text-sm leading-6">Internal harness for the existing server-owned recommendation path. It performs read-only analysis and does not publish ROS, write Firebase/Sleeper data, or expose owner-facing controls.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Run live presets</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{presets.map((preset) => <button key={preset.key} type="button" disabled={!preset.request || busy !== null} onClick={() => void run(preset)} className="rounded-xl border border-orange-700/30 p-4 text-left text-sm font-black uppercase tracking-wide hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50">{busy === preset.key ? "Running…" : preset.label}<span className="mt-2 block text-xs font-medium normal-case tracking-normal text-slate-600">{preset.note}</span></button>)}</div></section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
    {diagnostic && <><Coverage diagnostic={diagnostic} /><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Trade validation</h2><p className="mt-2 text-sm font-bold">{diagnostic.status} · {diagnostic.reasonCode ?? "VALIDATED"} · ownership {diagnostic.ownershipValidation} · market {diagnostic.currentValueCoverage.available}/{diagnostic.currentValueCoverage.total} · keeper {diagnostic.keeperCoverage.available}/{diagnostic.keeperCoverage.total} · fairness {diagnostic.fairness.status}</p>{diagnostic.missingEvidence.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-700">{diagnostic.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul>}</section>{diagnostic.faabEvidence && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">FAAB isolation</h2><div className="mt-3 grid gap-3 text-sm md:grid-cols-2">{diagnostic.faabEvidence.map((row) => <p key={row.franchiseId}>Franchise {row.franchiseId}: sent ${row.faabSent}, received ${row.faabReceived}, net ${row.netFaab}; sent to {row.sentTo ?? "N/A"}; received from {row.receivedFrom.join(", ") || "N/A"}</p>)}</div>{diagnostic.faabIsolation && <ul className="mt-3 grid gap-2 text-sm"><Status ok={diagnostic.faabIsolation.directionUnchanged}>With FAAB: {diagnostic.faabIsolation.recommendationWithFaab.join(", ")} · without FAAB: {diagnostic.faabIsolation.recommendationWithoutFaab.join(", ")}</Status><Status ok={diagnostic.faabIsolation.excludedFromFantasyCalc && diagnostic.faabIsolation.excludedFromExpertRos && diagnostic.faabIsolation.excludedFromLineup && diagnostic.faabIsolation.excludedFromDepth && diagnostic.faabIsolation.excludedFromFairnessNumericValue && diagnostic.faabIsolation.noPlayerAcquisitionPrice && diagnostic.faabIsolation.noDollarConversion}>FAAB remains factual package context only; no player-value or dollar conversion is applied.</Status></ul>}</section>}<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]"><h2 className="text-xl font-black uppercase italic">Per-traded-player evidence</h2><div className="mt-3 grid gap-3 text-sm md:grid-cols-2">{diagnostic.tradedPlayerEvidence.map((row) => <div key={row.playerId} className="rounded-xl bg-slate-100 p-3 dark:bg-white/[0.05]"><p className="font-black">{row.canonicalName} · {row.playerId}</p><p>Sleeper: {row.sleeperName ?? "unavailable"} · {row.position ?? "N/A"} · roster {value(row.currentRosterId)} · franchise {row.canonicalFranchiseId ?? "unavailable"}</p><p>ROS: {row.expertRos ? `#${value(row.expertRos.consensusOverallRank)} · ${row.expertRos.sourceCount} sources · ${row.expertRos.freshness} · matched ${row.expertRos.matchedPlayerId}` : "unavailable"}</p><p>FantasyCalc REDRAFT: {row.fantasyCalc ? `${value(row.fantasyCalc.value)} · ${row.fantasyCalc.matchedName ?? "unnamed"} · matched ${row.fantasyCalc.matchedPlayerId} · overall #${value(row.fantasyCalc.overallRank)} · position #${value(row.fantasyCalc.positionalRank)} · trend ${value(row.fantasyCalc.trend30Day)}` : "unavailable"}</p><p>Keeper: {row.keeper ? `${row.keeper.confidence} · projected ${value(row.keeper.projectedCost)} · matched ${row.keeper.matchedPlayerId}` : "unavailable"}</p></div>)}</div></section>{diagnostic.teamRecommendations.map((result) => <ResultCard key={result.franchiseId} result={result} />)}</>}
  </main>;
}
