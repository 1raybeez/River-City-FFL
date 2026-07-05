import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AuctionImportPreview } from "../lib/auction/importTypes";
import type { AuctionPlayerPosition } from "../lib/auction/types";

const MASTER_VIEW_2025_PATH =
  "data/auction/processed/masterview-2025.json";
const SLEEPER_MATCH_REVIEW_2025_PATH =
  "data/auction/processed/sleeper-match-review-2025.json";
const OUTPUT_PATH = "data/auction/processed/player-values-2025.json";

interface MasterviewProcessedFile {
  generatedAt: string;
  seasonYear: 2025;
  sourceFilename: string;
  preview: AuctionImportPreview;
}

interface MasterviewRawPayload {
  siteValues?: SiteValue[];
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  statusColumns?: Record<string, string>;
}

interface SiteValue {
  sourceName: string;
  value: number;
  rawValue: string;
}

interface MatchReviewFile {
  generatedAt: string;
  totalRows: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  duplicateMatchedSleeperIdCount: number;
  duplicateMatches: DuplicateSleeperMatch[];
  rows: MatchReviewRow[];
}

interface MatchReviewRow {
  rowNumber: number;
  playerName: string;
  matchedSearchName: string;
  appliedAlias: {
    masterviewName: string;
    sleeperSearchName: string;
  } | null;
  matchStatus: "matched" | "ambiguous" | "unmatched";
  matchMethod: string;
  sleeperPlayerId: string | null;
  sleeperName: string | null;
  sleeperPosition: AuctionPlayerPosition | null;
  sleeperTeam: string | null;
}

interface DuplicateSleeperMatch {
  sleeperPlayerId: string;
  sleeperName: string | null;
  rows: Array<{
    rowNumber: number;
    playerName: string;
    position: AuctionPlayerPosition | null;
    nflTeam: string | null;
  }>;
}

interface PlayerValueRow {
  season: 2025;
  rowNumber: number;
  sleeperPlayerId: string | null;
  originalPlayerName: string;
  matchedSleeperName: string | null;
  matchedSearchName: string | null;
  appliedAlias: MatchReviewRow["appliedAlias"];
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  siteValues: SiteValue[];
  lowValue: number | null;
  highValue: number | null;
  averageValue: number | null;
  status: {
    taken: string | null;
    raw: Record<string, string>;
  };
  matchStatus: MatchReviewRow["matchStatus"] | "missing-review";
  matchMethod: string | null;
}

interface PlayerValuesFile {
  generatedAt: string;
  season: 2025;
  sourceFiles: {
    masterview: string;
    sleeperMatchReview: string;
  };
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  ambiguousRows: number;
  missingReviewRows: number;
  duplicateSleeperIds: DuplicateSleeperMatch[];
  rows: PlayerValueRow[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readRawPayload(row: AuctionImportPreview["rows"][number]) {
  return isRecord(row.raw) ? (row.raw as MasterviewRawPayload) : {};
}

function readStatusColumns(raw: MasterviewRawPayload): Record<string, string> {
  return isRecord(raw.statusColumns)
    ? (raw.statusColumns as Record<string, string>)
    : {};
}

function readSiteValues(raw: MasterviewRawPayload): SiteValue[] {
  return Array.isArray(raw.siteValues)
    ? raw.siteValues.filter(
        (siteValue): siteValue is SiteValue =>
          isRecord(siteValue) &&
          typeof siteValue.sourceName === "string" &&
          typeof siteValue.rawValue === "string" &&
          typeof siteValue.value === "number" &&
          Number.isFinite(siteValue.value)
      )
    : [];
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const rawJson = await readFile(filePath, "utf8");
  return JSON.parse(rawJson) as T;
}

function buildMatchReviewByRowNumber(review: MatchReviewFile) {
  const rowsByRowNumber = new Map<number, MatchReviewRow>();

  for (const row of review.rows) {
    rowsByRowNumber.set(row.rowNumber, row);
  }

  return rowsByRowNumber;
}

function buildPlayerValueRows(
  masterview: MasterviewProcessedFile,
  matchReview: MatchReviewFile
): PlayerValueRow[] {
  const matchReviewByRowNumber = buildMatchReviewByRowNumber(matchReview);

  return masterview.preview.rows.map((row) => {
    const raw = readRawPayload(row);
    const statusColumns = readStatusColumns(raw);
    const match = matchReviewByRowNumber.get(row.rowNumber);

    return {
      season: 2025,
      rowNumber: row.rowNumber,
      sleeperPlayerId: match?.sleeperPlayerId ?? null,
      originalPlayerName: row.playerName ?? "",
      matchedSleeperName: match?.sleeperName ?? null,
      matchedSearchName: match?.matchedSearchName ?? null,
      appliedAlias: match?.appliedAlias ?? null,
      position: row.position,
      nflTeam: row.nflTeam,
      siteValues: readSiteValues(raw),
      lowValue: readNumber(raw.lowValue),
      highValue: readNumber(raw.highValue),
      averageValue: readNumber(raw.averageValue) ?? row.auctionPrice,
      status: {
        taken: readString(statusColumns.taken),
        raw: statusColumns,
      },
      matchStatus: match?.matchStatus ?? "missing-review",
      matchMethod: match?.matchMethod ?? null,
    };
  });
}

function countRowsByStatus(rows: PlayerValueRow[], status: PlayerValueRow["matchStatus"]) {
  return rows.filter((row) => row.matchStatus === status).length;
}

async function main() {
  const masterview = await readJsonFile<MasterviewProcessedFile>(
    MASTER_VIEW_2025_PATH
  );
  const matchReview = await readJsonFile<MatchReviewFile>(
    SLEEPER_MATCH_REVIEW_2025_PATH
  );
  const generatedAt = new Date().toISOString();
  const rows = buildPlayerValueRows(masterview, matchReview);
  const output: PlayerValuesFile = {
    generatedAt,
    season: 2025,
    sourceFiles: {
      masterview: MASTER_VIEW_2025_PATH,
      sleeperMatchReview: SLEEPER_MATCH_REVIEW_2025_PATH,
    },
    totalRows: rows.length,
    matchedRows: countRowsByStatus(rows, "matched"),
    unmatchedRows: countRowsByStatus(rows, "unmatched"),
    ambiguousRows: countRowsByStatus(rows, "ambiguous"),
    missingReviewRows: countRowsByStatus(rows, "missing-review"),
    duplicateSleeperIds: matchReview.duplicateMatches,
    rows,
  };

  await writeFile(
    path.join(process.cwd(), OUTPUT_PATH),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputFile: OUTPUT_PATH,
        totalRows: output.totalRows,
        matchedRows: output.matchedRows,
        unmatchedRows: output.unmatchedRows,
        ambiguousRows: output.ambiguousRows,
        missingReviewRows: output.missingReviewRows,
        duplicateSleeperIds: output.duplicateSleeperIds.map((duplicate) => ({
          sleeperPlayerId: duplicate.sleeperPlayerId,
          sleeperName: duplicate.sleeperName,
          rowCount: duplicate.rows.length,
        })),
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
