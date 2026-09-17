import { runWeeklySettlementAutomation } from "../lib/weeklySettlementAutomation";

function readFlag(args: readonly string[], flag: string) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const args = process.argv.slice(2);
const season = Number(readFlag(args, "--season") ?? "2026");
const at = readFlag(args, "--at");
const dryRun = !args.includes("--write");

if (!Number.isInteger(season)) throw new Error("Usage: npm run weekly:settle:automation -- --season 2026 [--dry-run|--write] [--at ISO_TIMESTAMP]");

runWeeklySettlementAutomation({ season, dryRun, ...(at ? { now: new Date(at) } : {}) })
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .catch((error) => { console.error(error instanceof Error ? error.message : "Automation refused."); process.exitCode = 1; });
