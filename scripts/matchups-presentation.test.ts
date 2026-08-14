import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");

assert.match(page, /import SiteShell from ["']@\/components\/SiteShell["']/);
assert.match(page, /<SiteShell activePath="\/matchups">/);
assert.match(page, /2026 Matchup Center/);
assert.match(page, /Back to League Info/);
assert.match(page, /href="\/league-info"/);
assert.doesNotMatch(page, /<nav/);
assert.match(page, /useState<"regular" \| "playoffs">\("regular"\)/);
assert.match(page, /aria-pressed=\{activeTab === "regular"\}/);
assert.match(page, /aria-pressed=\{activeTab === "playoffs"\}/);
assert.match(page, /setActiveTab\("regular"\)/);
assert.match(page, /setActiveTab\("playoffs"\)/);
assert.match(page, /Go to previous week/);
assert.match(page, /Go to next week/);
assert.match(page, /normalizeWeek\(\(current \?\? displayWeek\) - 1\)/);
assert.match(page, /normalizeWeek\(\(current \?\? displayWeek\) \+ 1\)/);
assert.match(page, /Show starters/);
assert.match(page, /Hide starters/);
assert.match(page, /aria-expanded=\{expanded\}/);
assert.match(page, /aria-controls=\{expandedRegionId\}/);
assert.match(page, /Series History/);
assert.match(page, /Projected Scores/);
assert.match(page, /Projected Edge/);
assert.match(page, /Projection source:/);
assert.match(page, /coverageComplete/);
assert.match(page, /PlayoffsPanel/);
assert.match(page, /No Matchups Found/);
assert.match(page, /Sleeper did not return matchup rows for this week yet\./);
assert.match(page, /overflow-x-hidden/);
assert.match(page, /focus-visible:ring-2/);
assert.match(page, /min-h-10/);
assert.match(page, /Head-to-Head/);

console.log("Matchups presentation checks passed.");
