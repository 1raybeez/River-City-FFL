import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";

export const DURABLE_EVIDENCE_BUCKET_PREFIX = "river-city/season-simulator/evidence" as const;
export const DURABLE_EVIDENCE_SCHEMA = "river-city-durable-evidence-v1" as const;

export type DurableEvidenceRecord = Readonly<{ schemaVersion: typeof DURABLE_EVIDENCE_SCHEMA; season: number; week: number; kind: "PROJECTION" | "ACTUAL" | "RESIDUAL"; sourceChecksum: string; capturedAt: string; payload: unknown; recordChecksum: string }>;
export type ImmutableEvidenceStore = { read(path: string): Promise<DurableEvidenceRecord | null>; create(path: string, record: DurableEvidenceRecord): Promise<"CREATED" | "DUPLICATE"> };

export function durableEvidencePath(season: number, week: number, kind: DurableEvidenceRecord["kind"], sourceChecksum: string) { return `${DURABLE_EVIDENCE_BUCKET_PREFIX}/${season}/week-${String(week).padStart(2, "0")}/${kind.toLowerCase()}-${sourceChecksum}.json`; }

export function buildDurableEvidenceRecord(input: Omit<DurableEvidenceRecord, "schemaVersion" | "recordChecksum">): DurableEvidenceRecord {
  const base = { ...input, schemaVersion: DURABLE_EVIDENCE_SCHEMA } as Omit<DurableEvidenceRecord, "recordChecksum">;
  return { ...base, recordChecksum: checksum(base) };
}

export class MemoryImmutableEvidenceStore implements ImmutableEvidenceStore {
  private readonly records = new Map<string, DurableEvidenceRecord>();
  async read(path: string) { return this.records.get(path) ?? null; }
  async create(path: string, record: DurableEvidenceRecord) {
    const existing = this.records.get(path);
    if (existing) {
      if (existing.recordChecksum !== record.recordChecksum) throw new Error("Evidence checksum conflict.");
      return "DUPLICATE" as const;
    }
    this.records.set(path, record);
    return "CREATED" as const;
  }
}
