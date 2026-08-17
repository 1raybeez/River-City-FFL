import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");

assert.match(page, /const lineupState = getLineupState\(week, currentWeek, leagueInfo\)/);
assert.match(page, /leagueInfo\?\.status === "pre_draft"\) return "FUTURE"/);
assert.match(page, /Matchup state \$\{lineupState\}/);
assert.match(page, /Current leader/);
assert.match(page, /Currently tied/);
assert.match(page, /label: state === "LIVE" \? "Current leader" : "Winner"/);
assert.match(page, /VIEW MATCHUP DETAILS/);
assert.match(page, /HIDE MATCHUP DETAILS/);
assert.match(page, /aria-expanded=\{expanded\}/);
assert.match(page, /aria-controls=\{expandedRegionId\}/);
assert.match(page, /lineupState === "FUTURE" \|\| lineupState === "UNKNOWN" \? "—"/);
assert.match(page, /typeof matchup\?\.points === "number" && Number\.isFinite\(matchup\.points\)/);
assert.match(page, /Projection source:/);
assert.match(page, /Projected Edge/);
assert.match(page, /Starting Lineup/);
assert.match(page, /HistoryContext/);
assert.doesNotMatch(page, /favorite|win probability|championship probability/i);

console.log("Matchups M1 final-card checks passed.");
