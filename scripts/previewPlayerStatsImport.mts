import { config as loadEnv } from "dotenv";
import {
  buildPlayerStatsImportPreview,
  formatPlayerStatsImportPreview,
  loadPlayerStatsSnapshot,
  type ExistingPlayerStatsDoc,
  DEFAULT_PLAYER_STATS_MAX_AGE_DAYS,
} from "../lib/trade/playerStatsImportPreview";

const DEFAULT_LEAGUE_ID = "1312149033254416384";

interface CliOptions {
  leagueId: string;
  snapshotPath?: string;
  maxAgeDays: number;
  json: boolean;
  skipFirestore: boolean;
  help: boolean;
}

interface SleeperRoster {
  players?: Array<string | number | null>;
}

interface AdminFirestoreLike {
  collection: (path: string) => {
    get: () => Promise<{
      docs: Array<{
        id: string;
        data: () => Record<string, unknown>;
      }>;
    }>;
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
    leagueId: DEFAULT_LEAGUE_ID,
    maxAgeDays: DEFAULT_PLAYER_STATS_MAX_AGE_DAYS,
    json: false,
    skipFirestore: false,
    help: false,
  };

  args.forEach((arg, index) => {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    if (arg === "--json") {
      options.json = true;
      return;
    }

    if (arg === "--skip-firestore") {
      options.skipFirestore = true;
      return;
    }

    if (arg === "--snapshot" || arg.startsWith("--snapshot=")) {
      options.snapshotPath = readArgValue(args, index);
      return;
    }

    if (arg === "--league-id" || arg.startsWith("--league-id=")) {
      options.leagueId = readArgValue(args, index) ?? DEFAULT_LEAGUE_ID;
      return;
    }

    if (arg === "--max-age-days" || arg.startsWith("--max-age-days=")) {
      const maxAgeDays = Number(readArgValue(args, index));
      if (Number.isFinite(maxAgeDays) && maxAgeDays >= 0) {
        options.maxAgeDays = maxAgeDays;
      }
    }
  });

  return options;
}

function printHelp() {
  console.log(`Player Stats Import Preview

Read-only checks for a future player_stats import. This script reads Sleeper
rosters, reads Firestore player_stats, and validates a local snapshot if one
exists. It does not write Firestore and does not call FantasyPros or projection
APIs.

Usage:
  npx tsx scripts/previewPlayerStatsImport.mts [options]

Options:
  --snapshot <path>       Local Sleeper-ID-keyed valuation snapshot to validate
  --league-id <id>        Sleeper league ID (default: 2026 River City league)
  --max-age-days <days>   Stale generatedAt threshold (default: 30)
  --skip-firestore        Validate snapshot and Sleeper coverage without reading Firestore
  --json                  Print machine-readable JSON
  --help                  Show this help text
`);
}

async function fetchActiveRosterPlayerIds(leagueId: string): Promise<string[]> {
  const response = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Sleeper rosters: ${response.status}`);
  }

  const rosters = (await response.json()) as SleeperRoster[];
  const playerIds = new Set<string>();

  rosters.forEach((roster) => {
    roster.players?.forEach((playerId) => {
      if (playerId !== null && playerId !== undefined) {
        playerIds.add(String(playerId));
      }
    });
  });

  return [...playerIds].sort((a, b) => a.localeCompare(b));
}

function loadLocalEnvFiles() {
  loadEnv({ path: ".env.local", override: false, quiet: true });
  loadEnv({ override: false, quiet: true });
}

function buildFirestoreCredentialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return new Error(
    [
      "Unable to read Firestore player_stats with the Admin SDK.",
      "No Firestore writes were attempted.",
      "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local or .env.",
      "To validate only the local snapshot and Sleeper roster coverage, rerun with --skip-firestore.",
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

async function readExistingPlayerStatsDocsSafely(
  db: AdminFirestoreLike
): Promise<ExistingPlayerStatsDoc[]> {
  try {
    return await readExistingPlayerStatsDocs(db);
  } catch (error) {
    throw buildFirestoreCredentialError(error);
  }
}

async function readExistingPlayerStatsDocs(
  db: AdminFirestoreLike
): Promise<ExistingPlayerStatsDoc[]> {
  const snapshot = await db.collection("player_stats").get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const totalValueScore = Number(data.totalValueScore ?? 0);
    const generatedAt =
      typeof data.generatedAt === "string" && data.generatedAt.trim()
        ? data.generatedAt.trim()
        : null;

    return {
      sleeperPlayerId: doc.id,
      totalValueScore: Number.isFinite(totalValueScore) ? totalValueScore : 0,
      generatedAt,
    };
  });
}

async function terminateFirestore(db: AdminFirestoreLike | null) {
  if (typeof db?.terminate === "function") {
    await db.terminate().catch(() => undefined);
  }
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  let db: AdminFirestoreLike | null = null;

  try {
    const snapshot = loadPlayerStatsSnapshot(
      process.cwd(),
      options.snapshotPath
    );
    const firestoreDocsPromise = options.skipFirestore
      ? Promise.resolve([])
      : loadAdminFirestore().then((loadedDb) => {
          db = loadedDb;
          return readExistingPlayerStatsDocsSafely(loadedDb);
        });

    const [activeRosterPlayerIds, existingPlayerStatsDocs] = await Promise.all([
      fetchActiveRosterPlayerIds(options.leagueId),
      firestoreDocsPromise,
    ]);

    const preview = buildPlayerStatsImportPreview({
      activeRosterPlayerIds,
      existingPlayerStatsDocs,
      snapshot,
      maxAgeDays: options.maxAgeDays,
    });

    if (options.json) {
      console.log(JSON.stringify(preview, null, 2));
    } else {
      console.log(formatPlayerStatsImportPreview(preview));
      if (options.skipFirestore) {
        console.log("");
        console.log("Firestore read skipped by --skip-firestore.");
      }
    }

    if (preview.parseError || preview.invalidRows.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await terminateFirestore(db);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
