import { EspnNflScheduleAdapter, type NflKickoff } from "@/lib/nflKickoffSchedule";
import type { TeamCode } from "@/lib/types/Manager";
import { resolveNflWeek } from "@/lib/nflGameCenter";

export const NFL_SCOREBOARD_POLL_INTERVAL_MS = 60_000;

export type NflWeekScoreboardState = Readonly<{
  season: number;
  week: number;
  games: readonly NflKickoff[];
  unavailable: boolean;
  favoriteTeam?: TeamCode | null;
}>;

export function shouldPollNflWeek(week: number, games: readonly NflKickoff[], now = new Date()) {
  return resolveNflWeek(now) === week && games.some((game) => game.status === "LIVE");
}

export function groupNflGamesByDate(games: readonly NflKickoff[]) {
  return Array.from(games.reduce((groups, game) => {
    const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }).format(new Date(game.kickoffAt));
    const group = groups.get(date) ?? [];
    group.push(game);
    groups.set(date, group);
    return groups;
  }, new Map<string, NflKickoff[]>()).entries()).map(([date, dateGames]) => ({ date, games: dateGames }));
}

export async function getNflWeekScoreboard(season: number, week: number, favoriteTeam?: TeamCode | null, adapter = new EspnNflScheduleAdapter()): Promise<NflWeekScoreboardState> {
  try {
    return { season, week, games: await adapter.listGames(season, week), unavailable: false, favoriteTeam };
  } catch {
    return { season, week, games: [], unavailable: true, favoriteTeam };
  }
}
