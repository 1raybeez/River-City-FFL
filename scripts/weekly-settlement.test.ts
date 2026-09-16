import assert from "node:assert/strict";
import { isTuesdayEasternWindow, validateWeeklyHighScoreSettlement, weeklyHighScoreSettlementChecksum, weeklyHighScoreSettlementId, type WeeklyHighScoreSettlement, type WeeklyHighScoreSettlementCandidate } from "../lib/weeklyHighScoreSettlement";
import { executeWeeklySettlement, parseWeeklySettlementArgs } from "./weekly-settle";

const main = async () => {
assert.equal(weeklyHighScoreSettlementId(2026, 1), "2026:week-01");
assert.equal(isTuesdayEasternWindow(new Date("2026-09-15T16:00:00-04:00")), true);
assert.equal(isTuesdayEasternWindow(new Date("2026-09-16T12:00:00-04:00")), false);
const record = { schemaVersion: "river-city-weekly-high-score-settlement-v1" as const, season: 2026, week: 1, status: "settled" as const, settledAt: "2026-09-15T20:00:00.000Z", finalityEvidence: { canonicalFinal: true }, winnerFranchiseIds: ["shake-n-bakers"], winnerOwnerIds: ["jordan-maslyn"], highScore: 134.26, prizePool: 1000, prizePerWinner: 1000, tieCount: 0, source: "SLEEPER" as const, sourceAsOf: "2026-09-15T20:00:00.000Z", checksum: "" };
assert.throws(() => validateWeeklyHighScoreSettlement(record), /checksum/);

assert.deepEqual(parseWeeklySettlementArgs(["--season", "2026", "--week", "1", "--dry-run"]), { season: 2026, week: 1, dryRun: true });
assert.deepEqual(parseWeeklySettlementArgs(["--season", "2026", "--week", "1"]), { season: 2026, week: 1, dryRun: false });

const candidate = (eligible: boolean, settlement: WeeklyHighScoreSettlement | null = null): WeeklyHighScoreSettlementCandidate => ({ eligible, reason: eligible ? null : "blocked", settlement, settlementId: "2026:week-01", sourceAsOf: "source", finalityEvidence: {} });
let writes = 0;
const writer = async (settlement: WeeklyHighScoreSettlement) => { writes += 1; return { created: true, settlement }; };
const validRecord = { ...record, checksum: "valid" } as WeeklyHighScoreSettlement;
const stableRecord = { ...record, checksum: "" };
const stableChecksum = weeklyHighScoreSettlementChecksum(stableRecord);
assert.equal(stableChecksum, weeklyHighScoreSettlementChecksum({ ...stableRecord, settledAt: "2026-09-16T01:47:59.976Z", sourceAsOf: "2026-09-16T01:47:59.976Z" }));
assert.notEqual(weeklyHighScoreSettlementChecksum({ ...stableRecord, winnerFranchiseIds: ["the-art-of-war"] }), stableChecksum);
assert.notEqual(weeklyHighScoreSettlementChecksum({ ...stableRecord, highScore: 134.25 }), stableChecksum);
assert.notEqual(weeklyHighScoreSettlementChecksum({ ...stableRecord, prizePerWinner: 2_000 }), stableChecksum);
assert.notEqual(weeklyHighScoreSettlementChecksum({ ...stableRecord, tieCount: 1 }), stableChecksum);
const dryRun = await executeWeeklySettlement({ season: 2026, week: 1, dryRun: true, buildCandidate: async () => candidate(true, validRecord), writeSettlement: writer });
assert.equal(dryRun.writePerformed, false);
assert.equal(writes, 0);
const realRun = await executeWeeklySettlement({ season: 2026, week: 1, dryRun: false, buildCandidate: async () => candidate(true, validRecord), writeSettlement: writer });
assert.equal(realRun.writePerformed, true);
assert.equal(writes, 1);
const duplicate = await executeWeeklySettlement({ season: 2026, week: 1, dryRun: false, buildCandidate: async () => candidate(true, validRecord), writeSettlement: async () => ({ created: false, settlement: validRecord }) });
assert.equal(duplicate.writePerformed, false);
assert.equal(duplicate.duplicate, true);
await assert.rejects(() => executeWeeklySettlement({ season: 2026, week: 1, dryRun: false, buildCandidate: async () => candidate(false), writeSettlement: writer }), /blocked/);
assert.equal(writes, 1);
console.log("Weekly settlement safety tests passed.");
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
