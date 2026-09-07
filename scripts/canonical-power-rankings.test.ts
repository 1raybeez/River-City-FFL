import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHomePowerRankingTeams } from "../lib/powerRankings/types";

const canonicalService = readFileSync("lib/powerRankings/canonicalPowerRankings.ts", "utf8");
const preseasonAdapter = readFileSync("lib/powerRankings/preseasonAdapter.ts", "utf8");
const predictionsAdapter = readFileSync("lib/predictions/serverAdapter.ts", "utf8");
const canonicalTypes = readFileSync("lib/powerRankings/types.ts", "utf8");
const legacyService = readFileSync("lib/powerRankings.ts", "utf8");
const route = readFileSync("app/api/power-rankings/route.ts", "utf8");
const home = readFileSync("app/page.tsx", "utf8");
const homeClient = readFileSync("app/HomeClient.tsx", "utf8");
const predictor = readFileSync("app/predictor/page.tsx", "utf8");

assert.match(canonicalService, /export async function getCanonicalPowerRankings/);
assert.match(canonicalService, /getPreseasonPowerRankings/);
assert.match(preseasonAdapter, /getPredictionsLeagueReport/);
assert.match(preseasonAdapter, /phase: "PRESEASON"/);
assert.match(predictionsAdapter, /buildPredictionStrengthReport/);
assert.match(canonicalTypes, /phase: CanonicalPowerRankingsPhase/);
assert.match(canonicalTypes, /PredictionTeamStrength/);
assert.match(canonicalTypes, /getHomePowerRankingTeams/);
assert.match(legacyService, /rosterValue \* 0\.8/);
assert.match(legacyService, /averageSOS \* 2/);
assert.match(legacyService, /normalizedIndex/);
assert.match(route, /getCanonicalPowerRankings/);
assert.match(home, /HomeClient/);
assert.match(homeClient, /fetch\("\/api\/power-rankings"\)/);
assert.match(predictor, /getCanonicalPowerRankings/);
assert.doesNotMatch(homeClient, /winPct|roster\.settings\?\.wins|roster\.settings\?\.fpts/);
assert.doesNotMatch(predictor, /winProb|roster\.settings|plannedCap|watchlist|target|note/);
assert.match(homeClient, /team\.franchiseId/);
assert.match(homeClient, /team\.leagueRelativeRank/);
assert.match(homeClient, /getHomePowerRankingTeams\(predictorTeams\)/);
assert.doesNotMatch(homeClient, /normalizedIndex|powerScore|averageSOS|schedule factors/);
assert.doesNotMatch(homeClient, /team\.rank|\.sort\(|powerScore|sosScore/);
assert.match(predictor, /team\.franchiseId/);
assert.match(predictor, /report\.teams\.map/);
assert.match(preseasonAdapter, /return \{/);

const canonicalFixture = Array.from({ length: 12 }, (_, index) => ({ franchiseId: `franchise-${index + 1}` }));
assert.deepEqual(
  getHomePowerRankingTeams(canonicalFixture as unknown as Parameters<typeof getHomePowerRankingTeams>[0]).map((team) => team.franchiseId),
  canonicalFixture.slice(0, 5).map((team) => team.franchiseId)
);
assert.equal(new Set(canonicalFixture.map((team) => team.franchiseId)).size, 12);

console.log("Canonical Power Rankings checks passed.");
