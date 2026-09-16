import { buildWeeklyHighScoreSettlementCandidate } from "../lib/weeklyHighScoreSettlement";

function parse(args: readonly string[]) {
  const read = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const season = Number(read("--season"));
  const week = Number(read("--week"));
  if (!Number.isInteger(season) || !Number.isInteger(week) || !args.includes("--dry-run")) throw new Error("Usage: npm run weekly:settle -- --season 2026 --week 1 --dry-run");
  return { season, week };
}

buildWeeklyHighScoreSettlementCandidate(parse(process.argv.slice(2)))
  .then((candidate) => console.log(JSON.stringify({ ...candidate, writePerformed: false }, null, 2)))
  .catch((error) => { console.error(error instanceof Error ? error.message : "Settlement dry-run refused."); process.exitCode = 1; });
