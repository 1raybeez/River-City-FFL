import { OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";
import type {
  OperationalFinanceBracketResultInput,
  OperationalFinanceDivisionResultInput,
  OperationalFinanceLeagueState,
  OperationalFinanceProposalInput,
  OperationalFinanceRosterMappingInput,
  OperationalFinanceWeeklyResultInput,
} from "@/lib/finance/operationalFinanceProposals";
import { activeManagers } from "@/lib/managers/activeManagers";
import { franchisesById } from "@/lib/managers/identityData";
import { LEAGUE_HISTORY_IDS } from "@/lib/leagueAlgorithm";

const SLEEPER_API_BASE_URL = "https://api.sleeper.app/v1";
const SEASON = 2026;

type SleeperLeague = Readonly<{
  league_id?: string;
  season?: string;
  status?: string;
  settings: Readonly<{
    leg?: number;
    divisions?: number;
    playoff_week_start?: number;
  }>;
  metadata?: Readonly<Record<string, string>>;
}>;

type SleeperState = Readonly<{
  season?: string;
  season_type?: string;
  week?: number;
  leg?: number;
}>;

type SleeperRoster = Readonly<{
  roster_id: number;
  owner_id?: string | null;
  settings?: Readonly<{
    division?: number;
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  }>;
}>;

type SleeperUser = Readonly<{
  user_id: string;
  display_name?: string;
  metadata?: Readonly<Record<string, string>>;
}>;

type SleeperMatchup = Readonly<{
  roster_id: number;
  matchup_id?: number | null;
  points: number;
}>;

type SleeperBracketMatch = Readonly<{
  r?: number;
  m?: number;
  p?: number;
  w?: number | null;
  l?: number | null;
}>;

export interface OperationalFinanceSleeperAcquisitionSummary {
  readonly leagueId: string;
  readonly leagueStatus: string;
  readonly leagueState: OperationalFinanceLeagueState;
  readonly nflSeason: string | null;
  readonly nflSeasonType: string | null;
  readonly nflWeek: number | null;
  readonly leagueWeek: number;
  readonly playoffWeekStart: number | null;
  readonly rosterCount: number;
  readonly userCount: number;
  readonly divisionCount: number;
  readonly fetchedMatchupWeeks: readonly number[];
  readonly winnersBracketRows: number;
  readonly losersBracketRows: number;
  readonly acquiredAt: string;
}

export interface OperationalFinanceSleeperSnapshot {
  readonly proposalInput: OperationalFinanceProposalInput;
  readonly acquisition: OperationalFinanceSleeperAcquisitionSummary;
}

export class OperationalFinanceSleeperAcquisitionError extends Error {
  constructor(
    message: string,
    readonly endpoint: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "OperationalFinanceSleeperAcquisitionError";
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isLeague(value: unknown): value is SleeperLeague {
  return isRecord(value) && isRecord(value.settings);
}

function isState(value: unknown): value is SleeperState {
  return isRecord(value);
}

function isRosters(value: unknown): value is SleeperRoster[] {
  return (
    Array.isArray(value) &&
    value.every(
      (roster) => isRecord(roster) && readInteger(roster.roster_id) !== null
    )
  );
}

function isUsers(value: unknown): value is SleeperUser[] {
  return (
    Array.isArray(value) &&
    value.every(
      (user) => isRecord(user) && typeof user.user_id === "string"
    )
  );
}

function isMatchups(value: unknown): value is SleeperMatchup[] {
  return (
    Array.isArray(value) &&
    value.every(
      (matchup) =>
        isRecord(matchup) &&
        readInteger(matchup.roster_id) !== null &&
        typeof matchup.points === "number" &&
        Number.isFinite(matchup.points)
    )
  );
}

function isBracket(value: unknown): value is SleeperBracketMatch[] {
  return Array.isArray(value) && value.every(isRecord);
}

async function fetchStrictJson<T>(
  endpoint: string,
  validate: (value: unknown) => value is T
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${SLEEPER_API_BASE_URL}${endpoint}`, {
      cache: "no-store",
    });
  } catch (error) {
    throw new OperationalFinanceSleeperAcquisitionError(
      `Sleeper request failed for ${endpoint}.`,
      endpoint,
      { cause: error }
    );
  }

  if (!response.ok) {
    throw new OperationalFinanceSleeperAcquisitionError(
      `Sleeper returned HTTP ${response.status} for ${endpoint}.`,
      endpoint
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new OperationalFinanceSleeperAcquisitionError(
      `Sleeper returned invalid JSON for ${endpoint}.`,
      endpoint,
      { cause: error }
    );
  }

  if (!validate(payload)) {
    throw new OperationalFinanceSleeperAcquisitionError(
      `Sleeper returned an unexpected payload for ${endpoint}.`,
      endpoint
    );
  }

  return payload;
}

function getLeagueState(
  league: SleeperLeague,
  leagueWeek: number,
  playoffWeekStart: number | null
): OperationalFinanceLeagueState {
  if (league.status === "complete") return "complete";
  if (league.status === "pre_draft" || league.status === "drafting") {
    return "preseason";
  }
  if (playoffWeekStart !== null && leagueWeek >= playoffWeekStart) {
    return "postseason";
  }
  return "regular-season";
}

function getCanonicalRosterMappings(): readonly OperationalFinanceRosterMappingInput[] {
  const mappings = activeManagers.map((manager) => {
    const financeFranchiseMatches =
      OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.filter(
        (financeMapping) =>
          franchisesById[financeMapping.franchiseId]?.currentTeamName ===
          manager.teamName
      );

    if (financeFranchiseMatches.length !== 1) {
      throw new Error(
        `Active roster ${manager.roster} (${manager.teamName}) has ${financeFranchiseMatches.length} canonical finance franchise matches.`
      );
    }

    return {
      rosterId: manager.roster,
      franchiseId: financeFranchiseMatches[0].franchiseId,
      sourceRef: `lib/managers/activeManagers.ts:roster-${manager.roster}`,
    };
  });

  if (
    mappings.length !== OPERATIONAL_FINANCE_SEASON_2026.competitiveFranchiseCount ||
    new Set(mappings.map((mapping) => mapping.rosterId)).size !== mappings.length ||
    new Set(mappings.map((mapping) => mapping.franchiseId)).size !== mappings.length
  ) {
    throw new Error("Current canonical roster-to-franchise mapping is incomplete or duplicated.");
  }

  return deepFreeze(mappings);
}

function normalizeWeeklyResult(
  leagueId: string,
  week: number,
  leagueStatus: string,
  leagueWeek: number,
  rows: readonly SleeperMatchup[],
  expectedRosterCount: number
): OperationalFinanceWeeklyResultInput {
  const uniqueRosterCount = new Set(rows.map((row) => row.roster_id)).size;
  const hasCompleteRows =
    rows.length === expectedRosterCount && uniqueRosterCount === expectedRosterCount;
  const elapsed = leagueStatus === "complete" || week < leagueWeek;
  const finalityState: OperationalFinanceWeeklyResultInput["finalityState"] =
    elapsed && hasCompleteRows
      ? "sleeper-final"
      : elapsed
        ? "unresolved"
        : "in-progress";
  const highestPoints =
    rows.length > 0 ? Math.max(...rows.map((row) => row.points)) : null;
  const tiedRows =
    highestPoints === null
      ? []
      : rows.filter((row) => row.points === highestPoints);
  const uniqueWinner = tiedRows.length === 1 ? tiedRows[0] : null;

  return deepFreeze({
    week,
    finalityState,
    officialWinnerRosterId: uniqueWinner?.roster_id ?? null,
    tiedRosterIds: tiedRows.length > 1 ? tiedRows.map((row) => row.roster_id) : [],
    officialWinnerPoints: uniqueWinner?.points ?? highestPoints,
    matchupId: uniqueWinner?.matchup_id ?? null,
    sourceRef: `sleeper:league:${leagueId}:matchups:week-${week}`,
    finalityEvidence: elapsed
      ? hasCompleteRows
        ? `League scoring leg ${leagueWeek} is beyond Week ${week}; all ${expectedRosterCount} roster scores are present.`
        : `Week ${week} elapsed, but Sleeper returned ${rows.length} rows covering ${uniqueRosterCount} rosters.`
      : `Week ${week} is the current Sleeper scoring leg and remains in progress.`,
  });
}

function normalizeDivisions(
  league: SleeperLeague,
  leagueId: string,
  leagueState: OperationalFinanceLeagueState,
  rosters: readonly SleeperRoster[]
): readonly OperationalFinanceDivisionResultInput[] {
  const configuredCount = readInteger(league.settings.divisions) ?? 0;
  const ids = new Set(
    rosters
      .map((roster) => readInteger(roster.settings?.division))
      .filter((divisionId): divisionId is number => divisionId !== null && divisionId > 0)
  );
  for (let divisionId = 1; divisionId <= configuredCount; divisionId += 1) {
    ids.add(divisionId);
  }

  const finalityState: OperationalFinanceDivisionResultInput["finalityState"] =
    leagueState === "preseason"
      ? "not-started"
      : leagueState === "regular-season"
        ? "in-progress"
        : "sleeper-final";

  return deepFreeze(
    [...ids]
      .sort((first, second) => first - second)
      .map((divisionId) => ({
        divisionId: String(divisionId),
        divisionName:
          league.metadata?.[`division_${divisionId}`] ?? `Division ${divisionId}`,
        finalityState,
        sourceRef: `sleeper:league:${leagueId}:division:${divisionId}`,
        finalityEvidence:
          finalityState === "sleeper-final"
            ? "The regular season has ended, but the public Sleeper API does not expose an authoritative final division-order endpoint."
            : finalityState === "not-started"
              ? "The Sleeper league is in pre-draft state."
              : "The Sleeper regular season remains in progress.",
      }))
  );
}

function normalizeBracketResult(
  leagueId: string,
  matches: readonly SleeperBracketMatch[],
  label: "third-place" | "championship",
  leagueState: OperationalFinanceLeagueState
): OperationalFinanceBracketResultInput | null {
  if (matches.length === 0) return null;
  if (matches.length !== 1) {
    return deepFreeze({
      finalityState: "unresolved",
      winnerRosterId: null,
      loserRosterId: null,
      bracketMatchId: null,
      round: null,
      sourceRef: `sleeper:league:${leagueId}:winners-bracket:${label}`,
      finalityEvidence: `Sleeper returned ${matches.length} bracket rows classified as ${label}; exactly one is required.`,
    });
  }

  const match = matches[0];
  const resolved = readInteger(match.w) !== null && readInteger(match.l) !== null;
  const finalityState: OperationalFinanceBracketResultInput["finalityState"] =
    leagueState === "preseason"
      ? "not-started"
      : resolved
        ? "sleeper-final"
        : "in-progress";

  return deepFreeze({
    finalityState,
    winnerRosterId: readInteger(match.w),
    loserRosterId: readInteger(match.l),
    bracketMatchId: readInteger(match.m),
    round: readInteger(match.r),
    sourceRef: `sleeper:league:${leagueId}:winners-bracket:${label}`,
    finalityEvidence: leagueState === "preseason"
      ? "Sleeper has pre-seeded the bracket shell, but the league remains in pre-draft state."
      : resolved
      ? "Sleeper winners_bracket supplies both official winner and loser roster IDs."
      : "Sleeper winners_bracket has not supplied both result roster IDs.",
  });
}

/**
 * Acquires a read-only Sleeper snapshot and normalizes it for the pure proposal
 * builder. It performs no Firestore access and does not build proposals itself.
 */
export async function acquireOperationalFinanceSleeperSnapshot(
  leagueId: string = LEAGUE_HISTORY_IDS[SEASON]
): Promise<OperationalFinanceSleeperSnapshot> {
  const [state, league, rosters, users, winnersBracket, losersBracket] = await Promise.all([
    fetchStrictJson("/state/nfl", isState),
    fetchStrictJson(`/league/${leagueId}`, isLeague),
    fetchStrictJson(`/league/${leagueId}/rosters`, isRosters),
    fetchStrictJson(`/league/${leagueId}/users`, isUsers),
    fetchStrictJson(`/league/${leagueId}/winners_bracket`, isBracket),
    fetchStrictJson(`/league/${leagueId}/losers_bracket`, isBracket),
  ]);

  const leagueWeek = Math.max(0, readInteger(league.settings.leg) ?? 0);
  const playoffWeekStart = readInteger(league.settings.playoff_week_start);
  const leagueState = getLeagueState(league, leagueWeek, playoffWeekStart);
  const weeksToFetch =
    leagueState === "preseason"
      ? []
      : Array.from(
          { length: Math.min(14, Math.max(1, leagueWeek)) },
          (_, index) => index + 1
        );
  const weeklyRows = await Promise.all(
    weeksToFetch.map(async (week) => ({
      week,
      rows: await fetchStrictJson(
        `/league/${leagueId}/matchups/${week}`,
        isMatchups
      ),
    }))
  );
  const snapshotTimestamp = new Date().toISOString();
  const leagueStatus = league.status ?? "unknown";
  const rosterMappings = getCanonicalRosterMappings();
  const canonicalRosterIds = rosterMappings
    .map((mapping) => mapping.rosterId)
    .sort((first, second) => first - second);
  const sleeperRosterIds = rosters
    .map((roster) => roster.roster_id)
    .sort((first, second) => first - second);
  if (
    canonicalRosterIds.length !== sleeperRosterIds.length ||
    canonicalRosterIds.some(
      (rosterId, index) => rosterId !== sleeperRosterIds[index]
    )
  ) {
    throw new OperationalFinanceSleeperAcquisitionError(
      `Sleeper roster IDs (${sleeperRosterIds.join(",")}) do not match the canonical current roster IDs (${canonicalRosterIds.join(",")}).`,
      `/league/${leagueId}/rosters`
    );
  }
  const weeklyResults = weeklyRows.map(({ week, rows }) =>
    normalizeWeeklyResult(
      leagueId,
      week,
      leagueStatus,
      leagueWeek,
      rows,
      OPERATIONAL_FINANCE_SEASON_2026.competitiveFranchiseCount
    )
  );
  const divisions = normalizeDivisions(league, leagueId, leagueState, rosters);
  const championshipMatches = winnersBracket.filter((match) => match.p === 1);
  const thirdPlaceMatches = winnersBracket.filter((match) => match.p === 3);

  return deepFreeze({
    proposalInput: {
      rules: OPERATIONAL_FINANCE_SEASON_2026,
      season: SEASON,
      leagueId,
      currentWeek: leagueWeek,
      leagueState,
      rosterMappings,
      weeklyResults,
      divisions,
      thirdPlaceResult: normalizeBracketResult(
        leagueId,
        thirdPlaceMatches,
        "third-place",
        leagueState
      ),
      championshipResult: normalizeBracketResult(
        leagueId,
        championshipMatches,
        "championship",
        leagueState
      ),
      snapshotTimestamp,
    },
    acquisition: {
      leagueId,
      leagueStatus,
      leagueState,
      nflSeason: state.season ?? null,
      nflSeasonType: state.season_type ?? null,
      nflWeek: readInteger(state.week),
      leagueWeek,
      playoffWeekStart,
      rosterCount: rosters.length,
      userCount: users.length,
      divisionCount: divisions.length,
      fetchedMatchupWeeks: weeksToFetch,
      winnersBracketRows: winnersBracket.length,
      losersBracketRows: losersBracket.length,
      acquiredAt: snapshotTimestamp,
    },
  });
}
