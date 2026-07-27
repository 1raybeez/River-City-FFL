import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateAuctionAdpConsensus, buildAuctionAdpQualityReport } from "../lib/auction/adpConsensus";
import { importAuctionAdpSourceText } from "../lib/auction/adpImport";
import { getAuctionAdpSourceRegistryEntries } from "../lib/auction/adpSourceRegistry";

const SEASON = 2026;
const INPUT_DIR = "data/auction/adp/source-imports/exports";
const SOURCE_VALUES_DIR = "data/auction/adp/source-values";
const GENERATED_DIR = "data/auction/adp/generated";
const REPORTS_DIR = "data/auction/adp/reports";

async function main() {
  await Promise.all([
    mkdir(SOURCE_VALUES_DIR, { recursive: true }),
    mkdir(GENERATED_DIR, { recursive: true }),
    mkdir(REPORTS_DIR, { recursive: true }),
  ]);

  const sourceFiles = [];
  const imports = [];

  for (const source of getAuctionAdpSourceRegistryEntries(SEASON)) {
    const inputFile = path.join(INPUT_DIR, source.expectedFileName);
    const text = await readFile(inputFile, "utf8");
    const outputFile = path.join(SOURCE_VALUES_DIR, `${source.sourceKey}-${SEASON}.json`);
    const result = await importAuctionAdpSourceText({
      sourceKey: source.sourceKey,
      season: SEASON,
      sourceFilename: source.expectedFileName,
      text,
      outputFile,
      writeFiles: true,
    });

    sourceFiles.push(result.valuesOutput);
    imports.push({
      sourceKey: source.sourceKey,
      sourceName: source.displayName,
      rowsNormalized: result.summary.rowsNormalized,
      matched: result.summary.matched,
      unmatched: result.summary.unmatched,
      warnings: result.summary.warnings,
      errors: result.summary.errors,
      outputFile,
    });
  }

  const consensus = generateAuctionAdpConsensus({ sourceFiles });
  const report = buildAuctionAdpQualityReport({ sourceFiles, consensus });
  const consensusPath = path.join(GENERATED_DIR, `adp-consensus-${SEASON}.json`);
  const reportPath = path.join(REPORTS_DIR, `adp-quality-${SEASON}.json`);

  await Promise.all([
    writeFile(consensusPath, `${JSON.stringify(consensus, null, 2)}\n`),
    writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`),
  ]);

  console.log(
    JSON.stringify(
      {
        season: SEASON,
        imports,
        consensus: {
          file: consensusPath,
          rowCount: consensus.rowCount,
          sourceValueCount: consensus.sourceValueCount,
          skippedSourceValueCount: consensus.skippedSourceValueCount,
        },
        report: reportPath,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
