// lib/history/computeImbalance.ts

export type TradePlayer = {
  id: string;
  name: string;
  position: string;
  value: number;        // VAL from analyzer
  keeperCost: number | null;  // FINAL FIX — Firestore-safe, TS-safe
};

export type TradeSide = {
  managerId: string;
  managerName?: string;
  playersSent: TradePlayer[];
  playersReceived: TradePlayer[];
};

export type TradeRecord = {
  id: string;
  year: number;
  sideA: TradeSide;
  sideB: TradeSide;
};

export type ImbalanceComponents = {
  packageDelta: number;
  bestPlayerDelta: number;
  rosterSpotTax: number;
  keeperSurplusDelta: number;
  imbalanceSigned: number;
  imbalanceAbsolute: number;
};

const ROSTER_SPOT_TAX_PER_EXTRA = 5;

/**
 * KeeperSurplus = value - keeperCost
 * If keeperCost is missing or null, treat as 0 (neutral).
 */
function computeKeeperSurplus(player: TradePlayer | undefined): number {
  if (!player) return 0;
  if (player.keeperCost == null) return 0;
  return (player.value || 0) - player.keeperCost;
}

/**
 * Hybrid imbalance from sideA's perspective.
 * ImbalanceSigned > 0 means sideA "wins" the trade.
 * This version is defensive against missing / partial data.
 */
export function computeImbalanceForTrade(trade: TradeRecord): ImbalanceComponents {
  const sideA = trade.sideA || ({} as TradeSide);
  const sideB = trade.sideB || ({} as TradeSide);

  const aReceived = Array.isArray(sideA.playersReceived)
    ? sideA.playersReceived
    : [];
  const aSent = Array.isArray(sideA.playersSent) ? sideA.playersSent : [];

  const bReceived = Array.isArray(sideB.playersReceived)
    ? sideB.playersReceived
    : [];
  const bSent = Array.isArray(sideB.playersSent) ? sideB.playersSent : [];

  // 1) PackageDelta
  const sumValues = (players: TradePlayer[]) =>
    players.reduce((sum, p) => sum + (p?.value || 0), 0);

  const aIn = sumValues(aReceived);
  const aOut = sumValues(aSent);
  const packageDelta = aIn - aOut;

  // 2) BestPlayerDelta
  const bestValue = (players: TradePlayer[]) =>
    players.length === 0 ? 0 : Math.max(...players.map(p => p?.value || 0));

  const bestReceived = bestValue(aReceived);
  const bestSent = bestValue(aSent);
  const bestPlayerDelta = bestReceived - bestSent;

  // 3) RosterSpotTax
  const aNetPlayers = aReceived.length - aSent.length;
  const rosterSpotTax =
    aNetPlayers > 0 ? -ROSTER_SPOT_TAX_PER_EXTRA * aNetPlayers : 0;

  // 4) KeeperSurplusDelta
  const sumKeeperSurplus = (players: TradePlayer[]) =>
    players.reduce((sum, p) => sum + computeKeeperSurplus(p), 0);

  const aSurplusIn = sumKeeperSurplus(aReceived);
  const aSurplusOut = sumKeeperSurplus(aSent);
  const keeperSurplusDelta = aSurplusIn - aSurplusOut;

  // 5) Hybrid formula
  const imbalanceSigned =
    0.7 * packageDelta +
    0.3 * bestPlayerDelta +
    rosterSpotTax +
    keeperSurplusDelta;

  const imbalanceAbsolute = Math.abs(imbalanceSigned);

  return {
    packageDelta,
    bestPlayerDelta,
    rosterSpotTax,
    keeperSurplusDelta,
    imbalanceSigned,
    imbalanceAbsolute,
  };
}
