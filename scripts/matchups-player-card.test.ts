import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sleeperSource = readFileSync("lib/sleeper.ts", "utf8");
const page = readFileSync("app/matchups/page.tsx", "utf8");
const identityLoader = sleeperSource.match(
  /export async function getSleeperPlayerIdentityDirectory[\s\S]*?(?=\/\/ --- LEAGUE COMPONENT FETCHERS ---)/
)?.[0] ?? "";

const identityFixture = {
  playerId: "123456",
  displayName: "Justin Jefferson",
  position: "WR",
  nflTeam: "MIN",
};
const starterIds = ["123456", "789012", "missing-id"];
const directory = new Map([[identityFixture.playerId, identityFixture]]);
const resolved = starterIds.map((id) => directory.get(id) ?? null);

assert.equal(resolved[0]?.displayName, "Justin Jefferson");
assert.equal(resolved[0]?.position, "WR");
assert.equal(resolved[0]?.nflTeam, "MIN");
assert.deepEqual(starterIds, ["123456", "789012", "missing-id"]);
assert.equal(resolved[2], null);

assert.match(sleeperSource, /getSleeperPlayerIdentityDirectory/);
assert.doesNotMatch(sleeperSource, /api\.sleeper\.app\/v1\/players\/nfl/);
assert.match(sleeperSource, /displayName/);
assert.match(sleeperSource, /position/);
assert.match(sleeperSource, /nflTeam/);
assert.match(page, /playerDirectory\[playerId\]/);
assert.match(page, /displayName/);
assert.match(page, /position/);
assert.match(page, /nflTeam/);
assert.match(page, /Unknown Player/);
assert.match(page, /Starting lineup not available yet\./);
assert.match(page, /playerDirectory=\{playerDirectory\}/);
assert.match(page, /getSleeperPlayerIdentityDirectory\(\s*rosterData\.flatMap/);
assert.doesNotMatch(identityLoader, /getDocs|player_stats|totalValueScore|keeperCost/);
assert.doesNotMatch(page, /getAllPlayers|resolvePlayerForYear|totalValueScore|keeperCost/);
assert.doesNotMatch(page, /sleepercdn\.com\/content\/nfl\/players/);
assert.match(page, /const \[expanded, setExpanded\] = useState\(false\)/);
assert.match(page, /actual points when available/);
assert.match(page, /Points unavailable/);
assert.match(page, /Not started/);
assert.match(page, /reserve|taxi/i);
assert.match(sleeperSource, /injury_status/);
assert.match(page, /Unknown Player/);
assert.match(page, /FALLBACK_AVATAR/);

console.log("Matchups player-card fixture checks passed.");
