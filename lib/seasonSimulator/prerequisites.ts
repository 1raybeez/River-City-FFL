import { resolveWeeklyFinality, type WeeklyFinality, type WeeklyScoreEvidence } from "@/lib/home/weeklyFinality";

export const RIVER_CITY_SIMULATOR_RULES_VERSION = "river-city-2026-rules-v1";
export const RIVER_CITY_SIMULATOR_SCHEMA_VERSION = "season-simulator-snapshot-v1";
export const SIMULATION_COUNTS = { test: 1_000, commissionerShadow: 10_000, initialPublished: 25_000 } as const;

export type SimulatorPosition = "QB" | "RB" | "WR" | "TE" | "FLEX" | "K" | "DEF";

export type RiverCitySimulatorRules = {
  season: 2026;
  teams: 12;
  regularSeasonStartWeek: 1;
  regularSeasonEndWeek: 14;
  playoffStartWeek: 15;
  playoffWeeks: readonly [15, 16, 17];
  playoffTeams: 6;
  divisionCount: 3;
  divisionsAffectQualification: false;
  divisionWinnerSeeds: readonly [];
  playoffByes: readonly [1, 2];
  regularSeasonTiebreakers: readonly ["POINTS_FOR", "POINTS_AGAINST", "COMMISSIONER_PLATFORM_RESOLUTION"];
  playoffSeedingTiebreakers: readonly ["BEST_REGULAR_RECORD", "POINTS_FOR_REMAINING", "COMMISSIONER_PLATFORM_RESOLUTION"];
  playoffReseeding: true;
  playoffGameTieHandling: "HIGHER_SEED_ADVANCES";
  championshipWeek: 17;
  scoringFormat: "HALF_PPR";
  lineupConfigurationResolved: true;
  medianGame: false;
  lineupSlots: Readonly<Record<SimulatorPosition, number>>;
};

export const RIVER_CITY_2026_RULES: RiverCitySimulatorRules = {
  season: 2026,
  teams: 12,
  regularSeasonStartWeek: 1,
  regularSeasonEndWeek: 14,
  playoffStartWeek: 15,
  playoffWeeks: [15, 16, 17],
  playoffTeams: 6,
  divisionCount: 3,
  divisionsAffectQualification: false,
  divisionWinnerSeeds: [],
  playoffByes: [1, 2],
  regularSeasonTiebreakers: ["POINTS_FOR", "POINTS_AGAINST", "COMMISSIONER_PLATFORM_RESOLUTION"],
  playoffSeedingTiebreakers: ["BEST_REGULAR_RECORD", "POINTS_FOR_REMAINING", "COMMISSIONER_PLATFORM_RESOLUTION"],
  playoffReseeding: true,
  playoffGameTieHandling: "HIGHER_SEED_ADVANCES",
  championshipWeek: 17,
  scoringFormat: "HALF_PPR",
  lineupConfigurationResolved: true,
  medianGame: false,
  lineupSlots: { QB: 1, RB: 1, WR: 2, TE: 1, FLEX: 1, K: 1, DEF: 1 },
};

export function validateSimulatorRules(rules: RiverCitySimulatorRules) {
  const errors: string[] = [];
  if (rules.playoffReseeding === null) errors.push("playoff reseeding requires commissioner resolution");
  if (rules.playoffGameTieHandling === null) errors.push("playoff game tie handling requires commissioner resolution");
  if (!rules.lineupConfigurationResolved) errors.push("lineup configuration conflicts with the stated two-RB rule and requires commissioner resolution");
  if (rules.teams !== 12) errors.push("River City requires exactly 12 teams");
  if (rules.playoffTeams !== 6) errors.push("River City requires exactly 6 playoff teams");
  if (rules.regularSeasonEndWeek >= rules.playoffStartWeek) errors.push("regular season must end before playoffs");
  return { valid: errors.length === 0, errors } as const;
}

export type RawSimulationMatchup = {
  week: number;
  matchupId: number | null;
  rosterId: number | null;
  opponentRosterId: number | null;
  points: number | null;
};

export type NormalizedSimulationMatchup = {
  week: number;
  matchupId: number;
  franchiseA: string;
  franchiseB: string;
  status: "COMPLETED" | "FUTURE";
  officialPointsA: number | null;
  officialPointsB: number | null;
};

export type ScheduleIntegrity = {
  valid: boolean;
  errors: string[];
  regularSeasonWeeks: number[];
  matchups: NormalizedSimulationMatchup[];
};

export function normalizeSimulationSchedule(
  rows: readonly RawSimulationMatchup[],
  franchiseByRosterId: ReadonlyMap<number, string>,
  rules: RiverCitySimulatorRules = RIVER_CITY_2026_RULES,
): ScheduleIntegrity {
  const errors: string[] = [];
  const matchups: NormalizedSimulationMatchup[] = [];
  const byWeek = new Map<number, RawSimulationMatchup[]>();
  for (const row of rows) byWeek.set(row.week, [...(byWeek.get(row.week) ?? []), row]);

  for (let week = rules.regularSeasonStartWeek; week <= rules.regularSeasonEndWeek; week += 1) {
    const weekRows = byWeek.get(week) ?? [];
    const rosterIds = weekRows.flatMap((row) => row.rosterId === null ? [] : [row.rosterId]);
    const distinctRosters = new Set(rosterIds);
    const matchupIds = new Set(weekRows.flatMap((row) => row.matchupId === null ? [] : [row.matchupId]));
    if (weekRows.length !== rules.teams) errors.push(`week ${week}: expected ${rules.teams} roster rows, received ${weekRows.length}`);
    if (matchupIds.size !== rules.teams / 2) errors.push(`week ${week}: expected ${rules.teams / 2} matchups, received ${matchupIds.size}`);
    if (distinctRosters.size !== rules.teams) errors.push(`week ${week}: roster duplication or missing franchise`);
    for (const rosterId of rosterIds) if (!franchiseByRosterId.has(rosterId)) errors.push(`week ${week}: orphan roster ${rosterId}`);

    for (const matchupId of matchupIds) {
      const sides = weekRows.filter((row) => row.matchupId === matchupId);
      if (sides.length !== 2) {
        errors.push(`week ${week}, matchup ${matchupId}: expected two sides, received ${sides.length}`);
        continue;
      }
      const first = sides[0];
      const second = sides[1];
      const franchiseA = first.rosterId === null ? null : franchiseByRosterId.get(first.rosterId) ?? null;
      const franchiseB = second.rosterId === null ? null : franchiseByRosterId.get(second.rosterId) ?? null;
      if (!franchiseA || !franchiseB || franchiseA === franchiseB) {
        errors.push(`week ${week}, matchup ${matchupId}: unresolved or duplicate franchise pair`);
        continue;
      }
      const completed = first.points !== null && second.points !== null;
      matchups.push({ week, matchupId, franchiseA, franchiseB, status: completed ? "COMPLETED" : "FUTURE", officialPointsA: first.points, officialPointsB: second.points });
    }
  }

  for (const row of rows) if (row.week > rules.regularSeasonEndWeek && row.week < rules.playoffStartWeek) errors.push(`week ${row.week}: gap between regular season and playoffs`);
  return { valid: errors.length === 0, errors, regularSeasonWeeks: Array.from({ length: rules.regularSeasonEndWeek }, (_, index) => index + 1), matchups };
}

export const SIMULATOR_PROJECTION_PATH = "C" as const;
export const SIMULATOR_PROJECTION_SOURCE_DECISION = "No acceptable canonical weekly scoring projection source is currently available.";

export type ProjectionCoverageStatus = "PROJECTED" | "VALID_ZERO" | "MISSING" | "UNRESOLVED";
export type ProjectionAvailabilityStatus = "ACTIVE" | "BYE" | "OUT" | "INACTIVE" | "SUSPENDED" | "QUESTIONABLE" | "DOUBTFUL" | "IR" | "FREE_AGENT" | "UNKNOWN";

export type NormalizedWeeklyProjection = {
  season: number;
  week: number;
  playerId: string;
  providerPlayerId: string;
  playerName: string;
  position: Exclude<SimulatorPosition, "FLEX">;
  nflTeam: string | null;
  projectedPoints: number | null;
  source: string;
  sourceAsOf: string | null;
  scoringFormat: "HALF_PPR";
  providerVersion: string | null;
  identityMethod?: string;
  coverageStatus: ProjectionCoverageStatus;
  availabilityStatus: ProjectionAvailabilityStatus;
};

export type WeeklyProjectionInput = {
  season: number;
  week: number;
  playerId: string | number | null;
  providerPlayerId: string | number | null;
  playerName: string | null;
  position: string | null;
  nflTeam: string | null;
  projectedPoints: number | null;
  source: string;
  sourceAsOf: string | null;
  providerVersion: string | null;
  identityMethod?: string;
  availabilityStatus?: ProjectionAvailabilityStatus;
};

const VALID_POSITIONS = new Set<Exclude<SimulatorPosition, "FLEX">>(["QB", "RB", "WR", "TE", "K", "DEF"]);

export function normalizeWeeklyProjection(input: WeeklyProjectionInput): NormalizedWeeklyProjection {
  const playerId = input.playerId === null ? "" : String(input.playerId).trim();
  const playerName = input.playerName?.trim() ?? "";
  const position = input.position?.trim().toUpperCase();
  const availabilityStatus = input.availabilityStatus ?? "UNKNOWN";
  const validIdentity = Boolean(playerId && playerName && VALID_POSITIONS.has(position as Exclude<SimulatorPosition, "FLEX">));
  const validPoints = typeof input.projectedPoints === "number" && Number.isFinite(input.projectedPoints);
  return {
    season: input.season,
    week: input.week,
    playerId,
    providerPlayerId: input.providerPlayerId === null ? "" : String(input.providerPlayerId).trim(),
    playerName,
    position: validIdentity ? position as Exclude<SimulatorPosition, "FLEX"> : "QB",
    nflTeam: input.nflTeam?.trim().toUpperCase() || null,
    projectedPoints: validPoints ? input.projectedPoints : null,
    source: input.source,
    sourceAsOf: input.sourceAsOf,
    scoringFormat: "HALF_PPR",
    providerVersion: input.providerVersion,
    identityMethod: input.identityMethod,
    coverageStatus: !validIdentity ? "UNRESOLVED" : validPoints ? input.projectedPoints === 0 ? "VALID_ZERO" : "PROJECTED" : "MISSING",
    availabilityStatus,
  };
}

export type ProjectionIdentityResolution = {
  providerPlayerId: string;
  sleeperPlayerId: string | null;
  matchState: "EXACT_ID" | "UNMATCHED";
};

export function resolveProjectionIdentity(providerPlayerId: string | number | null, providerToSleeperId: ReadonlyMap<string, string>): ProjectionIdentityResolution {
  const normalizedProviderId = providerPlayerId === null ? "" : String(providerPlayerId).trim();
  const sleeperPlayerId = normalizedProviderId ? providerToSleeperId.get(normalizedProviderId) ?? null : null;
  return { providerPlayerId: normalizedProviderId, sleeperPlayerId, matchState: sleeperPlayerId ? "EXACT_ID" : "UNMATCHED" };
}

export const SIMULATOR_COVERAGE_GATE = {
  minimumStarterCoverage: 1,
  policy: "FAIL_CLOSED",
  missingProjectionPolicy: "NOT_ZERO",
} as const;

export const SIMULATOR_AVAILABILITY_POLICY = {
  bye: "UNAVAILABLE_FOR_WEEK",
  out: "UNAVAILABLE_FOR_WEEK",
  inactive: "UNAVAILABLE_FOR_WEEK",
  ir: "UNAVAILABLE_UNLESS_SOURCE_EXPLICITLY_ACTIVE",
  doubtfulOrQuestionable: "SOURCE_EVIDENCE_REQUIRED",
  suspended: "UNAVAILABLE_FOR_WEEK",
  unsignedOrFreeAgent: "UNRESOLVED",
  missingProjection: "UNRESOLVED",
} as const;

export function resolveSimulatorFinality(activeWeek: number, evidence: readonly WeeklyScoreEvidence[]): WeeklyFinality {
  return resolveWeeklyFinality(activeWeek, evidence);
}

export type SimulatorSnapshotIdentity = {
  simulationSnapshotId: string;
  schemaVersion: typeof RIVER_CITY_SIMULATOR_SCHEMA_VERSION;
  modelVersion: string;
  season: number;
  scoringWeek: number;
  evidenceAsOf: string;
  simulationCount: number;
  randomSeed: string;
  inputChecksum: string;
  scheduleVersion: string;
  scheduleChecksum: string;
  leagueRulesVersion: typeof RIVER_CITY_SIMULATOR_RULES_VERSION;
  rosterEvidenceAsOf: string;
  projectionSource: string;
  projectionSourceAsOf: string | null;
  finality: WeeklyFinality;
};

export type ProjectionEvidenceSnapshot = {
  projectionSnapshotId: string;
  schemaVersion: typeof RIVER_CITY_SIMULATOR_SCHEMA_VERSION;
  season: number;
  week: number;
  source: string;
  sourceAsOf: string | null;
  scoringConfigChecksum: string;
  rosterEvidenceAsOf: string;
  inputChecksum: string;
  projections: readonly NormalizedWeeklyProjection[];
  coverageDiagnostics: readonly { franchiseId: string; coveragePercent: number; unresolvedPlayerIds: readonly string[] }[];
  unmatchedIdentityDiagnostics: readonly ProjectionIdentityResolution[];
};

export type VarianceObservation = {
  season: number;
  week: number;
  playerId: string;
  position: Exclude<SimulatorPosition, "FLEX">;
  projectedPoints: number;
  actualPoints: number;
  residual: number;
  projectionSource: string;
  providerVersion: string | null;
  availabilityStatus: ProjectionAvailabilityStatus;
};

function fnv1a(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildDeterministicSeed(input: { season: number; scoringWeek: number; inputChecksum: string; modelVersion: string }) {
  return `${input.season}:${input.scoringWeek}:${input.inputChecksum}:${input.modelVersion}:${fnv1a(JSON.stringify(input))}`;
}

export function createSeededRandom(seed: string) {
  let state = Number.parseInt(fnv1a(seed), 16) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}
