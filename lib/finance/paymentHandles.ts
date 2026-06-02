// lib/finance/paymentHandles.ts

import { getMatchups, getLeagueRosters } from "@/lib/sleeper";

/**
 * CALCULATE WEEKLY HIGH SCORES
 * Scans weeks 1-14 to find who earned the $10 weekly bonus.
 */
export async function calculateWeeklyHighScores(leagueId: string) {
  const weeklyWinnerCounts: Record<number, number> = {};
  
  // Create an array of weeks 1 through 14
  const weekRange = Array.from({ length: 14 }, (_, i) => i + 1);
  
  const allMatchupData = await Promise.all(
    weekRange.map(week => getMatchups(week, leagueId))
  );

  allMatchupData.forEach(weekMatchups => {
    if (!weekMatchups || weekMatchups.length === 0) return;

    // Find the single highest scoring team for that week
    const highScorer = weekMatchups.reduce((prev, curr) =>
      ((prev.points ?? 0) > (curr.points ?? 0)) ? prev : curr
    );

    if ((highScorer.points ?? 0) > 0) {
      const rid = highScorer.roster_id;
      weeklyWinnerCounts[rid] = (weeklyWinnerCounts[rid] || 0) + 1;
    }
  });

  return weeklyWinnerCounts;
}

/**
 * GET DIVISION WINNERS
 * Identifies the top team in each division based on Wins > Points For.
 */
export function getDivisionWinners(rosters: any[]) {
  const divisions: Record<number, any[]> = {};

  rosters.forEach((r) => {
    const divId = r.settings.division;
    if (!divisions[divId]) divisions[divId] = [];
    divisions[divId].push(r);
  });

  // Sort each division by Wins, then Points For, and take the top team
  return Object.values(divisions).map(teams => {
    const sorted = [...teams].sort((a, b) => 
      (b.settings.wins - a.settings.wins) || (b.settings.fpts - a.settings.fpts)
    );
    return sorted[0].roster_id;
  });
}

/**
 * CALCULATE INDIVIDUAL WINNINGS
 * Logic for Champ, Silver, 3rd, Div King, and Weekly Highs.
 */
export function calculatePayout(m: {
  rank: number;
  isDivWinner: boolean;
  weeklyWins: number;
}) {
  let total = 0;
  if (m.rank === 1) total += 219;
  if (m.rank === 2) total += 100;
  if (m.rank === 3) total += 50;
  if (m.isDivWinner) total += 25;
  total += (m.weeklyWins * 10);
  return total;
}
