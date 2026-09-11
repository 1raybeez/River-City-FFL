import crypto from "node:crypto";
import type { ExpectedTeamScoreResult } from "./expectedTeamScore";
import type { NormalizedWeeklyProjection } from "./prerequisites";

export type ProjectionEvidenceSnapshot = { schemaVersion: "season-simulator-projection-evidence-v1"; adapterVersion: string; season: number; week: number; source: "FANTASYPROS"; sourceAsOf: string | null; scoringFormat: "HALF_PPR"; scoringSettingsChecksum: string; rosterEvidenceAsOf: string; normalizedProjectionCount: number; projectionChecksum: string; identityDiagnostics: unknown; teamResults: readonly ExpectedTeamScoreResult[]; unavailableTeamDiagnostics: readonly unknown[]; inputChecksum: string };

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function checksum(value: unknown): string {
  return crypto.createHash("sha256").update(stable(value)).digest("hex");
}

export function buildProjectionEvidenceSnapshot(input: Omit<ProjectionEvidenceSnapshot, "projectionChecksum" | "inputChecksum"> & { projections: readonly NormalizedWeeklyProjection[]; input: unknown }): ProjectionEvidenceSnapshot {
  const projectionChecksum = checksum(input.projections);
  const withoutInputChecksum = { ...input, projectionChecksum, projections: undefined, input: undefined };
  return { ...input, projectionChecksum, inputChecksum: checksum(withoutInputChecksum) };
}
