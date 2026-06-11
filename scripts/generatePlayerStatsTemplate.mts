import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_LEAGUE_ID = "1312149033254416384";
const DEFAULT_OUTPUT_PATH =
  "data/trade-analyzer/player-stats-2026.template.json";

interface CliOptions {
  leagueId: string;
  outputPath: string;
  help: boolean;
}

interface SleeperRoster {
  roster_id: number;
  owner_id?: string | null;
  players?: Array<string | number | null>;
  metadata?: {
    team_name?: string;
    [key: string]: unknown;
  };
}

interface SleeperUser {
  user_id: string;
  display_name?: string;
  metadata?: {
    team_name?: string;
    [key: string]: unknown;
  };
}

interface SleeperPlayer {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
}

interface TemplatePlayerRow {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number;
  sleeperOwnerId: string | null;
  teamName: string;
  ownerDisplayName: string;
  rawSourceValue: number | null;
  totalValueScore: number | null;
  keeperCost: number | null;
  valueSource: "ManualSnapshot";
  sourceDetail: string;
  sourceVersion: string;
  notes: string;
}

interface TemplateFile {
  templateGeneratedAt: string;
  leagueId: string;
  importTargetPath: string;
  instructions: string[];
  players: Record<string, TemplatePlayerRow>;
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
    outputPath: DEFAULT_OUTPUT_PATH,
    help: false,
  };

  args.forEach((arg, index) => {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    if (arg === "--league-id" || arg.startsWith("--league-id=")) {
      options.leagueId = readArgValue(args, index) ?? DEFAULT_LEAGUE_ID;
      return;
    }

    if (arg === "--output" || arg.startsWith("--output=")) {
      options.outputPath = readArgValue(args, index) ?? DEFAULT_OUTPUT_PATH;
    }
  });

  return options;
}

function printHelp() {
  console.log(`Player Stats Template Generator

Creates a local, incomplete template for manual player value entry. This script
only calls Sleeper roster/user/player endpoints and writes a .template.json file.
It does not write Firestore and does not call FantasyPros, KTC, FantasyCalc,
DraftSharks, or projection APIs.

Usage:
  node scripts/generatePlayerStatsTemplate.mts [options]

Options:
  --league-id <id>  Sleeper league ID (default: 2026 River City league)
  --output <path>   Template output path (default: ${DEFAULT_OUTPUT_PATH})
  --help            Show this help text
`);
}

async function sleeperFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sleeper request failed: ${url} (${response.status})`);
  }

  return (await response.json()) as T;
}

function getPlayerName(playerId: string, player?: SleeperPlayer): string {
  const fullName = player?.full_name?.trim();
  if (fullName) return fullName;

  const firstName = player?.first_name?.trim() ?? "";
  const lastName = player?.last_name?.trim() ?? "";
  const fallbackName = `${firstName} ${lastName}`.trim();

  return fallbackName || `Sleeper Player ${playerId}`;
}

function getTeamName(roster: SleeperRoster, user?: SleeperUser): string {
  return (
    roster.metadata?.team_name?.trim() ||
    user?.metadata?.team_name?.trim() ||
    user?.display_name?.trim() ||
    `Roster ${roster.roster_id}`
  );
}

function getOwnerDisplayName(user?: SleeperUser): string {
  return user?.display_name?.trim() || "Unknown Owner";
}

function buildTemplate({
  leagueId,
  rosters,
  users,
  players,
}: {
  leagueId: string;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  players: Record<string, SleeperPlayer>;
}): TemplateFile {
  const userById = new Map(users.map((user) => [user.user_id, user]));
  const rows: TemplatePlayerRow[] = [];

  rosters.forEach((roster) => {
    const user = roster.owner_id ? userById.get(roster.owner_id) : undefined;

    roster.players?.forEach((rawPlayerId) => {
      if (rawPlayerId === null || rawPlayerId === undefined) return;

      const playerId = String(rawPlayerId);
      const player = players[playerId];

      rows.push({
        playerId,
        playerName: getPlayerName(playerId, player),
        position: player?.position ?? null,
        nflTeam: player?.team ?? null,
        rosterId: roster.roster_id,
        sleeperOwnerId: roster.owner_id ?? null,
        teamName: getTeamName(roster, user),
        ownerDisplayName: getOwnerDisplayName(user),
        rawSourceValue: null,
        totalValueScore: null,
        keeperCost: null,
        valueSource: "ManualSnapshot",
        sourceDetail: "",
        sourceVersion: "",
        notes: "",
      });
    });
  });

  const sortedRows = rows.sort((a, b) => {
    const teamCompare = a.teamName.localeCompare(b.teamName);
    if (teamCompare !== 0) return teamCompare;
    const positionCompare = (a.position ?? "").localeCompare(b.position ?? "");
    if (positionCompare !== 0) return positionCompare;
    return a.playerName.localeCompare(b.playerName);
  });

  const playerRows = Object.fromEntries(
    sortedRows.map((row) => [row.playerId, row])
  );

  return {
    templateGeneratedAt: new Date().toISOString(),
    leagueId,
    importTargetPath: "data/trade-analyzer/player-stats-2026.json",
    instructions: [
      "This is a manual-entry template, not an import-ready snapshot.",
      "Fill rawSourceValue from Ray's approved external/manual source.",
      "Fill totalValueScore with a positive normalized number before running import preview.",
      "Fill keeperCost only when a verified keeper cost exists; otherwise use 0 in the final import snapshot.",
      "Fill sourceDetail and sourceVersion so the analyzer can explain where values came from.",
      "When complete, copy the filled player rows into data/trade-analyzer/player-stats-2026.json and run scripts/previewPlayerStatsImport.mts before any Firestore import.",
    ],
    players: playerRows,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const [rosters, users, players] = await Promise.all([
    sleeperFetch<SleeperRoster[]>(
      `https://api.sleeper.app/v1/league/${options.leagueId}/rosters`
    ),
    sleeperFetch<SleeperUser[]>(
      `https://api.sleeper.app/v1/league/${options.leagueId}/users`
    ),
    sleeperFetch<Record<string, SleeperPlayer>>(
      "https://api.sleeper.app/v1/players/nfl"
    ),
  ]);

  const template = buildTemplate({
    leagueId: options.leagueId,
    rosters,
    users,
    players,
  });

  const outputPath = path.isAbsolute(options.outputPath)
    ? options.outputPath
    : path.join(process.cwd(), options.outputPath);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`, "utf8");

  console.log("Player Stats Template Generated");
  console.log("--------------------------------");
  console.log(`Output path: ${outputPath}`);
  console.log(`League ID: ${options.leagueId}`);
  console.log(`Roster players included: ${Object.keys(template.players).length}`);
  console.log("Firestore writes: none");
  console.log("External value sources called: none");
  console.log("");
  console.log("Manual fields Ray must fill before import preview:");
  console.log("- rawSourceValue");
  console.log("- totalValueScore (must be a positive normalized number)");
  console.log("- keeperCost (use 0 in the final snapshot when no verified cost exists)");
  console.log("- sourceDetail");
  console.log("- sourceVersion");
  console.log("- notes, if useful");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
