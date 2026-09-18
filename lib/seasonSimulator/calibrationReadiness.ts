import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import type { PairedResidualDataset } from "@/lib/seasonSimulator/evidenceCollection";

export const CALIBRATION_READINESS_SCHEMA = "river-city-calibration-readiness-v1" as const;
export type CalibrationReadinessStatus = "CALIBRATING" | "SHADOW_READY" | "PRODUCTION_READY";
export type CalibrationReadiness = Readonly<{ schemaVersion: typeof CALIBRATION_READINESS_SCHEMA; status: CalibrationReadinessStatus; eligibleResidualWeeks: readonly number[]; sampleCounts: Readonly<{ player: number; team: number }>; positionCoverage: Readonly<Record<string, number>>; bucketCoverage: Readonly<Record<string, number>>; modelEligible: boolean; predictorReadiness: CalibrationReadinessStatus; generatedAt: string; inputEvidenceChecksums: readonly string[]; checksum: string }>;
export type CalibrationReadinessStore = { read(key: string): Promise<CalibrationReadiness | null>; create(key: string, value: CalibrationReadiness): Promise<"CREATED" | "DUPLICATE"> };

export const APPROVED_CALIBRATION_THRESHOLDS = { minimumPlayerSamples: 50, minimumTeamSamples: 12 } as const;

export function buildCalibrationReadiness(residuals: readonly PairedResidualDataset[], generatedAt: string): CalibrationReadiness {
  const eligible = residuals.filter(dataset => dataset.playerResidualObservations.length > 0 && dataset.teamResidualObservations.some(row => row.completeCoverage));
  const player = eligible.reduce((sum, dataset) => sum + dataset.diagnostics.validPlayerObservations, 0);
  const team = eligible.reduce((sum, dataset) => sum + dataset.diagnostics.validTeamObservations, 0);
  const positionCoverage: Record<string, number> = {};
  const bucketCoverage: Record<string, number> = {};
  for (const dataset of eligible) for (const observation of dataset.playerResidualObservations) { positionCoverage[observation.position] = (positionCoverage[observation.position] ?? 0) + 1; bucketCoverage[observation.projectionBucket] = (bucketCoverage[observation.projectionBucket] ?? 0) + 1; }
  const modelEligible = player >= APPROVED_CALIBRATION_THRESHOLDS.minimumPlayerSamples && team >= APPROVED_CALIBRATION_THRESHOLDS.minimumTeamSamples;
  const status: CalibrationReadinessStatus = modelEligible ? "SHADOW_READY" : "CALIBRATING";
  const base = { schemaVersion: CALIBRATION_READINESS_SCHEMA, status, eligibleResidualWeeks: eligible.map(dataset => dataset.week).sort((a, b) => a - b), sampleCounts: { player, team }, positionCoverage, bucketCoverage, modelEligible, predictorReadiness: status, generatedAt, inputEvidenceChecksums: eligible.flatMap(dataset => [dataset.projectionChecksum, dataset.actualChecksum]).sort() };
  return { ...base, checksum: checksum(base) };
}

export class MemoryCalibrationReadinessStore implements CalibrationReadinessStore {
  private readonly values = new Map<string, CalibrationReadiness>();
  async read(key: string) { return this.values.get(key) ?? null; }
  async create(key: string, value: CalibrationReadiness) { const existing = this.values.get(key); if (existing) { if (existing.checksum !== value.checksum) throw new Error("Calibration readiness conflict."); return "DUPLICATE" as const; } this.values.set(key, value); return "CREATED" as const; }
}

export class CloudStorageCalibrationReadinessStore implements CalibrationReadinessStore {
  async read(key: string) { const { getFirebaseStorageBucket } = await import("@/lib/firebaseAdmin"); const file = getFirebaseStorageBucket().file(key); const [exists] = await file.exists(); if (!exists) return null; return JSON.parse((await file.download())[0].toString("utf8")) as CalibrationReadiness; }
  async create(key: string, value: CalibrationReadiness) { const { getFirebaseStorageBucket } = await import("@/lib/firebaseAdmin"); const file = getFirebaseStorageBucket().file(key); try { await file.save(JSON.stringify(value), { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: "application/json", metadata: { schemaVersion: value.schemaVersion, checksum: value.checksum } } }); return "CREATED" as const; } catch { const existing = await this.read(key); if (existing?.checksum === value.checksum) return "DUPLICATE" as const; throw new Error("Calibration readiness conflict."); } }
}
