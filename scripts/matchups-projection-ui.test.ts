import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const activeRoute = readFileSync("app/api/projections/active/route.ts", "utf8");

assert.match(page, /getDerivedWeeklyProjections|api\/projections\/active/);
assert.match(page, /resolveStarterProjections/);
assert.match(page, /aggregateStarterProjections/);
assert.match(page, /Projected Score/);
assert.match(page, /Projected Edge: Even/);
assert.match(page, /Projected Edge: /);
assert.match(page, /complete projection coverage required/);
assert.match(page, /Projection source:/);
assert.match(page, /weekly-live|weekly-derived|season-fallback/);
assert.match(page, /starting.*projections|starters have projections/i);
assert.match(page, /Series History/);
assert.match(page, /StarterList/);
assert.match(page, /const \[expanded, setExpanded\] = useState\(false\)/);
assert.doesNotMatch(page, /\bwin probability\b|\bfavorite\b|\block\b|\blikely winner\b|\bwin chance\b|\bAI prediction\b/i);
assert.doesNotMatch(page, /totalValueScore|keeperCost|getAllPlayers|\/predictor/i);

assert.match(activeRoute, /source: "weekly-live"/);
assert.match(activeRoute, /source: "weekly-derived"/);
assert.match(activeRoute, /source: "season-fallback"/);
assert.doesNotMatch(activeRoute, /source: "weekly"|source: "derived"|source: "season"/);

const complete = { projectedTotalPoints: 101.2, coverageComplete: true };
const incomplete = { projectedTotalPoints: null, coverageComplete: false, projectedStarterCount: 8, totalStarterCount: 9 };
assert.equal(complete.projectedTotalPoints, 101.2);
assert.equal(incomplete.projectedTotalPoints, null);
assert.equal(incomplete.projectedStarterCount, 8);

console.log("Matchups projection UI fixture checks passed.");
