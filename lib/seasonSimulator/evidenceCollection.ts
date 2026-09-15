import { checksum } from "./evidenceSnapshot";
import { calculateResidualObservation, type ProjectionResidualObservation } from "./varianceFoundation";

export const PROJECTION_EVIDENCE_SCHEMA = "river-city-projection-evidence-v1";
export const ACTUAL_EVIDENCE_SCHEMA = "river-city-actual-evidence-v1";
export const RESIDUAL_DATASET_SCHEMA = "river-city-residual-dataset-v1";

export type ProjectionEvidenceRow = {
  franchiseId: string;
  playerId: string;
  playerName: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
  nflTeam: string | null;
  projectedPoints: number | null;
  projectedStarter: boolean;
  mappingMethod: string;
};

export type ProjectionEvidenceArtifact = {
  readonly schemaVersion: typeof PROJECTION_EVIDENCE_SCHEMA;
  readonly modelVersion: string;
  readonly season: number;
  readonly week: number;
  readonly createdAt: string;
  readonly evidenceAsOf: string;
  readonly projectionSource: "FANTASYPROS";
  readonly providerVersion: string | null;
  readonly providerResponseAsOf: string | null;
  readonly rosterEvidenceAsOf: string;
  readonly lineupEvidenceAsOf: string;
  readonly scoringSettingsChecksum: string;
  readonly projectionInputChecksum: string;
  readonly projections: readonly ProjectionEvidenceRow[];
  readonly projectedLineups: Readonly<Record<string, unknown>>;
  readonly expectedTeamScores: Readonly<Record<string, unknown>>;
  readonly mappingDiagnostics: unknown;
  readonly coverageDiagnostics: unknown;
  readonly unavailableTeamDiagnostics: readonly unknown[];
  readonly capturePurpose?: "CALIBRATION_BASELINE";
  readonly freezeWindowOpen?: string;
  readonly firstKickoff?: string;
  readonly capturedWithinApprovedWindow?: boolean;
  readonly checksum: string;
};

export type SleeperActualPlayerRow = {
  playerId: string;
  playerName: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
  nflTeam: string | null;
  actualPoints: number | null;
  availabilityStatus: string | null;
};

export type SleeperActualMatchupRow = {
  franchiseId: string;
  officialTeamScore: number | null;
  officialStarterIds: readonly string[];
  starterPoints: Readonly<Record<string, number | null>>;
  players: readonly SleeperActualPlayerRow[];
};

export type ActualCalibrationEligibility =
  | "INELIGIBLE_PATH_C"
  | "ELIGIBLE_IF_PAIRED_WITH_VALID_PROJECTION";

export type ActualEvidenceArtifact = {
  readonly schemaVersion: typeof ACTUAL_EVIDENCE_SCHEMA;
  readonly season: number;
  readonly week: number;
  readonly calibrationEligibility: ActualCalibrationEligibility;
  readonly calibrationEligibilityReason: string;
  readonly finalizedAt: string;
  readonly finalityEvidence: unknown;
  readonly sleeperLeagueState: unknown;
  readonly matchupResults: readonly SleeperActualMatchupRow[];
  readonly officialTeamScores: Readonly<Record<string, number | null>>;
  readonly officialStarterIds: Readonly<Record<string, readonly string[]>>;
  readonly playerActuals: readonly SleeperActualPlayerRow[];
  readonly actualInputChecksum: string;
};

export type PairedPlayerResidual = ProjectionResidualObservation & {
  franchiseId: string;
  projectedStarter: boolean;
  actualStarter: boolean;
  mappingMethod: string;
  validForVariance: boolean;
  exclusionReason: string | null;
};

export type PairedTeamResidual = {
  franchiseId: string;
  expectedTeamScore: number | null;
  actualTeamScore: number | null;
  teamResidual: number | null;
  absoluteTeamResidual: number | null;
  squaredTeamResidual: number | null;
  projectedLineup: unknown;
  actualLineup: readonly string[];
  completeCoverage: boolean;
};

export type PairedResidualDataset = {
  schemaVersion: typeof RESIDUAL_DATASET_SCHEMA;
  season: number;
  week: number;
  projectionChecksum: string;
  actualChecksum: string;
  playerResidualObservations: readonly PairedPlayerResidual[];
  teamResidualObservations: readonly PairedTeamResidual[];
  diagnostics: { validPlayerObservations: number; excludedPlayerObservations: number; validTeamObservations: number; exclusions: Readonly<Record<string, number>>; checksum: string };
};

export function buildProjectionEvidenceArtifact(input: Omit<ProjectionEvidenceArtifact, "schemaVersion" | "checksum">): ProjectionEvidenceArtifact {
  const base: Omit<ProjectionEvidenceArtifact, "checksum"> = { ...input, schemaVersion: PROJECTION_EVIDENCE_SCHEMA };
  return deepFreeze({ ...base, checksum: checksum(base) });
}

export function buildActualEvidenceArtifact(input: Omit<ActualEvidenceArtifact, "schemaVersion" | "actualInputChecksum"> & { finalized: boolean }): ActualEvidenceArtifact | null {
  if (!input.finalized) return null;
  const artifact = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "finalized")) as Omit<ActualEvidenceArtifact, "schemaVersion" | "actualInputChecksum">;
  return deepFreeze({ ...artifact, schemaVersion: ACTUAL_EVIDENCE_SCHEMA, actualInputChecksum: checksum(artifact) });
}

export function pairProjectionAndActualEvidence(projection: ProjectionEvidenceArtifact, actual: ActualEvidenceArtifact): PairedResidualDataset {
  if (actual.calibrationEligibility === "INELIGIBLE_PATH_C") {
    throw new Error("Week 1 PATH C actual evidence is historical-only and cannot be used for residual calibration.");
  }
  const actualByPlayer = new Map(actual.playerActuals.map(row => [row.playerId, row]));
  const actualStarters = new Set(Object.values(actual.officialStarterIds).flat());
  const exclusions: Record<string, number> = {};
  const playerResidualObservations: PairedPlayerResidual[] = [];
  for (const projected of projection.projections) {
    const actualRow = actualByPlayer.get(projected.playerId);
    const exclusionReason = !projected.playerId ? "IDENTITY_UNRESOLVED" : projected.projectedPoints === null ? "PROJECTION_MISSING" : !actualRow ? "ACTUAL_SCORE_UNAVAILABLE" : actualRow.actualPoints === null ? "ACTUAL_SCORE_UNAVAILABLE" : !Number.isFinite(projected.projectedPoints) || !Number.isFinite(actualRow.actualPoints) ? "MALFORMED_SCORE" : null;
    if (exclusionReason) {
      exclusions[exclusionReason] = (exclusions[exclusionReason] ?? 0) + 1;
      continue;
    }
    if (!actualRow) continue;
    const observation = calculateResidualObservation({ season: projection.season, week: projection.week, playerId: projected.playerId, position: projected.position, projectedPoints: projected.projectedPoints, actualPoints: actualRow.actualPoints, actualFinal: true, availabilityStatus: actualRow.availabilityStatus, projectionSource: projection.projectionSource, providerVersion: projection.providerVersion });
    if (!observation) {
      exclusions.MALFORMED_SCORE = (exclusions.MALFORMED_SCORE ?? 0) + 1;
      continue;
    }
    playerResidualObservations.push({ ...observation, franchiseId: projected.franchiseId, projectedStarter: projected.projectedStarter, actualStarter: actualStarters.has(projected.playerId), mappingMethod: projected.mappingMethod, validForVariance: true, exclusionReason: null });
  }
  const actualTeams = new Map(actual.matchupResults.map(row => [row.franchiseId, row]));
  const expectedTeams = projection.expectedTeamScores;
  const teamResidualObservations: PairedTeamResidual[] = Object.entries(expectedTeams).map(([franchiseId, result]) => {
    const expectedTeamScore = typeof result === "object" && result !== null && typeof (result as { expectedScore?: unknown }).expectedScore === "number" ? (result as { expectedScore: number }).expectedScore : null;
    const actualRow = actualTeams.get(franchiseId);
    const actualTeamScore = actualRow?.officialTeamScore ?? null;
    const complete = expectedTeamScore !== null && actualTeamScore !== null && Number.isFinite(expectedTeamScore) && Number.isFinite(actualTeamScore);
    const residual = complete ? actualTeamScore - expectedTeamScore : null;
    return { franchiseId, expectedTeamScore, actualTeamScore, teamResidual: residual, absoluteTeamResidual: residual === null ? null : Math.abs(residual), squaredTeamResidual: residual === null ? null : residual ** 2, projectedLineup: typeof result === "object" && result !== null ? (result as { projectedLineup?: unknown }).projectedLineup ?? null : null, actualLineup: actualRow?.officialStarterIds ?? [], completeCoverage: complete };
  });
  const base: Omit<PairedResidualDataset, "diagnostics"> & { diagnostics: Omit<PairedResidualDataset["diagnostics"], "checksum"> & { checksum: string } } = { schemaVersion: RESIDUAL_DATASET_SCHEMA, season: projection.season, week: projection.week, projectionChecksum: projection.checksum, actualChecksum: actual.actualInputChecksum, playerResidualObservations, teamResidualObservations, diagnostics: { validPlayerObservations: playerResidualObservations.length, excludedPlayerObservations: Object.values(exclusions).reduce((sum, count) => sum + count, 0), validTeamObservations: teamResidualObservations.filter(row => row.completeCoverage).length, exclusions, checksum: "" } };
  return deepFreeze({ ...base, diagnostics: { ...base.diagnostics, checksum: checksum(base) } });
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
