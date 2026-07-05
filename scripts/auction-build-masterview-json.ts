import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AuctionImportPreview,
  AuctionImportRow,
  AuctionImportValidationIssue,
} from "../lib/auction/importTypes";
import type {
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTimestamp,
} from "../lib/auction/types";

const IMPORT_DIR = "data/auction/imports";
const OUTPUT_DIR = "data/auction/processed";
const MASTER_VIEW_SHEET_NAME = "masterview";
const SUPPORTED_SEASONS = [
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
  2025,
] as const satisfies readonly AuctionSeasonYear[];

interface Relationship {
  id: string;
  target: string;
}

interface WorkbookSheet {
  name: string;
  relationshipId: string;
  path: string;
}

interface WorksheetCell {
  ref: string;
  column: string;
  row: number;
  value: string;
  formula: string | null;
}

interface WorksheetRow {
  rowNumber: number;
  cells: WorksheetCell[];
  valuesByColumn: Record<string, string>;
}

interface HeaderCell {
  column: string;
  label: string;
  normalizedLabel: string;
}

interface SiteValuePreview {
  sourceName: string;
  value: number;
  rawValue: string;
}

interface MasterviewStatusColumns {
  keeper?: string;
  taken?: string;
  jak?: string;
  tier?: string;
}

interface MasterviewRawPayload extends Record<string, unknown> {
  sourceSheetName: "Masterview";
  original: Record<string, string>;
  siteValues: SiteValuePreview[];
  lowValue: number | null;
  highValue: number | null;
  averageValue: number | null;
  statusColumns: MasterviewStatusColumns;
  columnsDetected: string[];
  siteValueColumns: string[];
}

interface MasterviewBuildSummary {
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  outputFilename: string;
  masterviewHeaderRow: number | null;
  columnsDetected: string[];
  siteValueColumns: string[];
  statusColumnsDetected: string[];
  rowCount: number;
  skippedRows: number;
  missingPlayerNames: number;
  missingPositions: number;
  warningCount: number;
  errorCount: number;
}

interface MasterviewProcessedFile {
  generatedAt: AuctionTimestamp;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  sourceSheetName: "Masterview";
  masterviewHeaderRow: number;
  columnsDetected: string[];
  siteValueColumns: string[];
  statusColumnsDetected: string[];
  skippedRows: number;
  missingPlayerNames: number;
  missingPositions: number;
  preview: AuctionImportPreview;
}

interface WorkbookParseResult {
  processedFile: MasterviewProcessedFile | null;
  summary: MasterviewBuildSummary;
}

interface MasterviewManifest {
  generatedAt: AuctionTimestamp;
  sourceDirectory: string;
  outputDirectory: string;
  seasonsProcessed: AuctionSeasonYear[];
  files: MasterviewBuildSummary[];
  totals: {
    workbookCount: number;
    rowCount: number;
    skippedRows: number;
    missingPlayerNames: number;
    missingPositions: number;
    warningCount: number;
    errorCount: number;
  };
}

function readZipText(zipPath: string, entryPath: string): string {
  return execFileSync("unzip", ["-p", zipPath, entryPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function readZipTextOrNull(zipPath: string, entryPath: string): string | null {
  try {
    return readZipText(zipPath, entryPath);
  } catch {
    return null;
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
    attributes[match[1]] = decodeXml(match[2]);
  }
  return attributes;
}

function normalizeZipPath(target: string): string {
  const cleanTarget = target.replace(/^\/+/, "");
  if (cleanTarget.startsWith("xl/")) return cleanTarget;
  return path.posix.join("xl", cleanTarget);
}

function parseRelationships(xml: string): Map<string, Relationship> {
  const relationships = new Map<string, Relationship>();
  for (const match of xml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const attributes = parseAttributes(match[0]);
    const id = attributes.Id;
    const target = attributes.Target;
    if (!id || !target) continue;
    relationships.set(id, {
      id,
      target: normalizeZipPath(target),
    });
  }
  return relationships;
}

function parseWorkbookSheets(
  workbookXml: string,
  relationships: Map<string, Relationship>
): WorkbookSheet[] {
  const sheets: WorkbookSheet[] = [];

  for (const match of workbookXml.matchAll(/<sheet\b[^>]*\/>/g)) {
    const attributes = parseAttributes(match[0]);
    const relationshipId = attributes["r:id"];
    const relationship = relationshipId
      ? relationships.get(relationshipId)
      : undefined;

    if (!attributes.name || !relationshipId || !relationship) continue;

    sheets.push({
      name: attributes.name,
      relationshipId,
      path: relationship.target,
    });
  }

  return sheets;
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];

  for (const match of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
    const sharedStringXml = match[0];
    const textParts = Array.from(
      sharedStringXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)
    ).map((textMatch) => decodeXml(textMatch[1]));
    strings.push(textParts.join(""));
  }

  return strings;
}

function parseTextTag(xml: string, tagName: string): string | null {
  const match = xml.match(
    new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`)
  );
  return match ? decodeXml(match[1]) : null;
}

function parseCellReference(ref: string): { column: string; row: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { column: ref, row: 0 };
  return { column: match[1], row: Number(match[2]) };
}

function readCellValue(
  cellXml: string,
  cellType: string | null,
  sharedStrings: string[]
): string {
  if (cellType === "inlineStr") {
    return Array.from(cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
      .map((match) => decodeXml(match[1]))
      .join("")
      .trim();
  }

  const rawValue = parseTextTag(cellXml, "v");
  if (rawValue === null) return "";

  if (cellType === "s") {
    const sharedStringIndex = Number(rawValue);
    return sharedStrings[sharedStringIndex]?.trim() ?? rawValue.trim();
  }

  return rawValue.trim();
}

function parseWorksheetRows(
  xml: string,
  sharedStrings: string[]
): WorksheetRow[] {
  const rows: WorksheetRow[] = [];

  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowAttributes = parseAttributes(rowMatch[1]);
    const rowNumber = Number(rowAttributes.r);
    const rowXml = rowMatch[2];
    const cells: WorksheetCell[] = [];
    const valuesByColumn: Record<string, string> = {};

    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const cellAttributes = parseAttributes(cellMatch[1]);
      const ref = cellAttributes.r;
      if (!ref) continue;

      const { column, row } = parseCellReference(ref);
      const formula = parseTextTag(cellMatch[2], "f");
      const value = readCellValue(
        cellMatch[2],
        cellAttributes.t ?? null,
        sharedStrings
      );
      const displayValue = value || (formula ? `=${formula}` : "");

      if (!displayValue) continue;

      cells.push({
        ref,
        column,
        row,
        value: displayValue,
        formula,
      });
      valuesByColumn[column] = displayValue;
    }

    if (cells.length === 0) continue;

    rows.push({
      rowNumber: Number.isFinite(rowNumber) ? rowNumber : cells[0]?.row ?? 0,
      cells,
      valuesByColumn,
    });
  }

  return rows;
}

function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/[\s_.-]+/g, "");
}

function normalizeHeaderLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseSeasonFromFilename(filename: string): AuctionSeasonYear {
  const year = Number(filename.match(/(?:^|[/_-])(20\d{2})(?:[/_-]|$)/)?.[1]);
  if ((SUPPORTED_SEASONS as readonly number[]).includes(year)) {
    return year as AuctionSeasonYear;
  }
  throw new Error(`Unsupported or missing season in filename: ${filename}`);
}

function listWorkbookPaths(): string[] {
  const importDirPath = path.join(process.cwd(), IMPORT_DIR);
  if (!existsSync(importDirPath)) {
    throw new Error(`Import directory not found: ${IMPORT_DIR}`);
  }

  return readdirSync(importDirPath)
    .filter((filename) => filename.endsWith(".xlsx"))
    .filter((filename) => !filename.startsWith("~$"))
    .map((filename) => path.join(importDirPath, filename))
    .sort(
      (left, right) =>
        parseSeasonFromFilename(path.basename(left)) -
        parseSeasonFromFilename(path.basename(right))
    );
}

function findHeaderRow(rows: WorksheetRow[]): WorksheetRow | null {
  return (
    rows.find((row) => {
      const labels = row.cells.map((cell) => normalizeHeaderLabel(cell.value));
      return labels.includes("name") && labels.includes("avggoingrate");
    }) ?? null
  );
}

function buildHeaderCells(headerRow: WorksheetRow): HeaderCell[] {
  return headerRow.cells
    .filter((cell) => cell.value.trim())
    .map((cell) => ({
      column: cell.column,
      label: cell.value.trim(),
      normalizedLabel: normalizeHeaderLabel(cell.value),
    }));
}

function getRowRecord(
  row: WorksheetRow,
  headerCells: HeaderCell[]
): Record<string, string> {
  const record: Record<string, string> = {};

  for (const header of headerCells) {
    const value = row.valuesByColumn[header.column];
    if (value !== undefined) {
      record[header.label] = value;
    }
  }

  return record;
}

function getValueByHeader(
  record: Record<string, string>,
  normalizedHeaderNames: string[]
): string | null {
  for (const [header, value] of Object.entries(record)) {
    if (normalizedHeaderNames.includes(normalizeHeaderLabel(header))) {
      return value.trim() || null;
    }
  }

  return null;
}

function parseFiniteNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalizedValue = value.replace(/[$,]/g, "").trim();
  if (!normalizedValue || normalizedValue === "#N/A") return null;
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePosition(
  position: string | null
): AuctionPlayerPosition | null {
  if (!position) return null;

  const normalizedPosition = position.toUpperCase().replace(/[^A-Z]/g, "");

  if (normalizedPosition === "DST" || normalizedPosition === "DEFENSE") {
    return "DEF";
  }

  if (
    [
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
    ].includes(normalizedPosition)
  ) {
    return normalizedPosition as AuctionPlayerPosition;
  }

  return "UNK";
}

function isSiteValueColumn(header: HeaderCell): boolean {
  return ![
    "name",
    "team",
    "position",
    "pos",
    "byeweek",
    "avggoingrate",
    "variation",
    "keeper",
    "taken",
    "jak",
    "tier",
  ].includes(header.normalizedLabel);
}

function getStatusColumns(record: Record<string, string>): MasterviewStatusColumns {
  const keeper = getValueByHeader(record, ["keeper"]);
  const taken = getValueByHeader(record, ["taken"]);
  const jak = getValueByHeader(record, ["jak"]);
  const tier = getValueByHeader(record, ["tier"]);
  const statusColumns: MasterviewStatusColumns = {};

  if (keeper) statusColumns.keeper = keeper;
  if (taken) statusColumns.taken = taken;
  if (jak) statusColumns.jak = jak;
  if (tier) statusColumns.tier = tier;

  return statusColumns;
}

function createIssue(
  row: AuctionImportRow,
  code: string,
  message: string,
  field: string,
  severity: AuctionImportValidationIssue["severity"] = "warning"
): AuctionImportValidationIssue {
  return {
    id: `${row.id}:${code}`,
    severity,
    code,
    message,
    sourceId: row.sourceId,
    rowId: row.id,
    rowNumber: row.rowNumber,
    field,
  };
}

function buildPreview(
  seasonYear: AuctionSeasonYear,
  sourceFilename: string,
  rows: AuctionImportRow[],
  generatedAt: AuctionTimestamp
): AuctionImportPreview {
  const rowsWithIssues = rows.map((row) => {
    const issues: AuctionImportValidationIssue[] = [];
    if (!row.position) {
      issues.push(
        createIssue(
          row,
          "missing-position",
          "Masterview row is missing a position.",
          "position"
        )
      );
    }
    if (row.auctionPrice === null) {
      issues.push(
        createIssue(
          row,
          "missing-average-value",
          "Masterview row is missing Avg Going Rate.",
          "auctionPrice"
        )
      );
    }

    return {
      ...row,
      validationIssues: issues,
    };
  });
  const validationIssues = rowsWithIssues.flatMap(
    (row) => row.validationIssues
  );
  const warningCount = validationIssues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const errorCount = validationIssues.filter(
    (issue) => issue.severity === "error"
  ).length;

  return {
    id: `${seasonYear}:masterview-preview`,
    manifestId: `${seasonYear}:masterview-preview-manifest`,
    seasonYear,
    sourceFilename,
    rowCount: rows.length,
    matchedRowCount: 0,
    probableMatchRowCount: 0,
    ambiguousRowCount: 0,
    unmatchedRowCount: rows.length,
    ignoredRowCount: 0,
    warningCount,
    errorCount,
    rows: rowsWithIssues,
    validationIssues,
    generatedAt,
    isReadyForReview: rows.length > 0,
    isApprovedForImport: false,
  };
}

function getStatusColumnsDetected(headerCells: HeaderCell[]): string[] {
  return headerCells
    .filter((header) =>
      ["keeper", "taken", "jak", "tier"].includes(header.normalizedLabel)
    )
    .map((header) => header.label);
}

function parseWorkbook(
  workbookPath: string,
  generatedAt: AuctionTimestamp
): WorkbookParseResult {
  const sourceFilename = path.basename(workbookPath);
  const seasonYear = parseSeasonFromFilename(sourceFilename);
  const outputFilename = `masterview-${seasonYear}.json`;
  const workbookXml = readZipText(workbookPath, "xl/workbook.xml");
  const workbookRelationshipsXml = readZipText(
    workbookPath,
    "xl/_rels/workbook.xml.rels"
  );
  const sharedStringsXml =
    readZipTextOrNull(workbookPath, "xl/sharedStrings.xml") ?? "";
  const relationships = parseRelationships(workbookRelationshipsXml);
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const sheets = parseWorkbookSheets(workbookXml, relationships);
  const masterviewSheet = sheets.find(
    (sheet) => normalizeSheetName(sheet.name) === MASTER_VIEW_SHEET_NAME
  );

  if (!masterviewSheet) {
    return {
      processedFile: null,
      summary: {
        seasonYear,
        sourceFilename,
        outputFilename,
        masterviewHeaderRow: null,
        columnsDetected: [],
        siteValueColumns: [],
        statusColumnsDetected: [],
        rowCount: 0,
        skippedRows: 0,
        missingPlayerNames: 0,
        missingPositions: 0,
        warningCount: 0,
        errorCount: 1,
      },
    };
  }

  const masterviewXml = readZipText(workbookPath, masterviewSheet.path);
  const worksheetRows = parseWorksheetRows(masterviewXml, sharedStrings);
  const headerRow = findHeaderRow(worksheetRows);

  if (!headerRow) {
    return {
      processedFile: null,
      summary: {
        seasonYear,
        sourceFilename,
        outputFilename,
        masterviewHeaderRow: null,
        columnsDetected: [],
        siteValueColumns: [],
        statusColumnsDetected: [],
        rowCount: 0,
        skippedRows: worksheetRows.length,
        missingPlayerNames: 0,
        missingPositions: 0,
        warningCount: 0,
        errorCount: 1,
      },
    };
  }

  const headerCells = buildHeaderCells(headerRow);
  const columnsDetected = headerCells.map((header) => header.label);
  const siteValueHeaders = headerCells.filter(isSiteValueColumn);
  const siteValueColumns = siteValueHeaders.map((header) => header.label);
  const statusColumnsDetected = getStatusColumnsDetected(headerCells);
  const sourceId = `${seasonYear}:masterview`;
  const dataRows = worksheetRows.filter(
    (row) => row.rowNumber > headerRow.rowNumber
  );
  let skippedRows = 0;
  let missingPlayerNames = 0;
  let missingPositions = 0;
  const rows: AuctionImportRow[] = [];

  for (const row of dataRows) {
    const original = getRowRecord(row, headerCells);
    const playerName = getValueByHeader(original, ["name"]);

    if (!playerName) {
      skippedRows += 1;
      missingPlayerNames += 1;
      continue;
    }

    const rawPosition = getValueByHeader(original, ["position", "pos"]);
    const position = normalizePosition(rawPosition);

    if (!position) {
      missingPositions += 1;
    }

    const siteValues = siteValueHeaders
      .map((header) => {
        const rawValue = original[header.label] ?? "";
        const value = parseFiniteNumber(rawValue);

        return value === null
          ? null
          : {
              sourceName: header.label,
              value,
              rawValue,
            };
      })
      .filter((siteValue): siteValue is SiteValuePreview => siteValue !== null);
    const valuesForRange = siteValues
      .map((siteValue) => siteValue.value)
      .filter((value) => value > 0);
    const fallbackValuesForRange = siteValues.map((siteValue) => siteValue.value);
    const rangeValues =
      valuesForRange.length > 0 ? valuesForRange : fallbackValuesForRange;
    const lowValue = rangeValues.length > 0 ? Math.min(...rangeValues) : null;
    const highValue = rangeValues.length > 0 ? Math.max(...rangeValues) : null;
    const averageValue =
      parseFiniteNumber(getValueByHeader(original, ["avggoingrate"])) ??
      (rangeValues.length > 0
        ? rangeValues.reduce((total, value) => total + value, 0) /
          rangeValues.length
        : null);
    const raw: MasterviewRawPayload = {
      sourceSheetName: "Masterview",
      original,
      siteValues,
      lowValue,
      highValue,
      averageValue,
      statusColumns: getStatusColumns(original),
      columnsDetected,
      siteValueColumns,
    };

    rows.push({
      id: `${seasonYear}:masterview:${row.rowNumber}`,
      sourceId,
      seasonYear,
      sourceFilename,
      sourceSheetName: "Masterview",
      rowNumber: row.rowNumber,
      rowKind: "player-value",
      raw,
      playerName,
      playerId: null,
      position,
      nflTeam: getValueByHeader(original, ["team"]),
      auctionPrice: averageValue,
      buyerName: null,
      buyerManagerId: null,
      buyerTeamId: null,
      buyerTeamName: null,
      confidence: 0,
      matchStatus: "unmatched",
      validationIssues: [],
    });
  }

  const preview = buildPreview(seasonYear, sourceFilename, rows, generatedAt);
  const processedFile: MasterviewProcessedFile = {
    generatedAt,
    seasonYear,
    sourceFilename,
    sourceSheetName: "Masterview",
    masterviewHeaderRow: headerRow.rowNumber,
    columnsDetected,
    siteValueColumns,
    statusColumnsDetected,
    skippedRows,
    missingPlayerNames,
    missingPositions,
    preview,
  };

  return {
    processedFile,
    summary: {
      seasonYear,
      sourceFilename,
      outputFilename,
      masterviewHeaderRow: headerRow.rowNumber,
      columnsDetected,
      siteValueColumns,
      statusColumnsDetected,
      rowCount: preview.rowCount,
      skippedRows,
      missingPlayerNames,
      missingPositions,
      warningCount: preview.warningCount,
      errorCount: preview.errorCount,
    },
  };
}

function buildManifest(
  summaries: MasterviewBuildSummary[],
  generatedAt: AuctionTimestamp
): MasterviewManifest {
  return {
    generatedAt,
    sourceDirectory: IMPORT_DIR,
    outputDirectory: OUTPUT_DIR,
    seasonsProcessed: summaries.map((summary) => summary.seasonYear),
    files: summaries,
    totals: {
      workbookCount: summaries.length,
      rowCount: summaries.reduce((total, summary) => total + summary.rowCount, 0),
      skippedRows: summaries.reduce(
        (total, summary) => total + summary.skippedRows,
        0
      ),
      missingPlayerNames: summaries.reduce(
        (total, summary) => total + summary.missingPlayerNames,
        0
      ),
      missingPositions: summaries.reduce(
        (total, summary) => total + summary.missingPositions,
        0
      ),
      warningCount: summaries.reduce(
        (total, summary) => total + summary.warningCount,
        0
      ),
      errorCount: summaries.reduce(
        (total, summary) => total + summary.errorCount,
        0
      ),
    },
  };
}

async function writeJsonFile(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const outputDirPath = path.join(process.cwd(), OUTPUT_DIR);
  const parseResults = listWorkbookPaths().map((workbookPath) =>
    parseWorkbook(workbookPath, generatedAt)
  );
  const summaries = parseResults.map((result) => result.summary);
  const manifest = buildManifest(summaries, generatedAt);

  await mkdir(outputDirPath, { recursive: true });

  for (const result of parseResults) {
    if (!result.processedFile) continue;
    await writeJsonFile(
      path.join(outputDirPath, result.summary.outputFilename),
      result.processedFile
    );
  }

  await writeJsonFile(
    path.join(outputDirPath, "masterview-manifest.json"),
    manifest
  );

  console.log(
    JSON.stringify(
      {
        generatedAt,
        outputDirectory: OUTPUT_DIR,
        filesWritten: [
          ...summaries.map((summary) => ({
            seasonYear: summary.seasonYear,
            filename: summary.outputFilename,
            rowCount: summary.rowCount,
          })),
          {
            seasonYear: null,
            filename: "masterview-manifest.json",
            rowCount: manifest.totals.rowCount,
          },
        ],
        totals: manifest.totals,
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
