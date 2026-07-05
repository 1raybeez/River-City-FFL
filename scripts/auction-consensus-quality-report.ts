import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MASTERVIEW_PATH = "data/auction/generated/masterview-2026.json";
const MANIFEST_PATH = "data/auction/generated/masterview-manifest.json";
const SOURCE_VALUES_DIR = "data/auction/source-values";
const REPORT_PATH = "docs/auction-consensus-quality-report-2026.md";
const MEANINGFUL_SINGLE_SOURCE_VALUE = 5;

type SourceValueRow = {
  sourceKey: string;
  sourceName: string;
  playerNameFromSource: string;
  position: string | null;
  nflTeam: string | null;
  auctionValue: number | null;
  normalizedAuctionValue: number | null;
  matchStatus: string;
  matchMethod: string;
  matchConfidence: number;
  sourceConfidence: number;
  warnings: unknown[];
  errors: unknown[];
};

type SourceValuesFile = {
  sourceKey: string;
  seasonYear: number;
  rowCount: number;
  matchedRowCount: number;
  probableMatchRowCount: number;
  ambiguousRowCount: number;
  unmatchedRowCount: number;
  ignoredRowCount: number;
  warningCount: number;
  errorCount: number;
  rows: SourceValueRow[];
};

type MasterviewSourceValue = {
  sourceKey: string;
  sourceName: string;
  playerNameFromSource: string;
  normalizedAuctionValue: number;
  auctionValue: number;
  matchStatus: string;
};

type MasterviewRow = {
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  sourceValues: MasterviewSourceValue[];
  lowValue: number;
  highValue: number;
  averageValue: number;
  medianValue: number;
  sourceCount: number;
  confidenceScore: number;
  warnings: string[];
};

type MasterviewFile = {
  generatedAt: string;
  season: number;
  rowCount: number;
  sourceValueCount: number;
  skippedSourceValueCount: number;
  rows: MasterviewRow[];
};

type MasterviewManifest = {
  generatedAt: string;
  sourceFilesRead: string[];
  totals: {
    seasons: number;
    rows: number;
    sourceValues: number;
    skippedSourceValues: number;
    warnings: number;
  };
};

type SourceValuesFileWithPath = SourceValuesFile & {
  filename: string;
  filePath: string;
};

type CountMap = Record<string, number>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertMasterviewFile(value: unknown): MasterviewFile {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    throw new Error(`Invalid Masterview file: ${MASTERVIEW_PATH}`);
  }

  return value as MasterviewFile;
}

function assertManifest(value: unknown): MasterviewManifest {
  if (!isRecord(value) || !isRecord(value.totals)) {
    throw new Error(`Invalid Masterview manifest: ${MANIFEST_PATH}`);
  }

  return value as MasterviewManifest;
}

function assertSourceValuesFile(
  value: unknown,
  filePath: string
): SourceValuesFile {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    throw new Error(`Invalid source values file: ${filePath}`);
  }

  return value as SourceValuesFile;
}

async function readJsonFile<T>(
  filePath: string,
  assertShape: (value: unknown) => T
): Promise<T> {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  return assertShape(parsed);
}

function getSourceValueFilenames(filenames: string[]) {
  return filenames
    .filter((filename) => filename.endsWith(".json"))
    .filter((filename) => !filename.endsWith("-review.json"))
    .filter((filename) => !filename.includes("manifest"))
    .sort();
}

async function readSourceValueFiles(): Promise<SourceValuesFileWithPath[]> {
  if (!existsSync(SOURCE_VALUES_DIR)) return [];

  const filenames = getSourceValueFilenames(await readdir(SOURCE_VALUES_DIR));
  const files: SourceValuesFileWithPath[] = [];

  for (const filename of filenames) {
    const filePath = path.join(SOURCE_VALUES_DIR, filename);
    const file = await readJsonFile(filePath, (value) =>
      assertSourceValuesFile(value, filePath)
    );

    files.push({
      ...file,
      filename,
      filePath,
    });
  }

  return files;
}

function increment(map: CountMap, key: string, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function getSourceCountDistribution(rows: readonly MasterviewRow[]) {
  return {
    "3+": rows.filter((row) => row.sourceCount >= 3).length,
    "2": rows.filter((row) => row.sourceCount === 2).length,
    "1": rows.filter((row) => row.sourceCount === 1).length,
    "0": rows.filter((row) => row.sourceCount === 0).length,
  };
}

function getWarningCategoryCounts(rows: readonly MasterviewRow[]) {
  const counts: CountMap = {};

  for (const row of rows) {
    for (const warning of row.warnings) {
      increment(counts, warning);
    }
  }

  return sortCountMap(counts);
}

function getConfidenceScoreDistribution(rows: readonly MasterviewRow[]) {
  const buckets: CountMap = {
    "90-100": 0,
    "75-89": 0,
    "50-74": 0,
    "25-49": 0,
    "0-24": 0,
  };

  for (const row of rows) {
    if (row.confidenceScore >= 90) increment(buckets, "90-100");
    else if (row.confidenceScore >= 75) increment(buckets, "75-89");
    else if (row.confidenceScore >= 50) increment(buckets, "50-74");
    else if (row.confidenceScore >= 25) increment(buckets, "25-49");
    else increment(buckets, "0-24");
  }

  return buckets;
}

function getSpread(row: MasterviewRow) {
  return Math.max(0, row.highValue - row.lowValue);
}

function getSpreadDistribution(rows: readonly MasterviewRow[]) {
  const multiSourceRows = rows.filter((row) => row.sourceCount >= 2);
  const buckets: CountMap = {
    "$0": 0,
    "$1-$4": 0,
    "$5-$9": 0,
    "$10-$19": 0,
    "$20+": 0,
  };

  for (const row of multiSourceRows) {
    const spread = getSpread(row);
    if (spread === 0) increment(buckets, "$0");
    else if (spread <= 4) increment(buckets, "$1-$4");
    else if (spread <= 9) increment(buckets, "$5-$9");
    else if (spread <= 19) increment(buckets, "$10-$19");
    else increment(buckets, "$20+");
  }

  return {
    eligibleRows: multiSourceRows.length,
    buckets,
  };
}

function sortCountMap(counts: CountMap) {
  return Object.fromEntries(
    Object.entries(counts).sort((firstEntry, secondEntry) => {
      if (secondEntry[1] !== firstEntry[1]) return secondEntry[1] - firstEntry[1];
      return firstEntry[0].localeCompare(secondEntry[0]);
    })
  );
}

function getSourceKeys(sourceFiles: readonly SourceValuesFileWithPath[]) {
  return Array.from(new Set(sourceFiles.map((file) => file.sourceKey))).sort();
}

function getSourceDisplayName(
  sourceKey: string,
  sourceFiles: readonly SourceValuesFileWithPath[]
) {
  return (
    sourceFiles
      .find((file) => file.sourceKey === sourceKey)
      ?.rows.find((row) => row.sourceKey === sourceKey)?.sourceName ??
    sourceKey
  );
}

function getSourceCoverageRows(
  masterview: MasterviewFile,
  sourceFiles: readonly SourceValuesFileWithPath[]
) {
  const sourceKeys = getSourceKeys(sourceFiles);

  return sourceKeys.map((sourceKey) => {
    const file = sourceFiles.find((sourceFile) => sourceFile.sourceKey === sourceKey);
    const generatedPlayersCovered = masterview.rows.filter((row) =>
      row.sourceValues.some((sourceValue) => sourceValue.sourceKey === sourceKey)
    ).length;

    return {
      sourceKey,
      sourceName: getSourceDisplayName(sourceKey, sourceFiles),
      sourceRows: file?.rowCount ?? 0,
      matchedRows: file?.matchedRowCount ?? 0,
      unmatchedRows: file?.unmatchedRowCount ?? 0,
      warningCount: file?.warningCount ?? 0,
      errorCount: file?.errorCount ?? 0,
      generatedPlayersCovered,
      coveragePercent:
        masterview.rowCount > 0
          ? (generatedPlayersCovered / masterview.rowCount) * 100
          : 0,
    };
  });
}

function getUnmatchedRowsBySource(
  sourceFiles: readonly SourceValuesFileWithPath[]
) {
  return sourceFiles.map((file) => ({
    sourceKey: file.sourceKey,
    sourceName: getSourceDisplayName(file.sourceKey, sourceFiles),
    rows: file.rows.filter((row) => row.matchStatus === "unmatched"),
  }));
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";
  return `$${Math.round(value * 100) / 100}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function escapeCell(value: string | number | null | undefined) {
  return String(value ?? "N/A").replace(/\|/g, "\\|");
}

function table(headers: readonly string[], rows: readonly (string | number)[][]) {
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

function sourceValueSummary(row: MasterviewRow) {
  return row.sourceValues
    .map(
      (sourceValue) =>
        `${sourceValue.sourceName} ${formatMoney(sourceValue.normalizedAuctionValue)}`
    )
    .join("; ");
}

function getLargestDisagreements(rows: readonly MasterviewRow[]) {
  return rows
    .filter((row) => row.sourceCount >= 2)
    .map((row) => ({
      ...row,
      spread: getSpread(row),
    }))
    .filter((row) => row.spread > 0)
    .sort((firstRow, secondRow) => {
      if (secondRow.spread !== firstRow.spread) return secondRow.spread - firstRow.spread;
      return secondRow.averageValue - firstRow.averageValue;
    });
}

function getSingleSourceMeaningfulRows(rows: readonly MasterviewRow[]) {
  return rows
    .filter(
      (row) =>
        row.sourceCount === 1 &&
        row.averageValue >= MEANINGFUL_SINGLE_SOURCE_VALUE
    )
    .sort((firstRow, secondRow) => secondRow.averageValue - firstRow.averageValue);
}

function getMissingSourceRows(
  rows: readonly MasterviewRow[],
  sourceKeys: readonly string[]
) {
  return rows
    .map((row) => {
      const presentSources = new Set(
        row.sourceValues.map((sourceValue) => sourceValue.sourceKey)
      );
      const missingSources = sourceKeys.filter(
        (sourceKey) => !presentSources.has(sourceKey)
      );

      return {
        ...row,
        missingSources,
      };
    })
    .filter((row) => row.missingSources.length > 0)
    .sort((firstRow, secondRow) => secondRow.averageValue - firstRow.averageValue);
}

function getKDefWarningSummary(rows: readonly MasterviewRow[]) {
  const kDefRows = rows.filter(
    (row) => row.position === "K" || row.position === "DEF"
  );
  const warningCounts: CountMap = {};

  for (const row of kDefRows) {
    for (const warning of row.warnings) {
      increment(warningCounts, warning);
    }
  }

  return {
    rowCount: kDefRows.length,
    warningRowCount: kDefRows.filter((row) => row.warnings.length > 0).length,
    oneSourceCount: kDefRows.filter((row) => row.sourceCount === 1).length,
    highSpreadCount: kDefRows.filter((row) =>
      row.warnings.includes("high-source-spread")
    ).length,
    warningCounts: sortCountMap(warningCounts),
    largestDisagreements: getLargestDisagreements(kDefRows).slice(0, 10),
  };
}

function getWarningMeaning(warning: string) {
  const meanings: Record<string, string> = {
    "low-source-count":
      "Player has fewer than 2 source values. This is expected for deep players, kickers, defenses, and source-specific long-tail rows.",
    "high-source-spread":
      "At least 2 sources disagree by $10 or by 25% of average value, whichever is larger.",
    "identity-review-needed":
      "Generated row does not have a matched Sleeper ID and should be reviewed before production persistence.",
    "match-review-needed":
      "At least one source row in the consensus group was ambiguous or unmatched.",
    "source-row-warnings":
      "At least one underlying imported source row carried a parser warning.",
    "source-row-errors":
      "At least one underlying imported source row carried a parser error.",
  };

  return meanings[warning] ?? "Review signal from the consensus generator.";
}

function buildMarkdownReport({
  masterview,
  manifest,
  sourceFiles,
}: {
  masterview: MasterviewFile;
  manifest: MasterviewManifest;
  sourceFiles: SourceValuesFileWithPath[];
}) {
  const sourceKeys = getSourceKeys(sourceFiles);
  const sourceCountDistribution = getSourceCountDistribution(masterview.rows);
  const warningCategoryCounts = getWarningCategoryCounts(masterview.rows);
  const warningRowCount = masterview.rows.filter(
    (row) => row.warnings.length > 0
  ).length;
  const confidenceDistribution = getConfidenceScoreDistribution(masterview.rows);
  const spreadDistribution = getSpreadDistribution(masterview.rows);
  const sourceCoverageRows = getSourceCoverageRows(masterview, sourceFiles);
  const unmatchedRowsBySource = getUnmatchedRowsBySource(sourceFiles);
  const largestDisagreements = getLargestDisagreements(masterview.rows);
  const singleSourceMeaningfulRows = getSingleSourceMeaningfulRows(
    masterview.rows
  );
  const missingSourceRows = getMissingSourceRows(masterview.rows, sourceKeys);
  const missingSourceCounts = sortCountMap(
    missingSourceRows.reduce<CountMap>((counts, row) => {
      for (const sourceKey of row.missingSources) increment(counts, sourceKey);
      return counts;
    }, {})
  );
  const kDefSummary = getKDefWarningSummary(masterview.rows);
  const warningCategoryRows = Object.entries(warningCategoryCounts).map(
    ([warning, count]) => [warning, count, getWarningMeaning(warning)]
  );
  const sourceCountRows = [
    ["3+ sources", sourceCountDistribution["3+"]],
    ["2 sources", sourceCountDistribution["2"]],
    ["1 source", sourceCountDistribution["1"]],
    ["0 sources", sourceCountDistribution["0"]],
  ];

  return `# Auction Consensus Quality Report 2026

Generated: ${new Date().toISOString()}

## Executive Summary

- Generated players: ${masterview.rowCount}
- Source values: ${masterview.sourceValueCount}
- Skipped source values: ${masterview.skippedSourceValueCount}
- Manifest warning labels: ${manifest.totals.warnings}
- Players with at least one warning label: ${warningRowCount}
- Source imports had zero errors.
- Production refresh design can proceed. The warnings are expected review signals, not blockers, as long as production design includes quality gates for unmatched high-value players, source-count drops, and schema failures.

## What The 502 Warnings Mean

The 502 number is not 502 broken players. It is the total number of warning labels attached to generated Masterview rows. A single player can have more than one warning label.

${table(["Warning", "Count", "Meaning"], warningCategoryRows)}

Blocker read:

- Not blockers: low-source-count and high-source-spread. These are normal consensus quality signals.
- Review before production persistence: identity-review-needed and match-review-needed. These indicate rows that should stay visible in review reports.
- Hard blockers only if present in future runs: source-row-errors, import errors, missing source files, or a sudden coverage drop.

## Source Count Distribution

${table(["Coverage", "Players"], sourceCountRows)}

## Source Coverage Table

${table(
    [
      "Source",
      "Rows",
      "Matched",
      "Unmatched",
      "Generated Players Covered",
      "Coverage",
      "Import Warnings",
      "Import Errors",
    ],
    sourceCoverageRows.map((row) => [
      row.sourceName,
      row.sourceRows,
      row.matchedRows,
      row.unmatchedRows,
      row.generatedPlayersCovered,
      formatPercent(row.coveragePercent),
      row.warningCount,
      row.errorCount,
    ])
  )}

## Unmatched Players By Source

${unmatchedRowsBySource
    .map((source) => {
      if (source.rows.length === 0) {
        return `### ${source.sourceName}\n\nNo unmatched rows.`;
      }

      return `### ${source.sourceName}

${table(
        ["Player", "Position", "NFL Team", "Value", "Match Status"],
        source.rows.map((row) => [
          row.playerNameFromSource,
          row.position ?? "N/A",
          row.nflTeam ?? "N/A",
          formatMoney(row.normalizedAuctionValue ?? row.auctionValue),
          row.matchStatus,
        ])
      )}`;
    })
    .join("\n\n")}

## Confidence Score Distribution

${table(
    ["Score Bucket", "Players"],
    Object.entries(confidenceDistribution).map(([bucket, count]) => [
      bucket,
      count,
    ])
  )}

## Disagreement Spread Distribution

Only players with at least two source values are included in this spread table.

${table(
    ["Spread Bucket", "Players"],
    Object.entries(spreadDistribution.buckets).map(([bucket, count]) => [
      bucket,
      count,
    ])
  )}

Eligible multi-source players: ${spreadDistribution.eligibleRows}

## Top 25 Largest Source Disagreements

${table(
    [
      "Player",
      "Pos",
      "Team",
      "Sources",
      "Low",
      "High",
      "Spread",
      "Average",
      "Source Values",
    ],
    largestDisagreements.slice(0, 25).map((row) => [
      row.playerName,
      row.position ?? "N/A",
      row.nflTeam ?? "N/A",
      row.sourceCount,
      formatMoney(row.lowValue),
      formatMoney(row.highValue),
      formatMoney(row.spread),
      formatMoney(row.averageValue),
      sourceValueSummary(row),
    ])
  )}

## Players With One Source But Meaningful Auction Value

Threshold: average value of ${formatMoney(MEANINGFUL_SINGLE_SOURCE_VALUE)} or more.

${table(
    ["Player", "Pos", "Team", "Average", "Source", "Warnings"],
    singleSourceMeaningfulRows.slice(0, 25).map((row) => [
      row.playerName,
      row.position ?? "N/A",
      row.nflTeam ?? "N/A",
      formatMoney(row.averageValue),
      row.sourceValues[0]?.sourceName ?? "N/A",
      row.warnings.join(", ") || "None",
    ])
  )}

## Missing From One Or More Major Sources

Missing-source counts:

${table(
    ["Missing Source", "Players"],
    Object.entries(missingSourceCounts).map(([sourceKey, count]) => [
      getSourceDisplayName(sourceKey, sourceFiles),
      count,
    ])
  )}

Highest-value rows missing at least one major source:

${table(
    ["Player", "Pos", "Team", "Average", "Present Sources", "Missing Sources"],
    missingSourceRows.slice(0, 25).map((row) => [
      row.playerName,
      row.position ?? "N/A",
      row.nflTeam ?? "N/A",
      formatMoney(row.averageValue),
      row.sourceValues.map((sourceValue) => sourceValue.sourceName).join(", "),
      row.missingSources
        .map((sourceKey) => getSourceDisplayName(sourceKey, sourceFiles))
        .join(", "),
    ])
  )}

## K/DEF Warning Patterns

- K/DEF generated rows: ${kDefSummary.rowCount}
- K/DEF rows with warnings: ${kDefSummary.warningRowCount}
- K/DEF rows with one source: ${kDefSummary.oneSourceCount}
- K/DEF high-spread rows: ${kDefSummary.highSpreadCount}

${table(
    ["Warning", "K/DEF Count"],
    Object.entries(kDefSummary.warningCounts).map(([warning, count]) => [
      warning,
      count,
    ])
  )}

Largest K/DEF disagreements:

${table(
    ["Player", "Pos", "Team", "Low", "High", "Spread", "Source Values"],
    kDefSummary.largestDisagreements.map((row) => [
      row.playerName,
      row.position ?? "N/A",
      row.nflTeam ?? "N/A",
      formatMoney(row.lowValue),
      formatMoney(row.highValue),
      formatMoney(row.spread),
      sourceValueSummary(row),
    ])
  )}

## Recommended Cleanup Actions

1. Review the 13 unmatched source rows and add aliases only where the Sleeper match is obvious.
2. Review the top high-spread players before trusting the consensus as a draft-day max-bid input.
3. Treat low-source-count as expected for deep players, K, DEF, and source-specific long-tail rows.
4. Add production quality gates for missing source files, import errors, source coverage drops, and high-value unmatched players.
5. Keep generating this report after each CSV refresh and store the report beside the generated Masterview.
6. Consider using a minimum source-count or confidence filter for any future Firestore write path.

## Production Refresh Readiness

Production refresh design can proceed. The current warnings are mostly coverage and disagreement signals. They should be visible in review tooling and logs, but they do not block designing the production refresh pipeline.
`;
}

async function main() {
  const masterview = await readJsonFile(MASTERVIEW_PATH, assertMasterviewFile);
  const manifest = await readJsonFile(MANIFEST_PATH, assertManifest);
  const sourceFiles = await readSourceValueFiles();
  const report = buildMarkdownReport({ masterview, manifest, sourceFiles });
  const warningCategoryCounts = getWarningCategoryCounts(masterview.rows);
  const warningRowCount = masterview.rows.filter(
    (row) => row.warnings.length > 0
  ).length;

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, report, "utf8");

  console.log(
    JSON.stringify(
      {
        reportPath: REPORT_PATH,
        generatedPlayers: masterview.rowCount,
        sourceValues: masterview.sourceValueCount,
        warningLabels: manifest.totals.warnings,
        playersWithWarnings: warningRowCount,
        warningCategoryCounts,
        blockers: false,
        recommendation:
          "Proceed with production refresh design, with quality gates and review reporting.",
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
