import { RIVER_CITY_ALGORITHM as ALGO } from "./leagueAlgorithm";

export interface TradePlayer {
  playerId: string;
  totalValueScore?: number; 
  value?: number; // Common fallback
  keeperCost: number;
  toTeam: number;
}

export interface TradeSide {
  teamIndex: number;
  faabSent: number;
  players: TradePlayer[];
}

export interface TradeEvaluationResult {
  fairnessScore: number;
  verdict: string;
  teamNetValues: number[];
}

/**
 * Calculates the "Keeper Surplus" value.
 * Logic: If a player is worth more than their cost, apply a 1.2x bonus.
 * If they are a "bad contract," apply a 0.8x penalty.
 */
function calculateKeeperSurplus(p: TradePlayer): number {
  const val = p.totalValueScore ?? p.value ?? 0;
  const surplus = val - (p.keeperCost ?? 0);
  
  // Return weighted surplus based on whether it's positive or negative
  return surplus > 0 ? surplus * 1.2 : surplus * 0.8;
}

export function evaluateTrade(input: { sides: TradeSide[] }): TradeEvaluationResult {
  const { sides } = input;

  if (!sides || sides.length < 2) {
    return { fairnessScore: 100, verdict: "Incomplete trade.", teamNetValues: [] };
  }

  const numTeams = sides.length;
  const teamNets = Array(numTeams).fill(0);

  sides.forEach((side, i) => {
    // 1. Assets Sent (Talent and Surplus)
    const talentSent = side.players.reduce((sum, p) => {
      const pVal = p.totalValueScore ?? p.value ?? 0;
      return sum + Math.pow(pVal, ALGO.marketMultiplier);
    }, 0);

    const surplusSent = side.players.reduce((sum, p) => sum + calculateKeeperSurplus(p), 0);

    // 2. Assets Received
    let talentReceived = 0;
    let surplusReceived = 0;
    let playersReceivedCount = 0;
    let faabReceived = 0;

    sides.forEach(otherSide => {
      if (otherSide.teamIndex === i) return;
      
      const arriving = otherSide.players.filter(p => p.toTeam === i);
      playersReceivedCount += arriving.length;
      
      talentReceived += arriving.reduce((sum, p) => {
        const pVal = p.totalValueScore ?? p.value ?? 0;
        return sum + Math.pow(pVal, ALGO.marketMultiplier);
      }, 0);
      
      surplusReceived += arriving.reduce((sum, p) => sum + calculateKeeperSurplus(p), 0);
      
      // Handle FAAB (usually 2-team trades)
      if (numTeams === 2) faabReceived = otherSide.faabSent ?? 0;
    });

    // 3. Roster Impact (Tax for getting more players than you sent)
    const netPlayerCount = playersReceivedCount - side.players.length;
    const rosterTax = netPlayerCount > 0 ? netPlayerCount * ALGO.rosterSpotTax : 0;

    // 4. Calculate Net Delta
    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = faabReceived - (side.faabSent ?? 0);

    // DEBUG LOG: Helps identify why impact is 0
    console.log(`Team ${i} Analysis:`, { deltaTalent, deltaSurplus, deltaFaab, rosterTax });

    teamNets[i] = (
      (deltaTalent * ALGO.weights.currentTalent) +
      (deltaSurplus * ALGO.weights.keeperSurplus) +
      (deltaFaab * ALGO.weights.faab) -
      rosterTax
    );
  });

  // Calculate the "Gap" between the biggest winner and biggest loser
  const maxGain = Math.max(...teamNets);
  const minLoss = Math.min(...teamNets);
  const gap = Math.abs(maxGain - minLoss);

  const fairnessScore = computeFairnessScore(gap);
  
  return {
    fairnessScore,
    verdict: generateVerdict(fairnessScore),
    teamNetValues: teamNets
  };
}

function computeFairnessScore(gap: number): number {
  if (gap <= ALGO.tolerance.elite) return 100;
  if (gap <= ALGO.tolerance.fair) return 90;
  if (gap <= ALGO.tolerance.lopsided) return 65;
  if (gap <= ALGO.tolerance.egregious) return 35;
  return 5;
}

function generateVerdict(score: number): string {
  if (score >= 95) return "Pure Balance: This trade is a perfect value wash.";
  if (score >= 80) return "Fair: Minor value differences, well within league norms.";
  if (score >= 60) return "Lopsided: One manager gains a clear advantage.";
  if (score >= 35) return "Heavily Favored: This deal creates a massive power shift.";
  return "Egregious: Historically unprecedented imbalance. Collusion possible.";
}