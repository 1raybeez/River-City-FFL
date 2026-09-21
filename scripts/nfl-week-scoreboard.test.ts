import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupNflGamesByDate, NFL_SCOREBOARD_POLL_INTERVAL_MS, shouldPollNflWeek } from "../lib/nflWeekScoreboard";
import type { NflKickoff } from "../lib/nflKickoffSchedule";

const game = (id: string, status: NflKickoff["status"], kickoffAt: string, overrides: Partial<NflKickoff> = {}): NflKickoff => ({ season: 2026, week: 2, gameId: id, kickoffAt, source: "fixture", status, broadcasts: [], awayTeam: { name: "Away", abbreviation: "AWY", logo: null, score: status === "UPCOMING" ? null : 10 }, homeTeam: { name: "Home", abbreviation: "HME", logo: null, score: status === "UPCOMING" ? null : 7 }, ...overrides });

const live = game("live", "LIVE", "2026-09-21T00:20:00.000Z", { period: 2, clock: "8:15" });
const final = game("final", "FINAL", "2026-09-20T17:00:00.000Z");
const future = game("future", "UPCOMING", "2026-09-22T00:15:00.000Z");
assert.equal(NFL_SCOREBOARD_POLL_INTERVAL_MS, 60_000);
assert.equal(shouldPollNflWeek(2, [live], new Date("2026-09-21T00:30:00.000Z")), true);
assert.equal(shouldPollNflWeek(1, [final], new Date("2026-09-21T00:30:00.000Z")), false);
assert.equal(shouldPollNflWeek(3, [future], new Date("2026-09-21T00:30:00.000Z")), false);
assert.equal(shouldPollNflWeek(2, [final], new Date("2026-09-21T00:30:00.000Z")), false);
assert.equal(groupNflGamesByDate([final, live, future]).length, 2);

const home = readFileSync("app/HomeClient.tsx", "utf8");
assert.match(home, /NFL WEEK \{nflGameCenter\.week\} SCORES/);
assert.match(home, /href=\{`\/nfl\/week\/\$\{nflGameCenter\.week\}`\}/);
assert.doesNotMatch(home, /View Week \{liveSeasonState\.activeWeek\} Matchups/);
assert.match(readFileSync("app/matchups/page.tsx", "utf8"), /matchups/);
console.log("NFL Week scoreboard checks passed.");
