import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/postDraftRecap.ts", "utf8");
const route = readFileSync("app/api/commish/post-draft/route.ts", "utf8");
const client = readFileSync("app/commish/post-draft/PostDraftRecapClient.tsx", "utf8");
const publication = readFileSync("lib/postDraftPublication.ts", "utf8");
const narrativeTypes = readFileSync("lib/postDraftNarrativeTypes.ts", "utf8");

assert.match(service, /requireAuctionAccess\("maintenance"\)/);
assert.match(service, /snapshotStatus !== "locked"/);
assert.match(service, /coverage\.status !== "complete"/);
assert.match(service, /canonicalAuctionTeams\.length/);
assert.match(service, /serializePublicLeagueRecap/);
assert.match(service, /runTransaction/);
assert.match(service, /activeLeagueRecapId/);
assert.match(service, /draftGradeLeaderboard/);
assert.match(service, /biggestBargains/);
assert.match(service, /biggestReaches/);
assert.match(service, /positionTrends/);
assert.match(service, /earlyPowerRankings/);
assert.match(service, /teamOneLiners/);
assert.match(service, /notableDraftDecisions/);
const serializerBody = narrativeTypes.slice(narrativeTypes.indexOf("export function serializePublicLeagueRecap"), narrativeTypes.indexOf("export type NarrativeSourceParts"));
assert.doesNotMatch(serializerBody, /privateStrategyTake|trashTalk|internalNotes|targetHitRate|plannedCaps|preferredEntry/);

assert.match(route, /create-recap/);
assert.match(route, /save-recap/);
assert.match(route, /transition-recap/);
assert.match(route, /publish-recap/);
assert.match(route, /unpublish-recap/);
assert.match(route, /rollback-recap/);
assert.match(client, /Deterministic \/ Read-Only/);
assert.match(client, /Commissioner-editable fields saved/);
assert.match(client, /Publish/);
assert.match(client, /Unpublish/);
assert.match(client, /Roll Back Revision/);
assert.match(publication, /getPublishedTeamOutlookPublication/);

console.log("Post-draft league recap checks passed.");
