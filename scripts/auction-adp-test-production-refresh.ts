import { AssertionError, strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { firestore, getFirebaseStorageBucket } from "../lib/firebaseAdmin";
import type { AuctionAccessSession } from "../lib/auth/auctionAccess";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import type { AuctionAdpSourceKey } from "../lib/auction/adpTypes";
import {
  createAuctionAdpRefreshRun,
  getAuctionAdpRefreshRuntimePaths,
  publishAuctionAdpRefreshRun,
  readAuctionAdpStatus,
  readPublishedAdpConsensusFromFirestore,
  rollbackAuctionAdpRefresh,
  uploadAuctionAdpSource,
  validateAuctionAdpRefreshRun,
} from "../lib/auction/adpRefreshService";

const SEASON = 2026;
const FULL_SOURCE_SET: AuctionAdpSourceKey[] = [
  "fantasypros-adp",
  "rotowire-adp",
  "lineupexperts-adp",
  "draftsharks-adp",
  "fantasyfootballers-adp",
];
const ONE_SOURCE_SET: AuctionAdpSourceKey[] = ["fantasypros-adp"];
const SOURCE_FIXTURES: Record<AuctionAdpSourceKey, string> = {
  "fantasypros-adp": "data/auction/adp/source-imports/exports/fantasypros-adp-2026.csv",
  "rotowire-adp": "data/auction/adp/source-imports/exports/rotowire-adp-2026.csv",
  "lineupexperts-adp": "data/auction/adp/source-imports/exports/lineupexperts-adp-2026.csv",
  "draftsharks-adp": "data/auction/adp/source-imports/exports/draftsharks-adp-2026.csv",
  "fantasyfootballers-adp": "data/auction/adp/source-imports/exports/fantasyfootballers-adp-2026.csv",
};
const TEST_ACTOR: AuctionAccessSession = {
  email: "auction-adp-smoke@river-city.local",
  decodedToken: {
    uid: "auction-adp-smoke",
    email: "auction-adp-smoke@river-city.local",
    email_verified: true,
  } as AuctionAccessSession["decodedToken"],
  access: buildCommissionerAccessResult("auction-adp-smoke@river-city.local"),
};

function assertSafeEnvironment() {
  const runtimePaths = getAuctionAdpRefreshRuntimePaths();
  const hasEmulator = Boolean(runtimePaths.firestoreEmulatorHost);
  if (!hasEmulator && !runtimePaths.testMode) {
    throw new Error(
      "Refusing to run ADP smoke test without Firebase emulator or AUCTION_ADP_TEST_MODE=true."
    );
  }
  if (
    runtimePaths.testMode &&
    (!runtimePaths.runsCollection.startsWith("test_") ||
      !runtimePaths.configCollection.startsWith("test_") ||
      !runtimePaths.auditCollection.startsWith("test_") ||
      !runtimePaths.storagePrefix.startsWith("test-"))
  ) {
    throw new Error("ADP test mode is enabled but isolated test paths are not active.");
  }
  return runtimePaths;
}

function sorted(values: readonly string[]) {
  return [...values].sort();
}

function assertSources(actual: readonly string[], expected: readonly string[], label: string) {
  assert.deepEqual(sorted(actual), sorted(expected), label);
}

function assertPositive(value: number | null | undefined, label: string) {
  assert.equal(typeof value, "number", `${label} should be numeric.`);
  assert.ok((value ?? 0) > 0, `${label} should be positive.`);
}

function assertNoRawPayload(value: unknown, pathLabel = "payload") {
  if (!value || typeof value !== "object") return;
  for (const [key, nestedValue] of Object.entries(value)) {
    assert.notEqual(key, "rows", `${pathLabel} should not expose rows.`);
    assert.notEqual(key, "raw", `${pathLabel} should not expose raw data.`);
    assert.notEqual(key, "rawCsv", `${pathLabel} should not expose raw CSV.`);
    assert.notEqual(key, "text", `${pathLabel} should not expose CSV text.`);
    assertNoRawPayload(nestedValue, `${pathLabel}.${key}`);
  }
}

async function assertStorageAvailable() {
  const bucket = getFirebaseStorageBucket();
  try {
    const [exists] = await bucket.exists();
    assert.equal(
      exists,
      true,
      `Firebase Storage bucket ${bucket.name} does not exist.`
    );
  } catch (error) {
    if (error instanceof AssertionError) throw error;
    throw new Error(
      error instanceof Error ? `Storage preflight failed: ${error.message}` : "Storage preflight failed."
    );
  }
}

async function uploadSources(runId: string, sourceKeys: readonly AuctionAdpSourceKey[]) {
  for (const sourceKey of sourceKeys) {
    await uploadAuctionAdpSource({
      runId,
      sourceKey,
      fileName: path.basename(SOURCE_FIXTURES[sourceKey]),
      fileBuffer: await readFile(SOURCE_FIXTURES[sourceKey]),
      actor: TEST_ACTOR,
    });
  }
}

function countRotoWireValues(consensus: Awaited<ReturnType<typeof readPublishedAdpConsensusFromFirestore>>) {
  return consensus?.sourceFiles.filter((sourceKey) => sourceKey === "rotowire-adp").length ?? 0;
}

async function deleteCollectionDocuments(collectionRef: FirebaseFirestore.CollectionReference) {
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
}: {
  runIds: string[];
  runtimePaths: ReturnType<typeof getAuctionAdpRefreshRuntimePaths>;
  initialConfig: FirebaseFirestore.DocumentData | null;
}) {
  const counts = {
    runDocuments: 0,
    subcollectionDocuments: 0,
    auditDocuments: 0,
    storageObjects: 0,
    configRestored: false,
    configDeleted: false,
  };
  const subcollections = [
    "sources",
    "quality",
    "consensus_chunks",
    "source_chunks_fantasypros-adp",
    "source_chunks_rotowire-adp",
  ];

  for (const runId of runIds) {
    const runDocument = firestore.collection(runtimePaths.runsCollection).doc(runId);
    for (const subcollection of subcollections) {
      counts.subcollectionDocuments += await deleteCollectionDocuments(
        runDocument.collection(subcollection)
      );
    }
    await runDocument.delete();
    counts.runDocuments += 1;

    const [files] = await getFirebaseStorageBucket().getFiles({
      prefix: `${runtimePaths.storagePrefix}/${SEASON}/${runId}/`,
    });
    for (const file of files) {
      await file.delete();
      counts.storageObjects += 1;
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
  return counts;
}

async function main() {
  const keepTestData = process.argv.includes("--keep-test-data");
  const runtimePaths = assertSafeEnvironment();
  const runIds: string[] = [];
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "auction-adp-smoke-"));
  const configSnapshot = await firestore
    .collection(runtimePaths.configCollection)
    .doc(String(SEASON))
    .get();
  const initialConfig = configSnapshot.exists ? configSnapshot.data() ?? null : null;
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
    const runA = await createAuctionAdpRefreshRun({ season: SEASON, actor: TEST_ACTOR });
    runIds.push(runA.runId);
    await uploadSources(runA.runId, FULL_SOURCE_SET);
    const validatedA = await validateAuctionAdpRefreshRun({
      runId: runA.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(validatedA.status, "validated");
    assert.equal(validatedA.qualityGateStatus, "pass");
    assertSources(validatedA.includedSourceKeys, FULL_SOURCE_SET, "Run A sources");
    assertPositive(validatedA.generatedPlayerCount, "Run A players");
    assertPositive(validatedA.sourceValueCount, "Run A source values");
    const publishedA = await publishAuctionAdpRefreshRun({
      runId: runA.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(publishedA.status, "published");
    const statusAfterA = await readAuctionAdpStatus(SEASON);
    assert.equal(statusAfterA.activeRun?.runId, runA.runId);
    assertNoRawPayload(statusAfterA);
    const activeA = await readPublishedAdpConsensusFromFirestore(SEASON);
    assert.equal(activeA?.activeRunId, runA.runId);
    assertPositive(activeA?.rowCount, "Run A active rows");
    const nico = activeA?.rows.find((row) => row.playerName === "Nico Collins");
    assert.ok(nico, "Nico Collins should appear in ADP consensus.");
    assert.equal(nico?.sourceCount, 2);

    const runB = await createAuctionAdpRefreshRun({
      season: SEASON,
      actor: TEST_ACTOR,
      requiredSourceKeys: ONE_SOURCE_SET,
    });
    runIds.push(runB.runId);
    await uploadSources(runB.runId, ONE_SOURCE_SET);
    const validatedB = await validateAuctionAdpRefreshRun({
      runId: runB.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(validatedB.status, "validated");
    assertSources(validatedB.includedSourceKeys, ONE_SOURCE_SET, "Run B sources");
    assert.equal(validatedB.includedSourceKeys.includes("rotowire-adp"), false);
    await publishAuctionAdpRefreshRun({ runId: runB.runId, actor: TEST_ACTOR });
    const activeB = await readPublishedAdpConsensusFromFirestore(SEASON);
    assert.equal(activeB?.activeRunId, runB.runId);
    assertSources(activeB?.includedSourceKeys ?? [], ONE_SOURCE_SET, "Run B active sources");
    assert.equal(countRotoWireValues(activeB), 0);

    const rollbackStatus = await rollbackAuctionAdpRefresh({
      season: SEASON,
      actor: TEST_ACTOR,
    });
    assert.equal(rollbackStatus.activeRun?.runId, runA.runId);
    assert.equal(rollbackStatus.previousRun?.runId, runB.runId);
    const restored = await readPublishedAdpConsensusFromFirestore(SEASON);
    assert.equal(restored?.activeRunId, runA.runId);

    const invalidFixture = path.join(tempDirectory, "empty-fantasypros-adp.csv");
    await writeFile(invalidFixture, "RK,PLAYER NAME,TEAM,POS\n", "utf8");
    const runC = await createAuctionAdpRefreshRun({
      season: SEASON,
      actor: TEST_ACTOR,
      requiredSourceKeys: ["fantasypros-adp"],
    });
    runIds.push(runC.runId);
    await uploadAuctionAdpSource({
      runId: runC.runId,
      sourceKey: "fantasypros-adp",
      fileName: path.basename(invalidFixture),
      fileBuffer: await readFile(invalidFixture),
      actor: TEST_ACTOR,
    });
    const validatedC = await validateAuctionAdpRefreshRun({
      runId: runC.runId,
      actor: TEST_ACTOR,
    });
    assert.equal(validatedC.status, "blocked");
    assert.ok(validatedC.qualityGates.some((gate) => gate.level === "fail"));
    await assert.rejects(
      publishAuctionAdpRefreshRun({ runId: runC.runId, actor: TEST_ACTOR }),
      /validated and pass quality gates/
    );
    const statusAfterC = await readAuctionAdpStatus(SEASON);
    assert.equal(statusAfterC.activeRun?.runId, runA.runId);
    assertNoRawPayload(statusAfterC);
    const noActive = await readPublishedAdpConsensusFromFirestore(2099);
    assert.equal(noActive, null);

    const result = {
      runA: {
        runId: runA.runId,
        generatedPlayers: validatedA.generatedPlayerCount,
        sourceValues: validatedA.sourceValueCount,
        activeRows: activeA?.rowCount ?? 0,
        nicoDemandTier: nico?.demandTier ?? null,
      },
      runB: {
        runId: runB.runId,
        generatedPlayers: validatedB.generatedPlayerCount,
        sourceValues: validatedB.sourceValueCount,
        activeSources: activeB?.includedSourceKeys ?? [],
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
      privacy: {
        rawCsvReturned: false,
        normalizedRowsReturnedByStatus: false,
      },
      loader: {
        activeRunId: restored?.activeRunId ?? null,
        noActiveRunReturnsNull: noActive === null,
      },
    };

    if (keepTestData) {
      console.log(JSON.stringify({ ...result, cleanup: "kept" }, null, 2));
      return;
    }

    const cleanupCounts = await cleanup({ runIds, runtimePaths, initialConfig });
    cleanupCompleted = true;
    console.log(JSON.stringify({ ...result, cleanup: cleanupCounts }, null, 2));
  } finally {
    if (!keepTestData && !cleanupCompleted && runIds.length > 0) {
      try {
        const cleanupCounts = await cleanup({ runIds, runtimePaths, initialConfig });
        console.error(JSON.stringify({ cleanupAfterFailure: cleanupCounts }, null, 2));
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
      }
    }
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? { error: error.message, stack: error.stack } : { error });
  process.exitCode = 1;
});
