import { readFile } from "node:fs/promises";

const REPORT_PATH = "data/auction/adp/reports/adp-quality-2026.json";

async function main() {
  const report = JSON.parse(await readFile(REPORT_PATH, "utf8")) as {
    season: number;
    sources: Array<{
      sourceKey: string;
      rows: number;
      matched: number;
      unmatched: number;
      warnings: number;
      errors: number;
    }>;
    consensus: {
      players: number;
      sourceValues: number;
      skippedSourceValues: number;
      demandTiers: Record<string, number>;
    };
  };

  console.log(
    JSON.stringify(
      {
        reportPath: REPORT_PATH,
        season: report.season,
        sources: report.sources,
        consensusPlayers: report.consensus.players,
        sourceValues: report.consensus.sourceValues,
        skippedSourceValues: report.consensus.skippedSourceValues,
        demandTiers: report.consensus.demandTiers,
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
