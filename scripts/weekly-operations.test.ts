import assert from "node:assert/strict";
import { MATCHUP_POLL_INTERVAL_MS, shouldPollMatchups } from "../lib/matchupsPolling";
import { evaluateFreezeWindow, getApprovedFreezeWindow } from "../lib/seasonSimulator/freezeWindow";
import { SETTLEMENT_FUNCTION_NAME, SETTLEMENT_SCHEDULE, SETTLEMENT_TIMEZONE } from "../lib/weeklyOperations";

assert.equal(MATCHUP_POLL_INTERVAL_MS, 60_000);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "in_season" }), true);
assert.equal(shouldPollMatchups({ selectedWeek: 1, currentWeek: 2, leagueStatus: "in_season" }), false);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "complete" }), false);
assert.equal(SETTLEMENT_FUNCTION_NAME, "settleWeeklyHighScore");
assert.equal(SETTLEMENT_SCHEDULE, "15 11-15 * * 2");
assert.equal(SETTLEMENT_TIMEZONE, "America/New_York");
const window = getApprovedFreezeWindow(2026, 2)!;
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T14:59:59-04:00")).reason, "BEFORE_APPROVED_FREEZE_WINDOW");
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T15:00:00-04:00")).eligible, true);
assert.equal(evaluateFreezeWindow(2026, 2, new Date(window.firstKickoff)).eligible, false);
console.log("weekly operations control-plane tests passed");
