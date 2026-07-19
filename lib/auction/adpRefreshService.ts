import { createHash } from "node:crypto";

import { firestore, getFirebaseStorageBucket } from "../firebaseAdmin";
import type { AuctionAccessSession } from "../auth/auctionAccess";
import {
  buildAuctionAdpQualityGates,
  buildAuctionAdpQualityReport,
  generateAuctionAdpConsensus,
} from "./adpConsensus";
import { importAuctionAdpSourceText } from "./adpImport";
import { buildAdpUnmatchedReview, sanitizeAdpFirestoreData } from "./adpReview";
import {
  getAuctionAdpSourceRegistryEntry,
  getAuctionAdpSourceRegistryEntries,
  getRequiredAuctionAdpSourceKeys,
} from "./adpSourceRegistry";
import type {
  AuctionAdpConsensusChunk,
  AuctionAdpConsensusFile,
  AuctionAdpQualityGate,
  AuctionAdpRefreshRunSummary,
  AuctionAdpRefreshStatus,
  AuctionSourceUnmatchedReview,
  AuctionAdpSourceKey,
  AuctionAdpSourceRow,
  AuctionAdpSourceSummary,
  AuctionAdpSourceValuesFile,
  AuctionAdpStatusResponse,
} from "./adpTypes";

const RUNS_COLLECTION = "auction_adp_refresh_runs";
const CONFIG_COLLECTION = "auction_adp_config";
const AUDIT_COLLECTION = "auction_adp_audit";
const TEST_RUNS_COLLECTION = "test_auction_adp_refresh_runs";
const TEST_CONFIG_COLLECTION = "test_auction_adp_config";
const TEST_AUDIT_COLLECTION = "test_auction_adp_audit";
const STORAGE_PREFIX = "auction-adp-imports";
const TEST_STORAGE_PREFIX = "test-auction-adp-imports";
const DEFAULT_SEASON = 2026;
const SOURCE_CHUNK_SIZE = 250;
const CONSENSUS_CHUNK_SIZE = 250;

type RunDocument = {
  runId: string;
  season: number;
  status: AuctionAdpRefreshStatus;
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
  };
  qualityGateStatus: "pass" | "fail" | "pending";
  qualityGates: AuctionAdpQualityGate[];
  qualityReportPreview: string | null;
  failureMessage: string | null;
};

type SourceDocument = AuctionAdpSourceSummary & {
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

function isAdpTestMode() {
  return process.env.AUCTION_ADP_TEST_MODE === "true";
}

function isFirebaseEmulatorMode() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST);
}

function runsCollectionName() {
  return isAdpTestMode() ? TEST_RUNS_COLLECTION : RUNS_COLLECTION;
}

function configCollectionName() {
  return isAdpTestMode() ? TEST_CONFIG_COLLECTION : CONFIG_COLLECTION;
}

function auditCollectionName() {
  return isAdpTestMode() ? TEST_AUDIT_COLLECTION : AUDIT_COLLECTION;
}

function storagePrefix() {
  return isAdpTestMode() ? TEST_STORAGE_PREFIX : STORAGE_PREFIX;
}

export function getAuctionAdpRefreshRuntimePaths() {
  return {
    testMode: isAdpTestMode(),
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
    storageEmulatorHost:
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??
      process.env.STORAGE_EMULATOR_HOST ??
      null,
    runsCollection: runsCollectionName(),
    configCollection: configCollectionName(),
    auditCollection: auditCollectionName(),
    storagePrefix: storagePrefix(),
  };
}

function normalizeRequiredSources(sourceKeys?: AuctionAdpSourceKey[]) {
  if (!sourceKeys) return getRequiredAuctionAdpSourceKeys(DEFAULT_SEASON);
  if (!isAdpTestMode() && !isFirebaseEmulatorMode()) {
    throw new Error("Custom ADP required sources are only allowed in test mode or emulator.");
  }

  const allowed = new Set(
    getAuctionAdpSourceRegistryEntries(DEFAULT_SEASON).map((entry) => entry.sourceKey)
  );
  const unique = Array.from(new Set(sourceKeys));
  const invalid = unique.find((sourceKey) => !allowed.has(sourceKey));
  if (invalid) throw new Error(`Unsupported ADP source: ${invalid}.`);
  return unique;
}

function runRef(runId: string) {
  return firestore.collection(runsCollectionName()).doc(runId);
}

function configRef(season: number) {
  return firestore.collection(configCollectionName()).doc(String(season));
}

function sourceRef(runId: string, sourceKey: string) {
  return runRef(runId).collection("sources").doc(sourceKey);
}

function unmatchedReviewRef(runId: string) {
  return runRef(runId).collection("quality").doc("unmatched");
}

function auditRef() {
  return firestore.collection(auditCollectionName()).doc();
}

function getActorEmail(actor: AuctionAccessSession) {
  return actor.email;
}

function getActorUid(actor: AuctionAccessSession) {
  return actor.decodedToken.uid ?? null;
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
  return `${storagePrefix()}/${season}/${runId}/raw/${sourceKey}.csv`;
}

function toRunSummary(run: RunDocument): AuctionAdpRefreshRunSummary {
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
    qualityGateStatus: run.qualityGateStatus ?? "pending",
    qualityGates: run.qualityGates ?? [],
  };
}

function emptySourceSummary(sourceKey: AuctionAdpSourceKey, season: number): AuctionAdpSourceSummary {
  const entry = getAuctionAdpSourceRegistryEntry(sourceKey, season);

  return {
    sourceKey,
    displayName: entry?.displayName ?? sourceKey,
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
    contentHash: null,
    sizeBytes: null,
    storagePath: null,
    status: "empty",
    uploadedAt: null,
    validatedAt: null,
    validatedContentHash: null,
    validationError: null,
    unmatchedPlayers: null,
    unmatchedDetailsStored: false,
  };
}

function sourceDocToSummary(source: Partial<SourceDocument>, sourceKey: AuctionAdpSourceKey, season: number) {
  const contentHash = source.contentHash ?? source.fileHash ?? null;

  return {
    ...emptySourceSummary(sourceKey, season),
    ...source,
    sourceKey,
    season,
    fileHash: source.fileHash ?? contentHash,
    contentHash,
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
  await auditRef().set({
    actorEmail: getActorEmail(actor),
    actorUid: getActorUid(actor),
    timestamp: nowIso(),
    season,
    runId,
    action,
    result,
    sourceKey,
  });
}

async function readRun(runId: string) {
  const snapshot = await runRef(runId).get();
  return snapshot.exists ? (snapshot.data() as RunDocument) : null;
}

async function readRunSummary(runId: string | null | undefined) {
  if (!runId) return null;
  const run = await readRun(runId);
  return run ? toRunSummary(run) : null;
}

async function readSourceSummaries(runId: string | null, season: number) {
  const sourceKeys = getAuctionAdpSourceRegistryEntries(season).map(
    (entry) => entry.sourceKey
  );
  if (!runId) return sourceKeys.map((sourceKey) => emptySourceSummary(sourceKey, season));

  const [snapshots, unmatchedReviewSnapshot] = await Promise.all([
    Promise.all(sourceKeys.map((sourceKey) => sourceRef(runId, sourceKey).get())),
    unmatchedReviewRef(runId).get(),
  ]);
  const unmatchedReviewsBySource = new Map(
    unmatchedReviewSnapshot.exists
      ? ((unmatchedReviewSnapshot.data() as UnmatchedReviewDocument).sources ?? []).map(
          (review) => [review.sourceKey, review]
        )
      : []
  );

  return sourceKeys.map((sourceKey, index) => {
    const summary = sourceDocToSummary(
      snapshots[index].exists
        ? (snapshots[index].data() as Partial<SourceDocument>)
        : {},
      sourceKey,
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

async function clearUnmatchedReviewForSource(runId: string, sourceKey: string) {
  const snapshot = await unmatchedReviewRef(runId).get();
  if (!snapshot.exists) return;

  const review = snapshot.data() as UnmatchedReviewDocument;
  await unmatchedReviewRef(runId).set(
    {
      ...review,
      sources: (review.sources ?? []).filter(
        (sourceReview) => sourceReview.sourceKey !== sourceKey
      ),
    },
    { merge: true }
  );
}

export async function createAuctionAdpRefreshRun({
  season = DEFAULT_SEASON,
  actor,
  requiredSourceKeys,
}: {
  season?: number;
  actor: AuctionAccessSession;
  requiredSourceKeys?: AuctionAdpSourceKey[];
}) {
  const createdAt = nowIso();
  const runId = `auction-adp-${season}-${createdAt.replace(/[:.]/g, "-")}`;
  const config = (await configRef(season).get()).data() as ConfigDocument | undefined;
  const required = normalizeRequiredSources(requiredSourceKeys);
  const run: RunDocument = {
    runId,
    season,
    status: "uploaded",
    createdAt,
    createdBy: getActorEmail(actor),
    updatedAt: createdAt,
    publishedAt: null,
    publishedBy: null,
    previousRunId: config?.activeRunId ?? null,
    sourceKeys: [],
    includedSourceKeys: [],
    excludedSourceKeys: required,
    requiredSourceKeys: required,
    generatedSummary: {
      playerCount: null,
      sourceValueCount: null,
      skippedSourceValueCount: null,
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
    result: "Created ADP refresh run.",
  });

  return toRunSummary(run);
}

export async function uploadAuctionAdpSource({
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
  if (!run) throw new Error("ADP refresh run not found.");
  const entry = getAuctionAdpSourceRegistryEntry(sourceKey as AuctionAdpSourceKey, run.season);
  if (!entry) throw new Error("Unsupported ADP source.");
  if (!run.requiredSourceKeys.includes(entry.sourceKey)) {
    throw new Error("ADP source is not enabled for this run.");
  }
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published ADP runs cannot be modified.");
  }

  const uploadedAt = nowIso();
  const contentHash = hashBuffer(fileBuffer);
  const sizeBytes = fileBuffer.byteLength;
  const storagePath = storagePathForSource({
    season: run.season,
    runId,
    sourceKey,
  });

  await getFirebaseStorageBucket().file(storagePath).save(fileBuffer, {
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
        contentHash,
        fileHash: contentHash,
        sizeBytes: String(sizeBytes),
      },
    },
  });

  const sourceDoc: SourceDocument = {
    sourceKey: entry.sourceKey,
    displayName: entry.displayName,
    season: run.season,
    enabled: true,
    importedAt: null,
    rowCount: null,
    matchedCount: null,
    unmatchedCount: null,
    warningCount: null,
    errorCount: null,
    parserVersion: entry.parserKey,
    fileName,
    fileHash: contentHash,
    contentHash,
    sizeBytes,
    storagePath,
    status: "uploaded",
    uploadedAt,
    uploadedBy: getActorEmail(actor),
    validatedAt: null,
    validatedContentHash: null,
    validationError: null,
    unmatchedPlayers: null,
    unmatchedDetailsStored: false,
  };
  const sourceKeys = Array.from(new Set([...run.sourceKeys, entry.sourceKey]));

  await Promise.all([
    sourceRef(runId, entry.sourceKey).set(sourceDoc),
    clearUnmatchedReviewForSource(runId, entry.sourceKey),
    runRef(runId).set(
      {
        status: "uploaded",
        updatedAt: uploadedAt,
        sourceKeys,
        includedSourceKeys: sourceKeys,
        excludedSourceKeys: run.requiredSourceKeys.filter(
          (key) => !sourceKeys.includes(key)
        ),
        qualityGateStatus: "pending",
        qualityGates: [],
        generatedSummary: {
          playerCount: null,
          sourceValueCount: null,
          skippedSourceValueCount: null,
        },
        qualityReportPreview: null,
        failureMessage: null,
      },
      { merge: true }
    ),
  ]);
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "source-uploaded",
    result: `Uploaded ${entry.displayName}.`,
    sourceKey: entry.sourceKey,
  });

  return sourceDocToSummary(sourceDoc, entry.sourceKey, run.season);
}

export async function removeAuctionAdpSource({
  runId,
  sourceKey,
  actor,
}: {
  runId: string;
  sourceKey: string;
  actor: AuctionAccessSession;
}) {
  const run = await readRun(runId);
  if (!run) throw new Error("ADP refresh run not found.");
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published ADP runs cannot be modified.");
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
      if (code !== 404) throw error;
    }
  }

  const sourceKeys = run.sourceKeys.filter((key) => key !== sourceKey);
  await Promise.all([
    sourceRef(runId, sourceKey).delete(),
    runRef(runId).set(
      {
        updatedAt: nowIso(),
        sourceKeys,
        includedSourceKeys: sourceKeys,
        excludedSourceKeys: run.requiredSourceKeys.filter(
          (key) => !sourceKeys.includes(key)
        ),
      },
      { merge: true }
    ),
  ]);
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "source-removed",
    result: `Removed ${sourceKey} from pending ADP run.`,
    sourceKey,
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
  const existing = await collectionRef.get();
  for (let index = 0; index < existing.docs.length; index += 450) {
    const batch = firestore.batch();
    existing.docs.slice(index, index + 450).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  const chunks = chunkRows(rows, size);
  if (chunks.length === 0) return;

  const batch = firestore.batch();
  const createdAt = nowIso();
  chunks.forEach((chunk, index) => {
    const chunkId = String(index).padStart(4, "0");
    batch.set(collectionRef.doc(chunkId), {
      chunkId,
      runId,
      season,
      offset: index * size,
      count: chunk.length,
      rows: sanitizeAdpFirestoreData(chunk),
      createdAt,
    });
  });
  await batch.commit();
}

export async function validateAuctionAdpRefreshRun({
  runId,
  actor,
}: {
  runId: string;
  actor: AuctionAccessSession;
}) {
  const run = await readRun(runId);
  if (!run) throw new Error("ADP refresh run not found.");
  if (run.status === "published" || run.status === "superseded") {
    throw new Error("Published ADP runs cannot be revalidated.");
  }

  await runRef(runId).set(
    { status: "validating", updatedAt: nowIso(), failureMessage: null },
    { merge: true }
  );
  await writeAudit({
    actor,
    season: run.season,
    runId,
    action: "validation-started",
    result: "ADP validation started.",
  });

  try {
    const sourceSnapshots = await runRef(runId).collection("sources").get();
    const sources = sourceSnapshots.docs.map((doc) => doc.data() as SourceDocument);
    const sourceFiles: AuctionAdpSourceValuesFile[] = [];

    for (const source of sources.filter((item) => item.enabled)) {
      if (!source.storagePath || !source.fileName) continue;
      const validatedAt = nowIso();

      try {
        const [rawBuffer] = await getFirebaseStorageBucket().file(source.storagePath).download();
        const validatedContentHash = hashBuffer(rawBuffer);
        const uploadedContentHash = source.contentHash ?? source.fileHash ?? validatedContentHash;
        if (
          (source.contentHash || source.fileHash) &&
          validatedContentHash !== uploadedContentHash
        ) {
          throw new Error("Downloaded ADP object hash does not match uploaded source metadata.");
        }

        const result = await importAuctionAdpSourceText({
          sourceKey: source.sourceKey,
          season: run.season,
          sourceFilename: source.fileName,
          text: rawBuffer.toString("utf8"),
        });
        const sourceUpdate: Partial<SourceDocument> = {
          importedAt: result.valuesOutput.generatedAt,
          rowCount: result.valuesOutput.rowCount,
          matchedCount: result.valuesOutput.matchedRowCount,
          unmatchedCount: result.valuesOutput.unmatchedRowCount,
          warningCount: result.valuesOutput.warningCount,
          errorCount: result.valuesOutput.errorCount,
          contentHash: uploadedContentHash,
          fileHash: source.fileHash ?? uploadedContentHash,
          validatedAt,
          validatedContentHash,
          validationError: null,
          status: result.valuesOutput.errorCount > 0 ? "blocked" : "validated",
        };

        await sourceRef(runId, source.sourceKey).set(sourceUpdate, { merge: true });
        await writeChunkCollection<AuctionAdpSourceRow>({
          runId,
          collection: `source_chunks_${source.sourceKey}`,
          rows: result.valuesOutput.rows,
          size: SOURCE_CHUNK_SIZE,
          season: run.season,
        });
        sourceFiles.push(result.valuesOutput);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown ADP source validation failure.";
        const contentHash = source.contentHash ?? source.fileHash ?? null;
        await sourceRef(runId, source.sourceKey).set(
          {
            rowCount: null,
            matchedCount: null,
            unmatchedCount: null,
            warningCount: null,
            errorCount: 1,
            status: "blocked",
            validatedAt,
            validatedContentHash: null,
            validationError: {
              sourceKey: source.sourceKey,
              fileName: source.fileName,
              contentHash,
              validatedAt,
              message,
            },
          } satisfies Partial<SourceDocument>,
          { merge: true }
        );
        throw new Error(`${source.displayName}: ${message}`);
      }
    }

    const consensus = generateAuctionAdpConsensus({ sourceFiles });
    const activeConfig = (await configRef(run.season).get()).data() as
      | ConfigDocument
      | undefined;
    const activeRun = await readRunSummary(activeConfig?.activeRunId);
    const gates = buildAuctionAdpQualityGates({
      sourceFiles,
      consensus,
      requiredSourceKeys: run.requiredSourceKeys,
      activePlayerCount: activeRun?.generatedPlayerCount ?? null,
    });
    const qualityGateStatus = gates.some((gate) => gate.level === "fail")
      ? "fail"
      : "pass";
    const status: AuctionAdpRefreshStatus =
      qualityGateStatus === "fail" ? "blocked" : "validated";
    const report = buildAuctionAdpQualityReport({ sourceFiles, consensus });
    const unmatchedReviews = sourceFiles.map((sourceFile) =>
      buildAdpUnmatchedReview(sourceFile, sourceFiles)
    );

    await writeChunkCollection<AuctionAdpConsensusChunk["rows"][number]>({
      runId,
      collection: "consensus_chunks",
      rows: consensus.rows,
      size: CONSENSUS_CHUNK_SIZE,
      season: run.season,
    });
    await runRef(runId).collection("quality").doc("summary").set({
      runId,
      season: run.season,
      generatedAt: consensus.generatedAt,
      gates,
      qualityGateStatus,
      report,
    });
    await unmatchedReviewRef(runId).set(
      sanitizeAdpFirestoreData({
        runId,
        season: run.season,
        generatedAt: consensus.generatedAt,
        sources: unmatchedReviews,
      })
    );
    await runRef(runId).set(
      {
        status,
        updatedAt: nowIso(),
        includedSourceKeys: sourceFiles.map((sourceFile) => sourceFile.sourceKey),
        excludedSourceKeys: run.requiredSourceKeys.filter(
          (sourceKey) => !sourceFiles.some((sourceFile) => sourceFile.sourceKey === sourceKey)
        ),
        generatedSummary: {
          playerCount: consensus.rowCount,
          sourceValueCount: consensus.sourceValueCount,
          skippedSourceValueCount: consensus.skippedSourceValueCount,
        },
        qualityGateStatus,
        qualityGates: gates,
        qualityReportPreview: JSON.stringify(report).slice(0, 12000),
        failureMessage:
          qualityGateStatus === "fail"
            ? "ADP publication blocked by quality gates."
            : null,
      },
      { merge: true }
    );
    await writeAudit({
      actor,
      season: run.season,
      runId,
      action: qualityGateStatus === "fail" ? "validation-blocked" : "validation-completed",
      result:
        qualityGateStatus === "fail"
          ? "ADP validation completed with blocking gates."
          : "ADP validation completed successfully.",
    });

    return (await readRunSummary(runId))!;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ADP validation failure.";
    await runRef(runId).set(
      { status: "failed", updatedAt: nowIso(), failureMessage: message },
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

export async function publishAuctionAdpRefreshRun({
  runId,
  actor,
}: {
  runId: string;
  actor: AuctionAccessSession;
}) {
  const publishedAt = nowIso();

  await firestore.runTransaction(async (transaction) => {
    const runSnapshot = await transaction.get(runRef(runId));
    if (!runSnapshot.exists) throw new Error("ADP refresh run not found.");
    const run = runSnapshot.data() as RunDocument;
    if (run.status !== "validated" || run.qualityGateStatus !== "pass") {
      throw new Error("ADP run must be validated and pass quality gates before publish.");
    }
    const sourceSnapshots = await Promise.all(
      run.includedSourceKeys.map((sourceKey) =>
        transaction.get(sourceRef(runId, sourceKey))
      )
    );
    sourceSnapshots.forEach((sourceSnapshot, index) => {
      const sourceKey = run.includedSourceKeys[index];
      if (!sourceSnapshot.exists) {
        throw new Error(`ADP source ${sourceKey} must be uploaded and validated before publish.`);
      }

      const source = sourceSnapshot.data() as SourceDocument;
      const uploadedContentHash = source.contentHash ?? source.fileHash ?? null;
      if (!uploadedContentHash || source.validatedContentHash !== uploadedContentHash) {
        throw new Error(
          `ADP source ${sourceKey} must be revalidated after the latest upload before publish.`
        );
      }
    });
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
        { status: "superseded", updatedAt: publishedAt },
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
    result: "Published active ADP run.",
  });

  return (await readRunSummary(runId))!;
}

export async function rollbackAuctionAdpRefresh({
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
    if (!previousRunId) throw new Error("No previous ADP run is available for rollback.");
    const previousRunSnapshot = await transaction.get(runRef(previousRunId));
    if (!previousRunSnapshot.exists) throw new Error("Previous ADP run no longer exists.");

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
      { status: "published", updatedAt: rolledBackAt },
      { merge: true }
    );
    if (currentRunId) {
      transaction.set(
        runRef(currentRunId),
        { status: "superseded", updatedAt: rolledBackAt },
        { merge: true }
      );
    }
  });

  await writeAudit({
    actor,
    season,
    runId: restoredRunId,
    action: "rolled-back",
    result: "Restored previous ADP run.",
  });

  return readAuctionAdpStatus(season);
}

export async function readAuctionAdpStatus(
  season = DEFAULT_SEASON
): Promise<AuctionAdpStatusResponse> {
  const configuredSources = getAuctionAdpSourceRegistryEntries(season);

  try {
    const config = (await configRef(season).get()).data() as ConfigDocument | undefined;
    const activeRun = await readRunSummary(config?.activeRunId);
    const previousRun = await readRunSummary(config?.previousRunId);
    const latestRuns = await firestore
      .collection(runsCollectionName())
      .where("season", "==", season)
      .get();
    const pendingRun =
      latestRuns.docs
        .map((doc) => doc.data() as RunDocument)
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
        .find((run) => !["published", "superseded"].includes(run.status)) ?? null;
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
        emptySourceSummary(entry.sourceKey, season)
      ),
      updatedAt: null,
      updatedBy: null,
      fallbackWarning:
        error instanceof Error ? error.message : "ADP status unavailable.",
    };
  }
}

export async function readPublishedAdpConsensusFromFirestore(season = DEFAULT_SEASON) {
  const config = (await configRef(season).get()).data() as ConfigDocument | undefined;
  if (!config?.activeRunId) return null;
  const run = await readRun(config.activeRunId);
  if (!run) return null;

  const chunksSnapshot = await runRef(config.activeRunId)
    .collection("consensus_chunks")
    .orderBy("offset", "asc")
    .get();
  const rows = chunksSnapshot.docs.flatMap((doc) => {
    const chunk = doc.data() as AuctionAdpConsensusChunk;
    return chunk.rows;
  });
  if (rows.length === 0) return null;

  return {
    generatedAt: run.updatedAt,
    season,
    sourceFiles: run.includedSourceKeys,
    rowCount: rows.length,
    sourceValueCount: run.generatedSummary.sourceValueCount ?? 0,
    skippedSourceValueCount: run.generatedSummary.skippedSourceValueCount ?? 0,
    rows,
    activeRunId: config.activeRunId,
    includedSourceKeys: run.includedSourceKeys,
  } satisfies AuctionAdpConsensusFile & {
    activeRunId: string;
    includedSourceKeys: string[];
  };
}
