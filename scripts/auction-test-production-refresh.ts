import { AssertionError, strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { firestore, getFirebaseStorageBucket } from "../lib/firebaseAdmin";
import type { AuctionAccessSession } from "../lib/auth/auctionAccess";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import type { AuctionValueRefreshRunSummary } from "../lib/auction/valueRefreshTypes";
import type { AuctionValueSourceRegistryId } from "../lib/auction/valueSourceRegistry";
import {
  createAuctionValueRefreshRun,
  getAuctionValueRefreshRuntimePaths,
  publishAuctionValueRefreshRun,
  readAuctionValueStatus,
  readPublishedMasterviewFromFirestore,
  rollbackAuctionValueRefresh,
  uploadAuctionValueSource,
  validateAuctionValueRefreshRun,
} from "../lib/auction/valueRefreshService";

const SEASON = 2026;
const SOURCE_FIXTURES: Record<AuctionValueSourceRegistryId, string | null> = {
  fantasypros: "data/auction/source-imports/exports/fantasypros-2026.csv",
  rotowire: "data/auction/source-imports/exports/rotowire-2026.csv",
  lineupexperts: "data/auction/source-imports/exports/lineupexperts-2026.csv",
  draftsharks: null,
  footballguys: null,
  fantasynerds: null,
  espn: null,
  "manual-csv": null,
  "historical-masterview": null,
};
const FULL_SOURCE_SET: AuctionValueSourceRegistryId[] = [
  "fantasypros",
  "rotowire",
  "lineupexperts",
];
const TWO_SOURCE_SET: AuctionValueSourceRegistryId[] = [
  "fantasypros",
  "rotowire",
];
const TEST_ACTOR: AuctionAccessSession = {
  email: "auction-refresh-smoke@river-city.local",
  decodedToken: {
    uid: "auction-refresh-smoke",
    email: "auction-refresh-smoke@river-city.local",
    email_verified: true,
  } as AuctionAccessSession["decodedToken"],
  access: buildCommissionerAccessResult("auction-refresh-smoke@river-city.local"),
};

type CleanupCounts = {
  runDocuments: number;
  subcollectionDocuments: number;
  auditDocuments: number;
  storageObjects: number;
  configRestored: boolean;
  configDeleted: boolean;
};

function assertSafeEnvironment() {
  const runtimePaths = getAuctionValueRefreshRuntimePaths();
  const hasEmulator = Boolean(runtimePaths.firestoreEmulatorHost);

  if (!hasEmulator && !runtimePaths.testMode) {
    throw new Error(
      "Refusing to run production refresh smoke test without Firebase emulator or AUCTION_VALUE_TEST_MODE=true."
    );
  }
  if (
    runtimePaths.testMode &&
    (!runtimePaths.runsCollection.startsWith("test_") ||
      !runtimePaths.configCollection.startsWith("test_") ||
      !runtimePaths.auditCollection.startsWith("test_") ||
      !runtimePaths.storagePrefix.startsWith("test-"))
  ) {
    throw new Error("Test mode is enabled but isolated test paths are not active.");
  }

  return runtimePaths;
}

function sortedSources(sourceKeys: readonly string[]) {
  return [...sourceKeys].sort();
}

function assertSourcesEqual(
  actual: readonly string[],
  expected: readonly AuctionValueSourceRegistryId[],
  label: string
) {
  assert.deepEqual(sortedSources(actual), sortedSources(expected), label);
}

function assertPositiveCount(value: number | null | undefined, label: string) {
  assert.equal(typeof value, "number", `${label} should be numeric.`);
  assert.ok((value ?? 0) > 0, `${label} should be positive.`);
}

function assertNoForbiddenPayloadKeys(value: unknown, pathLabel = "payload") {
  if (!value || typeof value !== "object") return;
  for (const [key, nestedValue] of Object.entries(value)) {
    assert.notEqual(key, "rows", `${pathLabel} should not expose rows.`);
    assert.notEqual(key, "raw", `${pathLabel} should not expose raw data.`);
    assert.notEqual(key, "rawCsv", `${pathLabel} should not expose raw CSV.`);
    assert.notEqual(key, "text", `${pathLabel} should not expose CSV text.`);
    assertNoForbiddenPayloadKeys(nestedValue, `${pathLabel}.${key}`);
  }
}

async function readFixture(sourceKey: AuctionValueSourceRegistryId) {
  const fixturePath = SOURCE_FIXTURES[sourceKey];
  if (!fixturePath) throw new Error(`No fixture configured for ${sourceKey}.`);

  return {
    fileName: path.basename(fixturePath),
    fileBuffer: await readFile(fixturePath),
  };
}

async function uploadSources(
  runId: string,
  sourceKeys: readonly AuctionValueSourceRegistryId[]
) {
  const uploaded = [];

  for (const sourceKey of sourceKeys) {
    const fixture = await readFixture(sourceKey);
    uploaded.push(
      await uploadAuctionValueSource({
        runId,
        sourceKey,
        ...fixture,
        actor: TEST_ACTOR,
      })
    );
  }

  return uploaded;
}

async function assertQualitySummaryExists(runId: string, runsCollection: string) {
  const snapshot = await firestore
    .collection(runsCollection)
    .doc(runId)
    .collection("quality")
    .doc("summary")
    .get();

  assert.equal(snapshot.exists, true, `Quality summary missing for ${runId}.`);
  return snapshot.data();
}

async function assertPublishedConfig({
  runId,
  expectedPreviousRunId,
  expectedSourceKeys,
  runtimePaths,
}: {
  runId: string;
  expectedPreviousRunId: string | null;
  expectedSourceKeys: readonly AuctionValueSourceRegistryId[];
  runtimePaths: ReturnType<typeof getAuctionValueRefreshRuntimePaths>;
}) {
  const configSnapshot = await firestore
    .collection(runtimePaths.configCollection)
    .doc(String(SEASON))
    .get();
  assert.equal(configSnapshot.exists, true, "Config document should exist.");

  const config = configSnapshot.data() ?? {};
  assert.equal(config.activeRunId, runId, "Config activeRunId mismatch.");
  assert.equal(
    config.previousRunId ?? null,
    expectedPreviousRunId,
    "Config previousRunId mismatch."
  );
  assertSourcesEqual(
    Array.isArray(config.sourceKeys) ? config.sourceKeys : [],
    expectedSourceKeys,
    "Config sourceKeys"
  );
  assert.equal(config.status, "published", "Config status should be published.");
  assert.equal(typeof config.updatedAt, "string", "Config updatedAt missing.");
  assert.equal(typeof config.updatedBy, "string", "Config updatedBy missing.");

  const runSnapshot = await firestore
    .collection(runtimePaths.runsCollection)
    .doc(runId)
    .get();
  assert.equal(runSnapshot.exists, true, "Published run document should exist.");
  assert.equal(
    runSnapshot.data()?.status,
    "published",
    "Published run status should persist."
  );

  return config;
}

function assertSourceSummariesPass(
  run: AuctionValueRefreshRunSummary,
  sourceKeys: readonly AuctionValueSourceRegistryId[]
) {
  assert.equal(run.status, "validated", `${run.runId} should validate.`);
  assert.equal(run.qualityGateStatus, "pass", `${run.runId} gates should pass.`);
  assertSourcesEqual(run.includedSourceKeys, sourceKeys, "Included source keys");
  assertSourcesEqual(run.sourceKeys, sourceKeys, "Uploaded source keys");
  assertPositiveCount(run.generatedPlayerCount, "Generated player count");
  assertPositiveCount(run.sourceValueCount, "Source value count");
}

function countLineupExpertsValues(masterview: Awaited<
  ReturnType<typeof readPublishedMasterviewFromFirestore>
>) {
  return (
    masterview?.rows.reduce((count, row) => {
      const sourceValues = Array.isArray(row.sourceValues)
        ? row.sourceValues
        : [];

      return (
        count +
        sourceValues.filter((sourceValue) => {
          const sourceName = String(sourceValue.sourceName ?? "").toLowerCase();
          const sourceKey = String(
            (sourceValue as { sourceKey?: unknown }).sourceKey ?? ""
          ).toLowerCase();

          return (
            sourceKey === "lineupexperts" ||
            sourceName.includes("lineup experts")
          );
        }).length
      );
    }, 0) ?? 0
  );
}

async function assertAuditActionExists({
  runId,
  action,
  auditCollection,
}: {
  runId: string;
  action: string;
  auditCollection: string;
}) {
  const snapshot = await firestore
    .collection(auditCollection)
    .where("runId", "==", runId)
    .where("action", "==", action)
    .limit(1)
    .get();

  assert.equal(
    snapshot.empty,
    false,
    `Expected audit action ${action} for ${runId}.`
  );
}

async function assertStorageAvailable() {
  const bucket = getFirebaseStorageBucket();

  try {
    const [exists] = await bucket.exists();
    assert.equal(
      exists,
      true,
      `Firebase Storage bucket ${bucket.name} does not exist. Configure FIREBASE_STORAGE_BUCKET or run the Storage emulator.`
    );
  } catch (error) {
    if (error instanceof AssertionError) {
      throw error;
    }

    throw new Error(
      error instanceof Error
        ? `Firebase Storage preflight failed: ${error.message}`
        : "Firebase Storage preflight failed."
    );
  }
}

async function deleteCollectionDocuments(
  collectionRef: FirebaseFirestore.CollectionReference
) {
  const snapshot = await collectionRef.get();
  let deleted = 0;

  for (let index = 0; index < snapshot.docs.length; index += 450) {
    const batch = firestore.batch();
    snapshot.docs.slice(index, index + 450).forEach((doc) => {
      batch.delete(doc.ref);
      deleted += 1;
    });
    await batch.commit();
  }

  return deleted;
}

async function cleanup({
  runIds,
  runtimePaths,
  initialConfig,
  initialActiveRun,
}: {
  runIds: string[];
  runtimePaths: ReturnType<typeof getAuctionValueRefreshRuntimePaths>;
  initialConfig: FirebaseFirestore.DocumentData | null;
  initialActiveRun: FirebaseFirestore.DocumentData | null;
}): Promise<CleanupCounts> {
  const counts: CleanupCounts = {
    runDocuments: 0,
    subcollectionDocuments: 0,
    auditDocuments: 0,
    storageObjects: 0,
    configRestored: false,
    configDeleted: false,
  };
  const sourceChunkCollections = FULL_SOURCE_SET.map(
    (sourceKey) => `source_value_chunks_${sourceKey}`
  );
  const knownSubcollections = [
    "sources",
    "quality",
    "masterview_chunks",
    ...sourceChunkCollections,
  ];

  for (const runId of runIds) {
    const runDocument = firestore.collection(runtimePaths.runsCollection).doc(runId);
    for (const subcollection of knownSubcollections) {
      counts.subcollectionDocuments += await deleteCollectionDocuments(
        runDocument.collection(subcollection)
      );
    }
    await runDocument.delete();
    counts.runDocuments += 1;

    try {
      const [files] = await getFirebaseStorageBucket().getFiles({
        prefix: `${runtimePaths.storagePrefix}/${SEASON}/${runId}/`,
      });
      for (const file of files) {
        await file.delete();
        counts.storageObjects += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("bucket does not exist")) {
        throw error;
      }
    }
  }

  if (runIds.length > 0) {
    const auditSnapshot = await firestore
      .collection(runtimePaths.auditCollection)
      .where("runId", "in", runIds)
      .get();
    for (let index = 0; index < auditSnapshot.docs.length; index += 450) {
      const batch = firestore.batch();
      auditSnapshot.docs.slice(index, index + 450).forEach((doc) => {
        batch.delete(doc.ref);
        counts.auditDocuments += 1;
      });
      await batch.commit();
    }
  }

  const configDocument = firestore
    .collection(runtimePaths.configCollection)
    .doc(String(SEASON));
  if (initialConfig) {
    await configDocument.set(initialConfig);
    counts.configRestored = true;
  } else {
    await configDocument.delete();
    counts.configDeleted = true;
  }

  const initialActiveRunId =
    typeof initialConfig?.activeRunId === "string"
      ? initialConfig.activeRunId
      : null;
  if (initialActiveRunId && initialActiveRun) {
    await firestore
      .collection(runtimePaths.runsCollection)
      .doc(initialActiveRunId)
      .set(initialActiveRun);
  }

  return counts;
}

async function main() {
  const keepTestData = process.argv.includes("--keep-test-data");
  const runtimePaths = assertSafeEnvironment();
  const runIds: string[] = [];
  const tempDirectory = await mkdtemp(
    path.join(os.tmpdir(), "auction-refresh-smoke-")
  );
  const configDocument = firestore
    .collection(runtimePaths.configCollection)
    .doc(String(SEASON));
  const initialConfigSnapshot = await configDocument.get();
  const initialConfig = initialConfigSnapshot.exists
    ? (initialConfigSnapshot.data() ?? null)
    : null;
  const initialActiveRunId =
    typeof initialConfig?.activeRunId === "string"
      ? initialConfig.activeRunId
      : null;
  const initialActiveRunSnapshot = initialActiveRunId
    ? await firestore
        .collection(runtimePaths.runsCollection)
        .doc(initialActiveRunId)
        .get()
    : null;
  const initialActiveRun =
    initialActiveRunSnapshot?.exists === true
      ? (initialActiveRunSnapshot.data() ?? null)
      : null;
  let cleanupCompleted = false;

  console.log(
    JSON.stringify(
      {
        testEnvironment: {
          firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
          firestoreEmulatorHost: runtimePaths.firestoreEmulatorHost,
          storageEmulatorHost: runtimePaths.storageEmulatorHost,
          testMode: runtimePaths.testMode,
          runsCollection: runtimePaths.runsCollection,
          configCollection: runtimePaths.configCollection,
          auditCollection: runtimePaths.auditCollection,
          storagePrefix: runtimePaths.storagePrefix,
        },
      },
      null,
      2
    )
  );
  await assertStorageAvailable();

  try {
    const runA = await createAuctionValueRefreshRun({
      season: SEASON,
      actor: TEST_ACTOR,
    });
    runIds.push(runA.runId);
    const uploadedA = await uploadSources(runA.runId, FULL_SOURCE_SET);
    uploadedA.forEach((source) => assertNoForbiddenPayloadKeys(source));

    const validatedA = await validateAuctionValueRefreshRun({
      runId: runA.runId,
      actor: TEST_ACTOR,
    });
    assertNoForbiddenPayloadKeys(validatedA);
    assertSourceSummariesPass(validatedA, FULL_SOURCE_SET);
    await assertQualitySummaryExists(runA.runId, runtimePaths.runsCollection);

    const publishedA = await publishAuctionValueRefreshRun({
      runId: runA.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(publishedA.status, "published", "Run A should publish.");
    await assertPublishedConfig({
      runId: runA.runId,
      expectedPreviousRunId: initialActiveRunId,
      expectedSourceKeys: FULL_SOURCE_SET,
      runtimePaths,
    });
    const statusAfterA = await readAuctionValueStatus(SEASON);
    assert.equal(
      statusAfterA.activeRun?.runId,
      runA.runId,
      statusAfterA.fallbackWarning ?? "Status response activeRun mismatch."
    );
    const activeMasterviewA = await readPublishedMasterviewFromFirestore(SEASON);
    assert.ok(activeMasterviewA, "Run A active Masterview should load.");
    assert.equal(activeMasterviewA?.activeRunId, runA.runId);
    assertPositiveCount(activeMasterviewA?.rowCount, "Run A active rows");
    assertSourcesEqual(
      activeMasterviewA?.includedSourceKeys ?? [],
      FULL_SOURCE_SET,
      "Run A active sources"
    );

    const runB = await createAuctionValueRefreshRun({
      season: SEASON,
      actor: TEST_ACTOR,
      requiredSourceKeys: TWO_SOURCE_SET,
    });
    runIds.push(runB.runId);
    await uploadSources(runB.runId, TWO_SOURCE_SET);
    const validatedB = await validateAuctionValueRefreshRun({
      runId: runB.runId,
      actor: TEST_ACTOR,
    });
    assertSourceSummariesPass(validatedB, TWO_SOURCE_SET);
    assert.equal(validatedB.sourceKeys.includes("lineupexperts"), false);
    assert.equal(validatedB.includedSourceKeys.includes("lineupexperts"), false);

    const publishedB = await publishAuctionValueRefreshRun({
      runId: runB.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(publishedB.status, "published", "Run B should publish.");
    await assertPublishedConfig({
      runId: runB.runId,
      expectedPreviousRunId: runA.runId,
      expectedSourceKeys: TWO_SOURCE_SET,
      runtimePaths,
    });
    const statusAfterB = await readAuctionValueStatus(SEASON);
    assert.equal(statusAfterB.activeRun?.runId, runB.runId);
    assert.equal(statusAfterB.previousRun?.runId, runA.runId);
    assert.equal(statusAfterB.previousRun?.status, "superseded");
    const activeMasterviewB = await readPublishedMasterviewFromFirestore(SEASON);
    assert.equal(activeMasterviewB?.activeRunId, runB.runId);
    assertSourcesEqual(
      activeMasterviewB?.includedSourceKeys ?? [],
      TWO_SOURCE_SET,
      "Run B active sources"
    );
    assert.equal(
      countLineupExpertsValues(activeMasterviewB),
      0,
      "Run B should not include stale Lineup Experts values."
    );
    assert.ok(
      activeMasterviewB?.rows.every((row) => (row.sourceCount ?? 0) <= 2),
      "Run B source counts should reflect only two sources."
    );

    const rollbackStatus = await rollbackAuctionValueRefresh({
      season: SEASON,
      actor: TEST_ACTOR,
    });
    assert.equal(rollbackStatus.activeRun?.runId, runA.runId);
    assert.equal(rollbackStatus.previousRun?.runId, runB.runId);
    await assertAuditActionExists({
      runId: runA.runId,
      action: "rolled-back",
      auditCollection: runtimePaths.auditCollection,
    });
    const restoredMasterview = await readPublishedMasterviewFromFirestore(SEASON);
    assert.equal(restoredMasterview?.activeRunId, runA.runId);
    assert.equal(restoredMasterview?.rowCount, activeMasterviewA?.rowCount);
    assertSourcesEqual(
      restoredMasterview?.includedSourceKeys ?? [],
      FULL_SOURCE_SET,
      "Rollback restored sources"
    );

    const invalidFixture = path.join(tempDirectory, "empty-fantasypros.csv");
    await writeFile(invalidFixture, "player,position,team,value\n", "utf8");
    const runC = await createAuctionValueRefreshRun({
      season: SEASON,
      actor: TEST_ACTOR,
      requiredSourceKeys: ["fantasypros"],
    });
    runIds.push(runC.runId);
    await uploadAuctionValueSource({
      runId: runC.runId,
      sourceKey: "fantasypros",
      fileName: path.basename(invalidFixture),
      fileBuffer: await readFile(invalidFixture),
      actor: TEST_ACTOR,
    });
    const validatedC = await validateAuctionValueRefreshRun({
      runId: runC.runId,
      actor: TEST_ACTOR,
    });
    assert.ok(
      ["blocked", "failed"].includes(validatedC.status),
      "Run C should block or fail validation."
    );
    assert.ok(
      validatedC.qualityGates.some((gate) => gate.level === "fail"),
      "Run C should save blocking quality gates."
    );
    await assert.rejects(
      publishAuctionValueRefreshRun({ runId: runC.runId, actor: TEST_ACTOR }),
      /validated and pass quality gates/
    );
    const statusAfterC = await readAuctionValueStatus(SEASON);
    assert.equal(statusAfterC.activeRun?.runId, runA.runId);
    await assertAuditActionExists({
      runId: runC.runId,
      action: "validation-blocked",
      auditCollection: runtimePaths.auditCollection,
    });
    assertNoForbiddenPayloadKeys(statusAfterC);

    const noActiveFallback = await readPublishedMasterviewFromFirestore(2099);
    assert.equal(noActiveFallback, null);

    const result = {
      runA: {
        runId: runA.runId,
        uploadedSources: FULL_SOURCE_SET,
        generatedPlayers: validatedA.generatedPlayerCount,
        sourceValues: validatedA.sourceValueCount,
        activeMasterviewRows: activeMasterviewA?.rowCount ?? 0,
      },
      runB: {
        runId: runB.runId,
        uploadedSources: TWO_SOURCE_SET,
        generatedPlayers: validatedB.generatedPlayerCount,
        sourceValues: validatedB.sourceValueCount,
        lineupExpertsValuesInActiveMasterview:
          countLineupExpertsValues(activeMasterviewB),
      },
      rollback: {
        restoredRunId: rollbackStatus.activeRun?.runId ?? null,
        previousRunId: rollbackStatus.previousRun?.runId ?? null,
      },
      blockedRun: {
        runId: runC.runId,
        status: validatedC.status,
        failedGates: validatedC.qualityGates
          .filter((gate) => gate.level === "fail")
          .map((gate) => gate.id),
      },
      privacyAssertions: {
        statusPayloadHasRawRows: false,
        routeFacingSummariesExposeRawCsv: false,
      },
      warRoomLoader: {
        activeRunId: restoredMasterview?.activeRunId ?? null,
        includedSources: restoredMasterview?.includedSourceKeys ?? [],
        noActiveRunReturnsNull: noActiveFallback === null,
      },
    };

    if (keepTestData) {
      console.log(JSON.stringify({ ...result, cleanup: "kept" }, null, 2));
      return;
    }

    const cleanupCounts = await cleanup({
      runIds,
      runtimePaths,
      initialConfig,
      initialActiveRun,
    });
    cleanupCompleted = true;
    console.log(JSON.stringify({ ...result, cleanup: cleanupCounts }, null, 2));
  } finally {
    if (!keepTestData && !cleanupCompleted && runIds.length > 0) {
      try {
        const cleanupCounts = await cleanup({
          runIds,
          runtimePaths,
          initialConfig,
          initialActiveRun,
        });
        console.error(
          JSON.stringify({ cleanupAfterFailure: cleanupCounts }, null, 2)
        );
      } catch (cleanupError) {
        console.error(
          cleanupError instanceof Error
            ? { cleanupError: cleanupError.message }
            : { cleanupError }
        );
      }
    }
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? { error: error.message, stack: error.stack }
      : { error }
  );
  process.exitCode = 1;
});
