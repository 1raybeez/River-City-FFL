// ---------------------------------------------------------
// File: /lib/tradeFairnessEngine.ts
// Cleaned, strict-mode safe, with teamMeta + avatar support
// ---------------------------------------------------------

import { RIVER_CITY_ALGORITHM as ALGO } from "./leagueAlgorithm";
import {
  TeamSummary,
  TeamComponentBreakdown,
  GlobalComponentSummary,
} from "@/components/transactions/TradeSummaryModal";

// -----------------------------
// Types
// -----------------------------

export interface TradePlayer {
  playerId: string;
  totalValueScore: number;
  keeperCost: number;
  toTeam: number;
  pos?: string;
}

export interface TradeSide {
  teamIndex: number;
  faabSent: number;
  players: TradePlayer[];
}

export interface HistoricalPercentiles {
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
}

export interface TeamMeta {
  teamName: string;
  ownerName: string;
  avatar: string | null;
}

export interface TradeEvaluationResult {
  teamSummaries: TeamSummary[];
  fairnessScore: number;
  verdict: string;
  isBlackKnight: boolean;
  components: {
    global: GlobalComponentSummary;
    perTeam: TeamComponentBreakdown[];
  };
}

// -----------------------------
// Helpers
// -----------------------------

function calculateKeeperSurplus(p: TradePlayer): number {
  const val = p.totalValueScore ?? 0;
  const surplus = val - (p.keeperCost ?? 0);
  return surplus > 0 ? surplus * 1.2 : surplus * 0.8;
}

function computeFairnessScore(gap: number): number {
  if (gap <= ALGO.tolerance.elite) return 100;
  if (gap <= ALGO.tolerance.fair) return 90;
  if (gap <= ALGO.tolerance.lopsided) return 60;
  if (gap <= ALGO.tolerance.egregious) return 30;
  return 5;
}

function generateVerdict(score: number): string {
  if (score >= 95)
    return "The Executive Masterpiece: Buddy Jesus smiles upon this balance.";
  if (score >= 80)
    return "Fair Trade: Minor value shifts, but Buddy Jesus approves.";
  if (score >= 60)
    return "Lopsided Victory: The Black Knight Rises. Someone is being fleeced.";
  if (score >= 30)
    return "Egregious Imbalance: The Black Knight claims this trade as a dark omen.";
  return "Decree of Veto: The Black Knight has blocked the path. This trade shall not pass.";
}

// -----------------------------
// Main Engine
// -----------------------------

export function evaluateTrade(
  sides: TradeSide[],
  _historicalPercentiles: HistoricalPercentiles | null,
  teamMeta: TeamMeta[]
): TradeEvaluationResult {
  if (!sides || sides.length < 2) {
    return {
      teamSummaries: [],
      fairnessScore: 100,
      verdict: "Incomplete trade.",
      isBlackKnight: false,
      components: {
        global: {
          imbalanceGap: 0,
          biggestWinnerIndex: 0,
          biggestLoserIndex: 0,
        },
        perTeam: [],
      },
    };
  }

  const numTeams = sides.length;

  const teamNetValues: number[] = Array(numTeams).fill(0);
  const perTeamComponents: TeamComponentBreakdown[] = Array(numTeams)
    .fill(null)
    .map(() => ({
      deltaTalent: 0,
      deltaSurplus: 0,
      deltaFaab: 0,
      rosterTax: 0,
      netValue: 0,
    }));

  const teamSummaries: TeamSummary[] = Array(numTeams)
    .fill(null)
    .map((_, i) => {
      const meta = teamMeta[i];
      return {
        teamName: meta?.teamName ?? `Team ${i + 1}`,
        ownerName: meta?.ownerName ?? "Unassigned",
        avatar: meta?.avatar ?? null,
        valueSent: 0,
        valueReceived: 0,
        netSurplus: 0,
        surplusSent: 0,
        surplusReceived: 0,
        faabNet: 0,
      };
    });

  // -----------------------------
  // Per-team calculations
  // -----------------------------
  sides.forEach((side, i) => {
    // Sent
    const talentSent = side.players.reduce((sum, p) => {
      const pVal = p.totalValueScore ?? 0;
      return sum + Math.pow(pVal, ALGO.marketMultiplier);
    }, 0);

    const surplusSent = side.players.reduce(
      (sum, p) => sum + calculateKeeperSurplus(p),
      0
    );

    // Received
    let talentReceived = 0;
    let surplusReceived = 0;
    let playersReceivedCount = 0;
    let faabReceived = 0;

    sides.forEach((otherSide) => {
      if (otherSide.teamIndex === i) return;

      const arriving = otherSide.players.filter((p) => p.toTeam === i);
      playersReceivedCount += arriving.length;

      talentReceived += arriving.reduce((sum, p) => {
        const pVal = p.totalValueScore ?? 0;
        return sum + Math.pow(pVal, ALGO.marketMultiplier);
      }, 0);

      surplusReceived += arriving.reduce(
        (sum, p) => sum + calculateKeeperSurplus(p),
        0
      );

      if (numTeams === 2) {
        faabReceived += otherSide.faabSent ?? 0;
      }
    });

    // Roster tax
    const netPlayerCount = playersReceivedCount - side.players.length;
    const rosterTax =
      netPlayerCount > 0 ? netPlayerCount * ALGO.rosterSpotTax : 0;

    // Deltas
    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = faabReceived - (side.faabSent ?? 0);

    const netValue =
      deltaTalent * ALGO.weights.currentTalent +
      deltaSurplus * ALGO.weights.keeperSurplus +
      deltaFaab * ALGO.weights.faab -
      rosterTax;

    teamNetValues[i] = netValue;

    perTeamComponents[i] = {
      deltaTalent,
      deltaSurplus,
      deltaFaab,
      rosterTax,
      netValue,
    };

    teamSummaries[i] = {
      ...teamSummaries[i],
      valueSent: talentSent,
      valueReceived: talentReceived,
      surplusSent,
      surplusReceived,
      netSurplus: surplusReceived - surplusSent,
      faabNet: deltaFaab,
    };
  });

  // -----------------------------
  // Global imbalance
  // -----------------------------
  const maxNet = Math.max(...teamNetValues);
  const minNet = Math.min(...teamNetValues);
  const biggestWinnerIndex = teamNetValues.indexOf(maxNet);
  const biggestLoserIndex = teamNetValues.indexOf(minNet);
  const gap = Math.abs(maxNet - minNet);

  const fairnessScore = computeFairnessScore(gap);
  const isBlackKnight = fairnessScore < 80;

  const global: GlobalComponentSummary = {
    imbalanceGap: gap,
    biggestWinnerIndex,
    biggestLoserIndex,
  };

  return {
    teamSummaries,
    fairnessScore,
    verdict: generateVerdict(fairnessScore),
    isBlackKnight,
    components: {
      global,
      perTeam: perTeamComponents,
    },
  };
}
