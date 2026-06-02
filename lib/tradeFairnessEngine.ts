// ---------------------------------------------------------
// File: /lib/tradeFairnessEngine.ts
// HISTORY-AWARE FAIRNESS ENGINE (Sad Buddy Jesus Edition)
// ---------------------------------------------------------

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

/**
 * HistoricalPercentiles represent the distribution of past *net value gaps*
 * across all approved trades in league history.
 *
 * Example:
 * - p50 = median gap of past trades
 * - p75 = "this lopsided, but usually allowed"
 * - p90 = "this is near the edge of tolerance"
 * - p95 = "this is almost always veto-level"
 */
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
  isSadBuddyJesus: boolean;
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
  // Future assets are weighted more heavily if positive
  return surplus > 0 ? surplus * 1.1 : surplus * 0.7;
}

/**
 * Stud‑weighted talent:
 * - #1 asset gets a flat +5 bonus if > 40
 * - secondary pieces are weighted at 85%
 */
function calculateAdjustedTalent(players: TradePlayer[]): number {
  if (!players || players.length === 0) return 0;

  const sorted = [...players].sort(
    (a, b) => (b.totalValueScore ?? 0) - (a.totalValueScore ?? 0)
  );

  return sorted.reduce((sum, p, index) => {
    let pVal = p.totalValueScore ?? 0;

    if (index === 0 && pVal > 40) {
      pVal += 5;
    }

    if (index >= 1) {
      pVal *= 0.85;
    }

    return sum + pVal;
  }, 0);
}

/**
 * History-aware fairness mapping.
 *
 * If historicalPercentiles are provided, we compare the current gap
 * to the league's own tolerance curve:
 *
 * - gap <= p25  → 100 (routine, very fair)
 * - gap <= p50  → 90  (normal imbalance, usually allowed)
 * - gap <= p75  → 70  (noticeably lopsided, but historically tolerated)
 * - gap <= p90  → 40  (rarely this bad; borderline)
 * - gap >  p90  → 10  (almost always veto-level)
 *
 * If no history is provided, we fall back to static thresholds.
 */
function computeFairnessScore(
  gap: number,
  historicalPercentiles: HistoricalPercentiles | null
): number {
  const absGap = Math.abs(gap);

  if (historicalPercentiles) {
    const { p25, p50, p75, p90 } = historicalPercentiles;

    if (absGap <= p25) return 100;
    if (absGap <= p50) return 90;
    if (absGap <= p75) return 70;
    if (absGap <= p90) return 40;
    return 10;
  }

  // Static fallback (no history available)
  if (absGap <= 15) return 100;
  if (absGap <= 25) return 90;
  if (absGap <= 40) return 70;
  if (absGap <= 60) return 30;
  return 5;
}

function generateVerdict(score: number): string {
  if (score >= 95)
    return "Executive Masterpiece: Buddy Jesus beams at this immaculate balance.";
  if (score >= 80)
    return "Fair Trade: Minor value shifts, but Buddy Jesus nods with joy.";
  if (score >= 60)
    return "Lopsided Victory: Sad Buddy Jesus raises an eyebrow. Proceed with caution.";
  if (score >= 30)
    return "Egregious Imbalance: Sad Buddy Jesus sighs. This feels wrong in his heart.";
  return "Decree of Veto: Sad Buddy Jesus is disappointed. This trade shall not pass.";
}

// -----------------------------
// Main Engine
// -----------------------------

export function evaluateTrade(
  sides: TradeSide[],
  historicalPercentiles: HistoricalPercentiles | null,
  teamMeta: TeamMeta[]
): TradeEvaluationResult {
  if (!sides || sides.length < 2) {
    return {
      teamSummaries: [],
      fairnessScore: 100,
      verdict: "Incomplete trade data.",
      isSadBuddyJesus: false,
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

  // Calculate impact for each team involved
  sides.forEach((side, i) => {
    // 1. Assets Sent
    const talentSent = calculateAdjustedTalent(side.players);
    const surplusSent = side.players.reduce(
      (sum, p) => sum + calculateKeeperSurplus(p),
      0
    );

    // 2. Assets Received
    let surplusReceived = 0;
    let playersReceivedCount = 0;
    let faabReceived = 0;
    const receivedPlayers: TradePlayer[] = [];

    sides.forEach((otherSide) => {
      if (otherSide.teamIndex === i) return;

      const arriving = otherSide.players.filter((p) => p.toTeam === i);
      receivedPlayers.push(...arriving);
      playersReceivedCount += arriving.length;

      surplusReceived += arriving.reduce(
        (sum, p) => sum + calculateKeeperSurplus(p),
        0
      );

      if (numTeams === 2) {
        faabReceived += otherSide.faabSent ?? 0;
      }
    });

    const talentReceived = calculateAdjustedTalent(receivedPlayers);

    // 3. Roster Tax (penalty for taking on extra players)
    const netPlayerCount = playersReceivedCount - side.players.length;
    const rosterTax = netPlayerCount > 0 ? netPlayerCount * 1.5 : 0;

    // 4. Final Deltas
    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = faabReceived - (side.faabSent ?? 0);

    // Weighting: Talent (1.0) vs. Keeper Surplus (0.6) vs. FAAB (0.05)
    const netValue =
      deltaTalent * 1.0 + deltaSurplus * 0.6 + deltaFaab * 0.05 - rosterTax;

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

  // 5. Global Imbalance Analysis
  const maxNet = Math.max(...teamNetValues);
  const minNet = Math.min(...teamNetValues);
  const gap = Math.abs(maxNet - minNet);

  const fairnessScore = computeFairnessScore(gap, historicalPercentiles);
  const isSadBuddyJesus = fairnessScore < 70;

  return {
    teamSummaries,
    fairnessScore,
    verdict: generateVerdict(fairnessScore),
    isSadBuddyJesus,
    components: {
      global: {
        imbalanceGap: gap,
        biggestWinnerIndex: teamNetValues.indexOf(maxNet),
        biggestLoserIndex: teamNetValues.indexOf(minNet),
      },
      perTeam: perTeamComponents,
    },
  };
}
