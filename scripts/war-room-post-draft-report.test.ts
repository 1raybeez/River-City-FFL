import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assembleWarRoomPostDraftReport } from "../lib/warRoomPostDraftReport";
import type { PostDraftPrivateResult, PostDraftPublicResult } from "../lib/postDraftMetrics";

const service = readFileSync("lib/warRoomPostDraftReport.ts", "utf8");
const page = readFileSync("app/commish/auction/report/page.tsx", "utf8");
const warRoom = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");

assert.match(service, /requireAuctionWarRoomAccess/);
assert.match(service, /getPostDraftMetrics/);
assert.match(service, /calculatePublicDraftGrades/);
assert.match(service, /calculateStrategyExecution/);
assert.match(service, /sourceDraftStatus !== "complete"/);
assert.doesNotMatch(service, /firestore\.(set|add|update|delete)/);
assert.doesNotMatch(service, /preferredEntry.*score|additionalNotes.*score|trashTalk|narrative/i);
assert.match(page, /Post-Draft Report/);
assert.match(page, /Back to War Room/);
assert.match(page, /Target Execution/);
assert.match(page, /Cap Discipline/);
assert.match(page, /Value Analysis/);
assert.match(warRoom, /href="\/commish\/auction\/report"/);

const publicRecord = {
  season: 2026,
  franchiseId: "prestigio-mundial",
  rosterId: 1,
  teamName: "Prestigio Mundial",
  generatedAt: "2026-09-01T00:00:00.000Z",
  source: { draftId: "draft-2026", draftStatus: "complete", metricsSchemaVersion: "post-draft-metrics-v1" },
  coverage: { status: "complete", warnings: [], rosterValueCount: 10, valueDifferentialCount: 10, adpCount: 10, positionCount: 10 },
  metrics: {
    totalSpend: 180,
    remainingBudget: 20,
    positionSpend: { WR: { totalSpend: 80, playerCount: 4, shareOfTotalSpend: 0.44 } },
    positionCounts: { WR: 4 },
    rosterSize: 10,
    starterCount: 8,
    benchDepthCount: 2,
    rosterValue: 250,
    valueDifferential: { total: 40, average: 4, comparablePlayerCount: 10 },
    bestBuy: null,
    biggestReach: null,
    keeperCount: 0,
    totalKeeperCost: 0,
    keeperPublishedValue: null,
    keeperValueDifferential: null,
    nonKeeperAuctionSpend: 180,
    adpContext: { acquiredPlayerCount: 10, playersWithAdp: 10, averageAcquisitionAdp: 35 },
    powerRanking: { rank: 3, rosterValue: 250, averageSOS: 50, rawScore: 200, normalizedIndex: 80, coverage: "complete", status: "Preseason Outlook" },
    requiredStarterSlots: { WR: 2 },
    coveredStarterSlots: 2,
    uncoveredStarterSlots: 0,
    starterCoverageByPosition: {},
    depthByPosition: { WR: 1 },
    totalDepth: 1,
    depthCoverageStatus: "complete",
    rosterSlotCapacity: 16,
    rosterCompleteness: { filledSlots: 10, capacity: 16, ratio: 0.625, status: "partial" },
  },
} as any;

const privateResult = {
  status: "ready",
  warnings: [],
  records: [{
    ...publicRecord,
    privateMetrics: {
      warRoomId: "2026:prestigio-mundial",
      targetCount: 1,
      acquiredTargetCount: 1,
      targetHitRate: 1,
      acquiredTargets: [{ playerId: "p1", playerName: "Target One" }],
      missedTargets: [],
      capDiscipline: {
        cappedPurchases: 1,
        underOrAtCapCount: 1,
        overCapCount: 0,
        totalDollarsOverCap: 0,
        averageCapVariance: 0,
        purchaseCapScores: [100],
        capPurchases: [{ playerId: "p1", playerName: "Target One", plannedCap: 40, purchasePrice: 40, variance: 0, purchaseCapScore: 100 }],
        unavailableCount: 9,
      },
      preferredEntryDiscipline: { availableCount: 1, comparableCount: 1, averagePurchaseVsEntryVariance: 0, unavailableCount: 9 },
      strategyCoverage: "complete",
    },
  }],
} as PostDraftPrivateResult;

const readyPublic = { status: "ready", season: 2026, generatedAt: publicRecord.generatedAt, sourceDraftId: "draft-2026", sourceDraftStatus: "complete", metricsSchemaVersion: "post-draft-metrics-v1", records: [publicRecord], warnings: [] } as PostDraftPublicResult;
const gradeResult = { season: 2026, generatedAt: publicRecord.generatedAt, gradeModelVersion: "river-city-draft-grade-v1", records: [{ franchiseId: "prestigio-mundial", status: "ready", draftScore: 85, letterGrade: "B", valueEfficiency: { score: 85, baseWeight: 35, effectiveWeight: 35, status: "complete", warnings: [], explanation: {} }, rosterConstruction: { score: 80, baseWeight: 30, effectiveWeight: 30, status: "complete", warnings: [], explanation: {} }, budgetManagement: { score: 90, baseWeight: 20, effectiveWeight: 20, status: "complete", warnings: [], explanation: {} }, keeperEfficiency: { score: null, baseWeight: 15, effectiveWeight: 0, status: "not-applicable", warnings: [], explanation: {} }, coverageWarnings: [] }], warnings: [] } as any;
const strategy = { franchiseId: "prestigio-mundial", strategyExecutionScore: 90, executionLabel: "Excellent Execution", status: "ready", privateWarnings: [], targetExecution: { score: 100, baseWeight: 40, effectiveWeight: 40, status: "complete" }, capDiscipline: { score: 100, baseWeight: 35, effectiveWeight: 35, status: "complete" }, rosterPlanExecution: { score: 80, baseWeight: 25, effectiveWeight: 25, status: "complete" }, explanation: { targetedCount: 1, acquiredTargetCount: 1, missedTargetCount: 0, acquiredTargets: [{ playerId: "p1", playerName: "Target One" }], missedTargets: [] } } as any;

const ready = assembleWarRoomPostDraftReport({ publicResult: readyPublic, privateResult, gradeResult, strategyExecution: strategy, settings: { positionPriorities: ["WR"] }, franchiseId: "prestigio-mundial", warRoomId: "2026:prestigio-mundial" });
assert.equal(ready.status, "ready");
assert.equal(ready.report?.draftGrade?.letterGrade, "B");
assert.equal(ready.report?.strategyExecution?.strategyExecutionScore, 90);
assert.equal(ready.report?.privateCapPurchases[0].purchaseCapScore, 100);
assert.equal(JSON.stringify(ready).includes("preferredEntry"), false);
assert.equal(JSON.stringify(ready).includes("private strategy note"), false);

const notReady = assembleWarRoomPostDraftReport({ publicResult: { ...readyPublic, sourceDraftStatus: "drafting" }, privateResult: { status: "not-ready", records: [], warnings: [] }, gradeResult, strategyExecution: null, settings: null, franchiseId: "prestigio-mundial", warRoomId: "2026:prestigio-mundial" });
assert.equal(notReady.status, "not-ready");
assert.equal(notReady.report, null);

console.log("Private post-draft War Room report checks passed.");
