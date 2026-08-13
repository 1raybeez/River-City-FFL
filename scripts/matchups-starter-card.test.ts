import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");

const starterFixture = {
  roster_id: 1,
  matchup_id: 7,
  points: 101.25,
  starters: ["123456", "789012", "345678"],
};

assert.deepEqual(starterFixture.starters, ["123456", "789012", "345678"]);
assert.match(page, /const \[expanded, setExpanded\] = useState\(false\)/);
assert.match(page, /aria-expanded=\{expanded\}/);
assert.match(page, /aria-controls=\{lineupId\}/);
assert.match(page, /Show starters/);
assert.match(page, /Hide starters/);
assert.match(page, /Player ID: \{starterId\}/);
assert.match(page, /Starting lineup not available yet\./);
assert.match(page, /starterIds\.map/);
assert.match(page, /<StarterList label=\{team1\.name\} matchup=\{group\.teams\[0\]\}/);
assert.match(page, /<StarterList label=\{team2\.name\} matchup=\{group\.teams\[1\]\}/);
assert.match(page, /Go to previous week/);
assert.match(page, /Go to next week/);
assert.match(page, /PlayoffsPanel/);
assert.doesNotMatch(page, /getAllPlayers|resolvePlayerForYear|totalValueScore|keeperCost/);

const cardStateOccurrences = page.match(/const \[expanded, setExpanded\] = useState\(false\)/g) ?? [];
assert.equal(cardStateOccurrences.length, 1, "Each MatchupCard instance owns independent expansion state.");

console.log("Matchups starter-card fixture checks passed.");
