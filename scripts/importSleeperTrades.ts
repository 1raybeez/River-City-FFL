import "dotenv/config";
import { firestore } from "../lib/firebaseAdmin.js";
import { fetchSleeperTradesForLeagueSeason } from "../lib/sleeperTrades.js";

const LEAGUES_BY_SEASON: Record<number, string> = {
  2018: "342868033913540608",
  2019: "466632190273253376",
  2020: "530115541505298432",
  2021: "677751457528762368",
  2022: "784542934581256192",
  2023: "997510104398315520",
  2024: "1072545817749331968",
  2025: "1199749375539027968",
  2026: "1312149033254416384"
};

async function importSeasonTrades(season: number, leagueId: string) {
  console.log(`📡 Fetching trades for ${season}...`);
  try {
    const trades = await fetchSleeperTradesForLeagueSeason(leagueId, season);
    if (!trades || trades.length === 0) {
      console.log(`⚠️ No trades found for ${season}`);
      return;
    }

    const batch = firestore.batch();

    trades.forEach((trade: any) => {
      // Use transaction_id for uniqueness
      const tradeId = trade.transaction_id || trade.id;
      const ref = firestore.collection("history_trades").doc(`${season}_${tradeId}`);
      
      batch.set(ref, {
        ...trade,
        season,
        imported_at: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`✔️ Successfully imported ${trades.length} trades for ${season}`);
  } catch (error) {
    console.error(`❌ Error importing ${season}:`, error);
  }
}

async function main() {
  console.log("🚀 Starting River City FFL Historical Import...");
  for (const [seasonStr, leagueId] of Object.entries(LEAGUES_BY_SEASON)) {
    await importSeasonTrades(Number(seasonStr), leagueId);
  }
  console.log("✅ All seasons imported successfully.");
  process.exit(0);
}

main().catch((err) => {
  console.error("💥 Critical Failure:", err);
  process.exit(1);
});