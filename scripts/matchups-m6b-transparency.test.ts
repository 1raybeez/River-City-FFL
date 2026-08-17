import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const route = readFileSync("app/api/projections/active/route.ts", "utf8");
const adapter = readFileSync("lib/projectionAdapter.ts", "utf8");

const sourceOrder = [
  route.indexOf('source: "weekly-live"'),
  route.indexOf('source: "weekly-derived"'),
  route.indexOf('source: "season-fallback"'),
];
assert.ok(sourceOrder.every((index) => index >= 0));
assert.ok(sourceOrder[0] < sourceOrder[1] && sourceOrder[1] < sourceOrder[2]);
assert.match(route, /weeklyRes\.ok/);
assert.match(route, /getDerivedWeeklyProjections/);
assert.match(route, /getSeasonProjections/);
assert.match(route, /No projection sources available/);

assert.match(page, /WEEKLY PROJECTION/);
assert.match(page, /DERIVED WEEKLY ESTIMATE/);
assert.match(page, /SEASON-BASED ESTIMATE/);
assert.match(page, /incomplete starter projection coverage/);
assert.match(page, /coverageComplete/);
assert.match(page, /Projected Edge/);
assert.match(page, /Projected Edge unavailable — complete projection coverage required\./);
assert.match(page, /lineupState === "FUTURE" \? null/);
assert.match(page, /points !== null && projection !== null/);
assert.doesNotMatch(page, /win probability|win chance|favorite|underdog|betting odds|confidence %|predicted winner|championship probability/i);
assert.doesNotMatch(route, /win probability|win chance|favorite|underdog|betting odds|confidence %|predicted winner|championship probability/i);

assert.match(adapter, /coverageComplete/);
assert.match(adapter, /coverageState: "ambiguous"/);
assert.match(adapter, /projectionPoints: null/);

const states = {
  future: { actual: null, projection: 12.5 },
  live: { actual: 8.25, projection: 12.5 },
  final: { actual: 14.75, projection: 12.5 },
  unknown: { actual: null, projection: null },
};
assert.equal(states.future.actual, null);
assert.equal((states.live.actual! - states.live.projection!).toFixed(1), "-4.3");
assert.equal((states.final.actual! - states.final.projection!).toFixed(1), "2.3");
assert.equal(states.unknown.projection, null);

console.log("Matchups M6B transparency checks passed.");
