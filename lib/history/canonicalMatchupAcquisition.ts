import { LEAGUE_HISTORY_IDS } from "@/lib/leagueAlgorithm";
import type {
  CanonicalMatchupBuildInput,
  CanonicalMatchupRow,
  CanonicalMatchupSeasonInput,
} from "@/lib/history/canonicalMatchupHistory";
import type { BracketMatch, LeagueInfo } from "@/lib/sleeper";

const SLEEPER_API_BASE_URL = "https://api.sleeper.app/v1";
const DEFAULT_SOURCE_VERSION = "sleeper-live-v1";
const DEFAULT_CORRECTION_VERSION = 1;

type LosersBracketType = CanonicalMatchupSeasonInput["losersBracketType"];

export type CanonicalMatchupAcquisitionOptions = {
  leagueIds?: Record<number, string>;
  losersBracketTypeBySeason?: Record<number, LosersBracketType>;
};

export class CanonicalMatchupAcquisitionError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "CanonicalMatchupAcquisitionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function isLeagueInfo(value: unknown): value is LeagueInfo {
  return isRecord(value) && isRecord(value.settings);
}

function isMatchupRows(value: unknown): value is CanonicalMatchupRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        isRecord(row) &&
        readInteger(row.roster_id) !== null &&
        (typeof row.points === "number" || row.points === null)
    )
  );
}

function isBracket(value: unknown): value is BracketMatch[] {
  return Array.isArray(value) && value.every(isRecord);
}

async function fetchStrictJson<T>(
  endpoint: string,
  validate: (value: unknown) => value is T
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${SLEEPER_API_BASE_URL}${endpoint}`);
  } catch (error) {
    throw new CanonicalMatchupAcquisitionError(
      `Sleeper request failed for ${endpoint}.`,
      endpoint,
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new CanonicalMatchupAcquisitionError(
      `Sleeper returned HTTP ${response.status} for ${endpoint}.`,
      endpoint
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new CanonicalMatchupAcquisitionError(
      `Sleeper returned invalid JSON for ${endpoint}.`,
      endpoint,
      { cause: error }
    );
  }

  if (!validate(payload)) {
    throw new CanonicalMatchupAcquisitionError(
      `Sleeper returned an unexpected payload for ${endpoint}.`,
      endpoint
    );
  }

  return payload;
}

async function acquireSeason(
  season: number,
  leagueId: string,
  losersBracketType: LosersBracketType
): Promise<CanonicalMatchupSeasonInput> {
  const leagueEndpoint = `/league/${leagueId}`;
  const leagueInfo = await fetchStrictJson(leagueEndpoint, isLeagueInfo);
  const playoffWeekStart = readInteger(
    leagueInfo.settings.playoff_week_start
  );
  const leagueLeg = readInteger(leagueInfo.settings.leg);

  if (
    playoffWeekStart === null ||
    playoffWeekStart < 1 ||
    leagueLeg === null ||
    leagueLeg < 1
  ) {
    throw new CanonicalMatchupAcquisitionError(
      `Sleeper league settings are missing valid scoring-period metadata for ${season}.`,
      leagueEndpoint
    );
  }

  const finalScoringPeriod = Math.max(leagueLeg, playoffWeekStart);
  const status =
    typeof leagueInfo.status === "string" ? leagueInfo.status : null;
  const completedThrough =
    status === "complete"
      ? finalScoringPeriod
      : Math.max(0, finalScoringPeriod - 1);
  const weeks = Array.from(
    { length: finalScoringPeriod },
    (_, index) => index + 1
  );
  const [weeklyRows, winnersBracket, losersBracket] = await Promise.all([
    Promise.all(
      weeks.map(async (week) => {
        const endpoint = `/league/${leagueId}/matchups/${week}`;
        const rows = await fetchStrictJson(endpoint, isMatchupRows);
        return [week, rows] as const;
      })
    ),
    fetchStrictJson(
      `/league/${leagueId}/winners_bracket`,
      isBracket
    ),
    fetchStrictJson(`/league/${leagueId}/losers_bracket`, isBracket),
  ]);

  return {
    season,
    leagueId,
    playoffWeekStart,
    finalScoringPeriod,
    completedScoringPeriods: weeks.filter((week) => week <= completedThrough),
    matchupRowsByWeek: Object.fromEntries(weeklyRows),
    winnersBracket,
    losersBracket,
    losersBracketType,
    correctionVersion: DEFAULT_CORRECTION_VERSION,
    retrievedAt: new Date().toISOString(),
    sourceVersion: DEFAULT_SOURCE_VERSION,
  };
}

/**
 * Acquires live Sleeper input without building or mutating canonical history.
 * Any network, HTTP, JSON, or payload-shape failure rejects the whole request.
 */
export async function acquireCanonicalMatchupInput(
  options: CanonicalMatchupAcquisitionOptions = {}
): Promise<CanonicalMatchupBuildInput> {
  const leagueIds = options.leagueIds ?? LEAGUE_HISTORY_IDS;
  const configuredSeasons = Object.entries(leagueIds)
    .map(([season, leagueId]) => ({ season: Number(season), leagueId }))
    .sort((first, second) => first.season - second.season);
  const seasons = await Promise.all(
    configuredSeasons.map(({ season, leagueId }) =>
      acquireSeason(
        season,
        leagueId,
        options.losersBracketTypeBySeason?.[season] ?? "toilet-bowl"
      )
    )
  );

  return { seasons };
}
