import assert from "node:assert/strict";
import { SETTLE_WEEKLY_HIGH_SCORE_SCHEDULE, SETTLE_WEEKLY_HIGH_SCORE_TIMEZONE, runScheduledWeeklySettlement } from "../functions/src/index";
import type { WeeklySettlementAutomationResult } from "../lib/weeklySettlementAutomation";

assert.equal(SETTLE_WEEKLY_HIGH_SCORE_SCHEDULE, "15 11-15 * * 2");
assert.equal(SETTLE_WEEKLY_HIGH_SCORE_TIMEZONE, "America/New_York");

const result: WeeklySettlementAutomationResult = {
  state: "ALREADY_SETTLED", season: 2026, targetWeek: 1, runAtEastern: "09/15/2026, 11:15:00 AM EDT", sleeperCurrentWeek: 2, lastScoredLeg: 1, eligibilityState: "ALREADY_SETTLED", winner: "shake-n-bakers", score: 134.26, settlementResult: "NO_OP", documentId: "2026:week-01", writePerformed: false,
};
const main = async () => {
let calls = 0;
const observed = await runScheduledWeeklySettlement(async (options) => { calls += 1; assert.deepEqual(options, { season: 2026, dryRun: false }); return result; });
assert.equal(observed.state, "ALREADY_SETTLED");
assert.equal(observed.targetWeek, 1);
assert.equal(calls, 1);
await assert.rejects(() => runScheduledWeeklySettlement(async () => ({ ...result, state: "CONFLICT" })), /CONFLICT/);
await assert.rejects(() => runScheduledWeeklySettlement(async () => ({ ...result, state: "ERROR" })), /ERROR/);
console.log("Scheduled weekly settlement function tests passed.");
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
