// /lib/timeline/buildTimelineResults.ts

import { TeamData } from "./teamTypes";
import { LeagueData } from "./leagueTypes";
import { TimelineResult } from "./timelineTypes";
import { calculateTimeline } from "./timelineEngine";

/**
 * Builds timeline results for every team in the league.
 * 
 * Input:
 *  - teams: TeamData[]
 *  - league: LeagueData
 *  - nflWeek: number
 * 
 * Output:
 *  - Array<{ team: TeamData, timeline: TimelineResult }>
 *    sorted by timelineScore (descending)
 */
export function buildTimelineResults(
  teams: TeamData[],
  league: LeagueData,
  nflWeek: number
): { team: TeamData; timeline: TimelineResult }[] {
  if (!teams || teams.length === 0) return [];

  const results = teams.map((team) => {
    const timeline = calculateTimeline(team, league, nflWeek);
    return { team, timeline };
  });

  // Sort best → worst
  results.sort((a, b) => b.timeline.timelineScore - a.timeline.timelineScore);

  return results;
}
