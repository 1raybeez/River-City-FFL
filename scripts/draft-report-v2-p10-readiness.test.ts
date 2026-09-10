import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { firestore } from "../lib/firebaseAdmin";
import { franchises, ownerProfilesById } from "../lib/managers/identityData";
import { hydrateMethodDResults } from "../lib/draftReportV2/finalGrade";
import { draftReportV2OwnerPublicationEnabled, getDraftReportV2OwnerPublicationConfig, isDraftReportV2OwnerPublicationReviewValid } from "../lib/draftReportV2/ownerPublication";

const SNAPSHOT_ID = "draft-report-v2-92cbc6b4607098d5";
const CHECKSUM = "92cbc6b4607098d54e1b2a34fc2a31d06bd5d9c8503d3a7182f6927c34650662";
const EVIDENCE_AS_OF = "2026-08-26T00:40:55.683Z";
const expected = [
  ["Nudas Priest", "hawkins-heroes", ["Aaron Hawkins"], "Hawkins Heroes", "A+", 96.99, 1],
  ['The Mad "Panda"', "the-art-of-war", ["JD Dowling"], "The Art of War", "A", 74.66, 2],
  ["The Bowers That Be", "shake-n-bakers", ["Jordan Maslyn", "Landon Elliott"], "The Shake-N-Bakers", "B+", 62.49, 3],
  ["Carolina Reapers", "the-wildcard", ["Wade Cameron"], "The Wildcard", "B", 58.04, 4],
  ["2 Buds Smoking Bud, Bud", "prestigio-mundial", ["Ray Long", "Jeffrey Hudgins"], "Prestigio Mundial", "B", 56.89, 5],
  ["Richmond Bengals", "hall-pass", ["Doug Fordham"], "Hall Pass", "B-", 52.79, 6],
  ["It’s a New Day", "buckeye-nation", ["Brian Stevens"], "Buckeye Nation", "C+", 48.54, 7],
  ["Trash Pandas", "kissed-by-a-freckle", ["Travis Miller"], "Kissed by a Freckle", "C", 43.13, 8],
  ["The Schmendricks", "the-bearded-one", ["David Besedich"], "The Bearded One", "C", 40.34, 9],
  ["Stanal Fissures", "tax-season", ["Stan Schoppe"], "Tax Season", "D", 25.22, 10],
  ["#FuckTSwift", "the-gresham-empire", ["Rashad Gresham"], "The Gresham Empire", "D", 20.82, 11],
  ["The Mind Goblins", "the-shepherd", ["Tommy Moore"], "The Shepherd", "D-", 16.4, 12],
] as const;

assert.equal(draftReportV2OwnerPublicationEnabled({}), false);
const validConfig = { DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "true", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: SNAPSHOT_ID, DRAFT_REPORT_V2_OWNER_PUBLICATION_SEASON: "2026", DRAFT_REPORT_V2_OWNER_PUBLICATION_CHECKSUM: CHECKSUM };
assert.equal(draftReportV2OwnerPublicationEnabled({ ...validConfig, DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "false" }), false);
assert.equal(draftReportV2OwnerPublicationEnabled({ ...validConfig, DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "malformed" }), false);
assert.equal(draftReportV2OwnerPublicationEnabled({ DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "true", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: SNAPSHOT_ID }), false);
assert.equal(draftReportV2OwnerPublicationEnabled(validConfig), true);
assert.equal(getDraftReportV2OwnerPublicationConfig(2026, validConfig).snapshotId, SNAPSHOT_ID);

const ownerPage = readFileSync("app/league-info/draft-report/page.tsx", "utf8");
const ownerPreview = readFileSync("app/commish/post-draft/v2/owner-preview/page.tsx", "utf8");
const commissionerPage = readFileSync("app/commish/post-draft/page.tsx", "utf8");
const ownerClient = readFileSync("app/commish/post-draft/v2/owner-preview/OwnerPreviewClient.tsx", "utf8");
const presentation = readFileSync("lib/draftReportV2/ownerPresentation.ts", "utf8");
assert.match(ownerPage, /getOwnerDraftReportCard/);
assert.match(ownerPage, /DraftReportCardView report=\{report\}/);
assert.match(ownerPage, /readDraftReportV2ReviewSnapshotForOwner/);
assert.match(ownerPage, /authorizedFranchiseId/);
assert.match(ownerPage, /OwnerReport/);
assert.match(ownerPage, /isDraftReportV2OwnerPublicationReviewValid/);
assert.match(ownerPage, /catch \{/);
assert.doesNotMatch(ownerPage, /buildLiveDraftReportV2Review|freezeDraftReportV2ReviewSnapshot|ReportCardOverview|PostDraftClient|<select/);
assert.match(ownerPreview, /requireAuctionAccess\("maintenance"\)/);
assert.match(commissionerPage, /DISABLED/);
assert.match(presentation, /review\.snapshot\.teams/);
assert.match(ownerClient, /export function OwnerReport/);
assert.doesNotMatch(ownerClient, /snapshotId|inputChecksum|modelVersions|JSON\.stringify|robust-z|percentile|Method D/);

async function main() {
  const doc = await firestore.collection("draft_report_v2_review_snapshots").doc(SNAPSHOT_ID).get();
  assert.equal(doc.exists, true);
  const persisted = doc.data() as any;
  assert.equal(persisted.snapshot.snapshotId, SNAPSHOT_ID);
  assert.equal(persisted.snapshot.inputChecksum, CHECKSUM);
  assert.equal(persisted.snapshot.evidenceAsOf, EVIDENCE_AS_OF);
  assert.equal(persisted.snapshot.season, 2026);
  assert.equal(persisted.finalGrades, undefined);

  const review = hydrateMethodDResults(persisted);
  assert.equal(review.finalGrades.length, 12);
  const validConfig = getDraftReportV2OwnerPublicationConfig(2026, { DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED: "true", DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID: SNAPSHOT_ID, DRAFT_REPORT_V2_OWNER_PUBLICATION_SEASON: "2026", DRAFT_REPORT_V2_OWNER_PUBLICATION_CHECKSUM: CHECKSUM });
  assert.equal(isDraftReportV2OwnerPublicationReviewValid(review, validConfig), true);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, snapshot: { ...review.snapshot, inputChecksum: "wrong" } }, validConfig), false);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, snapshot: { ...review.snapshot, season: 2025 } }, validConfig), false);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, formulaC: review.formulaC.slice(0, 11) }, validConfig), false);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, auctionEfficiency: { ...review.auctionEfficiency, teams: review.auctionEfficiency.teams.slice(0, 11) } }, validConfig), false);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, finalGrades: undefined }, validConfig), false);
  assert.equal(isDraftReportV2OwnerPublicationReviewValid({ ...review, snapshot: { ...review.snapshot, teams: [...review.snapshot.teams.slice(0, 11), { ...review.snapshot.teams[11], franchiseId: "unexpected-franchise" }] } }, validConfig), false);
  for (const [teamName, franchiseId, owners, draftName, grade, score, rank] of expected) {
    const team = persisted.snapshot.teams.find((candidate: any) => candidate.franchiseId === franchiseId);
    const franchise = franchises.find((candidate) => candidate.id === franchiseId);
    const actualOwners = (franchise?.activeOwnerIds ?? []).map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId);
    const result = review.finalGrades.find((candidate: any) => candidate.franchiseId === franchiseId);
    assert.deepEqual([team?.currentDisplayName, actualOwners, team?.historicalDraftTimeTeamName, result?.grade, result?.methodDScore, result?.overallRank], [teamName, owners, draftName, grade, score, rank]);
  }
  console.log("Draft Report Card V2 P10.1 readiness checks passed.");
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
