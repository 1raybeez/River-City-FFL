import assert from "node:assert/strict";
import { isTuesdayEasternWindow, validateWeeklyHighScoreSettlement, weeklyHighScoreSettlementId } from "../lib/weeklyHighScoreSettlement";

assert.equal(weeklyHighScoreSettlementId(2026, 1), "2026:week-01");
assert.equal(isTuesdayEasternWindow(new Date("2026-09-15T16:00:00-04:00")), true);
assert.equal(isTuesdayEasternWindow(new Date("2026-09-16T12:00:00-04:00")), false);
const record = { schemaVersion: "river-city-weekly-high-score-settlement-v1" as const, season: 2026, week: 1, status: "settled" as const, settledAt: "2026-09-15T20:00:00.000Z", finalityEvidence: { canonicalFinal: true }, winnerFranchiseIds: ["shake-n-bakers"], winnerOwnerIds: ["jordan-maslyn"], highScore: 134.26, prizePool: 1000, prizePerWinner: 1000, tieCount: 0, source: "SLEEPER" as const, sourceAsOf: "2026-09-15T20:00:00.000Z", checksum: "" };
assert.throws(() => validateWeeklyHighScoreSettlement(record), /checksum/);
console.log("Weekly settlement safety tests passed.");
