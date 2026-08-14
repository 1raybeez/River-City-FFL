import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/predictor/page.tsx", "utf8");

assert.match(page, /<SiteShell activePath="\/predictor">/);
assert.match(page, /POWER RANKINGS|Power Rankings/);
assert.match(page, /2026 Power Rankings/);
assert.match(page, /getAllPlayers\(\)/);
assert.match(page, /totalValueScore/);
assert.match(page, /sosScore/);
assert.match(page, /totalValue \* 0\.8/);
assert.match(page, /\.sort\(\(a: any, b: any\) => b\.winProb - a\.winProb\)/);
assert.match(page, /Preseason Placeholder/);
assert.match(page, /not a calibrated matchup win-probability model/);
assert.match(page, /<table/);
assert.match(page, /<caption className="sr-only">/);
assert.match(page, /Normalized Outlook/);
assert.match(page, /overflow-x-auto/);
assert.match(page, /focus-visible:ring-2/);
assert.doesNotMatch(page, /<nav/);
assert.doesNotMatch(page, /AI Championship Predictor|Intelligence Dispatch/);

console.log("Predictor presentation checks passed.");
