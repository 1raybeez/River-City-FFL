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

/** * ⚡ FANTASYPROS STINGY MATH
 * Widens the gap between elite assets and bench depth.
 */
function calculateAdjustedTalent(players: TradePlayer[]): number {
  if (!players || players.length === 0) return 0;

  // Sort by value descending
  const sorted = [...players].sort((a, b) => (b.totalValueScore ?? 0) - (a.totalValueScore ?? 0));

  return sorted.reduce((sum, p, index) => {
    let pVal = p.totalValueScore ?? 0;

    // ELITE TAX: Boost the #1 asset if they are a high-value star
    if (index === 0 && pVal > 40) {
      pVal *= 1.25; // 25% scarcity premium
    }

    // DEPTH PENALTY: Reduce value of 2nd player and beyond
    if (index >= 1) {
      pVal *= 0.80; // Only count 80% of secondary piece value
    }

    return sum + pVal;
  }, 0);
}

function computeFairnessScore(gap: number): number {
  // Tighten thresholds: make lopsided verdicts happen sooner
  if (gap <= 2) return 100;
  if (gap <= 5) return 90;
  if (gap <= 10) return 60;
  if (gap <= 15) return 30;
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
        global: { imbalanceGap: 0, biggestWinnerIndex: 0, biggestLoserIndex: 0 },
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

  const teamSummaries: TeamSummary[] = sides.map((_, i) => {
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

  sides.forEach((side, i) => {
    const talentSent = calculateAdjustedTalent(side.players);
    const surplusSent = side.players.reduce(
      (sum, p) => sum + calculateKeeperSurplus(p),
      0
    );

    let surplusReceived = 0;
    let playersReceivedCount = 0;
    let faabReceived = 0;
    const receivedPlayers: TradePlayer[] = [];

    sides.forEach((otherSide) => {
      if (otherSide.teamIndex === i) return;
      const arriving = otherSide.players.filter((p) => p.toTeam === i);
      receivedPlayers.push(...arriving);
      playersReceivedCount += arriving.length;
      surplusReceived += arriving.reduce((sum, p) => sum + calculateKeeperSurplus(p), 0);
      if (numTeams === 2) faabReceived += otherSide.faabSent ?? 0;
    });

    const talentReceived = calculateAdjustedTalent(receivedPlayers);
    const netPlayerCount = playersReceivedCount - side.players.length;
    const rosterTax = netPlayerCount > 0 ? netPlayerCount * 2 : 0; // Fixed tax value

    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = faabReceived - (side.faabSent ?? 0);

    // Final calculation for Net Value
    const netValue = (deltaTalent * 1.0) + (deltaSurplus * 0.8) + (deltaFaab * 0.05) - rosterTax;

    teamNetValues[i] = netValue;
    perTeamComponents[i] = { deltaTalent, deltaSurplus, deltaFaab, rosterTax, netValue };

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

  const maxNet = Math.max(...teamNetValues);
  const minNet = Math.min(...teamNetValues);
  const biggestWinnerIndex = teamNetValues.indexOf(maxNet);
  const biggestLoserIndex = teamNetValues.indexOf(minNet);
  const gap = Math.abs(maxNet - minNet);

  const fairnessScore = computeFairnessScore(gap);

  return {
    teamSummaries,
    fairnessScore,
    verdict: generateVerdict(fairnessScore),
    isBlackKnight: fairnessScore < 80,
    components: {
      global: { imbalanceGap: gap, biggestWinnerIndex, biggestLoserIndex },
      perTeam: perTeamComponents,
    },
  };
}