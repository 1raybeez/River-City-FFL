import { writeFile } from "node:fs/promises";

import type {
  AuctionAdpMatchType,
  AuctionAdpSourceKey,
  AuctionAdpSourceRow,
  AuctionAdpSourceValuesFile,
  AuctionUnmatchedReviewCandidate,
} from "./adpTypes";
import { getAuctionAdpSourceRegistryEntry } from "./adpSourceRegistry";
import { getAuctionPlayerAliases } from "./playerAliases";

const SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl";

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
  playerId: string;
  playerName: string;
  normalizedName: string;
  position: string;
  nflTeam: string | null;
};

type MatchIndex = {
  byId: Map<string, SleeperCandidate>;
  byNamePosition: Map<string, SleeperCandidate[]>;
};

type ParsedAdpRecord = {
  rowNumber: number;
  playerName: string;
  position: string;
  nflTeam: string | null;
  overallAdp: number | null;
  positionAdp: number | null;
  playerId: string | null;
  warnings: string[];
  errors: string[];
};

const FANTASYPROS_ADP_HEADER_ALIASES = {
  rank: ["rk", "rank"],
  player: ["player name", "player", "player (bye)", "name"],
  team: ["team", "nfl team"],
  position: ["pos", "position"],
  averageAdp: ["avg", "average", "adp"],
} as const;

type FantasyProsAdpHeader = keyof typeof FANTASYPROS_ADP_HEADER_ALIASES;

type FantasyProsAdpFormat = "classic" | "player-bye";

export type AuctionAdpImportResult = {
  valuesOutput: AuctionAdpSourceValuesFile;
  summary: {
    sourceKey: AuctionAdpSourceKey;
    sourceName: string;
    rowsNormalized: number;
    matched: number;
    unmatched: number;
    warnings: number;
    errors: number;
  };
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeAdpPlayerName(value: string | null | undefined) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\.?$/i, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeAdpPosition(value: string | null | undefined) {
  const normalized = normalizeText(value).toUpperCase();
  const positionMatch = normalized.match(/^(QB|RB|WR|TE|K|DEF|DST|D\/ST)/);
  const position = positionMatch?.[1] ?? normalized;

  if (position === "DST" || position === "D/ST" || position === "DEFENSE") {
    return "DEF";
  }

  return position;
}

function readPositionAdp(value: string | null | undefined) {
  const match = normalizeText(value).toUpperCase().match(/^(QB|RB|WR|TE|K|DEF|DST|D\/ST)(\d+)$/);
  return match ? Number(match[2]) : null;
}

function normalizeTeam(value: string | null | undefined) {
  const normalized = normalizeText(value).toUpperCase();
  const aliases: Record<string, string> = {
    ARZ: "ARI",
    JAX: "JAC",
    LA: "LAR",
    STL: "LAR",
    SD: "LAC",
    OAK: "LV",
    WAS: "WSH",
  };

  return normalized ? aliases[normalized] ?? normalized : null;
}

function parseFiniteNumber(value: string | null | undefined) {
  const cleaned = normalizeText(value).replace(/[$,%]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function getCell(row: readonly string[], index: number) {
  return index >= 0 ? row[index] ?? "" : "";
}

function findHeaderIndex(rows: readonly string[][], requiredHeaders: string[]) {
  return rows.findIndex((row) => {
    const normalizedHeaders = row.map(normalizeHeader);

    return requiredHeaders.every((header) => normalizedHeaders.includes(header));
  });
}

function findHeaderAliasIndex(
  headers: readonly string[],
  aliases: readonly string[]
) {
  return headers.findIndex((header) => aliases.includes(header));
}

function detectFantasyProsHeaderFormat(
  headers: readonly string[]
): FantasyProsAdpFormat | null {
  const hasRank =
    findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES.rank) >= 0;
  const hasPlayer =
    findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES.player) >= 0;
  const hasTeam =
    findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES.team) >= 0;
  const hasPosition =
    findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES.position) >= 0;
  const hasAverageAdp =
    findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES.averageAdp) >=
    0;

  if (hasRank && hasPlayer && hasTeam && hasPosition) return "classic";
  if (hasRank && hasPlayer && hasPosition && hasAverageAdp) {
    return "player-bye";
  }

  return null;
}

function findFantasyProsHeaderRow(rows: readonly string[][]) {
  return rows.findIndex((row) =>
    Boolean(detectFantasyProsHeaderFormat(row.map(normalizeHeader)))
  );
}

function getFantasyProsHeaderIndex(
  headers: readonly string[],
  header: FantasyProsAdpHeader
) {
  return findHeaderAliasIndex(headers, FANTASYPROS_ADP_HEADER_ALIASES[header]);
}

function parseFantasyProsPlayerByeCell(value: string) {
  const withoutBye = normalizeText(value).replace(
    /\s+\((\d{1,2})\)\s*$/,
    ""
  );
  const byeMatch = normalizeText(value).match(/\s+\((\d{1,2})\)\s*$/);
  const teamMatch = withoutBye.match(/\s+([A-Z]{2,3})$/);
  const team = teamMatch ? normalizeTeam(teamMatch[1]) : null;
  const playerName = teamMatch
    ? normalizeText(withoutBye.slice(0, teamMatch.index))
    : withoutBye;

  return {
    playerName,
    nflTeam: team,
    byeWeek: byeMatch ? Number(byeMatch[1]) : null,
  };
}

function parseFantasyProsRows(rows: readonly string[][]): ParsedAdpRecord[] {
  const headerIndex = findFantasyProsHeaderRow(rows);
  if (headerIndex < 0) {
    throw new Error(
      "FantasyPros ADP CSV is missing supported RK/player/team/position or Rank/Player (Bye)/POS/AVG headers."
    );
  }

  const headers = rows[headerIndex].map(normalizeHeader);
  const format = detectFantasyProsHeaderFormat(headers);
  if (!format) {
    throw new Error(
      "FantasyPros ADP CSV is missing supported RK/player/team/position or Rank/Player (Bye)/POS/AVG headers."
    );
  }
  const rankIndex = getFantasyProsHeaderIndex(headers, "rank");
  const playerIndex = getFantasyProsHeaderIndex(headers, "player");
  const teamIndex = getFantasyProsHeaderIndex(headers, "team");
  const positionIndex = getFantasyProsHeaderIndex(headers, "position");
  const averageAdpIndex = getFantasyProsHeaderIndex(headers, "averageAdp");

  return rows.slice(headerIndex + 1).map((row, index) => {
    const positionCell = getCell(row, positionIndex);
    const playerCell = getCell(row, playerIndex);
    const playerBye = parseFantasyProsPlayerByeCell(playerCell);
    const overallAdp =
      format === "player-bye"
        ? parseFiniteNumber(getCell(row, averageAdpIndex))
        : parseFiniteNumber(getCell(row, rankIndex));
    const playerName =
      format === "player-bye" ? playerBye.playerName : normalizeText(playerCell);
    const nflTeam =
      format === "player-bye"
        ? playerBye.nflTeam
        : normalizeTeam(getCell(row, teamIndex));
    const position = normalizeAdpPosition(positionCell);
    const errors: string[] = [];

    if (!playerName) errors.push("Missing player name.");
    if (!position) errors.push("Missing position.");
    if (overallAdp === null) {
      errors.push(
        format === "player-bye"
          ? "Missing overall ADP from AVG."
          : "Missing overall ADP from RK."
      );
    }

    return {
      rowNumber: headerIndex + index + 2,
      playerName,
      position,
      nflTeam,
      overallAdp,
      positionAdp: readPositionAdp(positionCell),
      playerId: null,
      warnings: [],
      errors,
    };
  });
}

function parseRotoWireRows(rows: readonly string[][]): ParsedAdpRecord[] {
  const headerIndex = findHeaderIndex(rows, ["rank", "name", "team", "pos"]);
  if (headerIndex < 0) {
    throw new Error("RotoWire ADP CSV is missing rank/name/team/position headers.");
  }

  const headers = rows[headerIndex].map(normalizeHeader);
  const rankIndex = headers.indexOf("rank");
  const playerIndex = headers.indexOf("name");
  const teamIndex = headers.indexOf("team");
  const positionIndex = headers.indexOf("pos");
  const underdogIndex = headers.indexOf("underdog");
  const sleeperIndex = headers.indexOf("sleeper");

  return rows.slice(headerIndex + 1).map((row, index) => {
    const underdogAdp = parseFiniteNumber(getCell(row, underdogIndex));
    const sleeperAdp = parseFiniteNumber(getCell(row, sleeperIndex));
    const adpInputs = [underdogAdp, sleeperAdp].filter(
      (value): value is number => value !== null
    );
    const overallAdp =
      adpInputs.length > 0
        ? adpInputs.reduce((sum, value) => sum + value, 0) / adpInputs.length
        : parseFiniteNumber(getCell(row, rankIndex));
    const playerName = normalizeText(getCell(row, playerIndex));
    const position = normalizeAdpPosition(getCell(row, positionIndex));
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!playerName) errors.push("Missing player name.");
    if (!position) errors.push("Missing position.");
    if (overallAdp === null) errors.push("Missing redraft ADP.");
    if (adpInputs.length === 0) warnings.push("Using rank fallback because redraft ADP columns were empty.");

    return {
      rowNumber: headerIndex + index + 2,
      playerName,
      position,
      nflTeam: normalizeTeam(getCell(row, teamIndex)),
      overallAdp,
      positionAdp: null,
      playerId: null,
      warnings,
      errors,
    };
  });
}

function parseRowsForSource(sourceKey: AuctionAdpSourceKey, text: string) {
  const rows = parseCsv(text);

  return sourceKey === "fantasypros-adp"
    ? parseFantasyProsRows(rows)
    : parseRotoWireRows(rows);
}

async function fetchSleeperPlayers() {
  const response = await fetch(SLEEPER_PLAYERS_URL);
  if (!response.ok) {
    throw new Error(`Sleeper players request failed with ${response.status}.`);
  }

  return (await response.json()) as Record<string, SleeperPlayer>;
}

function buildCandidateName(player: SleeperPlayer) {
  return (
    normalizeText(player.full_name) ||
    normalizeText([player.first_name, player.last_name].filter(Boolean).join(" ")) ||
    normalizeText(player.search_full_name)
  );
}

function buildMatchIndex(players: Record<string, SleeperPlayer>): MatchIndex {
  const byId = new Map<string, SleeperCandidate>();
  const byNamePosition = new Map<string, SleeperCandidate[]>();

  for (const [fallbackId, player] of Object.entries(players)) {
    const playerName = buildCandidateName(player);
    const position = normalizeAdpPosition(player.position);
    const playerId = normalizeText(String(player.player_id ?? fallbackId));
    if (!playerName || !position || !playerId) continue;

    const candidate: SleeperCandidate = {
      playerId,
      playerName,
      normalizedName: normalizeAdpPlayerName(playerName),
      position,
      nflTeam: normalizeTeam(player.team),
    };
    const key = `${candidate.normalizedName}|${candidate.position}`;
    byId.set(playerId, candidate);
    byNamePosition.set(key, [...(byNamePosition.get(key) ?? []), candidate]);
  }

  return { byId, byNamePosition };
}

function matchRecord({
  record,
  matchIndex,
  aliases,
}: {
  record: ParsedAdpRecord;
  matchIndex: MatchIndex;
  aliases: Record<string, string>;
}) {
  if (record.playerId) {
    const candidate = matchIndex.byId.get(record.playerId);
    if (candidate) {
      return { matchType: "sleeper-id" as AuctionAdpMatchType, candidate };
    }
  }

  const normalizedName = normalizeAdpPlayerName(record.playerName);
  const aliasName = aliases[record.playerName] ?? aliases[normalizedName] ?? null;
  const lookupNames = [
    { name: normalizedName, matchType: "name-position" as AuctionAdpMatchType },
    ...(aliasName
      ? [
          {
            name: normalizeAdpPlayerName(aliasName),
            matchType: "alias-name-position" as AuctionAdpMatchType,
          },
        ]
      : []),
  ];

  for (const lookup of lookupNames) {
    const candidates =
      matchIndex.byNamePosition.get(`${lookup.name}|${record.position}`) ?? [];
    if (candidates.length === 1) {
      return { matchType: lookup.matchType, candidate: candidates[0] };
    }
    if (candidates.length > 1) {
      return {
        matchType: "ambiguous" as AuctionAdpMatchType,
        candidate: null,
        candidates,
      };
    }
  }

  return { matchType: "unmatched" as AuctionAdpMatchType, candidate: null };
}

function toReviewCandidate(
  candidate: SleeperCandidate
): AuctionUnmatchedReviewCandidate {
  return {
    sleeperPlayerId: candidate.playerId,
    playerName: candidate.playerName,
    position: candidate.position,
    nflTeam: candidate.nflTeam,
  };
}

export async function importAuctionAdpSourceText({
  sourceKey,
  season,
  sourceFilename,
  text,
  outputFile,
  writeFiles = false,
}: {
  sourceKey: AuctionAdpSourceKey;
  season: number;
  sourceFilename: string;
  text: string;
  outputFile?: string;
  writeFiles?: boolean;
}): Promise<AuctionAdpImportResult> {
  const sourceEntry = getAuctionAdpSourceRegistryEntry(sourceKey, season);
  if (!sourceEntry) throw new Error(`Unsupported ADP source: ${sourceKey}.`);

  const generatedAt = new Date().toISOString();
  const aliases = getAuctionPlayerAliases();
  const sleeperPlayers = await fetchSleeperPlayers();
  const matchIndex = buildMatchIndex(sleeperPlayers);
  const parsedRecords = parseRowsForSource(sourceKey, text);
  const rows: AuctionAdpSourceRow[] = parsedRecords
    .filter(
      (record) =>
        record.playerName &&
        record.position &&
        record.overallAdp !== null &&
        Number.isFinite(record.overallAdp)
    )
    .map((record) => {
      const match = matchRecord({ record, matchIndex, aliases });
      const errors = [...record.errors];
      const warnings = [...record.warnings];

      if (match.matchType === "unmatched") warnings.push("No Sleeper match found.");
      if (match.matchType === "ambiguous") warnings.push("Ambiguous Sleeper match skipped.");

      const matchCandidates = match.candidates?.map(toReviewCandidate);
      const row: AuctionAdpSourceRow = {
        season,
        sourceKey,
        sourceName: sourceEntry.displayName,
        sourceRowId: `${sourceKey}:${season}:row-${record.rowNumber}`,
        rowNumber: record.rowNumber,
        playerId: match.candidate?.playerId ?? null,
        playerName: match.candidate?.playerName ?? record.playerName,
        position: record.position,
        nflTeam: match.candidate?.nflTeam ?? record.nflTeam,
        overallAdp: record.overallAdp ?? Number.NaN,
        positionAdp: record.positionAdp,
        matchType: errors.length > 0 ? "unmatched" : match.matchType,
        importedAt: generatedAt,
        warnings,
        errors,
      };

      if (matchCandidates && matchCandidates.length > 0) {
        row.matchCandidates = matchCandidates;
      }

      return row;
    });
  const valuesOutput: AuctionAdpSourceValuesFile = {
    generatedAt,
    season,
    sourceKey,
    sourceName: sourceEntry.displayName,
    sourceFile: sourceFilename,
    rowCount: rows.length,
    matchedRowCount: rows.filter(
      (row) =>
        row.playerId !== null &&
        row.matchType !== "unmatched" &&
        row.matchType !== "ambiguous" &&
        row.errors.length === 0
    ).length,
    unmatchedRowCount: rows.filter(
      (row) =>
        row.playerId === null ||
        row.matchType === "unmatched" ||
        row.matchType === "ambiguous"
    ).length,
    warningCount: rows.reduce((sum, row) => sum + row.warnings.length, 0),
    errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0),
    rows,
  };

  if (writeFiles && outputFile) {
    await writeFile(outputFile, `${JSON.stringify(valuesOutput, null, 2)}\n`);
  }

  return {
    valuesOutput,
    summary: {
      sourceKey,
      sourceName: sourceEntry.displayName,
      rowsNormalized: valuesOutput.rowCount,
      matched: valuesOutput.matchedRowCount,
      unmatched: valuesOutput.unmatchedRowCount,
      warnings: valuesOutput.warningCount,
      errors: valuesOutput.errorCount,
    },
  };
}
