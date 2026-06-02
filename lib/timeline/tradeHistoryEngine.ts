// lib/timeline/tradeHistoryEngine.ts

import { firestore } from "@/lib/firebaseAdmin";

export interface RawSleeperTransaction {
  type: string;
  transaction_id: string;
  created: number;
  status: string;
  status_updated?: number;
  adds?: Record<string, number>;   // playerId -> rosterId
  drops?: Record<string, number>;  // playerId -> rosterId
  waiver_budget?: {
    sender: number;
    receiver: number;
    amount: number;
  }[];
  consenter_ids?: number[];
  roster_ids?: number[];
  [key: string]: any;
}

export interface HistoricalTradeDoc {
  createdAt: number;
  fairnessScore: number | null;
  leagueId: string;
  metadata?: {
    rawSleeperTransaction?: RawSleeperTransaction;
    [key: string]: any;
  };
  type: "trade";
  teamIdsInvolved: number[];
  tradeId: string;
  valueGap: number | null;
  week: number;
  year: number;
  [key: string]: any;
}

export interface PlayerMove {
  playerId: string;
  fromTeamId: number;
  toTeamId: number;
}

export interface FaabTransfer {
  sender: number;
  receiver: number;
  amount: number;
}

export interface NormalizedTrade {
  id: string;
  leagueId: string;
  year: number;
  week: number;
  createdAt: number;
  teamIdsInvolved: number[];
  moves: PlayerMove[];
  faabTransfers: FaabTransfer[];
}

export interface TeamTradeHistoryMetrics {
  teamId: number;
  tradesLast12Months: number;
  totalTrades: number;
  netTalentDelta: number;
  consolidationMoves: number;
  rebuildMoves: number;
  aggressionIndex: number;
  faabGiven: number;
  faabReceived: number;
}

export interface TradeHistoryResult {
  trades: NormalizedTrade[];
  perTeam: TeamTradeHistoryMetrics[];
}

/**
 * Normalize a single Firestore trade document into a NormalizedTrade.
 */
function normalizeTradeDoc(docId: string, data: HistoricalTradeDoc): NormalizedTrade | null {
  const raw = data.metadata?.rawSleeperTransaction;
  if (!raw || raw.type !== "trade") return null;

  const adds = raw.adds ?? {};
  const drops = raw.drops ?? {};
  const teamIdsInvolved = data.teamIdsInvolved ?? raw.roster_ids ?? [];

  const moves: PlayerMove[] = [];

  // For each player in adds, find matching drop to infer from/to
  Object.entries(adds).forEach(([playerId, toTeamId]) => {
    const fromTeamId = drops[playerId];
    if (fromTeamId == null) {
      // If we can't find a matching drop, we still record the move as unknown-from
      moves.push({
        playerId,
        fromTeamId: -1,
        toTeamId,
      });
    } else {
      moves.push({
        playerId,
        fromTeamId,
        toTeamId,
      });
    }
  });

  const faabTransfers: FaabTransfer[] =
    raw.waiver_budget?.map((w) => ({
      sender: w.sender,
      receiver: w.receiver,
      amount: w.amount,
    })) ?? [];

  return {
    id: data.tradeId || raw.transaction_id || docId,
    leagueId: data.leagueId,
    year: data.year,
    week: data.week,
    createdAt: data.createdAt ?? raw.created,
    teamIdsInvolved,
    moves,
    faabTransfers,
  };
}

/**
 * Fetch all historical trades for a league across the given seasons.
 */
export async function fetchHistoricalTradesForLeague(
  leagueId: string,
  seasons: number[]
): Promise<NormalizedTrade[]> {
  const trades: NormalizedTrade[] = [];

  for (const year of seasons) {
    const yearDocRef = firestore.collection("historical_trades").doc(String(year));
    const tradesColRef = yearDocRef.collection("trades");
    const snapshot = await tradesColRef.where("leagueId", "==", leagueId).get();

    snapshot.forEach((doc) => {
      const data = doc.data() as HistoricalTradeDoc;
      const normalized = normalizeTradeDoc(doc.id, data);
      if (normalized) {
        trades.push(normalized);
      }
    });
  }

  // Sort by createdAt ascending
  trades.sort((a, b) => a.createdAt - b.createdAt);

  return trades;
}

/**
 * Build per-team trade history metrics from normalized trades.
 * You provide a player value function so this engine stays decoupled.
 */
export function computeTradeHistoryMetrics(
  trades: NormalizedTrade[],
  getPlayerValue: (playerId: string) => number
): TeamTradeHistoryMetrics[] {
  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;

  const perTeam: Map<number, TeamTradeHistoryMetrics> = new Map();

  function ensureTeam(teamId: number): TeamTradeHistoryMetrics {
    let existing = perTeam.get(teamId);
    if (!existing) {
      existing = {
        teamId,
        tradesLast12Months: 0,
        totalTrades: 0,
        netTalentDelta: 0,
        consolidationMoves: 0,
        rebuildMoves: 0,
        aggressionIndex: 0,
        faabGiven: 0,
        faabReceived: 0,
      };
      perTeam.set(teamId, existing);
    }
    return existing;
  }

  for (const trade of trades) {
    const isRecent = trade.createdAt >= now - oneYearMs;

    // Track participation
    for (const teamId of trade.teamIdsInvolved) {
      const metrics = ensureTeam(teamId);
      metrics.totalTrades += 1;
      if (isRecent) metrics.tradesLast12Months += 1;
    }

    // Talent delta + consolidation/rebuild
    const perTeamPlayerCount: Map<number, { sent: number; received: number; valueSent: number; valueReceived: number }> =
      new Map();

    function ensureTeamCounts(teamId: number) {
      let entry = perTeamPlayerCount.get(teamId);
      if (!entry) {
        entry = { sent: 0, received: 0, valueSent: 0, valueReceived: 0 };
        perTeamPlayerCount.set(teamId, entry);
      }
      return entry;
    }

    for (const move of trade.moves) {
      const value = getPlayerValue(move.playerId);

      if (move.fromTeamId !== -1) {
        const fromCounts = ensureTeamCounts(move.fromTeamId);
        fromCounts.sent += 1;
        fromCounts.valueSent += value;
      }

      const toCounts = ensureTeamCounts(move.toTeamId);
      toCounts.received += 1;
      toCounts.valueReceived += value;
    }

    // Apply per-team deltas
    for (const [teamId, counts] of perTeamPlayerCount.entries()) {
      const metrics = ensureTeam(teamId);
      const delta = counts.valueReceived - counts.valueSent;
      metrics.netTalentDelta += delta;

      // Consolidation vs rebuild:
      // - consolidation: fewer players received than sent, but positive value delta
      // - rebuild: more players received than sent, but negative or small value delta
      if (counts.received < counts.sent && delta > 0) {
        metrics.consolidationMoves += 1;
      } else if (counts.received > counts.sent && delta < 0) {
        metrics.rebuildMoves += 1;
      }
    }

    // FAAB
    for (const faab of trade.faabTransfers) {
      const senderMetrics = ensureTeam(faab.sender);
      const receiverMetrics = ensureTeam(faab.receiver);
      senderMetrics.faabGiven += faab.amount;
      receiverMetrics.faabReceived += faab.amount;
    }
  }

  // Compute aggression index as a composite:
  // tradesLast12Months + scaled absolute netTalentDelta + scaled FAAB movement
  for (const metrics of perTeam.values()) {
    const talentAggression = Math.abs(metrics.netTalentDelta) / 100; // scale factor
    const faabAggression = (metrics.faabGiven + metrics.faabReceived) / 10; // scale factor
    metrics.aggressionIndex =
      metrics.tradesLast12Months + talentAggression + faabAggression;
  }

  return Array.from(perTeam.values()).sort((a, b) => b.aggressionIndex - a.aggressionIndex);
}

/**
 * Convenience wrapper: fetch + compute in one call.
 */
export async function buildTradeHistoryForLeague(
  leagueId: string,
  seasons: number[],
  getPlayerValue: (playerId: string) => number
): Promise<TradeHistoryResult> {
  const trades = await fetchHistoricalTradesForLeague(leagueId, seasons);
  const perTeam = computeTradeHistoryMetrics(trades, getPlayerValue);
  return { trades, perTeam };
}
