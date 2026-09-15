import fs from "node:fs/promises";
import path from "node:path";
import {
  ACTUAL_EVIDENCE_SCHEMA,
  buildActualEvidenceArtifact,
  type ActualEvidenceArtifact,
  type SleeperActualMatchupRow,
  type SleeperActualPlayerRow,
} from "../lib/seasonSimulator/evidenceCollection";
import { checksum } from "../lib/seasonSimulator/evidenceSnapshot";
import { getLeagueInfo, getLeagueRosters, getLocalPlayerIdentityRegistry, getMatchups, getNFLState, LEAGUE_ID } from "../lib/sleeper";

export const ACTUAL_CAPTURE_DIRECTORY = path.join(process.cwd(), ".local-calibration");
const TEAM_COUNT = 12;

type RawMatchup = {
  roster_id?: number | string | null;
  matchup_id?: number | string | null;
  points?: number | null;
  starters?: unknown;
  starters_points?: unknown;
  players_points?: unknown;
};

export type CaptureInput = {
  season: number;
  week: number;
  state: Record<string, unknown>;
  league: Record<string, unknown>;
  rosters: Array<Record<string, unknown>>;
  matchups: RawMatchup[];
  finalizedAt?: string;
};

export type CaptureOptions = { season: number; week: number; dryRun: boolean; targetDirectory: string };
export type CaptureSummary = {
  schema: typeof ACTUAL_EVIDENCE_SCHEMA;
  season: number;
  week: number;
  leagueId: string;
  teamsPresent: number;
  matchupCount: number;
  playerActualRowCount: number;
  starterCount: number;
  source: "SLEEPER";
  finalityEvidence: Record<string, unknown>;
  checksum: string;
  artifactPath: string;
  writePerformed: boolean;
  calibrationEligibility: "INELIGIBLE / PATH C" | "ELIGIBLE IF PAIRED WITH VALID PROJECTION";
};

function usage(): never {
  throw new Error("Usage: npm run season-simulator:capture-actuals -- --season 2026 --week 1 [--dry-run]");
}

export function parseCaptureArgs(args: readonly string[], targetDirectory = ACTUAL_CAPTURE_DIRECTORY): CaptureOptions {
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const season = Number(value("--season"));
  const week = Number(value("--week"));
  if (!Number.isInteger(season) || !Number.isInteger(week) || season < 2018 || week < 1 || week > 18) usage();
  return { season, week, dryRun: args.includes("--dry-run"), targetDirectory };
}

function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function id(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }

function actualPlayer(playerId: string, actualPoints: number, registry: ReturnType<typeof getLocalPlayerIdentityRegistry>): SleeperActualPlayerRow {
  const identity = registry[playerId];
  const defense = /^[A-Z]{2,3}$/.test(playerId) && !identity;
  const position = identity?.position === "DEF" || defense ? "DEF" : identity?.position;
  if (!(position && ["QB", "RB", "WR", "TE", "K", "DEF"].includes(position))) throw new Error(`REFUSED: missing supported Sleeper identity for player ${playerId}.`);
  return { playerId, playerName: identity?.displayName ?? playerId, position: position as SleeperActualPlayerRow["position"], nflTeam: identity?.nflTeam ?? (defense ? playerId : null), actualPoints, availabilityStatus: identity?.injuryStatus ?? null };
}

export function buildActualCapture(input: CaptureInput): ActualEvidenceArtifact {
  const currentWeek = Number(input.state.week);
  if (!Number.isInteger(currentWeek) || currentWeek < input.week) throw new Error(`REFUSED: requested Week ${input.week} is not yet current/finalized in Sleeper.`);
  const rosterIds = new Set(input.rosters.map(roster => id(roster.roster_id)).filter((value): value is string => value !== null));
  if (input.rosters.length !== TEAM_COUNT || rosterIds.size !== TEAM_COUNT) throw new Error(`REFUSED: expected exactly ${TEAM_COUNT} unique River City rosters.`);
  if (input.matchups.length !== TEAM_COUNT) throw new Error(`REFUSED: expected ${TEAM_COUNT} finalized matchup rows, received ${input.matchups.length}.`);
  const matchupIds = new Set(input.matchups.map(row => id(row.matchup_id)).filter((value): value is string => value !== null));
  if (matchupIds.size !== TEAM_COUNT / 2 || [...matchupIds].some(matchupId => input.matchups.filter(row => id(row.matchup_id) === matchupId).length !== 2)) throw new Error("REFUSED: matchup evidence is incomplete or malformed.");
  if (input.matchups.some(row => !id(row.roster_id) || !finite(row.points))) throw new Error("REFUSED: every River City team must have a numeric official score.");
  const matchupRosterIds = new Set(input.matchups.map(row => id(row.roster_id)).filter((value): value is string => value !== null));
  if (matchupRosterIds.size !== TEAM_COUNT || [...rosterIds].some(rosterId => !matchupRosterIds.has(rosterId))) throw new Error("REFUSED: matchup evidence does not contain all 12 River City teams.");

  const registry = getLocalPlayerIdentityRegistry();
  const matchupResults: SleeperActualMatchupRow[] = [];
  const playerActuals = new Map<string, SleeperActualPlayerRow>();
  for (const row of input.matchups) {
    const rosterId = id(row.roster_id)!;
    const starters = array(row.starters).map(id).filter((value): value is string => value !== null);
    const starterPoints = array(row.starters_points);
    if (starters.length === 0 || starterPoints.length !== starters.length || starterPoints.some(value => !finite(value))) throw new Error(`REFUSED: incomplete starter evidence for roster ${rosterId}.`);
    const points = row.players_points && typeof row.players_points === "object" && !Array.isArray(row.players_points) ? row.players_points as Record<string, unknown> : null;
    if (!points || Object.values(points).some(value => !finite(value))) throw new Error(`REFUSED: incomplete player actual evidence for roster ${rosterId}.`);
    const players = Object.entries(points).map(([playerId, pointsValue]) => actualPlayer(playerId, pointsValue as number, registry));
    players.forEach(player => playerActuals.set(`${rosterId}:${player.playerId}`, player));
    matchupResults.push({ franchiseId: rosterId, officialTeamScore: row.points!, officialStarterIds: starters, starterPoints: Object.fromEntries(starters.map((starterId, index) => [starterId, starterPoints[index] as number])), players });
  }
  const settings = input.league.settings && typeof input.league.settings === "object" ? input.league.settings as Record<string, unknown> : {};
  const finalityEvidence = { source: "SLEEPER", leagueStatus: input.league.status ?? null, season: input.league.season ?? null, currentWeek: input.state.week ?? null, displayWeek: input.state.display_week ?? null, lastScoredLeg: settings.last_scored_leg ?? null, allTeamScoresNumeric: true, matchupRows: input.matchups.length };
  const pathC = input.season === 2026 && input.week === 1;
  const artifact = buildActualEvidenceArtifact({ season: input.season, week: input.week, calibrationEligibility: pathC ? "INELIGIBLE_PATH_C" : "ELIGIBLE_IF_PAIRED_WITH_VALID_PROJECTION", calibrationEligibilityReason: pathC ? "The original pregame Week 1 FantasyPros projection snapshot was not preserved; actual evidence is historical-only." : "Actual evidence may be paired only with a valid same-week pregame projection artifact.", finalizedAt: input.finalizedAt ?? new Date().toISOString(), finalityEvidence, sleeperLeagueState: input.state, matchupResults, officialTeamScores: Object.fromEntries(matchupResults.map(result => [result.franchiseId, result.officialTeamScore])), officialStarterIds: Object.fromEntries(matchupResults.map(result => [result.franchiseId, result.officialStarterIds])), playerActuals: [...playerActuals.values()], finalized: true });
  if (!artifact) throw new Error("REFUSED: Sleeper week was not finalized.");
  return artifact;
}

export function validateActualReadback(value: ActualEvidenceArtifact) {
  const base = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "actualInputChecksum" && key !== "schemaVersion"));
  if (value.schemaVersion !== ACTUAL_EVIDENCE_SCHEMA || value.actualInputChecksum !== checksum(base)) throw new Error("REFUSED: actual artifact checksum validation failed.");
}

async function existingArtifacts(directory: string, season: number, week: number) {
  const prefix = `${season}-week-${String(week).padStart(2, "0")}-actual-evidence-`;
  return (await fs.readdir(directory).catch(() => [] as string[])).filter(file => file.startsWith(prefix) && file.endsWith(".json"));
}

export async function writeActualCapture(artifact: ActualEvidenceArtifact, options: { targetDirectory: string; dryRun: boolean }) {
  const artifactPath = path.join(options.targetDirectory, `${artifact.season}-week-${String(artifact.week).padStart(2, "0")}-actual-evidence-${artifact.actualInputChecksum.slice(0, 16)}.json`);
  const existing = await existingArtifacts(options.targetDirectory, artifact.season, artifact.week);
  if (existing.length > 0) throw new Error(`REFUSED: authoritative actual evidence already exists: ${existing.join(", ")}.`);
  if (options.dryRun) return { artifactPath, writePerformed: false };
  await fs.mkdir(options.targetDirectory, { recursive: true });
  const handle = await fs.open(artifactPath, "wx");
  try { await handle.writeFile(JSON.stringify(artifact, null, 2) + "\n", "utf8"); } finally { await handle.close(); }
  validateActualReadback(JSON.parse(await fs.readFile(artifactPath, "utf8")) as ActualEvidenceArtifact);
  return { artifactPath, writePerformed: true };
}

export async function runCapture(options: CaptureOptions): Promise<CaptureSummary> {
  const [state, league, rosters, matchups] = await Promise.all([getNFLState(), getLeagueInfo(LEAGUE_ID), getLeagueRosters(LEAGUE_ID), getMatchups(options.week, LEAGUE_ID)]);
  const artifact = buildActualCapture({ season: options.season, week: options.week, state: state as unknown as Record<string, unknown>, league: league as unknown as Record<string, unknown>, rosters: rosters as Array<Record<string, unknown>>, matchups: matchups as RawMatchup[] });
  const write = await writeActualCapture(artifact, options);
  return { schema: artifact.schemaVersion, season: options.season, week: options.week, leagueId: LEAGUE_ID, teamsPresent: artifact.matchupResults.length, matchupCount: artifact.matchupResults.length / 2, playerActualRowCount: artifact.playerActuals.length, starterCount: artifact.matchupResults.reduce((total, result) => total + result.officialStarterIds.length, 0), source: "SLEEPER", finalityEvidence: artifact.finalityEvidence as Record<string, unknown>, checksum: artifact.actualInputChecksum, artifactPath: write.artifactPath, writePerformed: write.writePerformed, calibrationEligibility: artifact.calibrationEligibility === "INELIGIBLE_PATH_C" ? "INELIGIBLE / PATH C" : "ELIGIBLE IF PAIRED WITH VALID PROJECTION" };
}

if (process.argv[1]?.endsWith("season-simulator-capture-actuals.ts")) {
  runCapture(parseCaptureArgs(process.argv.slice(2))).then(summary => console.log(JSON.stringify(summary, null, 2))).catch(error => { console.error(error instanceof Error ? error.message : "Capture refused"); process.exitCode = 1; });
}
