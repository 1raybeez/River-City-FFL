import { config } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { adaptFantasyProsRosResponse, fantasyProsRowsToCsv } from "../lib/tradeComparison/fantasyProsRos";
import { buildRosConsensus, importRosCsv, type RosImportResult } from "../lib/tradeComparison/rosValuePipeline";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
const key = process.env.FANTASYPROS_API_KEY;
if (!key) throw new Error("FANTASYPROS_API_KEY is missing from .env.local");
const fantasyProsApiKey = key;

const season = 2026;
const generatedAt = "2026-08-31T00:00:00.000Z";
const now = "2026-08-31T23:59:59.000Z";
const targetPath = "data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json";
const template = JSON.parse(await readFile("data/trade-analyzer/player-stats-2026.template.json", "utf8")) as { players: Record<string, { playerId: string; playerName: string; position: string | null; nflTeam: string | null; keeperCost?: number | null }> };
const sleeperPlayers = Object.values(template.players).map((player) => ({ playerId: player.playerId, playerName: player.playerName, position: player.position, nflTeam: player.nflTeam }));

async function fetchPosition(position: string) {
  const url = new URL("https://api.fantasypros.com/public/v2/json/nfl/2026/consensus-rankings");
  for (const [key, value] of Object.entries({ position, type: "ROS", scoring: "HALF", week: "0" })) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: { "x-api-key": fantasyProsApiKey, accept: "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(`FantasyPros ${position} request failed: ${response.status}`);
  return { position, url: url.toString(), ...adaptFantasyProsRosResponse(body, generatedAt, "FantasyPros ROS") };
}

const [qb, rb, wr, te] = await Promise.all(["QB", "RB", "WR", "TE"].map(fetchPosition));
const fantasyPros = [qb, rb, wr, te];
const imports: RosImportResult[] = fantasyPros.map((result) => importRosCsv({ csv: fantasyProsRowsToCsv(result.rows), source: "FantasyPros ROS", season, generatedAt, sleeperPlayers }));
const sources = [
  { name: "FantasyPros ROS", file: null, adaptation: fantasyPros, import: imports },
  ...await Promise.all(["rotowire-ros-2026-2026-08-31.csv", "draftsharks-ros-2026-2026-08-31.csv"].map(async (file) => {
    const source = file.startsWith("rotowire") ? "RotoWire ROS" : "DraftSharks ROS";
    const csv = await readFile(path.join("data/trade-analyzer/ros/raw", file), "utf8");
    return { name: source, file, adaptation: null, import: [importRosCsv({ csv, source, season, generatedAt, sleeperPlayers })] };
  })),
];
const allImports = sources.flatMap((source) => source.import);
const consensus = buildRosConsensus(allImports, now);
const targetNames = new Set(["Chris Olave", "Tyler Shough", "Trevor Lawrence", "Jaylen Waddle", "Jared Goff"]);
const targetRows = consensus.rows.filter((row) => targetNames.has(row.playerName));
const candidate = {
  generatedAt: now,
  season,
  status: "UNPUBLISHED_CANDIDATE",
  consensusMethod: "median",
  freshnessPolicy: "provider/source timestamp; 0-7 FRESH, 8-14 AGING, >14 STALE",
  fantasyPros: { requestsConsumed: 4, positions: fantasyPros.map(({ position, returnedRows, availableRows, limit, truncated, publicApiLimited, tier, lastUpdated, lastUpdatedTs }) => ({ position, returnedRows, availableRows, limit, truncated, publicApiLimited, tier, lastUpdated, lastUpdatedTs })) },
  sources: sources.map((source) => ({ name: source.name, file: source.file, import: source.import.map((result) => ({ rows: result.rows, matchedRows: result.matchedRows, unmatchedRows: result.unmatchedRows, duplicateRows: result.duplicateRows, issues: result.issues })) })),
  coverage: consensus.coverage,
  rows: consensus.rows,
  targetRows,
  notes: ["FantasyPros free tier returned only the first 10 rows for each requested position; this is a partial source, not complete practical ROS coverage.", "FantasyCalc redraft is intentionally not merged into expert ROS; join it separately as tradeMarket context.", "No numeric currentValueScore was derived from ROS rank."],
};
await writeFile(targetPath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ targetPath, fantasyProsRequests: 4, sourceSummary: sources.map((source) => ({ name: source.name, rows: source.import.reduce((sum, result) => sum + result.rows.length, 0), validRows: source.import.reduce((sum, result) => sum + result.matchedRows.length, 0), matchedRows: source.import.reduce((sum, result) => sum + result.matchedRows.length, 0), unmatchedRows: source.import.reduce((sum, result) => sum + result.unmatchedRows.length, 0), duplicateRows: source.import.reduce((sum, result) => sum + result.duplicateRows.length, 0), invalidRanks: source.import.reduce((sum, result) => sum + result.issues.filter((issue) => issue.code === "INVALID_RANK").length, 0), positions: source.import.flatMap((result) => result.matchedRows).reduce((counts, row) => { const position = row.position ?? "UNKNOWN"; counts[position] = (counts[position] ?? 0) + 1; return counts; }, {} as Record<string, number>) })), coverage: consensus.coverage, targets: targetRows }, null, 2));
