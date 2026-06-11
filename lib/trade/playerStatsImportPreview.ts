import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_PLAYER_STATS_SNAPSHOT_PATHS = [
  "data/trade-analyzer/player-stats-2026.json",
  "data/trade-analyzer/player-stats.snapshot.json",
  "data/trade-analyzer/player-values-2026.json",
] as const;

export const DEFAULT_PLAYER_STATS_MAX_AGE_DAYS = 30;

export type PlayerStatsValueSource =
  | "ManualSnapshot"
  | "Firestore"
  | "FantasyPros"
  | "Projection"
  | "Composite"
  | "Unverified";

export interface PlayerStatsSnapshotRow {
  playerId?: string;
  totalValueScore: number;
  keeperCost?: number;
  valueSource?: PlayerStatsValueSource | string;
  generatedAt?: string;
  sourceDetail?: string | null;
  sourceVersion?: string | null;
}

export interface PlayerStatsSnapshotFile {
  generatedAt?: string;
  sourceDetail?: string | null;
  sourceVersion?: string | null;
  players: Record<string, PlayerStatsSnapshotRow>;
}

export interface ValidPlayerStatsSnapshotRow {
  sleeperPlayerId: string;
  totalValueScore: number;
  keeperCost: number;
  valueSource: string;
  generatedAt: string | null;
  sourceDetail: string | null;
  sourceVersion: string | null;
}

export interface InvalidPlayerStatsSnapshotRow {
  sleeperPlayerId: string;
  reasons: string[];
}

export interface PlayerStatsSnapshotValidation {
  path: string | null;
  found: boolean;
  checkedPaths: string[];
  validRows: ValidPlayerStatsSnapshotRow[];
  invalidRows: InvalidPlayerStatsSnapshotRow[];
  parseError: string | null;
}

export interface ExistingPlayerStatsDoc {
  sleeperPlayerId: string;
  totalValueScore: number;
  generatedAt: string | null;
}

export interface PlayerStatsImportPreview {
  snapshotPath: string | null;
  snapshotFound: boolean;
  checkedSnapshotPaths: string[];
  activeRosterPlayerCount: number;
  snapshotValueCount: number;
  existingFirestorePlayerStatsCount: number;
  existingFirestorePositiveValueCount: number;
  matchedSleeperIdCount: number;
  matchedSleeperIds: string[];
  activeRosterCoveredCount: number;
  missingActiveRosterValueCount: number;
  missingActiveRosterValueIds: string[];
  invalidRows: InvalidPlayerStatsSnapshotRow[];
  parseError: string | null;
  generatedAtSummary: {
    oldestGeneratedAt: string | null;
    newestGeneratedAt: string | null;
    missingGeneratedAtCount: number;
    staleValueCount: number;
    maxAgeDays: number;
    referenceDate: string;
  };
}

interface BuildPreviewInput {
  activeRosterPlayerIds: string[];
  existingPlayerStatsDocs: ExistingPlayerStatsDoc[];
  snapshot: PlayerStatsSnapshotValidation;
  maxAgeDays?: number;
  referenceDate?: Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return readString(value);
}

function isValidDateString(value: string | null): boolean {
  return value !== null && !Number.isNaN(Date.parse(value));
}

function normalizeRow(
  sleeperPlayerId: string,
  row: unknown,
  fileDefaults: Pick<
    PlayerStatsSnapshotFile,
    "generatedAt" | "sourceDetail" | "sourceVersion"
  >
): ValidPlayerStatsSnapshotRow | InvalidPlayerStatsSnapshotRow {
  const reasons: string[] = [];

  if (!isRecord(row)) {
    return {
      sleeperPlayerId,
      reasons: ["row must be an object"],
    };
  }

  const embeddedPlayerId = readString(row.playerId);
  if (embeddedPlayerId && embeddedPlayerId !== sleeperPlayerId) {
    reasons.push("playerId does not match the Sleeper ID key");
  }

  const totalValueScore = row.totalValueScore;
  if (!isFiniteNumber(totalValueScore) || totalValueScore <= 0) {
    reasons.push("totalValueScore must be a positive number");
  }

  const keeperCost =
    row.keeperCost === undefined || row.keeperCost === null ? 0 : row.keeperCost;
  if (!isFiniteNumber(keeperCost) || keeperCost < 0) {
    reasons.push("keeperCost must be a non-negative number when provided");
  }

  const valueSource = readString(row.valueSource);
  if (!valueSource) {
    reasons.push("valueSource is required");
  }

  const generatedAt =
    readNullableString(row.generatedAt) ??
    readNullableString(fileDefaults.generatedAt);
  if (generatedAt !== null && !isValidDateString(generatedAt)) {
    reasons.push("generatedAt must be a parseable date string when provided");
  }

  if (reasons.length > 0) {
    return { sleeperPlayerId, reasons };
  }

  return {
    sleeperPlayerId,
    totalValueScore: totalValueScore as number,
    keeperCost: keeperCost as number,
    valueSource: valueSource as string,
    generatedAt,
    sourceDetail:
      readNullableString(row.sourceDetail) ??
      readNullableString(fileDefaults.sourceDetail),
    sourceVersion:
      readNullableString(row.sourceVersion) ??
      readNullableString(fileDefaults.sourceVersion),
  };
}

function parseSnapshotJson(
  rawJson: string,
  snapshotPath: string
): PlayerStatsSnapshotValidation {
  try {
    const parsed: unknown = JSON.parse(rawJson);

    if (!isRecord(parsed)) {
      return {
        path: snapshotPath,
        found: true,
        checkedPaths: [snapshotPath],
        validRows: [],
        invalidRows: [
          {
            sleeperPlayerId: "(snapshot)",
            reasons: ["snapshot must be a JSON object"],
          },
        ],
        parseError: null,
      };
    }

    const players = isRecord(parsed.players) ? parsed.players : parsed;
    const usesWrappedPlayers = isRecord(parsed.players);
    const fileDefaults = {
      generatedAt: readNullableString(parsed.generatedAt) ?? undefined,
      sourceDetail: readNullableString(parsed.sourceDetail),
      sourceVersion: readNullableString(parsed.sourceVersion),
    };

    const validRows: ValidPlayerStatsSnapshotRow[] = [];
    const invalidRows: InvalidPlayerStatsSnapshotRow[] = [];

    Object.entries(players).forEach(([sleeperPlayerId, row]) => {
      if (!sleeperPlayerId.trim()) {
        invalidRows.push({
          sleeperPlayerId: "(empty key)",
          reasons: ["Sleeper player ID key cannot be empty"],
        });
        return;
      }

      if (
        !usesWrappedPlayers &&
        ["generatedAt", "sourceDetail", "sourceVersion"].includes(
          sleeperPlayerId
        )
      ) {
        invalidRows.push({
          sleeperPlayerId,
          reasons: [
            "top-level metadata is only supported when rows are nested under players",
          ],
        });
        return;
      }

      const normalized = normalizeRow(sleeperPlayerId, row, fileDefaults);
      if ("reasons" in normalized) {
        invalidRows.push(normalized);
      } else {
        validRows.push(normalized);
      }
    });

    return {
      path: snapshotPath,
      found: true,
      checkedPaths: [snapshotPath],
      validRows,
      invalidRows,
      parseError: null,
    };
  } catch (error) {
    return {
      path: snapshotPath,
      found: true,
      checkedPaths: [snapshotPath],
      validRows: [],
      invalidRows: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function findPlayerStatsSnapshotPath(
  cwd: string = process.cwd(),
  explicitSnapshotPath?: string
): { snapshotPath: string | null; checkedPaths: string[] } {
  const candidatePaths = explicitSnapshotPath
    ? [explicitSnapshotPath]
    : [...DEFAULT_PLAYER_STATS_SNAPSHOT_PATHS];

  const checkedPaths = candidatePaths.map((candidate) =>
    path.isAbsolute(candidate) ? candidate : path.join(cwd, candidate)
  );

  const snapshotPath =
    checkedPaths.find((candidate) => existsSync(candidate)) ?? null;

  return { snapshotPath, checkedPaths };
}

export function loadPlayerStatsSnapshot(
  cwd: string = process.cwd(),
  explicitSnapshotPath?: string
): PlayerStatsSnapshotValidation {
  const { snapshotPath, checkedPaths } = findPlayerStatsSnapshotPath(
    cwd,
    explicitSnapshotPath
  );

  if (!snapshotPath) {
    return {
      path: null,
      found: false,
      checkedPaths,
      validRows: [],
      invalidRows: [],
      parseError: null,
    };
  }

  const parsed = parseSnapshotJson(
    readFileSync(snapshotPath, "utf8"),
    snapshotPath
  );

  return {
    ...parsed,
    checkedPaths,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function summarizeGeneratedAt(
  rows: Array<{ generatedAt: string | null }>,
  referenceDate: Date,
  maxAgeDays: number
) {
  const parsedDates = rows
    .map((row) => row.generatedAt)
    .filter((value): value is string => value !== null)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const staleValueCount = parsedDates.filter(
    (date) => referenceDate.getTime() - date.getTime() > maxAgeMs
  ).length;

  return {
    oldestGeneratedAt: parsedDates[0]?.toISOString() ?? null,
    newestGeneratedAt: parsedDates[parsedDates.length - 1]?.toISOString() ?? null,
    missingGeneratedAtCount: rows.filter((row) => row.generatedAt === null)
      .length,
    staleValueCount,
    maxAgeDays,
    referenceDate: referenceDate.toISOString(),
  };
}

export function buildPlayerStatsImportPreview({
  activeRosterPlayerIds,
  existingPlayerStatsDocs,
  snapshot,
  maxAgeDays = DEFAULT_PLAYER_STATS_MAX_AGE_DAYS,
  referenceDate = new Date(),
}: BuildPreviewInput): PlayerStatsImportPreview {
  const activeRosterIds = uniqueStrings(activeRosterPlayerIds);
  const validSnapshotIds = uniqueStrings(
    snapshot.validRows.map((row) => row.sleeperPlayerId)
  );
  const validSnapshotIdSet = new Set(validSnapshotIds);
  const existingPositiveIds = uniqueStrings(
    existingPlayerStatsDocs
      .filter((doc) => doc.totalValueScore > 0)
      .map((doc) => doc.sleeperPlayerId)
  );
  const coverageIds = new Set([...validSnapshotIds, ...existingPositiveIds]);
  const matchedSleeperIds = activeRosterIds.filter((id) =>
    validSnapshotIdSet.has(id)
  );
  const missingActiveRosterValueIds = activeRosterIds.filter(
    (id) => !coverageIds.has(id)
  );

  const generatedAtRows = [
    ...snapshot.validRows.map((row) => ({ generatedAt: row.generatedAt })),
    ...existingPlayerStatsDocs
      .filter((doc) => doc.totalValueScore > 0)
      .map((doc) => ({ generatedAt: doc.generatedAt })),
  ];

  return {
    snapshotPath: snapshot.path,
    snapshotFound: snapshot.found,
    checkedSnapshotPaths: snapshot.checkedPaths,
    activeRosterPlayerCount: activeRosterIds.length,
    snapshotValueCount: snapshot.validRows.length,
    existingFirestorePlayerStatsCount: existingPlayerStatsDocs.length,
    existingFirestorePositiveValueCount: existingPositiveIds.length,
    matchedSleeperIdCount: matchedSleeperIds.length,
    matchedSleeperIds,
    activeRosterCoveredCount: activeRosterIds.filter((id) =>
      coverageIds.has(id)
    ).length,
    missingActiveRosterValueCount: missingActiveRosterValueIds.length,
    missingActiveRosterValueIds,
    invalidRows: snapshot.invalidRows,
    parseError: snapshot.parseError,
    generatedAtSummary: summarizeGeneratedAt(
      generatedAtRows,
      referenceDate,
      maxAgeDays
    ),
  };
}

export function formatPlayerStatsImportPreview(
  preview: PlayerStatsImportPreview
): string {
  const lines = [
    "Player Stats Import Preview",
    "---------------------------",
    `Snapshot found: ${preview.snapshotFound ? "yes" : "no"}`,
    `Snapshot path: ${preview.snapshotPath ?? "(none)"}`,
    `Active roster player count: ${preview.activeRosterPlayerCount}`,
    `Snapshot value count: ${preview.snapshotValueCount}`,
    `Existing Firestore player_stats count: ${preview.existingFirestorePlayerStatsCount}`,
    `Existing Firestore positive value count: ${preview.existingFirestorePositiveValueCount}`,
    `Matched Sleeper IDs from snapshot: ${preview.matchedSleeperIdCount}`,
    `Active roster covered by snapshot or Firestore: ${preview.activeRosterCoveredCount}`,
    `Missing active roster values: ${preview.missingActiveRosterValueCount}`,
    `Invalid snapshot rows: ${preview.invalidRows.length}`,
    `Snapshot parse error: ${preview.parseError ?? "(none)"}`,
    `Oldest generatedAt: ${
      preview.generatedAtSummary.oldestGeneratedAt ?? "(none)"
    }`,
    `Newest generatedAt: ${
      preview.generatedAtSummary.newestGeneratedAt ?? "(none)"
    }`,
    `Missing generatedAt count: ${preview.generatedAtSummary.missingGeneratedAtCount}`,
    `Stale value count (>${preview.generatedAtSummary.maxAgeDays} days): ${preview.generatedAtSummary.staleValueCount}`,
    "Firestore writes: none",
  ];

  if (!preview.snapshotFound) {
    lines.push("Checked snapshot paths:");
    preview.checkedSnapshotPaths.forEach((checkedPath) => {
      lines.push(`- ${checkedPath}`);
    });
  }

  if (preview.invalidRows.length > 0) {
    lines.push("Invalid rows:");
    preview.invalidRows.slice(0, 25).forEach((row) => {
      lines.push(`- ${row.sleeperPlayerId}: ${row.reasons.join("; ")}`);
    });
    if (preview.invalidRows.length > 25) {
      lines.push(`- ... ${preview.invalidRows.length - 25} more`);
    }
  }

  if (preview.missingActiveRosterValueIds.length > 0) {
    lines.push("Missing active roster value IDs:");
    preview.missingActiveRosterValueIds.slice(0, 50).forEach((playerId) => {
      lines.push(`- ${playerId}`);
    });
    if (preview.missingActiveRosterValueIds.length > 50) {
      lines.push(
        `- ... ${preview.missingActiveRosterValueIds.length - 50} more`
      );
    }
  }

  return lines.join("\n");
}
