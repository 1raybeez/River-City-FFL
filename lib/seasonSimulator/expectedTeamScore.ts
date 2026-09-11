import { findLegalProjectedLineup, type LegalProjectedLineup, type ProjectedLineupCandidate } from "./lineupFeasibility";
import type { NormalizedWeeklyProjection, ProjectionAvailabilityStatus } from "./prerequisites";

export type ExpectedScoreFailureReason = "NO_PROJECTED_QB" | "NO_PROJECTED_RB" | "INSUFFICIENT_PROJECTED_WR" | "NO_PROJECTED_TE" | "NO_PROJECTED_FLEX" | "NO_PROJECTED_KICKER" | "NO_PROJECTED_DEFENSE" | "IDENTITY_UNRESOLVED" | "INCOMPLETE_LEGAL_LINEUP";
export type ExpectedScoreRosterPlayer = { playerId: string; playerName: string; position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF"; nflTeam: string | null; availabilityStatus?: ProjectionAvailabilityStatus };
export type ExpectedTeamScoreResult = { franchiseId: string; season: number; week: number; expectedScore: number; status: "AVAILABLE"; projectedLineup: NonNullable<LegalProjectedLineup>; projectionCoverage: number; source: "FANTASYPROS"; sourceAsOf: string | null; diagnostics: { candidateCount: number; excludedUnavailable: string[]; excludedMissingProjection: string[] } } | { franchiseId: string; season: number; week: number; expectedScore: null; status: "UNAVAILABLE"; reason: ExpectedScoreFailureReason; missingSlots: string[]; diagnostics: { candidateCount: number; excludedUnavailable: string[]; excludedMissingProjection: string[] } };

const unavailable = new Set<ProjectionAvailabilityStatus>(["BYE", "OUT", "INACTIVE", "SUSPENDED", "IR", "FREE_AGENT"]);

export function buildExpectedTeamScore(franchiseId: string, season: number, week: number, roster: readonly ExpectedScoreRosterPlayer[], projections: readonly NormalizedWeeklyProjection[]): ExpectedTeamScoreResult {
  const byPlayer = new Map(projections.map(projection => [projection.playerId, projection]));
  const excludedUnavailable: string[] = [];
  const excludedMissingProjection: string[] = [];
  const candidates: ProjectedLineupCandidate[] = [];
  for (const player of roster) {
    if (unavailable.has(player.availabilityStatus ?? "UNKNOWN")) {
      excludedUnavailable.push(player.playerName);
      continue;
    }
    const projection = byPlayer.get(player.playerId);
    if (!projection || projection.projectedPoints === null || projection.coverageStatus === "UNRESOLVED" || projection.coverageStatus === "MISSING") {
      excludedMissingProjection.push(player.playerName);
      continue;
    }
    candidates.push({ playerId: player.playerId, playerName: player.playerName, position: player.position, nflTeam: player.nflTeam, projectedPoints: projection.projectedPoints, mappingMethod: projection.identityMethod ?? "RESOLVED" });
  }
  const lineup = findLegalProjectedLineup(candidates);
  const diagnostics = { candidateCount: candidates.length, excludedUnavailable, excludedMissingProjection };
  if (!lineup) return { franchiseId, season, week, expectedScore: null, status: "UNAVAILABLE", reason: failureReason(candidates), missingSlots: missingSlots(candidates), diagnostics };
  return { franchiseId, season, week, expectedScore: Object.values(lineup).reduce((sum, player) => sum + player.projectedPoints, 0), status: "AVAILABLE", projectedLineup: lineup, projectionCoverage: 1, source: "FANTASYPROS", sourceAsOf: projections.find(p => p.sourceAsOf)?.sourceAsOf ?? null, diagnostics };
}

function failureReason(candidates: readonly ProjectedLineupCandidate[]): ExpectedScoreFailureReason {
  if (!candidates.some(p => p.position === "QB")) return "NO_PROJECTED_QB";
  if (!candidates.some(p => p.position === "RB")) return "NO_PROJECTED_RB";
  if (candidates.filter(p => p.position === "WR").length < 2) return "INSUFFICIENT_PROJECTED_WR";
  if (!candidates.some(p => p.position === "TE")) return "NO_PROJECTED_TE";
  if (!candidates.some(p => p.position === "K")) return "NO_PROJECTED_KICKER";
  if (!candidates.some(p => p.position === "DEF")) return "NO_PROJECTED_DEFENSE";
  if (!candidates.some(p => ["RB", "WR", "TE"].includes(p.position))) return "NO_PROJECTED_FLEX";
  return "INCOMPLETE_LEGAL_LINEUP";
}

function missingSlots(candidates: readonly ProjectedLineupCandidate[]): string[] {
  const missing: string[] = [];
  if (!candidates.some(p => p.position === "QB")) missing.push("QB");
  if (!candidates.some(p => p.position === "RB")) missing.push("RB");
  if (candidates.filter(p => p.position === "WR").length < 2) missing.push("WR");
  if (!candidates.some(p => p.position === "TE")) missing.push("TE");
  if (!candidates.some(p => p.position === "K")) missing.push("K");
  if (!candidates.some(p => p.position === "DEF")) missing.push("DEF");
  if (!candidates.some(p => ["RB", "WR", "TE"].includes(p.position))) missing.push("FLEX");
  return missing;
}
