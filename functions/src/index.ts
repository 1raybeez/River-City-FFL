import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { runWeeklySettlementAutomation, type WeeklySettlementAutomationResult } from "../../lib/weeklySettlementAutomation";
export { runWeeklyOperations } from "./weeklyOperations";

export const SETTLE_WEEKLY_HIGH_SCORE_SCHEDULE = "15 11-15 * * 2" as const;
export const SETTLE_WEEKLY_HIGH_SCORE_TIMEZONE = "America/New_York" as const;

export type SettlementAutomationRunner = (options: { season: number; dryRun: boolean }) => Promise<WeeklySettlementAutomationResult>;

export async function runScheduledWeeklySettlement(runner: SettlementAutomationRunner = async ({ season, dryRun }) => runWeeklySettlementAutomation({ season, dryRun })) {
  const result = await runner({ season: 2026, dryRun: false });
  const safeLog = {
    season: result.season,
    targetWeek: result.targetWeek,
    runAtEastern: result.runAtEastern,
    sleeperCurrentWeek: result.sleeperCurrentWeek,
    lastScoredLeg: result.lastScoredLeg,
    resultState: result.state,
    winner: result.winner,
    score: result.score,
    documentId: result.documentId,
    writePerformed: result.writePerformed,
  };
  logger.info("River City weekly settlement scheduler run", safeLog);
  if (result.state === "CONFLICT" || result.state === "ERROR") throw new Error(`Weekly settlement scheduler ${result.state}: ${result.eligibilityState}`);
  return result;
}

export const settleWeeklyHighScore = onSchedule({
  schedule: SETTLE_WEEKLY_HIGH_SCORE_SCHEDULE,
  timeZone: SETTLE_WEEKLY_HIGH_SCORE_TIMEZONE,
  region: "us-central1",
  retryCount: 0,
}, async () => { await runScheduledWeeklySettlement(); });
