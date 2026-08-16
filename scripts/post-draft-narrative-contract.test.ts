import assert from "node:assert/strict";
import {
  POST_DRAFT_SNAPSHOT_SCHEMA_VERSION,
  POST_DRAFT_SNAPSHOT_STALE_SOURCE_POLICY,
  canTransitionSnapshot,
  type PostDraftSnapshot,
} from "../lib/postDraftSnapshotTypes";
import {
  POST_DRAFT_PRIVATE_NARRATIVE_VISIBILITY,
  serializePublicLeagueRecap,
  serializePublicTeamOutlook,
  type FranchiseNarrativeDraft,
  type LeagueRecapDraft,
} from "../lib/postDraftNarrativeTypes";
import {
  POST_DRAFT_FIRESTORE_PATHS,
  POST_DRAFT_PUBLICATION_SCHEMA_VERSION,
  canTransitionPublication,
  createSupersedingPublication,
  type PostDraftPublication,
} from "../lib/postDraftPublicationTypes";

const publicRecord = {
  season: 2026,
  franchiseId: "prestigio-mundial",
  rosterId: 1,
  teamName: "Prestigio Mundial",
  generatedAt: "2026-09-01T00:00:00.000Z",
  source: { draftId: "draft-2026", draftStatus: "complete", metricsSchemaVersion: "post-draft-metrics-v1" },
  coverage: { status: "complete", warnings: [], rosterValueCount: 1, valueDifferentialCount: 1, adpCount: 1, positionCount: 1 },
  metrics: {
    totalSpend: 180, remainingBudget: 20, positionSpend: {}, positionCounts: { WR: 1 }, rosterSize: 1, starterCount: 1, benchDepthCount: 0,
    rosterValue: 250, valueDifferential: { total: 40, average: 40, comparablePlayerCount: 1 }, bestBuy: { playerId: "p1", playerName: "Value Player", position: "WR", purchasePrice: 10, publishedValue: 50, valueDifferential: 40, adp: 20 }, biggestReach: null,
    keeperCount: 0, totalKeeperCost: 0, keeperPublishedValue: 0, keeperValueDifferential: 0, nonKeeperAuctionSpend: 180, adpContext: { acquiredPlayerCount: 1, playersWithAdp: 1, averageAcquisitionAdp: 20 }, powerRanking: { rank: 1, rosterValue: 250, averageSOS: 50, rawScore: 200, normalizedIndex: 10, coverage: "complete", status: "Preseason Outlook" }, requiredStarterSlots: { WR: 1 }, coveredStarterSlots: 1, uncoveredStarterSlots: 0, starterCoverageByPosition: {}, depthByPosition: {}, totalDepth: 0, depthCoverageStatus: "complete", rosterSlotCapacity: 16, rosterCompleteness: { filledSlots: 1, capacity: 16, ratio: 0.0625, status: "partial" },
  },
} as any;

const grade = { letterGrade: "A", draftScore: 93 } as any;
const snapshot = {
  snapshotId: "snapshot-2026-001", schemaVersion: POST_DRAFT_SNAPSHOT_SCHEMA_VERSION, snapshotStatus: "locked", season: 2026, draftId: "draft-2026", sleeperDraftStatus: "complete", generatedAt: "2026-09-01T00:00:00.000Z", sourceTimestamps: ["2026-09-01T00:00:00.000Z"], modelVersions: { metrics: "post-draft-metrics-v1", draftGrade: "river-city-draft-grade-v1", strategyExecution: "river-city-strategy-execution-v1", powerRankings: "canonical-power-rankings-v1" }, provenance: { sleeperDraftId: "draft-2026", sleeperDraftStatus: "complete", sleeperGeneratedAt: "2026-09-01T00:00:00.000Z", auctionValueRunId: "values-1", auctionValueGeneratedAt: "2026-08-31T00:00:00.000Z", adpRunId: "adp-1", adpGeneratedAt: "2026-08-31T00:00:00.000Z", draftGradeModelVersion: "river-city-draft-grade-v1", strategyExecutionModelVersion: "river-city-strategy-execution-v1", powerRankingsGeneratedAt: "2026-09-01T00:00:00.000Z", powerRankingsVersion: "canonical-power-rankings-v1" }, publicRecords: [{ publicRecord, draftGrade: grade, powerRanking: null }], privateRecords: [], coverage: { status: "complete", warnings: [] },
} as unknown as PostDraftSnapshot;

const narrative: FranchiseNarrativeDraft = {
  franchiseId: "prestigio-mundial", season: 2026, snapshotId: snapshot.snapshotId, status: "approved", revision: 1, createdAt: snapshot.generatedAt, updatedAt: snapshot.generatedAt, updatedBy: "ray-canonical-owner", approvedAt: snapshot.generatedAt, approvedBy: "ray-canonical-owner", strengths: ["Strong value capture"], concerns: ["Starter depth"], bestBuyCommentary: "Value edge", biggestReachCommentary: null, xFactor: "Roster health", rosterOutlook: "Competitive roster-strength outlook", commissionerTake: "Factual commissioner take", privateStrategyTake: "Private strategy", trashTalk: "Private only", internalNotes: "Internal only",
};

const outlook = serializePublicTeamOutlook({ snapshot, record: snapshot.publicRecords[0], narrative, publicationVersion: "publication-1", publishedAt: snapshot.generatedAt });
assert.equal(POST_DRAFT_PRIVATE_NARRATIVE_VISIBILITY, "commissioner-only");
const outlookJson = JSON.stringify(outlook);
assert.equal(outlook.franchiseId, "prestigio-mundial");
assert.equal(outlook.draftGrade, "A");
assert.doesNotMatch(outlookJson, /target|missed|plannedCap|variance|strategy|note|preferredEntry|warRoom|email|uid|playoff|championship/i);

const recap: LeagueRecapDraft = {
  season: 2026, snapshotId: snapshot.snapshotId, status: "approved", revision: 1, createdAt: snapshot.generatedAt, updatedAt: snapshot.generatedAt, updatedBy: "ray-canonical-owner", approvedAt: snapshot.generatedAt, approvedBy: "ray-canonical-owner", title: "Draft Recap", dek: "Public recap", openingCommissionerTake: "Opening", draftGradeLeaderboard: [{ franchiseId: "prestigio-mundial", teamName: "Prestigio Mundial", grade: "A" }], biggestBargains: [], biggestReaches: [], spendingTrends: [], positionTrends: [], earlyPowerRankings: [{ franchiseId: "prestigio-mundial", teamName: "Prestigio Mundial", rank: 1 }], teamOneLiners: [], notableDraftDecisions: [], closingTake: "Closing", teamOutlookLinks: [], privateStrategyLeaderboard: [], internalNotes: "Internal",
};
const publicRecap = serializePublicLeagueRecap(recap, "publication-1", snapshot.generatedAt);
const publicRecapKeys = Object.keys(publicRecap).join(" ");
assert.doesNotMatch(publicRecapKeys, /privateStrategyLeaderboard|internalNotes|target|cap|strategy|preferredEntry|warRoom|email|uid/i);

assert.equal(canTransitionSnapshot("draft", "validated"), true);
assert.equal(canTransitionSnapshot("validated", "locked"), true);
assert.equal(canTransitionSnapshot("locked", "draft"), false);
assert.equal(POST_DRAFT_SNAPSHOT_STALE_SOURCE_POLICY.sleeperDraftIncomplete, "fail");
assert.equal(POST_DRAFT_SNAPSHOT_STALE_SOURCE_POLICY.activeRunChanged, "fail");
assert.equal(POST_DRAFT_SNAPSHOT_STALE_SOURCE_POLICY.requiredValueCoverageDegraded, "warn");

assert.equal(canTransitionPublication("approved", "published"), true);
assert.equal(canTransitionPublication("published", "unpublished"), true);
assert.equal(canTransitionPublication("published", "approved"), false);
const previous: PostDraftPublication = { publicationId: "publication-1", schemaVersion: POST_DRAFT_PUBLICATION_SCHEMA_VERSION, season: 2026, snapshotId: snapshot.snapshotId, narrativeId: "snapshot-2026-001:prestigio-mundial:r1", narrativeRevision: 1, revision: 1, status: "published", createdAt: snapshot.generatedAt, updatedAt: snapshot.generatedAt, approvedAt: snapshot.generatedAt, publishedAt: snapshot.generatedAt, supersedes: null, previousVersionId: null, approval: { approvedBy: "ray-canonical-owner", approvedAt: snapshot.generatedAt, approvalNote: null }, createdBy: "ray-canonical-owner", sourceMetadata: { snapshotGeneratedAt: snapshot.generatedAt, metricsModelVersion: "metrics-v1", draftGradeModelVersion: "draft-grade-v1", strategyExecutionModelVersion: "strategy-v1", powerRankingsVersion: "rankings-v1" }, rollbackFrom: null, rollbackAt: null, publicTeamOutlooks: [outlook], publicLeagueRecap: publicRecap };
const next = createSupersedingPublication({ previous, publicationId: "publication-2", snapshotId: "snapshot-2026-002", createdAt: "2026-09-02T00:00:00.000Z", content: { publicTeamOutlooks: [outlook], publicLeagueRecap: publicRecap } });
assert.equal(next.revision, 2);
assert.equal(next.previousVersionId, previous.publicationId);
assert.equal(next.supersedes, previous.publicationId);
assert.equal(next.status, "approved");
assert.deepEqual(POST_DRAFT_FIRESTORE_PATHS, { snapshots: "post_draft_snapshots", narratives: "post_draft_narratives", publications: "post_draft_publications", activePublicationPointers: "post_draft_publication_pointers" });

console.log("Post-draft narrative contract checks passed.");
