import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const page = readFileSync("app/predictor/page.tsx", "utf8");
const siteShell = readFileSync("components/SiteShell.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");

assert.match(page, /<SiteShell activePath="\/predictor">/);
assert.match(page, /getCanonicalPowerRankings/);
assert.match(page, /2026 Preseason Power Rankings/);
assert.match(page, /Preseason Strength v1/);
assert.match(page, /Preseason roster ranking — not a projected record or win probability/);
assert.match(page, /team.components/);
assert.match(page, /max-w-\[1600px\]/);
assert.match(page, /ownerFriendlyExplanation/);
assert.match(page, /freshnessDate/);
assert.match(page, /IN LEAGUE/);
assert.doesNotMatch(page, /Freshness:[^\n]*generatedAt/);
assert.match(page, /team\.leagueRelativeRank/);
assert.match(page, /team\.teamName/);
assert.match(page, /team\.tier/);
assert.match(page, /team\.confidence/);
assert.match(page, /team\.biggestStrength/);
assert.match(page, /team\.biggestWeakness/);
assert.doesNotMatch(page, /Team Strength|score\(team\.strengthScore\)|toFixed\(1\)/);
assert.match(page, /preseason roster comparison/i);
assert.doesNotMatch(page, /projected wins|playoff probability|championship probability|schedule strength|odds/i);
assert.match(page, /report\.teams\.map/);
assert.match(page, /focus-visible:ring-2/);
assert.doesNotMatch(page, /<nav/);
assert.doesNotMatch(page, /AI Championship Predictor|Intelligence Dispatch/);
assert.equal(existsSync("components/PowerRankings.tsx"), false);
assert.match(siteShell, /MOBILE_SITE_NAV_ITEMS/);
const navigation = readFileSync("lib/navigation/siteNavigation.ts", "utf8");
assert.match(navigation, /\{ label: "Predictions", href: "\/predictor", match: "exact" \}/);
assert.match(home, /href="\/predictor"/);

console.log("Predictor presentation checks passed.");
