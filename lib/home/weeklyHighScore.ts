export type WeeklyHighScoreCandidate = {
  franchiseId: string;
  teamName: string;
  ownerNames: readonly string[];
  ownerPhoto: string | null;
  sleeperAvatar: string | null;
  points: number;
  week: number;
};

export function selectWeeklyHighScore(
  candidates: readonly WeeklyHighScoreCandidate[]
): WeeklyHighScoreCandidate[] {
  const valid = candidates.filter((candidate) => Number.isFinite(candidate.points));
  const highest = Math.max(...valid.map((candidate) => candidate.points), Number.NEGATIVE_INFINITY);
  return valid
    .filter((candidate) => candidate.points === highest)
    .sort((first, second) => first.franchiseId.localeCompare(second.franchiseId));
}
