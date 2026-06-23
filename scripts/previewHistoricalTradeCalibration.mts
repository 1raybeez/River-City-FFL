import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { LEAGUE_HISTORY_IDS } from "../lib/leagueAlgorithm";

const DEFAULT_SNAPSHOT_PATH =
  "data/trade-analyzer/player-stats-2026.with-keeper-costs.candidate.json";
const DEFAULT_OUTPUT_PATH =
  "data/trade-analyzer/historical-calibration-2026.candidate.json";
const DEFAULT_START_SEASON = 2019;
const DEFAULT_END_SEASON = 2025;
const DEFAULT_START_WEEK = 1;
const DEFAULT_END_WEEK = 18;
const DEFAULT_LIMIT = 12;
const DEFAULT_RECOMMENDED_DATASET = "approvedFullyCovered";

type RosterId = string | number;

interface CliOptions {
  snapshotPath: string;
  outputPath: string;
  startSeason: number;
  endSeason: number;
  startWeek: number;
  endWeek: number;
  limit: number;
  recommendedDataset: string;
  excludeCommissionerReversals: boolean;
  writeReport: boolean;
  json: boolean;
  help: boolean;
}

interface PlayerStatsRow {
  playerId?: string;
  playerName?: string;
  position?: string | null;
  totalValueScore?: number;
  keeperCost?: number;
}

interface SleeperWaiverBudget {
  sender?: RosterId | null;
  receiver?: RosterId | null;
  amount?: string | number | null;
}

interface SleeperTransaction {
  transaction_id?: string | number | null;
  type?: string | null;
  status?: string | null;
  adds?: Record<string, RosterId> | null;
  drops?: Record<string, RosterId> | null;
  roster_ids?: RosterId[] | null;
  waiver_budget?: SleeperWaiverBudget[] | null;
  draft_picks?: unknown[] | null;
  created?: number | null;
  status_updated?: number | null;
  settings?: unknown;
  metadata?: unknown;
}

interface SourceTransaction extends SleeperTransaction {
  sourceSeason: number;
  sourceWeek: number;
  sourceLeagueId: string;
}

interface TradePlayer {
  playerId: string;
  playerName: string;
  position: string;
  totalValueScore: number;
  keeperCost: number;
  toTeam: number;
  covered: boolean;
}

interface TradeSide {
  teamIndex: number;
  rosterId: number;
  faabSent: number;
  players: TradePlayer[];
}

interface TeamComponentBreakdown {
  deltaTalent: number;
  deltaSurplus: number;
  deltaFaab: number;
  rosterTax: number;
  netValue: number;
}

interface TradeEvaluation {
  gap: number;
  teamNetValues: number[];
  perTeam: TeamComponentBreakdown[];
}

interface EvaluatedTrade {
  tradeId: string;
  season: number;
  week: number;
  leagueId: string;
  status: string | null;
  rosterIds: number[];
  teamCount: number;
  playerAssetCount: number;
  coveredAssetCount: number;
  missingAssetCount: number;
  coverageRatio: number;
  missingPlayerIds: string[];
  hasDraftPicks: boolean;
  draftPickCount: number;
  hasFaab: boolean;
  faabTotal: number;
  reversedByCommissioner: boolean;
  reversalTransactionId: string | null;
  reversalWeek: number | null;
  gap: number;
  teamNetValues: number[];
  perTeam: TeamComponentBreakdown[];
  sides: Array<{
    teamIndex: number;
    rosterId: number;
    faabSent: number;
    playersSent: Array<{
      playerId: string;
      playerName: string;
      position: string;
      totalValueScore: number;
      keeperCost: number;
      toTeam: number;
      covered: boolean;
    }>;
  }>;
}

interface PercentileTable {
  count: number;
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  min: number | null;
  max: number | null;
}

interface CountBySeason {
  season: number;
  leagueId: string | null;
  transactionsRead: number;
  completedTrades: number;
  approvedTrades: number;
  reversedTrades: number;
  playerAssets: number;
  coveredAssets: number;
  anyCoveredTrades: number;
  fullyCoveredTrades: number;
  coverageAtLeast50Trades: number;
  coverageAtLeast75Trades: number;
  tradesWithFaab: number;
  tradesWithDraftPicks: number;
}

interface KnownExampleResult {
  id: string;
  label: string;
  note: string;
  gap: number;
  fairnessScoreWithRecommendedPercentiles: number | null;
  classification: string;
  teamNetValues: number[];
  perTeam: TeamComponentBreakdown[];
  sideA: string[];
  sideB: string[];
}

interface CalibrationReport {
  generatedAt: string;
  sourceDetail: string;
  sourceVersion: string;
  firestoreWrites: "none";
  historicalDistributionWrites: "none";
  inputs: {
    snapshotPath: string;
    dataSource: "Sleeper transactions read-only";
    seasons: number[];
    weeks: number[];
    excludedCommissionerReversalsFromRecommendedDataset: boolean;
  };
  model: {
    name: string;
    formula: string;
    fairnessMapping: string;
  };
  summary: {
    seasonsRequested: number[];
    seasonsWithLeagueIds: number[];
    transactionsRead: number;
    completedTrades: number;
    approvedTrades: number;
    reversedTrades: number;
    fullyCoveredApprovedTrades: number;
    recommendedDataset: string;
  };
  countsBySeason: CountBySeason[];
  coverageStats: {
    totalPlayerAssets: number;
    coveredPlayerAssets: number;
    missingPlayerAssets: number;
    coveredAssetPct: number;
    tradesWithAnyCoveredAsset: number;
    tradesFullyCovered: number;
    approvedTradesWithAnyCoveredAsset: number;
    approvedTradesFullyCovered: number;
  };
  percentileTables: Record<string, PercentileTable>;
  proposedHistoricalDistribution: {
    percentiles: Omit<PercentileTable, "count" | "min" | "max">;
    tradeCount: number;
    generatedAt: string;
    dataset: string;
    sourceVersion: string;
    notes: string[];
  };
  knownExamples: KnownExampleResult[];
  reversedTradeCandidates: EvaluatedTrade[];
  largestApprovedGaps: EvaluatedTrade[];
  evaluatedTrades: EvaluatedTrade[];
}

function readArgValue(args: string[], index: number): string | undefined {
  const arg = args[index];
  const inlineValue = arg.includes("=") ? arg.split("=").slice(1).join("=") : "";
  if (inlineValue) return inlineValue;
  return args[index + 1];
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    snapshotPath: DEFAULT_SNAPSHOT_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    startSeason: DEFAULT_START_SEASON,
    endSeason: DEFAULT_END_SEASON,
    startWeek: DEFAULT_START_WEEK,
    endWeek: DEFAULT_END_WEEK,
    limit: DEFAULT_LIMIT,
    recommendedDataset: DEFAULT_RECOMMENDED_DATASET,
    excludeCommissionerReversals: true,
    writeReport: false,
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

    if (arg === "--write-report") {
      options.writeReport = true;
      return;
    }

    if (arg === "--include-commissioner-reversals") {
      options.excludeCommissionerReversals = false;
      return;
    }

    if (arg === "--snapshot" || arg.startsWith("--snapshot=")) {
      options.snapshotPath = readArgValue(args, index) ?? DEFAULT_SNAPSHOT_PATH;
      return;
    }

    if (arg === "--output" || arg.startsWith("--output=")) {
      options.outputPath = readArgValue(args, index) ?? DEFAULT_OUTPUT_PATH;
      return;
    }

    if (arg === "--start-season" || arg.startsWith("--start-season=")) {
      options.startSeason = parseInteger(
        readArgValue(args, index),
        DEFAULT_START_SEASON
      );
      return;
    }

    if (arg === "--end-season" || arg.startsWith("--end-season=")) {
      options.endSeason = parseInteger(
        readArgValue(args, index),
        DEFAULT_END_SEASON
      );
      return;
    }

    if (arg === "--start-week" || arg.startsWith("--start-week=")) {
      options.startWeek = parseInteger(readArgValue(args, index), DEFAULT_START_WEEK);
      return;
    }

    if (arg === "--end-week" || arg.startsWith("--end-week=")) {
      options.endWeek = parseInteger(readArgValue(args, index), DEFAULT_END_WEEK);
      return;
    }

    if (arg === "--limit" || arg.startsWith("--limit=")) {
      options.limit = Math.max(
        0,
        parseInteger(readArgValue(args, index), DEFAULT_LIMIT)
      );
      return;
    }

    if (
      arg === "--recommended-dataset" ||
      arg.startsWith("--recommended-dataset=")
    ) {
      options.recommendedDataset =
        readArgValue(args, index) ?? DEFAULT_RECOMMENDED_DATASET;
    }
  });

  if (options.endSeason < options.startSeason) {
    [options.startSeason, options.endSeason] = [
      options.endSeason,
      options.startSeason,
    ];
  }

  if (options.endWeek < options.startWeek) {
    [options.startWeek, options.endWeek] = [options.endWeek, options.startWeek];
  }

  return options;
}

function printHelp() {
  console.log(`Historical Trade Calibration Preview

Rebuilds candidate historical imbalance percentiles from actual River City
Sleeper trades using the current visible Trade Analyzer value model. Default mode
prints a dry-run preview and writes no files. Use --write-report to write only a
local JSON candidate/report file. This script never writes Firestore.

Usage:
  npx tsx scripts/previewHistoricalTradeCalibration.mts [options]
  npx tsx scripts/previewHistoricalTradeCalibration.mts --write-report

Options:
  --snapshot <path>             Player stats snapshot with keeper costs
                                (default: ${DEFAULT_SNAPSHOT_PATH})
  --output <path>               Local report/candidate JSON path
                                (default: ${DEFAULT_OUTPUT_PATH})
  --start-season <year>         First Sleeper season (default: ${DEFAULT_START_SEASON})
  --end-season <year>           Last Sleeper season (default: ${DEFAULT_END_SEASON})
  --start-week <week>           First transaction week (default: ${DEFAULT_START_WEEK})
  --end-week <week>             Last transaction week (default: ${DEFAULT_END_WEEK})
  --recommended-dataset <name>  Percentile table to propose
                                (default: ${DEFAULT_RECOMMENDED_DATASET})
  --include-commissioner-reversals
                                Keep exact commissioner reversals in approved calibration
  --write-report                Write the local JSON report/candidate file
  --json                        Print the complete JSON report
  --limit <count>               Text preview row limit (default: ${DEFAULT_LIMIT})
  --help                        Show this help text
`);
}

function buildRange(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function roundNullable(value: number | null): number | null {
  return value === null ? null : round(value);
}

function readSnapshot(snapshotPath: string): Map<string, PlayerStatsRow> {
  const absolutePath = path.resolve(process.cwd(), snapshotPath);
  const parsed: unknown = JSON.parse(readFileSync(absolutePath, "utf8"));

  if (!isRecord(parsed) || !isRecord(parsed.players)) {
    throw new Error(`Snapshot must be a JSON object with players: ${snapshotPath}`);
  }

  const values = new Map<string, PlayerStatsRow>();
  Object.entries(parsed.players).forEach(([playerId, row]) => {
    if (!isRecord(row)) return;

    values.set(playerId, {
      playerId:
        typeof row.playerId === "string" && row.playerId.trim()
          ? row.playerId.trim()
          : playerId,
      playerName:
        typeof row.playerName === "string" && row.playerName.trim()
          ? row.playerName.trim()
          : `Player ${playerId}`,
      position:
        typeof row.position === "string" && row.position.trim()
          ? row.position.trim()
          : null,
      totalValueScore:
        typeof row.totalValueScore === "number" && Number.isFinite(row.totalValueScore)
          ? row.totalValueScore
          : 0,
      keeperCost:
        typeof row.keeperCost === "number" && Number.isFinite(row.keeperCost)
          ? row.keeperCost
          : 0,
    });
  });

  return values;
}

async function sleeperFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sleeper request failed: ${url} (${response.status})`);
  }

  return (await response.json()) as T;
}

async function fetchSeasonTransactions({
  season,
  leagueId,
  weeks,
}: {
  season: number;
  leagueId: string;
  weeks: number[];
}): Promise<SourceTransaction[]> {
  const weekResults = await Promise.all(
    weeks.map(async (week) => {
      const transactions = await sleeperFetch<SleeperTransaction[]>(
        `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
      );

      return transactions.map((transaction) => ({
        ...transaction,
        sourceSeason: season,
        sourceWeek: week,
        sourceLeagueId: leagueId,
      }));
    })
  );

  return weekResults.flat();
}

function transactionId(tx: SleeperTransaction): string {
  return String(tx.transaction_id ?? "unknown");
}

function transactionTime(tx: SleeperTransaction): number {
  const timestamp = tx.status_updated ?? tx.created ?? 0;
  return typeof timestamp === "number" && Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeRosterId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAmount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addRosterId(list: number[], value: unknown) {
  const rosterId = normalizeRosterId(value);
  if (rosterId === null || list.includes(rosterId)) return;
  list.push(rosterId);
}

function getOrderedRosterIds(tx: SleeperTransaction): number[] {
  const rosterIds: number[] = [];

  tx.roster_ids?.forEach((rosterId) => addRosterId(rosterIds, rosterId));
  Object.values(tx.adds ?? {}).forEach((rosterId) => addRosterId(rosterIds, rosterId));
  Object.values(tx.drops ?? {}).forEach((rosterId) =>
    addRosterId(rosterIds, rosterId)
  );
  tx.waiver_budget?.forEach((entry) => {
    addRosterId(rosterIds, entry.sender);
    addRosterId(rosterIds, entry.receiver);
  });

  return rosterIds;
}

function canonicalMap(value: Record<string, RosterId> | null | undefined): string {
  return Object.entries(value ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([playerId, rosterId]) => `${playerId}:${String(rosterId)}`)
    .join("|");
}

function mapsAreExactReverse(
  trade: SleeperTransaction,
  commissioner: SleeperTransaction
): boolean {
  return (
    canonicalMap(trade.adds) === canonicalMap(commissioner.drops) &&
    canonicalMap(trade.drops) === canonicalMap(commissioner.adds)
  );
}

function findCommissionerReversal(
  trade: SourceTransaction,
  commissioners: SourceTransaction[]
): SourceTransaction | null {
  const tradeTime = transactionTime(trade);

  return (
    commissioners.find((commissioner) => {
      if (commissioner.sourceSeason !== trade.sourceSeason) return false;
      if (commissioner.status !== "complete") return false;
      if (transactionTime(commissioner) < tradeTime) return false;
      return mapsAreExactReverse(trade, commissioner);
    }) ?? null
  );
}

function calculateKeeperSurplus(player: TradePlayer): number {
  const value = player.totalValueScore ?? 0;
  const surplus = value - (player.keeperCost ?? 0);
  return surplus > 0 ? surplus * 1.1 : surplus * 0.7;
}

function calculateAdjustedTalent(players: TradePlayer[]): number {
  if (!players.length) return 0;

  const sorted = [...players].sort(
    (left, right) => (right.totalValueScore ?? 0) - (left.totalValueScore ?? 0)
  );

  return sorted.reduce((sum, player, index) => {
    let value = player.totalValueScore ?? 0;
    if (index === 0 && value > 40) value += 5;
    if (index >= 1) value *= 0.85;
    return sum + value;
  }, 0);
}

function evaluateTradeSides(sides: TradeSide[]): TradeEvaluation {
  const teamNetValues: number[] = Array(sides.length).fill(0);
  const perTeam: TeamComponentBreakdown[] = Array(sides.length)
    .fill(null)
    .map(() => ({
      deltaTalent: 0,
      deltaSurplus: 0,
      deltaFaab: 0,
      rosterTax: 0,
      netValue: 0,
    }));

  sides.forEach((side, index) => {
    const talentSent = calculateAdjustedTalent(side.players);
    const surplusSent = side.players.reduce(
      (sum, player) => sum + calculateKeeperSurplus(player),
      0
    );

    let surplusReceived = 0;
    let playersReceivedCount = 0;
    let faabReceived = 0;
    const receivedPlayers: TradePlayer[] = [];

    sides.forEach((otherSide) => {
      if (otherSide.teamIndex === index) return;

      const arriving = otherSide.players.filter((player) => player.toTeam === index);
      receivedPlayers.push(...arriving);
      playersReceivedCount += arriving.length;

      surplusReceived += arriving.reduce(
        (sum, player) => sum + calculateKeeperSurplus(player),
        0
      );

      if (sides.length === 2) {
        faabReceived += otherSide.faabSent ?? 0;
      }
    });

    const talentReceived = calculateAdjustedTalent(receivedPlayers);
    const netPlayerCount = playersReceivedCount - side.players.length;
    const rosterTax = netPlayerCount > 0 ? netPlayerCount * 1.5 : 0;
    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = faabReceived - (side.faabSent ?? 0);
    const netValue = deltaTalent + deltaSurplus * 0.6 + deltaFaab * 0.05 - rosterTax;

    teamNetValues[index] = netValue;
    perTeam[index] = {
      deltaTalent,
      deltaSurplus,
      deltaFaab,
      rosterTax,
      netValue,
    };
  });

  return {
    gap: Math.abs(Math.max(...teamNetValues) - Math.min(...teamNetValues)),
    teamNetValues,
    perTeam,
  };
}

function buildTradeSides(
  tx: SourceTransaction,
  valuesByPlayerId: Map<string, PlayerStatsRow>
): TradeSide[] {
  const rosterIds = getOrderedRosterIds(tx);
  const indexByRosterId = new Map(
    rosterIds.map((rosterId, index) => [rosterId, index])
  );
  const sides: TradeSide[] = rosterIds.map((rosterId, index) => ({
    teamIndex: index,
    rosterId,
    faabSent: 0,
    players: [],
  }));

  tx.waiver_budget?.forEach((entry) => {
    const sender = normalizeRosterId(entry.sender);
    if (sender === null) return;
    const senderIndex = indexByRosterId.get(sender);
    if (senderIndex === undefined) return;
    sides[senderIndex].faabSent += normalizeAmount(entry.amount);
  });

  Object.entries(tx.drops ?? {}).forEach(([playerId, fromRoster]) => {
    const toRoster = tx.adds?.[playerId];
    if (toRoster === undefined || toRoster === null) return;

    const fromIndex = indexByRosterId.get(Number(fromRoster));
    const toIndex = indexByRosterId.get(Number(toRoster));
    if (fromIndex === undefined || toIndex === undefined) return;

    const valueRow = valuesByPlayerId.get(playerId);
    const totalValueScore = valueRow?.totalValueScore ?? 0;
    const keeperCost = valueRow?.keeperCost ?? 0;

    sides[fromIndex].players.push({
      playerId,
      playerName: valueRow?.playerName ?? `Player ${playerId}`,
      position: valueRow?.position ?? "BN",
      totalValueScore,
      keeperCost,
      toTeam: toIndex,
      covered: totalValueScore > 0,
    });
  });

  return sides;
}

function summarizeTrade(
  tx: SourceTransaction,
  reversal: SourceTransaction | null,
  valuesByPlayerId: Map<string, PlayerStatsRow>
): EvaluatedTrade {
  const sides = buildTradeSides(tx, valuesByPlayerId);
  const evaluation = evaluateTradeSides(sides);
  const players = sides.flatMap((side) => side.players);
  const missingPlayerIds = players
    .filter((player) => !player.covered)
    .map((player) => player.playerId)
    .sort((left, right) => left.localeCompare(right));
  const faabTotal = sides.reduce((sum, side) => sum + side.faabSent, 0);

  return {
    tradeId: transactionId(tx),
    season: tx.sourceSeason,
    week: tx.sourceWeek,
    leagueId: tx.sourceLeagueId,
    status: tx.status ?? null,
    rosterIds: sides.map((side) => side.rosterId),
    teamCount: sides.length,
    playerAssetCount: players.length,
    coveredAssetCount: players.filter((player) => player.covered).length,
    missingAssetCount: missingPlayerIds.length,
    coverageRatio: players.length
      ? players.filter((player) => player.covered).length / players.length
      : 1,
    missingPlayerIds,
    hasDraftPicks: Array.isArray(tx.draft_picks) && tx.draft_picks.length > 0,
    draftPickCount: Array.isArray(tx.draft_picks) ? tx.draft_picks.length : 0,
    hasFaab: faabTotal > 0,
    faabTotal,
    reversedByCommissioner: Boolean(reversal),
    reversalTransactionId: reversal ? transactionId(reversal) : null,
    reversalWeek: reversal?.sourceWeek ?? null,
    gap: evaluation.gap,
    teamNetValues: evaluation.teamNetValues,
    perTeam: evaluation.perTeam,
    sides: sides.map((side) => ({
      teamIndex: side.teamIndex,
      rosterId: side.rosterId,
      faabSent: side.faabSent,
      playersSent: side.players.map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        position: player.position,
        totalValueScore: player.totalValueScore,
        keeperCost: player.keeperCost,
        toTeam: player.toTeam,
        covered: player.covered,
      })),
    })),
  };
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (!sortedValues.length) return 0;
  const index = (percentileValue / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function buildPercentileTable(values: number[]): PercentileTable {
  const sorted = [...values].sort((left, right) => left - right);
  const min = sorted[0] ?? null;
  const max = sorted[sorted.length - 1] ?? null;

  return {
    count: sorted.length,
    p05: round(percentile(sorted, 5)),
    p10: round(percentile(sorted, 10)),
    p25: round(percentile(sorted, 25)),
    p50: round(percentile(sorted, 50)),
    p75: round(percentile(sorted, 75)),
    p90: round(percentile(sorted, 90)),
    p95: round(percentile(sorted, 95)),
    min: roundNullable(min),
    max: roundNullable(max),
  };
}

function getPercentilesOnly(
  table: PercentileTable
): Omit<PercentileTable, "count" | "min" | "max"> {
  return {
    p05: table.p05,
    p10: table.p10,
    p25: table.p25,
    p50: table.p50,
    p75: table.p75,
    p90: table.p90,
    p95: table.p95,
  };
}

function fairnessScoreFromPercentiles(
  gap: number,
  table: PercentileTable | null
): number | null {
  if (!table || table.count === 0) return null;
  if (gap <= table.p25) return 100;
  if (gap <= table.p50) return 90;
  if (gap <= table.p75) return 70;
  if (gap <= table.p90) return 40;
  return 10;
}

function classifyGap(gap: number, table: PercentileTable | null): string {
  const score = fairnessScoreFromPercentiles(gap, table);
  if (score === null) return "unclassified";
  if (score >= 95) return "routine / very fair";
  if (score >= 80) return "normal approved range";
  if (score >= 60) return "approved-but-lopsided range";
  if (score >= 30) return "borderline range";
  return "veto-level range";
}

function rowToTradePlayer(
  playerId: string,
  toTeam: number,
  valuesByPlayerId: Map<string, PlayerStatsRow>
): TradePlayer {
  const valueRow = valuesByPlayerId.get(playerId);
  const totalValueScore = valueRow?.totalValueScore ?? 0;

  return {
    playerId,
    playerName: valueRow?.playerName ?? `Player ${playerId}`,
    position: valueRow?.position ?? "BN",
    totalValueScore,
    keeperCost: valueRow?.keeperCost ?? 0,
    toTeam,
    covered: totalValueScore > 0,
  };
}

function evaluateKnownExamples(
  valuesByPlayerId: Map<string, PlayerStatsRow>,
  recommendedTable: PercentileTable | null
): KnownExampleResult[] {
  const examples = [
    {
      id: "james-cook-for-drake-london",
      label: "James Cook for Drake London",
      note: "Should not be veto-level.",
      sideA: ["8138"],
      sideB: ["8112"],
    },
    {
      id: "deebo-for-cook-goedert",
      label: "Deebo Samuel for James Cook + Dallas Goedert",
      note: "Known league-vetoed/reversed trade.",
      sideA: ["5872"],
      sideB: ["8138", "5022"],
    },
    {
      id: "lamar-btj-tet-jeanty-for-etn-nico-dart-loveland",
      label:
        "Lamar + Brian Thomas Jr. + Tetairoa McMillan + Ashton Jeanty for Travis Etienne + Nico Collins + Jaxson Dart + Colston Loveland",
      note: "Known league-approved trade.",
      sideA: ["4881", "11631", "12526", "12527"],
      sideB: ["7543", "7569", "12508", "12517"],
    },
  ];

  return examples.map((example) => {
    const sides: TradeSide[] = [
      {
        teamIndex: 0,
        rosterId: 1,
        faabSent: 0,
        players: example.sideA.map((playerId) =>
          rowToTradePlayer(playerId, 1, valuesByPlayerId)
        ),
      },
      {
        teamIndex: 1,
        rosterId: 2,
        faabSent: 0,
        players: example.sideB.map((playerId) =>
          rowToTradePlayer(playerId, 0, valuesByPlayerId)
        ),
      },
    ];
    const evaluation = evaluateTradeSides(sides);
    const fairnessScore = fairnessScoreFromPercentiles(
      evaluation.gap,
      recommendedTable
    );

    return {
      id: example.id,
      label: example.label,
      note: example.note,
      gap: round(evaluation.gap),
      fairnessScoreWithRecommendedPercentiles: fairnessScore,
      classification: classifyGap(evaluation.gap, recommendedTable),
      teamNetValues: evaluation.teamNetValues.map((value) => round(value)),
      perTeam: evaluation.perTeam.map((component) => ({
        deltaTalent: round(component.deltaTalent),
        deltaSurplus: round(component.deltaSurplus),
        deltaFaab: round(component.deltaFaab),
        rosterTax: round(component.rosterTax),
        netValue: round(component.netValue),
      })),
      sideA: example.sideA.map(
        (playerId) => valuesByPlayerId.get(playerId)?.playerName ?? playerId
      ),
      sideB: example.sideB.map(
        (playerId) => valuesByPlayerId.get(playerId)?.playerName ?? playerId
      ),
    };
  });
}

function buildCountsBySeason({
  seasons,
  transactionsBySeason,
  trades,
}: {
  seasons: number[];
  transactionsBySeason: Map<number, SourceTransaction[]>;
  trades: EvaluatedTrade[];
}): CountBySeason[] {
  return seasons.map((season) => {
    const leagueId = LEAGUE_HISTORY_IDS[season] ?? null;
    const seasonTrades = trades.filter((trade) => trade.season === season);
    const approvedTrades = seasonTrades.filter(
      (trade) => !trade.reversedByCommissioner
    );

    return {
      season,
      leagueId,
      transactionsRead: transactionsBySeason.get(season)?.length ?? 0,
      completedTrades: seasonTrades.length,
      approvedTrades: approvedTrades.length,
      reversedTrades: seasonTrades.filter((trade) => trade.reversedByCommissioner)
        .length,
      playerAssets: seasonTrades.reduce(
        (sum, trade) => sum + trade.playerAssetCount,
        0
      ),
      coveredAssets: seasonTrades.reduce(
        (sum, trade) => sum + trade.coveredAssetCount,
        0
      ),
      anyCoveredTrades: seasonTrades.filter((trade) => trade.coveredAssetCount > 0)
        .length,
      fullyCoveredTrades: seasonTrades.filter(
        (trade) =>
          trade.playerAssetCount > 0 &&
          trade.coveredAssetCount === trade.playerAssetCount
      ).length,
      coverageAtLeast50Trades: seasonTrades.filter(
        (trade) => trade.coverageRatio >= 0.5
      ).length,
      coverageAtLeast75Trades: seasonTrades.filter(
        (trade) => trade.coverageRatio >= 0.75
      ).length,
      tradesWithFaab: seasonTrades.filter((trade) => trade.hasFaab).length,
      tradesWithDraftPicks: seasonTrades.filter((trade) => trade.hasDraftPicks)
        .length,
    };
  });
}

function buildPercentileTables(trades: EvaluatedTrade[]) {
  const approved = trades.filter((trade) => !trade.reversedByCommissioner);

  const datasets: Record<string, EvaluatedTrade[]> = {
    allCompleted: trades,
    approvedNoCommissionerReverse: approved,
    approvedAnyCovered: approved.filter((trade) => trade.coveredAssetCount > 0),
    approvedCoverageAtLeast50: approved.filter(
      (trade) => trade.coverageRatio >= 0.5
    ),
    approvedCoverageAtLeast75: approved.filter(
      (trade) => trade.coverageRatio >= 0.75
    ),
    approvedFullyCovered: approved.filter(
      (trade) =>
        trade.playerAssetCount > 0 &&
        trade.coveredAssetCount === trade.playerAssetCount
    ),
    reversedCommissioner: trades.filter((trade) => trade.reversedByCommissioner),
  };

  return Object.fromEntries(
    Object.entries(datasets).map(([name, rows]) => [
      name,
      buildPercentileTable(rows.map((trade) => trade.gap)),
    ])
  );
}

function trimTradeForPreview(trade: EvaluatedTrade): EvaluatedTrade {
  return {
    ...trade,
    gap: round(trade.gap),
    coverageRatio: round(trade.coverageRatio),
    teamNetValues: trade.teamNetValues.map((value) => round(value)),
    perTeam: trade.perTeam.map((component) => ({
      deltaTalent: round(component.deltaTalent),
      deltaSurplus: round(component.deltaSurplus),
      deltaFaab: round(component.deltaFaab),
      rosterTax: round(component.rosterTax),
      netValue: round(component.netValue),
    })),
  };
}

async function buildCalibrationReport(options: CliOptions): Promise<CalibrationReport> {
  const valuesByPlayerId = readSnapshot(options.snapshotPath);
  const seasons = buildRange(options.startSeason, options.endSeason);
  const weeks = buildRange(options.startWeek, options.endWeek);
  const transactionsBySeason = new Map<number, SourceTransaction[]>();
  const allTransactions: SourceTransaction[] = [];

  for (const season of seasons) {
    const leagueId = LEAGUE_HISTORY_IDS[season];
    if (!leagueId) {
      transactionsBySeason.set(season, []);
      continue;
    }

    const transactions = await fetchSeasonTransactions({ season, leagueId, weeks });
    transactionsBySeason.set(season, transactions);
    allTransactions.push(...transactions);
  }

  const completedTrades = allTransactions.filter(
    (transaction) =>
      transaction.type === "trade" && transaction.status === "complete"
  );
  const commissioners = allTransactions.filter(
    (transaction) =>
      transaction.type === "commissioner" && transaction.status === "complete"
  );

  const evaluatedTrades = completedTrades.map((trade) => {
    const reversal = options.excludeCommissionerReversals
      ? findCommissionerReversal(trade, commissioners)
      : null;
    return summarizeTrade(trade, reversal, valuesByPlayerId);
  });

  const percentileTables = buildPercentileTables(evaluatedTrades);
  const recommendedTable =
    percentileTables[options.recommendedDataset] ??
    percentileTables[DEFAULT_RECOMMENDED_DATASET] ??
    null;
  const recommendedDataset = percentileTables[options.recommendedDataset]
    ? options.recommendedDataset
    : DEFAULT_RECOMMENDED_DATASET;
  const approvedTrades = evaluatedTrades.filter(
    (trade) => !trade.reversedByCommissioner
  );
  const fullyCoveredApprovedTrades = approvedTrades.filter(
    (trade) =>
      trade.playerAssetCount > 0 &&
      trade.coveredAssetCount === trade.playerAssetCount
  );
  const totalPlayerAssets = evaluatedTrades.reduce(
    (sum, trade) => sum + trade.playerAssetCount,
    0
  );
  const coveredPlayerAssets = evaluatedTrades.reduce(
    (sum, trade) => sum + trade.coveredAssetCount,
    0
  );
  const generatedAt = new Date().toISOString();

  const sortedReversals = evaluatedTrades
    .filter((trade) => trade.reversedByCommissioner)
    .sort((left, right) => right.gap - left.gap)
    .map(trimTradeForPreview);
  const largestApprovedGaps = approvedTrades
    .sort((left, right) => right.gap - left.gap)
    .slice(0, 25)
    .map(trimTradeForPreview);

  return {
    generatedAt,
    sourceDetail:
      "Historical calibration dry-run from read-only Sleeper transactions using current Trade Analyzer talent/surplus/FAAB/roster-tax formula.",
    sourceVersion: `river-city-historical-calibration-preview-${generatedAt.slice(0, 10)}`,
    firestoreWrites: "none",
    historicalDistributionWrites: "none",
    inputs: {
      snapshotPath: options.snapshotPath,
      dataSource: "Sleeper transactions read-only",
      seasons,
      weeks,
      excludedCommissionerReversalsFromRecommendedDataset:
        options.excludeCommissionerReversals,
    },
    model: {
      name: "current-tradeFairnessEngine-visible-formula",
      formula:
        "netValue = deltaTalent + deltaSurplus * 0.6 + deltaFaab * 0.05 - rosterTax; gap = max(netValue) - min(netValue)",
      fairnessMapping:
        "gap <= p25 => 100; <= p50 => 90; <= p75 => 70; <= p90 => 40; > p90 => 10",
    },
    summary: {
      seasonsRequested: seasons,
      seasonsWithLeagueIds: seasons.filter((season) => Boolean(LEAGUE_HISTORY_IDS[season])),
      transactionsRead: allTransactions.length,
      completedTrades: evaluatedTrades.length,
      approvedTrades: approvedTrades.length,
      reversedTrades: sortedReversals.length,
      fullyCoveredApprovedTrades: fullyCoveredApprovedTrades.length,
      recommendedDataset,
    },
    countsBySeason: buildCountsBySeason({
      seasons,
      transactionsBySeason,
      trades: evaluatedTrades,
    }),
    coverageStats: {
      totalPlayerAssets,
      coveredPlayerAssets,
      missingPlayerAssets: totalPlayerAssets - coveredPlayerAssets,
      coveredAssetPct: totalPlayerAssets
        ? round((coveredPlayerAssets / totalPlayerAssets) * 100)
        : 100,
      tradesWithAnyCoveredAsset: evaluatedTrades.filter(
        (trade) => trade.coveredAssetCount > 0
      ).length,
      tradesFullyCovered: evaluatedTrades.filter(
        (trade) =>
          trade.playerAssetCount > 0 &&
          trade.coveredAssetCount === trade.playerAssetCount
      ).length,
      approvedTradesWithAnyCoveredAsset: approvedTrades.filter(
        (trade) => trade.coveredAssetCount > 0
      ).length,
      approvedTradesFullyCovered: fullyCoveredApprovedTrades.length,
    },
    percentileTables,
    proposedHistoricalDistribution: {
      percentiles: getPercentilesOnly(recommendedTable),
      tradeCount: recommendedTable.count,
      generatedAt,
      dataset: recommendedDataset,
      sourceVersion: `river-city-historical-calibration-${recommendedDataset}-${generatedAt.slice(0, 10)}`,
      notes: [
        "Local candidate only; historical_distribution was not written.",
        "Exact commissioner reversal transactions are excluded from the recommended approved calibration set.",
        "Player values come from the local FantasyCalc + River City keeper-cost player_stats candidate snapshot.",
      ],
    },
    knownExamples: evaluateKnownExamples(valuesByPlayerId, recommendedTable),
    reversedTradeCandidates: sortedReversals,
    largestApprovedGaps,
    evaluatedTrades: evaluatedTrades.map(trimTradeForPreview),
  };
}

async function writeReport(report: CalibrationReport, outputPath: string) {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });

  if (existsSync(absolutePath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(absolutePath, `${absolutePath}.backup-${stamp}`);
  }

  await writeFile(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
}

function formatTradeLine(trade: EvaluatedTrade): string {
  return [
    `${trade.season} W${trade.week}`,
    trade.tradeId,
    `gap ${round(trade.gap)}`,
    `${trade.coveredAssetCount}/${trade.playerAssetCount} assets covered`,
    trade.reversedByCommissioner
      ? `reversed by ${trade.reversalTransactionId}`
      : "approved candidate",
  ].join(" | ");
}

function formatPreview(report: CalibrationReport, options: CliOptions): string {
  const recommended = report.proposedHistoricalDistribution.percentiles;
  const lines = [
    "Historical Trade Calibration Preview",
    "",
    `Snapshot: ${options.snapshotPath}`,
    `Data source: ${report.inputs.dataSource}`,
    `Seasons: ${report.inputs.seasons.join(", ")}`,
    `Weeks: ${report.inputs.weeks[0]}-${report.inputs.weeks[report.inputs.weeks.length - 1]}`,
    `Output path: ${options.outputPath}`,
    `Local report written: ${options.writeReport ? "yes" : "no (dry run)"}`,
    "Firestore writes: none",
    "historical_distribution writes: none",
    "",
    "Summary:",
    `- Transactions read: ${report.summary.transactionsRead}`,
    `- Completed trades: ${report.summary.completedTrades}`,
    `- Approved candidate trades: ${report.summary.approvedTrades}`,
    `- Reversed trade candidates: ${report.summary.reversedTrades}`,
    `- Fully covered approved trades: ${report.summary.fullyCoveredApprovedTrades}`,
    `- Recommended dataset: ${report.summary.recommendedDataset}`,
    "",
    "Coverage:",
    `- Player assets: ${report.coverageStats.coveredPlayerAssets}/${report.coverageStats.totalPlayerAssets} covered (${report.coverageStats.coveredAssetPct}%)`,
    `- Approved trades with any covered asset: ${report.coverageStats.approvedTradesWithAnyCoveredAsset}`,
    `- Approved trades fully covered: ${report.coverageStats.approvedTradesFullyCovered}`,
    "",
    "Counts by season:",
    ...report.countsBySeason.map(
      (row) =>
        `- ${row.season}: completed ${row.completedTrades}, approved ${row.approvedTrades}, reversed ${row.reversedTrades}, fully covered ${row.fullyCoveredTrades}, assets ${row.coveredAssets}/${row.playerAssets}`
    ),
    "",
    "Proposed percentiles:",
    `- p25=${recommended.p25}, p50=${recommended.p50}, p75=${recommended.p75}, p90=${recommended.p90}, p95=${recommended.p95}`,
    "",
    "Percentile tables:",
    ...Object.entries(report.percentileTables).map(
      ([name, table]) =>
        `- ${name}: count ${table.count}, p25 ${table.p25}, p50 ${table.p50}, p75 ${table.p75}, p90 ${table.p90}, p95 ${table.p95}`
    ),
    "",
    "Known examples:",
    ...report.knownExamples.map(
      (example) =>
        `- ${example.label}: gap ${example.gap}, score ${example.fairnessScoreWithRecommendedPercentiles ?? "n/a"}, ${example.classification}`
    ),
    "",
    `Reversed trade candidates (showing ${Math.min(options.limit, report.reversedTradeCandidates.length)}):`,
    ...(report.reversedTradeCandidates.length
      ? report.reversedTradeCandidates
          .slice(0, options.limit)
          .map((trade) => `- ${formatTradeLine(trade)}`)
      : ["- none"]),
    "",
    `Largest approved gaps (showing ${Math.min(options.limit, report.largestApprovedGaps.length)}):`,
    ...(report.largestApprovedGaps.length
      ? report.largestApprovedGaps
          .slice(0, options.limit)
          .map((trade) => `- ${formatTradeLine(trade)}`)
      : ["- none"]),
  ];

  if (!options.writeReport) {
    lines.push("");
    lines.push("Dry run only. Add --write-report to write the local JSON candidate.");
  }

  return lines.join("\n");
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const report = await buildCalibrationReport(options);

  if (options.writeReport) {
    await writeReport(report, options.outputPath);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatPreview(report, options));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
