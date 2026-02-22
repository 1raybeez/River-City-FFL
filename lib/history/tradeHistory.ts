import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Shape of a stored historical trade in Firebase.
 * This is intentionally generic so we can evolve it over time.
 */
export interface HistoricalTrade {
  tradeId: string;              // Unique ID per trade (can be Sleeper transaction_id or our own)
  year: number;                 // Season year (e.g., 2024)
  week: number | null;          // Week number if known, else null for offseason
  createdAt: number;            // Unix timestamp (ms) when the trade occurred

  // League + roster context
  leagueId: string;             // Sleeper league_id for that season
  teamIdsInvolved: string[];    // Sleeper roster_ids or user_ids involved in the trade

  // Value / scoring context (these will be filled by the engine later)
  valueGap: number | null;      // Absolute imbalance between sides (our engine will compute this)
  fairnessScore: number | null; // 0–100, computed later from historical distribution

  // Raw payloads for future analysis (we keep these flexible)
  rawSleeperTransaction?: any;  // Original Sleeper transaction object
  metadata?: Record<string, any>; // Any extra info we want to attach
}

/**
 * Firestore path helper:
 * historical_trades/{year}/{tradeId}
 */
function historicalTradesCollection(year: number) {
  return collection(db, "historical_trades", String(year), "trades");
}

/**
 * Save or update a single historical trade for a given year.
 * This is idempotent: calling it again with the same tradeId will overwrite the document.
 */
export async function saveHistoricalTrade(
  year: number,
  trade: HistoricalTrade
): Promise<void> {
  if (!trade.tradeId) {
    throw new Error("saveHistoricalTrade: trade.tradeId is required");
  }

  const colRef = historicalTradesCollection(year);
  const docRef = doc(colRef, trade.tradeId);

  await setDoc(docRef, {
    ...trade,
    year, // ensure year is consistent with the path
  });
}

/**
 * Fetch all historical trades for a given year.
 * This will be used later to build the imbalance distribution and fairness curve.
 */
export async function getHistoricalTradesForYear(
  year: number
): Promise<HistoricalTrade[]> {
  const colRef = historicalTradesCollection(year);
  const snap = await getDocs(colRef);

  const trades: HistoricalTrade[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    trades.push({
      tradeId: data.tradeId,
      year: data.year,
      week: data.week ?? null,
      createdAt: data.createdAt,
      leagueId: data.leagueId,
      teamIdsInvolved: data.teamIdsInvolved ?? [],
      valueGap: data.valueGap ?? null,
      fairnessScore: data.fairnessScore ?? null,
      rawSleeperTransaction: data.rawSleeperTransaction,
      metadata: data.metadata ?? {},
    });
  });

  return trades;
}
