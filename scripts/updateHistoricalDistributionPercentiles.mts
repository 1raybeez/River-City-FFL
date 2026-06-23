import { config as loadEnv } from "dotenv";

const COLLECTION_ID = "historical_distribution";
const DOC_ID = "imbalance_percentiles";
const TARGET_PATH = `${COLLECTION_ID}/${DOC_ID}`;

const PROPOSED_PERCENTILES = {
  p05: 7.55,
  p10: 13.73,
  p25: 23.33,
  p50: 45.34,
  p75: 84.74,
  p90: 125.28,
  p95: 157.25,
} as const;

type PercentileKey = keyof typeof PROPOSED_PERCENTILES;
type Percentiles = Record<PercentileKey, number>;

interface CliOptions {
  write: boolean;
  help: boolean;
}

interface AdminDocSnapshotLike {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
}

interface AdminDocRefLike {
  get: () => Promise<AdminDocSnapshotLike>;
  update: (data: Record<string, unknown>) => Promise<unknown>;
}

interface AdminFirestoreLike {
  collection: (path: string) => {
    doc: (id: string) => AdminDocRefLike;
  };
  terminate?: () => Promise<void>;
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    help: false,
  };

  args.forEach((arg) => {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    if (arg === "--write") {
      options.write = true;
      return;
    }

    if (arg === "--dry-run") {
      options.write = false;
    }
  });

  return options;
}

function printHelp() {
  console.log(`Historical Distribution Percentiles Update
------------------------------------------
Default mode reads Firestore and prints the current/proposed values only.
Use --write to update ${TARGET_PATH}.percentiles.

Usage:
  npx tsx scripts/updateHistoricalDistributionPercentiles.mts
  npx tsx scripts/updateHistoricalDistributionPercentiles.mts --write

Options:
  --dry-run    Read current values and print the proposed update without writing
  --write      Update only ${TARGET_PATH}.percentiles
  --help       Show this help text
`);
}

function loadLocalEnvFiles() {
  loadEnv({ path: ".env.local", override: false, quiet: true });
  loadEnv({ override: false, quiet: true });
}

function buildFirestoreCredentialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return new Error(
    [
      "Unable to initialize Firestore with the Admin SDK.",
      "No Firestore writes were attempted.",
      "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local or .env.",
      `Original error: ${message}`,
    ].join("\n")
  );
}

async function loadAdminFirestore(): Promise<AdminFirestoreLike> {
  loadLocalEnvFiles();

  try {
    const { firestore } = await import("../lib/firebaseAdmin");
    return firestore as AdminFirestoreLike;
  } catch (error) {
    throw buildFirestoreCredentialError(error);
  }
}

async function terminateFirestore(db: AdminFirestoreLike | null) {
  if (typeof db?.terminate === "function") {
    await db.terminate().catch(() => undefined);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function extractPercentiles(data: Record<string, unknown> | undefined) {
  if (!data || !isRecord(data.percentiles)) return null;
  return data.percentiles;
}

function validateProposedPercentiles(percentiles: Percentiles) {
  const keys = Object.keys(PROPOSED_PERCENTILES) as PercentileKey[];
  const invalidKeys = keys.filter((key) => !isFiniteNumber(percentiles[key]));

  if (invalidKeys.length > 0) {
    throw new Error(
      `Refusing to continue because proposed percentiles are invalid: ${invalidKeys.join(
        ", "
      )}`
    );
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function percentilesMatchStored(stored: unknown) {
  if (!isRecord(stored)) return false;

  return (Object.keys(PROPOSED_PERCENTILES) as PercentileKey[]).every(
    (key) => stored[key] === PROPOSED_PERCENTILES[key]
  );
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  validateProposedPercentiles(PROPOSED_PERCENTILES);

  let db: AdminFirestoreLike | null = null;

  try {
    db = await loadAdminFirestore();
    const docRef = db.collection(COLLECTION_ID).doc(DOC_ID);
    const currentSnap = await docRef.get();
    const currentData = currentSnap.data();
    const currentPercentiles = extractPercentiles(currentData);

    console.log("Historical Distribution Percentiles Update");
    console.log("------------------------------------------");
    console.log(`Mode: ${options.write ? "write" : "dry run"}`);
    console.log(`Target document: ${TARGET_PATH}`);
    console.log("Write scope: percentiles field only");
    console.log("player_stats writes: none");
    console.log("Trade Analyzer UI changes: none");
    console.log("tradeFairnessEngine changes: none");
    console.log(`Current Firestore document exists: ${currentSnap.exists}`);
    console.log("Current Firestore percentiles:");
    console.log(formatJson(currentPercentiles));
    console.log("Proposed percentiles:");
    console.log(formatJson(PROPOSED_PERCENTILES));

    if (!currentSnap.exists) {
      throw new Error(
        `Refusing to write because ${TARGET_PATH} does not exist.`
      );
    }

    if (!options.write) {
      console.log("Firestore writes: none");
      console.log("Dry run complete. Re-run with --write to apply this update.");
      return;
    }

    await docRef.update({ percentiles: PROPOSED_PERCENTILES });

    const finalSnap = await docRef.get();
    const finalPercentiles = extractPercentiles(finalSnap.data());

    console.log("Write confirmation: success");
    console.log("Final stored percentiles:");
    console.log(formatJson(finalPercentiles));

    if (!percentilesMatchStored(finalPercentiles)) {
      throw new Error(
        `Post-write verification failed: ${TARGET_PATH}.percentiles did not match the proposed values.`
      );
    }
  } finally {
    await terminateFirestore(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
