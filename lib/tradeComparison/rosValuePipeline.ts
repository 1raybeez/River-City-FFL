import { evaluateCurrentValueFreshness, type CurrentValueConfidence, type CurrentValueFreshness } from "./currentValue";

export type RosSourceRow = {
  source: string;
  playerName: string;
  team: string | null;
  position: string | null;
  overallRank: number | null;
  positionalRank: number | null;
  sourceValue: number | null;
  generatedAt: string;
  rowNumber: number;
  playerId?: string | null;
};

export type RosImportIssue = { rowNumber: number; code: "MISSING_NAME" | "INVALID_RANK" | "INVALID_POSITION" | "DUPLICATE_PLAYER" | "UNMATCHED_PLAYER"; message: string };
export type RosImportResult = {
  source: string;
  season: number;
  generatedAt: string;
  rows: RosSourceRow[];
  matchedRows: RosSourceRow[];
  unmatchedRows: RosSourceRow[];
  duplicateRows: RosSourceRow[];
  issues: RosImportIssue[];
};

export type RosConsensusRow = {
  playerId: string;
  playerName: string;
  team: string | null;
  position: string | null;
  consensusOverallRank: number | null;
  consensusPositionalRank: number | null;
  consensusSourceValue: number | null;
  sourceCount: number;
  sourceRows: RosSourceRow[];
  sourceFreshness: Array<{ source: string; freshness: CurrentValueFreshness; ageDays: number | null; generatedAt: string }>;
  generatedAt: string | null;
  freshness: CurrentValueFreshness;
  confidence: CurrentValueConfidence;
  staleSourceCount: number;
};

export type RosCoverageReport = {
  totalMatchedPlayers: number;
  byPosition: Record<string, number>;
  unmatchedRows: number;
  duplicateRows: number;
  staleSourceRows: number;
  singleSourcePlayers: number;
};

function normalizeHeader(value: string) { return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function normalizeName(value: string) { return value.trim().toLowerCase().replace(/['’`]/g, "").replace(/\b(jr|sr|ii|iii|iv|v)\.?$/i, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " "); }
function normalizeTeam(value: string | null) {
  const team = value?.trim().toUpperCase() ?? "";
  return ({ ARZ: "ARI", JAX: "JAC", LA: "LAR", STL: "LAR", SD: "LAC", OAK: "LV", WAS: "WSH" } as Record<string, string>)[team] ?? (team || null);
}
function normalizePosition(value: string | null) {
  const position = value?.trim().toUpperCase() ?? "";
  if (["DST", "D/ST", "DEF", "DEFENSE"].includes(position)) return "DEF";
  return ["QB", "RB", "WR", "TE", "K"].includes(position) ? position : position || null;
}
function parseNumber(value: string | undefined) {
  if (!value?.trim() || value.trim() === "-") return null;
  const parsed = Number(value.replace(/[$,%]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}
function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((first, second) => first - second);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && text[index + 1] === '"' && quoted) { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = ""; continue; }
    cell += character;
  }
  if (cell || row.length) { row.push(cell); if (row.some((value) => value.trim())) rows.push(row); }
  return rows;
}

function headerIndex(headers: string[], aliases: string[]) { return headers.findIndex((header) => aliases.includes(header)); }

export function importRosCsv({ csv, source, season, generatedAt, sleeperPlayers }: { csv: string; source: string; season: number; generatedAt: string; sleeperPlayers: readonly { playerId: string; playerName: string; position: string | null; nflTeam: string | null }[] }): RosImportResult {
  const parsed = parseCsv(csv);
  const headerRowIndex = parsed.findIndex((row) => {
    const candidateHeaders = row.map(normalizeHeader);
    return (
      headerIndex(candidateHeaders, ["rank", "overall rank", "overall", "ros rank"]) >= 0 &&
      headerIndex(candidateHeaders, ["name", "player", "player name", "player full name"]) >= 0 &&
      headerIndex(candidateHeaders, ["position", "pos", "fantasy position"]) >= 0
    );
  });
  const headers = (headerRowIndex >= 0 ? parsed[headerRowIndex] : []).map(normalizeHeader);
  const dataRows = headerRowIndex >= 0 ? parsed.slice(headerRowIndex + 1) : [];
  const rankIndex = headerIndex(headers, ["rank", "overall rank", "overall", "ros rank"]);
  const nameIndex = headerIndex(headers, ["name", "player", "player name", "player full name"]);
  const teamIndex = headerIndex(headers, ["team", "nfl team"]);
  const positionIndex = headerIndex(headers, ["position", "pos", "fantasy position"]);
  const posRankIndex = headerIndex(headers, ["posrank", "pos rank", "position rank", "position adp"]);
  const valueIndex = headerIndex(headers, ["value", "trade value", "ros value", "3d value", "3dvalue", "consensus proj"]);
  const byName = new Map<string, typeof sleeperPlayers[number][]>();
  sleeperPlayers.forEach((player) => { const key = normalizeName(player.playerName); byName.set(key, [...(byName.get(key) ?? []), player]); });
  const rows: RosSourceRow[] = [], matchedRows: RosSourceRow[] = [], unmatchedRows: RosSourceRow[] = [], duplicateRows: RosSourceRow[] = [], issues: RosImportIssue[] = [];
  const matchedIds = new Set<string>();
  dataRows.forEach((cells, offset) => {
    const rowNumber = offset + headerRowIndex + 2;
    const playerName = cells[nameIndex] ?? "";
    const overallRank = parseNumber(cells[rankIndex]);
    const position = normalizePosition(cells[positionIndex] ?? null);
    const row: RosSourceRow = { source, playerName: playerName.trim(), team: normalizeTeam(cells[teamIndex] ?? null), position, overallRank, positionalRank: parseNumber(cells[posRankIndex]), sourceValue: parseNumber(cells[valueIndex]), generatedAt, rowNumber, playerId: null };
    rows.push(row);
    if (!row.playerName) { issues.push({ rowNumber, code: "MISSING_NAME", message: "Player name is required." }); return; }
    if (overallRank === null || overallRank <= 0 || !Number.isInteger(overallRank)) { issues.push({ rowNumber, code: "INVALID_RANK", message: "Overall rank must be a positive integer." }); return; }
    if (!position) { issues.push({ rowNumber, code: "INVALID_POSITION", message: "Position is required and must be a supported football position." }); return; }
    const candidates = byName.get(normalizeName(row.playerName)) ?? [];
    const match = candidates.filter((candidate) => candidate.position === position && (!row.team || !candidate.nflTeam || row.team === normalizeTeam(candidate.nflTeam)));
    if (match.length !== 1) { issues.push({ rowNumber, code: "UNMATCHED_PLAYER", message: match.length ? "Player identity is ambiguous." : "Player was not matched to the Sleeper directory." }); unmatchedRows.push(row); return; }
    row.playerId = match[0].playerId;
    if (matchedIds.has(row.playerId)) { issues.push({ rowNumber, code: "DUPLICATE_PLAYER", message: "Player appears more than once in this source." }); duplicateRows.push(row); return; }
    matchedIds.add(row.playerId); matchedRows.push(row);
  });
  return { source, season, generatedAt, rows, matchedRows, unmatchedRows, duplicateRows, issues };
}

export function buildRosConsensus(imports: readonly RosImportResult[], now = new Date().toISOString()): { rows: RosConsensusRow[]; coverage: RosCoverageReport } {
  const grouped = new Map<string, RosSourceRow[]>();
  imports.forEach((result) => result.matchedRows.forEach((row) => { if (row.playerId) grouped.set(row.playerId, [...(grouped.get(row.playerId) ?? []), row]); }));
  const rows = [...grouped].map(([playerId, sourceRows]) => {
    const sourceFreshness = sourceRows.map((row) => ({ source: row.source, ...evaluateCurrentValueFreshness(row.generatedAt, now) , generatedAt: row.generatedAt }));
    const freshCount = sourceFreshness.filter((source) => source.freshness === "FRESH").length;
    const usableCount = sourceRows.length;
    const confidence: CurrentValueConfidence = usableCount >= 3 && freshCount >= 2 ? "HIGH" : usableCount >= 2 && freshCount >= 1 ? "MEDIUM" : usableCount === 1 ? "LOW" : "UNAVAILABLE";
    const freshness: CurrentValueFreshness = sourceFreshness.some((source) => source.freshness === "UNKNOWN") ? "UNKNOWN" : sourceFreshness.some((source) => source.freshness === "STALE") ? "STALE" : sourceFreshness.some((source) => source.freshness === "AGING") ? "AGING" : "FRESH";
    const first = sourceRows[0];
    return { playerId, playerName: first.playerName, team: first.team, position: first.position, consensusOverallRank: median(sourceRows.map((row) => row.overallRank).filter((rank): rank is number => rank !== null)), consensusPositionalRank: median(sourceRows.map((row) => row.positionalRank).filter((rank): rank is number => rank !== null)), consensusSourceValue: median(sourceRows.map((row) => row.sourceValue).filter((value): value is number => value !== null)), sourceCount: usableCount, sourceRows, sourceFreshness, generatedAt: sourceRows.map((row) => row.generatedAt).sort().at(-1) ?? null, freshness, confidence, staleSourceCount: sourceFreshness.filter((source) => source.freshness === "STALE").length } satisfies RosConsensusRow;
  });
  const byPosition = rows.reduce<Record<string, number>>((result, row) => { const position = row.position ?? "UNKNOWN"; result[position] = (result[position] ?? 0) + 1; return result; }, {});
  const unmatchedRows = imports.reduce((sum, result) => sum + result.unmatchedRows.length, 0);
  const duplicateRows = imports.reduce((sum, result) => sum + result.duplicateRows.length, 0);
  return { rows, coverage: { totalMatchedPlayers: rows.length, byPosition, unmatchedRows, duplicateRows, staleSourceRows: rows.reduce((sum, row) => sum + row.staleSourceCount, 0), singleSourcePlayers: rows.filter((row) => row.sourceCount === 1).length } };
}
