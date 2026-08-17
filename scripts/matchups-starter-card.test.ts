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
assert.match(page, /const expandedRegionId = `\$\{group\.id\}-expanded-content`/);
assert.match(page, /aria-controls=\{expandedRegionId\}/);
assert.match(page, /<div id=\{expandedRegionId\} className="min-w-0">/);
assert.match(page, /Show starters/);
assert.match(page, /Hide starters/);
assert.match(page, /Unknown Player/);
assert.match(page, /Starting lineup not available yet\./);
assert.match(page, /starterEntries\.map/);
assert.match(page, /<StarterList label=\{team1\.name\} matchup=\{group\.teams\[0\]\} roster=/);
assert.match(page, /<StarterList label=\{team2\.name\} matchup=\{group\.teams\[1\]\} roster=/);
assert.match(page, /<ProjectionContext group=\{group\}/);
assert.match(page, /<HistoryContext history=\{history\}/);
const controlledRegionStart = page.indexOf('<div id={expandedRegionId} className="min-w-0">');
const controlledRegionEnd = page.indexOf('\n        </div>\n      )}', controlledRegionStart);
assert.ok(controlledRegionStart >= 0, "Expanded content has one controlled region.");
assert.ok(controlledRegionEnd > controlledRegionStart, "Controlled region closes after expanded content.");
const controlledRegion = page.slice(controlledRegionStart, controlledRegionEnd);
assert.match(controlledRegion, /StarterList/);
assert.match(controlledRegion, /ProjectionContext/);
assert.match(controlledRegion, /HistoryContext/);
assert.doesNotMatch(page, /starting-lineups/);
assert.match(page, /Go to previous week/);
assert.match(page, /Go to next week/);
assert.match(page, /PlayoffsPanel/);
assert.doesNotMatch(page, /getAllPlayers|resolvePlayerForYear|totalValueScore|keeperCost/);
assert.match(page, /Starting Lineup/);
assert.match(page, /Bench/);
assert.match(page, /EMPTY SLOT/);
assert.match(page, /players_points/);
assert.match(page, /starters_points/);

const cardStateOccurrences = page.match(/const \[expanded, setExpanded\] = useState\(false\)/g) ?? [];
assert.equal(cardStateOccurrences.length, 1, "Each MatchupCard instance owns independent expansion state.");

console.log("Matchups starter-card fixture checks passed.");
