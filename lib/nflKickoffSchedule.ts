export type NflGameStatus = "UPCOMING" | "LIVE" | "FINAL";
export type NflGameTeam = Readonly<{
  name: string;
  abbreviation: string;
  logo: string | null;
  score: number | null;
}>;
export type NflTeamLogoAsset = Readonly<{
  href?: string;
  rel?: readonly string[];
  width?: number;
  height?: number;
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
  eventLabel?: string | null;
  statusDetail?: string | null;
  period?: number | null;
  clock?: string | null;
  broadcasts?: readonly string[];
  venue?: string | null;
}>;
export type NflKickoffSchedule = { listGames(season: number, week: number): Promise<readonly NflKickoff[]> };

export const ESPN_NFL_SCHEDULE_SOURCE = "ESPN NFL scoreboard API";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ESPN_REQUEST_TIMEOUT_MS = 8_000;
const scheduleCache = new Map<string, { expiresAt: number; games: readonly NflKickoff[] }>();

/** Select an ESPN-labelled full-colour team mark, with the scoreboard logo as fallback. */
export function selectNflTeamLogo(assets: readonly NflTeamLogoAsset[] | undefined, fallback: string | null = null): string | null {
  if (!assets?.length) return fallback;
  const usable = assets.filter(asset => typeof asset.href === "string" && asset.href.length > 0 && asset.rel?.includes("full"));
  const preferred = ["secondary_logo_on_white_color", "primary_logo_on_white_color", "default"];
  for (const rel of preferred) {
    const match = usable.find(asset => asset.rel?.includes(rel) && !asset.rel?.includes("scoreboard"));
    if (match?.href) return match.href;
  }
  const safeFallback = usable.find(asset => !asset.rel?.some(label => ["scoreboard", "dark", "grayscale", "white", "black"].includes(label)));
  return safeFallback?.href ?? fallback;
}

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
    const response = await this.fetchImpl(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        // ESPN can reject the minimal runtime fetch identity used by serverless
        // runtimes even when the same URL succeeds in a browser.
        "user-agent": "river-city-ffl/1.0 (+https://rivercityffl.com)",
      },
      signal: AbortSignal.timeout(ESPN_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new KickoffScheduleUnavailableError(`NFL schedule provider returned HTTP ${response.status}.`, "ESPN_HTTP_ERROR");
    const body = await response.json() as {
      events?: Array<{
        id?: string;
        name?: string;
        shortName?: string;
        date?: string;
        season?: { year?: number };
        week?: { number?: number };
        status?: { period?: number; displayClock?: string; type?: { state?: string; completed?: boolean; detail?: string; shortDetail?: string } };
        competitions?: Array<{
          date?: string;
          broadcasts?: Array<{ names?: string[] }>;
          venue?: { fullName?: string };
          competitors?: Array<{
            homeAway?: string;
            score?: string;
            team?: { id?: string; displayName?: string; abbreviation?: string; logo?: string };
          }>;
        }>;
      }>;
    };
    const events = body.events ?? [];
    const validEvents = events.filter(event => {
      const eventSeason = event.season?.year;
      const eventWeek = event.week?.number;
      if ((eventSeason !== undefined && eventSeason !== season) || (eventWeek !== undefined && eventWeek !== week)) throw new KickoffScheduleUnavailableError("NFL schedule provider returned a season/week mismatch.", "PROVIDER_SEASON_WEEK_MISMATCH", events.length);
      const kickoffAt = event.date ?? event.competitions?.[0]?.date;
      return Boolean(event.id && kickoffAt && !Number.isNaN(Date.parse(kickoffAt)));
    });
    if (events.length > 0 && validEvents.length === 0) throw new KickoffScheduleUnavailableError("NFL schedule provider returned no usable kickoff events.", "INVALID_PROVIDER_PAYLOAD", events.length);
    const games = validEvents.map(event => {
      const kickoffAt = event.date ?? event.competitions?.[0]?.date ?? "";
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
        gameId: event.id!,
        awayTeam: buildTeam("away"),
        homeTeam: buildTeam("home"),
        status,
        eventLabel: event.name ?? event.shortName ?? null,
        statusDetail: event.status?.type?.detail ?? event.status?.type?.shortDetail ?? null,
        period: event.status?.period ?? null,
        clock: event.status?.displayClock ?? null,
        broadcasts: Array.from(new Set((competition?.broadcasts ?? []).flatMap(broadcast => broadcast.names ?? []))),
        venue: competition?.venue?.fullName ?? null,
      };
    });
    const teamIds = Array.from(new Set(events.flatMap(event => event.competitions?.[0]?.competitors ?? []).map(candidate => candidate.team?.id).filter((id): id is string => Boolean(id))));
    if (teamIds.length > 0) {
      try {
        const logoResponse = await this.fetchImpl("https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams?limit=100", { cache: "no-store" });
        if (logoResponse.ok) {
          const logoBody = await logoResponse.json() as { sports?: Array<{ leagues?: Array<{ teams?: Array<{ team?: { id?: string; logos?: NflTeamLogoAsset[] } }> }> }> };
          const logosById = new Map<string, readonly NflTeamLogoAsset[]>();
          for (const teamEntry of logoBody.sports?.flatMap(sport => sport.leagues ?? []).flatMap(league => league.teams ?? []) ?? []) {
            if (teamEntry.team?.id && teamEntry.team.logos) logosById.set(teamEntry.team.id, teamEntry.team.logos);
          }
          for (const game of games) {
            for (const side of ["awayTeam", "homeTeam"] as const) {
              const team = game[side];
              if (!team) continue;
              const providerTeam = events.find(event => event.id === game.gameId)?.competitions?.[0]?.competitors?.find(candidate => candidate.homeAway === (side === "awayTeam" ? "away" : "home"))?.team;
              const logo = selectNflTeamLogo(providerTeam?.id ? logosById.get(providerTeam.id) : undefined, team.logo);
              (game as { [key in typeof side]?: NflGameTeam })[side] = { ...team, logo };
            }
          }
        }
      } catch {
        // Team metadata is an enhancement; retain the scoreboard logo on failure.
      }
    }
    const resolved = resolveFirstKickoff(games);
    if (!resolved) throw new KickoffScheduleUnavailableError("NFL schedule provider returned no usable games.", "NO_VALID_KICKOFFS", events.length);
    scheduleCache.set(key, { expiresAt: this.now() + CACHE_TTL_MS, games });
    return games;
  }
}
