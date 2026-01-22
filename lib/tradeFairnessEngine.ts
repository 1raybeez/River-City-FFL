// lib/tradeFairnessEngine.ts

import { HistoricalTrade, LeagueFairnessProfile, compareTradeToHistory } from "./historicalTradeEngine";

type TradeSide = {
  teamIndex: number;
  players: {
    playerId: string;
    totalValueScore: number;
    keeperCost?: number;
    keeperEligible?: boolean;
    position?: string;
  }[];
  faabSent?: number;
};

type TradeAnalysisInput = {
  sides: TradeSide[];
  historicalProfile?: LeagueFairnessProfile;
};

type TradeAnalysisResult = {
  fairnessScore: number;
  verdict: string;
  perTeam: {
    teamIndex: number;
    valueIn: number;
    valueOut: number;
    net: number;
  }[];
  historicalContext?: string;
};

export function evaluateTrade({
  sides,
  historicalProfile
}: TradeAnalysisInput): TradeAnalysisResult {
  const perTeam = sides.map((side) => {
    const valueOut = side.players.reduce((sum, p) => sum + p.totalValueScore, 0);
    const valueIn = sides
      .filter((s) => s.teamIndex !== side.teamIndex)
      .flatMap((s) =>
        s.players.filter((p) => p.teamIndex === side.teamIndex)
      )
      .reduce((sum, p) => sum + p.totalValueScore, 0);

    const faab = side.faabSent ?? 0;
    return {
      teamIndex: side.teamIndex,
      valueIn: valueIn + faab,
      valueOut,
      net: valueIn + faab - valueOut
    };
  });

  const totalNet = perTeam.reduce((sum, t) => sum + Math.abs(t.net), 0);
  const avgNet = totalNet / perTeam.length;

  let fairnessScore = Math.max(0, 100 - avgNet / 20);
  fairnessScore = Math.min(100, Math.round(fairnessScore));

  let verdict = "";
  const mostFavored = perTeam.reduce((a, b) => (a.net > b.net ? a : b));
  const mostHurt = perTeam.reduce((a, b) => (a.net < b.net ? a : b));

  if (Math.abs(mostFavored.net - mostHurt.net) < 300) {
    verdict = "Trade appears balanced across all teams.";
  } else {
    verdict = `Trade favors Team ${mostFavored.teamIndex + 1} by approximately ${Math.round(
      mostFavored.net
    )} points.`;
  }

  let historicalContext: string | undefined = undefined;

  if (historicalProfile) {
    const mockTrade: HistoricalTrade = {
      id: "current",
      season: 2026,
      timestamp: Date.now(),
      teams: sides.map((side) => ({
        teamId: `team-${side.teamIndex}`,
        playersIn: [],
        playersOut: side.players.map((p) => p.playerId),
        faabIn: side.faabSent ?? 0,
        faabOut: 0
      }))
    };

    historicalContext = compareTradeToHistory(mockTrade, historicalProfile);
  }

  return {
    fairnessScore,
    verdict,
    perTeam,
    historicalContext
  };
}
