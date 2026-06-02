// lib/history/normalizeAllTrades.ts

import { firestore } from "@/lib/firebaseAdmin";
import { normalizeSingleTrade, HistoricalTradeDoc } from "./normalizeTrade";

const START_YEAR = 2018;
const END_YEAR = 2026;

/**
 * Reads raw trades from:
 *   historical_trades/{year}/trades/{tradeId}
 * Normalizes them and writes to:
 *   normalized_trades/{year}/trades/{tradeId}
 */
export async function normalizeAllHistoricalTrades() {
  const results: {
    year: number;
    total: number;
    normalized: number;
    skipped: number;
  }[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const snapshot = await firestore
      .collection("historical_trades")
      .doc(String(year))
      .collection("trades")
      .get();

    let total = 0;
    let normalized = 0;
    let skipped = 0;

    for (const docSnap of snapshot.docs) {
      total++;
      const data = docSnap.data() as any;

      // Expecting the structure:
      // { leagueId, rawSleeperTransaction, ... }
      if (!data.rawSleeperTransaction || !data.leagueId) {
        skipped++;
        continue;
      }

      const { trade, components } = await normalizeSingleTrade(
        year,
        docSnap.id,
        data as HistoricalTradeDoc
      );

      if (!trade) {
        skipped++;
        continue;
      }

      // ✅ FIX: write to normalized_trades/{year}/trades/{tradeId}
      const outRef = firestore
        .collection("normalized_trades")
        .doc(String(year))
        .collection("trades")
        .doc(docSnap.id);

      await outRef.set(
        {
          ...trade,
          imbalanceComponents: components ?? null,
        },
        { merge: true }
      );

      normalized++;
    }

    results.push({ year, total, normalized, skipped });
  }

  return results;
}
