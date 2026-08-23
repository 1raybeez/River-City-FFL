import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  COMMISSIONER_NOTE_MAX_LENGTH,
  countCommissionerFeedbackByStatus,
  filterCommissionerFeedback,
  FEEDBACK_STATUSES,
  normalizeCommissionerFeedbackRecord,
  sortCommissionerFeedback,
} from "../lib/feedback";

const api = readFileSync("app/api/commish/feedback/route.ts", "utf8");
const server = readFileSync("lib/feedbackServer.ts", "utf8");
const page = readFileSync("app/commish/feedback/page.tsx", "utf8");
const client = readFileSync("app/commish/feedback/CommissionerFeedbackQueue.tsx", "utf8");
const hub = readFileSync("app/commish/page.tsx", "utf8");
const rules = readFileSync("firestore.rules", "utf8");
const ownerApi = readFileSync("app/api/feedback/route.ts", "utf8");

assert.match(api, /requireAuctionAccess\("maintenance"\)/g);
assert.match(api, /AuctionAccessError/);
assert.match(api, /validateJsonMutationRequest/);
assert.match(server, /FEEDBACK_STATUSES/);
assert.deepEqual(FEEDBACK_STATUSES, ["OPEN", "PLANNED", "DONE", "DECLINED"]);
assert.equal(COMMISSIONER_NOTE_MAX_LENGTH, 2000);
assert.match(api, /commissionerNote/);
assert.match(server, /commissionerNote/);
assert.match(server, /actor\.email/);
assert.match(server, /statusUpdatedAt/);
assert.match(server, /FieldValue\.serverTimestamp\(\)/);
assert.doesNotMatch(server, /\.delete\(|deleteDoc|delete\(/);
assert.doesNotMatch(api, /\.delete\(|deleteDoc|delete\(/);
assert.doesNotMatch(client, /deleteDoc|\.delete\(/);
assert.match(rules, /match \/site_feedback\/{document}[\s\S]*allow read, write: if false/);
assert.doesNotMatch(ownerApi, /commissionerNote/);
assert.match(page, /requireAuctionAccess\("maintenance"\)/);
assert.match(hub, /Site Feedback/);
assert.match(hub, /\/commish\/feedback/);
assert.match(client, /Loading site feedback/);
assert.match(client, /No feedback has been submitted yet/);
assert.match(client, /No feedback matches these filters/);
assert.match(client, /role="alert"/);
assert.match(client, /aria-expanded/);
assert.match(client, /Save changes/);

const records = [
  normalizeCommissionerFeedbackRecord("new", { type: "BUG", title: "New", description: "", area: "HOME", status: "OPEN", submittedAt: "2026-08-23T12:00:00Z" }),
  normalizeCommissionerFeedbackRecord("old", { type: "SUGGESTION", title: "Old", description: "", area: "DRAFT", status: "DONE", submittedAt: "2026-08-22T12:00:00Z" }),
];
assert.deepEqual(sortCommissionerFeedback(records).map((record) => record.id), ["new", "old"]);
assert.deepEqual(filterCommissionerFeedback(records, { type: "BUG", status: "ALL", area: "ALL" }).map((record) => record.id), ["new"]);
assert.deepEqual(countCommissionerFeedbackByStatus(records), { OPEN: 1, PLANNED: 0, DONE: 1, DECLINED: 0 });
assert.equal(normalizeCommissionerFeedbackRecord("private", { submittedByOwnerProfileId: "owner", email: "owner@example.com", uid: "uid" }).submittedByDisplayName, "Unknown owner");
assert.doesNotMatch(client, /submittedByOwnerProfileId|email|uid/);

console.log("Commissioner feedback queue checks passed.");
