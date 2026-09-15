import assert from "node:assert/strict";
import { buildWeeklyLeagueRecap, checkWeeklyRecapDuplicate, prepareWeeklyRecapPublication, publishWeeklyRecapWithStore, rollbackWeeklyRecapPointer, weeklyRecapContentChecksum, weeklyRecapPublicationId, WEEKLY_RECAP_FIRESTORE_PATHS } from "../lib/weeklyRecapPublication";
import type { WeeklyCommissionerRecap } from "../lib/weeklyCommissionerRecap";

const team = (rosterId: number, points: number, record: "1-0" | "0-1") => ({ rosterId, franchiseId: `team-${rosterId}`, teamName: `Team ${rosterId}`, ownerNames: [`Owner ${rosterId}`], points, record, pf: points, pa: 100 });
const matchup = (matchupId: number) => ({ matchupId, winner: team(matchupId, 120, "1-0"), loser: team(matchupId + 6, 100, "0-1"), margin: 20, writeup: `Game ${matchupId}` });
const source = { schemaVersion: "weekly-commissioner-recap-local-preview-v1", season: 2026, week: 1, generatedAt: "2026-09-15T00:00:00.000Z", title: "WEEK 1: WELCOME BACK TO THE CHAOS", dek: "Dek", excerpt: "The approved excerpt.", openingCommissionerTake: "The approved commissioner take.", scoreboard: Array.from({ length: 6 }, (_, index) => matchup(index + 1)), honors: { highScore: team(1, 120, "1-0"), lowScore: team(7, 100, "0-1"), closestGame: matchup(1), biggestBlowout: matchup(1) }, toughLuck: "Tough luck", standings: Array.from({ length: 12 }, (_, index) => team(index + 1, 120 - index, index < 6 ? "1-0" : "0-1")), week2WatchList: ["Week 2 watch"], sourceMetadata: { leagueId: "river-city", matchupSource: "Sleeper", stateSource: "Sleeper", currentSleeperWeek: 2, currentRosterCount: 12, currentUserCount: 16, fetchedAt: "2026-09-15T00:00:00.000Z" }, closingTake: "internal" } satisfies WeeklyCommissionerRecap;

(async () => {
const recap = buildWeeklyLeagueRecap(source);
assert.equal(weeklyRecapPublicationId(2026, 1), "2026:week-01");
assert.equal(recap.publicationId, "2026:week-01");
assert.equal(recap.contentChecksum, weeklyRecapContentChecksum(recap));
assert.equal(checkWeeklyRecapDuplicate(recap, null).kind, "new");
assert.equal(checkWeeklyRecapDuplicate(recap, recap).kind, "duplicate");
assert.equal(checkWeeklyRecapDuplicate(recap, { ...recap, excerpt: "Conflict", contentChecksum: weeklyRecapContentChecksum({ ...recap, excerpt: "Conflict" }) }).kind, "conflict");
const plan = prepareWeeklyRecapPublication(recap, "2026-09-16T00:00:00.000Z");
assert.deepEqual(plan.writes.map((write) => write.path), [`${WEEKLY_RECAP_FIRESTORE_PATHS.publications}/2026:week-01`, `${WEEKLY_RECAP_FIRESTORE_PATHS.pointers}/2026`]);
assert.equal(plan.writes.filter((write) => write.operation === "create").length, 1);
assert.equal(prepareWeeklyRecapPublication(recap, "2026-09-16T00:00:00.000Z", { season: 2026, activeWeek: 0, activePublicationId: "post-draft", updatedAt: "2026-09-15T00:00:00.000Z" }).writes.length, 2);
const calls: string[] = [];
const store = { create: (path: string) => { calls.push(`create:${path}`); }, set: (path: string) => { calls.push(`set:${path}`); } };
assert.equal((await publishWeeklyRecapWithStore({ recap, store, existing: null, publishedAt: "2026-09-16T00:00:00.000Z" })).kind, "published");
assert.deepEqual(calls, [`create:${WEEKLY_RECAP_FIRESTORE_PATHS.publications}/2026:week-01`, `set:${WEEKLY_RECAP_FIRESTORE_PATHS.pointers}/2026`]);
assert.equal((await publishWeeklyRecapWithStore({ recap, store, existing: recap, publishedAt: "2026-09-16T00:00:00.000Z" })).kind, "duplicate");
assert.equal(calls.length, 2);
await assert.rejects(() => publishWeeklyRecapWithStore({ recap, store, existing: { ...recap, excerpt: "Different", contentChecksum: weeklyRecapContentChecksum({ ...recap, excerpt: "Different" }) }, publishedAt: "2026-09-16T00:00:00.000Z" }), /different weekly recap/);
const weekTwoPointer = { season: 2026, activeWeek: 2, activePublicationId: "2026:week-02", updatedAt: "2026-09-22T00:00:00.000Z" };
const weekOnePointer = { season: 2026, activeWeek: 1, activePublicationId: "2026:week-01", updatedAt: "2026-09-16T00:00:00.000Z" };
assert.equal(rollbackWeeklyRecapPointer(weekTwoPointer, weekOnePointer).activePublicationId, "2026:week-01");
assert.throws(() => rollbackWeeklyRecapPointer(weekOnePointer, weekTwoPointer));
console.log("Weekly recap publication contract checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
