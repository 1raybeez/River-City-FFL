import { evaluateCurrentValueFreshness, type CurrentValueFreshness } from "./currentValue";

export type TradeMarketContext = {
  fantasyCalcValue: number;
  overallRank: number | null;
  positionalRank: number | null;
  trend30Day: number | null;
  generatedAt: string;
  freshness: CurrentValueFreshness;
  fantasycalcId: string | null;
  fantasycalcSleeperId: string | null;
  settings: { isDynasty: false; numQbs: "1"; numTeams: "12"; ppr: ".5" };
};

export function joinFantasyCalcMarketContext({
  rosRows,
  marketRows,
  now,
}: {
  rosRows: readonly { playerId: string }[];
  marketRows: readonly {
    playerId: string;
    rawSourceValue: number;
    fantasycalcOverallRank: number | null;
    fantasycalcPositionRank: number | null;
    fantasycalcTrend30Day: number | null;
    generatedAt: string;
    fantasycalcId: string | null;
    fantasycalcSleeperId: string | null;
  }[];
  now: string;
}): Record<string, TradeMarketContext | null> {
  const byPlayerId = new Map(marketRows.map((row) => [row.playerId, row]));
  return Object.fromEntries(rosRows.map((row) => {
    const market = byPlayerId.get(row.playerId);
    if (!market) return [row.playerId, null];
    return [row.playerId, {
      fantasyCalcValue: market.rawSourceValue,
      overallRank: market.fantasycalcOverallRank,
      positionalRank: market.fantasycalcPositionRank,
      trend30Day: market.fantasycalcTrend30Day,
      generatedAt: market.generatedAt,
      freshness: evaluateCurrentValueFreshness(market.generatedAt, now).freshness,
      fantasycalcId: market.fantasycalcId,
      fantasycalcSleeperId: market.fantasycalcSleeperId,
      settings: { isDynasty: false, numQbs: "1", numTeams: "12", ppr: ".5" },
    } satisfies TradeMarketContext];
  }));
}
