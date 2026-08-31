export const DEFAULT_FANTASYCALC_VALUES_URL =
  "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=.5&includeAdp=false";

export const FANTASYCALC_SOURCE_DETAIL =
  "FantasyCalc /values/current; Dynasty; 1QB; 12-team; Half PPR; no TE premium; reviewed snapshot";

export const FANTASYCALC_ATTRIBUTION = {
  name: "FantasyCalc",
  url: "https://www.fantasycalc.com",
  termsUrl: "https://www.fantasycalc.com/terms-of-usage",
} as const;

export interface RiverCityPlayerTemplateRow {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId?: number;
  sleeperOwnerId?: string | null;
  teamName?: string;
  ownerDisplayName?: string;
  keeperCost?: number | null;
  notes?: string;
  [key: string]: unknown;
}

export interface RiverCityPlayerTemplateFile {
  templateGeneratedAt?: string;
  leagueId?: string;
  importTargetPath?: string;
  players: Record<string, RiverCityPlayerTemplateRow>;
  [key: string]: unknown;
}

export type FantasyCalcInputMode = "csv" | "fetch";

export interface FantasyCalcValueRow {
  inputMode: FantasyCalcInputMode;
  sourceRowNumber: number;
  fantasycalcId: string | null;
  sleeperId: string | null;
  mflId: string | null;
  name: string;
  position: string | null;
  team: string | null;
  value: number;
  overallRank: number | null;
  positionRank: number | null;
  trend30Day: number | null;
  redraftValue?: number | null;
}

export interface CandidatePlayerStatsRow extends RiverCityPlayerTemplateRow {
  rawSourceValue: number;
  totalValueScore: number;
  keeperCost: number;
  valueSource: "ManualSnapshot";
  generatedAt: string;
  sourceDetail: string;
  sourceVersion: string;
  sourceAttribution: string;
  sourceUrl: string;
  sourceCapturedAt: string;
  matchMethod: "directSleeperId" | "fallbackNamePositionTeam";
  matchConfidence: "high" | "review";
  fantasycalcId: string | null;
  fantasycalcSleeperId: string | null;
  fantasycalcMflId: string | null;
  fantasycalcName: string;
  fantasycalcTeam: string | null;
  fantasycalcPosition: string | null;
  fantasycalcOverallRank: number | null;
  fantasycalcPositionRank: number | null;
  fantasycalcTrend30Day: number | null;
}

export interface CandidatePlayerStatsSnapshot {
  generatedAt: string;
  sourceDetail: string;
  sourceVersion: string;
  importTargetPath: string;
  sourceAttribution: typeof FANTASYCALC_ATTRIBUTION;
  sourceSettings: {
    isDynasty: boolean;
    numQbs: "1";
    numTeams: "12";
    ppr: ".5";
    tePremium: false;
    includeAdp: false;
  };
  sourceFreshness: {
    capturedAt: string;
    generatedAt: string;
  };
  reviewInstructions: string[];
  players: Record<string, CandidatePlayerStatsRow>;
}

export interface MatchedPlayerReportRow {
  sleeperPlayerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rawSourceValue: number;
  totalValueScore: number;
  fantasycalcId: string | null;
  fantasycalcSleeperId: string | null;
  fantasycalcName: string;
  fantasycalcPosition: string | null;
  fantasycalcTeam: string | null;
  matchMethod: "directSleeperId" | "fallbackNamePositionTeam";
  reviewRequired: boolean;
  notes: string[];
}

export interface MissingRiverCityPlayerReportRow {
  sleeperPlayerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId?: number;
  teamName?: string;
  reason: string;
}

export interface RejectedOrAmbiguousReportRow {
  scope: "template" | "fantasycalc";
  sleeperPlayerId?: string;
  playerName?: string;
  position?: string | null;
  nflTeam?: string | null;
  fantasycalcRowNumbers?: number[];
  fantasycalcNames?: string[];
  reason: string;
}

export interface IgnoredFantasyCalcReportRow {
  sourceRowNumber: number;
  fantasycalcId: string | null;
  sleeperId: string | null;
  name: string;
  position: string | null;
  team: string | null;
  value: number;
  reason: string;
}

export interface FantasyCalcMatchReviewReport {
  generatedAt: string;
  captureDate: string;
  inputMode: FantasyCalcInputMode;
  sourceUrl: string;
  sourceDetail: string;
  sourceVersion: string;
  sourceAttribution: typeof FANTASYCALC_ATTRIBUTION;
  candidateSnapshotPath: string;
  templatePath: string;
  counts: {
    riverCityTemplatePlayers: number;
    riverCityTemplateDraftPicksIgnored: number;
    fantasyCalcRowsRead: number;
    fantasyCalcDraftPickRowsIgnored: number;
    fantasyCalcInvalidRowsRejected: number;
    directSleeperIdMatches: number;
    fallbackCandidateMatches: number;
    candidateSnapshotPlayers: number;
    rejectedOrAmbiguousRows: number;
    missingRiverCityPlayers: number;
    ignoredFantasyCalcRows: number;
  };
  directSleeperIdMatches: MatchedPlayerReportRow[];
  fallbackCandidates: MatchedPlayerReportRow[];
  rejectedOrAmbiguousRows: RejectedOrAmbiguousReportRow[];
  missingRiverCityPlayers: MissingRiverCityPlayerReportRow[];
  ignoredFantasyCalcRows: IgnoredFantasyCalcReportRow[];
}

export interface BuildFantasyCalcSnapshotInput {
  template: RiverCityPlayerTemplateFile;
  fantasyCalcRows: FantasyCalcValueRow[];
  captureDate: string;
  generatedAt: string;
  inputMode: FantasyCalcInputMode;
  sourceUrl: string;
  candidateSnapshotPath: string;
  templatePath: string;
  importTargetPath?: string;
}

export interface BuildFantasyCalcSnapshotResult {
  candidate: CandidatePlayerStatsSnapshot;
  report: FantasyCalcMatchReviewReport;
}

interface TemplateEntry {
  sleeperPlayerId: string;
  row: RiverCityPlayerTemplateRow;
}

interface FantasyCalcClassifiedRows {
  eligibleRows: FantasyCalcValueRow[];
  draftPickRows: FantasyCalcValueRow[];
  invalidRows: Array<{ row: FantasyCalcValueRow; reason: string }>;
}

const DYNASTY_SOURCE_SETTINGS = {
  isDynasty: true,
  numQbs: "1",
  numTeams: "12",
  ppr: ".5",
  tePremium: false,
  includeAdp: false,
} as const;

const REDRAFT_SOURCE_SETTINGS = {
  isDynasty: false,
  numQbs: "1",
  numTeams: "12",
  ppr: ".5",
  tePremium: false,
  includeAdp: false,
} as const;

function getSourceSettings(sourceUrl: string) {
  const settings = new URL(sourceUrl).searchParams;
  return settings.get("isDynasty") === "false"
    ? REDRAFT_SOURCE_SETTINGS
    : DYNASTY_SOURCE_SETTINGS;
}

function getSourceDetail(sourceUrl: string): string {
  return getSourceSettings(sourceUrl).isDynasty
    ? FANTASYCALC_SOURCE_DETAIL
    : "FantasyCalc /values/current; Redraft; 1QB; 12-team; Half PPR; no TE premium; reviewed candidate";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readString(value);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePosition(value: string | null): string | null {
  return value ? value.trim().toUpperCase() : null;
}

function normalizeTeam(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "FA" || normalized === "NONE") return null;
  return normalized;
}

function normalizeNameForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildFallbackKey({
  name,
  position,
  team,
}: {
  name: string;
  position: string | null;
  team: string | null;
}): string | null {
  const normalizedName = normalizeNameForMatch(name);
  const normalizedPosition = normalizePosition(position);
  const normalizedTeam = normalizeTeam(team);

  if (!normalizedName || !normalizedPosition || !normalizedTeam) return null;
  return `${normalizedName}|${normalizedPosition}|${normalizedTeam}`;
}

function isDraftPickPosition(position: string | null): boolean {
  const normalized = normalizePosition(position);
  return (
    normalized === "PICK" ||
    normalized === "DP" ||
    normalized === "DRAFT_PICK" ||
    normalized === "DRAFTPICK"
  );
}

function makeRowKey(row: FantasyCalcValueRow): string {
  return `${row.inputMode}:${row.sourceRowNumber}`;
}

function addToMapList<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
}

function getSourceVersion(captureDate: string): string {
  const parsed = new Date(captureDate);
  const datePart = Number.isNaN(parsed.getTime())
    ? captureDate.slice(0, 10)
    : parsed.toISOString().slice(0, 10);
  return `fantasycalc-values-current-${datePart}`;
}

function getKeeperCost(row: RiverCityPlayerTemplateRow): number {
  return typeof row.keeperCost === "number" &&
    Number.isFinite(row.keeperCost) &&
    row.keeperCost > 0
    ? row.keeperCost
    : 0;
}

export function normalizeFantasyCalcValue(value: number): number {
  return value > 0 ? Math.max(1, Math.round(value / 100)) : 0;
}

function buildNotes(
  row: FantasyCalcValueRow,
  matchMethod: CandidatePlayerStatsRow["matchMethod"],
  additionalNotes: string[] = []
): string {
  const notes = [
    matchMethod === "directSleeperId"
      ? "FantasyCalc direct Sleeper ID match."
      : "FantasyCalc fallback match by unique normalized name, position, and team; review before import.",
    `fantasycalcId=${row.fantasycalcId ?? "unknown"}`,
    `fantasycalcSleeperId=${row.sleeperId ?? "missing"}`,
    `overallRank=${row.overallRank ?? "unknown"}`,
    `positionRank=${row.positionRank ?? "unknown"}`,
    `trend30Day=${row.trend30Day ?? "unknown"}`,
    ...additionalNotes,
  ];

  return notes.join(" ");
}

function buildCandidateRow({
  templateRow,
  sleeperPlayerId,
  fantasyCalcRow,
  matchMethod,
  generatedAt,
  captureDate,
  sourceVersion,
  sourceDetail,
  additionalNotes,
}: {
  templateRow: RiverCityPlayerTemplateRow;
  sleeperPlayerId: string;
  fantasyCalcRow: FantasyCalcValueRow;
  matchMethod: CandidatePlayerStatsRow["matchMethod"];
  generatedAt: string;
  captureDate: string;
  sourceVersion: string;
  sourceDetail: string;
  additionalNotes?: string[];
}): CandidatePlayerStatsRow {
  const totalValueScore = normalizeFantasyCalcValue(fantasyCalcRow.value);

  return {
    ...templateRow,
    playerId: sleeperPlayerId,
    rawSourceValue: fantasyCalcRow.value,
    totalValueScore,
    keeperCost: getKeeperCost(templateRow),
    valueSource: "ManualSnapshot",
    generatedAt,
    sourceDetail,
    sourceVersion,
    sourceAttribution: FANTASYCALC_ATTRIBUTION.name,
    sourceUrl: FANTASYCALC_ATTRIBUTION.url,
    sourceCapturedAt: captureDate,
    matchMethod,
    matchConfidence: matchMethod === "directSleeperId" ? "high" : "review",
    fantasycalcId: fantasyCalcRow.fantasycalcId,
    fantasycalcSleeperId: fantasyCalcRow.sleeperId,
    fantasycalcMflId: fantasyCalcRow.mflId,
    fantasycalcName: fantasyCalcRow.name,
    fantasycalcTeam: fantasyCalcRow.team,
    fantasycalcPosition: fantasyCalcRow.position,
    fantasycalcOverallRank: fantasyCalcRow.overallRank,
    fantasycalcPositionRank: fantasyCalcRow.positionRank,
    fantasycalcTrend30Day: fantasyCalcRow.trend30Day,
    notes: buildNotes(fantasyCalcRow, matchMethod, additionalNotes),
  };
}

function buildMatchedReportRow(
  sleeperPlayerId: string,
  templateRow: RiverCityPlayerTemplateRow,
  fantasyCalcRow: FantasyCalcValueRow,
  matchMethod: MatchedPlayerReportRow["matchMethod"],
  notes: string[]
): MatchedPlayerReportRow {
  return {
    sleeperPlayerId,
    playerName: templateRow.playerName,
    position: normalizePosition(templateRow.position),
    nflTeam: normalizeTeam(templateRow.nflTeam),
    rawSourceValue: fantasyCalcRow.value,
    totalValueScore: normalizeFantasyCalcValue(fantasyCalcRow.value),
    fantasycalcId: fantasyCalcRow.fantasycalcId,
    fantasycalcSleeperId: fantasyCalcRow.sleeperId,
    fantasycalcName: fantasyCalcRow.name,
    fantasycalcPosition: fantasyCalcRow.position,
    fantasycalcTeam: fantasyCalcRow.team,
    matchMethod,
    reviewRequired: matchMethod !== "directSleeperId" || notes.length > 0,
    notes,
  };
}

function classifyFantasyCalcRows(
  rows: FantasyCalcValueRow[]
): FantasyCalcClassifiedRows {
  const eligibleRows: FantasyCalcValueRow[] = [];
  const draftPickRows: FantasyCalcValueRow[] = [];
  const invalidRows: Array<{ row: FantasyCalcValueRow; reason: string }> = [];

  rows.forEach((row) => {
    if (isDraftPickPosition(row.position)) {
      draftPickRows.push(row);
      return;
    }

    if (!row.name.trim()) {
      invalidRows.push({ row, reason: "FantasyCalc row is missing player name" });
      return;
    }

    if (!row.position) {
      invalidRows.push({ row, reason: "FantasyCalc row is missing position" });
      return;
    }

    if (!Number.isFinite(row.value) || row.value <= 0) {
      invalidRows.push({
        row,
        reason: "FantasyCalc value must be a positive number",
      });
      return;
    }

    eligibleRows.push(row);
  });

  return { eligibleRows, draftPickRows, invalidRows };
}

function buildTemplateEntries(template: RiverCityPlayerTemplateFile): {
  entries: TemplateEntry[];
  draftPickEntries: TemplateEntry[];
} {
  const entries: TemplateEntry[] = [];
  const draftPickEntries: TemplateEntry[] = [];

  Object.entries(template.players).forEach(([sleeperPlayerId, row]) => {
    const entry = {
      sleeperPlayerId: row.playerId?.trim() || sleeperPlayerId,
      row,
    };

    if (isDraftPickPosition(row.position)) {
      draftPickEntries.push(entry);
    } else {
      entries.push(entry);
    }
  });

  return { entries, draftPickEntries };
}

function buildMissingRow(
  entry: TemplateEntry,
  reason: string
): MissingRiverCityPlayerReportRow {
  return {
    sleeperPlayerId: entry.sleeperPlayerId,
    playerName: entry.row.playerName,
    position: normalizePosition(entry.row.position),
    nflTeam: normalizeTeam(entry.row.nflTeam),
    rosterId: entry.row.rosterId,
    teamName: entry.row.teamName,
    reason,
  };
}

export function buildFantasyCalcSnapshot({
  template,
  fantasyCalcRows,
  captureDate,
  generatedAt,
  inputMode,
  sourceUrl,
  candidateSnapshotPath,
  templatePath,
  importTargetPath = "data/trade-analyzer/player-stats-2026.json",
}: BuildFantasyCalcSnapshotInput): BuildFantasyCalcSnapshotResult {
  const sourceVersion = getSourceVersion(captureDate);
  const sourceSettings = getSourceSettings(sourceUrl);
  const sourceDetail = getSourceDetail(sourceUrl);
  const { entries: templateEntries, draftPickEntries } =
    buildTemplateEntries(template);
  const classifiedRows = classifyFantasyCalcRows(fantasyCalcRows);
  const fantasyCalcBySleeperId = new Map<string, FantasyCalcValueRow[]>();
  const fantasyCalcByFallbackKey = new Map<string, FantasyCalcValueRow[]>();
  const usedFantasyCalcRows = new Set<string>();
  const candidateRows: Record<string, CandidatePlayerStatsRow> = {};
  const directSleeperIdMatches: MatchedPlayerReportRow[] = [];
  const fallbackCandidates: MatchedPlayerReportRow[] = [];
  const rejectedOrAmbiguousRows: RejectedOrAmbiguousReportRow[] = [];
  const missingRiverCityPlayers: MissingRiverCityPlayerReportRow[] = [];
  const directResolvedIds = new Set<string>();

  classifiedRows.eligibleRows.forEach((row) => {
    if (row.sleeperId) {
      addToMapList(fantasyCalcBySleeperId, row.sleeperId, row);
    }

    const fallbackKey = buildFallbackKey({
      name: row.name,
      position: row.position,
      team: row.team,
    });
    if (fallbackKey) {
      addToMapList(fantasyCalcByFallbackKey, fallbackKey, row);
    }
  });

  templateEntries.forEach((entry) => {
    const directRows = fantasyCalcBySleeperId.get(entry.sleeperPlayerId) ?? [];

    if (directRows.length === 1) {
      const fantasyCalcRow = directRows[0];
      const positionMismatch =
        normalizePosition(entry.row.position) !==
        normalizePosition(fantasyCalcRow.position);
      const teamMismatch =
        normalizeTeam(entry.row.nflTeam) !== null &&
        normalizeTeam(fantasyCalcRow.team) !== null &&
        normalizeTeam(entry.row.nflTeam) !== normalizeTeam(fantasyCalcRow.team);
      const notes = [
        ...(positionMismatch ? ["position differs between Sleeper and FantasyCalc"] : []),
        ...(teamMismatch ? ["team differs between Sleeper and FantasyCalc"] : []),
      ];

      candidateRows[entry.sleeperPlayerId] = buildCandidateRow({
        templateRow: entry.row,
        sleeperPlayerId: entry.sleeperPlayerId,
        fantasyCalcRow,
        matchMethod: "directSleeperId",
        generatedAt,
        captureDate,
        sourceVersion,
        additionalNotes: notes,
        sourceDetail,
      });
      directSleeperIdMatches.push(
        buildMatchedReportRow(
          entry.sleeperPlayerId,
          entry.row,
          fantasyCalcRow,
          "directSleeperId",
          notes
        )
      );
      directResolvedIds.add(entry.sleeperPlayerId);
      usedFantasyCalcRows.add(makeRowKey(fantasyCalcRow));
      return;
    }

    if (directRows.length > 1) {
      rejectedOrAmbiguousRows.push({
        scope: "template",
        sleeperPlayerId: entry.sleeperPlayerId,
        playerName: entry.row.playerName,
        position: normalizePosition(entry.row.position),
        nflTeam: normalizeTeam(entry.row.nflTeam),
        fantasycalcRowNumbers: directRows.map((row) => row.sourceRowNumber),
        fantasycalcNames: directRows.map((row) => row.name),
        reason: "multiple FantasyCalc rows share this Sleeper ID",
      });
      missingRiverCityPlayers.push(
        buildMissingRow(entry, "ambiguous duplicate FantasyCalc Sleeper ID")
      );
    }
  });

  templateEntries.forEach((entry) => {
    if (directResolvedIds.has(entry.sleeperPlayerId)) return;
    if (
      rejectedOrAmbiguousRows.some(
        (row) => row.sleeperPlayerId === entry.sleeperPlayerId
      )
    ) {
      return;
    }

    const fallbackKey = buildFallbackKey({
      name: entry.row.playerName,
      position: entry.row.position,
      team: entry.row.nflTeam,
    });

    if (!fallbackKey) {
      missingRiverCityPlayers.push(
        buildMissingRow(
          entry,
          "no direct Sleeper ID match and fallback requires name, position, and team"
        )
      );
      return;
    }

    const fallbackRows = (fantasyCalcByFallbackKey.get(fallbackKey) ?? []).filter(
      (row) => !usedFantasyCalcRows.has(makeRowKey(row))
    );

    if (fallbackRows.length === 1) {
      const fantasyCalcRow = fallbackRows[0];
      const notes = [
        fantasyCalcRow.sleeperId &&
        fantasyCalcRow.sleeperId !== entry.sleeperPlayerId
          ? `FantasyCalc sleeperId ${fantasyCalcRow.sleeperId} differs from template Sleeper ID`
          : "FantasyCalc sleeperId is missing",
      ];

      candidateRows[entry.sleeperPlayerId] = buildCandidateRow({
        templateRow: entry.row,
        sleeperPlayerId: entry.sleeperPlayerId,
        fantasyCalcRow,
        matchMethod: "fallbackNamePositionTeam",
        generatedAt,
        captureDate,
        sourceVersion,
        additionalNotes: notes,
        sourceDetail,
      });
      fallbackCandidates.push(
        buildMatchedReportRow(
          entry.sleeperPlayerId,
          entry.row,
          fantasyCalcRow,
          "fallbackNamePositionTeam",
          notes
        )
      );
      usedFantasyCalcRows.add(makeRowKey(fantasyCalcRow));
      return;
    }

    if (fallbackRows.length > 1) {
      rejectedOrAmbiguousRows.push({
        scope: "template",
        sleeperPlayerId: entry.sleeperPlayerId,
        playerName: entry.row.playerName,
        position: normalizePosition(entry.row.position),
        nflTeam: normalizeTeam(entry.row.nflTeam),
        fantasycalcRowNumbers: fallbackRows.map((row) => row.sourceRowNumber),
        fantasycalcNames: fallbackRows.map((row) => row.name),
        reason: "multiple FantasyCalc rows match fallback name, position, and team",
      });
      missingRiverCityPlayers.push(
        buildMissingRow(entry, "ambiguous FantasyCalc fallback match")
      );
      return;
    }

    missingRiverCityPlayers.push(
      buildMissingRow(entry, "no FantasyCalc match found")
    );
  });

  classifiedRows.invalidRows.forEach(({ row, reason }) => {
    rejectedOrAmbiguousRows.push({
      scope: "fantasycalc",
      fantasycalcRowNumbers: [row.sourceRowNumber],
      fantasycalcNames: [row.name],
      reason,
    });
  });

  const ignoredFantasyCalcRows: IgnoredFantasyCalcReportRow[] = [
    ...classifiedRows.draftPickRows.map((row) => ({
      sourceRowNumber: row.sourceRowNumber,
      fantasycalcId: row.fantasycalcId,
      sleeperId: row.sleeperId,
      name: row.name,
      position: row.position,
      team: row.team,
      value: row.value,
      reason: "draft picks are not included in the Phase 8 player_stats snapshot",
    })),
    ...classifiedRows.eligibleRows
      .filter((row) => !usedFantasyCalcRows.has(makeRowKey(row)))
      .map((row) => ({
        sourceRowNumber: row.sourceRowNumber,
        fantasycalcId: row.fantasycalcId,
        sleeperId: row.sleeperId,
        name: row.name,
        position: row.position,
        team: row.team,
        value: row.value,
        reason: "FantasyCalc row is not in the River City Sleeper template",
      })),
  ];

  const candidate: CandidatePlayerStatsSnapshot = {
    generatedAt,
    sourceDetail,
    sourceVersion,
    importTargetPath,
    sourceAttribution: FANTASYCALC_ATTRIBUTION,
    sourceSettings,
    sourceFreshness: {
      capturedAt: captureDate,
      generatedAt,
    },
    reviewInstructions: [
      "Review fallbackCandidates, rejectedOrAmbiguousRows, and missingRiverCityPlayers before promoting this candidate.",
      "Do not copy this file to the final import path until the preview is clean and Ray has approved the source/matches.",
      "Keep FantasyCalc attribution visible anywhere these values are surfaced.",
    ],
    players: Object.fromEntries(
      Object.entries(candidateRows).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
  };

  const report: FantasyCalcMatchReviewReport = {
    generatedAt,
    captureDate,
    inputMode,
    sourceUrl,
    sourceDetail,
    sourceVersion,
    sourceAttribution: FANTASYCALC_ATTRIBUTION,
    candidateSnapshotPath,
    templatePath,
    counts: {
      riverCityTemplatePlayers: templateEntries.length,
      riverCityTemplateDraftPicksIgnored: draftPickEntries.length,
      fantasyCalcRowsRead: fantasyCalcRows.length,
      fantasyCalcDraftPickRowsIgnored: classifiedRows.draftPickRows.length,
      fantasyCalcInvalidRowsRejected: classifiedRows.invalidRows.length,
      directSleeperIdMatches: directSleeperIdMatches.length,
      fallbackCandidateMatches: fallbackCandidates.length,
      candidateSnapshotPlayers: Object.keys(candidateRows).length,
      rejectedOrAmbiguousRows: rejectedOrAmbiguousRows.length,
      missingRiverCityPlayers: missingRiverCityPlayers.length,
      ignoredFantasyCalcRows: ignoredFantasyCalcRows.length,
    },
    directSleeperIdMatches,
    fallbackCandidates,
    rejectedOrAmbiguousRows,
    missingRiverCityPlayers,
    ignoredFantasyCalcRows,
  };

  return { candidate, report };
}

function parseCsvRows(rawCsv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < rawCsv.length; index += 1) {
    const char = rawCsv[index];
    const nextChar = rawCsv[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCsvValue(
  row: Record<string, string>,
  headers: string[]
): string | null {
  for (const header of headers) {
    const value = row[header];
    if (value !== undefined && value.trim().length > 0) return value.trim();
  }

  return null;
}

export function parseFantasyCalcCsv(rawCsv: string): FantasyCalcValueRow[] {
  const rows = parseCsvRows(rawCsv);
  if (rows.length === 0) return [];

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((values, index) => {
    const row = Object.fromEntries(
      headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""])
    );
    const value = readNumber(getCsvValue(row, ["value", "tradevalue"]));
    const name = getCsvValue(row, ["name", "player", "playername"]) ?? "";

    return {
      inputMode: "csv",
      sourceRowNumber: index + 2,
      fantasycalcId: getCsvValue(row, ["fantasycalcid", "id"]),
      sleeperId: getCsvValue(row, ["sleeperid", "sleeper"]),
      mflId: getCsvValue(row, ["mflid", "mfl"]),
      name,
      position: normalizePosition(getCsvValue(row, ["position", "pos"])),
      team: normalizeTeam(getCsvValue(row, ["team", "maybeteam", "nflteam"])),
      value: value ?? Number.NaN,
      overallRank: readNumber(getCsvValue(row, ["overallrank", "rank"])),
      positionRank: readNumber(getCsvValue(row, ["positionrank", "posrank"])),
      trend30Day: readNumber(getCsvValue(row, ["trend30day", "trend30days"])),
    };
  });
}

export function parseFantasyCalcApiRows(rawJson: unknown): FantasyCalcValueRow[] {
  if (!Array.isArray(rawJson)) {
    throw new Error("FantasyCalc API response must be an array");
  }

  return rawJson.map((rawRow, index) => {
    const row = isRecord(rawRow) ? rawRow : {};
    const player = isRecord(row.player) ? row.player : {};
    const value = readNumber(row.value);

    return {
      inputMode: "fetch",
      sourceRowNumber: index + 1,
      fantasycalcId: readNullableString(player.id),
      sleeperId: readNullableString(player.sleeperId),
      mflId: readNullableString(player.mflId),
      name: readNullableString(player.name) ?? "",
      position: normalizePosition(readNullableString(player.position)),
      team: normalizeTeam(readNullableString(player.maybeTeam)),
      value: value ?? Number.NaN,
      overallRank: readNumber(row.overallRank),
      positionRank: readNumber(row.positionRank),
      trend30Day: readNumber(row.trend30Day),
      redraftValue: readNumber(row.redraftValue),
    };
  });
}
