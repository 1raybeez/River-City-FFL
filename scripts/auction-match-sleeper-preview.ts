import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AuctionImportPreview } from "../lib/auction/importTypes";
import type { AuctionPlayerPosition } from "../lib/auction/types";

const MASTER_VIEW_2025_PATH =
  "data/auction/processed/masterview-2025.json";
const REVIEW_OUTPUT_PATH =
  "data/auction/processed/sleeper-match-review-2025.json";
const PLAYER_ALIASES_PATH = "data/auction/player-aliases.json";
const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";
const TOP_UNMATCHED_LIMIT = 25;

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

interface MasterviewProcessedFile {
  seasonYear: 2025;
  sourceFilename: string;
  preview: AuctionImportPreview;
}

interface MasterviewRawPayload {
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  statusColumns?: Record<string, string>;
}

interface SleeperPlayer {
  player_id?: string | number | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  search_full_name?: string | null;
  position?: string | null;
  team?: string | null;
  active?: boolean | null;
  status?: string | null;
  fantasy_positions?: string[] | null;
}

interface SleeperCandidate {
  sleeperPlayerId: string;
  fullName: string;
  searchNames: string[];
  position: AuctionPlayerPosition | null;
  team: string | null;
  active: boolean;
  status: string | null;
}

interface MatchedPlayer {
  sleeperPlayerId: string;
  fullName: string;
  position: AuctionPlayerPosition | null;
  team: string | null;
  active: boolean;
  status: string | null;
}

interface MatchResult {
  status: "matched" | "ambiguous" | "unmatched";
  method: string;
  matchedPlayer: MatchedPlayer | null;
  candidates: MatchedPlayer[];
  aliasSuggestion: AliasSuggestion | null;
}

interface AliasSuggestion {
  masterviewName: string;
  suggestedSleeperName: string;
  sleeperPlayerId: string;
  reason: string;
}

interface AppliedAlias {
  masterviewName: string;
  sleeperSearchName: string;
}

interface ReviewRow {
  rowNumber: number;
  playerName: string;
  matchedSearchName: string;
  appliedAlias: AppliedAlias | null;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  averageValue: number | null;
  lowValue: number | null;
  highValue: number | null;
  statusColumns: Record<string, string>;
  matchStatus: MatchResult["status"];
  matchMethod: string;
  sleeperPlayerId: string | null;
  sleeperName: string | null;
  sleeperPosition: AuctionPlayerPosition | null;
  sleeperTeam: string | null;
  candidates: MatchedPlayer[];
  aliasSuggestion: AliasSuggestion | null;
}

interface MatchIndex {
  exactName: Map<string, SleeperCandidate[]>;
  aliasName: Map<string, SleeperCandidate[]>;
  lastName: Map<string, SleeperCandidate[]>;
}

interface MatchCounts {
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  duplicateMatchedSleeperIdCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function readLastNameAlias(value: string): string | null {
  const tokens = normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !["jr", "sr", "ii", "iii", "iv", "v"].includes(token));

  return tokens.at(-1) ?? null;
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

function toMatchedPlayer(candidate: SleeperCandidate): MatchedPlayer {
  return {
    sleeperPlayerId: candidate.sleeperPlayerId,
    fullName: candidate.fullName,
    position: candidate.position,
    team: candidate.team,
    active: candidate.active,
    status: candidate.status,
  };
}

function getCandidateNames(
  playerId: string,
  player: SleeperPlayer
): string[] {
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

function chooseUniqueCandidate(
  candidates: SleeperCandidate[],
  rowPosition: AuctionPlayerPosition | null,
  rowTeam: string | null,
  methodPrefix: string
): { candidate: SleeperCandidate | null; method: string } {
  const uniqueCandidates = uniqueByPlayerId(candidates);

  const attempts: Array<{
    method: string;
    candidates: SleeperCandidate[];
  }> = [
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
): AliasSuggestion | null {
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
    masterviewName: playerName,
    suggestedSleeperName: filtered[0].fullName,
    sleeperPlayerId: filtered[0].sleeperPlayerId,
    reason: "single active Sleeper candidate with same last name, position, and NFL team",
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
        matchedPlayer: toMatchedPlayer(exactChoice.candidate),
        candidates: exactCandidates.map(toMatchedPlayer),
        aliasSuggestion: null,
      };
    }

    return {
      status: "ambiguous",
      method: "exact-normalized-name-ambiguous",
      matchedPlayer: null,
      candidates: exactCandidates.map(toMatchedPlayer),
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
      const matchedPlayer = toMatchedPlayer(aliasChoice.candidate);
      return {
        status: "matched",
        method: aliasChoice.method,
        matchedPlayer,
        candidates: aliasCandidates.map(toMatchedPlayer),
        aliasSuggestion: {
          masterviewName: playerName,
          suggestedSleeperName: matchedPlayer.fullName,
          sleeperPlayerId: matchedPlayer.sleeperPlayerId,
          reason: "safe punctuation/suffix-insensitive alias normalized to a single Sleeper candidate",
        },
      };
    }

    return {
      status: "ambiguous",
      method: "safe-alias-normalized-name-ambiguous",
      matchedPlayer: null,
      candidates: aliasCandidates.map(toMatchedPlayer),
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

function readRawPayload(row: AuctionImportPreview["rows"][number]) {
  return isRecord(row.raw) ? (row.raw as MasterviewRawPayload) : {};
}

function buildReviewRow(
  row: AuctionImportPreview["rows"][number],
  matchResult: MatchResult,
  matchedSearchName: string,
  appliedAlias: AppliedAlias | null
): ReviewRow {
  const raw = readRawPayload(row);

  return {
    rowNumber: row.rowNumber,
    playerName: row.playerName ?? "",
    matchedSearchName,
    appliedAlias,
    position: row.position,
    nflTeam: normalizeTeam(row.nflTeam),
    averageValue: readNumber(raw.averageValue) ?? row.auctionPrice,
    lowValue: readNumber(raw.lowValue),
    highValue: readNumber(raw.highValue),
    statusColumns: isRecord(raw.statusColumns)
      ? (raw.statusColumns as Record<string, string>)
      : {},
    matchStatus: matchResult.status,
    matchMethod: matchResult.method,
    sleeperPlayerId: matchResult.matchedPlayer?.sleeperPlayerId ?? null,
    sleeperName: matchResult.matchedPlayer?.fullName ?? null,
    sleeperPosition: matchResult.matchedPlayer?.position ?? null,
    sleeperTeam: matchResult.matchedPlayer?.team ?? null,
    candidates: matchResult.candidates,
    aliasSuggestion: matchResult.aliasSuggestion,
  };
}

function groupDuplicateMatches(rows: ReviewRow[]) {
  const rowsBySleeperId = new Map<string, ReviewRow[]>();

  for (const row of rows) {
    if (!row.sleeperPlayerId) continue;
    const existing = rowsBySleeperId.get(row.sleeperPlayerId) ?? [];
    existing.push(row);
    rowsBySleeperId.set(row.sleeperPlayerId, existing);
  }

  return Array.from(rowsBySleeperId.entries())
    .filter(([, groupedRows]) => groupedRows.length > 1)
    .map(([sleeperPlayerId, groupedRows]) => ({
      sleeperPlayerId,
      sleeperName: groupedRows[0]?.sleeperName ?? null,
      rows: groupedRows.map((row) => ({
        rowNumber: row.rowNumber,
        playerName: row.playerName,
        matchedSearchName: row.matchedSearchName,
        appliedAlias: row.appliedAlias,
        position: row.position,
        nflTeam: row.nflTeam,
      })),
    }));
}

function buildAliasLookup(aliases: Record<string, string>): Map<string, string> {
  const aliasLookup = new Map<string, string>();

  for (const [masterviewName, sleeperSearchName] of Object.entries(aliases)) {
    aliasLookup.set(normalizeNameExact(masterviewName), sleeperSearchName);
  }

  return aliasLookup;
}

function applyManualAlias(
  playerName: string,
  aliasLookup: Map<string, string>
): AppliedAlias | null {
  const sleeperSearchName = aliasLookup.get(normalizeNameExact(playerName));

  if (!sleeperSearchName) return null;

  return {
    masterviewName: playerName,
    sleeperSearchName,
  };
}

function buildReviewRows(
  rows: AuctionImportPreview["rows"],
  index: MatchIndex,
  aliasLookup: Map<string, string>
): ReviewRow[] {
  return rows.map((row) => {
    const playerName = row.playerName ?? "";
    const appliedAlias = applyManualAlias(playerName, aliasLookup);
    const matchedSearchName = appliedAlias?.sleeperSearchName ?? playerName;
    const matchResult = matchPlayer(
      matchedSearchName,
      row.position,
      normalizeTeam(row.nflTeam),
      index
    );
    const aliasAwareMatchResult: MatchResult =
      appliedAlias && matchResult.status === "matched"
        ? {
            ...matchResult,
            method: `manual-alias-${matchResult.method}`,
          }
        : matchResult;

    return buildReviewRow(
      row,
      aliasAwareMatchResult,
      matchedSearchName,
      appliedAlias
    );
  });
}

function getMatchCounts(rows: ReviewRow[]): MatchCounts {
  return {
    totalRows: rows.length,
    matchedCount: rows.filter((row) => row.matchStatus === "matched").length,
    unmatchedCount: rows.filter((row) => row.matchStatus === "unmatched").length,
    ambiguousCount: rows.filter((row) => row.matchStatus === "ambiguous").length,
    duplicateMatchedSleeperIdCount: groupDuplicateMatches(rows).length,
  };
}

async function readMasterviewPreview() {
  const rawJson = await readFile(MASTER_VIEW_2025_PATH, "utf8");
  const parsed = JSON.parse(rawJson) as MasterviewProcessedFile;

  if (!isRecord(parsed.preview) || !Array.isArray(parsed.preview.rows)) {
    throw new Error(`Invalid Masterview preview file: ${MASTER_VIEW_2025_PATH}`);
  }

  return parsed;
}

async function readPlayerAliases(): Promise<Record<string, string>> {
  const rawJson = await readFile(PLAYER_ALIASES_PATH, "utf8");
  const parsed: unknown = JSON.parse(rawJson);

  if (!isRecord(parsed)) {
    throw new Error(`Invalid alias file: ${PLAYER_ALIASES_PATH}`);
  }

  const aliases: Record<string, string> = {};

  for (const [masterviewName, sleeperSearchName] of Object.entries(parsed)) {
    const cleanMasterviewName = readString(masterviewName);
    const cleanSleeperSearchName = readString(sleeperSearchName);

    if (!cleanMasterviewName || !cleanSleeperSearchName) continue;

    aliases[cleanMasterviewName] = cleanSleeperSearchName;
  }

  return aliases;
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

async function main() {
  const generatedAt = new Date().toISOString();
  const masterview = await readMasterviewPreview();
  const playerAliases = await readPlayerAliases();
  const sleeperPlayers = await fetchSleeperPlayers();
  const candidates = buildSleeperCandidates(sleeperPlayers);
  const index = buildMatchIndex(candidates);
  const baselineReviewRows = buildReviewRows(
    masterview.preview.rows,
    index,
    new Map<string, string>()
  );
  const reviewRows = buildReviewRows(
    masterview.preview.rows,
    index,
    buildAliasLookup(playerAliases)
  );
  const beforeCounts = getMatchCounts(baselineReviewRows);
  const afterCounts = getMatchCounts(reviewRows);
  const matchedRows = reviewRows.filter((row) => row.matchStatus === "matched");
  const ambiguousRows = reviewRows.filter(
    (row) => row.matchStatus === "ambiguous"
  );
  const unmatchedRows = reviewRows.filter(
    (row) => row.matchStatus === "unmatched"
  );
  const duplicateMatches = groupDuplicateMatches(reviewRows);
  const suggestedAliases = reviewRows
    .map((row) => row.aliasSuggestion)
    .filter((alias): alias is AliasSuggestion => alias !== null);
  const matchMethodCounts = reviewRows.reduce<Record<string, number>>(
    (counts, row) => {
      counts[row.matchMethod] = (counts[row.matchMethod] ?? 0) + 1;
      return counts;
    },
    {}
  );
  const topUnmatchedPlayers = unmatchedRows
    .slice()
    .sort((left, right) => (right.averageValue ?? 0) - (left.averageValue ?? 0))
    .slice(0, TOP_UNMATCHED_LIMIT)
    .map((row) => ({
      rowNumber: row.rowNumber,
      playerName: row.playerName,
      position: row.position,
      nflTeam: row.nflTeam,
      averageValue: row.averageValue,
      aliasSuggestion: row.aliasSuggestion,
    }));
  const review = {
    generatedAt,
    sourceFile: MASTER_VIEW_2025_PATH,
    playerAliasesFile: PLAYER_ALIASES_PATH,
    playerAliases,
    sleeperPlayersUrl: SLEEPER_PLAYERS_URL,
    beforeCounts,
    afterCounts,
    totalRows: reviewRows.length,
    matchedCount: matchedRows.length,
    unmatchedCount: unmatchedRows.length,
    ambiguousCount: ambiguousRows.length,
    duplicateMatchedSleeperIdCount: duplicateMatches.length,
    matchMethodCounts,
    topUnmatchedPlayers,
    suggestedAliases,
    ambiguousMatches: ambiguousRows.map((row) => ({
      rowNumber: row.rowNumber,
      playerName: row.playerName,
      position: row.position,
      nflTeam: row.nflTeam,
      averageValue: row.averageValue,
      candidates: row.candidates,
      aliasSuggestion: row.aliasSuggestion,
    })),
    duplicateMatches,
    rows: reviewRows,
  };

  await writeFile(
    path.join(process.cwd(), REVIEW_OUTPUT_PATH),
    `${JSON.stringify(review, null, 2)}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputFile: REVIEW_OUTPUT_PATH,
        playerAliasesFile: PLAYER_ALIASES_PATH,
        beforeCounts,
        afterCounts,
        totalRows: review.totalRows,
        matchedCount: review.matchedCount,
        unmatchedCount: review.unmatchedCount,
        ambiguousCount: review.ambiguousCount,
        duplicateMatchedSleeperIdCount: review.duplicateMatchedSleeperIdCount,
        duplicateMatches: review.duplicateMatches,
        ambiguousMatches: review.ambiguousMatches,
        topUnmatchedPlayers: review.topUnmatchedPlayers,
        suggestedAliases: review.suggestedAliases.slice(0, 25),
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
