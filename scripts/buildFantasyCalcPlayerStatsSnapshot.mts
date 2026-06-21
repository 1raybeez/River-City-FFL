import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type {
  FantasyCalcValueRow,
  RiverCityPlayerTemplateFile,
} from "../lib/trade/fantasyCalcSnapshotBuilder";

const require = createRequire(import.meta.url);
const {
  buildFantasyCalcSnapshot,
  DEFAULT_FANTASYCALC_VALUES_URL,
  parseFantasyCalcApiRows,
  parseFantasyCalcCsv,
} = require("../lib/trade/fantasyCalcSnapshotBuilder.ts") as typeof import("../lib/trade/fantasyCalcSnapshotBuilder");

const DEFAULT_TEMPLATE_PATH =
  "data/trade-analyzer/player-stats-2026.template.json";
const DEFAULT_CANDIDATE_PATH =
  "data/trade-analyzer/player-stats-2026.fantasycalc-candidate.json";
const DEFAULT_REPORT_PATH =
  "data/trade-analyzer/player-stats-2026.fantasycalc-report.json";

interface CliOptions {
  templatePath: string;
  csvPath?: string;
  fetch: boolean;
  fantasyCalcUrl: string;
  candidatePath: string;
  reportPath: string;
  captureDate?: string;
  help: boolean;
}

function readArgValue(args: string[], index: number): string | undefined {
  const arg = args[index];
  const inlineValue = arg.includes("=") ? arg.split("=").slice(1).join("=") : "";
  if (inlineValue) return inlineValue;
  return args[index + 1];
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    templatePath: DEFAULT_TEMPLATE_PATH,
    fetch: false,
    fantasyCalcUrl: DEFAULT_FANTASYCALC_VALUES_URL,
    candidatePath: DEFAULT_CANDIDATE_PATH,
    reportPath: DEFAULT_REPORT_PATH,
    help: false,
  };

  args.forEach((arg, index) => {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      return;
    }

    if (arg === "--fetch") {
      options.fetch = true;
      return;
    }

    if (arg === "--template" || arg.startsWith("--template=")) {
      options.templatePath = readArgValue(args, index) ?? DEFAULT_TEMPLATE_PATH;
      return;
    }

    if (arg === "--csv" || arg.startsWith("--csv=")) {
      options.csvPath = readArgValue(args, index);
      return;
    }

    if (arg === "--url" || arg.startsWith("--url=")) {
      options.fantasyCalcUrl =
        readArgValue(args, index) ?? DEFAULT_FANTASYCALC_VALUES_URL;
      return;
    }

    if (arg === "--output" || arg.startsWith("--output=")) {
      options.candidatePath =
        readArgValue(args, index) ?? DEFAULT_CANDIDATE_PATH;
      return;
    }

    if (arg === "--report" || arg.startsWith("--report=")) {
      options.reportPath = readArgValue(args, index) ?? DEFAULT_REPORT_PATH;
      return;
    }

    if (arg === "--capture-date" || arg.startsWith("--capture-date=")) {
      options.captureDate = readArgValue(args, index);
    }
  });

  return options;
}

function printHelp() {
  console.log(`FantasyCalc Player Stats Snapshot Builder

Builds a reviewed candidate player_stats snapshot from a River City Sleeper
template and FantasyCalc values. This is an offline import tool. It does not
write Firestore, does not update the final import path, and is not used by the
live analyzer.

Usage:
  node scripts/buildFantasyCalcPlayerStatsSnapshot.mts --csv <path> [options]
  node scripts/buildFantasyCalcPlayerStatsSnapshot.mts --fetch [options]

Options:
  --csv <path>           FantasyCalc CSV export path
  --fetch                One-shot fetch from FantasyCalc's current values API
  --template <path>      Sleeper template path (default: ${DEFAULT_TEMPLATE_PATH})
  --url <url>            FantasyCalc values URL (default: approved Phase 8 URL)
  --output <path>        Candidate snapshot path (default: ${DEFAULT_CANDIDATE_PATH})
  --report <path>        Match report path (default: ${DEFAULT_REPORT_PATH})
  --capture-date <date>  Capture date/ISO timestamp for sourceVersion/freshness
  --help                 Show this help text
`);
}

function resolvePath(rawPath: string): string {
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function loadFantasyCalcRows(
  options: CliOptions
): Promise<FantasyCalcValueRow[]> {
  if (options.csvPath) {
    const csvPath = resolvePath(options.csvPath);
    return parseFantasyCalcCsv(await readFile(csvPath, "utf8"));
  }

  const response = await fetch(options.fantasyCalcUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "River City FFL offline snapshot import review",
    },
  });

  if (!response.ok) {
    throw new Error(
      `FantasyCalc fetch failed: ${response.status} ${response.statusText}`
    );
  }

  return parseFantasyCalcApiRows(await response.json());
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (Boolean(options.csvPath) === options.fetch) {
    throw new Error("Choose exactly one input mode: --csv <path> or --fetch");
  }

  const templatePath = resolvePath(options.templatePath);
  const candidatePath = resolvePath(options.candidatePath);
  const reportPath = resolvePath(options.reportPath);
  const generatedAt = new Date().toISOString();
  const captureDate = options.captureDate ?? generatedAt;

  const [template, fantasyCalcRows] = await Promise.all([
    readJsonFile<RiverCityPlayerTemplateFile>(templatePath),
    loadFantasyCalcRows(options),
  ]);

  const { candidate, report } = buildFantasyCalcSnapshot({
    template,
    fantasyCalcRows,
    captureDate,
    generatedAt,
    inputMode: options.csvPath ? "csv" : "fetch",
    sourceUrl: options.fantasyCalcUrl,
    candidateSnapshotPath: candidatePath,
    templatePath,
  });

  await Promise.all([
    writeJsonFile(candidatePath, candidate),
    writeJsonFile(reportPath, report),
  ]);

  console.log("FantasyCalc Player Stats Candidate Built");
  console.log("----------------------------------------");
  console.log(`Input mode: ${report.inputMode}`);
  console.log(`Template path: ${templatePath}`);
  console.log(`Candidate path: ${candidatePath}`);
  console.log(`Report path: ${reportPath}`);
  console.log(`Source version: ${report.sourceVersion}`);
  console.log(`FantasyCalc rows read: ${report.counts.fantasyCalcRowsRead}`);
  console.log(`Direct Sleeper ID matches: ${report.counts.directSleeperIdMatches}`);
  console.log(`Fallback candidates: ${report.counts.fallbackCandidateMatches}`);
  console.log(`Candidate players: ${report.counts.candidateSnapshotPlayers}`);
  console.log(`Missing River City players: ${report.counts.missingRiverCityPlayers}`);
  console.log(
    `Rejected/ambiguous rows: ${report.counts.rejectedOrAmbiguousRows}`
  );
  console.log(`Ignored FantasyCalc rows: ${report.counts.ignoredFantasyCalcRows}`);
  console.log("Firestore writes: none");
  console.log("Final import path updated: no");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
