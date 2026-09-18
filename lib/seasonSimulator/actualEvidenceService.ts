import {
  buildActualEvidenceArtifact,
  type ActualEvidenceArtifact,
  type SleeperActualMatchupRow,
  type SleeperActualPlayerRow,
} from "@/lib/seasonSimulator/evidenceCollection";
import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";

export const RIVER_CITY_TEAM_COUNT = 12;
export const RIVER_CITY_MATCHUP_COUNT = 6;

export type ActualEvidenceSleeperState = Readonly<Record<string, unknown>>;
export type ActualEvidenceLeague = Readonly<Record<string, unknown>>;
export type ActualEvidenceRoster = Readonly<Record<string, unknown>>;
export type ActualEvidenceMatchup = Readonly<{
  roster_id?: number | string | null;
  matchup_id?: number | string | null;
  points?: number | null;
  starters?: unknown;
  starters_points?: unknown;
  players_points?: unknown;
}>;

export type ActualEvidencePlayerDirectory = Readonly<Record<string, Readonly<{
  playerId?: string;
  displayName?: string | null;
  position?: string | null;
  nflTeam?: string | null;
  injuryStatus?: string | null;
}>>>;

export type CaptureWeeklyActualEvidenceInput = Readonly<{
  season: number;
  week: number;
  state: ActualEvidenceSleeperState;
  league: ActualEvidenceLeague;
  rosters: readonly ActualEvidenceRoster[];
  matchups: readonly ActualEvidenceMatchup[];
  playerDirectory: ActualEvidencePlayerDirectory;
  finalizedAt?: string;
  calibrationEligibility?: "INELIGIBLE_PATH_C" | "ELIGIBLE_IF_PAIRED_WITH_VALID_PROJECTION";
}>;

export type ActualEvidenceCaptureResult = Readonly<{
  state: "CAPTURED" | "WAITING_FOR_FINALITY" | "CONFLICT";
  artifact: ActualEvidenceArtifact | null;
  reason: string | null;
}>;

function asId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function playerRow(playerId: string, actualPoints: number, directory: ActualEvidencePlayerDirectory): SleeperActualPlayerRow {
  const identity = directory[playerId];
  const defense = /^[A-Z]{2,3}$/.test(playerId) && !identity;
  const position = identity?.position?.toUpperCase() === "DST" ? "DEF" : identity?.position?.toUpperCase() ?? (defense ? "DEF" : null);
  if (!position || !["QB", "RB", "WR", "TE", "K", "DEF"].includes(position)) throw new Error(`ACTUAL_IDENTITY_UNRESOLVED:${playerId}`);
  return { playerId, playerName: identity?.displayName ?? playerId, position: position as SleeperActualPlayerRow["position"], nflTeam: identity?.nflTeam ?? (defense ? playerId : null), actualPoints, availabilityStatus: identity?.injuryStatus ?? null };
}

export function actualFinalityReady(input: Pick<CaptureWeeklyActualEvidenceInput, "week" | "state" | "league" | "matchups">): boolean {
  const stateWeek = Number(input.state.week);
  const lastScoredLeg = Number((input.league.settings as Record<string, unknown> | undefined)?.last_scored_leg);
  const leagueComplete = String(input.league.status ?? "") === "complete";
  return leagueComplete || (Number.isInteger(stateWeek) && stateWeek >= input.week && (input.week === 1 || !Number.isInteger(lastScoredLeg) || lastScoredLeg >= input.week));
}

export function captureWeeklyActualEvidence(input: CaptureWeeklyActualEvidenceInput): ActualEvidenceCaptureResult {
  if (!actualFinalityReady(input)) return { state: "WAITING_FOR_FINALITY", artifact: null, reason: "Sleeper finality is not yet authoritative for this week." };
  const rosterIds = new Set(input.rosters.map(row => asId(row.roster_id)).filter((value): value is string => value !== null));
  if (input.rosters.length !== RIVER_CITY_TEAM_COUNT || rosterIds.size !== RIVER_CITY_TEAM_COUNT) return { state: "CONFLICT", artifact: null, reason: "Expected exactly 12 unique River City rosters." };
  if (input.matchups.length !== RIVER_CITY_TEAM_COUNT) return { state: "CONFLICT", artifact: null, reason: `Expected 12 finalized matchup rows, received ${input.matchups.length}.` };
  if (input.matchups.some(row => !asFinite(row.points))) return { state: "WAITING_FOR_FINALITY", artifact: null, reason: "Sleeper matchup scores are not all finalized numeric values." };
  const matchupIds = new Set(input.matchups.map(row => asId(row.matchup_id)).filter((value): value is string => value !== null));
  if (matchupIds.size !== RIVER_CITY_MATCHUP_COUNT || [...matchupIds].some(matchupId => input.matchups.filter(row => asId(row.matchup_id) === matchupId).length !== 2)) return { state: "CONFLICT", artifact: null, reason: "Expected exactly six two-team matchup groups." };
  const matchupRosterIds = new Set(input.matchups.map(row => asId(row.roster_id)).filter((value): value is string => value !== null));
  if (matchupRosterIds.size !== RIVER_CITY_TEAM_COUNT || [...rosterIds].some(rosterId => !matchupRosterIds.has(rosterId))) return { state: "CONFLICT", artifact: null, reason: "Matchups do not contain all 12 River City teams." };

  const results: SleeperActualMatchupRow[] = [];
  const playerActuals = new Map<string, SleeperActualPlayerRow>();
  for (const row of input.matchups) {
    const franchiseId = asId(row.roster_id)!;
    const starters = asArray(row.starters).map(asId).filter((value): value is string => value !== null);
    const starterPoints = asArray(row.starters_points);
    const points = row.players_points && typeof row.players_points === "object" && !Array.isArray(row.players_points) ? row.players_points as Record<string, unknown> : null;
    if (!starters.length || starterPoints.length !== starters.length || starterPoints.some(value => !asFinite(value)) || !points || Object.values(points).some(value => !asFinite(value))) return { state: "CONFLICT", artifact: null, reason: `Incomplete player or starter evidence for roster ${franchiseId}.` };
    const players = Object.entries(points).map(([playerId, value]) => playerRow(playerId, value as number, input.playerDirectory));
    players.forEach(player => playerActuals.set(`${franchiseId}:${player.playerId}`, player));
    results.push({ franchiseId, officialTeamScore: row.points as number, officialStarterIds: starters, starterPoints: Object.fromEntries(starters.map((starterId, index) => [starterId, starterPoints[index] as number])), players });
  }
  const settings = input.league.settings && typeof input.league.settings === "object" ? input.league.settings as Record<string, unknown> : {};
  const finalityEvidence = { source: "SLEEPER", leagueStatus: input.league.status ?? null, season: input.league.season ?? null, currentWeek: input.state.week ?? null, displayWeek: input.state.display_week ?? null, lastScoredLeg: settings.last_scored_leg ?? null, allTeamScoresNumeric: true, matchupRows: input.matchups.length, matchupGroups: RIVER_CITY_MATCHUP_COUNT, evidenceChecksum: checksum({ season: input.season, week: input.week, scores: results.map(row => [row.franchiseId, row.officialTeamScore]) }) };
  const pathC = input.calibrationEligibility === "INELIGIBLE_PATH_C" || (input.season === 2026 && input.week === 1);
  const artifact = buildActualEvidenceArtifact({ season: input.season, week: input.week, calibrationEligibility: pathC ? "INELIGIBLE_PATH_C" : "ELIGIBLE_IF_PAIRED_WITH_VALID_PROJECTION", calibrationEligibilityReason: pathC ? "The original pregame Week 1 FantasyPros projection snapshot was not preserved; actual evidence is historical-only." : "Actual evidence may be paired only with a valid same-week pregame projection artifact.", finalizedAt: input.finalizedAt ?? new Date().toISOString(), finalityEvidence, sleeperLeagueState: input.state, matchupResults: results, officialTeamScores: Object.fromEntries(results.map(result => [result.franchiseId, result.officialTeamScore])), officialStarterIds: Object.fromEntries(results.map(result => [result.franchiseId, result.officialStarterIds])), playerActuals: [...playerActuals.values()], finalized: true });
  return artifact ? { state: "CAPTURED", artifact, reason: null } : { state: "WAITING_FOR_FINALITY", artifact: null, reason: "Sleeper finality was not confirmed." };
}
