import fs from "node:fs/promises";
import path from "node:path";
import { buildDurableEvidenceRecord, CloudStorageImmutableEvidenceStore, durableEvidencePath, type DurableEvidenceRecord } from "../lib/seasonSimulator/durableEvidence";
import { checksum } from "../lib/seasonSimulator/evidenceSnapshot";

export type ImportOptions = { file: string; season: number; week: number; kind: DurableEvidenceRecord["kind"]; execute: boolean };

export function buildImportRecord(artifact: Record<string, unknown>, options: Pick<ImportOptions, "season" | "week" | "kind">) {
  if (artifact.season !== options.season || artifact.week !== options.week) throw new Error("REFUSED: artifact season/week does not match import target.");
  if (options.kind === "PROJECTION" && (artifact.capturePurpose !== "CALIBRATION_BASELINE" || artifact.capturedWithinApprovedWindow !== true)) throw new Error("REFUSED: only an authoritative projection baseline may be imported.");
  if (options.kind === "ACTUAL" && artifact.schemaVersion !== "river-city-actual-evidence-v1") throw new Error("REFUSED: artifact is not actual evidence.");
  const sourceChecksum = typeof artifact.checksum === "string" ? artifact.checksum : typeof artifact.actualInputChecksum === "string" ? artifact.actualInputChecksum : checksum(artifact);
  return buildDurableEvidenceRecord({ season: options.season, week: options.week, kind: options.kind, source: "migrated-from-authoritative-local-baseline", sourceChecksum, capturedAt: new Date().toISOString(), payload: artifact });
}

export async function importEvidence(options: ImportOptions) {
  const artifact = JSON.parse(await fs.readFile(path.resolve(options.file), "utf8")) as Record<string, unknown>;
  const record = buildImportRecord(artifact, options);
  const objectPath = durableEvidencePath(options.season, options.week, options.kind, record.sourceChecksum);
  if (!options.execute) return { objectPath, record, writePerformed: false as const };
  const result = await new CloudStorageImmutableEvidenceStore().create(objectPath, record);
  return { objectPath, record, result, writePerformed: result === "CREATED" };
}

if (process.argv[1]?.endsWith("import-season-simulator-evidence.ts")) {
  const args = process.argv.slice(2);
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const file = value("--file"); const season = Number(value("--season")); const week = Number(value("--week")); const kind = value("--kind") as ImportOptions["kind"];
  if (!file || !Number.isInteger(season) || !Number.isInteger(week) || !["PROJECTION", "ACTUAL", "RESIDUAL"].includes(kind)) throw new Error("Usage: npx tsx scripts/import-season-simulator-evidence.ts --file FILE --season 2026 --week N --kind PROJECTION [--execute]");
  importEvidence({ file, season, week, kind, execute: args.includes("--execute") }).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error instanceof Error ? error.message : "Evidence import refused"); process.exitCode = 1; });
}
