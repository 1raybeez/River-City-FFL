import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveWeeklyFinality } from "../lib/home/weeklyFinality";
import { selectWeeklyHighScore, type WeeklyHighScoreCandidate } from "../lib/home/weeklyHighScore";

const completeWeek = (week: number, scoredMatchupCount = 12) => ({ week, matchupCount: 12, scoredMatchupCount });
assert.equal(resolveWeeklyFinality(1, [completeWeek(1)]).finalizedWeek, null);
assert.deepEqual(resolveWeeklyFinality(2, [completeWeek(1)]).finalizedWeeks, []);
assert.deepEqual(resolveWeeklyFinality(3, [completeWeek(1), completeWeek(2)]).finalizedWeeks, [1]);
assert.deepEqual(resolveWeeklyFinality(5, [completeWeek(1), completeWeek(2), completeWeek(3), completeWeek(4)]).finalizedWeeks, [1, 2, 3]);
assert.deepEqual(resolveWeeklyFinality(5, [completeWeek(3, 11)]).finalizedWeeks, []);
assert.equal(resolveWeeklyFinality(5, [completeWeek(1)]).statCorrectionBufferWeeks, 1);

const candidate = (franchiseId: string, points: number): WeeklyHighScoreCandidate => ({ franchiseId, teamName: franchiseId, ownerNames: [franchiseId], ownerPhoto: null, sleeperAvatar: null, points, week: 1 });
assert.deepEqual(selectWeeklyHighScore([candidate("b", 148.62), candidate("a", 148.62), candidate("c", 100)]).map((winner) => winner.franchiseId), ["a", "b"]);
assert.deepEqual(selectWeeklyHighScore([candidate("a", 148.62), candidate("b", 100)]).map((winner) => winner.franchiseId), ["a"]);

const home = readFileSync("app/HomeClient.tsx", "utf8");
const page = readFileSync("app/page.tsx", "utf8");
const loader = readFileSync("lib/home/liveSeasonState.ts", "utf8");
assert.match(home, /href="\/league-info\/draft-report\/overview"/);
assert.match(home, /isDraftPhase && <Link href="\/commish\/auction"/);
assert.match(home, /weeklyHighScore\.length > 0/);
assert.match(home, /"WEEKLY HIGH SCORE"/);
assert.match(home, /"2026 WEEKLY SPOTLIGHT"/);
assert.match(home, /"PLAYOFF SPOTLIGHT"/);
assert.match(home, /"CHAMPIONSHIP SPOTLIGHT"/);
assert.match(home, /matchups\?week=/);
assert.match(page, /getHomeLiveSeasonState/);
assert.match(loader, /resolveWeeklyFinality/);
assert.match(loader, /getMatchups\(week\)/);
assert.match(loader, /selectWeeklyHighScore/);
console.log("Home live-season checks passed.");
