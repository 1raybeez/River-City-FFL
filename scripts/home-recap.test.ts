import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");
const recapService = readFileSync("lib/postDraftRecap.ts", "utf8");
const publicContract = readFileSync("lib/postDraftNarrativeTypes.ts", "utf8");

assert.match(page, /getPublishedLeagueRecap\(2026\)/);
assert.match(page, /initialPublishedRecap/);
assert.match(home, /initialPublishedRecap/);
assert.match(home, /if \(!initialPublishedRecap\) fetchLegacyRecap\(\)/);
assert.match(home, /publishedRecap\?\.title/);
assert.match(home, /PublishedRecapDetail/);
assert.match(home, /draftGradeLeaderboard/);
assert.match(home, /row\.draftScore/);
assert.match(home, /biggestBargains/);
assert.match(home, /biggestReaches/);
assert.match(home, /Spending Trends/);
assert.match(home, /Position Trends/);
assert.match(home, /roster-strength context, not odds/);
assert.match(home, /teamOneLiners/);
assert.match(home, /Notable Draft Decisions/);
assert.match(home, /teamOutlookLinks/);
assert.match(home, /href=\{link\.href\}/);
assert.doesNotMatch(home, /publicationId/);
assert.match(home, /if \(items\.length === 0\) return null/);
assert.match(recapService, /activeLeagueRecapId/);
assert.match(recapService, /status === "published"/);
assert.match(publicContract, /export type PublicLeagueRecap/);
assert.doesNotMatch(home, /privateStrategyLeaderboard|internalNotes|preferredEntry|plannedCaps|targetIdentities|War Room ID/i);
assert.match(home, /boxOneState\.title/);
assert.match(home, /Reigning Champion/);
assert.match(home, /2026 Matchups/);
assert.match(home, /Legislative Hub/);
assert.match(home, /Recent Recap/);

console.log("Home published-recap integration checks passed.");
