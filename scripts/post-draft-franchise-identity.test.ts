import assert from "node:assert/strict";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { buildCommissionerPostDraftIndex } from "../lib/commissionerPostDraftIndex";
import { postDraftReportFranchiseId, postDraftSourceFranchiseId } from "../lib/postDraftFranchiseIdentity";

const reportIds = canonicalAuctionTeams.map((team) => postDraftReportFranchiseId(team.franchiseId));
assert.equal(reportIds.length, 12);
assert.equal(new Set(reportIds).size, 12);
assert.ok(reportIds.includes("nudas-priest"));
assert.equal(postDraftSourceFranchiseId("nudas-priest"), "hawkins-heroes");
assert.equal(postDraftReportFranchiseId("nudas-priest"), "nudas-priest");

const records = reportIds.map((franchiseId, index) => ({ franchiseId, rosterId: index + 1, metrics: { powerRanking: { rank: null }, totalSpend: 0, remainingBudget: 200 }, }));
const index = buildCommissionerPostDraftIndex({ records } as never, { records: reportIds.map((franchiseId) => ({ franchiseId, status: "not-ready", draftScore: null, letterGrade: null })) } as never);
assert.deepEqual(index.map((row) => row.franchiseId).sort(), reportIds.slice().sort());
assert.ok(index.every((row) => reportIds.includes(row.franchiseId)));
console.log("Post-draft franchise identity checks passed.");
