import { FantasyProsWeeklyAdapter } from "@/lib/seasonSimulator/fantasyProsAdapter";
import { normalizeCrosswalkTeam, type CrosswalkSleeperRecord } from "@/lib/seasonSimulator/identityCrosswalk";
import { buildExpectedTeamScore, type ExpectedScoreRosterPlayer, type ExpectedTeamScoreResult } from "@/lib/seasonSimulator/expectedTeamScore";
import { buildProjectionEvidenceArtifact, type ProjectionEvidenceArtifact, type ProjectionEvidenceRow } from "@/lib/seasonSimulator/evidenceCollection";
import type { ProjectionAvailabilityStatus } from "@/lib/seasonSimulator/prerequisites";
import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";

export const PROJECTION_CANDIDATE_MODEL_VERSION = "river-city-2026-projection-v1";
const TEAM_COUNT = 12;
const NFL_TEAMS = ["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAC", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"] as const;

export type SleeperProjectionProvider = { playerDirectory(): Promise<Record<string, Record<string, unknown>>>; rosters(): Promise<Array<{ roster_id: number; owner_id: string; players?: string[] }>>; league(): Promise<Record<string, unknown>> };
export type ProjectionCandidateDependencies = { season: number; week: number; now: Date; apiKey: string; fetchImpl?: typeof fetch; sleep?: (milliseconds: number) => Promise<void>; sleeper?: SleeperProjectionProvider; freezeWindow?: { windowOpen: string; firstKickoff: string } };
export type ProjectionCandidate = { artifact: ProjectionEvidenceArtifact; normalizedProjectionCount: number; franchisesFound: number; expectedScoresAvailable: number; unavailableTeams: string[]; unavailableReasons: Record<string, string>; unresolvedIdentities: number; sourceAsOf: string | null };

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

async function defaultSleeper(leagueId: string, fetchImpl: typeof fetch): Promise<SleeperProjectionProvider> {
  const json = async <T>(url: string) => { const response = await fetchImpl(url, { cache: "no-store" }); if (!response.ok) throw new Error(`Sleeper request failed HTTP ${response.status}.`); return await response.json() as T; };
  return { playerDirectory: () => json<Record<string, Record<string, unknown>>>("https://api.sleeper.com/v1/players/nfl"), rosters: () => json<Array<{ roster_id: number; owner_id: string; players?: string[] }>>(`https://api.sleeper.com/v1/league/${leagueId}/rosters`), league: () => json<Record<string, unknown>>(`https://api.sleeper.com/v1/league/${leagueId}`) };
}

export async function buildProjectionCandidate({ season, week, now, apiKey, fetchImpl = fetch, sleep, sleeper, freezeWindow }: ProjectionCandidateDependencies): Promise<ProjectionCandidate> {
  if (!apiKey.trim()) throw new Error("FantasyPros API credential is required.");
  const leagueId = "1312149033254416384";
  const source = sleeper ?? await defaultSleeper(leagueId, fetchImpl);
  const [playerDirectory, rosters, league] = await Promise.all([source.playerDirectory(), source.rosters(), source.league()]);
  if (rosters.length !== TEAM_COUNT || new Set(rosters.map(roster => roster.roster_id)).size !== TEAM_COUNT) throw new Error("Expected exactly 12 unique canonical franchises.");
  const feed = await new FantasyProsWeeklyAdapter({ apiKey, fetchImpl, sleep }).fetchWeek(season, week, asSleeperRecords(playerDirectory));
  if (feed.projections.some(projection => projection.season !== season || projection.week !== week)) throw new Error("Provider season/week mismatch.");
  const franchiseResults: Record<string, ExpectedTeamScoreResult> = {};
  const evidenceRows: ProjectionEvidenceRow[] = [];
  const allProjectionRows = feed.projections.filter(projection => projection.playerId && projection.projectedPoints !== null);
  for (const roster of rosters) {
    const franchiseId = String(roster.roster_id);
    const result = buildExpectedTeamScore(franchiseId, season, week, rosterPlayers(roster, playerDirectory), feed.projections);
    franchiseResults[franchiseId] = result;
    const rosterIds = new Set((roster.players ?? []).map(String));
    for (const projection of allProjectionRows) if (rosterIds.has(projection.playerId)) evidenceRows.push({ franchiseId, playerId: projection.playerId, playerName: projection.playerName, position: projection.position, nflTeam: projection.nflTeam, projectedPoints: projection.projectedPoints, projectedStarter: result.status === "AVAILABLE" && Object.values(result.projectedLineup).some(candidate => candidate.playerId === projection.playerId), mappingMethod: projection.identityMethod ?? "UNRESOLVED" });
  }
  const expectedTeamScores = Object.fromEntries(Object.entries(franchiseResults).map(([franchiseId, result]) => [franchiseId, expectedScoreRecord(result)]));
  const projectedLineups = Object.fromEntries(Object.entries(franchiseResults).map(([franchiseId, result]) => [franchiseId, result.status === "AVAILABLE" ? result.projectedLineup : null]));
  const createdAt = now.toISOString();
  const artifact = buildProjectionEvidenceArtifact({ modelVersion: PROJECTION_CANDIDATE_MODEL_VERSION, season, week, createdAt, evidenceAsOf: createdAt, projectionSource: "FANTASYPROS", providerVersion: feed.projections[0]?.providerVersion ?? null, providerResponseAsOf: feed.diagnostics.sourceAsOf, rosterEvidenceAsOf: createdAt, lineupEvidenceAsOf: createdAt, scoringSettingsChecksum: checksum(league), projectionInputChecksum: checksum(feed.projections), projections: evidenceRows, projectedLineups, expectedTeamScores, mappingDiagnostics: feed.diagnostics, coverageDiagnostics: Object.fromEntries(Object.entries(franchiseResults).map(([id, result]) => [id, result.status === "AVAILABLE" ? 1 : 0])), unavailableTeamDiagnostics: Object.values(franchiseResults).filter(result => result.status === "UNAVAILABLE").map(result => ({ franchiseId: result.franchiseId, reason: result.reason })), capturePurpose: "CALIBRATION_BASELINE", capturedWithinApprovedWindow: true, ...(freezeWindow ?? {}) });
  const unavailable = Object.values(franchiseResults).filter(result => result.status === "UNAVAILABLE");
  return { artifact, normalizedProjectionCount: feed.projections.length, franchisesFound: rosters.length, expectedScoresAvailable: rosters.length - unavailable.length, unavailableTeams: unavailable.map(result => result.franchiseId), unavailableReasons: Object.fromEntries(unavailable.map(result => [result.franchiseId, result.reason])), unresolvedIdentities: feed.diagnostics.unresolved, sourceAsOf: feed.diagnostics.sourceAsOf };
}
