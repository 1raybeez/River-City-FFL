// lib/historicalTradeEngine.ts

export type HistoricalTrade = {
  id: string;
  season: number;
  timestamp: number;
  teams: Array<{
    teamId: string;
    playersIn: string[];
    playersOut: string[];
    faabIn: number;
    faabOut: number;
  }>;
};

export type LeagueFairnessProfile = {
  averageValueGap: number;
  keeperPremiumAvg: number;
  faabCompensationAvg: number;
  positionalTrends: Record<string, number>;
};

export function buildLeagueProfile(trades: HistoricalTrade[]): LeagueFairnessProfile {
  let totalGap = 0;
  let totalTrades = 0;
  let totalFaab = 0;
  let positionalCounts: Record<string, number> = {};

  for (const trade of trades) {
    for (const team of trade.teams) {
      const valueIn = team.playersIn.length * 1000 + team.faabIn;
      const valueOut = team.playersOut.length * 1000 + team.faabOut;
      const gap = Math.abs(valueIn - valueOut);

      totalGap += gap;
      totalFaab += team.faabIn;
      totalTrades++;

      for (const pid of team.playersIn) {
        const pos = pid.slice(0, 2); // crude positional tag
        positionalCounts[pos] = (positionalCounts[pos] || 0) + 1;
      }
    }
  }

  return {
    averageValueGap: totalTrades ? totalGap / totalTrades : 0,
    keeperPremiumAvg: 1200, // placeholder until keeper data is wired
    faabCompensationAvg: totalTrades ? totalFaab / totalTrades : 0,
    positionalTrends: positionalCounts
  };
}

export function compareTradeToHistory(
  currentTrade: HistoricalTrade,
  profile: LeagueFairnessProfile
): string {
  let totalGap = 0;

  for (const team of currentTrade.teams) {
    const valueIn = team.playersIn.length * 1000 + team.faabIn;
    const valueOut = team.playersOut.length * 1000 + team.faabOut;
    totalGap += Math.abs(valueIn - valueOut);
  }

  const avgGap = totalGap / currentTrade.teams.length;

  if (avgGap <= profile.averageValueGap * 0.8) {
    return "Trade is more balanced than most historical trades.";
  } else if (avgGap <= profile.averageValueGap * 1.2) {
    return "Trade falls within typical fairness range.";
  } else {
    return "Trade is more unbalanced than most historical trades.";
  }
}
