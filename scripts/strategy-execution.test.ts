import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BASE_WEIGHTS,
  STRATEGY_EXECUTION_MODEL_VERSION,
  calculateStrategyExecution,
} from "../lib/strategyExecution";
import type { PostDraftPrivateRecord } from "../lib/postDraftMetrics";
import type { AuctionPositionPriority } from "../lib/auction/ownerProfileSettingsTypes";

const source = readFileSync("lib/strategyExecution.ts", "utf8");
assert.match(source, /requireAuctionWarRoomAccess/);
assert.match(source, /assertAuthorizedWarRoomRequest/);
assert.doesNotMatch(source, /draftGrade|powerRanking\.score|targetHitRate.*public/);

function makeRecord(overrides: Partial<PostDraftPrivateRecord["privateMetrics"]> = {}): PostDraftPrivateRecord {
  return {
    season: 2026,
    franchiseId: "prestigio-mundial",
    rosterId: 1,
    teamName: "Prestigio Mundial",
    generatedAt: "2026-09-01T00:00:00.000Z",
    coverage: {
      status: "complete",
      warnings: [],
      rosterValueCount: 10,
      valueDifferentialCount: 10,
      adpCount: 10,
      positionCount: 10,
    },
    source: {
      draftId: "draft-2026",
      draftStatus: "complete",
      metricsSchemaVersion: "post-draft-metrics-v1",
    },
    metrics: {
      totalSpend: 180,
      remainingBudget: 20,
      positionSpend: {
        QB: { totalSpend: 20, playerCount: 1, shareOfTotalSpend: 0.11 },
        RB: { totalSpend: 60, playerCount: 3, shareOfTotalSpend: 0.33 },
        WR: { totalSpend: 70, playerCount: 4, shareOfTotalSpend: 0.39 },
        TE: { totalSpend: 30, playerCount: 2, shareOfTotalSpend: 0.17 },
      },
      positionCounts: { QB: 1, RB: 3, WR: 4, TE: 2 },
      rosterSize: 10,
      starterCount: 8,
      benchDepthCount: 2,
      rosterValue: 250,
      valueDifferential: { total: 40, average: 4, comparablePlayerCount: 10 },
      bestBuy: null,
      biggestReach: null,
      keeperCount: 1,
      totalKeeperCost: 10,
      keeperPublishedValue: 30,
      keeperValueDifferential: 20,
      nonKeeperAuctionSpend: 170,
      adpContext: { acquiredPlayerCount: 10, playersWithAdp: 10, averageAcquisitionAdp: 35 },
      powerRanking: { rank: 1, rosterValue: 250, averageSOS: 50, rawScore: 200, normalizedIndex: 10, coverage: "complete", status: "Preseason Outlook" },
      requiredStarterSlots: { QB: 1, RB: 1, WR: 2, TE: 1, K: 1, DEF: 1, FLEX: 1 },
      coveredStarterSlots: 8,
      uncoveredStarterSlots: 0,
      starterCoverageByPosition: {},
      depthByPosition: { RB: 1, WR: 1 },
      totalDepth: 2,
      depthCoverageStatus: "complete",
      rosterSlotCapacity: 16,
      rosterCompleteness: { filledSlots: 10, capacity: 16, ratio: 0.625, status: "partial" },
    },
    privateMetrics: {
      warRoomId: "2026:prestigio-mundial",
      targetCount: 4,
      acquiredTargetCount: 3,
      targetHitRate: 0.75,
      acquiredTargets: [{ playerId: "p1", playerName: "Target One" }],
      missedTargets: [{ playerId: "p4", playerName: "Target Four" }],
      capDiscipline: {
        cappedPurchases: 5,
        underOrAtCapCount: 4,
        overCapCount: 1,
        totalDollarsOverCap: 2,
        averageCapVariance: 0.4,
        purchaseCapScores: [100, 100, 100, 100, 90],
        capPurchases: [],
        unavailableCount: 5,
      },
      preferredEntryDiscipline: {
        availableCount: 4,
        comparableCount: 4,
        averagePurchaseVsEntryVariance: 1,
        unavailableCount: 6,
      },
      strategyCoverage: "complete",
      ...overrides,
    },
  };
}

const settings = {
  positionPriorities: ["WR", "RB"] as AuctionPositionPriority[],
  additionalNotes: "private strategy note",
  rosterConstruction: "balanced" as const,
  riskTolerance: "balanced" as const,
};

const result = calculateStrategyExecution({ privateRecord: makeRecord(), settings });
assert.equal(result.strategyModelVersion, STRATEGY_EXECUTION_MODEL_VERSION);
assert.equal(result.targetExecution.score, 75);
assert.equal(result.explanation.targetedCount, 4);
assert.equal(result.explanation.acquiredTargetCount, 3);
assert.equal(result.explanation.missedTargetCount, 1);
assert.deepEqual(result.explanation.acquiredTargets, [{ playerId: "p1", playerName: "Target One" }]);
assert.deepEqual(result.explanation.missedTargets, [{ playerId: "p4", playerName: "Target Four" }]);
assert.ok(result.capDiscipline.score! > 0);
assert.ok(result.rosterPlanExecution.score! > 0);
assert.ok(result.strategyExecutionScore !== null && result.strategyExecutionScore >= 0 && result.strategyExecutionScore <= 100);
assert.ok(result.executionLabel);

const weights = [result.targetExecution, result.capDiscipline, result.rosterPlanExecution]
  .reduce((sum, part) => sum + part.effectiveWeight, 0);
assert.equal(weights, 100);
assert.deepEqual(BASE_WEIGHTS, { targetExecution: 40, capDiscipline: 35, rosterPlanExecution: 25 });

const oneOfOne = calculateStrategyExecution({
  privateRecord: makeRecord({ targetCount: 1, acquiredTargetCount: 1, targetHitRate: 1, acquiredTargets: [{ playerId: "p1", playerName: "Target One" }], missedTargets: [] }),
  settings,
});
assert.equal(oneOfOne.targetExecution.score, 100);

const twoOfFour = calculateStrategyExecution({
  privateRecord: makeRecord({ targetCount: 4, acquiredTargetCount: 2, targetHitRate: 0.5 }),
  settings,
});
assert.equal(twoOfFour.targetExecution.score, 50);

const noTargets = calculateStrategyExecution({
  privateRecord: makeRecord({ targetCount: 0, acquiredTargetCount: 0, targetHitRate: null, acquiredTargets: [], missedTargets: [] }),
  settings,
});
assert.equal(noTargets.targetExecution.status, "unavailable");
assert.equal(noTargets.targetExecution.effectiveWeight, 0);
assert.equal(noTargets.status, "partial");

const noCaps = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 0, underOrAtCapCount: 0, overCapCount: 0, totalDollarsOverCap: 0, averageCapVariance: null, purchaseCapScores: [], capPurchases: [], unavailableCount: 10 } }),
  settings,
});
assert.equal(noCaps.capDiscipline.status, "unavailable");

const allUnder = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 2, underOrAtCapCount: 2, overCapCount: 0, totalDollarsOverCap: 0, averageCapVariance: -2, purchaseCapScores: [100, 100], capPurchases: [], unavailableCount: 8 } }),
  settings,
});
assert.equal(allUnder.capDiscipline.score, 100);

const oneDollarOver = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 1, underOrAtCapCount: 0, overCapCount: 1, totalDollarsOverCap: 1, averageCapVariance: 1, purchaseCapScores: [97.5], capPurchases: [], unavailableCount: 9 } }),
  settings,
});
const fiveDollarsOver = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 1, underOrAtCapCount: 0, overCapCount: 1, totalDollarsOverCap: 5, averageCapVariance: 5, purchaseCapScores: [75], capPurchases: [], unavailableCount: 9 } }),
  settings,
});
const twiceCap = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 1, underOrAtCapCount: 0, overCapCount: 1, totalDollarsOverCap: 20, averageCapVariance: 20, purchaseCapScores: [0], capPurchases: [], unavailableCount: 9 } }),
  settings,
});
assert.equal(oneDollarOver.capDiscipline.score, 97.5);
assert.equal(fiveDollarsOver.capDiscipline.score, 75);
assert.equal(twiceCap.capDiscipline.score, 0);
assert.ok(oneDollarOver.capDiscipline.score! > fiveDollarsOver.capDiscipline.score!);
assert.ok(fiveDollarsOver.capDiscipline.score! > twiceCap.capDiscipline.score!);

const averagedCaps = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 2, underOrAtCapCount: 1, overCapCount: 1, totalDollarsOverCap: 5, averageCapVariance: 2.5, purchaseCapScores: [100, 75], capPurchases: [], unavailableCount: 8 } }),
  settings,
});
assert.equal(averagedCaps.capDiscipline.score, 87.5);

const smallCapMiss = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 1, underOrAtCapCount: 0, overCapCount: 1, totalDollarsOverCap: 1, averageCapVariance: 1, purchaseCapScores: [97.5], capPurchases: [], unavailableCount: 9 } }),
  settings,
});
const largeCapMiss = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 1, underOrAtCapCount: 0, overCapCount: 1, totalDollarsOverCap: 100, averageCapVariance: 100, purchaseCapScores: [0], capPurchases: [], unavailableCount: 9 } }),
  settings,
});
assert.ok(smallCapMiss.capDiscipline.score! > largeCapMiss.capDiscipline.score!);

const noPlan = calculateStrategyExecution({ privateRecord: makeRecord(), settings: null });
assert.equal(noPlan.rosterPlanExecution.status, "unavailable");

const notesChanged = calculateStrategyExecution({
  privateRecord: makeRecord(),
  settings: { ...settings, additionalNotes: "different private note" },
});
assert.equal(notesChanged.strategyExecutionScore, result.strategyExecutionScore);

const powerRankChanged = makeRecord();
powerRankChanged.metrics.powerRanking.rank = 12;
powerRankChanged.metrics.powerRanking.normalizedIndex = 99;
assert.equal(calculateStrategyExecution({ privateRecord: powerRankChanged, settings }).strategyExecutionScore, result.strategyExecutionScore);

const insufficient = calculateStrategyExecution({
  privateRecord: makeRecord({
    targetCount: 0,
    acquiredTargetCount: 0,
    targetHitRate: null,
    acquiredTargets: [],
    missedTargets: [],
    capDiscipline: { cappedPurchases: 0, underOrAtCapCount: 0, overCapCount: 0, totalDollarsOverCap: 0, averageCapVariance: null, purchaseCapScores: [], capPurchases: [], unavailableCount: 10 },
  }),
  settings: null,
});
assert.equal(insufficient.status, "unavailable");
assert.equal(insufficient.strategyExecutionScore, null);

assert.equal(JSON.stringify(result).includes("private strategy note"), false);
assert.equal(JSON.stringify(result).includes("powerRanking"), false);
assert.equal(JSON.stringify(result).includes("preferredEntry"), false);
assert.equal(JSON.stringify(result).includes("entryDiscipline"), false);

const targetAndCap = calculateStrategyExecution({ privateRecord: makeRecord(), settings: null });
assert.equal(targetAndCap.status, "partial");
assert.equal(targetAndCap.strategyExecutionScore !== null, true);

const targetAndRoster = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 0, underOrAtCapCount: 0, overCapCount: 0, totalDollarsOverCap: 0, averageCapVariance: null, purchaseCapScores: [], capPurchases: [], unavailableCount: 10 } }),
  settings,
});
assert.equal(targetAndRoster.strategyExecutionScore !== null, true);

const capAndRoster = calculateStrategyExecution({
  privateRecord: makeRecord({ targetCount: 0, acquiredTargetCount: 0, targetHitRate: null, acquiredTargets: [], missedTargets: [] }),
  settings,
});
assert.equal(capAndRoster.strategyExecutionScore !== null, true);

const targetOnly = calculateStrategyExecution({
  privateRecord: makeRecord({ capDiscipline: { cappedPurchases: 0, underOrAtCapCount: 0, overCapCount: 0, totalDollarsOverCap: 0, averageCapVariance: null, purchaseCapScores: [], capPurchases: [], unavailableCount: 10 } }),
  settings: null,
});
assert.equal(targetOnly.status, "unavailable");
assert.equal(targetOnly.strategyExecutionScore, null);

const reversedPriority = calculateStrategyExecution({
  privateRecord: makeRecord(),
  settings: { ...settings, positionPriorities: ["RB", "WR"] as AuctionPositionPriority[] },
});
assert.ok(result.rosterPlanExecution.score! > reversedPriority.rosterPlanExecution.score!);
assert.deepEqual(
  calculateStrategyExecution({ privateRecord: makeRecord(), settings }),
  result
);

const shake = makeRecord();
shake.franchiseId = "shake-n-bakers";
shake.privateMetrics.warRoomId = "2026:shake-n-bakers";
assert.notEqual(calculateStrategyExecution({ privateRecord: shake, settings }).franchiseId, result.franchiseId);

console.log("Private Strategy Execution checks passed.");
