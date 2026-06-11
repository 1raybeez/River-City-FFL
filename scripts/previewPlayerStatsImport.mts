import { collection, getDocs, terminate } from "firebase/firestore";
import type { db as firebaseDb } from "../lib/firebase";
import type {
  ExistingPlayerStatsDoc,
  DEFAULT_PLAYER_STATS_MAX_AGE_DAYS as DefaultMaxAgeDays,
} from "../lib/trade/playerStatsImportPreview";

const DEFAULT_LEAGUE_ID = "1312149033254416384";
const LOCAL_DEFAULT_PLAYER_STATS_MAX_AGE_DAYS = 30 satisfies typeof DefaultMaxAgeDays;

type FirebaseModule = typeof import("../lib/firebase");
type PreviewModule = typeof import("../lib/trade/playerStatsImportPreview");
type FirestoreDb = typeof firebaseDb;

interface CliOptions {
  leagueId: string;
  snapshotPath?: string;
  maxAgeDays: number;
  json: boolean;
  help: boolean;
}

interface SleeperRoster {
  players?: Array<string | number | null>;
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
    maxAgeDays: LOCAL_DEFAULT_PLAYER_STATS_MAX_AGE_DAYS,
    json: false,
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
  node scripts/previewPlayerStatsImport.mts [options]

Options:
  --snapshot <path>       Local Sleeper-ID-keyed valuation snapshot to validate
  --league-id <id>        Sleeper league ID (default: 2026 River City league)
  --max-age-days <days>   Stale generatedAt threshold (default: 30)
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

async function readExistingPlayerStatsDocs(
  db: FirestoreDb
): Promise<ExistingPlayerStatsDoc[]> {
  const snapshot = await getDocs(collection(db, "player_stats"));

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

async function loadRuntimeModules(): Promise<{
  db: FirestoreDb;
  previewModule: PreviewModule;
}> {
  const [firebaseModule, previewModule] = await Promise.all([
    import(new URL("../lib/firebase.ts", import.meta.url).href) as Promise<FirebaseModule>,
    import(
      new URL("../lib/trade/playerStatsImportPreview.ts", import.meta.url).href
    ) as Promise<PreviewModule>,
  ]);

  return { db: firebaseModule.db, previewModule };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const { db, previewModule } = await loadRuntimeModules();

  try {
    const snapshot = previewModule.loadPlayerStatsSnapshot(
      process.cwd(),
      options.snapshotPath
    );
    const [activeRosterPlayerIds, existingPlayerStatsDocs] = await Promise.all([
      fetchActiveRosterPlayerIds(options.leagueId),
      readExistingPlayerStatsDocs(db),
    ]);

    const preview = previewModule.buildPlayerStatsImportPreview({
      activeRosterPlayerIds,
      existingPlayerStatsDocs,
      snapshot,
      maxAgeDays: options.maxAgeDays,
    });

    if (options.json) {
      console.log(JSON.stringify(preview, null, 2));
    } else {
      console.log(previewModule.formatPlayerStatsImportPreview(preview));
    }

    if (preview.parseError || preview.invalidRows.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await terminate(db).catch(() => undefined);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
