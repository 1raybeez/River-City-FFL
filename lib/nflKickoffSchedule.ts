export type NflKickoff = Readonly<{ season: number; week: number; kickoffAt: string; source: string; gameId: string }>;
export type NflKickoffSchedule = { listGames(season: number, week: number): Promise<readonly NflKickoff[]> };

export const ESPN_NFL_SCHEDULE_SOURCE = "ESPN NFL scoreboard API";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const scheduleCache = new Map<string, { expiresAt: number; games: readonly NflKickoff[] }>();

export class KickoffScheduleUnavailableError extends Error {}

export function resolveFirstKickoff(games: readonly NflKickoff[]): NflKickoff {
  if (games.length === 0) throw new KickoffScheduleUnavailableError("No authoritative NFL schedule games are available.");
  const timestamps = games.map(game => Date.parse(game.kickoffAt));
  if (timestamps.some(Number.isNaN) || new Set(timestamps).size !== timestamps.length) throw new KickoffScheduleUnavailableError("NFL kickoff schedule is malformed or ambiguous.");
  const index = timestamps.indexOf(Math.min(...timestamps));
  return games[index];
}

export async function getFirstKickoff(schedule: NflKickoffSchedule, season: number, week: number) {
  return resolveFirstKickoff(await schedule.listGames(season, week));
}

export class EspnNflScheduleAdapter implements NflKickoffSchedule {
  constructor(private readonly fetchImpl: typeof fetch = fetch, private readonly now: () => number = Date.now) {}

  async listGames(season: number, week: number) {
    const key = `${season}:${week}`;
    const cached = scheduleCache.get(key);
    if (cached && cached.expiresAt > this.now()) return cached.games;
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100&dates=${season}&seasontype=2&week=${week}`;
    const response = await this.fetchImpl(url, { cache: "no-store" });
    if (!response.ok) throw new KickoffScheduleUnavailableError(`NFL schedule provider returned HTTP ${response.status}.`);
    const body = await response.json() as { events?: Array<{ id?: string; date?: string; season?: { year?: number }; week?: { number?: number }; competitions?: Array<{ date?: string }> }> };
    const events = body.events ?? [];
    const games = events.map(event => {
      const eventSeason = event.season?.year;
      const eventWeek = event.week?.number;
      if ((eventSeason !== undefined && eventSeason !== season) || (eventWeek !== undefined && eventWeek !== week)) throw new KickoffScheduleUnavailableError("NFL schedule provider returned a season/week mismatch.");
      const kickoffAt = event.date ?? event.competitions?.[0]?.date;
      if (!event.id || !kickoffAt || Number.isNaN(Date.parse(kickoffAt))) throw new KickoffScheduleUnavailableError("NFL schedule provider returned incomplete kickoff data.");
      return { season, week, kickoffAt: new Date(kickoffAt).toISOString(), source: ESPN_NFL_SCHEDULE_SOURCE, gameId: event.id };
    });
    const resolved = resolveFirstKickoff(games);
    if (!resolved) throw new KickoffScheduleUnavailableError("NFL schedule provider returned no usable games.");
    scheduleCache.set(key, { expiresAt: this.now() + CACHE_TTL_MS, games });
    return games;
  }
}
