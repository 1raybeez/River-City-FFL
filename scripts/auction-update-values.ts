import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const EXPORTS_DIR = "data/auction/source-imports/exports";
const GENERATED_MASTERVIEW_2026_PATH =
  "data/auction/generated/masterview-2026.json";
const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");

type SourceExportFile = {
  source: string;
  season: number;
  filename: string;
  filePath: string;
};

type ImportSummary = {
  source: string;
  season: number;
  inputFile: string;
  detectedBlocks?: string[];
  rowsRead: number;
  rowsNormalized: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  ignored: number;
  duplicatesSkipped?: number;
  warnings: number;
  errors: number;
  outputFiles: {
    valuesFile: string;
    reviewFile: string;
  };
};

type MasterviewGenerationSummary = {
  sourceFilesRead?: string[];
  filesWritten?: string[];
  totals?: {
    seasons: number;
    rows: number;
    sourceValues: number;
    skippedSourceValues: number;
    warnings: number;
  };
};

type Masterview2026File = {
  rowCount?: number;
  sourceValueCount?: number;
  skippedSourceValueCount?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isImportSummary(value: unknown): value is ImportSummary {
  return (
    isRecord(value) &&
    typeof value.source === "string" &&
    typeof value.season === "number" &&
    typeof value.rowsNormalized === "number" &&
    typeof value.matched === "number" &&
    typeof value.unmatched === "number" &&
    typeof value.warnings === "number" &&
    typeof value.errors === "number"
  );
}

function isMasterviewGenerationSummary(
  value: unknown
): value is MasterviewGenerationSummary {
  return isRecord(value);
}

function parseJsonOutput<T>(
  stdout: string,
  isExpectedShape: (value: unknown) => value is T,
  label: string
): T {
  const trimmedOutput = stdout.trim();
  const jsonStart = trimmedOutput.indexOf("{");

  if (jsonStart === -1) {
    throw new Error(`${label} did not print JSON output.`);
  }

  const parsed: unknown = JSON.parse(trimmedOutput.slice(jsonStart));

  if (!isExpectedShape(parsed)) {
    throw new Error(`${label} printed an unexpected JSON shape.`);
  }

  return parsed;
}

function getTsxCommand() {
  return existsSync(TSX_BIN) ? TSX_BIN : "tsx";
}

function runTsxScript(scriptPath: string, args: readonly string[]) {
  const result = spawnSync(getTsxCommand(), [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `${scriptPath} failed with exit code ${result.status ?? "unknown"}.`,
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result.stdout;
}

function parseSourceExportFilename(filename: string): SourceExportFile | null {
  const match = filename.match(/^([a-z0-9-]+)-(\d{4})\.csv$/i);

  if (!match) return null;

  return {
    source: match[1].toLowerCase(),
    season: Number(match[2]),
    filename,
    filePath: path.join(EXPORTS_DIR, filename),
  };
}

async function findSourceExportFiles() {
  if (!existsSync(EXPORTS_DIR)) return [];

  const filenames = await readdir(EXPORTS_DIR);

  return filenames
    .map(parseSourceExportFilename)
    .filter((file): file is SourceExportFile => file !== null)
    .sort((firstFile, secondFile) => {
      if (firstFile.season !== secondFile.season) {
        return firstFile.season - secondFile.season;
      }

      return firstFile.source.localeCompare(secondFile.source);
    });
}

async function readMasterview2026Summary(): Promise<Masterview2026File | null> {
  if (!existsSync(GENERATED_MASTERVIEW_2026_PATH)) return null;

  const parsed: unknown = JSON.parse(
    await readFile(GENERATED_MASTERVIEW_2026_PATH, "utf8")
  );

  return isRecord(parsed) ? parsed : null;
}

function summarizeImports(imports: readonly ImportSummary[]) {
  return imports.reduce(
    (summary, importSummary) => ({
      rowsNormalized:
        summary.rowsNormalized + importSummary.rowsNormalized,
      matched: summary.matched + importSummary.matched,
      unmatched: summary.unmatched + importSummary.unmatched,
      warnings: summary.warnings + importSummary.warnings,
      errors: summary.errors + importSummary.errors,
    }),
    {
      rowsNormalized: 0,
      matched: 0,
      unmatched: 0,
      warnings: 0,
      errors: 0,
    }
  );
}

async function main() {
  const sourceFiles = await findSourceExportFiles();
  const importSummaries: ImportSummary[] = [];

  for (const sourceFile of sourceFiles) {
    const output = runTsxScript("scripts/auction-import-source-export.ts", [
      "--source",
      sourceFile.source,
      "--season",
      String(sourceFile.season),
    ]);

    importSummaries.push(
      parseJsonOutput(output, isImportSummary, sourceFile.filename)
    );
  }

  const generationOutput = runTsxScript(
    "scripts/auction-generate-masterview-from-sources.ts",
    []
  );
  const generationSummary = parseJsonOutput(
    generationOutput,
    isMasterviewGenerationSummary,
    "auction-generate-masterview-from-sources"
  );
  const masterview2026 = await readMasterview2026Summary();
  const importTotals = summarizeImports(importSummaries);

  console.log(
    JSON.stringify(
      {
        sourceDirectory: EXPORTS_DIR,
        sourcesFound: sourceFiles.map((file) => ({
          source: file.source,
          season: file.season,
          file: file.filePath,
        })),
        sourcesImported: importSummaries.map((summary) => ({
          source: summary.source,
          season: summary.season,
          rowsNormalized: summary.rowsNormalized,
          matched: summary.matched,
          unmatched: summary.unmatched,
          warnings: summary.warnings,
          errors: summary.errors,
          valuesFile: summary.outputFiles.valuesFile,
          reviewFile: summary.outputFiles.reviewFile,
        })),
        importTotals,
        generatedMasterview2026: {
          file: GENERATED_MASTERVIEW_2026_PATH,
          rowCount: masterview2026?.rowCount ?? null,
          sourceValueCount: masterview2026?.sourceValueCount ?? null,
          skippedSourceValueCount:
            masterview2026?.skippedSourceValueCount ?? null,
        },
        generatedManifest: "data/auction/generated/masterview-manifest.json",
        generationTotals: generationSummary.totals ?? null,
        warnings: importTotals.warnings + (generationSummary.totals?.warnings ?? 0),
        errors: importTotals.errors,
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
