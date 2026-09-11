import fs from "node:fs/promises";
import path from "node:path";
import { FantasyProsWeeklyAdapter } from "../lib/seasonSimulator/fantasyProsAdapter";
import { normalizeCrosswalkTeam, type CrosswalkSleeperRecord } from "../lib/seasonSimulator/identityCrosswalk";
import { buildExpectedTeamScore, type ExpectedScoreRosterPlayer, type ExpectedTeamScoreResult } from "../lib/seasonSimulator/expectedTeamScore";
import { buildProjectionEvidenceArtifact, type ProjectionEvidenceArtifact, type ProjectionEvidenceRow } from "../lib/seasonSimulator/evidenceCollection";
import type { NormalizedWeeklyProjection, ProjectionAvailabilityStatus } from "../lib/seasonSimulator/prerequisites";
import { checksum } from "../lib/seasonSimulator/evidenceSnapshot";
import { evaluateFreezeWindow } from "../lib/seasonSimulator/freezeWindow";

const LEAGUE_ID = "1312149033254416384";
const CALIBRATION_DIRECTORY = path.join(process.cwd(), ".local-calibration");
const NFL_TEAMS = ["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAC", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"] as const;

export type FreezeOptions = { season: number; week: number; dryRun: boolean; now: Date; targetDirectory: string; fetchImpl?: typeof fetch; sleep?: (milliseconds: number) => Promise<void> };
export type FreezeSummary = { season: number; week: number; source: "FANTASYPROS"; sourceAsOf: string | null; normalizedProjectionCount: number; franchisesFound: number; expectedScoresAvailable: number; unresolvedIdentities: number; unavailableTeams: string[]; unavailableReasons: Record<string, string>; checksumCandidate: string; artifactTargetPath: string; writePerformed: boolean; officialFreezeEligible: boolean; eligibilityReason: string | null; beforeFirstKickoff: boolean };

function usage(): never {
  throw new Error("Usage: npm run season-simulator:freeze-projections -- --season 2026 --week 2 [--dry-run]");
}

export function parseFreezeArgs(args: readonly string[], now = new Date(), targetDirectory = CALIBRATION_DIRECTORY): FreezeOptions {
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const season = Number(value("--season"));
  const week = Number(value("--week"));
  if (!Number.isInteger(season) || !Number.isInteger(week) || season !== 2026 || week !== 2) usage();
  return { season, week, dryRun: args.includes("--dry-run"), now, targetDirectory };
}

export function validateFreezeWindow(options: Pick<FreezeOptions, "season" | "week" | "now">): boolean {
  return evaluateFreezeWindow(options.season, options.week, options.now).eligible;
}

function approvedArtifact(value: unknown, season: number, week: number): boolean {
  if (!value || typeof value !== "object") return false;
  const artifact = value as Record<string, unknown>;
  return artifact.season === season && artifact.week === week && artifact.capturePurpose === "CALIBRATION_BASELINE" && artifact.capturedWithinApprovedWindow === true;
}

async function existingAuthoritativeArtifactCount(directory: string, season: number, week: number): Promise<number> {
  const files = (await fs.readdir(directory).catch(() => [] as string[])).filter(file => file.startsWith(`${season}-week-${String(week).padStart(2, "0")}-projection-evidence-`) && file.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    try {
      if (approvedArtifact(JSON.parse(await fs.readFile(path.join(directory, file), "utf8")), season, week)) count += 1;
    } catch {
      // A malformed diagnostic cannot become an authoritative baseline.
    }
  }
  return count;
}

function status(value: unknown): ProjectionAvailabilityStatus {
  const normalized = String(value ?? "").toUpperCase();
  if (["OUT", "INACTIVE", "SUSPENDED", "IR", "FREE_AGENT", "QUESTIONABLE", "DOUBTFUL", "ACTIVE"].includes(normalized)) return normalized as ProjectionAvailabilityStatus;
  return "UNKNOWN";
}

function asSleeperRecords(players: Record<string, Record<string, unknown>>): CrosswalkSleeperRecord[] {
  const records = Object.entries(players).map(([playerId, player]) => ({ player_id: playerId, full_name: typeof player.full_name === "string" ? player.full_name : null, position: typeof player.position === "string" ? player.position : null, team: typeof player.team === "string" ? normalizeCrosswalkTeam(player.team) : null, fantasy_data_id: player.fantasy_data_id as string | number | null, sportradar_id: player.sportradar_id as string | null, stats_id: player.stats_id as string | number | null, gsis_id: player.gsis_id as string | null, espn_id: player.espn_id as string | number | null, yahoo_id: player.yahoo_id as string | number | null, rotowire_id: player.rotowire_id as string | number | null, injury_status: player.injury_status as string | null, status: player.status as string | null }));
  return [...records, ...NFL_TEAMS.map(team => ({ player_id: team, full_name: `${team} DST`, position: "DEF", team }))];
}

function rosterPlayers(roster: { players?: string[] }, players: Record<string, Record<string, unknown>>): ExpectedScoreRosterPlayer[] {
  return (roster.players ?? []).map(playerId => {
    const player = players[playerId];
    const isDefense = NFL_TEAMS.includes(playerId as typeof NFL_TEAMS[number]) || player?.position === "DEF";
    const rawTeam = typeof player?.team === "string" ? player.team : playerId;
    return { playerId: isDefense ? normalizeCrosswalkTeam(rawTeam) : playerId, playerName: isDefense ? `${normalizeCrosswalkTeam(rawTeam)} DST` : String(player?.full_name ?? playerId), position: isDefense ? "DEF" : player?.position as ExpectedScoreRosterPlayer["position"], nflTeam: isDefense ? normalizeCrosswalkTeam(rawTeam) : (typeof player?.team === "string" ? normalizeCrosswalkTeam(player.team) : null), availabilityStatus: status(player?.injury_status ?? player?.status) };
  }).filter(player => ["QB", "RB", "WR", "TE", "K", "DEF"].includes(player.position));
}

function expectedScoreRecord(result: ExpectedTeamScoreResult): Record<string, unknown> {
  if (result.status === "UNAVAILABLE") return { franchiseId: result.franchiseId, season: result.season, week: result.week, expectedScore: null, status: result.status, reason: result.reason, missingSlots: result.missingSlots, diagnostics: result.diagnostics };
  return { franchiseId: result.franchiseId, season: result.season, week: result.week, expectedScore: result.expectedScore, status: result.status, projectedLineup: result.projectedLineup, projectionCoverage: result.projectionCoverage, source: result.source, sourceAsOf: result.sourceAsOf, diagnostics: result.diagnostics };
}

export async function runFreeze(options: FreezeOptions): Promise<FreezeSummary> {
  const windowDecision = evaluateFreezeWindow(options.season, options.week, options.now);
  if (!windowDecision.eligible && !options.dryRun) throw new Error(`REFUSED: ${windowDecision.reason}.`);
  const env = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
  const keyLine = env.split(/\r?\n/).find(line => /^\s*FANTASYPROS_API_KEY\s*=/.test(line));
  if (!keyLine) throw new Error("REFUSED: FANTASYPROS_API_KEY is missing.");
  const apiKey = keyLine.replace(/^\s*FANTASYPROS_API_KEY\s*=\s*/, "").trim().replace(/^"|"$/g, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const json = async <T>(url: string) => { const response = await fetchImpl(url); if (!response.ok) throw new Error(`REFUSED: Sleeper request failed HTTP ${response.status}`); return await response.json() as T; };
  const [playerDirectory, rosters, users, league] = await Promise.all([
    json<Record<string, Record<string, unknown>>>(`https://api.sleeper.com/v1/players/nfl`),
    json<{ roster_id: number; owner_id: string; players?: string[] }[]>(`https://api.sleeper.com/v1/league/${LEAGUE_ID}/rosters`),
    json<{ user_id: string; display_name?: string; metadata?: { team_name?: string } }[]>(`https://api.sleeper.com/v1/league/${LEAGUE_ID}/users`),
    json<Record<string, unknown>>(`https://api.sleeper.com/v1/league/${LEAGUE_ID}`),
  ]);
  if (rosters.length !== 12 || new Set(rosters.map(roster => roster.roster_id)).size !== 12) throw new Error("REFUSED: expected exactly 12 unique canonical franchises.");
  const sleeperRecords = asSleeperRecords(playerDirectory);
  const adapter = new FantasyProsWeeklyAdapter({ apiKey, fetchImpl, sleep: options.sleep });
  const feed = await adapter.fetchWeek(options.season, options.week, sleeperRecords);
  if (feed.projections.some(projection => projection.season !== options.season || projection.week !== options.week)) throw new Error("REFUSED: provider season/week mismatch.");
  const franchiseResults: Record<string, ExpectedTeamScoreResult> = {};
  const evidenceRows: ProjectionEvidenceRow[] = [];
  const allProjectionRows = feed.projections.filter(projection => projection.playerId && projection.projectedPoints !== null);
  for (const roster of rosters) {
    const franchiseId = String(roster.roster_id);
    const owner = users.find(user => user.user_id === roster.owner_id);
    const result = buildExpectedTeamScore(franchiseId, options.season, options.week, rosterPlayers(roster, playerDirectory), feed.projections);
    franchiseResults[franchiseId] = result;
    const rosterIds = new Set((roster.players ?? []).map(String));
    for (const projection of allProjectionRows) if (rosterIds.has(projection.playerId)) evidenceRows.push({ franchiseId, playerId: projection.playerId, playerName: projection.playerName, position: projection.position, nflTeam: projection.nflTeam, projectedPoints: projection.projectedPoints, projectedStarter: result.status === "AVAILABLE" && Object.values(result.projectedLineup).some(candidate => candidate.playerId === projection.playerId), mappingMethod: projection.identityMethod ?? "UNRESOLVED" });
    void owner;
  }
  const expectedTeamScores = Object.fromEntries(Object.entries(franchiseResults).map(([franchiseId, result]) => [franchiseId, expectedScoreRecord(result)]));
  const projectedLineups = Object.fromEntries(Object.entries(franchiseResults).map(([franchiseId, result]) => [franchiseId, result.status === "AVAILABLE" ? result.projectedLineup : null]));
  const createdAt = options.now.toISOString();
  const artifact = buildProjectionEvidenceArtifact({ modelVersion: "river-city-2026-projection-v1", season: options.season, week: options.week, createdAt, evidenceAsOf: createdAt, projectionSource: "FANTASYPROS", providerVersion: feed.projections[0]?.providerVersion ?? null, providerResponseAsOf: feed.diagnostics.sourceAsOf, rosterEvidenceAsOf: createdAt, lineupEvidenceAsOf: createdAt, scoringSettingsChecksum: checksum(league), projectionInputChecksum: checksum(feed.projections), projections: evidenceRows, projectedLineups, expectedTeamScores, mappingDiagnostics: feed.diagnostics, coverageDiagnostics: Object.fromEntries(Object.entries(franchiseResults).map(([id, result]) => [id, result.status === "AVAILABLE" ? 1 : 0])), unavailableTeamDiagnostics: Object.values(franchiseResults).filter(result => result.status === "UNAVAILABLE").map(result => ({ franchiseId: result.franchiseId, reason: result.reason })), ...(windowDecision.eligible ? { capturePurpose: "CALIBRATION_BASELINE" as const, freezeWindowOpen: windowDecision.window.windowOpen, firstKickoff: windowDecision.window.firstKickoff, capturedWithinApprovedWindow: true } : {}) });
  const authoritativeCount = await existingAuthoritativeArtifactCount(options.targetDirectory, options.season, options.week);
  if (authoritativeCount > 0) throw new Error("REFUSED: an authoritative calibration baseline already exists for this season/week.");
  const targetPath = path.join(options.targetDirectory, `${options.season}-week-${String(options.week).padStart(2, "0")}-projection-evidence-${artifact.checksum.slice(0, 16)}.json`);
  const unavailableTeams = Object.values(franchiseResults).filter(result => result.status === "UNAVAILABLE").map(result => result.franchiseId);
  const expectedScoresAvailable = Object.values(franchiseResults).filter(result => result.status === "AVAILABLE").length;
  const selectedIdentityMisses = evidenceRows.filter(row => row.mappingMethod === "UNRESOLVED").length;
  const checksumValid = artifact.checksum === checksum(Object.fromEntries(Object.entries(artifact).filter(([key]) => key !== "checksum")));
  const officialEligibilityFailure = !windowDecision.eligible ? windowDecision.reason : rosters.length !== 12 ? "EXPECTED_12_FRANCHISES" : expectedScoresAvailable !== 12 ? "EXPECTED_12_AVAILABLE_SCORES" : unavailableTeams.length > 0 ? "UNAVAILABLE_FRANCHISE" : selectedIdentityMisses > 0 ? "SELECTED_IDENTITY_MISS" : !checksumValid ? "CHECKSUM_INVALID" : authoritativeCount > 0 ? "AUTHORITATIVE_BASELINE_EXISTS" : null;
  const officialFreezeEligible = officialEligibilityFailure === null;
  const summary: FreezeSummary = { season: options.season, week: options.week, source: "FANTASYPROS", sourceAsOf: feed.diagnostics.sourceAsOf, normalizedProjectionCount: feed.projections.length, franchisesFound: rosters.length, expectedScoresAvailable, unresolvedIdentities: feed.diagnostics.unresolved, unavailableTeams, unavailableReasons: Object.fromEntries(Object.values(franchiseResults).filter(result => result.status === "UNAVAILABLE").map(result => [result.franchiseId, result.reason])), checksumCandidate: artifact.checksum, artifactTargetPath: targetPath, writePerformed: false, officialFreezeEligible, eligibilityReason: officialEligibilityFailure, beforeFirstKickoff: windowDecision.window ? options.now.getTime() < Date.parse(windowDecision.window.firstKickoff) : false };
  if (!options.dryRun && !officialFreezeEligible) throw new Error(`REFUSED: ${officialEligibilityFailure}.`);
  if (!options.dryRun && officialFreezeEligible) {
    await fs.mkdir(options.targetDirectory, { recursive: true });
    const handle = await fs.open(targetPath, "wx");
    try { await handle.writeFile(JSON.stringify(artifact, null, 2) + "\n", "utf8"); } finally { await handle.close(); }
    summary.writePerformed = true;
  }
  return summary;
}

if (process.argv[1]?.endsWith("season-simulator-freeze-projections.ts")) {
  runFreeze(parseFreezeArgs(process.argv.slice(2))).then(summary => { console.log(JSON.stringify({ ...summary, label: "COMMISSIONER CALIBRATION DIAGNOSTIC", publication: "NOT OWNER-PUBLISHED", writePerformed: summary.writePerformed ? "YES" : "NO", officialFreezeEligible: summary.officialFreezeEligible ? "YES" : "NO", reason: summary.eligibilityReason }, null, 2)); }).catch(error => { console.error(error instanceof Error ? error.message : "Freeze refused"); process.exitCode = 1; });
}
