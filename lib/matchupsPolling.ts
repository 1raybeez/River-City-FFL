export const MATCHUP_POLL_INTERVAL_MS = 60_000;

export function shouldPollMatchups({
  selectedWeek,
  currentWeek,
  leagueStatus,
}: {
  selectedWeek: number | null;
  currentWeek: number | null;
  leagueStatus?: string | null;
}) {
  return selectedWeek !== null && currentWeek !== null && selectedWeek === currentWeek && leagueStatus !== "complete" && leagueStatus !== "pre_draft";
}
