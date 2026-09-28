import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";

export const DURABLE_EVIDENCE_BUCKET_PREFIX = "river-city/season-simulator/evidence" as const;
export const DURABLE_EVIDENCE_SCHEMA = "river-city-durable-evidence-v1" as const;

export type DurableEvidenceRecord = Readonly<{ schemaVersion: typeof DURABLE_EVIDENCE_SCHEMA; season: number; week: number; kind: "PROJECTION" | "ACTUAL" | "RESIDUAL"; source: string; sourceChecksum: string; capturedAt: string; payload: unknown; recordChecksum: string }>;
export type ImmutableEvidenceStore = { read(path: string): Promise<DurableEvidenceRecord | null>; create(path: string, record: DurableEvidenceRecord): Promise<"CREATED" | "DUPLICATE"> };

const VOLATILE_EVIDENCE_KEYS = new Set([
  "capturedAt",
  "generatedAt",
  "processedAt",
  "runtimeTimestamp",
  "runtimeAt",
  "invocationId",
  "invocationID",
  "schedulerInvocationId",
  "schedulerInvocationID",
  "schedulerId",
  "schedulerID",
  "startedAt",
  "completedAt",
]);

function canonicalEvidenceValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalEvidenceValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !VOLATILE_EVIDENCE_KEYS.has(key))
      .map(([key, entry]) => [key, canonicalEvidenceValue(entry)]),
  );
}

/** Fingerprint substantive evidence while retaining audit metadata in storage. */
export function canonicalEvidenceFingerprint(record: Omit<DurableEvidenceRecord, "recordChecksum">): string {
  return checksum({
    schemaVersion: record.schemaVersion,
    season: record.season,
    week: record.week,
    kind: record.kind,
    source: record.source,
    sourceChecksum: record.sourceChecksum,
    payload: canonicalEvidenceValue(record.payload),
  });
}

export function durableEvidencePath(season: number, week: number, kind: DurableEvidenceRecord["kind"], sourceChecksum: string) { return `${DURABLE_EVIDENCE_BUCKET_PREFIX}/${season}/week-${String(week).padStart(2, "0")}/${kind.toLowerCase()}-${sourceChecksum}.json`; }

export function buildDurableEvidenceRecord(input: Omit<DurableEvidenceRecord, "schemaVersion" | "recordChecksum">): DurableEvidenceRecord {
  const base = { ...input, schemaVersion: DURABLE_EVIDENCE_SCHEMA } as Omit<DurableEvidenceRecord, "recordChecksum">;
  return { ...base, recordChecksum: canonicalEvidenceFingerprint(base) };
}

export class MemoryImmutableEvidenceStore implements ImmutableEvidenceStore {
  private readonly records = new Map<string, DurableEvidenceRecord>();
  async read(path: string) { return this.records.get(path) ?? null; }
  async create(path: string, record: DurableEvidenceRecord) {
    const existing = this.records.get(path);
    if (existing) {
      if (canonicalEvidenceFingerprint(existing) !== canonicalEvidenceFingerprint(record)) throw new Error("Evidence checksum conflict.");
      return "DUPLICATE" as const;
    }
    this.records.set(path, record);
    return "CREATED" as const;
  }
}

export class CloudStorageImmutableEvidenceStore implements ImmutableEvidenceStore {
  async getFiles(options: { prefix: string }) {
    const { getFirebaseStorageBucket } = await import("@/lib/firebaseAdmin");
    return getFirebaseStorageBucket().getFiles(options);
  }

  async read(path: string) {
    const { getFirebaseStorageBucket } = await import("@/lib/firebaseAdmin");
    const file = getFirebaseStorageBucket().file(path);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [bytes] = await file.download();
    const record = JSON.parse(bytes.toString("utf8")) as DurableEvidenceRecord;
    validateDurableEvidenceRecord(record);
    return record;
  }

  async create(path: string, record: DurableEvidenceRecord) {
    validateDurableEvidenceRecord(record);
    const { getFirebaseStorageBucket } = await import("@/lib/firebaseAdmin");
    const file = getFirebaseStorageBucket().file(path);
    try {
      await file.save(JSON.stringify(record), {
        resumable: false,
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: { contentType: "application/json", metadata: { season: String(record.season), week: String(record.week), kind: record.kind, checksum: record.sourceChecksum, schemaVersion: record.schemaVersion, source: record.source } },
      });
      const stored = await this.read(path);
      if (!stored || stored.recordChecksum !== record.recordChecksum) throw new Error("Durable evidence readback checksum mismatch.");
      return "CREATED" as const;
    } catch (error) {
      const existing = await this.read(path);
      if (existing && canonicalEvidenceFingerprint(existing) === canonicalEvidenceFingerprint(record)) return "DUPLICATE" as const;
      if (existing) throw new Error("Evidence checksum conflict.");
      throw error;
    }
  }
}

export async function listDurableEvidence(store: { getFiles(options: { prefix: string }): Promise<[Array<{ name: string }>, ...unknown[]]> }, season: number, week: number, kind?: DurableEvidenceRecord["kind"]) {
  const prefix = `${DURABLE_EVIDENCE_BUCKET_PREFIX}/${season}/week-${String(week).padStart(2, "0")}/${kind ? `${kind.toLowerCase()}-` : ""}`;
  const [files] = await store.getFiles({ prefix });
  return files.map(file => file.name).filter(name => name.endsWith(".json"));
}

export function validateDurableEvidenceRecord(record: DurableEvidenceRecord) {
  const base = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "recordChecksum"));
  const legacyChecksum = checksum(base);
  const canonicalChecksum = canonicalEvidenceFingerprint(base as Omit<DurableEvidenceRecord, "recordChecksum">);
  if (record.schemaVersion !== DURABLE_EVIDENCE_SCHEMA || ![legacyChecksum, canonicalChecksum].includes(record.recordChecksum)) throw new Error("Durable evidence checksum validation failed.");
  return record;
}
