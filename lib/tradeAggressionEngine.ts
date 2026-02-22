// /lib/tradeAggressionEngine.ts

export interface RawSleeperTransaction {
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  creator?: string;
  created?: number;
  waiver_budget?: any;
}

export interface TradeDoc {
  tradeId: string;
  year: number;
  week: number;
  teamIdsInvolved: number[];          // roster_ids / teamIdsInvolved
  valueGap?: number | null;          // if you compute this later
  waiver_budget?: any;               // FAAB movement
  rawSleeperTransaction: RawSleeperTransaction;
}

interface AggressionComponents {
  volumeScore: number;
  initiativeScore: number;
  riskScore: number;
  faabScore: number;
  consistencyScore: number;
}

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, value / max);
}

function computeComponentsForManager(
  trades: TradeDoc[],
  managerRosterId: number
): AggressionComponents {
  const managerTrades = trades.filter(t =>
    t.teamIdsInvolved?.includes(managerRosterId)
  );

  if (managerTrades.length === 0) {
    return {
      volumeScore: 0,
      initiativeScore: 0,
      riskScore: 0,
      faabScore: 0,
      consistencyScore: 0,
    };
  }

  // --- Volume: number of trades + players moved ---
  const tradeCount = managerTrades.length;

  const playersMoved = managerTrades.reduce((sum, t) => {
    const adds = t.rawSleeperTransaction.adds || {};
    const drops = t.rawSleeperTransaction.drops || {};
    const addCount = Object.keys(adds).length;
    const dropCount = Object.keys(drops).length;
    return sum + addCount + dropCount;
  }, 0);

  const volumeScore =
    0.6 * normalize(tradeCount, 15) + // 15+ trades = max
    0.4 * normalize(playersMoved, 40); // 40+ players moved = max

  // --- Initiative: how often they are the creator ---
  const initiated = managerTrades.filter(
    t => String(t.rawSleeperTransaction.creator) === String(managerRosterId)
  ).length;

  const initiativeScore = normalize(initiated, tradeCount);

  // --- Risk: based on valueGap if present, else proxy by volume ---
  const gaps = managerTrades
    .map(t => t.valueGap)
    .filter((g): g is number => typeof g === "number");

  const avgGap = gaps.length
    ? gaps.reduce((a, b) => a + Math.abs(b), 0) / gaps.length
    : 0;

  const riskScore = gaps.length
    ? normalize(avgGap, 50) // 50+ value gap = max risk
    : volumeScore * 0.7;    // fallback: volume as proxy

  // --- FAAB movement ---
  const faabMoves = managerTrades.reduce((sum, t) => {
    if (!t.waiver_budget) return sum;
    // refine later once waiver_budget shape is finalized
    return sum + 1;
  }, 0);

  const faabScore = normalize(faabMoves, 10);

  // --- Consistency: trades per season ---
  const years = new Set(managerTrades.map(t => t.year));
  const tradesPerSeason = tradeCount / Math.max(1, years.size);
  const consistencyScore = normalize(tradesPerSeason, 8); // 8+ trades/season = max

  return {
    volumeScore,
    initiativeScore,
    riskScore,
    faabScore,
    consistencyScore,
  };
}

export function computeTradeAggression(
  trades: TradeDoc[],
  managerRosterId: number
): number {
  const c = computeComponentsForManager(trades, managerRosterId);

  const weighted =
    c.volumeScore * 0.35 +
    c.initiativeScore * 0.20 +
    c.riskScore * 0.25 +
    c.faabScore * 0.10 +
    c.consistencyScore * 0.10;

  // scale 0–1 → 0–10, round to nearest int
  return Math.round(weighted * 10);
}
