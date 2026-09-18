import { pairProjectionAndActualEvidence, type ActualEvidenceArtifact, type PairedResidualDataset, type ProjectionEvidenceArtifact } from "@/lib/seasonSimulator/evidenceCollection";
import { buildDurableEvidenceRecord, durableEvidencePath, type ImmutableEvidenceStore } from "@/lib/seasonSimulator/durableEvidence";

export type EvidencePairResult = Readonly<{ state: "PAIRED" | "NO_PAIR" | "INELIGIBLE_PATH_C" | "CONFLICT"; residual: PairedResidualDataset | null; reason: string | null }>;

export function pairWeeklyProjectionAndActual(projection: ProjectionEvidenceArtifact | null, actual: ActualEvidenceArtifact | null): EvidencePairResult {
  if (!actual) return { state: "NO_PAIR", residual: null, reason: "Final actual evidence is not available." };
  if (actual.calibrationEligibility === "INELIGIBLE_PATH_C") return { state: "INELIGIBLE_PATH_C", residual: null, reason: "PATH C actual evidence is historical-only." };
  if (!projection) return { state: "NO_PAIR", residual: null, reason: "No authoritative same-week projection baseline exists." };
  if (projection.season !== actual.season || projection.week !== actual.week) return { state: "CONFLICT", residual: null, reason: "Projection and actual evidence must be for the exact same season and week." };
  try {
    return { state: "PAIRED", residual: pairProjectionAndActualEvidence(projection, actual), reason: null };
  } catch (error) {
    return { state: "CONFLICT", residual: null, reason: error instanceof Error ? error.message : "Projection/actual pairing failed." };
  }
}

export async function persistResidualEvidence(store: ImmutableEvidenceStore, residual: PairedResidualDataset, capturedAt: string) {
  const record = buildDurableEvidenceRecord({ season: residual.season, week: residual.week, kind: "RESIDUAL", source: "RIVER_CITY_WEEKLY_RESIDUALS", sourceChecksum: residual.diagnostics.checksum, capturedAt, payload: residual });
  const path = durableEvidencePath(residual.season, residual.week, "RESIDUAL", residual.diagnostics.checksum);
  const result = await store.create(path, record);
  return { path, record, state: result === "CREATED" ? "CREATED" as const : "DUPLICATE" as const, writePerformed: result === "CREATED" };
}
