// /lib/analyzer/buildAnalyzerPayload.ts

import { buildTeamDataFromSleeper } from "@/lib/timeline/buildTeamDataFromSleeper";
import { buildTeamMeta } from "@/lib/timeline/buildTeamMeta";
import { buildTimelineResults } from "@/lib/timeline/buildTimelineResults";
import { TimelineResult } from "@/lib/timeline/timelineTypes";

export interface AnalyzerPayload {
  league: any;
  teams: any[];
  timeline: {
    teamId: string;
    teamName: string;
    result: TimelineResult;
  }[];
}

/**
 * Builds the full analyzer payload:
 * - team data (raw Sleeper → TeamData)
 * - meta (powerRank, normalized metrics)
 * - timeline results (score, tag, badge, explanation)
 */
export async function buildAnalyzerPayload(
  nflWeek: number
): Promise<AnalyzerPayload> {
  // 1. Load raw team + league data
  const { league, teams } = await buildTeamDataFromSleeper();

  // 2. Apply meta (powerRank, normalized signals)
  buildTeamMeta(teams, league);

  // 3. Build timeline results
  const timelineResults = buildTimelineResults(teams, league, nflWeek);

  // 4. Shape for UI consumption
  const timeline = timelineResults.map((entry) => ({
    teamId: entry.team.ownerId,
    teamName: entry.team.teamName,
    result: entry.timeline,
  }));

  return {
    league,
    teams,
    timeline,
  };
}
