import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/powerRankings.ts", "utf8");
const route = readFileSync("app/api/power-rankings/route.ts", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const homeClient = readFileSync("app/HomeClient.tsx", "utf8");
const predictor = readFileSync("app/predictor/page.tsx", "utf8");

assert.match(service, /export async function getCanonicalPowerRankings/);
assert.match(service, /rosterValue \* 0\.8/);
assert.match(service, /averageSOS \* 2/);
assert.match(service, /normalizedIndex/);
assert.match(service, /franchiseId/);
assert.match(service, /rosterId/);
assert.match(service, /Firestore player_stats/);
assert.match(service, /status.*partial/);
assert.match(service, /franchiseForRoster/);
assert.match(route, /getCanonicalPowerRankings/);
assert.match(home, /HomeClient/);
assert.match(homeClient, /fetch\("\/api\/power-rankings"\)/);
assert.match(predictor, /fetch\('\/api\/power-rankings'\)/);
assert.doesNotMatch(homeClient, /winPct|roster\.settings\?\.wins|roster\.settings\?\.fpts/);
assert.doesNotMatch(predictor, /winProb|roster\.settings|plannedCap|watchlist|target|note/);
assert.match(homeClient, /team\.franchiseId/);
assert.match(predictor, /team\.franchiseId/);
assert.match(service, /sort\(\(first, second\) =>/);
assert.match(service, /rosterCount/);
assert.match(service, /missingValuePlayerCount/);

console.log("Canonical Power Rankings checks passed.");
