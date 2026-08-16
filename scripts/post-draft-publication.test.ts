import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { POST_DRAFT_FIRESTORE_PATHS, canTransitionPublication } from "../lib/postDraftPublicationTypes";

const service = readFileSync("lib/postDraftPublication.ts", "utf8");
const route = readFileSync("app/api/commish/post-draft/route.ts", "utf8");
const client = readFileSync("app/commish/post-draft/PostDraftClient.tsx", "utf8");
const page = readFileSync("app/commish/post-draft/page.tsx", "utf8");
const narrative = readFileSync("lib/postDraftNarrativeTypes.ts", "utf8");

assert.match(service, /requireAuctionAccess\("maintenance"\)/);
assert.match(service, /snapshotStatus !== "locked"/);
assert.match(service, /narrative\.status !== "approved"/);
assert.match(service, /serializePublicTeamOutlook/);
assert.match(service, /runTransaction/);
assert.match(service, /transaction\.create\(publicationRef/);
assert.match(service, /status: "superseded"/);
assert.match(service, /status: "unpublished"/);
assert.match(service, /getPublishedTeamOutlook/);
assert.match(service, /activeByFranchise/);
assert.match(service, /previousVersionId/);
assert.match(service, /narrativeId/);
assert.match(service, /narrativeRevision/);
assert.match(service, /rollbackFrom/);
assert.doesNotMatch(service, /targetIdentities|plannedCaps|preferredEntry|trashTalk/);

assert.match(route, /publish-narrative/);
assert.match(route, /unpublish-publication/);
assert.match(route, /rollback-publication/);
assert.match(route, /listPostDraftPublications/);
assert.match(page, /initialPublications/);
assert.match(client, /APPROVED does not mean PUBLISHED/);
assert.match(client, /Publish/);
assert.match(client, /Unpublish/);
assert.match(client, /Roll back to revision/);
assert.match(client, /public-safe output/);
assert.match(narrative, /serializePublicTeamOutlook/);

assert.equal(canTransitionPublication("approved", "published"), true);
assert.equal(canTransitionPublication("published", "unpublished"), true);
assert.equal(canTransitionPublication("published", "superseded"), true);
assert.equal(canTransitionPublication("published", "approved"), false);
assert.deepEqual(POST_DRAFT_FIRESTORE_PATHS.publications, "post_draft_publications");
assert.deepEqual(POST_DRAFT_FIRESTORE_PATHS.activePublicationPointers, "post_draft_publication_pointers");

console.log("Post-draft publication architecture checks passed.");
