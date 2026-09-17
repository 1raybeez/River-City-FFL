import assert from "node:assert/strict";
import { isTuesdaySettlementAttempt, isWithinTuesdaySettlementWindow, resolvePreviousScoringWeek, runWeeklySettlementAutomation } from "../lib/weeklySettlementAutomation";
import type { WeeklyHighScoreSettlement, WeeklyHighScoreSettlementCandidate } from "../lib/weeklyHighScoreSettlement";

const tuesday = (time: string) => new Date(`2026-09-15T${time}-04:00`);
assert.equal(isWithinTuesdaySettlementWindow(tuesday("11:14:00")), false);
assert.equal(isWithinTuesdaySettlementWindow(tuesday("11:15:00")), true);
assert.equal(isWithinTuesdaySettlementWindow(tuesday("15:15:00")), true);
assert.equal(isWithinTuesdaySettlementWindow(tuesday("16:00:00")), false);
assert.equal(isWithinTuesdaySettlementWindow(new Date("2026-09-14T12:00:00-04:00")), false);
assert.equal(isWithinTuesdaySettlementWindow(new Date("2026-09-16T12:00:00-04:00")), false);
assert.equal(isTuesdaySettlementAttempt(tuesday("11:15:00")), true);
assert.equal(isTuesdaySettlementAttempt(tuesday("11:16:00")), false);
assert.equal(isTuesdaySettlementAttempt(tuesday("15:15:00")), true);

const league = { status: "in_season", season: "2026", settings: { last_scored_leg: 1, leg: 2 } };
assert.deepEqual(resolvePreviousScoringWeek({ season: 2026, state: { season: "2026", week: 2 }, league }), { valid: true, reason: null, targetWeek: 1, currentWeek: 2, lastScoredLeg: 1 });
assert.equal(resolvePreviousScoringWeek({ season: 2026, state: { season: "2026", week: 1 }, league }).valid, false);
assert.equal(resolvePreviousScoringWeek({ season: 2026, state: { season: "2025", week: 2 }, league }).valid, false);

const settlement = { schemaVersion: "river-city-weekly-high-score-settlement-v1", season: 2026, week: 1, status: "settled", settledAt: "2026-09-15T15:15:00.000Z", finalityEvidence: { canonicalFinal: true }, winnerFranchiseIds: ["shake-n-bakers"], winnerOwnerIds: ["jordan-maslyn"], highScore: 134.26, prizePool: 1000, prizePerWinner: 1000, tieCount: 0, source: "SLEEPER", sourceAsOf: "2026-09-15T15:15:00.000Z", checksum: "fixture" } satisfies WeeklyHighScoreSettlement;
const candidate = (overrides: Partial<WeeklyHighScoreSettlementCandidate> = {}): WeeklyHighScoreSettlementCandidate => ({ eligible: true, reason: null, settlementId: "2026:week-01", settlement, sourceAsOf: settlement.sourceAsOf, finalityEvidence: settlement.finalityEvidence, ...overrides });
const readLeagueState = async () => ({ state: { season: "2026", week: 2 }, league });

const main = async () => {
const monday = await runWeeklySettlementAutomation({ season: 2026, now: new Date("2026-09-14T12:00:00-04:00"), readLeagueState });
assert.equal(monday.state, "NOT_READY");
let writes = 0;
const already = await runWeeklySettlementAutomation({ season: 2026, now: tuesday("11:15:00"), readLeagueState, readSettlement: async () => settlement });
assert.equal(already.state, "ALREADY_SETTLED");
assert.equal(already.writePerformed, false);
const dryRun = await runWeeklySettlementAutomation({ season: 2026, now: tuesday("12:15:00"), readLeagueState, readSettlement: async () => null, buildCandidate: async () => candidate(), dryRun: true, writeSettlement: async () => { writes += 1; return { created: true, settlement }; } });
assert.equal(dryRun.state, "SETTLED");
assert.equal(dryRun.settlementResult, "DRY_RUN");
assert.equal(writes, 0);
const tie = await runWeeklySettlementAutomation({ season: 2026, now: tuesday("13:15:00"), readLeagueState, readSettlement: async () => null, buildCandidate: async () => candidate({ eligible: false, settlement: null, reason: "Sleeper supplied a tied top score without a unique official weekly winner; no River City tie fallback is permitted." }) });
assert.equal(tie.state, "UNRESOLVED_TIE");
const notReady = await runWeeklySettlementAutomation({ season: 2026, now: tuesday("14:15:00"), readLeagueState: async () => ({ state: { season: "2026", week: 2 }, league: { ...league, settings: { ...league.settings, last_scored_leg: 0 } } }) });
assert.equal(notReady.state, "NOT_READY");
const invalid = await runWeeklySettlementAutomation({ season: 2026, now: tuesday("15:15:00"), readLeagueState: async () => ({ state: { season: "2026", week: 16 }, league }) });
assert.equal(invalid.state, "INVALID_WEEK");

console.log("Automatic weekly settlement safety tests passed.");
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
