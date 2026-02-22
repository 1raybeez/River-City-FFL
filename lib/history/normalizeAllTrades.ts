// lib/history/normalizeAllTrades.ts

import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    const tradesCol = collection(
      db,
      "historical_trades",
      String(year),
      "trades"
    );
    const snapshot = await getDocs(tradesCol);

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
      const outRef = doc(
        db,
        "normalized_trades",
        String(year),
        "trades",
        docSnap.id
      );

      await setDoc(
        outRef,
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
