import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
} from "../lib/auction/valueSources";

const INPUT_DIR = "data/auction/source-imports/manual-csv";
const OUTPUT_DIR = "data/auction/source-values";
const PLAYER_ALIASES_PATH = "data/auction/player-aliases.json";
const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const ADAPTER_VERSION = "manual-csv-v1";
const SOURCE_KEY = "manual-csv";
const DEFAULT_SOURCE_NAME = "Manual CSV";
const DEFAULT_SCORING_FORMAT = "custom" satisfies AuctionValueScoringFormat;
const DEFAULT_AUCTION_BUDGET = 200;
const DEFAULT_TEAM_COUNT = 12;

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

type CsvRecord = {
  sourceFilename: string;
  rowNumber: number;
  raw: Record<string, string>;
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
  status: Extract<AuctionImportMatchStatus, "matched" | "ambiguous" | "unmatched">;
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

type NormalizedCsvRowDraft = {
  id: string;
  sourceId: string;
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
  filesRead: number;
  rowsRead: number;
  rowsNormalized: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  ignored: number;
  warnings: number;
  errors: number;
  outputs: Array<{
    seasonYear: AuctionSeasonYear;
    valuesFile: string;
    reviewFile: string;
    rowCount: number;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function parseSeason(
  value: string | null | undefined,
  sourceFilename: string
): AuctionSeasonYear | null {
  const parsedFromRow = parseInteger(value);
  if (isSupportedSeason(parsedFromRow)) return parsedFromRow;

  const parsedFromFilename = Number(
    sourceFilename.match(/(?:^|[/_-])(20\d{2})(?:[/_.-]|$)/)?.[1]
  );
  return isSupportedSeason(parsedFromFilename) ? parsedFromFilename : null;
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

function getCsvValue(record: CsvRecord, header: string) {
  return record.raw[header] ?? "";
}

function buildCsvRecords(sourceFilename: string, text: string): CsvRecord[] {
  const rows = parseCsv(text);
  const headers = rows[0]?.map(normalizeHeader) ?? [];

  if (headers.length === 0) return [];

  return rows.slice(1).map((row, index) => {
    const raw = headers.reduce<Record<string, string>>((record, header, cellIndex) => {
      if (!header) return record;
      record[header] = row[cellIndex]?.trim() ?? "";
      return record;
    }, {});

    return {
      sourceFilename,
      rowNumber: index + 2,
      raw,
    };
  });
}

async function readCsvRecords(): Promise<CsvRecord[]> {
  await mkdir(INPUT_DIR, { recursive: true });
  if (!existsSync(INPUT_DIR)) return [];

  const filenames = (await readdir(INPUT_DIR))
    .filter((filename) => filename.toLowerCase().endsWith(".csv"))
    .filter((filename) => !filename.startsWith("~$"))
    .sort();
  const records: CsvRecord[] = [];

  for (const filename of filenames) {
    const filePath = path.join(INPUT_DIR, filename);
    const text = await readFile(filePath, "utf8");
    records.push(...buildCsvRecords(filename, text));
  }

  return records;
}

async function readPlayerAliases(): Promise<Record<string, string>> {
  const rawJson = await readFile(PLAYER_ALIASES_PATH, "utf8");
  const parsed: unknown = JSON.parse(rawJson);

  if (!isRecord(parsed)) {
    throw new Error(`Invalid alias file: ${PLAYER_ALIASES_PATH}`);
  }

  return Object.entries(parsed).reduce<Record<string, string>>(
    (aliases, [sourceName, sleeperName]) => {
      const cleanSourceName = readString(sourceName);
      const cleanSleeperName = readString(sleeperName);

      if (cleanSourceName && cleanSleeperName) {
        aliases[cleanSourceName] = cleanSleeperName;
      }

      return aliases;
    },
    {}
  );
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

function getCandidateNames(playerId: string, player: SleeperPlayer): string[] {
  const fullName =
    readString(player.full_name) ??
    [readString(player.first_name), readString(player.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim() ??
    playerId;
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
      const fullName =
        readString(sleeperPlayer.full_name) ??
        [readString(sleeperPlayer.first_name), readString(sleeperPlayer.last_name)]
          .filter(Boolean)
          .join(" ")
          .trim() ??
        playerId;

      return {
        sleeperPlayerId:
          readString(sleeperPlayer.player_id) ?? String(playerId),
        fullName,
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
          rowPosition &&
          rowTeam &&
          candidate.position === rowPosition &&
          candidate.team === rowTeam
      ),
    },
    {
      method: `${methodPrefix}-position-active`,
      candidates: uniqueCandidates.filter(
        (candidate) =>
          rowPosition && candidate.position === rowPosition && candidate.active
      ),
    },
    {
      method: `${methodPrefix}-team-active`,
      candidates: uniqueCandidates.filter(
        (candidate) => rowTeam && candidate.team === rowTeam && candidate.active
      ),
    },
    {
      method: `${methodPrefix}-position`,
      candidates: uniqueCandidates.filter(
        (candidate) => rowPosition && candidate.position === rowPosition
      ),
    },
    {
      method: `${methodPrefix}-team`,
      candidates: uniqueCandidates.filter(
        (candidate) => rowTeam && candidate.team === rowTeam
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
      position &&
      team &&
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

function normalizeCsvRecord(
  record: CsvRecord,
  generatedAt: AuctionTimestamp,
  aliasLookup: Map<string, string>
): NormalizedCsvRowDraft | null {
  const sourceName = getCsvValue(record, "source") || DEFAULT_SOURCE_NAME;
  const seasonYear = parseSeason(getCsvValue(record, "season"), record.sourceFilename);
  const sourceId = seasonYear
    ? `${SOURCE_KEY}:${seasonYear}:${slugify(sourceName)}:${slugify(record.sourceFilename)}`
    : `${SOURCE_KEY}:unknown:${slugify(sourceName)}:${slugify(record.sourceFilename)}`;
  const rowId = `${sourceId}:row-${record.rowNumber}`;
  const warnings: AuctionImportValidationIssue[] = [];
  const errors: AuctionImportValidationIssue[] = [];
  const playerNameFromSource = getCsvValue(record, "player");
  const auctionValue = parseFiniteNumber(getCsvValue(record, "value"));
  const position = normalizePosition(getCsvValue(record, "position"));
  const nflTeam = normalizeTeam(getCsvValue(record, "team"));
  const rank = parseInteger(getCsvValue(record, "rank"));
  const tier = getCsvValue(record, "tier") || null;

  if (!seasonYear) {
    errors.push(
      createIssue({
        code: "missing-or-unsupported-season",
        message:
          "Manual CSV row must include a supported season or use a filename containing the season.",
        severity: "error",
        sourceId,
        rowId,
        rowNumber: record.rowNumber,
        field: "season",
      })
    );
    return null;
  }

  if (!playerNameFromSource) {
    errors.push(
      createIssue({
        code: "missing-player",
        message: "Manual CSV row is missing player.",
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
        message: "Manual CSV row is missing position.",
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
        message: "Manual CSV row value must be a non-negative finite number.",
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
      season: getCsvValue(record, "season") || seasonYear,
      rank: getCsvValue(record, "rank") || null,
      tier,
    },
    warnings,
    errors,
  };
}

function buildSource(
  row: NormalizedCsvRowDraft,
  generatedAt: AuctionTimestamp
): AuctionValueSource {
  const status: AuctionValueSource["status"] =
    row.errors.length > 0
      ? "review-needed"
      : row.warnings.length > 0
        ? "normalized"
        : "matched";

  return {
    id: row.sourceId,
    sourceKey: SOURCE_KEY,
    sourceName: row.sourceName,
    sourceKind: "manual-csv",
    seasonYear: row.seasonYear,
    scoringFormat: DEFAULT_SCORING_FORMAT,
    auctionBudget: DEFAULT_AUCTION_BUDGET,
    teamCount: DEFAULT_TEAM_COUNT,
    sourceFilename: row.sourceFilename,
    sourceSheetName: null,
    sourceUrl: null,
    importedAt: generatedAt,
    importedBy: null,
    adapterVersion: ADAPTER_VERSION,
    status,
    warnings: row.warnings,
    errors: row.errors,
  };
}

function buildValueRow(
  row: NormalizedCsvRowDraft,
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
    sourceKey: SOURCE_KEY,
    sourceName: row.sourceName,
    sourceKind: "manual-csv",
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
  row: NormalizedCsvRowDraft,
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

async function writeSeasonOutputs({
  seasonYear,
  sources,
  rows,
  reviewRows,
  generatedAt,
}: {
  seasonYear: AuctionSeasonYear;
  sources: AuctionValueSource[];
  rows: AuctionSourceValueRow[];
  reviewRows: AuctionSourceMatchReviewRow[];
  generatedAt: AuctionTimestamp;
}) {
  const sourceValuesFile = `${OUTPUT_DIR}/manual-csv-${seasonYear}.json`;
  const reviewFile = `${OUTPUT_DIR}/manual-csv-${seasonYear}-review.json`;
  const duplicateMatches = groupDuplicateMatches(reviewRows);
  const suggestedAliases = reviewRows
    .map((row) => row.aliasSuggestion)
    .filter((alias): alias is AuctionSourceAliasSuggestion => alias !== null);
  const valuesOutput: AuctionSourceValuesFile = {
    generatedAt,
    sourceKey: SOURCE_KEY,
    seasonYear,
    inputDirectory: INPUT_DIR,
    outputDirectory: OUTPUT_DIR,
    playerAliasesFile: PLAYER_ALIASES_PATH,
    sleeperPlayersUrl: SLEEPER_PLAYERS_URL,
    sources,
    rowCount: rows.length,
    matchedRowCount: countByStatus(rows, "matched"),
    probableMatchRowCount: countByStatus(rows, "probable"),
    ambiguousRowCount: countByStatus(rows, "ambiguous"),
    unmatchedRowCount: countByStatus(rows, "unmatched"),
    ignoredRowCount: countByStatus(rows, "ignored"),
    warningCount: countIssues(rows, "warning"),
    errorCount: countIssues(rows, "error"),
    rows,
  };
  const reviewOutput: AuctionSourceMatchReviewFile = {
    generatedAt,
    sourceKey: SOURCE_KEY,
    seasonYear,
    sourceValuesFile,
    playerAliasesFile: PLAYER_ALIASES_PATH,
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

  await writeJsonFile(sourceValuesFile, valuesOutput);
  await writeJsonFile(reviewFile, reviewOutput);

  return {
    seasonYear,
    valuesFile: sourceValuesFile,
    reviewFile,
    rowCount: rows.length,
  };
}

async function main() {
  const generatedAt = new Date().toISOString();
  await mkdir(OUTPUT_DIR, { recursive: true });

  const records = await readCsvRecords();
  const playerAliases = await readPlayerAliases();
  const aliasLookup = buildAliasLookup(playerAliases);
  const normalizedRows = records
    .map((record) => normalizeCsvRecord(record, generatedAt, aliasLookup))
    .filter((row): row is NormalizedCsvRowDraft => row !== null);

  if (normalizedRows.length === 0) {
    const summary: ImportSummary = {
      filesRead: 0,
      rowsRead: records.length,
      rowsNormalized: 0,
      matched: 0,
      unmatched: 0,
      ambiguous: 0,
      ignored: 0,
      warnings: 0,
      errors: 0,
      outputs: [],
    };
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const sleeperPlayers = await fetchSleeperPlayers();
  const matchIndex = buildMatchIndex(buildSleeperCandidates(sleeperPlayers));
  const sourcesById = new Map<string, AuctionValueSource>();
  const valueRows: AuctionSourceValueRow[] = [];
  const reviewRows: AuctionSourceMatchReviewRow[] = [];

  for (const row of normalizedRows) {
    const source = buildSource(row, generatedAt);
    sourcesById.set(source.id, source);

    const matchResult =
      row.playerNameFromSource.trim().length === 0
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

  const outputs: ImportSummary["outputs"] = [];
  const seasons = Array.from(
    new Set(valueRows.map((row) => row.seasonYear))
  ).sort((left, right) => left - right);

  for (const seasonYear of seasons) {
    const rowsForSeason = valueRows.filter((row) => row.seasonYear === seasonYear);
    const reviewRowsForSeason = reviewRows.filter(
      (row) => row.seasonYear === seasonYear
    );
    const sourcesForSeason = Array.from(sourcesById.values()).filter(
      (source) => source.seasonYear === seasonYear
    );

    outputs.push(
      await writeSeasonOutputs({
        seasonYear,
        sources: sourcesForSeason,
        rows: rowsForSeason,
        reviewRows: reviewRowsForSeason,
        generatedAt,
      })
    );
  }

  const filenames = new Set(records.map((record) => record.sourceFilename));
  const summary: ImportSummary = {
    filesRead: filenames.size,
    rowsRead: records.length,
    rowsNormalized: valueRows.length,
    matched: countByStatus(valueRows, "matched"),
    unmatched: countByStatus(valueRows, "unmatched"),
    ambiguous: countByStatus(valueRows, "ambiguous"),
    ignored: countByStatus(valueRows, "ignored"),
    warnings: countIssues(valueRows, "warning"),
    errors: countIssues(valueRows, "error"),
    outputs,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
