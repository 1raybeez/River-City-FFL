import { readFileSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const DEFAULT_SNAPSHOT_PATH = "data/trade-analyzer/player-stats-2026.json";
const PLAYER_STATS_COLLECTION = "player_stats";
const FIRESTORE_BATCH_LIMIT = 500;

interface CliOptions {
  snapshotPath: string;
  write: boolean;
  checkAuth: boolean;
  help: boolean;
}

interface SnapshotFile {
  generatedAt?: string | null;
  sourceDetail?: string | null;
  sourceVersion?: string | null;
  players?: Record<string, unknown>;
}

interface InvalidImportRow {
  sleeperPlayerId: string;
  reasons: string[];
}

interface ValidImportRow {
  sleeperPlayerId: string;
  data: Record<string, unknown>;
}

interface SnapshotImportValidation {
  path: string;
  validRows: ValidImportRow[];
  invalidRows: InvalidImportRow[];
  parseError: string | null;
}

interface FirestoreBatchLike {
  set: (
    ref: unknown,
    data: Record<string, unknown>,
    options: { merge: true }
  ) => void;
  commit: () => Promise<unknown>;
}

interface AdminFirestoreLike {
  batch: () => FirestoreBatchLike;
  collection: (path: string) => {
    doc: (id: string) => unknown;
    limit: (limit: number) => {
      get: () => Promise<{
        size: number;
      }>;
    };
  };
  terminate?: () => Promise<void>;
}

function readArgValue(args: string[], index: number): string | undefined {
  const arg = args[index];
  const inlineValue = arg.includes("=") ? arg.split("=").slice(1).join("=") : "";
  if (inlineValue) return inlineValue;
  return args[index + 1];
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    snapshotPath: DEFAULT_SNAPSHOT_PATH,
    write: false,
    checkAuth: false,
    help: false,
  };

  args.forEach((arg, index) => {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    if (arg === "--write") {
      options.write = true;
      return;
    }

    if (arg === "--check-auth") {
      options.checkAuth = true;
      return;
    }

    if (arg === "--snapshot" || arg.startsWith("--snapshot=")) {
      options.snapshotPath = readArgValue(args, index) ?? DEFAULT_SNAPSHOT_PATH;
    }
  });

  return options;
}

function printHelp() {
  console.log(`Player Stats Firestore Import

Dry-run-first importer for the approved Trade Analyzer FantasyCalc snapshot.
Default mode validates the local snapshot only and performs no Firestore reads
or writes. Use --write to upsert validated rows into player_stats/{Sleeper ID}.

Usage:
  npm run import-player-stats
  npm run import-player-stats -- --check-auth
  npm run import-player-stats -- --write

Options:
  --snapshot <path>  Snapshot path (default: ${DEFAULT_SNAPSHOT_PATH})
  --check-auth       Print redacted Admin SDK credential diagnostics and perform a harmless Firestore read
  --write            Upsert validated snapshot rows into Firestore
  --help             Show this help text
`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return readString(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isParseableDate(value: string | null): value is string {
  return value !== null && !Number.isNaN(Date.parse(value));
}

function parseSnapshot(
  cwd: string,
  snapshotPath: string
): SnapshotImportValidation {
  const resolvedPath = path.isAbsolute(snapshotPath)
    ? snapshotPath
    : path.join(cwd, snapshotPath);

  try {
    const parsed = JSON.parse(readFileSync(resolvedPath, "utf8")) as unknown;
    return validateSnapshotFile(resolvedPath, parsed);
  } catch (error) {
    return {
      path: resolvedPath,
      validRows: [],
      invalidRows: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateSnapshotFile(
  snapshotPath: string,
  parsed: unknown
): SnapshotImportValidation {
  if (!isRecord(parsed)) {
    return {
      path: snapshotPath,
      validRows: [],
      invalidRows: [
        {
          sleeperPlayerId: "(snapshot)",
          reasons: ["snapshot must be a JSON object"],
        },
      ],
      parseError: null,
    };
  }

  const snapshot = parsed as SnapshotFile;
  if (!isRecord(snapshot.players)) {
    return {
      path: snapshotPath,
      validRows: [],
      invalidRows: [
        {
          sleeperPlayerId: "(snapshot)",
          reasons: ["snapshot must include a players object"],
        },
      ],
      parseError: null,
    };
  }

  const defaults = {
    generatedAt: readOptionalString(snapshot.generatedAt),
    sourceDetail: readOptionalString(snapshot.sourceDetail),
    sourceVersion: readOptionalString(snapshot.sourceVersion),
  };

  const validRows: ValidImportRow[] = [];
  const invalidRows: InvalidImportRow[] = [];

  Object.entries(snapshot.players).forEach(([sleeperPlayerId, row]) => {
    const normalized = normalizeImportRow(sleeperPlayerId, row, defaults);

    if ("reasons" in normalized) {
      invalidRows.push(normalized);
    } else {
      validRows.push(normalized);
    }
  });

  return {
    path: snapshotPath,
    validRows,
    invalidRows,
    parseError: null,
  };
}

function normalizeImportRow(
  sleeperPlayerId: string,
  row: unknown,
  defaults: {
    generatedAt: string | null;
    sourceDetail: string | null;
    sourceVersion: string | null;
  }
): ValidImportRow | InvalidImportRow {
  const reasons: string[] = [];

  if (!sleeperPlayerId.trim()) {
    reasons.push("Sleeper player ID key cannot be empty");
  }

  if (!isRecord(row)) {
    return {
      sleeperPlayerId: sleeperPlayerId || "(empty key)",
      reasons: [...reasons, "row must be an object"],
    };
  }

  const embeddedPlayerId = readString(row.playerId);
  if (embeddedPlayerId && embeddedPlayerId !== sleeperPlayerId) {
    reasons.push("playerId does not match the Sleeper ID key");
  }

  if (!isFiniteNumber(row.totalValueScore) || row.totalValueScore <= 0) {
    reasons.push("totalValueScore must be a positive number");
  }

  const keeperCost =
    row.keeperCost === null || row.keeperCost === undefined ? 0 : row.keeperCost;
  if (!isFiniteNumber(keeperCost) || keeperCost < 0) {
    reasons.push("keeperCost must be a non-negative number when provided");
  }

  const valueSource = readString(row.valueSource);
  if (!valueSource) {
    reasons.push("valueSource is required");
  }

  const generatedAt =
    readOptionalString(row.generatedAt) ?? defaults.generatedAt;
  if (!isParseableDate(generatedAt)) {
    reasons.push("generatedAt must exist and be a parseable date string");
  }

  const sourceDetail =
    readOptionalString(row.sourceDetail) ?? defaults.sourceDetail;
  if (!sourceDetail) {
    reasons.push("sourceDetail is required");
  }

  const sourceVersion =
    readOptionalString(row.sourceVersion) ?? defaults.sourceVersion;
  if (!sourceVersion) {
    reasons.push("sourceVersion is required");
  }

  const notes = row.notes;
  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    reasons.push("notes must be a string when provided");
  }

  if (reasons.length > 0) {
    return {
      sleeperPlayerId: sleeperPlayerId || "(empty key)",
      reasons,
    };
  }

  return {
    sleeperPlayerId,
    data: {
      ...row,
      playerId: embeddedPlayerId ?? sleeperPlayerId,
      totalValueScore: row.totalValueScore,
      keeperCost,
      valueSource,
      generatedAt,
      sourceDetail,
      sourceVersion,
      notes: typeof notes === "string" ? notes : "",
    },
  };
}

function formatImportValidation(
  validation: SnapshotImportValidation,
  write: boolean
): string {
  const lines = [
    "Player Stats Firestore Import",
    "-----------------------------",
    `Mode: ${write ? "write" : "dry run"}`,
    `Snapshot path: ${validation.path}`,
    `Snapshot parse error: ${validation.parseError ?? "(none)"}`,
    `Valid import rows: ${validation.validRows.length}`,
    `Invalid rows: ${validation.invalidRows.length}`,
    `Target collection: ${PLAYER_STATS_COLLECTION}/{sleeperPlayerId}`,
    write
      ? `Firestore writes requested: ${validation.validRows.length}`
      : "Firestore writes: none",
    "Missing kickers, defenses, Philip Rivers, and Taysom Hill are allowed because they are not part of the approved FantasyCalc snapshot rows.",
  ];

  if (validation.invalidRows.length > 0) {
    lines.push("Invalid row details:");
    validation.invalidRows.slice(0, 25).forEach((row) => {
      lines.push(`- ${row.sleeperPlayerId}: ${row.reasons.join("; ")}`);
    });
    if (validation.invalidRows.length > 25) {
      lines.push(`- ... ${validation.invalidRows.length - 25} more`);
    }
  }

  if (!write) {
    lines.push("Dry run complete. Re-run with --write to upsert these rows.");
  }

  return lines.join("\n");
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

function getCredentialDiagnostics() {
  const projectId = readOptionalString(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = readOptionalString(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const normalizedPrivateKey = privateKey.replace(/\\n/g, "\n");

  return {
    projectId,
    clientEmail,
    hasPrivateKey: privateKey.trim().length > 0,
    hasBeginPrivateKey: normalizedPrivateKey.includes(
      "-----BEGIN PRIVATE KEY-----"
    ),
    hasEndPrivateKey: normalizedPrivateKey.includes("-----END PRIVATE KEY-----"),
  };
}

function printAuthFailureGuidance(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  console.log("Firestore auth check: failure");
  console.log(`Error: ${message}`);
  console.log("Likely causes:");
  console.log("- service account deleted/disabled");
  console.log("- key does not match client email");
  console.log("- wrong Firebase project");
  console.log("- malformed private key newlines");
  console.log("Firestore writes: none");
}

async function runAuthCheck() {
  loadLocalEnvFiles();

  const diagnostics = getCredentialDiagnostics();
  console.log("Player Stats Firestore Auth Check");
  console.log("----------------------------------");
  console.log(`FIREBASE_PROJECT_ID: ${diagnostics.projectId ?? "(missing)"}`);
  console.log(
    `FIREBASE_CLIENT_EMAIL: ${diagnostics.clientEmail ?? "(missing)"}`
  );
  console.log(
    `FIREBASE_PRIVATE_KEY exists: ${diagnostics.hasPrivateKey ? "yes" : "no"}`
  );
  console.log(
    `Private key has BEGIN PRIVATE KEY: ${
      diagnostics.hasBeginPrivateKey ? "yes" : "no"
    }`
  );
  console.log(
    `Private key has END PRIVATE KEY: ${
      diagnostics.hasEndPrivateKey ? "yes" : "no"
    }`
  );
  console.log(`Harmless read target: ${PLAYER_STATS_COLLECTION} limit 1`);

  let db: AdminFirestoreLike | null = null;
  try {
    db = await loadAdminFirestore();
    const snapshot = await db.collection(PLAYER_STATS_COLLECTION).limit(1).get();
    console.log("Firestore auth check: success");
    console.log(`Read succeeded; docs returned: ${snapshot.size}`);
    console.log("Firestore writes: none");
  } catch (error) {
    printAuthFailureGuidance(error);
    process.exitCode = 1;
  } finally {
    await terminateFirestore(db);
  }
}

async function terminateFirestore(db: AdminFirestoreLike | null) {
  if (typeof db?.terminate === "function") {
    await db.terminate().catch(() => undefined);
  }
}

async function writeRowsToFirestore(
  db: AdminFirestoreLike,
  rows: ValidImportRow[]
) {
  if (rows.length > FIRESTORE_BATCH_LIMIT) {
    throw new Error(
      `Refusing to write ${rows.length} rows because a single Firestore batch is limited to ${FIRESTORE_BATCH_LIMIT}. No Firestore writes were attempted.`
    );
  }

  const batch = db.batch();
  rows.forEach((row) => {
    const ref = db.collection(PLAYER_STATS_COLLECTION).doc(row.sleeperPlayerId);
    batch.set(ref, row.data, { merge: true });
  });
  await batch.commit();
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.checkAuth) {
    await runAuthCheck();
    return;
  }

  const validation = parseSnapshot(process.cwd(), options.snapshotPath);
  console.log(formatImportValidation(validation, options.write));

  if (validation.parseError || validation.invalidRows.length > 0) {
    if (options.write) {
      console.error("Refusing to write because snapshot validation failed.");
    }
    process.exitCode = 1;
    return;
  }

  if (!options.write) {
    return;
  }

  let db: AdminFirestoreLike | null = null;
  try {
    db = await loadAdminFirestore();
    await writeRowsToFirestore(db, validation.validRows);
    console.log(
      `Upserted ${validation.validRows.length} docs into ${PLAYER_STATS_COLLECTION}.`
    );
  } finally {
    await terminateFirestore(db);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
