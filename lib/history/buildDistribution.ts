// lib/history/buildDistribution.ts

import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  TradeRecord,
  computeImbalanceForTrade,
  ImbalanceComponents,
} from "./computeImbalance";
import {
  buildPercentileTable,
  PercentileTable,
} from "./percentile";

export type StoredDistribution = {
  percentiles: PercentileTable;
  tradeCount: number;
  generatedAt: string;
};

const START_YEAR = 2018;
const END_YEAR = 2026;

/**
 * NEW SOURCE OF TRUTH (Option A):
 *
 * normalized_trades
 *    {year}
 *       trades
 *          {tradeId}
 *
 * These documents already contain:
 * - sideA
 * - sideB
 * - imbalanceComponents (optional)
 *
 * So we no longer read raw Sleeper data here.
 */
async function fetchAllNormalizedTrades(): Promise<TradeRecord[]> {
  const trades: TradeRecord[] = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const yearTradesCol = collection(
      db,
      "normalized_trades",
      String(year),
      "trades"
    );

    const snapshot = await getDocs(yearTradesCol);

    snapshot.forEach(docSnap => {
      const data = docSnap.data() as any;

      // We expect normalized trades to already contain sideA and sideB
      if (!data.sideA || !data.sideB) return;

      trades.push({
        id: docSnap.id,
        year,
        sideA: data.sideA,
        sideB: data.sideB,
      });
    });
  }

  return trades;
}

/**
 * Build the percentile distribution using normalized trades.
 */
export async function buildHistoricalImbalanceDistribution(): Promise<StoredDistribution> {
  const trades = await fetchAllNormalizedTrades();

  const components: ImbalanceComponents[] = trades.map(trade =>
    computeImbalanceForTrade(trade)
  );

  const imbalanceValues = components.map(c => c.imbalanceAbsolute);

  const percentiles = buildPercentileTable(imbalanceValues);

  const distribution: StoredDistribution = {
    percentiles,
    tradeCount: trades.length,
    generatedAt: new Date().toISOString(),
  };

  // Store distribution in Firestore
  const { doc, setDoc } = await import("firebase/firestore");
  const distDocRef = doc(db, "historical_distribution", "imbalance_percentiles");
  await setDoc(distDocRef, distribution, { merge: true });

  return distribution;
}
