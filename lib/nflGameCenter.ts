import { EspnNflScheduleAdapter, KickoffScheduleUnavailableError, type NflKickoff, type NflGameStatus, type NflKickoffSchedule } from "@/lib/nflKickoffSchedule";
import type { TeamCode } from "@/lib/types/Manager";

export type HomeNflGameCard = Readonly<{
  gameId: string;
  awayTeam: string;
  homeTeam: string;
  awayAbbreviation: string;
  homeAbbreviation: string;
  awayLogo: string | null;
  homeLogo: string | null;
  awayScore: number | null;
  homeScore: number | null;
  kickoffAt: string;
  kickoffLabel: string;
  network: string | null;
  status: NflGameStatus;
  isFavoriteTeamGame: boolean;
  selectionReason: "LIVE" | "FAVORITE" | "THURSDAY_NIGHT" | "SUNDAY_NIGHT" | "MONDAY_NIGHT" | "CHRONOLOGICAL";
  venue: string | null;
}>;

export type NflGameCenterState = Readonly<{
  card: HomeNflGameCard | null;
  unavailable: boolean;
  reasonCode?: "ESPN_FETCH_FAILED" | "ESPN_HTTP_ERROR" | "INVALID_PROVIDER_PAYLOAD" | "NO_EVENTS" | "NO_VALID_KICKOFFS" | "PROVIDER_SEASON_WEEK_MISMATCH" | "NO_GAME_SELECTED" | "PRESENTATION_MAPPING_FAILED" | "FAVORITE_LOOKUP_FAILED" | "UNKNOWN_GAME_CENTER_ERROR";
  eventCount?: number;
  selectionCandidateCount?: number;
  season: number;
  week: number | null;
}>;

const NFL_REGULAR_SEASON_START_MONTH = 8;
const NFL_REGULAR_SEASON_START_DAY = 1;

function firstThursdayOfSeptember(season: number) {
  const date = new Date(Date.UTC(season, NFL_REGULAR_SEASON_START_MONTH, NFL_REGULAR_SEASON_START_DAY));
  date.setUTCDate(date.getUTCDate() + ((4 - date.getUTCDay() + 7) % 7));
  date.setUTCDate(date.getUTCDate() + 7);
  return date;
}

export function resolveNflWeek(now: Date) {
  const firstKickoffWeek = firstThursdayOfSeptember(now.getUTCFullYear());
  const start = firstKickoffWeek.getTime();
  if (now.getTime() < start) return null;
  return Math.min(18, Math.floor((now.getTime() - start) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function easternHour(iso: string) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(new Date(iso)));
}

function easternWeekday(iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(new Date(iso));
}

function isNational(game: NflKickoff) {
  return (game.broadcasts ?? []).some(name => ["CBS", "FOX", "NBC", "ESPN", "ABC", "Prime Video", "NFL Network"].includes(name));
}

function isFavorite(game: NflKickoff, favoriteTeam?: TeamCode | null) {
  return Boolean(favoriteTeam && (game.awayTeam?.abbreviation === favoriteTeam || game.homeTeam?.abbreviation === favoriteTeam));
}

function isLiveNationalOrFavorite(game: NflKickoff, favoriteTeam?: TeamCode | null) {
  return game.status === "LIVE" && (isNational(game) || isFavorite(game, favoriteTeam));
}

function gameReason(game: NflKickoff, favoriteTeam?: TeamCode | null): HomeNflGameCard["selectionReason"] {
  if (game.status === "LIVE") return "LIVE";
  if (isFavorite(game, favoriteTeam)) return "FAVORITE";
  const day = easternWeekday(game.kickoffAt);
  const hour = easternHour(game.kickoffAt);
  if (day === "Thu") return "THURSDAY_NIGHT";
  if (day === "Sun" && hour >= 19) return "SUNDAY_NIGHT";
  if (day === "Mon") return "MONDAY_NIGHT";
  return "CHRONOLOGICAL";
}

function compareKickoff(first: NflKickoff, second: NflKickoff) {
  return Date.parse(first.kickoffAt) - Date.parse(second.kickoffAt) || first.gameId.localeCompare(second.gameId);
}

export function selectNflGame(games: readonly NflKickoff[], favoriteTeam?: TeamCode | null, now = new Date()) {
  const live = games.filter(game => isLiveNationalOrFavorite(game, favoriteTeam)).sort(compareKickoff)[0];
  if (live) return live;

  const favorite = games.filter(game => game.status === "UPCOMING" && isFavorite(game, favoriteTeam)).sort(compareKickoff)[0];
  if (favorite) return favorite;

  const upcoming = games.filter(game => game.status === "UPCOMING").sort(compareKickoff);
  const nextPrimeTime = upcoming.find(game => {
    const day = easternWeekday(game.kickoffAt);
    const hour = easternHour(game.kickoffAt);
    return day === "Thu" || (day === "Sun" && hour >= 19) || day === "Mon";
  });
  if (nextPrimeTime) return nextPrimeTime;

  const chronological = upcoming[0];
  if (chronological) return chronological;

  return games.filter(game => game.status === "FINAL" && Date.parse(game.kickoffAt) <= now.getTime()).sort((first, second) => compareKickoff(second, first))[0] ?? null;
}

function toPresentation(game: NflKickoff, favoriteTeam?: TeamCode | null): HomeNflGameCard | null {
  if (!game.awayTeam || !game.homeTeam || !game.status) return null;
  const date = new Date(game.kickoffAt);
  if (Number.isNaN(date.getTime())) return null;
  const dateLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(date);
  return {
    gameId: game.gameId,
    awayTeam: game.awayTeam.name,
    homeTeam: game.homeTeam.name,
    awayAbbreviation: game.awayTeam.abbreviation,
    homeAbbreviation: game.homeTeam.abbreviation,
    awayLogo: game.awayTeam.logo,
    homeLogo: game.homeTeam.logo,
    awayScore: game.awayTeam.score,
    homeScore: game.homeTeam.score,
    kickoffAt: game.kickoffAt,
    kickoffLabel: `${dateLabel} · ${timeLabel} ET`,
    network: game.broadcasts?.[0] ?? null,
    status: game.status,
    isFavoriteTeamGame: isFavorite(game, favoriteTeam),
    selectionReason: gameReason(game, favoriteTeam),
    venue: game.venue ?? null,
  };
}

export function buildNflGameCenterState(games: readonly NflKickoff[], favoriteTeam?: TeamCode | null, now = new Date()): NflGameCenterState {
  const card = selectNflGame(games, favoriteTeam, now);
  const presentation = card ? toPresentation(card, favoriteTeam) : null;
  return {
    card: presentation,
    unavailable: false,
    ...(games.length === 0 ? { reasonCode: "NO_EVENTS" as const } : card && !presentation ? { reasonCode: "PRESENTATION_MAPPING_FAILED" as const } : !card ? { reasonCode: "NO_GAME_SELECTED" as const } : {}),
    eventCount: games.length,
    selectionCandidateCount: games.filter((game) => game.status === "LIVE" || game.status === "UPCOMING" || game.status === "FINAL").length,
    season: now.getUTCFullYear(),
    week: games[0]?.week ?? null,
  };
}

export async function getHomeNflGameCenter({ favoriteTeam, now = new Date(), adapter = new EspnNflScheduleAdapter() }: { favoriteTeam?: TeamCode | null; now?: Date; adapter?: NflKickoffSchedule } = {}): Promise<NflGameCenterState> {
  const week = resolveNflWeek(now);
  const season = now.getUTCFullYear();
  if (!week) return { card: null, unavailable: false, season, week: null };
  try {
    const games = await adapter.listGames(season, week);
    return buildNflGameCenterState(games, favoriteTeam, now);
  } catch (error) {
    if (error instanceof KickoffScheduleUnavailableError) {
      return { card: null, unavailable: true, reasonCode: error.reasonCode, ...(error.eventCount === undefined ? {} : { eventCount: error.eventCount }), season, week };
    }
    return { card: null, unavailable: true, reasonCode: "ESPN_FETCH_FAILED", season, week };
  }
}
