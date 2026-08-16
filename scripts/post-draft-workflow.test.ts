import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canTransitionPublication } from "../lib/postDraftPublicationTypes";
import { canTransitionSnapshot } from "../lib/postDraftSnapshotTypes";

const workflow = readFileSync("lib/postDraftWorkflow.ts", "utf8");
const route = readFileSync("app/api/commish/post-draft/route.ts", "utf8");
const page = readFileSync("app/commish/post-draft/page.tsx", "utf8");
const client = readFileSync("app/commish/post-draft/PostDraftClient.tsx", "utf8");

assert.match(workflow, /requireAuctionAccess\("maintenance"\)/);
assert.match(workflow, /getPostDraftMetrics/);
assert.match(workflow, /calculatePrivatePostDraftMetrics/);
assert.match(workflow, /calculateStrategyExecution/);
assert.match(workflow, /privateRecords/);
assert.match(workflow, /calculatePublicDraftGrades/);
assert.match(workflow, /readPublishedMasterviewFromFirestore/);
assert.match(workflow, /readPublishedAdpConsensusFromFirestore/);
assert.match(workflow, /create\(/);
assert.match(workflow, /runTransaction/);
assert.match(workflow, /Only locked snapshots can create narratives/);
assert.match(workflow, /changed since it was loaded/);
assert.match(workflow, /serializePublicTeamOutlook/);
assert.match(workflow, /Every canonical franchise must have a public snapshot record/);
assert.doesNotMatch(workflow, /firestore\.collection\("(?:siteContent|proposals)"\)/);

assert.match(route, /capture-snapshot/);
assert.match(route, /save-narrative/);
assert.match(route, /transition-narrative/);
assert.match(route, /preview-narrative/);
assert.match(page, /requirement|PostDraftClient/);
assert.match(client, /PUBLIC CANDIDATE/);
assert.match(client, /PRIVATE \/ COMMISSIONER ONLY/);
assert.match(client, /Preview public-safe output/);
assert.match(client, /Nothing was published/);

assert.equal(canTransitionSnapshot("draft", "validated"), true);
assert.equal(canTransitionSnapshot("validated", "locked"), true);
assert.equal(canTransitionSnapshot("locked", "draft"), false);
assert.equal(canTransitionPublication("approved", "published"), true);
assert.equal(canTransitionPublication("published", "approved"), false);

console.log("Post-draft commissioner workflow checks passed.");
