import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const sleeper = readFileSync("lib/sleeper.ts", "utf8");

assert.match(page, /getConfiguredRosterPositions/);
assert.match(page, /getStarterEntries/);
assert.match(page, /roster_positions/);
assert.match(page, /SUPER_FLEX/);
assert.match(page, /WRRB_FLEX/);
assert.match(page, /REC_FLEX/);
assert.match(page, /Starting Lineup/);
assert.match(page, /Bench/);
assert.match(page, /EMPTY SLOT/);
assert.match(page, /getRosterPlayerIds/);
assert.match(page, /players_points/);
assert.match(page, /starters_points/);
assert.match(page, /points === null \? "—"/);
assert.match(page, /points\.toFixed\(2\)/);
assert.match(page, /FUTURE.*LIVE.*FINAL.*UNKNOWN/);
assert.match(page, /getLineupState/);
assert.match(page, /reserve/);
assert.match(page, /taxi/);
assert.match(page, /getLeagueInfo\(\)/);
assert.doesNotMatch(page, /fetch\([^\n]*player/);
assert.doesNotMatch(page, /win probability|win chance|confidence %|betting odds/i);
assert.match(page, /HistoryContext history=\{history\}/);
assert.match(page, /PlayoffsPanel/);
assert.match(sleeper, /starters\?: Array<string \| null>/);

const fixture = {
  roster_positions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "IR"],
  starters: ["qb", "rb1", null, "wr1", "wr2", "te", "flex", "k", "def"],
  players_points: { qb: 0, rb1: 12.4 },
};
assert.equal(fixture.roster_positions[6], "FLEX");
assert.equal(fixture.starters[2], null);
assert.equal(fixture.players_points.qb, 0, "A legitimate zero remains a displayed point value.");
assert.equal(fixture.players_points.rb1, 12.4);

console.log("Matchups M2 lineup-detail fixture checks passed.");
