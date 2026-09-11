import crypto from "node:crypto";

export type VariancePosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
export type VarianceScope = VariancePosition | "LEAGUE";
export type ProjectionBucket = "0-5" | "5-10" | "10-15" | "15-20" | "20+";

export type ResidualInput = {
  season: number;
  week: number;
  playerId: string;
  position: VarianceScope;
  projectedPoints: number | null;
  actualPoints: number | null;
  actualFinal: boolean;
  availabilityStatus: string | null;
  projectionSource: string;
  providerVersion: string | null;
};

export type ProjectionResidualObservation = ResidualInput & {
  projectedPoints: number;
  actualPoints: number;
  projectionBucket: ProjectionBucket;
  residual: number;
  absoluteResidual: number;
  squaredResidual: number;
};

export type VarianceModel = {
  modelVersion: string;
  source: string;
  evidenceAsOf: string | null;
  sampleCount: number;
  method: "EMPIRICAL_RESIDUAL_BOOTSTRAP";
  position: VarianceScope;
  projectionBucket: ProjectionBucket | null;
  meanResidual: number;
  stdDev: number;
  mad: number;
  lowerBound: number;
  upperBound: number;
  residuals: readonly number[];
  diagnostics: { minimumSampleCount: number; checksum: string };
};

export type VarianceFallbackPolicy = {
  minimumBucketSampleCount: number;
  minimumPositionSampleCount: number;
  minimumLeagueSampleCount: number;
};

export function projectionBucket(projectedPoints: number): ProjectionBucket {
  if (projectedPoints < 5) return "0-5";
  if (projectedPoints < 10) return "5-10";
  if (projectedPoints < 15) return "10-15";
  if (projectedPoints < 20) return "15-20";
  return "20+";
}

export function calculateResidualObservation(input: ResidualInput): ProjectionResidualObservation | null {
  if (!input.actualFinal || !input.playerId.trim()) return null;
  if (input.projectedPoints === null || input.actualPoints === null) return null;
  if (!Number.isFinite(input.projectedPoints) || !Number.isFinite(input.actualPoints)) return null;
  const residual = input.actualPoints - input.projectedPoints;
  return { ...input, projectedPoints: input.projectedPoints, actualPoints: input.actualPoints, projectionBucket: projectionBucket(input.projectedPoints), residual, absoluteResidual: Math.abs(residual), squaredResidual: residual ** 2 };
}

export function buildVarianceModel(
  observations: readonly ProjectionResidualObservation[],
  position: VarianceScope,
  projectionBucketValue: ProjectionBucket | null,
  minimumSampleCount: number,
  source = "RIVER_CITY_WEEKLY_RESIDUALS",
  evidenceAsOf: string | null = null,
): VarianceModel | null {
  const selected = observations.filter(observation => (position === "LEAGUE" || observation.position === position) && (projectionBucketValue === null || observation.projectionBucket === projectionBucketValue));
  if (minimumSampleCount < 1 || selected.length < minimumSampleCount) return null;
  const residuals = selected.map(observation => observation.residual);
  const meanResidual = residuals.reduce((sum, residual) => sum + residual, 0) / residuals.length;
  const variance = residuals.reduce((sum, residual) => sum + (residual - meanResidual) ** 2, 0) / residuals.length;
  const sorted = [...residuals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = sorted.map(residual => Math.abs(residual - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  const modelWithoutChecksum = { modelVersion: "river-city-variance-v1", source, evidenceAsOf, sampleCount: selected.length, method: "EMPIRICAL_RESIDUAL_BOOTSTRAP" as const, position, projectionBucket: projectionBucketValue, meanResidual, stdDev: Math.sqrt(variance), mad, lowerBound: sorted[0], upperBound: sorted[sorted.length - 1], residuals, diagnostics: { minimumSampleCount, checksum: "" } };
  return { ...modelWithoutChecksum, diagnostics: { ...modelWithoutChecksum.diagnostics, checksum: varianceChecksum(modelWithoutChecksum) } };
}

export function chooseVarianceModel(
  observations: readonly ProjectionResidualObservation[],
  position: VariancePosition,
  projectionBucketValue: ProjectionBucket,
  policy: VarianceFallbackPolicy,
): VarianceModel | null {
  return buildVarianceModel(observations, position, projectionBucketValue, policy.minimumBucketSampleCount)
    ?? buildVarianceModel(observations, position, null, policy.minimumPositionSampleCount)
    ?? buildVarianceModel(observations, "LEAGUE", null, policy.minimumLeagueSampleCount);
}

export function sampleSimulatedPoints(projectedPoints: number, position: VariancePosition, model: VarianceModel | null, seed: string, drawIndex = 0): number | null {
  if (!model || !Number.isFinite(projectedPoints) || model.residuals.length === 0) return null;
  const random = seededRandom(`${seed}:${drawIndex}:${model.diagnostics.checksum}`);
  const residual = model.residuals[Math.floor(random * model.residuals.length)];
  const result = projectedPoints + residual;
  if (!Number.isFinite(result)) return null;
  return position === "DEF" ? result : Math.max(0, result);
}

function seededRandom(seed: string): number {
  const digest = crypto.createHash("sha256").update(seed).digest();
  let state = digest.readUInt32BE(0) || 1;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 0x100000000;
}

function varianceChecksum(value: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(value, (_key, entry) => entry && typeof entry === "object" && !Array.isArray(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry)).digest("hex");
}
