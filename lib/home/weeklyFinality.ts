export type WeeklyScoreEvidence = {
  week: number;
  matchupCount: number;
  scoredMatchupCount: number;
};

export type WeeklyFinality = {
  activeWeek: number;
  finalizedWeek: number | null;
  finalizedWeeks: number[];
  statCorrectionBufferWeeks: 1;
};

const RIVER_CITY_TEAM_COUNT = 12;

/**
 * Sleeper exposes matchup scores but no single River City stat-correction
 * finality flag. Require one full subsequent week as a conservative buffer.
 */
export function resolveWeeklyFinality(
  activeWeek: number,
  evidence: readonly WeeklyScoreEvidence[]
): WeeklyFinality {
  const normalizedActiveWeek = Number.isInteger(activeWeek) && activeWeek > 0 ? activeWeek : 1;
  const finalizedWeeks = evidence
    .filter((week) =>
      Number.isInteger(week.week) &&
      week.week > 0 &&
      week.week <= normalizedActiveWeek - 2 &&
      week.matchupCount === RIVER_CITY_TEAM_COUNT &&
      week.scoredMatchupCount === RIVER_CITY_TEAM_COUNT
    )
    .map((week) => week.week)
    .sort((first, second) => first - second);

  return {
    activeWeek: normalizedActiveWeek,
    finalizedWeek: finalizedWeeks.at(-1) ?? null,
    finalizedWeeks,
    statCorrectionBufferWeeks: 1,
  };
}
