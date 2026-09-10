import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  draftReportV2OwnerPublicationEnabled,
  getDraftReportV2OwnerPublicationConfig,
  getDraftReportV2OwnerPublicationStatus,
} from "../lib/draftReportV2/ownerPublication";

const valid = { DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "true", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: "approved", DRAFT_REPORT_V2_OWNER_PUBLICATION_SEASON: "2026", DRAFT_REPORT_V2_OWNER_PUBLICATION_CHECKSUM: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" };
const disabled = { ...valid, DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "false" };
assert.equal(draftReportV2OwnerPublicationEnabled({}), false);
assert.equal(draftReportV2OwnerPublicationEnabled({ ...valid, DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "yes" }), false);
assert.equal(draftReportV2OwnerPublicationEnabled(disabled), false);
assert.equal(draftReportV2OwnerPublicationEnabled({ DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "true", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: "approved" }), false);
assert.equal(draftReportV2OwnerPublicationEnabled({ ...valid, DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: " TRUE ", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: " approved-2026 " }), true);
assert.deepEqual(getDraftReportV2OwnerPublicationConfig(2027, { ...valid, DRAFT_REPORT_V2_OWNER_PUBLICATION_SEASON: "2027", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: "s2027" }), { season: 2027, enabled: true, snapshotId: "s2027", expectedChecksum: valid.DRAFT_REPORT_V2_OWNER_PUBLICATION_CHECKSUM, source: "explicit-environment-gate-and-snapshot-pointer" });
assert.equal(getDraftReportV2OwnerPublicationStatus(2026, {}).enabled, false);

const ownerPage = readFileSync("app/league-info/draft-report/page.tsx", "utf8");
const commissionerPage = readFileSync("app/commish/post-draft/page.tsx", "utf8");
const ownerPreviewPage = readFileSync("app/commish/post-draft/v2/owner-preview/page.tsx", "utf8");
const ownerMenu = readFileSync("components/MemberAccountMenu.tsx", "utf8");
const presentation = readFileSync("lib/draftReportV2/ownerPresentation.ts", "utf8");
const v1 = readFileSync("app/league-info/draft-report/DraftReportCardView.tsx", "utf8");

assert.match(ownerPage, /draftReportV2OwnerPublicationEnabled/);
assert.match(ownerPage, /getOwnerDraftReportCard/);
assert.match(ownerPage, /DraftReportCardView report=\{report\}/);
assert.match(ownerPage, /if \(!report\) redirect\("\/commish\/post-draft"\)/);
assert.match(ownerPage, /requireAuctionWarRoomAccess/);
assert.match(ownerPage, /authorizedFranchiseId/);
assert.match(ownerPage, /readDraftReportV2ReviewSnapshotForOwner/);
assert.match(ownerPage, /hydrateMethodDResults/);
assert.match(ownerPage, /OwnerReport/);
assert.doesNotMatch(ownerPage, /ReportCardOverview|PostDraftClient|PostDraftRecapClient|<select/);
assert.doesNotMatch(ownerPage, /buildLiveDraftReportV2Review|freezeDraftReportV2ReviewSnapshot|fetch\(|method: "POST"/);
assert.match(commissionerPage, /getDraftReportV2OwnerPublicationStatus/);
assert.match(commissionerPage, /DISABLED/);
assert.match(commissionerPage, /ENABLED/);
assert.doesNotMatch(commissionerPage, /publish/i);
assert.match(ownerPreviewPage, /requireAuctionAccess\("maintenance"\)/);
assert.match(ownerPreviewPage, /OwnerPreviewClient/);
assert.match(ownerMenu, /\/league-info\/draft-report/);
assert.doesNotMatch(ownerMenu, /owner-preview/);
assert.match(presentation, /review\.snapshot\.teams/);
assert.match(presentation, /review\.formulaC/);
assert.match(presentation, /review\.finalGrades/);
assert.match(presentation, /review\.contributionMap/);
assert.doesNotMatch(presentation, /loadDraftReportV2SourceInput|current roster|Sleeper/);
assert.match(v1, /Draft Report Card/);

console.log("Draft Report Card V2 P9 publication architecture checks passed.");
