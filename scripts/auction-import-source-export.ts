import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AuctionImportMatchStatus,
  AuctionImportValidationIssue,
} from "../lib/auction/importTypes";
import type {
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTimestamp,
} from "../lib/auction/types";
import type {
  AuctionSourceAliasSuggestion,
  AuctionSourceAppliedAlias,
  AuctionSourceDuplicateMatch,
  AuctionSourceMatchCandidate,
  AuctionSourceMatchReviewFile,
  AuctionSourceMatchReviewRow,
  AuctionSourceValueRow,
  AuctionSourceValuesFile,
  AuctionValueScoringFormat,
  AuctionValueSource,
  AuctionValueSourceKey,
  AuctionValueSourceKind,
} from "../lib/auction/valueSources";
import {
  AUCTION_PLAYER_ALIASES_FILE,
  getAuctionPlayerAliases,
} from "../lib/auction/playerAliases";

const INPUT_DIR = "data/auction/source-imports/exports";
const OUTPUT_DIR = "data/auction/source-values";
const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const ADAPTER_VERSION = "source-export-v1";
const DEFAULT_SCORING_FORMAT = "custom" satisfies AuctionValueScoringFormat;
const DEFAULT_AUCTION_BUDGET = 200;
const DEFAULT_TEAM_COUNT = 12;
const SOURCE_KIND = "web-export" satisfies AuctionValueSourceKind;

const SUPPORTED_SEASONS = [
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
  2025,
  2026,
] as const satisfies readonly AuctionSeasonYear[];

const VALID_POSITIONS = new Set([
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
  "DL",
  "LB",
  "DB",
  "IDP",
  "UNK",
]);

const TEAM_ALIASES: Record<string, string> = {
  ARZ: "ARI",
  JAX: "JAC",
  LA: "LAR",
  STL: "LAR",
  SD: "LAC",
  OAK: "LV",
  WAS: "WSH",
};

const DEFENSE_NAME_BY_TEAM: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAC: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WSH: "Washington Commanders",
};

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  espn: "ESPN",
  fantasynerds: "FantasyNerds",
  fantasypros: "FantasyPros",
  footballguys: "Footballguys",
  lineupexperts: "Lineup Experts",
  "draft-sharks": "Draft Sharks",
  draftsharks: "Draft Sharks",
  rotowire: "RotoWire",
};

const HEADER_ALIASES = {
  player: ["player", "name", "player name"],
  position: ["position", "pos"],
  team: ["team", "nfl team"],
  value: [
    "value",
    "$ value",
    "auction value",
    "dollar value",
    "salary",
    "projected value",
  ],
  rank: ["rank"],
  tier: ["tier"],
} as const;

const ROTOWIRE_REQUIRED_HEADERS: CanonicalHeader[] = [
  "value",
  "player",
  "team",
  "position",
];
const ROTOWIRE_OPTIONAL_HEADERS: CanonicalHeader[] = ["rank"];

const FANTASYPROS_BLOCK_HEADERS = new Set([
  "OVERALL",
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DST",
  "DEF",
  "DL",
  "LB",
  "DB",
  "IDP",
]);

type CanonicalHeader = keyof typeof HEADER_ALIASES;

type CliArgs = {
  source: string;
  seasonYear: AuctionSeasonYear;
};

type CsvRecord = {
  sourceFilename: string;
  rowNumber: number;
  raw: Record<string, string>;
};

type ParsedInput = {
  records: CsvRecord[];
  rowsRead: number;
  detectedBlocks: string[];
  duplicatesSkipped: number;
};

type FantasyProsBlock = {
  label: string;
  position: AuctionPlayerPosition | null;
  playerColumn: number;
  byeWeekColumn: number | null;
  valueColumn: number | null;
  tagsColumn: number | null;
  expertNotesColumn: number | null;
};

type SleeperPlayer = {
  player_id?: string | number | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  search_full_name?: string | null;
  position?: string | null;
  team?: string | null;
  active?: boolean | null;
  status?: string | null;
};

type SleeperCandidate = {
  sleeperPlayerId: string;
  fullName: string;
  searchNames: string[];
  position: AuctionPlayerPosition | null;
  team: string | null;
  active: boolean;
  status: string | null;
};

type MatchResult = {
  status: Extract<
    AuctionImportMatchStatus,
    "matched" | "ambiguous" | "unmatched"
  >;
  method: string;
  matchedPlayer: AuctionSourceMatchCandidate | null;
  candidates: AuctionSourceMatchCandidate[];
  aliasSuggestion: AuctionSourceAliasSuggestion | null;
};

type MatchIndex = {
  exactName: Map<string, SleeperCandidate[]>;
  aliasName: Map<string, SleeperCandidate[]>;
  lastName: Map<string, SleeperCandidate[]>;
};

type NormalizedExportRow = {
  id: string;
  sourceId: string;
  sourceKey: AuctionValueSourceKey;
  sourceName: string;
  sourceFilename: string;
  rowNumber: number;
  seasonYear: AuctionSeasonYear;
  playerNameFromSource: string;
  normalizedPlayerName: string;
  matchedSearchName: string;
  appliedAlias: AuctionSourceAppliedAlias | null;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  auctionValue: number | null;
  normalizedAuctionValue: number | null;
  rank: number | null;
  tier: string | null;
  raw: Record<string, string | number | null>;
  warnings: AuctionImportValidationIssue[];
  errors: AuctionImportValidationIssue[];
};

type ImportSummary = {
  source: string;
  season: AuctionSeasonYear;
  inputFile: string;
  detectedBlocks: string[];
  rowsRead: number;
  rowsNormalized: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  ignored: number;
  duplicatesSkipped: number;
  warnings: number;
  errors: number;
  outputFiles: {
    valuesFile: string;
    reviewFile: string;
  };
};

export type AuctionSourceImportResult = {
  valuesOutput: AuctionSourceValuesFile;
  reviewOutput: AuctionSourceMatchReviewFile;
  summary: ImportSummary;
};

const HEADER_LOOKUP = new Map<string, CanonicalHeader>(
  Object.entries(HEADER_ALIASES).flatMap(([canonical, aliases]) =>
    aliases.map((alias) => [
      normalizeHeader(alias),
      canonical as CanonicalHeader,
    ])
  )
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeNameExact(value: string): string {
  return normalizeText(value)
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNameAlias(value: string): string {
  return normalizeText(value)
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\bdefense\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function normalizeTeam(team: string | null | undefined): string | null {
  if (!team) return null;
  const normalized = team.trim().toUpperCase();
  return TEAM_ALIASES[normalized] ?? normalized;
}

function normalizePosition(
  position: string | null | undefined
): AuctionPlayerPosition | null {
  if (!position) return null;
  const normalized = position.toUpperCase().replace(/[^A-Z]/g, "");
  const positionValue =
    normalized === "DST" || normalized === "DEFENSE" ? "DEF" : normalized;

  return VALID_POSITIONS.has(positionValue)
    ? (positionValue as AuctionPlayerPosition)
    : "UNK";
}

function readLastNameAlias(value: string): string | null {
  const tokens = normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !["jr", "sr", "ii", "iii", "iv", "v"].includes(token));

  return tokens.at(-1) ?? null;
}

function parseFiniteNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/[$,%]/g, "").replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | null | undefined): number | null {
  const parsed = parseFiniteNumber(value);
  return parsed === null ? null : Math.floor(parsed);
}

function isSupportedSeason(
  value: number | null | undefined
): value is AuctionSeasonYear {
  return SUPPORTED_SEASONS.includes(value as AuctionSeasonYear);
}

function parseArgs(argv: string[]): CliArgs | null {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const key = arg.slice(2);
    const nextArg = argv[index + 1];
    if (!nextArg || nextArg.startsWith("--")) continue;

    args.set(key, nextArg);
    index += 1;
  }

  const source = args.get("source")?.trim().toLowerCase();
  const seasonYear = parseInteger(args.get("season"));

  if (!source || !/^[a-z0-9-]+$/.test(source)) return null;
  if (!isSupportedSeason(seasonYear)) return null;

  return {
    source,
    seasonYear,
  };
}

function getUsage() {
  return [
    "Usage:",
    "npx tsx scripts/auction-import-source-export.ts --source fantasypros --season 2026",
    "npx tsx scripts/auction-import-source-export.ts --source rotowire --season 2026",
    "npx tsx scripts/auction-import-source-export.ts --source footballguys --season 2026",
  ].join("\n");
}

function getSourceDisplayName(source: string) {
  return (
    SOURCE_DISPLAY_NAMES[source] ??
    source
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function getCanonicalHeader(header: string): CanonicalHeader | null {
  return HEADER_LOOKUP.get(normalizeHeader(header)) ?? null;
}

function createIssue({
  code,
  message,
  severity = "warning",
  sourceId = null,
  rowId = null,
  rowNumber = null,
  field = null,
}: {
  code: string;
  message: string;
  severity?: AuctionImportValidationIssue["severity"];
  sourceId?: string | null;
  rowId?: string | null;
  rowNumber?: number | null;
  field?: string | null;
}): AuctionImportValidationIssue {
  const issueTarget = rowId ?? rowNumber ?? "source";

  return {
    id: `${issueTarget}:${code}`,
    severity,
    code,
    message,
    sourceId,
    rowId,
    rowNumber,
    field,
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      currentValue += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      currentRow.push(currentValue.trim());
      currentValue = "";
      if (currentRow.some((value) => value.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentValue += character;
  }

  currentRow.push(currentValue.trim());
  if (currentRow.some((value) => value.trim().length > 0)) rows.push(currentRow);

  return rows;
}

function getCsvValue(record: CsvRecord, header: CanonicalHeader) {
  return record.raw[header] ?? "";
}

function buildCsvRecordsFromRows(
  sourceFilename: string,
  rows: readonly string[][],
  headerRowIndex: number
): CsvRecord[] {
  const headers =
    rows[headerRowIndex]?.map((header, index) => ({
      canonical: getCanonicalHeader(header),
      fallback: `column-${index + 1}`,
      normalized: normalizeHeader(header),
    })) ?? [];

  if (headers.length === 0) return [];

  return rows.slice(headerRowIndex + 1).map((row, index) => {
    const raw = headers.reduce<Record<string, string>>(
      (record, header, cellIndex) => {
        const value = row[cellIndex]?.trim() ?? "";
        const rawKey = header.normalized || header.fallback;

        record[`raw:${rawKey}`] = value;

        if (header.canonical && (!record[header.canonical] || value)) {
          record[header.canonical] = value;
        }

        return record;
      },
      {}
    );

    return {
      sourceFilename,
      rowNumber: headerRowIndex + index + 2,
      raw,
    };
  });
}

function buildCsvRecords(sourceFilename: string, text: string): CsvRecord[] {
  return buildCsvRecordsFromRows(sourceFilename, parseCsv(text), 0);
}

function buildFlatCsvInput(sourceFilename: string, text: string): ParsedInput {
  const records = buildCsvRecords(sourceFilename, text);

  return {
    records,
    rowsRead: records.length,
    detectedBlocks: [],
    duplicatesSkipped: 0,
  };
}

function normalizeFantasyProsBlockLabel(value: string): string | null {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  return FANTASYPROS_BLOCK_HEADERS.has(normalized) ? normalized : null;
}

function getFantasyProsBlockPosition(
  label: string
): AuctionPlayerPosition | null {
  return label === "OVERALL" ? null : normalizePosition(label);
}

function findFantasyProsHeaderRow(rows: readonly string[][]) {
  return rows.findIndex((row) => {
    const blockHeaderCount = row.filter((cell) =>
      Boolean(normalizeFantasyProsBlockLabel(cell))
    ).length;
    const hasValueColumn = row.some(
      (cell) => normalizeHeader(cell) === "values"
    );

    return blockHeaderCount >= 3 && hasValueColumn;
  });
}

function findColumnInRange({
  row,
  startColumn,
  endColumn,
  normalizedHeader,
}: {
  row: readonly string[];
  startColumn: number;
  endColumn: number;
  normalizedHeader: string;
}) {
  for (let column = startColumn; column < endColumn; column += 1) {
    if (normalizeHeader(row[column] ?? "") === normalizedHeader) {
      return column;
    }
  }

  return null;
}

function detectFantasyProsBlocks(rows: readonly string[][]): {
  headerRowIndex: number;
  blocks: FantasyProsBlock[];
} {
  const headerRowIndex = findFantasyProsHeaderRow(rows);
  if (headerRowIndex === -1) {
    return {
      headerRowIndex,
      blocks: [],
    };
  }

  const headerRow = rows[headerRowIndex] ?? [];
  const blockStarts = headerRow
    .map((cell, column) => ({
      label: normalizeFantasyProsBlockLabel(cell),
      column,
    }))
    .filter(
      (blockStart): blockStart is { label: string; column: number } =>
        blockStart.label !== null
    );

  const blocks = blockStarts
    .map((blockStart, index): FantasyProsBlock => {
      const nextBlockStart = blockStarts[index + 1]?.column ?? headerRow.length;
      const byeWeekColumn = findColumnInRange({
        row: headerRow,
        startColumn: blockStart.column + 1,
        endColumn: nextBlockStart,
        normalizedHeader: "byeweek",
      });
      const valueColumn = findColumnInRange({
        row: headerRow,
        startColumn: blockStart.column + 1,
        endColumn: nextBlockStart,
        normalizedHeader: "values",
      });
      const tagsColumn = findColumnInRange({
        row: headerRow,
        startColumn: blockStart.column + 1,
        endColumn: nextBlockStart,
        normalizedHeader: "tags",
      });
      const expertNotesColumn = findColumnInRange({
        row: headerRow,
        startColumn: blockStart.column + 1,
        endColumn: nextBlockStart,
        normalizedHeader: "expertnotes",
      });

      return {
        label: blockStart.label,
        position: getFantasyProsBlockPosition(blockStart.label),
        playerColumn: blockStart.column,
        byeWeekColumn,
        valueColumn,
        tagsColumn,
        expertNotesColumn,
      };
    })
    .sort((firstBlock, secondBlock) => {
      if (firstBlock.label === "OVERALL") return -1;
      if (secondBlock.label === "OVERALL") return 1;
      return firstBlock.playerColumn - secondBlock.playerColumn;
    });

  return {
    headerRowIndex,
    blocks,
  };
}

function inferDefenseTeam(playerName: string): string | null {
  const defenseTeamByName = new Map(
    Object.entries(DEFENSE_NAME_BY_TEAM).map(([team, name]) => [
      normalizeNameAlias(name),
      team,
    ])
  );

  return defenseTeamByName.get(normalizeNameAlias(playerName)) ?? null;
}

function parseFantasyProsPlayerCell(
  playerCell: string,
  block: FantasyProsBlock
): {
  playerName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
} {
  const parentheticalMatch = playerCell.match(/^(.*?)\s*\(([^()]+)\)\s*$/);

  if (parentheticalMatch) {
    const playerName = parentheticalMatch[1].trim();
    const [positionText, teamText] = parentheticalMatch[2]
      .split("-")
      .map((part) => part.trim());

    return {
      playerName,
      position: normalizePosition(positionText),
      nflTeam: normalizeTeam(teamText),
    };
  }

  const dashMatch = playerCell.match(/^(.*?)\s+-\s+([A-Z]{2,4})\s*$/);

  if (dashMatch) {
    const playerName = dashMatch[1].trim();
    const position = block.position;

    return {
      playerName,
      position,
      nflTeam: normalizeTeam(dashMatch[2]),
    };
  }

  const position = block.position;

  return {
    playerName: playerCell.trim(),
    position,
    nflTeam: position === "DEF" ? inferDefenseTeam(playerCell) : null,
  };
}

function getFantasyProsDuplicateKey({
  playerName,
  nflTeam,
}: {
  playerName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
}) {
  return [normalizeNameAlias(playerName), nflTeam ?? "UNK"].join(":");
}

function buildFantasyProsCsvRecords(
  sourceFilename: string,
  text: string
): ParsedInput {
  const rows = parseCsv(text);
  const { headerRowIndex, blocks } = detectFantasyProsBlocks(rows);

  if (headerRowIndex === -1 || blocks.length === 0) {
    return buildFlatCsvInput(sourceFilename, text);
  }

  const records: CsvRecord[] = [];
  const seenDuplicateKeys = new Set<string>();
  let rowsRead = 0;
  let duplicatesSkipped = 0;

  for (const block of blocks) {
    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const playerCell = row[block.playerColumn]?.trim() ?? "";

      if (!playerCell) continue;

      rowsRead += 1;

      const identity = parseFantasyProsPlayerCell(playerCell, block);
      if (!identity.playerName) continue;

      const duplicateKey = getFantasyProsDuplicateKey(identity);

      if (seenDuplicateKeys.has(duplicateKey)) {
        duplicatesSkipped += 1;
        continue;
      }

      seenDuplicateKeys.add(duplicateKey);

      const value = block.valueColumn === null ? "" : row[block.valueColumn] ?? "";
      const byeWeek =
        block.byeWeekColumn === null ? "" : row[block.byeWeekColumn] ?? "";
      const tags = block.tagsColumn === null ? "" : row[block.tagsColumn] ?? "";
      const expertNotes =
        block.expertNotesColumn === null
          ? ""
          : row[block.expertNotesColumn] ?? "";

      records.push({
        sourceFilename,
        rowNumber: rowIndex + 1,
        raw: {
          player: identity.playerName,
          position: identity.position ?? "",
          team: identity.nflTeam ?? "",
          value,
          rank: "",
          tier: "",
          "raw:fantasyprosblock": block.label,
          "raw:fantasyprosplayercell": playerCell,
          "raw:byeweek": byeWeek,
          "raw:tags": tags,
          "raw:expertnotes": expertNotes,
        },
      });
    }
  }

  return {
    records,
    rowsRead,
    detectedBlocks: blocks.map((block) => block.label),
    duplicatesSkipped,
  };
}

function rowHasHeaders(
  row: readonly string[],
  headers: readonly string[]
): boolean {
  const normalizedHeaders = new Set(row.map(normalizeHeader));
  return headers.every((header) => normalizedHeaders.has(normalizeHeader(header)));
}

function findSourceHeaderRow(
  rows: readonly string[][],
  headers: readonly string[]
) {
  return rows.findIndex((row) => rowHasHeaders(row, headers));
}

function rowHasCanonicalHeaders(
  row: readonly string[],
  headers: readonly CanonicalHeader[]
) {
  const canonicalHeaders = new Set(
    row
      .map(getCanonicalHeader)
      .filter((header): header is CanonicalHeader => header !== null)
  );

  return headers.every((header) => canonicalHeaders.has(header));
}

function findRotoWireHeaderRow(rows: readonly string[][]) {
  return rows.findIndex(
    (row) =>
      rowHasCanonicalHeaders(row, ROTOWIRE_REQUIRED_HEADERS) &&
      (rowHasCanonicalHeaders(row, ROTOWIRE_OPTIONAL_HEADERS) ||
        !row.some((cell) => normalizeHeader(cell) === "rank"))
  );
}

function isRotoWireDataRecord(record: CsvRecord) {
  const playerName = getCsvValue(record, "player");
  const position = getCsvValue(record, "position");
  const value = parseFiniteNumber(getCsvValue(record, "value"));

  return Boolean(playerName && position && value !== null && value > 0);
}

function buildRotoWireCsvRecords(
  sourceFilename: string,
  text: string
): ParsedInput {
  const rows = parseCsv(text);
  const headerRowIndex = findRotoWireHeaderRow(rows);

  if (headerRowIndex === -1) {
    return buildFlatCsvInput(sourceFilename, text);
  }

  const records = buildCsvRecordsFromRows(
    sourceFilename,
    rows,
    headerRowIndex
  )
    .filter(isRotoWireDataRecord)
    .map((record) => ({
      ...record,
      raw: {
        ...record.raw,
        "raw:rotowirevalue": getCsvValue(record, "value"),
        "raw:byeweek": record.raw["raw:bye"] ?? "",
        "raw:rotowireheaderrow": String(headerRowIndex + 1),
      },
    }));

  return {
    records,
    rowsRead: records.length,
    detectedBlocks: ["ROTOWIRE"],
    duplicatesSkipped: 0,
  };
}

function cleanLineupExpertsPlayerName(
  playerName: string,
  position: string | null | undefined
) {
  const normalizedPosition = normalizePosition(position);

  if (normalizedPosition !== "DEF") return playerName;

  return playerName
    .replace(/\s+D\/ST$/i, "")
    .replace(/\s+DST$/i, "")
    .replace(/\s+DEF$/i, "")
    .trim();
}

function buildLineupExpertsCsvRecords(
  sourceFilename: string,
  text: string
): ParsedInput {
  const rows = parseCsv(text);
  const headerRowIndex = findSourceHeaderRow(rows, [
    "Player",
    "$ Value",
    "Team",
    "Pos",
  ]);

  if (headerRowIndex === -1) {
    return buildFlatCsvInput(sourceFilename, text);
  }

  const records = buildCsvRecordsFromRows(
    sourceFilename,
    rows,
    headerRowIndex
  ).map((record) => {
    const position = normalizePosition(getCsvValue(record, "position"));
    const playerName = cleanLineupExpertsPlayerName(
      getCsvValue(record, "player"),
      getCsvValue(record, "position")
    );

    return {
      ...record,
      raw: {
        ...record.raw,
        player: playerName,
        position: position ?? getCsvValue(record, "position"),
        "raw:lineupexpertsplayer": getCsvValue(record, "player"),
        "raw:lineupexpertsheaderrow": String(headerRowIndex + 1),
      },
    };
  });

  return {
    records,
    rowsRead: records.length,
    detectedBlocks: ["LINEUP_EXPERTS"],
    duplicatesSkipped: 0,
  };
}

function buildAliasLookup(aliases: Record<string, string>): Map<string, string> {
  const aliasLookup = new Map<string, string>();

  for (const [sourcePlayerName, sleeperSearchName] of Object.entries(aliases)) {
    aliasLookup.set(normalizeNameExact(sourcePlayerName), sleeperSearchName);
  }

  return aliasLookup;
}

function applyManualAlias(
  playerName: string,
  aliasLookup: Map<string, string>
): AuctionSourceAppliedAlias | null {
  const sleeperSearchName = aliasLookup.get(normalizeNameExact(playerName));

  if (!sleeperSearchName) return null;

  return {
    sourcePlayerName: playerName,
    sleeperSearchName,
  };
}

async function fetchSleeperPlayers(): Promise<Record<string, unknown>> {
  const response = await fetch(SLEEPER_PLAYERS_URL);
  if (!response.ok) {
    throw new Error(
      `Sleeper players request failed: ${response.status} ${response.statusText}`
    );
  }

  const parsed: unknown = await response.json();
  if (!isRecord(parsed)) {
    throw new Error("Sleeper players response was not an object.");
  }

  return parsed;
}

function getSleeperFullName(playerId: string, player: SleeperPlayer) {
  const directName = readString(player.full_name);
  if (directName) return directName;

  const joinedName = [readString(player.first_name), readString(player.last_name)]
    .filter(Boolean)
    .join(" ")
    .trim();

  return joinedName || playerId;
}

function getCandidateNames(playerId: string, player: SleeperPlayer): string[] {
  const fullName = getSleeperFullName(playerId, player);
  const names = new Set<string>([fullName]);
  const searchFullName = readString(player.search_full_name);

  if (searchFullName) names.add(searchFullName);

  if (player.position === "DEF") {
    const team = normalizeTeam(player.team);
    if (team && DEFENSE_NAME_BY_TEAM[team]) {
      names.add(DEFENSE_NAME_BY_TEAM[team]);
      names.add(`${DEFENSE_NAME_BY_TEAM[team]} DEF`);
      names.add(`${team} DEF`);
      names.add(team);
    }
  }

  return Array.from(names);
}

function buildSleeperCandidates(
  playersById: Record<string, unknown>
): SleeperCandidate[] {
  return Object.entries(playersById)
    .filter(([, player]) => isRecord(player))
    .map(([playerId, player]) => {
      const sleeperPlayer = player as SleeperPlayer;

      return {
        sleeperPlayerId: readId(sleeperPlayer.player_id) ?? String(playerId),
        fullName: getSleeperFullName(playerId, sleeperPlayer),
        searchNames: getCandidateNames(playerId, sleeperPlayer),
        position: normalizePosition(sleeperPlayer.position),
        team: normalizeTeam(sleeperPlayer.team),
        active: sleeperPlayer.active === true,
        status: readString(sleeperPlayer.status),
      };
    })
    .filter((candidate) => candidate.fullName.trim().length > 0);
}

function addToIndex(
  index: Map<string, SleeperCandidate[]>,
  key: string,
  candidate: SleeperCandidate
) {
  if (!key) return;
  const candidates = index.get(key) ?? [];
  candidates.push(candidate);
  index.set(key, candidates);
}

function buildMatchIndex(candidates: SleeperCandidate[]): MatchIndex {
  const exactName = new Map<string, SleeperCandidate[]>();
  const aliasName = new Map<string, SleeperCandidate[]>();
  const lastName = new Map<string, SleeperCandidate[]>();

  for (const candidate of candidates) {
    for (const name of candidate.searchNames) {
      addToIndex(exactName, normalizeNameExact(name), candidate);
      addToIndex(aliasName, normalizeNameAlias(name), candidate);

      const lastNameAlias = readLastNameAlias(name);
      if (lastNameAlias) addToIndex(lastName, lastNameAlias, candidate);
    }
  }

  return {
    exactName,
    aliasName,
    lastName,
  };
}

function uniqueByPlayerId(candidates: SleeperCandidate[]): SleeperCandidate[] {
  const seen = new Set<string>();
  const unique: SleeperCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.sleeperPlayerId)) continue;
    seen.add(candidate.sleeperPlayerId);
    unique.push(candidate);
  }

  return unique;
}

function toMatchCandidate(
  candidate: SleeperCandidate
): AuctionSourceMatchCandidate {
  return {
    sleeperPlayerId: candidate.sleeperPlayerId,
    sleeperName: candidate.fullName,
    position: candidate.position,
    nflTeam: candidate.team,
    active: candidate.active,
    status: candidate.status,
  };
}

function chooseUniqueCandidate(
  candidates: SleeperCandidate[],
  rowPosition: AuctionPlayerPosition | null,
  rowTeam: string | null,
  methodPrefix: string
): { candidate: SleeperCandidate | null; method: string } {
  const uniqueCandidates = uniqueByPlayerId(candidates);
  const attempts: Array<{ method: string; candidates: SleeperCandidate[] }> = [
    {
      method: `${methodPrefix}-position-team`,
      candidates: uniqueCandidates.filter(
        (candidate) =>
          rowPosition !== null &&
          rowTeam !== null &&
          candidate.position === rowPosition &&
          candidate.team === rowTeam
      ),
    },
    {
      method: `${methodPrefix}-position-active`,
      candidates: uniqueCandidates.filter(
        (candidate) =>
          rowPosition !== null &&
          candidate.position === rowPosition &&
          candidate.active
      ),
    },
    {
      method: `${methodPrefix}-team-active`,
      candidates: uniqueCandidates.filter(
        (candidate) =>
          rowTeam !== null && candidate.team === rowTeam && candidate.active
      ),
    },
    {
      method: `${methodPrefix}-position`,
      candidates: uniqueCandidates.filter(
        (candidate) =>
          rowPosition !== null && candidate.position === rowPosition
      ),
    },
    {
      method: `${methodPrefix}-team`,
      candidates: uniqueCandidates.filter(
        (candidate) => rowTeam !== null && candidate.team === rowTeam
      ),
    },
    {
      method: `${methodPrefix}-active`,
      candidates: uniqueCandidates.filter((candidate) => candidate.active),
    },
    {
      method: methodPrefix,
      candidates: uniqueCandidates,
    },
  ];

  for (const attempt of attempts) {
    if (attempt.candidates.length === 1) {
      return {
        candidate: attempt.candidates[0],
        method: attempt.method,
      };
    }
  }

  return {
    candidate: null,
    method: methodPrefix,
  };
}

function suggestAliasFromLastName(
  playerName: string,
  position: AuctionPlayerPosition | null,
  team: string | null,
  index: MatchIndex
): AuctionSourceAliasSuggestion | null {
  const lastNameAlias = readLastNameAlias(playerName);
  if (!lastNameAlias) return null;

  const candidates = uniqueByPlayerId(index.lastName.get(lastNameAlias) ?? []);
  const filtered = candidates.filter(
    (candidate) =>
      position !== null &&
      team !== null &&
      candidate.position === position &&
      candidate.team === team &&
      candidate.active
  );

  if (filtered.length !== 1) return null;

  return {
    sourcePlayerName: playerName,
    suggestedSleeperName: filtered[0].fullName,
    sleeperPlayerId: filtered[0].sleeperPlayerId,
    reason:
      "single active Sleeper candidate with same last name, position, and NFL team",
  };
}

function matchPlayer(
  playerName: string,
  position: AuctionPlayerPosition | null,
  team: string | null,
  index: MatchIndex
): MatchResult {
  const exactCandidates = uniqueByPlayerId(
    index.exactName.get(normalizeNameExact(playerName)) ?? []
  );

  if (exactCandidates.length > 0) {
    const exactChoice = chooseUniqueCandidate(
      exactCandidates,
      position,
      team,
      "exact-normalized-name"
    );

    if (exactChoice.candidate) {
      return {
        status: "matched",
        method: exactChoice.method,
        matchedPlayer: toMatchCandidate(exactChoice.candidate),
        candidates: exactCandidates.map(toMatchCandidate),
        aliasSuggestion: null,
      };
    }

    return {
      status: "ambiguous",
      method: "exact-normalized-name-ambiguous",
      matchedPlayer: null,
      candidates: exactCandidates.map(toMatchCandidate),
      aliasSuggestion: suggestAliasFromLastName(playerName, position, team, index),
    };
  }

  const aliasCandidates = uniqueByPlayerId(
    index.aliasName.get(normalizeNameAlias(playerName)) ?? []
  );

  if (aliasCandidates.length > 0) {
    const aliasChoice = chooseUniqueCandidate(
      aliasCandidates,
      position,
      team,
      "safe-alias-normalized-name"
    );

    if (aliasChoice.candidate) {
      const matchedPlayer = toMatchCandidate(aliasChoice.candidate);
      return {
        status: "matched",
        method: aliasChoice.method,
        matchedPlayer,
        candidates: aliasCandidates.map(toMatchCandidate),
        aliasSuggestion: {
          sourcePlayerName: playerName,
          suggestedSleeperName: matchedPlayer.sleeperName,
          sleeperPlayerId: matchedPlayer.sleeperPlayerId,
          reason:
            "safe punctuation/suffix-insensitive alias normalized to a single Sleeper candidate",
        },
      };
    }

    return {
      status: "ambiguous",
      method: "safe-alias-normalized-name-ambiguous",
      matchedPlayer: null,
      candidates: aliasCandidates.map(toMatchCandidate),
      aliasSuggestion: suggestAliasFromLastName(playerName, position, team, index),
    };
  }

  return {
    status: "unmatched",
    method: "no-sleeper-candidate",
    matchedPlayer: null,
    candidates: [],
    aliasSuggestion: suggestAliasFromLastName(playerName, position, team, index),
  };
}

function getMatchConfidence(status: AuctionImportMatchStatus, method: string) {
  if (status === "ignored" || status === "unmatched") return 0;
  if (status === "ambiguous") return 45;
  if (status === "probable") return 65;
  if (method.includes("manual-alias")) return 96;
  if (method.includes("position-team")) return 94;
  if (method.includes("position-active")) return 90;
  if (method.includes("safe-alias")) return 82;
  return 88;
}

function getSourceConfidence(
  warnings: readonly AuctionImportValidationIssue[],
  errors: readonly AuctionImportValidationIssue[]
) {
  if (errors.length > 0) return 50;
  if (warnings.length > 0) return 80;
  return 100;
}

function normalizeCsvRecord({
  record,
  source,
  seasonYear,
  aliasLookup,
}: {
  record: CsvRecord;
  source: string;
  seasonYear: AuctionSeasonYear;
  aliasLookup: Map<string, string>;
}): NormalizedExportRow {
  const sourceKey = source as AuctionValueSourceKey;
  const sourceName = getSourceDisplayName(source);
  const sourceId = `${source}:${seasonYear}:${slugify(record.sourceFilename)}`;
  const rowId = `${sourceId}:row-${record.rowNumber}`;
  const warnings: AuctionImportValidationIssue[] = [];
  const errors: AuctionImportValidationIssue[] = [];
  const playerNameFromSource = getCsvValue(record, "player");
  const auctionValue = parseFiniteNumber(getCsvValue(record, "value"));
  const position = normalizePosition(getCsvValue(record, "position"));
  const nflTeam = normalizeTeam(getCsvValue(record, "team"));
  const rank = parseInteger(getCsvValue(record, "rank"));
  const tier = getCsvValue(record, "tier") || null;

  if (!playerNameFromSource) {
    errors.push(
      createIssue({
        code: "missing-player",
        message: "Source export row is missing player/name.",
        severity: "error",
        sourceId,
        rowId,
        rowNumber: record.rowNumber,
        field: "player",
      })
    );
  }

  if (!position) {
    warnings.push(
      createIssue({
        code: "missing-position",
        message: "Source export row is missing position/pos.",
        sourceId,
        rowId,
        rowNumber: record.rowNumber,
        field: "position",
      })
    );
  }

  if (auctionValue === null || auctionValue < 0) {
    errors.push(
      createIssue({
        code: "invalid-value",
        message:
          "Source export row value must be a non-negative finite auction value.",
        severity: "error",
        sourceId,
        rowId,
        rowNumber: record.rowNumber,
        field: "value",
      })
    );
  }

  const appliedAlias = playerNameFromSource
    ? applyManualAlias(playerNameFromSource, aliasLookup)
    : null;
  const matchedSearchName =
    appliedAlias?.sleeperSearchName ?? playerNameFromSource;

  return {
    id: rowId,
    sourceId,
    sourceKey,
    sourceName,
    sourceFilename: record.sourceFilename,
    rowNumber: record.rowNumber,
    seasonYear,
    playerNameFromSource,
    normalizedPlayerName: normalizeNameExact(playerNameFromSource),
    matchedSearchName,
    appliedAlias,
    position,
    nflTeam,
    auctionValue,
    normalizedAuctionValue: auctionValue,
    rank,
    tier,
    raw: {
      player: playerNameFromSource || null,
      position: getCsvValue(record, "position") || null,
      team: getCsvValue(record, "team") || null,
      value: getCsvValue(record, "value") || null,
      source: sourceName,
      season: seasonYear,
      rank: getCsvValue(record, "rank") || null,
      tier,
      ...record.raw,
    },
    warnings,
    errors,
  };
}

function buildSource({
  source,
  sourceName,
  seasonYear,
  sourceFilename,
  generatedAt,
  rows,
}: {
  source: string;
  sourceName: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  generatedAt: AuctionTimestamp;
  rows: NormalizedExportRow[];
}): AuctionValueSource {
  const warnings = rows.flatMap((row) => row.warnings);
  const errors = rows.flatMap((row) => row.errors);
  const status: AuctionValueSource["status"] =
    errors.length > 0
      ? "review-needed"
      : warnings.length > 0
        ? "normalized"
        : "matched";

  return {
    id: `${source}:${seasonYear}:${slugify(sourceFilename)}`,
    sourceKey: source as AuctionValueSourceKey,
    sourceName,
    sourceKind: SOURCE_KIND,
    seasonYear,
    scoringFormat: DEFAULT_SCORING_FORMAT,
    auctionBudget: DEFAULT_AUCTION_BUDGET,
    teamCount: DEFAULT_TEAM_COUNT,
    sourceFilename,
    sourceSheetName: null,
    sourceUrl: null,
    importedAt: generatedAt,
    importedBy: null,
    adapterVersion: ADAPTER_VERSION,
    status,
    warnings,
    errors,
  };
}

function buildValueRow(
  row: NormalizedExportRow,
  matchResult: MatchResult,
  generatedAt: AuctionTimestamp
): AuctionSourceValueRow {
  const ignored = row.errors.some((issue) => issue.code === "missing-player");
  const matchStatus: AuctionImportMatchStatus = ignored
    ? "ignored"
    : matchResult.status;
  const matchMethod = ignored ? "missing-player" : matchResult.method;

  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceKey: row.sourceKey,
    sourceName: row.sourceName,
    sourceKind: SOURCE_KIND,
    seasonYear: row.seasonYear,
    scoringFormat: DEFAULT_SCORING_FORMAT,
    auctionBudget: DEFAULT_AUCTION_BUDGET,
    teamCount: DEFAULT_TEAM_COUNT,
    sourceFilename: row.sourceFilename,
    rowNumber: row.rowNumber,
    playerNameFromSource: row.playerNameFromSource,
    normalizedPlayerName: row.normalizedPlayerName,
    matchedSleeperId: matchResult.matchedPlayer?.sleeperPlayerId ?? null,
    matchedSleeperName: matchResult.matchedPlayer?.sleeperName ?? null,
    position: row.position,
    nflTeam: row.nflTeam,
    auctionValue: row.auctionValue,
    normalizedAuctionValue: row.normalizedAuctionValue,
    rank: row.rank,
    tier: row.tier,
    sourceConfidence: getSourceConfidence(row.warnings, row.errors),
    matchConfidence: getMatchConfidence(matchStatus, matchMethod),
    matchStatus,
    matchMethod,
    warnings: row.warnings,
    errors: row.errors,
    raw: row.raw,
    importedAt: generatedAt,
  };
}

function buildReviewRow(
  row: NormalizedExportRow,
  valueRow: AuctionSourceValueRow,
  matchResult: MatchResult
): AuctionSourceMatchReviewRow {
  return {
    id: `${row.id}:review`,
    seasonYear: row.seasonYear,
    sourceId: row.sourceId,
    sourceRowId: row.id,
    sourceFilename: row.sourceFilename,
    rowNumber: row.rowNumber,
    playerNameFromSource: row.playerNameFromSource,
    normalizedPlayerName: row.normalizedPlayerName,
    matchedSearchName: row.matchedSearchName,
    appliedAlias: row.appliedAlias,
    position: row.position,
    nflTeam: row.nflTeam,
    auctionValue: row.auctionValue,
    matchedSleeperId: valueRow.matchedSleeperId,
    matchedSleeperName: valueRow.matchedSleeperName,
    matchStatus: valueRow.matchStatus,
    matchMethod: valueRow.matchMethod,
    matchConfidence: valueRow.matchConfidence,
    candidates: matchResult.candidates,
    aliasSuggestion: matchResult.aliasSuggestion,
    reviewStatus:
      valueRow.matchStatus === "matched"
        ? "accepted"
        : valueRow.matchStatus === "ignored"
          ? "ignored"
          : "pending",
    warnings: row.warnings,
    errors: row.errors,
  };
}

function groupDuplicateMatches(
  rows: readonly AuctionSourceMatchReviewRow[]
): AuctionSourceDuplicateMatch[] {
  const rowsBySleeperId = new Map<string, AuctionSourceMatchReviewRow[]>();

  for (const row of rows) {
    if (!row.matchedSleeperId) continue;
    const existing = rowsBySleeperId.get(row.matchedSleeperId) ?? [];
    existing.push(row);
    rowsBySleeperId.set(row.matchedSleeperId, existing);
  }

  return Array.from(rowsBySleeperId.entries())
    .filter(([, groupedRows]) => groupedRows.length > 1)
    .map(([sleeperPlayerId, groupedRows]) => ({
      sleeperPlayerId,
      sleeperName: groupedRows[0]?.matchedSleeperName ?? null,
      rows: groupedRows.map((row) => ({
        sourceRowId: row.sourceRowId,
        rowNumber: row.rowNumber,
        playerNameFromSource: row.playerNameFromSource,
        sourceFilename: row.sourceFilename,
        position: row.position,
        nflTeam: row.nflTeam,
      })),
    }));
}

function countByStatus(
  rows: readonly { matchStatus: AuctionImportMatchStatus }[],
  status: AuctionImportMatchStatus
) {
  return rows.filter((row) => row.matchStatus === status).length;
}

function countIssues(
  rows: readonly Pick<AuctionSourceValueRow, "warnings" | "errors">[],
  severity: AuctionImportValidationIssue["severity"]
) {
  return rows.reduce(
    (count, row) =>
      count +
      (severity === "warning" ? row.warnings.length : row.errors.length),
    0
  );
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(
    path.join(process.cwd(), filePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

async function writeOutputs({
  source,
  seasonYear,
  sourceValuesFile,
  reviewFile,
  valuesOutput,
  reviewOutput,
}: {
  source: string;
  seasonYear: AuctionSeasonYear;
  sourceValuesFile: string;
  reviewFile: string;
  valuesOutput: AuctionSourceValuesFile;
  reviewOutput: AuctionSourceMatchReviewFile;
}) {
  await writeJsonFile(sourceValuesFile, valuesOutput);
  await writeJsonFile(reviewFile, reviewOutput);

  return {
    source,
    season: seasonYear,
    outputFiles: {
      valuesFile: sourceValuesFile,
      reviewFile,
    },
  };
}

function parseSourceExportText({
  source,
  sourceFilename,
  text,
}: {
  source: string;
  sourceFilename: string;
  text: string;
}) {
  return source === "fantasypros"
    ? buildFantasyProsCsvRecords(sourceFilename, text)
    : source === "rotowire"
      ? buildRotoWireCsvRecords(sourceFilename, text)
      : source === "lineupexperts"
        ? buildLineupExpertsCsvRecords(sourceFilename, text)
        : buildFlatCsvInput(sourceFilename, text);
}

export async function importAuctionSourceExportText({
  source,
  seasonYear,
  sourceFilename,
  text,
  inputFile,
  sourceValuesFile,
  reviewFile,
  writeFiles = false,
}: {
  source: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  text: string;
  inputFile: string;
  sourceValuesFile: string;
  reviewFile: string;
  writeFiles?: boolean;
}): Promise<AuctionSourceImportResult> {
  const generatedAt = new Date().toISOString();
  const sourceName = getSourceDisplayName(source);
  const parsedInput = parseSourceExportText({
    source,
    sourceFilename,
    text,
  });
  const { records } = parsedInput;
  const playerAliases = getAuctionPlayerAliases();
  const aliasLookup = buildAliasLookup(playerAliases);
  const normalizedRows = records.map((record) =>
    normalizeCsvRecord({
      record,
      source,
      seasonYear,
      aliasLookup,
    })
  );

  const matchIndex =
    normalizedRows.length > 0
      ? buildMatchIndex(buildSleeperCandidates(await fetchSleeperPlayers()))
      : null;
  const valueRows: AuctionSourceValueRow[] = [];
  const reviewRows: AuctionSourceMatchReviewRow[] = [];

  for (const row of normalizedRows) {
    const matchResult =
      row.playerNameFromSource.trim().length === 0 || matchIndex === null
        ? {
            status: "unmatched" as const,
            method: "missing-player",
            matchedPlayer: null,
            candidates: [],
            aliasSuggestion: null,
          }
        : matchPlayer(
            row.matchedSearchName,
            row.position,
            row.nflTeam,
            matchIndex
          );
    const aliasAwareMatchResult: MatchResult =
      row.appliedAlias && matchResult.status === "matched"
        ? {
            ...matchResult,
            method: `manual-alias-${matchResult.method}`,
          }
        : matchResult;
    const valueRow = buildValueRow(row, aliasAwareMatchResult, generatedAt);

    valueRows.push(valueRow);
    reviewRows.push(buildReviewRow(row, valueRow, aliasAwareMatchResult));
  }

  const sourceRecord = buildSource({
    source,
    sourceName,
    seasonYear,
    sourceFilename,
    generatedAt,
    rows: normalizedRows,
  });
  const duplicateMatches = groupDuplicateMatches(reviewRows);
  const suggestedAliases = reviewRows
    .map((row) => row.aliasSuggestion)
    .filter((alias): alias is AuctionSourceAliasSuggestion => alias !== null);
  const valuesOutput: AuctionSourceValuesFile = {
    generatedAt,
    sourceKey: source as AuctionValueSourceKey,
    seasonYear,
    inputDirectory: INPUT_DIR,
    outputDirectory: OUTPUT_DIR,
    playerAliasesFile: AUCTION_PLAYER_ALIASES_FILE,
    sleeperPlayersUrl: SLEEPER_PLAYERS_URL,
    sources: [sourceRecord],
    rowCount: valueRows.length,
    matchedRowCount: countByStatus(valueRows, "matched"),
    probableMatchRowCount: countByStatus(valueRows, "probable"),
    ambiguousRowCount: countByStatus(valueRows, "ambiguous"),
    unmatchedRowCount: countByStatus(valueRows, "unmatched"),
    ignoredRowCount: countByStatus(valueRows, "ignored"),
    warningCount: countIssues(valueRows, "warning"),
    errorCount: countIssues(valueRows, "error"),
    rows: valueRows,
  };
  const reviewOutput: AuctionSourceMatchReviewFile = {
    generatedAt,
    sourceKey: source as AuctionValueSourceKey,
    seasonYear,
    sourceValuesFile,
    playerAliasesFile: AUCTION_PLAYER_ALIASES_FILE,
    sleeperPlayersUrl: SLEEPER_PLAYERS_URL,
    rowCount: reviewRows.length,
    matchedRowCount: countByStatus(reviewRows, "matched"),
    probableMatchRowCount: countByStatus(reviewRows, "probable"),
    ambiguousRowCount: countByStatus(reviewRows, "ambiguous"),
    unmatchedRowCount: countByStatus(reviewRows, "unmatched"),
    ignoredRowCount: countByStatus(reviewRows, "ignored"),
    duplicateMatchedSleeperIdCount: duplicateMatches.length,
    duplicateMatches,
    suggestedAliases,
    rows: reviewRows,
  };

  if (writeFiles) {
    await writeOutputs({
      source,
      seasonYear,
      sourceValuesFile,
      reviewFile,
      valuesOutput,
      reviewOutput,
    });
  }

  return {
    valuesOutput,
    reviewOutput,
    summary: {
      source,
      season: seasonYear,
      inputFile,
      detectedBlocks: parsedInput.detectedBlocks,
      rowsRead: parsedInput.rowsRead,
      rowsNormalized: valueRows.length,
      matched: countByStatus(valueRows, "matched"),
      unmatched: countByStatus(valueRows, "unmatched"),
      ambiguous: countByStatus(valueRows, "ambiguous"),
      ignored: countByStatus(valueRows, "ignored"),
      duplicatesSkipped: parsedInput.duplicatesSkipped,
      warnings: countIssues(valueRows, "warning"),
      errors: countIssues(valueRows, "error"),
      outputFiles: {
        valuesFile: sourceValuesFile,
        reviewFile,
      },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args) {
    console.error(getUsage());
    process.exitCode = 1;
    return;
  }

  const { source, seasonYear } = args;
  const inputFilename = `${source}-${seasonYear}.csv`;
  const inputFile = path.join(INPUT_DIR, inputFilename);
  const sourceValuesFile = `${OUTPUT_DIR}/${source}-${seasonYear}.json`;
  const reviewFile = `${OUTPUT_DIR}/${source}-${seasonYear}-review.json`;

  await mkdir(INPUT_DIR, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  if (!existsSync(inputFile)) {
    console.log(
      `No matching export CSV found for ${getSourceDisplayName(source)} ${seasonYear}.\nPlace export CSV at ${inputFile}`
    );
    return;
  }

  const text = await readFile(inputFile, "utf8");
  const result = await importAuctionSourceExportText({
    source,
    seasonYear,
    sourceFilename: inputFilename,
    text,
    inputFile,
    sourceValuesFile,
    reviewFile,
    writeFiles: true,
  });

  console.log(JSON.stringify(result.summary, null, 2));
}

if (process.argv[1]?.endsWith("auction-import-source-export.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
