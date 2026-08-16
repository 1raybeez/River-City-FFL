import { createHash } from "node:crypto";

import { firestore, getFirebaseStorageBucket } from "../firebaseAdmin";
import type { AuctionAccessSession } from "../auth/auctionAccess";
import {
  getAuctionValueSourceRegistryEntry,
  getProductionAuctionValueSourceRegistryEntries,
  type AuctionValueSourceRegistryEntry,
  type AuctionValueSourceRegistryId,
} from "./valueSourceRegistry";
import {
  generateMasterviewFromSourceValueFiles,
  type GeneratedMasterviewFile,
  type SourceValueFileWithPath,
} from "../../scripts/auction-generate-masterview-from-sources";
import { importAuctionSourceExportText } from "../../scripts/auction-import-source-export";
import { buildAuctionConsensusMarkdownReport } from "../../scripts/auction-consensus-quality-report";
import type { AuctionSeasonYear } from "./types";
import type { AuctionSourceValueRow } from "./valueSources";
import type {
  AuctionValueGeneratedChunk,
  AuctionValueQualityGate,
  AuctionValueRefreshRunSummary,
  AuctionValueRefreshStatus,
  AuctionValueSourceSummary,
  AuctionValueStatusResponse,
  AuctionSourceUnmatchedReview,
  AuctionUnmatchedPlayerReason,
} from "./valueRefreshTypes";

const RUNS_COLLECTION = "auction_value_refresh_runs";
const CONFIG_COLLECTION = "auction_value_config";
const AUDIT_COLLECTION = "auction_value_audit";
const TEST_RUNS_COLLECTION = "test_auction_value_refresh_runs";
const TEST_CONFIG_COLLECTION = "test_auction_value_config";
const TEST_AUDIT_COLLECTION = "test_auction_value_audit";
const STORAGE_IMPORT_PREFIX = "auction-value-imports";
const TEST_STORAGE_IMPORT_PREFIX = "test-auction-value-imports";
const SOURCE_CHUNK_SIZE = 250;
const MASTERVIEW_CHUNK_SIZE = 200;
const DEFAULT_SEASON = 2026;
const DEFAULT_REQUIRED_SOURCES: AuctionValueSourceRegistryId[] = [
  "fantasypros",
  "rotowire",
  "lineupexperts",
  "draftsharks",
  "fantasyfootballers",
];

type RunDocument = {
  runId: string;
  season: number;
  status: AuctionValueRefreshStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
  previousRunId: string | null;
  sourceKeys: string[];
  includedSourceKeys: string[];
  excludedSourceKeys: string[];
  requiredSourceKeys: string[];
  generatedSummary: {
    playerCount: number | null;
    sourceValueCount: number | null;
    skippedSourceValueCount: number | null;
    warningLabelCount: number | null;
  };
  qualityGateStatus: "pass" | "fail" | "pending";
  qualityGates: AuctionValueQualityGate[];
  qualityReportPreview: string | null;
  failureMessage: string | null;
};

type SourceDocument = AuctionValueSourceSummary & {
  uploadedAt: string | null;
  uploadedBy: string | null;
};

type ConfigDocument = {
  season: number;
  activeRunId: string | null;
  previousRunId: string | null;
  updatedAt: string;
  updatedBy: string;
  sourceKeys: string[];
  status: string;
};

type UnmatchedReviewDocument = {
  runId: string;
  season: number;
  generatedAt: string;
  sources: AuctionSourceUnmatchedReview[];
};

function nowIso() {
  return new Date().toISOString();
}

function getActorEmail(actor: AuctionAccessSession) {
  return actor.email;
}

function getActorUid(actor: AuctionAccessSession) {
  return actor.decodedToken.uid ?? null;
}

function getRequiredSourceKeys(): AuctionValueSourceRegistryId[] {
  const configured = process.env.AUCTION_REFRESH_REQUIRED_SOURCES?.split(",")
    .map((source) => source.trim() as AuctionValueSourceRegistryId)
    .filter(Boolean);

  return configured && configured.length > 0 ? configured : DEFAULT_REQUIRED_SOURCES;
}

function isAuctionValueTestMode() {
  return process.env.AUCTION_VALUE_TEST_MODE === "true";
}

function isFirebaseEmulatorMode() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function getRunsCollectionName() {
  return isAuctionValueTestMode() ? TEST_RUNS_COLLECTION : RUNS_COLLECTION;
}

function getConfigCollectionName() {
  return isAuctionValueTestMode() ? TEST_CONFIG_COLLECTION : CONFIG_COLLECTION;
}

function getAuditCollectionName() {
  return isAuctionValueTestMode() ? TEST_AUDIT_COLLECTION : AUDIT_COLLECTION;
}

function getStorageImportPrefix() {
  return isAuctionValueTestMode()
    ? TEST_STORAGE_IMPORT_PREFIX
    : STORAGE_IMPORT_PREFIX;
}

export function getAuctionValueRefreshRuntimePaths() {
  return {
    testMode: isAuctionValueTestMode(),
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
    storageEmulatorHost:
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??
      process.env.STORAGE_EMULATOR_HOST ??
      null,
    runsCollection: getRunsCollectionName(),
    configCollection: getConfigCollectionName(),
    auditCollection: getAuditCollectionName(),
    storagePrefix: getStorageImportPrefix(),
  };
}

function normalizeRequiredSourceKeys(
  requiredSourceKeys: AuctionValueSourceRegistryId[] | undefined
) {
  if (!requiredSourceKeys) return getRequiredSourceKeys();
  if (!isAuctionValueTestMode() && !isFirebaseEmulatorMode()) {
    throw new Error(
      "Custom required sources are only allowed in test mode or the Firebase emulator."
    );
  }

  const allowedIds = new Set(
    getProductionAuctionValueSourceRegistryEntries().map((entry) => entry.id)
  );
  const uniqueSourceKeys = Array.from(new Set(requiredSourceKeys));
  const unsupportedSource = uniqueSourceKeys.find(
    (sourceKey) => !allowedIds.has(sourceKey)
  );
  if (unsupportedSource) {
    throw new Error(`Unsupported required test source: ${unsupportedSource}.`);
  }

  return uniqueSourceKeys;
}

function getAllowedSourceEntries() {
  const required = getRequiredSourceKeys();
  const entries = getProductionAuctionValueSourceRegistryEntries();

  return required
    .map((sourceKey) => entries.find((entry) => entry.id === sourceKey))
    .filter((entry): entry is AuctionValueSourceRegistryEntry => Boolean(entry));
}

function getConfiguredSourceEntry(sourceKey: string) {
  const entry = getAuctionValueSourceRegistryEntry(
    sourceKey as AuctionValueSourceRegistryId
  );

  return entry && getRequiredSourceKeys().includes(entry.id) ? entry : null;
}

function runRef(runId: string) {
  return firestore.collection(getRunsCollectionName()).doc(runId);
}

function configRef(season: number) {
  return firestore.collection(getConfigCollectionName()).doc(String(season));
}

function auditRef() {
  return firestore.collection(getAuditCollectionName()).doc();
}

function sourceRef(runId: string, sourceKey: string) {
  return runRef(runId).collection("sources").doc(sourceKey);
}

function unmatchedReviewRef(runId: string) {
  return runRef(runId).collection("quality").doc("unmatched");
}

function hashBuffer(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function storagePathForSource({
  season,
  runId,
  sourceKey,
}: {
  season: number;
  runId: string;
  sourceKey: string;
}) {
  return `${getStorageImportPrefix()}/${season}/${runId}/raw/${sourceKey}.csv`;
}

function toRunSummary(run: RunDocument): AuctionValueRefreshRunSummary {
  return {
    runId: run.runId,
    season: run.season,
    status: run.status,
    createdAt: run.createdAt,
    createdBy: run.createdBy,
    updatedAt: run.updatedAt,
    publishedAt: run.publishedAt,
    sourceKeys: run.sourceKeys ?? [],
    includedSourceKeys: run.includedSourceKeys ?? [],
    excludedSourceKeys: run.excludedSourceKeys ?? [],
    sourceCount: run.includedSourceKeys?.length ?? 0,
    generatedPlayerCount: run.generatedSummary?.playerCount ?? null,
    sourceValueCount: run.generatedSummary?.sourceValueCount ?? null,
    skippedSourceValueCount: run.generatedSummary?.skippedSourceValueCount ?? null,
    warningLabelCount: run.generatedSummary?.warningLabelCount ?? null,
    qualityGateStatus: run.qualityGateStatus ?? "pending",
    qualityGates: run.qualityGates ?? [],
  };
}

function emptySourceSummary({
  entry,
  season,
}: {
  entry: AuctionValueSourceRegistryEntry;
  season: number;
}): AuctionValueSourceSummary {
  return {
    sourceKey: entry.id,
    displayName: entry.displayName,
    season,
    enabled: true,
    importedAt: null,
    rowCount: null,
    matchedCount: null,
    unmatchedCount: null,
    warningCount: null,
    errorCount: null,
    parserVersion: null,
    fileName: null,
    fileHash: null,
    storagePath: null,
    status: "empty",
    unmatchedPlayers: null,
    unmatchedDetailsStored: false,
  };
}

function sourceDocToSummary(
  source: Partial<SourceDocument>,
  entry: AuctionValueSourceRegistryEntry,
  season: number
): AuctionValueSourceSummary {
  return {
    ...emptySourceSummary({ entry, season }),
    ...source,
    sourceKey: entry.id,
    displayName: entry.displayName,
    season,
  };
}

async function writeAudit({
  actor,
  season,
  runId,
  action,
  result,
  sourceKey = null,
}: {
  actor: AuctionAccessSession;
  season: number;
  runId: string | null;
  action: string;
  result: string;
  sourceKey?: string | null;
}) {
  const createdAt = nowIso();

  await auditRef().set({
    actorEmail: getActorEmail(actor),
    actorUid: getActorUid(actor),
    timestamp: createdAt,
    season,
    runId,
    action,
    result,
    sourceKey,
  });
}

async function readRun(runId: string) {
  const snapshot = await runRef(runId).get();
  if (!snapshot.exists) return null;
  return snapshot.data() as RunDocument;
}

async function readRunSummary(runId: string | null | undefined) {
  if (!runId) return null;
  const run = await readRun(runId);
  return run ? toRunSummary(run) : null;
}

async function readSourceSummaries(runId: string | null, season: number) {
  const entries = getAllowedSourceEntries();
  if (!runId) {
    return entries.map((entry) => emptySourceSummary({ entry, season }));
  }

  const [sourceSnapshots, unmatchedReviewSnapshot] = await Promise.all([
    Promise.all(entries.map((entry) => sourceRef(runId, entry.id).get())),
    unmatchedReviewRef(runId).get(),
  ]);
  const unmatchedReviewsBySource = new Map(
    unmatchedReviewSnapshot.exists
      ? ((unmatchedReviewSnapshot.data() as UnmatchedReviewDocument).sources ?? []).map(
          (review) => [review.sourceKey, review]
        )
      : []
  );

  return entries.map((entry, index) => {
    const summary = sourceDocToSummary(
      sourceSnapshots[index].exists
        ? (sourceSnapshots[index].data() as Partial<SourceDocument>)
        : {},
      entry,
      season
    );
    const review = unmatchedReviewsBySource.get(summary.sourceKey);

    return {
      ...summary,
      unmatchedPlayers: review?.unmatchedPlayers ?? null,
      unmatchedDetailsStored: Boolean(review),
    };
  });
}

function getValueUnmatchedReason(
  row: AuctionSourceValueRow
): AuctionUnmatchedPlayerReason {
  if (row.errors.some((issue) => issue.code === "missing-position")) {
    return "missing-position";
  }
  if (row.matchStatus === "ambiguous") return "ambiguous-name-position";
  if (row.warnings.some((issue) => issue.code.includes("team"))) {
    return "invalid-team";
  }
  if (row.matchStatus === "unmatched") return "no-sleeper-match";

  return "other-safe-reason";
}

function buildValueUnmatchedReview(
  sourceFile: SourceValueFileWithPath
): AuctionSourceUnmatchedReview {
  const unmatchedPlayers = sourceFile.rows
    .filter((row) => row.matchStatus === "unmatched")
    .map((row) => ({
      sourceKey: row.sourceKey,
      playerName: row.playerNameFromSource,
      position: row.position,
      nflTeam: row.nflTeam,
      reason: getValueUnmatchedReason(row),
    }));

  return {
    sourceKey: sourceFile.sourceKey,
    unmatchedCount: sourceFile.unmatchedRowCount,
    unmatchedPlayers,
  };
}

export async function createAuctionValueRefreshRun({
  season = DEFAULT_SEASON,
  actor,
  requiredSourceKeys,
}: {
  season?: number;
  actor: AuctionAccessSession;
  requiredSourceKeys?: AuctionValueSourceRegistryId[];
}) {
  const createdAt = nowIso();
  const runId = `auction-values-${season}-${createdAt.replace(/[:.]/g, "-")}`;
  const activeConfig = (await configRef(season).get()).data() as
    | ConfigDocument
    | undefined;
  const sourceKeys = normalizeRequiredSourceKeys(requiredSourceKeys);
  const run: RunDocument = {
    runId,
    season,
    status: "uploaded",
    createdAt,
    createdBy: getActorEmail(actor),
    updatedAt: createdAt,
    publishedAt: null,
    publishedBy: null,
    previousRunId: activeConfig?.activeRunId ?? null,
    sourceKeys: [],
    includedSourceKeys: [],
    excludedSourceKeys: sourceKeys,
    requiredSourceKeys: sourceKeys,
    generatedSummary: {
      playerCount: null,
      sourceValueCount: null,
      skippedSourceValueCount: null,
      warningLabelCount: null,
    },
    qualityGateStatus: "pending",
    qualityGates: [],
    qualityReportPreview: null,
    failureMessage: null,
  };

  await runRef(runId).set(run);
  await writeAudit({
    actor,
    season,
    runId,
    action: "run-created",
    result: "Created auction value refresh run.",
  });

  return toRunSummary(run);
}

export async function uploadAuctionValueSource({
  runId,
  sourceKey,
  fileName,
  fileBuffer,
  actor,
}: {
  runId: string;
  sourceKey: string;
  fileName: string;
  fileBuffer: Buffer;
  actor: AuctionAccessSession;
}) {
  const run = await readRun(runId);
  const sourceEntry = getConfiguredSourceEntry(sourceKey);
  if (!run) throw new Error("Refresh run not found.");
  if (!sourceEntry) throw new Error("Unsupported auction value source.");
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published runs cannot be modified.");
  }

  const fileHash = hashBuffer(fileBuffer);
  const storagePath = storagePathForSource({
    season: run.season,
    runId,
    sourceKey,
  });
  const uploadedAt = nowIso();
  const bucket = getFirebaseStorageBucket();

  await bucket.file(storagePath).save(fileBuffer, {
    contentType: "text/csv",
    resumable: false,
    metadata: {
      metadata: {
        season: String(run.season),
        sourceKey,
        runId,
        uploadedBy: getActorEmail(actor),
        uploadedAt,
        originalFilename: fileName,
        fileHash,
      },
    },
  });

  const sourceDoc: SourceDocument = {
    sourceKey: sourceEntry.id,
    displayName: sourceEntry.displayName,
    season: run.season,
    enabled: true,
    importedAt: null,
    rowCount: null,
    matchedCount: null,
    unmatchedCount: null,
    warningCount: null,
    errorCount: null,
    parserVersion: null,
    fileName,
    fileHash,
    storagePath,
    status: "uploaded",
    uploadedAt,
    uploadedBy: getActorEmail(actor),
  };
  const sourceKeys = Array.from(new Set([...run.sourceKeys, sourceEntry.id]));
  const required = run.requiredSourceKeys ?? getRequiredSourceKeys();

  await Promise.all([
    sourceRef(runId, sourceEntry.id).set(sourceDoc),
    runRef(runId).set(
      {
        status: "uploaded",
        updatedAt: uploadedAt,
        sourceKeys,
        includedSourceKeys: sourceKeys,
        excludedSourceKeys: required.filter((key) => !sourceKeys.includes(key)),
        qualityGateStatus: "pending",
        qualityGates: [],
      },
      { merge: true }
    ),
  ]);
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "source-uploaded",
    result: `Uploaded ${sourceEntry.displayName}.`,
    sourceKey: sourceEntry.id,
  });

  return sourceDocToSummary(sourceDoc, sourceEntry, run.season);
}

export async function removeAuctionValueSource({
  runId,
  sourceKey,
  actor,
}: {
  runId: string;
  sourceKey: string;
  actor: AuctionAccessSession;
}) {
  const run = await readRun(runId);
  const sourceEntry = getConfiguredSourceEntry(sourceKey);
  if (!run) throw new Error("Refresh run not found.");
  if (!sourceEntry) throw new Error("Unsupported auction value source.");
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published runs cannot be modified.");
  }

  const sourceSnapshot = await sourceRef(runId, sourceKey).get();
  const source = sourceSnapshot.data() as SourceDocument | undefined;
  if (source?.storagePath) {
    try {
      await getFirebaseStorageBucket().file(source.storagePath).delete();
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? (error as { code?: unknown }).code
          : null;
      if (code !== 404) {
        throw error;
      }
    }
  }

  const sourceKeys = run.sourceKeys.filter((key) => key !== sourceKey);
  const required = run.requiredSourceKeys ?? getRequiredSourceKeys();

  await Promise.all([
    sourceRef(runId, sourceKey).delete(),
    runRef(runId).set(
      {
        updatedAt: nowIso(),
        sourceKeys,
        includedSourceKeys: sourceKeys,
        excludedSourceKeys: required.filter((key) => !sourceKeys.includes(key)),
      },
      { merge: true }
    ),
  ]);
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "source-removed",
    result: `Removed ${sourceEntry.displayName} from pending run.`,
    sourceKey: sourceEntry.id,
  });
}

function chunkRows<T>(rows: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function writeChunkCollection<T>({
  runId,
  collection,
  rows,
  size,
  season,
}: {
  runId: string;
  collection: string;
  rows: readonly T[];
  size: number;
  season: number;
}) {
  const collectionRef = runRef(runId).collection(collection);
  const existingChunks = await collectionRef.get();
  for (let index = 0; index < existingChunks.docs.length; index += 450) {
    const batch = firestore.batch();
    existingChunks.docs.slice(index, index + 450).forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  const chunks = chunkRows(rows, size);
  if (chunks.length === 0) return;

  const batch = firestore.batch();
  const createdAt = nowIso();

  chunks.forEach((chunk, index) => {
    const chunkId = `${String(index).padStart(4, "0")}`;
    batch.set(collectionRef.doc(chunkId), {
      chunkId,
      runId,
      season,
      offset: index * size,
      count: chunk.length,
      rows: chunk,
      createdAt,
    });
  });

  await batch.commit();
}

function buildQualityGates({
  run,
  requiredSourceKeys,
  sourceFiles,
  masterview,
  activeRun,
}: {
  run: RunDocument;
  requiredSourceKeys: readonly string[];
  sourceFiles: readonly SourceValueFileWithPath[];
  masterview: GeneratedMasterviewFile | null;
  activeRun: AuctionValueRefreshRunSummary | null;
}) {
  const gates: AuctionValueQualityGate[] = [];
  const uploadedSourceKeys = sourceFiles.map((file) => file.sourceKey);
  const missingRequiredSources = requiredSourceKeys.filter(
    (sourceKey) => !uploadedSourceKeys.includes(sourceKey)
  );

  if (missingRequiredSources.length > 0) {
    gates.push({
      id: "missing-required-sources",
      level: "fail",
      label: "Missing required source",
      detail: `Missing: ${missingRequiredSources.join(", ")}.`,
    });
  }

  for (const sourceFile of sourceFiles) {
    const sourceName = sourceFile.sources[0]?.sourceName ?? sourceFile.sourceKey;
    if (sourceFile.errorCount > 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-import-errors`,
        level: "fail",
        label: `${sourceName} import errors`,
        detail: `${sourceFile.errorCount} parser/import error(s).`,
      });
    }
    if (sourceFile.rowCount <= 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-zero-rows`,
        level: "fail",
        label: `${sourceName} zero rows`,
        detail: "Uploaded source normalized to zero rows.",
      });
    }
    if (sourceFile.matchedRowCount <= 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-zero-matches`,
        level: "fail",
        label: `${sourceName} zero matched rows`,
        detail: "Uploaded source produced no matched Sleeper rows.",
      });
    }
    const highValueUnmatched = sourceFile.rows.filter(
      (row) =>
        row.matchStatus === "unmatched" &&
        typeof row.normalizedAuctionValue === "number" &&
        row.normalizedAuctionValue >=
          Number(process.env.AUCTION_REFRESH_FAIL_UNMATCHED_VALUE_THRESHOLD ?? 10)
    );
    if (highValueUnmatched.length > 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-high-value-unmatched`,
        level: "fail",
        label: `${sourceName} high-value unmatched players`,
        detail: `${highValueUnmatched.length} unmatched row(s) at or above the fail threshold.`,
      });
    }
  }

  if (!masterview || masterview.rowCount <= 0 || masterview.rows.length <= 0) {
    gates.push({
      id: "empty-masterview",
      level: "fail",
      label: "Empty generated Masterview",
      detail: "Consensus output produced no players.",
    });
  }

  if (masterview) {
    const seenPlayerIds = new Set<string>();
    const duplicatePlayerIds = new Set<string>();
    for (const row of masterview.rows) {
      if (row.sleeperPlayerId) {
        if (seenPlayerIds.has(row.sleeperPlayerId)) {
          duplicatePlayerIds.add(row.sleeperPlayerId);
        }
        seenPlayerIds.add(row.sleeperPlayerId);
      }
      const values = [row.lowValue, row.highValue, row.averageValue, row.medianValue];
      if (values.some((value) => !Number.isFinite(value) || value < 0)) {
        gates.push({
          id: `invalid-value-${row.playerName}`,
          level: "fail",
          label: "Invalid generated value",
          detail: `${row.playerName} has a non-finite or negative value.`,
        });
      }
    }

    if (duplicatePlayerIds.size > 0) {
      gates.push({
        id: "duplicate-player-ids",
        level: "fail",
        label: "Duplicate generated player IDs",
        detail: `${duplicatePlayerIds.size} duplicate Sleeper ID(s).`,
      });
    }

    if (
      activeRun?.generatedPlayerCount &&
      masterview.rowCount < activeRun.generatedPlayerCount * 0.8
    ) {
      gates.push({
        id: "player-coverage-collapse",
        level: "fail",
        label: "Major player coverage collapse",
        detail: `Generated ${masterview.rowCount} players vs active ${activeRun.generatedPlayerCount}.`,
      });
    }

    if (
      activeRun?.sourceValueCount &&
      masterview.sourceValueCount < activeRun.sourceValueCount * 0.75
    ) {
      gates.push({
        id: "source-value-collapse",
        level: "fail",
        label: "Major source-value coverage collapse",
        detail: `Generated ${masterview.sourceValueCount} source values vs active ${activeRun.sourceValueCount}.`,
      });
    }
  }

  if (gates.length === 0) {
    gates.push({
      id: "quality-pass",
      level: "pass",
      label: "Quality gates passed",
      detail: `Run ${run.runId} passed required publication gates.`,
    });
  }

  return gates;
}

export async function validateAuctionValueRefreshRun({
  runId,
  actor,
}: {
  runId: string;
  actor: AuctionAccessSession;
}) {
  const run = await readRun(runId);
  if (!run) throw new Error("Refresh run not found.");
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published runs cannot be revalidated.");
  }

  const startedAt = nowIso();
  await runRef(runId).set(
    {
      status: "validating",
      updatedAt: startedAt,
      failureMessage: null,
    },
    { merge: true }
  );
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "validation-started",
    result: "Validation started.",
  });

  try {
    const sourceSnapshots = await runRef(runId).collection("sources").get();
    const sources = sourceSnapshots.docs.map((doc) => doc.data() as SourceDocument);
    const bucket = getFirebaseStorageBucket();
    const sourceFiles: SourceValueFileWithPath[] = [];

    for (const source of sources.filter((source) => source.enabled)) {
      if (!source.storagePath || !source.fileName) continue;
      const [rawBuffer] = await bucket.file(source.storagePath).download();
      const result = await importAuctionSourceExportText({
        source: source.sourceKey,
        seasonYear: run.season as AuctionSeasonYear,
        sourceFilename: source.fileName,
        text: rawBuffer.toString("utf8"),
        inputFile: source.storagePath,
        sourceValuesFile: `${source.sourceKey}-${run.season}.json`,
        reviewFile: `${source.sourceKey}-${run.season}-review.json`,
      });
      const parserVersion =
        result.valuesOutput.sources[0]?.adapterVersion ?? "source-export-v1";
      const sourceUpdate: Partial<SourceDocument> = {
        importedAt: result.valuesOutput.generatedAt,
        rowCount: result.valuesOutput.rowCount,
        matchedCount: result.valuesOutput.matchedRowCount,
        unmatchedCount: result.valuesOutput.unmatchedRowCount,
        warningCount: result.valuesOutput.warningCount,
        errorCount: result.valuesOutput.errorCount,
        parserVersion,
        status: result.valuesOutput.errorCount > 0 ? "blocked" : "validated",
      };

      await sourceRef(runId, source.sourceKey).set(sourceUpdate, { merge: true });
      await writeChunkCollection({
        runId,
        collection: `source_value_chunks_${source.sourceKey}`,
        rows: result.valuesOutput.rows,
        size: SOURCE_CHUNK_SIZE,
        season: run.season,
      });

      sourceFiles.push({
        ...result.valuesOutput,
        filePath: source.storagePath,
        filename: source.fileName,
      });
    }

    const { manifest, outputs } = generateMasterviewFromSourceValueFiles({
      sourceFiles,
      sourceDirectory: `firestore://${getRunsCollectionName()}/${runId}/source_value_chunks`,
      outputDirectory: `firestore://${getRunsCollectionName()}/${runId}/masterview_chunks`,
    });
    const masterview =
      outputs.find((output) => output.season === run.season) ?? outputs[0] ?? null;
    const activeConfig = (await configRef(run.season).get()).data() as
      | ConfigDocument
      | undefined;
    const activeRun = await readRunSummary(activeConfig?.activeRunId);
    const gates = buildQualityGates({
      run,
      requiredSourceKeys: run.requiredSourceKeys ?? getRequiredSourceKeys(),
      sourceFiles,
      masterview,
      activeRun,
    });
    const qualityGateStatus = gates.some((gate) => gate.level === "fail")
      ? "fail"
      : "pass";
    const nextStatus: AuctionValueRefreshStatus =
      qualityGateStatus === "fail" ? "blocked" : "validated";
    const qualityReportPreview =
      masterview === null
        ? null
        : buildAuctionConsensusMarkdownReport({
            masterview: masterview as any,
            manifest: manifest as any,
            sourceFiles: sourceFiles as any,
          }).slice(0, 12000);

    if (masterview) {
      await writeChunkCollection<AuctionValueGeneratedChunk["rows"][number]>({
        runId,
        collection: "masterview_chunks",
        rows: masterview.rows,
        size: MASTERVIEW_CHUNK_SIZE,
        season: run.season,
      });
    }

    await runRef(runId).collection("quality").doc("summary").set({
      runId,
      season: run.season,
      generatedAt: manifest.generatedAt,
      gates,
      qualityGateStatus,
      reportPreview: qualityReportPreview,
      manifest,
    });
    await unmatchedReviewRef(runId).set({
      runId,
      season: run.season,
      generatedAt: manifest.generatedAt,
      sources: sourceFiles.map(buildValueUnmatchedReview),
    });

    await runRef(runId).set(
      {
        status: nextStatus,
        updatedAt: nowIso(),
        includedSourceKeys: sourceFiles.map((file) => file.sourceKey),
        excludedSourceKeys: (run.requiredSourceKeys ?? getRequiredSourceKeys()).filter(
          (sourceKey) => !sourceFiles.some((file) => file.sourceKey === sourceKey)
        ),
        generatedSummary: {
          playerCount: masterview?.rowCount ?? 0,
          sourceValueCount: masterview?.sourceValueCount ?? 0,
          skippedSourceValueCount: masterview?.skippedSourceValueCount ?? 0,
          warningLabelCount:
            manifest.files.find((file) => file.season === run.season)
              ?.warningCount ?? 0,
        },
        qualityGateStatus,
        qualityGates: gates,
        qualityReportPreview,
        failureMessage:
          qualityGateStatus === "fail"
            ? "Publication blocked by quality gates."
            : null,
      },
      { merge: true }
    );
    await writeAudit({
      actor,
      season: run.season,
      runId,
      action:
        qualityGateStatus === "fail"
          ? "validation-blocked"
          : "validation-completed",
      result:
        qualityGateStatus === "fail"
          ? "Validation completed with blocking gates."
          : "Validation completed successfully.",
    });

    return (await readRunSummary(runId))!;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown validation failure.";
    await runRef(runId).set(
      {
        status: "failed",
        updatedAt: nowIso(),
        failureMessage: message,
      },
      { merge: true }
    );
    await writeAudit({
      actor,
      season: run.season,
      runId,
      action: "validation-failed",
      result: message,
    });
    throw error;
  }
}

export async function publishAuctionValueRefreshRun({
  runId,
  actor,
}: {
  runId: string;
  actor: AuctionAccessSession;
}) {
  const publishedAt = nowIso();

  await firestore.runTransaction(async (transaction) => {
    const runSnapshot = await transaction.get(runRef(runId));
    if (!runSnapshot.exists) throw new Error("Refresh run not found.");

    const run = runSnapshot.data() as RunDocument;
    if (run.status !== "validated" || run.qualityGateStatus !== "pass") {
      throw new Error("Run must be validated and pass quality gates before publish.");
    }

    const configSnapshot = await transaction.get(configRef(run.season));
    const config = configSnapshot.data() as ConfigDocument | undefined;
    const previousActiveRunId = config?.activeRunId ?? null;

    transaction.set(
      configRef(run.season),
      {
        season: run.season,
        activeRunId: runId,
        previousRunId: previousActiveRunId,
        updatedAt: publishedAt,
        updatedBy: getActorEmail(actor),
        sourceKeys: run.includedSourceKeys,
        status: "published",
      } satisfies ConfigDocument,
      { merge: true }
    );
    transaction.set(
      runRef(runId),
      {
        status: "published",
        publishedAt,
        publishedBy: getActorEmail(actor),
        previousRunId: previousActiveRunId,
        updatedAt: publishedAt,
      },
      { merge: true }
    );
    if (previousActiveRunId) {
      transaction.set(
        runRef(previousActiveRunId),
        {
          status: "superseded",
          updatedAt: publishedAt,
        },
        { merge: true }
      );
    }
  });

  const run = await readRun(runId);
  await writeAudit({
    actor,
    season: run?.season ?? DEFAULT_SEASON,
    runId,
    action: "published",
    result: "Published active auction value run.",
  });

  return (await readRunSummary(runId))!;
}

export async function rollbackAuctionValueRefresh({
  season = DEFAULT_SEASON,
  actor,
}: {
  season?: number;
  actor: AuctionAccessSession;
}) {
  let restoredRunId: string | null = null;

  await firestore.runTransaction(async (transaction) => {
    const configSnapshot = await transaction.get(configRef(season));
    const config = configSnapshot.data() as ConfigDocument | undefined;
    const currentRunId = config?.activeRunId ?? null;
    const previousRunId = config?.previousRunId ?? null;

    if (!previousRunId) {
      throw new Error("No previous auction value run is available for rollback.");
    }

    const previousRunSnapshot = await transaction.get(runRef(previousRunId));
    if (!previousRunSnapshot.exists) {
      throw new Error("Previous auction value run no longer exists.");
    }

    const rolledBackAt = nowIso();
    restoredRunId = previousRunId;

    transaction.set(
      configRef(season),
      {
        season,
        activeRunId: previousRunId,
        previousRunId: currentRunId,
        updatedAt: rolledBackAt,
        updatedBy: getActorEmail(actor),
        sourceKeys: (previousRunSnapshot.data() as RunDocument).includedSourceKeys,
        status: "rolled-back",
      } satisfies ConfigDocument,
      { merge: true }
    );
    transaction.set(
      runRef(previousRunId),
      {
        status: "published",
        updatedAt: rolledBackAt,
      },
      { merge: true }
    );
    if (currentRunId) {
      transaction.set(
        runRef(currentRunId),
        {
          status: "superseded",
          updatedAt: rolledBackAt,
        },
        { merge: true }
      );
    }
  });

  await writeAudit({
    actor,
    season,
    runId: restoredRunId,
    action: "rolled-back",
    result: "Restored previous auction value run.",
  });

  return readAuctionValueStatus(season);
}

export async function readAuctionValueStatus(
  season = DEFAULT_SEASON
): Promise<AuctionValueStatusResponse> {
  const configuredSources = getAllowedSourceEntries();

  try {
    const configSnapshot = await configRef(season).get();
    const config = configSnapshot.data() as ConfigDocument | undefined;
    const activeRun = await readRunSummary(config?.activeRunId);
    const previousRun = await readRunSummary(config?.previousRunId);
    const latestRuns = await firestore
      .collection(getRunsCollectionName())
      .where("season", "==", season)
      .get();
    const pendingRun =
      latestRuns.docs
        .map((doc) => doc.data() as RunDocument)
        .sort((firstRun, secondRun) =>
          secondRun.createdAt.localeCompare(firstRun.createdAt)
        )
        .find((run) => !["published", "superseded"].includes(run.status)) ??
      null;
    const sourceRunId = pendingRun?.runId ?? activeRun?.runId ?? null;

    return {
      season,
      configuredSources,
      activeRun,
      previousRun,
      pendingRun: pendingRun ? toRunSummary(pendingRun) : null,
      sources: await readSourceSummaries(sourceRunId, season),
      updatedAt: config?.updatedAt ?? null,
      updatedBy: config?.updatedBy ?? null,
      fallbackWarning: null,
    };
  } catch (error) {
    return {
      season,
      configuredSources,
      activeRun: null,
      previousRun: null,
      pendingRun: null,
      sources: configuredSources.map((entry) =>
        emptySourceSummary({ entry, season })
      ),
      updatedAt: null,
      updatedBy: null,
      fallbackWarning:
        error instanceof Error
          ? error.message
          : "Auction value status unavailable.",
    };
  }
}

export async function readPublishedMasterviewFromFirestore(season = DEFAULT_SEASON) {
  const config = (await configRef(season).get()).data() as
    | ConfigDocument
    | undefined;
  if (!config?.activeRunId) return null;

  const run = await readRun(config.activeRunId);
  if (!run) return null;

  const chunksSnapshot = await runRef(config.activeRunId)
    .collection("masterview_chunks")
    .orderBy("offset", "asc")
    .get();
  const rows = chunksSnapshot.docs.flatMap((doc) => {
    const chunk = doc.data() as AuctionValueGeneratedChunk;
    return chunk.rows;
  });
  if (rows.length === 0) return null;

  return {
    generatedAt: run.updatedAt,
    season,
    sourceDirectory: `firestore://${getRunsCollectionName()}/${config.activeRunId}`,
    sourceFiles: run.includedSourceKeys,
    rowCount: rows.length,
    sourceValueCount: run.generatedSummary.sourceValueCount ?? 0,
    skippedSourceValueCount: run.generatedSummary.skippedSourceValueCount ?? 0,
    rows,
    activeRunId: config.activeRunId,
    includedSourceKeys: run.includedSourceKeys,
  };
}
