import {
  buildWeeklyHighScoreSettlementCandidate,
  type WeeklyHighScoreSettlement,
  writeWeeklyHighScoreSettlement,
} from "../lib/weeklyHighScoreSettlement";

export function parseWeeklySettlementArgs(args: readonly string[]) {
  const read = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const season = Number(read("--season"));
  const week = Number(read("--week"));
  if (!Number.isInteger(season) || !Number.isInteger(week)) throw new Error("Usage: npm run weekly:settle -- --season 2026 --week 1 [--dry-run]");
  return { season, week, dryRun: args.includes("--dry-run") };
}

export async function executeWeeklySettlement(options: {
  season: number;
  week: number;
  dryRun: boolean;
  buildCandidate?: typeof buildWeeklyHighScoreSettlementCandidate;
  writeSettlement?: (settlement: WeeklyHighScoreSettlement) => Promise<{ created: boolean; settlement: WeeklyHighScoreSettlement }>;
}) {
  const candidate = await (options.buildCandidate ?? buildWeeklyHighScoreSettlementCandidate)({ season: options.season, week: options.week });
  if (options.dryRun) return { ...candidate, writePerformed: false, duplicate: false };
  if (!candidate.eligible || !candidate.settlement) throw new Error(candidate.reason ?? "Settlement refused by safety checks.");
  const result = await (options.writeSettlement ?? writeWeeklyHighScoreSettlement)(candidate.settlement);
  return { ...candidate, writePerformed: result.created, duplicate: !result.created, settlement: result.settlement };
}

if (process.argv[1]?.endsWith("weekly-settle.ts")) {
  executeWeeklySettlement({ ...parseWeeklySettlementArgs(process.argv.slice(2)) })
    .then((candidate) => console.log(JSON.stringify(candidate, null, 2)))
    .catch((error) => { console.error(error instanceof Error ? error.message : "Settlement refused."); process.exitCode = 1; });
}
