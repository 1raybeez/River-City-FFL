import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync("app/predictor/page.tsx", "utf8");
const siteShell = readFileSync("components/SiteShell.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");

assert.match(page, /<SiteShell activePath="\/predictor">/);
assert.match(page, /POWER RANKINGS|Power Rankings/);
assert.match(page, /2026 Power Rankings/);
assert.match(page, /\/api\/power-rankings/);
assert.doesNotMatch(page, /getAllPlayers\(\)|totalValueScore|sosScore|winProb/);
assert.match(page, /normalizedIndex/);
assert.match(page, /Preseason Placeholder/);
assert.match(page, /not a calibrated matchup win-probability model/);
assert.match(page, /<table/);
assert.match(page, /<caption className="sr-only">/);
assert.match(page, /Normalized Outlook/);
assert.match(page, /overflow-x-auto/);
assert.match(page, /focus-visible:ring-2/);
assert.doesNotMatch(page, /<nav/);
assert.doesNotMatch(page, /AI Championship Predictor|Intelligence Dispatch/);
assert.equal(existsSync("components/PowerRankings.tsx"), false);
assert.match(siteShell, /\["Power Rankings", "\/predictor"\]/);
assert.match(home, /href="\/predictor"/);

console.log("Predictor presentation checks passed.");
