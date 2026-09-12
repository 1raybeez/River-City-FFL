import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/power-rankings/page.tsx", "utf8");
const detail = readFileSync("components/PowerRankingsDetail.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");
const predictor = readFileSync("app/predictor/page.tsx", "utf8");

const main = () => {

assert.match(page, /<SiteShell activePath="\/power-rankings">/);
assert.match(page, /RIVER CITY POWER RANKINGS/);
assert.match(page, /WHO IS STRONGEST RIGHT NOW\?/);
assert.match(page, /not projected standings, playoff odds, or championship odds/);
assert.match(page, /href="\/predictor"/);
assert.match(page, /<PowerRankingsDetail report=\{report\}/);
assert.match(detail, /Detailed current Power Rankings/);
for (const field of ["leagueRelativeRank", "teamName", "team\.tier", "team\.confidence", "team\.components", "team\.biggestStrength", "team\.biggestWeakness"]) assert.match(detail, new RegExp(field));
assert.match(detail, /report\.teams\.map/);
assert.doesNotMatch(detail, /playoffProbability|championshipProbability|projectedWins|projectedLosses/);
assert.match(home, /getHomePowerRankingTeams\(predictorTeams\)/);
assert.match(home, /href="\/power-rankings"/);
assert.match(home, /href="\/predictor"/);
assert.match(predictor, /Power Rank #\{ownerTeam\.leagueRelativeRank\}/);
assert.doesNotMatch(predictor, /team\.components|team\.biggestStrength|team\.biggestWeakness/);
assert.match(page, /Open Predictor/);
assert.doesNotMatch(page, /Projected Finish|Playoff Odds|Championship Odds|projectedWins|playoffProbability|championshipProbability/);
assert.doesNotMatch(page, /\b\d+%/);

console.log("Power Rankings presentation checks passed.");
};

main();
