import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const route = readFileSync("app/api/matchups/history/route.ts", "utf8");
const opponentRoute = readFileSync(
  "app/managers/owners/[owner]/opponents/[opponent]/page.tsx",
  "utf8"
);

const approvedHistoryFixture = {
  supported: true,
  owner: "Ray Long",
  opponent: "Wade Cameron",
  competitiveRecord: "7-4",
  completedMeetings: "12",
  latestMeeting: { season: 2025, scoreLabel: "Wade Cameron 142.3, Ray Long 137.8", contextLabel: "Week 14" },
  href: "/managers/owners/ray-long/opponents/wade-cameron",
};

assert.match(page, /HistoryContext/);
assert.match(page, /Historical Context/);
assert.match(page, /competitive record excludes secondary classifications/);
assert.match(page, /latestMeeting\.season/);
assert.match(page, /View Full Head-to-Head/);
assert.match(page, /Recent Meetings/);
assert.match(page, /View Rivalry Hub/);
assert.match(page, /Historical Head-to-Head not available\./);
assert.match(page, /if \(!history\)/);
assert.match(page, /loadMatchupHistory/);
assert.match(page, /getOwnerId/);
assert.match(page, /sleeperIds\?\.includes/);
assert.match(page, /matchupHistory\[pair\]/);
assert.match(page, /const \[expanded, setExpanded\] = useState\(false\)/);
assert.match(page, /StarterList label=\{team1\.name\}/);
assert.match(page, /StarterList label=\{team2\.name\}/);

assert.match(route, /loadOwnerHeadToHeadPresentation/);
assert.match(route, /competitiveMetrics/);
assert.match(route, /allMeetingMetrics/);
assert.match(route, /seriesContext\.latestMeeting/);
assert.match(route, /supported: false/);
assert.match(opponentRoute, /dynamic = "force-dynamic"/);
assert.doesNotMatch(opponentRoute, /generateStaticParams|loadOwnerHeadToHeadStaticParams/);
assert.match(opponentRoute, /loadOwnerHeadToHeadPresentation/);
assert.equal(approvedHistoryFixture.competitiveRecord, "7-4");
assert.equal(approvedHistoryFixture.completedMeetings, "12");
assert.equal(approvedHistoryFixture.latestMeeting.season, 2025);
assert.equal(approvedHistoryFixture.href, "/managers/owners/ray-long/opponents/wade-cameron");

assert.doesNotMatch(page, /buildCanonicalMatchups|buildOwnerMatchupSummaries|calculate.*record/);
assert.doesNotMatch(route, /rivalryScore|co_owners|playerResolver/);

console.log("Matchups history fixture checks passed.");
