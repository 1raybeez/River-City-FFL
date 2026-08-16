import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AuctionImportMatchStatus } from "../lib/auction/importTypes";
import type {
  AuctionPlayerId,
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTimestamp,
} from "../lib/auction/types";
import type {
  AuctionSourceValueRow,
  AuctionSourceValuesFile,
  AuctionValueSourceKey,
} from "../lib/auction/valueSources";

const SOURCE_VALUES_DIR = "data/auction/source-values";
const GENERATED_DIR = "data/auction/generated";

export type GeneratedMasterviewSourceValue = {
  sourceRowId: string;
  sourceId: string;
  sourceKey: AuctionValueSourceKey;
  sourceName: string;
  sourceFilename: string;
  rowNumber: number;
  playerNameFromSource: string;
  auctionValue: number;
  normalizedAuctionValue: number;
  rank: number | null;
  tier: string | null;
  matchStatus: AuctionImportMatchStatus;
  matchMethod: string;
  matchConfidence: number;
  sourceConfidence: number;
  importedAt: AuctionTimestamp;
};

export type GeneratedMasterviewRow = {
  season: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId | null;
  playerName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  sourceValues: GeneratedMasterviewSourceValue[];
  lowValue: number;
  highValue: number;
  averageValue: number;
  medianValue: number;
  sourceCount: number;
  confidenceScore: number;
  warnings: string[];
};

export type GeneratedMasterviewFile = {
  generatedAt: AuctionTimestamp;
  season: AuctionSeasonYear;
  sourceDirectory: string;
  sourceFiles: string[];
  rowCount: number;
  sourceValueCount: number;
  skippedSourceValueCount: number;
  rows: GeneratedMasterviewRow[];
};

export type GeneratedMasterviewManifest = {
  generatedAt: AuctionTimestamp;
  sourceDirectory: string;
  outputDirectory: string;
  seasonsProcessed: AuctionSeasonYear[];
  sourceFilesRead: string[];
  files: Array<{
    season: AuctionSeasonYear;
    outputFile: string;
    rowCount: number;
    sourceValueCount: number;
    skippedSourceValueCount: number;
    warningCount: number;
  }>;
  totals: {
    seasons: number;
    rows: number;
    sourceValues: number;
    skippedSourceValues: number;
    warnings: number;
  };
};

export type SourceValueFileWithPath = AuctionSourceValuesFile & {
  filePath: string;
  filename: string;
};

type GroupedSourceValue = {
  groupKey: string;
  season: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId | null;
  rows: AuctionSourceValueRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSourceValueFile(value: unknown): value is AuctionSourceValuesFile {
  return (
    isRecord(value) &&
    typeof value.generatedAt === "string" &&
    typeof value.sourceKey === "string" &&
    typeof value.seasonYear === "number" &&
    Array.isArray(value.rows)
  );
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeText(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[.'’]/g, "")
      .replace(/\s+/g, " ") ?? ""
  );
}

function normalizePosition(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

function roundValue(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getSourceValueFiles(filenames: string[]) {
  return filenames
    .filter((filename) => filename.toLowerCase().endsWith(".json"))
    .filter((filename) => !filename.toLowerCase().endsWith("-review.json"))
    .filter((filename) => !filename.toLowerCase().includes("manifest"))
    .sort();
}

async function readSourceValueFiles(): Promise<SourceValueFileWithPath[]> {
  if (!existsSync(SOURCE_VALUES_DIR)) return [];

  const filenames = getSourceValueFiles(await readdir(SOURCE_VALUES_DIR));
  const files: SourceValueFileWithPath[] = [];

  for (const filename of filenames) {
    const filePath = path.join(SOURCE_VALUES_DIR, filename);
    const rawJson = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(rawJson);

    if (!isSourceValueFile(parsed)) {
      console.warn(`Skipping non-source-value JSON file: ${filePath}`);
      continue;
    }

    files.push({
      ...parsed,
      filePath,
      filename,
    });
  }

  return files;
}

function getGroupKey(row: AuctionSourceValueRow) {
  if (row.matchedSleeperId) return `sleeper:${row.seasonYear}:${row.matchedSleeperId}`;

  const nameKey =
    row.normalizedPlayerName || normalizeText(row.playerNameFromSource);
  const positionKey = normalizePosition(row.position);

  if (!nameKey) return null;

  return `name:${row.seasonYear}:${nameKey}:${positionKey}`;
}

function shouldSkipSourceRow(row: AuctionSourceValueRow) {
  return (
    row.matchStatus === "ignored" ||
    !isFiniteNumber(row.normalizedAuctionValue) ||
    row.normalizedAuctionValue < 0 ||
    getGroupKey(row) === null
  );
}

function groupRows(rows: readonly AuctionSourceValueRow[]) {
  const groups = new Map<string, GroupedSourceValue>();
  let skippedSourceValueCount = 0;

  for (const row of rows) {
    if (shouldSkipSourceRow(row)) {
      skippedSourceValueCount += 1;
      continue;
    }

    const groupKey = getGroupKey(row);
    if (!groupKey) {
      skippedSourceValueCount += 1;
      continue;
    }

    const existing = groups.get(groupKey) ?? {
      groupKey,
      season: row.seasonYear,
      sleeperPlayerId: row.matchedSleeperId,
      rows: [],
    };

    if (existing.rows.some((existingRow) => existingRow.sourceKey === row.sourceKey)) {
      skippedSourceValueCount += 1;
      continue;
    }

    existing.rows.push(row);
    groups.set(groupKey, existing);
  }

  return {
    groups: Array.from(groups.values()),
    skippedSourceValueCount,
  };
}

function pickMostFrequentValue<T extends string | null>(
  values: readonly T[]
): T {
  const counts = new Map<T, number>();

  for (const value of values) {
    if (value === null || value === "") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return (
    Array.from(counts.entries()).sort(
      (firstValue, secondValue) => secondValue[1] - firstValue[1]
    )[0]?.[0] ?? null
  ) as T;
}

function getPlayerName(rows: readonly AuctionSourceValueRow[]) {
  return (
    pickMostFrequentValue(rows.map((row) => row.matchedSleeperName)) ??
    rows
      .map((row) => row.playerNameFromSource)
      .find((playerName) => playerName.trim().length > 0) ??
    "Unknown Player"
  );
}

function getMedian(values: readonly number[]) {
  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) return sortedValues[midpoint];

  return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
}

function hasHighSpread(lowValue: number, highValue: number, averageValue: number) {
  const spread = highValue - lowValue;
  return spread >= Math.max(10, averageValue * 0.25);
}

function buildWarnings(
  group: GroupedSourceValue,
  lowValue: number,
  highValue: number,
  averageValue: number
) {
  const warnings = new Set<string>();

  if (!group.sleeperPlayerId) warnings.add("identity-review-needed");
  if (group.rows.length < 2) warnings.add("low-source-count");
  if (hasHighSpread(lowValue, highValue, averageValue)) {
    warnings.add("high-source-spread");
  }
  if (
    group.rows.some(
      (row) => row.matchStatus === "ambiguous" || row.matchStatus === "unmatched"
    )
  ) {
    warnings.add("match-review-needed");
  }
  if (group.rows.some((row) => row.warnings.length > 0)) {
    warnings.add("source-row-warnings");
  }
  if (group.rows.some((row) => row.errors.length > 0)) {
    warnings.add("source-row-errors");
  }

  return Array.from(warnings);
}

function calculateConfidenceScore({
  group,
  warnings,
}: {
  group: GroupedSourceValue;
  warnings: readonly string[];
}) {
  const averageMatchConfidence =
    group.rows.reduce((sum, row) => sum + row.matchConfidence, 0) /
    group.rows.length;
  const averageSourceConfidence =
    group.rows.reduce((sum, row) => sum + row.sourceConfidence, 0) /
    group.rows.length;
  let score = Math.min(averageMatchConfidence, averageSourceConfidence);

  if (!group.sleeperPlayerId) score -= 25;
  if (group.rows.length < 2) score -= 20;
  if (warnings.includes("high-source-spread")) score -= 15;
  if (warnings.includes("match-review-needed")) score -= 20;
  if (warnings.includes("source-row-warnings")) score -= 8;
  if (warnings.includes("source-row-errors")) score -= 15;

  return Math.round(clamp(score, 0, 100));
}

function toSourceValue(row: AuctionSourceValueRow): GeneratedMasterviewSourceValue {
  return {
    sourceRowId: row.id,
    sourceId: row.sourceId,
    sourceKey: row.sourceKey,
    sourceName: row.sourceName,
    sourceFilename: row.sourceFilename,
    rowNumber: row.rowNumber,
    playerNameFromSource: row.playerNameFromSource,
    auctionValue: row.auctionValue ?? row.normalizedAuctionValue ?? 0,
    normalizedAuctionValue: row.normalizedAuctionValue ?? row.auctionValue ?? 0,
    rank: row.rank,
    tier: row.tier,
    matchStatus: row.matchStatus,
    matchMethod: row.matchMethod,
    matchConfidence: row.matchConfidence,
    sourceConfidence: row.sourceConfidence,
    importedAt: row.importedAt,
  };
}

function buildMasterviewRow(group: GroupedSourceValue): GeneratedMasterviewRow {
  const values = group.rows
    .map((row) => row.normalizedAuctionValue)
    .filter(isFiniteNumber)
    .sort((left, right) => left - right);
  const lowValue = values[0];
  const highValue = values[values.length - 1];
  const averageValue =
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const medianValue = getMedian(values);
  const warnings = buildWarnings(group, lowValue, highValue, averageValue);

  return {
    season: group.season,
    sleeperPlayerId: group.sleeperPlayerId,
    playerName: getPlayerName(group.rows),
    position: pickMostFrequentValue(group.rows.map((row) => row.position)),
    nflTeam: pickMostFrequentValue(group.rows.map((row) => row.nflTeam)),
    sourceValues: group.rows.map(toSourceValue),
    lowValue: roundValue(lowValue),
    highValue: roundValue(highValue),
    averageValue: roundValue(averageValue),
    medianValue: roundValue(medianValue),
    sourceCount: values.length,
    confidenceScore: calculateConfidenceScore({ group, warnings }),
    warnings,
  };
}

function sortMasterviewRows(rows: readonly GeneratedMasterviewRow[]) {
  return [...rows].sort((firstRow, secondRow) => {
    if (secondRow.averageValue !== firstRow.averageValue) {
      return secondRow.averageValue - firstRow.averageValue;
    }

    return firstRow.playerName.localeCompare(secondRow.playerName);
  });
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(
    path.join(process.cwd(), filePath),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

export function generateMasterviewFromSourceValueFiles({
  sourceFiles,
  generatedAt = new Date().toISOString(),
  sourceDirectory = SOURCE_VALUES_DIR,
  outputDirectory = GENERATED_DIR,
}: {
  sourceFiles: readonly SourceValueFileWithPath[];
  generatedAt?: AuctionTimestamp;
  sourceDirectory?: string;
  outputDirectory?: string;
}) {
  if (sourceFiles.length === 0) {
    return {
      manifest: {
        generatedAt,
        sourceDirectory,
        outputDirectory,
        seasonsProcessed: [],
        sourceFilesRead: [],
        files: [],
        totals: {
          seasons: 0,
          rows: 0,
          sourceValues: 0,
          skippedSourceValues: 0,
          warnings: 0,
        },
      } satisfies GeneratedMasterviewManifest,
      outputs: [] as GeneratedMasterviewFile[],
    };
  }

  const sourceRows = sourceFiles.flatMap((file) => file.rows);
  const { groups, skippedSourceValueCount } = groupRows(sourceRows);
  const rowsBySeason = new Map<AuctionSeasonYear, GeneratedMasterviewRow[]>();

  for (const group of groups) {
    const seasonRows = rowsBySeason.get(group.season) ?? [];
    seasonRows.push(buildMasterviewRow(group));
    rowsBySeason.set(group.season, seasonRows);
  }

  const files: GeneratedMasterviewManifest["files"] = [];
  const outputs: GeneratedMasterviewFile[] = [];
  const seasonsProcessed = Array.from(rowsBySeason.keys()).sort(
    (left, right) => left - right
  );

  for (const season of seasonsProcessed) {
    const rows = sortMasterviewRows(rowsBySeason.get(season) ?? []);
    const sourceValueCount = rows.reduce(
      (count, row) => count + row.sourceValues.length,
      0
    );
    const outputFile = `${outputDirectory}/masterview-${season}.json`;
    const output: GeneratedMasterviewFile = {
      generatedAt,
      season,
      sourceDirectory,
      sourceFiles: sourceFiles.map((file) => file.filePath),
      rowCount: rows.length,
      sourceValueCount,
      skippedSourceValueCount,
      rows,
    };

    files.push({
      season,
      outputFile,
      rowCount: rows.length,
      sourceValueCount,
      skippedSourceValueCount,
      warningCount: rows.reduce(
        (count, row) => count + row.warnings.length,
        0
      ),
    });

    outputs.push(output);
  }

  const manifest: GeneratedMasterviewManifest = {
    generatedAt,
    sourceDirectory,
    outputDirectory,
    seasonsProcessed,
    sourceFilesRead: sourceFiles.map((file) => file.filePath),
    files,
    totals: {
      seasons: seasonsProcessed.length,
      rows: files.reduce((count, file) => count + file.rowCount, 0),
      sourceValues: files.reduce(
        (count, file) => count + file.sourceValueCount,
        0
      ),
      skippedSourceValues: skippedSourceValueCount,
      warnings: files.reduce((count, file) => count + file.warningCount, 0),
    },
  };

  return {
    manifest,
    outputs,
  };
}

async function main() {
  const sourceFiles = await readSourceValueFiles();

  if (sourceFiles.length === 0) {
    console.log(
      JSON.stringify(
        {
          message:
            "No source value JSON files found. Add files under data/auction/source-values/ first.",
          sourceDirectory: SOURCE_VALUES_DIR,
          outputDirectory: GENERATED_DIR,
          filesWritten: [],
        },
        null,
        2
      )
    );
    return;
  }

  await mkdir(GENERATED_DIR, { recursive: true });

  const { manifest, outputs } = generateMasterviewFromSourceValueFiles({
        sourceFiles,
      });

  for (const output of outputs) {
    await writeJsonFile(
      `${GENERATED_DIR}/masterview-${output.season}.json`,
      output
    );
  }

  await writeJsonFile(`${GENERATED_DIR}/masterview-manifest.json`, manifest);

  console.log(
    JSON.stringify(
      {
        sourceFilesRead: manifest.sourceFilesRead,
        filesWritten: [
          ...manifest.files.map((file) => file.outputFile),
          `${GENERATED_DIR}/masterview-manifest.json`,
        ],
        totals: manifest.totals,
      },
      null,
      2
    )
  );
}

if (process.argv[1]?.endsWith("auction-generate-masterview-from-sources.ts")) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
