export type NflGameStatus = "UPCOMING" | "LIVE" | "FINAL";
export type NflGameTeam = Readonly<{
  name: string;
  abbreviation: string;
  logo: string | null;
  score: number | null;
}>;
export type NflKickoff = Readonly<{
  season: number;
  week: number;
  kickoffAt: string;
  source: string;
  gameId: string;
  awayTeam?: NflGameTeam;
  homeTeam?: NflGameTeam;
  status?: NflGameStatus;
  broadcasts?: readonly string[];
  venue?: string | null;
}>;
export type NflKickoffSchedule = { listGames(season: number, week: number): Promise<readonly NflKickoff[]> };

export const ESPN_NFL_SCHEDULE_SOURCE = "ESPN NFL scoreboard API";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const scheduleCache = new Map<string, { expiresAt: number; games: readonly NflKickoff[] }>();

export type NflScheduleReasonCode =
  | "ESPN_FETCH_FAILED"
  | "ESPN_HTTP_ERROR"
  | "INVALID_PROVIDER_PAYLOAD"
  | "NO_EVENTS"
  | "NO_VALID_KICKOFFS"
  | "PROVIDER_SEASON_WEEK_MISMATCH";

export class KickoffScheduleUnavailableError extends Error {
  constructor(message: string, readonly reasonCode: NflScheduleReasonCode, readonly eventCount?: number) {
    super(message);
  }
}

export function resolveFirstKickoff(games: readonly NflKickoff[]): NflKickoff {
  if (games.length === 0) throw new KickoffScheduleUnavailableError("No authoritative NFL schedule games are available.", "NO_VALID_KICKOFFS", 0);
  const timestamps = games.map(game => Date.parse(game.kickoffAt));
  if (timestamps.some(Number.isNaN)) throw new KickoffScheduleUnavailableError("NFL kickoff schedule is malformed or ambiguous.", "NO_VALID_KICKOFFS", games.length);
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
    if (!response.ok) throw new KickoffScheduleUnavailableError(`NFL schedule provider returned HTTP ${response.status}.`, "ESPN_HTTP_ERROR");
    const body = await response.json() as {
      events?: Array<{
        id?: string;
        date?: string;
        season?: { year?: number };
        week?: { number?: number };
        status?: { type?: { state?: string; completed?: boolean } };
        competitions?: Array<{
          date?: string;
          broadcasts?: Array<{ names?: string[] }>;
          venue?: { fullName?: string };
          competitors?: Array<{
            homeAway?: string;
            score?: string;
            team?: { displayName?: string; abbreviation?: string; logo?: string };
          }>;
        }>;
      }>;
    };
    const events = body.events ?? [];
    const games = events.map(event => {
      const eventSeason = event.season?.year;
      const eventWeek = event.week?.number;
      if ((eventSeason !== undefined && eventSeason !== season) || (eventWeek !== undefined && eventWeek !== week)) throw new KickoffScheduleUnavailableError("NFL schedule provider returned a season/week mismatch.", "PROVIDER_SEASON_WEEK_MISMATCH", events.length);
      const kickoffAt = event.date ?? event.competitions?.[0]?.date;
      if (!event.id || !kickoffAt || Number.isNaN(Date.parse(kickoffAt))) throw new KickoffScheduleUnavailableError("NFL schedule provider returned incomplete kickoff data.", "INVALID_PROVIDER_PAYLOAD", events.length);
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors ?? [];
      const buildTeam = (homeAway: "away" | "home") => {
        const team = competitors.find(candidate => candidate.homeAway === homeAway)?.team;
        if (!team?.displayName || !team.abbreviation) return undefined;
        const score = competitors.find(candidate => candidate.homeAway === homeAway)?.score;
        return {
          name: team.displayName,
          abbreviation: team.abbreviation,
          logo: team.logo ?? null,
          score: score !== undefined && Number.isFinite(Number(score)) ? Number(score) : null,
        } satisfies NflGameTeam;
      };
      const state = event.status?.type?.state;
      const status: NflGameStatus = event.status?.type?.completed || state === "post"
        ? "FINAL"
        : state === "in" ? "LIVE" : "UPCOMING";
      return {
        season,
        week,
        kickoffAt: new Date(kickoffAt).toISOString(),
        source: ESPN_NFL_SCHEDULE_SOURCE,
        gameId: event.id,
        awayTeam: buildTeam("away"),
        homeTeam: buildTeam("home"),
        status,
        broadcasts: Array.from(new Set((competition?.broadcasts ?? []).flatMap(broadcast => broadcast.names ?? []))),
        venue: competition?.venue?.fullName ?? null,
      };
    });
    const resolved = resolveFirstKickoff(games);
    if (!resolved) throw new KickoffScheduleUnavailableError("NFL schedule provider returned no usable games.", "NO_VALID_KICKOFFS", events.length);
    scheduleCache.set(key, { expiresAt: this.now() + CACHE_TTL_MS, games });
    return games;
  }
}
