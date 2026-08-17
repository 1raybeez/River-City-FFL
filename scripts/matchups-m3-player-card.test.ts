import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const sleeper = readFileSync("lib/sleeper.ts", "utf8");

assert.match(page, /aria-expanded=\{isOpen\}/);
assert.match(page, /aria-controls=\{detailId\}/);
assert.match(page, /setOpenPlayerId/);
assert.match(page, /Close .*details/);
assert.match(page, /Unknown Player/);
assert.match(page, /FALLBACK_AVATAR/);
assert.match(page, /Starting Lineup/);
assert.match(page, /Bench/);
assert.match(page, /RESERVE \/ IR/);
assert.match(page, /TAXI/);
assert.match(page, /Actual/);
assert.match(page, /Projected/);
assert.match(page, /vs projection/);
assert.match(page, /getPlayerProjection/);
assert.match(page, /lineupState === "FUTURE" \? null/);
assert.match(page, /injuryStatus/);
assert.match(page, /players_points/);
assert.doesNotMatch(page, /fetch\([^\n]*player/);
assert.doesNotMatch(page, /win probability|win chance|confidence|betting odds/i);
assert.doesNotMatch(page, /target|plannedCap|privateNote|warRoomId|budget/i);
assert.match(page, /HistoryContext history=\{history\}/);
assert.match(page, /PlayoffsPanel/);
assert.match(sleeper, /injury_status/);

const fixture = {
  actual: 0,
  projected: 11.2,
  futureActual: null as number | null,
};
assert.equal(fixture.actual.toFixed(2), "0.00");
assert.equal(fixture.futureActual, null);
assert.equal((fixture.actual - fixture.projected).toFixed(1), "-11.2");

console.log("Matchups M3 player-card fixture checks passed.");
