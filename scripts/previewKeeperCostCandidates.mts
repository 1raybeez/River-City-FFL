import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LEAGUE_IDS } from "../lib/sleeper";

const SOURCE_SEASON = 2025;
const TARGET_SEASON = 2026;
const DEFAULT_LEAGUE_ID = LEAGUE_IDS[SOURCE_SEASON] ?? "1199749375539027968";
const DEFAULT_START_WEEK = 0;
const DEFAULT_END_WEEK = 22;
const DEFAULT_PREVIEW_LIMIT = 25;
const DEFAULT_OUTPUT_PATH =
  "data/trade-analyzer/keeper-costs-2026.candidate.json";
const IMPORT_TARGET_PATH = "data/trade-analyzer/player-stats-2026.json";

type AcquisitionType = "draft" | "waiver" | "free_agent";
type Confidence = "high" | "review";

interface CliOptions {
  leagueId: string;
  outputPath: string;
  startWeek: number;
  endWeek: number;
  limit: number;
  json: boolean;
  writeCandidate: boolean;
  help: boolean;
}

interface SleeperLeague {
  league_id: string;
  name?: string;
  season?: string;
  status?: string;
  draft_id?: string | null;
}

interface SleeperDraft {
  draft_id: string;
  type?: string;
  status?: string;
  season?: string;
  created?: number;
  start_time?: number;
  settings?: {
    budget?: number;
    rounds?: number;
    teams?: number;
    [key: string]: unknown;
  };
}

interface SleeperDraftPick {
  player_id?: string | number | null;
  roster_id?: number | null;
  pick_no?: number | null;
  round?: number | null;
  draft_slot?: number | null;
  is_keeper?: boolean | null;
  metadata?: {
    amount?: string | number | null;
    first_name?: string | null;
    last_name?: string | null;
    position?: string | null;
    team?: string | null;
    [key: string]: unknown;
  } | null;
}

interface SleeperTransaction {
  transaction_id: string;
  type: string;
  status?: string;
  adds?: Record<string, string | number> | null;
  drops?: Record<string, string | number> | null;
  roster_ids?: number[];
  created?: number;
  status_updated?: number;
  settings?: {
    waiver_bid?: string | number | null;
    [key: string]: unknown;
  } | null;
}

interface SleeperPlayer {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
}

interface AcquisitionRecord {
  type: AcquisitionType;
  amount: number | null;
  amountSource: string;
  occurredAt: string | null;
  occurredAtMs: number | null;
  rosterId: number | null;
  draftId?: string;
  pickNo?: number | null;
  round?: number | null;
  draftSlot?: number | null;
  isKeeper?: boolean | null;
  transactionId?: string;
  week?: number;
}

interface DropRecord {
  transactionId: string;
  week: number;
  rosterId: number | null;
  occurredAt: string | null;
  occurredAtMs: number | null;
  transactionType: string;
}

interface CandidateRow {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  max2025AcquisitionPrice: number | null;
  projected2026KeeperCost: number | null;
  keeperCost: number | null;
  highestAcquisition: AcquisitionRecord | null;
  acquisitions: AcquisitionRecord[];
  drops: DropRecord[];
  droppedAndReadded: boolean;
  confidence: Confidence;
  reviewReasons: string[];
}

interface ReviewRow {
  playerId: string;
  playerName: string;
  reasons: string[];
}

interface KeeperCostSummary {
  sourceSeason: number;
  targetSeason: number;
  leagueId: string;
  leagueName: string | null;
  leagueStatus: string | null;
  draftId: string;
  draftType: string | null;
  draftStatus: string | null;
  draftBudget: number | null;
  transactionWeeksFetched: number;
  draftPicksRead: number;
  draftPricesFound: number;
  draftPricesMissing: number;
  totalTransactionsRead: number;
  completedTransactionsRead: number;
  completedWaiverAddTransactions: number;
  waiverBidsFound: number;
  waiverBidsMissing: number;
  zeroDollarWaiverAdds: number;
  maxWaiverBid: number | null;
  completedFreeAgentAddTransactions: number;
  freeAgentAddsAssumedZero: number;
  dropEventsTracked: number;
  playersWithAcquisitionEvents: number;
  playersWithComputedKeeperCost: number;
  playersWithProjectedTenDollarKeeperCost: number;
  droppedAndReaddedPlayers: number;
  reviewNeededRows: number;
}

interface CandidateFile {
  generatedAt: string;
  importTargetPath: string;
  sourceDetail: string;
  sourceVersion: string;
  source: {
    sleeperLeagueId: string;
    sourceSeason: number;
    targetSeason: number;
    draftId: string;
    transactionWeeks: number[];
    rulesVersion: string;
  };
  instructions: string[];
  summary: KeeperCostSummary;
  players: Record<string, CandidateRow>;
  reviewRows: ReviewRow[];
}

interface BuildContext {
  rowsByPlayerId: Map<string, CandidateRow>;
  draftPicksRead: number;
  draftPricesFound: number;
  draftPricesMissing: number;
  totalTransactionsRead: number;
  completedTransactionsRead: number;
  completedWaiverAddTransactions: number;
  waiverBidsFound: number;
  waiverBidsMissing: number;
  zeroDollarWaiverAdds: number;
  maxWaiverBid: number | null;
  completedFreeAgentAddTransactions: number;
  freeAgentAddsAssumedZero: number;
  dropEventsTracked: number;
}

function readArgValue(args: string[], index: number): string | undefined {
  const arg = args[index];
  const inlineValue = arg.includes("=") ? arg.split("=").slice(1).join("=") : "";
  if (inlineValue) return inlineValue;
  return args[index + 1];
}

function parseNonNegativeInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    leagueId: DEFAULT_LEAGUE_ID,
    outputPath: DEFAULT_OUTPUT_PATH,
    startWeek: DEFAULT_START_WEEK,
    endWeek: DEFAULT_END_WEEK,
    limit: DEFAULT_PREVIEW_LIMIT,
    json: false,
    writeCandidate: false,
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

    if (arg === "--write-candidate") {
      options.writeCandidate = true;
      return;
    }

    if (arg === "--league-id" || arg.startsWith("--league-id=")) {
      options.leagueId = readArgValue(args, index) ?? DEFAULT_LEAGUE_ID;
      return;
    }

    if (arg === "--output" || arg.startsWith("--output=")) {
      options.outputPath = readArgValue(args, index) ?? DEFAULT_OUTPUT_PATH;
      return;
    }

    if (arg === "--start-week" || arg.startsWith("--start-week=")) {
      options.startWeek = parseNonNegativeInteger(
        readArgValue(args, index),
        DEFAULT_START_WEEK
      );
      return;
    }

    if (arg === "--end-week" || arg.startsWith("--end-week=")) {
      options.endWeek = parseNonNegativeInteger(
        readArgValue(args, index),
        DEFAULT_END_WEEK
      );
      return;
    }

    if (arg === "--limit" || arg.startsWith("--limit=")) {
      options.limit = parseNonNegativeInteger(
        readArgValue(args, index),
        DEFAULT_PREVIEW_LIMIT
      );
    }
  });

  if (options.endWeek < options.startWeek) {
    [options.startWeek, options.endWeek] = [options.endWeek, options.startWeek];
  }

  return options;
}

function printHelp() {
  console.log(`River City Keeper Cost Candidate Preview

Builds a local preview of 2026 keeper costs from 2025 Sleeper acquisition data.
Default mode is dry-run only: it calls Sleeper, prints counts, and writes no files.
It never reads or writes Firestore and never overwrites player_stats.

Usage:
  npx tsx scripts/previewKeeperCostCandidates.mts [options]
  npx tsx scripts/previewKeeperCostCandidates.mts --write-candidate

Options:
  --league-id <id>       Sleeper source league ID (default: 2025 River City league)
  --start-week <week>    First transaction week to read (default: ${DEFAULT_START_WEEK})
  --end-week <week>      Last transaction week to read (default: ${DEFAULT_END_WEEK})
  --output <path>        Candidate output path (default: ${DEFAULT_OUTPUT_PATH})
  --write-candidate      Write the local candidate JSON file
  --limit <count>        Rows to show in text preview (default: ${DEFAULT_PREVIEW_LIMIT})
  --json                 Print the complete candidate JSON
  --help                 Show this help text
`);
}

async function sleeperFetch<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Sleeper request failed: ${url} (${response.status})`);
  }

  return (await response.json()) as T;
}

function parseDollarAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value !== "string") return null;

  const cleaned = value.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatIsoTime(timestamp: number | null | undefined): string | null {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
  const ms = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeTimestamp(timestamp: number | null | undefined): number | null {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;
  return timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
}

function getTransactionTimestamp(tx: SleeperTransaction): number | null {
  return normalizeTimestamp(tx.status_updated ?? tx.created);
}

function getPlayerName(playerId: string, player?: SleeperPlayer): string {
  const fullName = player?.full_name?.trim();
  if (fullName) return fullName;

  const firstName = player?.first_name?.trim() ?? "";
  const lastName = player?.last_name?.trim() ?? "";
  const fallback = `${firstName} ${lastName}`.trim();

  return fallback || `Sleeper Player ${playerId}`;
}

function getDraftPickName(playerId: string, pick: SleeperDraftPick): string {
  const firstName = pick.metadata?.first_name?.trim() ?? "";
  const lastName = pick.metadata?.last_name?.trim() ?? "";
  const fallback = `${firstName} ${lastName}`.trim();

  return fallback || `Sleeper Player ${playerId}`;
}

function getRosterId(value: string | number | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getOrCreateRow({
  rowsByPlayerId,
  players,
  playerId,
  fallbackName,
  fallbackPosition,
  fallbackTeam,
}: {
  rowsByPlayerId: Map<string, CandidateRow>;
  players: Record<string, SleeperPlayer>;
  playerId: string;
  fallbackName?: string | null;
  fallbackPosition?: string | null;
  fallbackTeam?: string | null;
}): CandidateRow {
  const existing = rowsByPlayerId.get(playerId);
  if (existing) return existing;

  const player = players[playerId];
  const row: CandidateRow = {
    playerId,
    playerName: player
      ? getPlayerName(playerId, player)
      : fallbackName ?? getPlayerName(playerId),
    position: player?.position ?? fallbackPosition ?? null,
    nflTeam: player?.team ?? fallbackTeam ?? null,
    max2025AcquisitionPrice: null,
    projected2026KeeperCost: null,
    keeperCost: null,
    highestAcquisition: null,
    acquisitions: [],
    drops: [],
    droppedAndReadded: false,
    confidence: player ? "high" : "review",
    reviewReasons: player ? [] : ["Player metadata was missing from Sleeper players endpoint."],
  };

  rowsByPlayerId.set(playerId, row);
  return row;
}

function addReview(row: CandidateRow, reason: string) {
  if (!row.reviewReasons.includes(reason)) {
    row.reviewReasons.push(reason);
  }
  row.confidence = "review";
}

function addAcquisition(row: CandidateRow, acquisition: AcquisitionRecord) {
  row.acquisitions.push(acquisition);
}

function addDrop(row: CandidateRow, drop: DropRecord) {
  row.drops.push(drop);
}

function sortAcquisitions(acquisitions: AcquisitionRecord[]) {
  return [...acquisitions].sort((a, b) => {
    const amountCompare = (b.amount ?? -1) - (a.amount ?? -1);
    if (amountCompare !== 0) return amountCompare;
    return (a.occurredAtMs ?? 0) - (b.occurredAtMs ?? 0);
  });
}

function hasDropThenReadd(row: CandidateRow): boolean {
  return row.drops.some((drop) =>
    row.acquisitions.some((acquisition) => {
      if (drop.occurredAtMs === null || acquisition.occurredAtMs === null) {
        return false;
      }

      return acquisition.occurredAtMs > drop.occurredAtMs;
    })
  );
}

function finalizeRows(rowsByPlayerId: Map<string, CandidateRow>) {
  rowsByPlayerId.forEach((row) => {
    row.acquisitions.sort((a, b) => (a.occurredAtMs ?? 0) - (b.occurredAtMs ?? 0));
    row.drops.sort((a, b) => (a.occurredAtMs ?? 0) - (b.occurredAtMs ?? 0));

    const pricedAcquisitions = sortAcquisitions(
      row.acquisitions.filter((acquisition) => acquisition.amount !== null)
    );
    const highest = pricedAcquisitions[0] ?? null;

    row.highestAcquisition = highest;
    row.max2025AcquisitionPrice = highest?.amount ?? null;
    row.projected2026KeeperCost =
      highest?.amount !== null && highest?.amount !== undefined
        ? highest.amount + 10
        : null;
    row.keeperCost = row.projected2026KeeperCost;
    row.droppedAndReadded = hasDropThenReadd(row);

    if (row.projected2026KeeperCost === null) {
      addReview(row, "No priced 2025 acquisition was found.");
    }
  });
}

function buildReviewRows(rows: CandidateRow[]): ReviewRow[] {
  return rows
    .filter((row) => row.reviewReasons.length > 0)
    .map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      reasons: row.reviewReasons,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function buildSummary({
  context,
  league,
  draft,
  weeks,
  rows,
  reviewRows,
}: {
  context: BuildContext;
  league: SleeperLeague;
  draft: SleeperDraft;
  weeks: number[];
  rows: CandidateRow[];
  reviewRows: ReviewRow[];
}): KeeperCostSummary {
  const playersWithComputedKeeperCost = rows.filter(
    (row) => row.projected2026KeeperCost !== null
  ).length;

  return {
    sourceSeason: SOURCE_SEASON,
    targetSeason: TARGET_SEASON,
    leagueId: league.league_id,
    leagueName: league.name ?? null,
    leagueStatus: league.status ?? null,
    draftId: draft.draft_id,
    draftType: draft.type ?? null,
    draftStatus: draft.status ?? null,
    draftBudget:
      typeof draft.settings?.budget === "number" ? draft.settings.budget : null,
    transactionWeeksFetched: weeks.length,
    draftPicksRead: context.draftPicksRead,
    draftPricesFound: context.draftPricesFound,
    draftPricesMissing: context.draftPricesMissing,
    totalTransactionsRead: context.totalTransactionsRead,
    completedTransactionsRead: context.completedTransactionsRead,
    completedWaiverAddTransactions: context.completedWaiverAddTransactions,
    waiverBidsFound: context.waiverBidsFound,
    waiverBidsMissing: context.waiverBidsMissing,
    zeroDollarWaiverAdds: context.zeroDollarWaiverAdds,
    maxWaiverBid: context.maxWaiverBid,
    completedFreeAgentAddTransactions: context.completedFreeAgentAddTransactions,
    freeAgentAddsAssumedZero: context.freeAgentAddsAssumedZero,
    dropEventsTracked: context.dropEventsTracked,
    playersWithAcquisitionEvents: rows.filter((row) => row.acquisitions.length > 0)
      .length,
    playersWithComputedKeeperCost,
    playersWithProjectedTenDollarKeeperCost: rows.filter(
      (row) => row.projected2026KeeperCost === 10
    ).length,
    droppedAndReaddedPlayers: rows.filter((row) => row.droppedAndReadded).length,
    reviewNeededRows: reviewRows.length,
  };
}

function formatDollar(value: number | null) {
  return value === null ? "n/a" : `$${value}`;
}

function formatPlayerLine(row: CandidateRow) {
  const highest = row.highestAcquisition;
  const source = highest
    ? `${highest.type}${highest.week !== undefined ? ` wk ${highest.week}` : ""}`
    : "no source";

  return [
    `${formatDollar(row.projected2026KeeperCost)} keeper`,
    `${row.playerName} (${row.position ?? "UNK"})`,
    `max ${formatDollar(row.max2025AcquisitionPrice)}`,
    source,
  ].join(" | ");
}

function formatCandidatePreview(candidate: CandidateFile, options: CliOptions) {
  const rows = Object.values(candidate.players);
  const computedRows = rows
    .filter((row) => row.projected2026KeeperCost !== null)
    .sort((a, b) => {
      const keeperCompare =
        (b.projected2026KeeperCost ?? -1) - (a.projected2026KeeperCost ?? -1);
      if (keeperCompare !== 0) return keeperCompare;
      return a.playerName.localeCompare(b.playerName);
    })
    .slice(0, options.limit);
  const droppedAndReaddedRows = rows
    .filter((row) => row.droppedAndReadded)
    .sort((a, b) => {
      const keeperCompare =
        (b.projected2026KeeperCost ?? -1) - (a.projected2026KeeperCost ?? -1);
      if (keeperCompare !== 0) return keeperCompare;
      return a.playerName.localeCompare(b.playerName);
    })
    .slice(0, options.limit);
  const reviewRows = candidate.reviewRows.slice(0, options.limit);

  const lines = [
    "River City Keeper Cost Candidate Preview",
    "",
    `Source league: ${candidate.summary.leagueName ?? "unknown"} (${candidate.summary.leagueId})`,
    `Source season: ${candidate.summary.sourceSeason}`,
    `Target season: ${candidate.summary.targetSeason}`,
    `Draft: ${candidate.summary.draftId} (${candidate.summary.draftType ?? "unknown"}, ${candidate.summary.draftStatus ?? "unknown"})`,
    `Proposed candidate JSON path: ${options.outputPath}`,
    `Candidate file written: ${options.writeCandidate ? "yes" : "no (dry run)"}`,
    "Firestore writes: none",
    "",
    "Data counts:",
    `- Draft picks read: ${candidate.summary.draftPicksRead}`,
    `- Draft prices found: ${candidate.summary.draftPricesFound}`,
    `- Draft prices missing: ${candidate.summary.draftPricesMissing}`,
    `- Transaction weeks fetched: ${candidate.summary.transactionWeeksFetched}`,
    `- Total transactions read: ${candidate.summary.totalTransactionsRead}`,
    `- Completed transactions read: ${candidate.summary.completedTransactionsRead}`,
    `- Completed waiver add transactions: ${candidate.summary.completedWaiverAddTransactions}`,
    `- Waiver bids found: ${candidate.summary.waiverBidsFound}`,
    `- Waiver bids missing: ${candidate.summary.waiverBidsMissing}`,
    `- Zero-dollar waiver adds: ${candidate.summary.zeroDollarWaiverAdds}`,
    `- Completed free-agent add transactions: ${candidate.summary.completedFreeAgentAddTransactions}`,
    `- Free-agent adds assumed $0: ${candidate.summary.freeAgentAddsAssumedZero}`,
    `- Drop events tracked: ${candidate.summary.dropEventsTracked}`,
    "",
    "Computed rows:",
    `- Players with acquisition events: ${candidate.summary.playersWithAcquisitionEvents}`,
    `- Players with computed keeper costs: ${candidate.summary.playersWithComputedKeeperCost}`,
    `- Players with projected $10 keeper cost: ${candidate.summary.playersWithProjectedTenDollarKeeperCost}`,
    `- Dropped/re-added players: ${candidate.summary.droppedAndReaddedPlayers}`,
    `- Review-needed rows: ${candidate.summary.reviewNeededRows}`,
    "",
    `Top computed keeper costs (showing ${computedRows.length}):`,
    ...computedRows.map((row) => `- ${formatPlayerLine(row)}`),
    "",
    `Dropped/re-added players (showing ${droppedAndReaddedRows.length}):`,
    ...(droppedAndReaddedRows.length
      ? droppedAndReaddedRows.map((row) => `- ${formatPlayerLine(row)}`)
      : ["- none"]),
    "",
    `Review-needed rows (showing ${reviewRows.length}):`,
    ...(reviewRows.length
      ? reviewRows.map(
          (row) => `- ${row.playerName} (${row.playerId}): ${row.reasons.join("; ")}`
        )
      : ["- none"]),
  ];

  if (!options.writeCandidate) {
    lines.push("");
    lines.push("Dry run only. Add --write-candidate to write the local JSON file.");
  }

  return lines.join("\n");
}

function addDraftPicks({
  context,
  rowsByPlayerId,
  players,
  draft,
  picks,
}: {
  context: BuildContext;
  rowsByPlayerId: Map<string, CandidateRow>;
  players: Record<string, SleeperPlayer>;
  draft: SleeperDraft;
  picks: SleeperDraftPick[];
}) {
  const draftTimestamp = normalizeTimestamp(draft.start_time ?? draft.created);
  const draftOrderTimestamp = draftTimestamp ?? 0;

  picks.forEach((pick) => {
    context.draftPicksRead += 1;
    if (pick.player_id === null || pick.player_id === undefined) return;

    const playerId = String(pick.player_id);
    const amount = parseDollarAmount(pick.metadata?.amount);
    const row = getOrCreateRow({
      rowsByPlayerId,
      players,
      playerId,
      fallbackName: getDraftPickName(playerId, pick),
      fallbackPosition: pick.metadata?.position ?? null,
      fallbackTeam: pick.metadata?.team ?? null,
    });

    if (amount === null) {
      context.draftPricesMissing += 1;
      addReview(row, "Draft pick was missing a valid metadata.amount.");
    } else {
      context.draftPricesFound += 1;
    }

    addAcquisition(row, {
      type: "draft",
      amount,
      amountSource: "draft.metadata.amount",
      occurredAt: formatIsoTime(draftTimestamp),
      occurredAtMs: draftOrderTimestamp,
      rosterId: pick.roster_id ?? null,
      draftId: draft.draft_id,
      pickNo: pick.pick_no ?? null,
      round: pick.round ?? null,
      draftSlot: pick.draft_slot ?? null,
      isKeeper: pick.is_keeper ?? null,
    });
  });
}

function addTransactionEvents({
  context,
  rowsByPlayerId,
  players,
  transactions,
  week,
}: {
  context: BuildContext;
  rowsByPlayerId: Map<string, CandidateRow>;
  players: Record<string, SleeperPlayer>;
  transactions: SleeperTransaction[];
  week: number;
}) {
  transactions.forEach((tx) => {
    context.totalTransactionsRead += 1;
    if (tx.status !== "complete") return;

    context.completedTransactionsRead += 1;
    const occurredAtMs = getTransactionTimestamp(tx);
    const occurredAt = formatIsoTime(occurredAtMs);

    if (tx.type === "waiver" && tx.adds && Object.keys(tx.adds).length > 0) {
      context.completedWaiverAddTransactions += 1;
      const amount = parseDollarAmount(tx.settings?.waiver_bid);

      if (amount === null) {
        context.waiverBidsMissing += 1;
      } else {
        context.waiverBidsFound += 1;
        if (amount === 0) context.zeroDollarWaiverAdds += 1;
        context.maxWaiverBid =
          context.maxWaiverBid === null ? amount : Math.max(context.maxWaiverBid, amount);
      }

      Object.entries(tx.adds).forEach(([playerId, rosterId]) => {
        const row = getOrCreateRow({ rowsByPlayerId, players, playerId });

        if (amount === null) {
          addReview(row, "Waiver add was missing a valid settings.waiver_bid.");
        }

        addAcquisition(row, {
          type: "waiver",
          amount,
          amountSource: "transaction.settings.waiver_bid",
          occurredAt,
          occurredAtMs,
          rosterId: getRosterId(rosterId),
          transactionId: tx.transaction_id,
          week,
        });
      });
    }

    if (tx.type === "free_agent" && tx.adds && Object.keys(tx.adds).length > 0) {
      context.completedFreeAgentAddTransactions += 1;
      context.freeAgentAddsAssumedZero += Object.keys(tx.adds).length;

      Object.entries(tx.adds).forEach(([playerId, rosterId]) => {
        const row = getOrCreateRow({ rowsByPlayerId, players, playerId });
        addReview(
          row,
          "Free-agent add had no waiver bid in Sleeper; treated as a verified $0 acquisition."
        );
        addAcquisition(row, {
          type: "free_agent",
          amount: 0,
          amountSource: "transaction.free_agent.assumed_0",
          occurredAt,
          occurredAtMs,
          rosterId: getRosterId(rosterId),
          transactionId: tx.transaction_id,
          week,
        });
      });
    }

    if (
      (tx.type === "waiver" || tx.type === "free_agent" || tx.type === "commissioner") &&
      tx.drops
    ) {
      Object.entries(tx.drops).forEach(([playerId, rosterId]) => {
        const row = getOrCreateRow({ rowsByPlayerId, players, playerId });
        context.dropEventsTracked += 1;
        addDrop(row, {
          transactionId: tx.transaction_id,
          week,
          rosterId: getRosterId(rosterId),
          occurredAt,
          occurredAtMs,
          transactionType: tx.type,
        });
      });
    }
  });
}

async function discoverDraft(league: SleeperLeague): Promise<SleeperDraft> {
  const drafts = await sleeperFetch<SleeperDraft[]>(
    `https://api.sleeper.app/v1/league/${league.league_id}/drafts`
  );

  const leagueDraft = drafts.find((draft) => draft.draft_id === league.draft_id);
  const completeAuctionDraft = drafts.find(
    (draft) => draft.type === "auction" && draft.status === "complete"
  );
  const draft = leagueDraft ?? completeAuctionDraft ?? drafts[0];

  if (!draft) {
    throw new Error(`No Sleeper draft found for league ${league.league_id}.`);
  }

  return draft;
}

function buildWeeks(startWeek: number, endWeek: number) {
  return Array.from(
    { length: endWeek - startWeek + 1 },
    (_, index) => startWeek + index
  );
}

async function buildCandidate(options: CliOptions): Promise<CandidateFile> {
  const league = await sleeperFetch<SleeperLeague>(
    `https://api.sleeper.app/v1/league/${options.leagueId}`
  );
  const draft = await discoverDraft(league);
  const weeks = buildWeeks(options.startWeek, options.endWeek);

  const [players, picks, transactionWeeks] = await Promise.all([
    sleeperFetch<Record<string, SleeperPlayer>>(
      "https://api.sleeper.app/v1/players/nfl"
    ),
    sleeperFetch<SleeperDraftPick[]>(
      `https://api.sleeper.app/v1/draft/${draft.draft_id}/picks`
    ),
    Promise.all(
      weeks.map((week) =>
        sleeperFetch<SleeperTransaction[]>(
          `https://api.sleeper.app/v1/league/${league.league_id}/transactions/${week}`
        ).then((transactions) => ({ week, transactions }))
      )
    ),
  ]);

  const context: BuildContext = {
    rowsByPlayerId: new Map(),
    draftPicksRead: 0,
    draftPricesFound: 0,
    draftPricesMissing: 0,
    totalTransactionsRead: 0,
    completedTransactionsRead: 0,
    completedWaiverAddTransactions: 0,
    waiverBidsFound: 0,
    waiverBidsMissing: 0,
    zeroDollarWaiverAdds: 0,
    maxWaiverBid: null,
    completedFreeAgentAddTransactions: 0,
    freeAgentAddsAssumedZero: 0,
    dropEventsTracked: 0,
  };

  addDraftPicks({
    context,
    rowsByPlayerId: context.rowsByPlayerId,
    players,
    draft,
    picks,
  });

  transactionWeeks.forEach(({ week, transactions }) => {
    addTransactionEvents({
      context,
      rowsByPlayerId: context.rowsByPlayerId,
      players,
      transactions,
      week,
    });
  });

  finalizeRows(context.rowsByPlayerId);

  const rows = [...context.rowsByPlayerId.values()].sort((a, b) => {
    const nameCompare = a.playerName.localeCompare(b.playerName);
    if (nameCompare !== 0) return nameCompare;
    return a.playerId.localeCompare(b.playerId);
  });
  const reviewRows = buildReviewRows(rows);
  const summary = buildSummary({
    context,
    league,
    draft,
    weeks,
    rows,
    reviewRows,
  });

  return {
    generatedAt: new Date().toISOString(),
    importTargetPath: IMPORT_TARGET_PATH,
    sourceDetail:
      "River City 2026 keeper-cost candidate from 2025 Sleeper auction draft metadata.amount and completed waiver transaction settings.waiver_bid.",
    sourceVersion: `river-city-keeper-costs-${TARGET_SEASON}-from-sleeper-${SOURCE_SEASON}`,
    source: {
      sleeperLeagueId: league.league_id,
      sourceSeason: SOURCE_SEASON,
      targetSeason: TARGET_SEASON,
      draftId: draft.draft_id,
      transactionWeeks: weeks,
      rulesVersion: "highest-2025-acquisition-price-plus-10",
    },
    instructions: [
      "Local candidate snapshot only; do not import without review.",
      "keeperCost equals projected2026KeeperCost.",
      "Projected cost rule: max 2025 acquisition price plus 10.",
      "Draft prices come from Sleeper draft pick metadata.amount.",
      "Waiver prices come from completed Sleeper waiver transaction settings.waiver_bid, including valid $0 bids.",
      "This file does not update player_stats and does not write Firestore.",
    ],
    summary,
    players: Object.fromEntries(rows.map((row) => [row.playerId, row])),
    reviewRows,
  };
}

async function writeCandidateFile(candidate: CandidateFile, outputPath: string) {
  const absolutePath = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(candidate, null, 2)}\n`);
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const candidate = await buildCandidate(options);

  if (options.writeCandidate) {
    await writeCandidateFile(candidate, options.outputPath);
  }

  if (options.json) {
    console.log(JSON.stringify(candidate, null, 2));
  } else {
    console.log(formatCandidatePreview(candidate, options));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
