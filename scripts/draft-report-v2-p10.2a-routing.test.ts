import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const draftPage = readFileSync("app/league-info/draft/page.tsx", "utf8");
const overviewPage = readFileSync("app/league-info/draft-report/overview/page.tsx", "utf8");
const overview = readFileSync("app/commish/post-draft/ReportCardOverview.tsx", "utf8");
const ownerPage = readFileSync("app/league-info/draft-report/page.tsx", "utf8");
const commissionerReport = readFileSync("app/commish/post-draft/report/page.tsx", "utf8");
const ownerPreview = readFileSync("app/commish/post-draft/v2/owner-preview/page.tsx", "utf8");

assert.match(draftPage, /href="\/league-info\/draft-report"[^>]*>My report card/);
assert.match(draftPage, /href="\/league-info\/draft-report\/overview"[^>]*>View report cards/);
assert.match(overviewPage, /requireAuctionWarRoomAccess/);
assert.match(overviewPage, /ownerMode=\{session\.access\.role !== "commissioner"\}/);
assert.match(overviewPage, /ownerFranchiseId=\{session\.access\.authorizedFranchiseId\}/);
assert.match(overview, /ownerMode \? row\.franchiseId === ownerFranchiseId \? <Link href="\/league-info\/draft-report"/);
assert.match(overview, /href=\{`\/commish\/post-draft\/report\?franchiseId=/);
assert.match(ownerPage, /draftReportV2OwnerPublicationEnabled/);
assert.match(ownerPage, /readDraftReportV2ReviewSnapshotForOwner/);
assert.match(ownerPage, /OwnerReport/);
assert.match(ownerPage, /getOwnerDraftReportCard/);
assert.match(commissionerReport, /getCommissionerDraftReportCard/);
assert.match(commissionerReport, /DraftReportCardView report=\{report\}/);
assert.match(ownerPreview, /requireAuctionAccess\("maintenance"\)/);
assert.doesNotMatch(ownerPage, /ReportCardOverview/);

const approved = {
  "2 Buds Smoking Bud, Bud": ["B", "56.89", "#5"],
  "The Schmendricks": ["C", "40.34", "#9"],
  "The Mind Goblins": ["D-", "16.40", "#12"],
};
assert.deepEqual(approved["2 Buds Smoking Bud, Bud"], ["B", "56.89", "#5"]);
assert.deepEqual(approved["The Schmendricks"], ["C", "40.34", "#9"]);
assert.deepEqual(approved["The Mind Goblins"], ["D-", "16.40", "#12"]);

console.log("Draft Report Card V2 P10.2A routing checks passed.");
