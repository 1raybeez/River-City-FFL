import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_WORKBOOK_PATH =
  "data/auction/imports/2018_Auction_Value_Cheatsheet.xlsx";
const SAMPLE_ROW_LIMIT = 5;
const HEADER_SCAN_LIMIT = 30;

interface Relationship {
  id: string;
  target: string;
}

interface WorkbookSheet {
  name: string;
  relationshipId: string;
  sheetId: string;
  path: string;
  state: "visible" | "hidden" | "veryHidden";
}

interface WorksheetCell {
  ref: string;
  column: string;
  row: number;
  value: string;
  formula: string | null;
  type: string | null;
  styleIndex: number | null;
  isStruckThrough: boolean;
}

interface WorksheetRow {
  rowNumber: number;
  cells: WorksheetCell[];
  values: string[];
  valuesByColumn: Record<string, string>;
}

interface FormulaExample {
  cell: string;
  formula: string;
  cachedValue: string;
}

interface NormalizedSampleRow {
  rowNumber: number;
  values: Record<string, string>;
}

interface RawSampleRow {
  rowNumber: number;
  values: string[];
}

interface StrikeExample {
  cell: string;
  value: string;
}

interface StatusKeywordExample {
  cell: string;
  value: string;
}

interface WorksheetSummary {
  name: string;
  path: string;
  state: "visible" | "hidden" | "veryHidden";
  dimension: string | null;
  nonEmptyRowCount: number;
  headerRowNumber: number | null;
  headers: string[];
  rawSampleRows: RawSampleRow[];
  sampleRows: NormalizedSampleRow[];
  formulaCount: number;
  formulaExamples: FormulaExample[];
  mergedCellCount: number;
  mergedCells: string[];
  conditionalFormattingCount: number;
  strikeCellCount: number;
  strikeExamples: StrikeExample[];
  statusKeywordExamples: StatusKeywordExample[];
}

interface WorkbookStyleMetadata {
  struckStyleIndexes: Set<number>;
  struckFontCount: number;
  cellStyleCount: number;
}

interface WorkbookSummary {
  workbook: string;
  inspectedAt: string;
  sheetNames: string[];
  hiddenSheets: string[];
  likelyDataSheet: string | null;
  styleSummary: {
    struckFontCount: number;
    struckCellStyleCount: number;
    cellStyleCount: number;
  };
  worksheets: WorksheetSummary[];
}

const compactOutput = process.argv.includes("--compact");
const workbookPaths = process.argv
  .slice(2)
  .filter((argument) => argument !== "--compact");
const targetWorkbookPaths =
  workbookPaths.length > 0 ? workbookPaths : [DEFAULT_WORKBOOK_PATH];

for (const targetWorkbookPath of targetWorkbookPaths) {
  if (!existsSync(targetWorkbookPath)) {
    throw new Error(`Workbook not found: ${targetWorkbookPath}`);
  }
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
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
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
  relationships: Map<string, Relationship>,
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
      sheetId: attributes.sheetId ?? "",
      path: relationship.target,
      state:
        attributes.state === "hidden" || attributes.state === "veryHidden"
          ? attributes.state
          : "visible",
    });
  }

  return sheets;
}

function parseWorkbookStyles(xml: string | null): WorkbookStyleMetadata {
  if (!xml) {
    return {
      struckStyleIndexes: new Set<number>(),
      struckFontCount: 0,
      cellStyleCount: 0,
    };
  }

  const fontsXml = xml.match(/<fonts\b[^>]*>([\s\S]*?)<\/fonts>/)?.[1] ?? "";
  const fontStrikeFlags = Array.from(fontsXml.matchAll(/<font\b[\s\S]*?<\/font>/g)).map(
    (match) => /<strike\b(?![^>]*val="0")/.test(match[0]),
  );

  const cellXfsXml =
    xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? "";
  const struckStyleIndexes = new Set<number>();
  let cellStyleCount = 0;

  for (const match of cellXfsXml.matchAll(/<xf\b[^>]*(?:\/>|>[\s\S]*?<\/xf>)/g)) {
    const attributes = parseAttributes(match[0]);
    const styleIndex = cellStyleCount;
    cellStyleCount += 1;
    const fontId = Number(attributes.fontId);

    if (Number.isInteger(fontId) && fontStrikeFlags[fontId]) {
      struckStyleIndexes.add(styleIndex);
    }
  }

  return {
    struckStyleIndexes,
    struckFontCount: fontStrikeFlags.filter(Boolean).length,
    cellStyleCount,
  };
}

function parseSharedStrings(xml: string): string[] {
  const strings: string[] = [];

  for (const match of xml.matchAll(/<si\b[\s\S]*?<\/si>/g)) {
    const sharedStringXml = match[0];
    const textParts = Array.from(
      sharedStringXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g),
    ).map((textMatch) => decodeXml(textMatch[1]));
    strings.push(textParts.join(""));
  }

  return strings;
}

function parseTextTag(xml: string, tagName: string): string | null {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`));
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
  sharedStrings: string[],
): string {
  if (cellType === "inlineStr") {
    const inlineText = Array.from(
      cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g),
    )
      .map((match) => decodeXml(match[1]))
      .join("");
    return inlineText.trim();
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
  sharedStrings: string[],
  styles: WorkbookStyleMetadata,
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
      const styleIndex =
        cellAttributes.s && Number.isInteger(Number(cellAttributes.s))
          ? Number(cellAttributes.s)
          : null;
      const value = readCellValue(
        cellMatch[2],
        cellAttributes.t ?? null,
        sharedStrings,
      );

      if (!value && !formula) continue;

      const displayValue = value || (formula ? `=${formula}` : "");
      cells.push({
        ref,
        column,
        row,
        value: displayValue,
        formula,
        type: cellAttributes.t ?? null,
        styleIndex,
        isStruckThrough:
          styleIndex !== null && styles.struckStyleIndexes.has(styleIndex),
      });
      valuesByColumn[column] = displayValue;
    }

    const rowValues = cells.map((cell) => cell.value).filter(Boolean);
    if (rowValues.length === 0) continue;

    rows.push({
      rowNumber: Number.isFinite(rowNumber) ? rowNumber : cells[0]?.row ?? 0,
      cells,
      values: rowValues,
      valuesByColumn,
    });
  }

  return rows;
}

function normalizeHeaderName(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s#$%/-]/g, "")
    .trim();

  return normalized || fallback;
}

function scoreHeaderRow(row: WorksheetRow): number {
  const normalizedValues = row.values.map((value) => value.toLowerCase());
  const hintMatches = normalizedValues.filter((value) =>
    [
      "player",
      "name",
      "pos",
      "position",
      "team",
      "nfl",
      "owner",
      "manager",
      "price",
      "value",
      "auction",
      "cost",
      "rank",
      "bye",
      "keeper",
    ].some((hint) => value.includes(hint)),
  ).length;
  const textCells = row.values.filter((value) => /[a-z]/i.test(value)).length;
  const numericCells = row.values.filter((value) => /^-?\d+(\.\d+)?$/.test(value)).length;

  return row.values.length + hintMatches * 4 + textCells - numericCells;
}

function findHeaderRow(rows: WorksheetRow[]): WorksheetRow | null {
  const candidates = rows
    .filter((row) => row.rowNumber <= HEADER_SCAN_LIMIT && row.values.length >= 3)
    .map((row) => ({ row, score: scoreHeaderRow(row) }))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.row ?? null;
}

function buildSampleRows(
  rows: WorksheetRow[],
  headerRow: WorksheetRow | null,
): NormalizedSampleRow[] {
  if (!headerRow) return [];

  const headerCells = headerRow.cells.filter((cell) => cell.value.trim());
  const dataRows = rows
    .filter((row) => row.rowNumber > headerRow.rowNumber)
    .filter((row) => row.values.length >= 2)
    .slice(0, SAMPLE_ROW_LIMIT);

  return dataRows.map((row) => {
    const values: Record<string, string> = {};

    for (const headerCell of headerCells) {
      const header = normalizeHeaderName(headerCell.value, headerCell.column);
      const value = row.valuesByColumn[headerCell.column];
      if (value) values[header] = value;
    }

    return {
      rowNumber: row.rowNumber,
      values,
    };
  });
}

function buildRawSampleRows(rows: WorksheetRow[]): RawSampleRow[] {
  return rows.slice(0, SAMPLE_ROW_LIMIT).map((row) => ({
    rowNumber: row.rowNumber,
    values: row.values,
  }));
}

function parseFormulas(rows: WorksheetRow[]): FormulaExample[] {
  return rows
    .flatMap((row) =>
      row.cells
        .filter((cell) => cell.formula)
        .map((cell) => ({
          cell: cell.ref,
          formula: cell.formula ?? "",
          cachedValue: cell.value.startsWith("=") ? "" : cell.value,
        })),
    )
    .slice(0, 10);
}

function parseStrikeExamples(rows: WorksheetRow[]): StrikeExample[] {
  return rows
    .flatMap((row) =>
      row.cells
        .filter((cell) => cell.isStruckThrough)
        .map((cell) => ({
          cell: cell.ref,
          value: cell.value,
        })),
    )
    .slice(0, 20);
}

function countStrikeCells(rows: WorksheetRow[]): number {
  return rows.reduce(
    (count, row) => count + row.cells.filter((cell) => cell.isStruckThrough).length,
    0,
  );
}

function parseStatusKeywordExamples(rows: WorksheetRow[]): StatusKeywordExample[] {
  const statusPattern =
    /\b(keeper|keepers|kept|taken|drafted|target|fade|ignore|ignored|want|wants|bid|price|amount|owner|manager)\b/i;

  return rows
    .flatMap((row) =>
      row.cells
        .filter((cell) => statusPattern.test(cell.value))
        .map((cell) => ({
          cell: cell.ref,
          value: cell.value,
        })),
    )
    .slice(0, 20);
}

function countFormulas(rows: WorksheetRow[]): number {
  return rows.reduce(
    (count, row) => count + row.cells.filter((cell) => cell.formula).length,
    0,
  );
}

function parseMergedCells(xml: string): string[] {
  return Array.from(xml.matchAll(/<mergeCell\b[^>]*ref="([^"]+)"[^>]*\/>/g)).map(
    (match) => decodeXml(match[1]),
  );
}

function parseDimension(xml: string): string | null {
  const match = xml.match(/<dimension\b[^>]*ref="([^"]+)"[^>]*\/>/);
  return match ? decodeXml(match[1]) : null;
}

function countConditionalFormattingBlocks(xml: string): number {
  return Array.from(xml.matchAll(/<conditionalFormatting\b/g)).length;
}

function summarizeWorksheet(
  workbookPath: string,
  sheet: WorkbookSheet,
  sharedStrings: string[],
  styles: WorkbookStyleMetadata,
): WorksheetSummary {
  const xml = readZipText(workbookPath, sheet.path);
  const rows = parseWorksheetRows(xml, sharedStrings, styles);
  const headerRow = findHeaderRow(rows);
  const mergedCells = parseMergedCells(xml);

  return {
    name: sheet.name,
    path: sheet.path,
    state: sheet.state,
    dimension: parseDimension(xml),
    nonEmptyRowCount: rows.length,
    headerRowNumber: headerRow?.rowNumber ?? null,
    headers: headerRow?.cells.map((cell) => cell.value) ?? [],
    rawSampleRows: buildRawSampleRows(rows),
    sampleRows: buildSampleRows(rows, headerRow),
    formulaCount: countFormulas(rows),
    formulaExamples: parseFormulas(rows),
    mergedCellCount: mergedCells.length,
    mergedCells: mergedCells.slice(0, 20),
    conditionalFormattingCount: countConditionalFormattingBlocks(xml),
    strikeCellCount: countStrikeCells(rows),
    strikeExamples: parseStrikeExamples(rows),
    statusKeywordExamples: parseStatusKeywordExamples(rows),
  };
}

function guessLikelyDataSheet(summaries: WorksheetSummary[]): string | null {
  const scored = summaries
    .map((summary) => {
      const headerText = summary.headers.join(" ").toLowerCase();
      const basicHeaderScore = [
        "player",
        "name",
        "position",
        "team",
        "auction",
        "value",
        "price",
        "cost",
      ].filter((hint) => headerText.includes(hint)).length;
      const consolidatedSheetScore = [
        "avg going rate",
        "variation",
        "espn",
        "scout",
        "fantasypro",
        "rotowire",
      ].filter((hint) => headerText.includes(hint)).length;
      const sheetNameScore = summary.name.toLowerCase().includes("master")
        ? 200
        : 0;

      return {
        summary,
        score:
          summary.nonEmptyRowCount +
          basicHeaderScore * 50 +
          consolidatedSheetScore * 75 +
          sheetNameScore,
      };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0]?.summary.name ?? null;
}

function inspectWorkbook(workbookPath: string): WorkbookSummary {
  const workbookXml = readZipText(workbookPath, "xl/workbook.xml");
  const workbookRelationshipsXml = readZipText(
    workbookPath,
    "xl/_rels/workbook.xml.rels",
  );
  const sharedStringsXml =
    readZipTextOrNull(workbookPath, "xl/sharedStrings.xml") ?? "";
  const stylesXml = readZipTextOrNull(workbookPath, "xl/styles.xml");
  const relationships = parseRelationships(workbookRelationshipsXml);
  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const styles = parseWorkbookStyles(stylesXml);
  const sheets = parseWorkbookSheets(workbookXml, relationships);
  const worksheetSummaries = sheets.map((sheet) =>
    summarizeWorksheet(workbookPath, sheet, sharedStrings, styles),
  );

  return {
    workbook: workbookPath,
    inspectedAt: new Date().toISOString(),
    sheetNames: sheets.map((sheet) => sheet.name),
    hiddenSheets: sheets
      .filter((sheet) => sheet.state !== "visible")
      .map((sheet) => sheet.name),
    likelyDataSheet: guessLikelyDataSheet(worksheetSummaries),
    styleSummary: {
      struckFontCount: styles.struckFontCount,
      struckCellStyleCount: styles.struckStyleIndexes.size,
      cellStyleCount: styles.cellStyleCount,
    },
    worksheets: worksheetSummaries,
  };
}

function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/[\s_.-]+/g, "");
}

function isDesignRelevantSheet(summary: WorksheetSummary): boolean {
  const normalizedName = normalizeSheetName(summary.name);
  return (
    normalizedName.includes("masterview") ||
    normalizedName.includes("teambyelist") ||
    normalizedName.includes("playerswewant") ||
    normalizedName.includes("nameslist") ||
    normalizedName.includes("playername") ||
    normalizedName.includes("keepers")
  );
}

function compactWorksheetSummary(summary: WorksheetSummary) {
  return {
    name: summary.name,
    state: summary.state,
    nonEmptyRowCount: summary.nonEmptyRowCount,
    headerRowNumber: summary.headerRowNumber,
    headers: summary.headers,
    rawSampleRows: summary.rawSampleRows.slice(0, 3),
    sampleRows: summary.sampleRows.slice(0, 3),
    formulaCount: summary.formulaCount,
    formulaExamples: summary.formulaExamples.slice(0, 3),
    mergedCellCount: summary.mergedCellCount,
    mergedCells: summary.mergedCells.slice(0, 8),
    conditionalFormattingCount: summary.conditionalFormattingCount,
    strikeCellCount: summary.strikeCellCount,
    strikeExamples: summary.strikeExamples.slice(0, 8),
    statusKeywordExamples: summary.statusKeywordExamples.slice(0, 8),
  };
}

function compactWorkbookSummary(summary: WorkbookSummary) {
  const masterview = summary.worksheets.find(
    (worksheet) => normalizeSheetName(worksheet.name) === "masterview",
  );

  return {
    workbook: summary.workbook,
    sheetNames: summary.sheetNames,
    hiddenSheets: summary.hiddenSheets,
    styleSummary: summary.styleSummary,
    masterviewExists: Boolean(masterview),
    masterview: masterview ? compactWorksheetSummary(masterview) : null,
    relevantSheets: summary.worksheets
      .filter(isDesignRelevantSheet)
      .map(compactWorksheetSummary),
    worksheetOverview: summary.worksheets.map((worksheet) => ({
      name: worksheet.name,
      state: worksheet.state,
      nonEmptyRowCount: worksheet.nonEmptyRowCount,
      formulaCount: worksheet.formulaCount,
      mergedCellCount: worksheet.mergedCellCount,
      conditionalFormattingCount: worksheet.conditionalFormattingCount,
      strikeCellCount: worksheet.strikeCellCount,
    })),
  };
}

const workbookSummaries = targetWorkbookPaths.map((targetWorkbookPath) =>
  inspectWorkbook(targetWorkbookPath),
);

console.log(
  JSON.stringify(
    {
      inspectedAt: new Date().toISOString(),
      workbooks: compactOutput
        ? workbookSummaries.map(compactWorkbookSummary)
        : workbookSummaries,
    },
    null,
    2,
  ),
);
