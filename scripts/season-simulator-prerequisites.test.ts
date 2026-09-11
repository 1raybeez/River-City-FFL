import assert from "node:assert/strict";
import { RIVER_CITY_2026_RULES, SIMULATOR_COVERAGE_GATE, buildDeterministicSeed, createSeededRandom, normalizeSimulationSchedule, normalizeWeeklyProjection, resolveProjectionIdentity, resolveSimulatorFinality, validateSimulatorRules } from "../lib/seasonSimulator/prerequisites";

assert.equal(RIVER_CITY_2026_RULES.teams, 12);
assert.equal(RIVER_CITY_2026_RULES.regularSeasonEndWeek, 14);
assert.deepEqual(RIVER_CITY_2026_RULES.playoffWeeks, [15, 16, 17]);
assert.deepEqual(RIVER_CITY_2026_RULES.playoffByes, [1, 2]);
assert.deepEqual(RIVER_CITY_2026_RULES.regularSeasonTiebreakers, ["POINTS_FOR", "POINTS_AGAINST", "COMMISSIONER_PLATFORM_RESOLUTION"]);
assert.deepEqual(RIVER_CITY_2026_RULES.playoffSeedingTiebreakers, ["BEST_REGULAR_RECORD", "POINTS_FOR_REMAINING", "COMMISSIONER_PLATFORM_RESOLUTION"]);
assert.equal(RIVER_CITY_2026_RULES.divisionsAffectQualification, false);
assert.equal(RIVER_CITY_2026_RULES.playoffReseeding, true);
assert.equal(RIVER_CITY_2026_RULES.playoffGameTieHandling, "HIGHER_SEED_ADVANCES");
assert.equal(RIVER_CITY_2026_RULES.lineupConfigurationResolved, true);
assert.equal(validateSimulatorRules(RIVER_CITY_2026_RULES).valid, true);

const rosterMap = new Map(Array.from({ length: 12 }, (_, index) => [index + 1, `franchise-${index + 1}`]));
const rows = Array.from({ length: 14 }, (_, week) => Array.from({ length: 6 }, (_, matchup) => [0, 1].map((side) => ({ week: week + 1, matchupId: matchup + 1, rosterId: matchup * 2 + side + 1, opponentRosterId: matchup * 2 + (side === 0 ? 2 : 0), points: 100 + week + matchup + side })))).flat(2);
const schedule = normalizeSimulationSchedule(rows, rosterMap);
assert.equal(schedule.valid, true);
assert.equal(schedule.matchups.length, 84);
assert.equal(normalizeSimulationSchedule(rows.filter((row) => !(row.week === 1 && row.rosterId === 1)), rosterMap).valid, false);
assert.equal(resolveSimulatorFinality(3, [{ week: 1, matchupCount: 12, scoredMatchupCount: 12 }]).finalizedWeek, 1);
assert.equal(SIMULATOR_COVERAGE_GATE.minimumStarterCoverage, 1);
assert.equal(normalizeWeeklyProjection({ season: 2026, week: 1, playerId: "s1", providerPlayerId: "p1", playerName: "Player One", position: "K", nflTeam: "KC", projectedPoints: 0, source: "fixture", sourceAsOf: "2026-09-10T00:00:00Z", providerVersion: "v1" }).coverageStatus, "VALID_ZERO");
assert.equal(normalizeWeeklyProjection({ season: 2026, week: 1, playerId: null, providerPlayerId: "p2", playerName: "Unknown", position: "QB", nflTeam: "KC", projectedPoints: 10, source: "fixture", sourceAsOf: null, providerVersion: null }).coverageStatus, "UNRESOLVED");
assert.equal(resolveProjectionIdentity("provider-1", new Map([["provider-1", "sleeper-1"]])).matchState, "EXACT_ID");
assert.equal(resolveProjectionIdentity("provider-2", new Map()).matchState, "UNMATCHED");

const seedInput = { season: 2026, scoringWeek: 1, inputChecksum: "abc", modelVersion: "sim-v1" };
assert.equal(buildDeterministicSeed(seedInput), buildDeterministicSeed(seedInput));
const first = createSeededRandom(buildDeterministicSeed(seedInput));
const second = createSeededRandom(buildDeterministicSeed(seedInput));
assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
console.log("Season simulator prerequisite checks passed.");
