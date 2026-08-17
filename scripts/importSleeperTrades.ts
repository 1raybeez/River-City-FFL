// Canonical historical trade import entrypoint.

import "dotenv/config";
import { firestore } from "../lib/firebaseAdmin.js";

const EXPECTED_PROJECT_ID = "river-city-ffl";
const MAX_BATCH_WRITES = 500;
const LEAGUES_BY_SEASON: Record<number, string> = {
  2018: "342868033913540608",
  2019: "466632190273253376",
  2020: "530115541505298432",
  2021: "677751457528762368",
  2022: "784542934581256192",
  2023: "997510104398315520",
  2024: "1072545817749331968",
  2025: "1199749375539027968",
  2026: "1312149033254416384",
};

async function fetchSleeperTradesForLeagueSeason(leagueId: string, season: number): Promise<any[]> {
  const allTrades: any[] = [];
  for (let week = 1; week <= 18; week++) {
    const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`);
    if (!response.ok) throw new Error(`Sleeper returned HTTP ${response.status} for season ${season}, week ${week}.`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error(`Malformed Sleeper transaction payload for season ${season}, week ${week}.`);
    allTrades.push(...(payload as any[]).filter((transaction) => transaction.type === "trade"));
  }
  return allTrades;
}

async function importSeasonTrades(season: number, leagueId: string, apply: boolean) {
  const trades = await fetchSleeperTradesForLeagueSeason(leagueId, season);
  console.log(JSON.stringify({ season, tradeCount: trades.length, mode: apply ? "apply" : "dry-run" }));
  if (!apply || trades.length === 0) return;
  if (trades.length > MAX_BATCH_WRITES) throw new Error(`Refusing season ${season}: ${trades.length} writes exceed the single-batch limit.`);

  const batch = firestore.batch();
  for (const trade of trades) {
    const tradeId = trade.transaction_id || trade.id;
    const ref = firestore.collection("historical_trades").doc(String(season)).collection("trades").doc(String(tradeId));
    batch.set(ref, { ...trade, season, imported_at: new Date().toISOString() }, { merge: true });
  }
  await batch.commit();
  console.log(`Imported ${trades.length} trades for ${season}.`);
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { getFirebaseAdminDiagnostics } = await import("../lib/firebaseAdmin.js");
  const diagnostics = getFirebaseAdminDiagnostics();
  if (diagnostics.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(`Refusing trade import: expected Firebase project ${EXPECTED_PROJECT_ID}, received ${diagnostics.projectId ?? "unknown"}.`);
  }
  console.log(JSON.stringify({ targetProject: diagnostics.projectId, operation: "historical-trade-import", seasonRange: "2018-2026", mode: apply ? "apply" : "dry-run", requiresApplyFlag: true }));
  for (const [season, leagueId] of Object.entries(LEAGUES_BY_SEASON)) await importSeasonTrades(Number(season), leagueId, apply);
  console.log(apply ? "Historical trade import applied." : "DRY RUN ONLY — no Firestore writes were performed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Historical trade import failed.");
  process.exitCode = 1;
});
