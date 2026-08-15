import assert from "node:assert/strict";
import {
  BASE_WEIGHTS,
  DRAFT_GRADE_MODEL_VERSION,
  calculatePublicDraftGrades,
  letterGrade,
} from "../lib/draftGrade";
import type { PostDraftPublicResult } from "../lib/postDraftMetrics";

function buildPublicMetrics(index: number) {
  const totalSpend = 190 - index;
  return {
    totalSpend,
    remainingBudget: 200 - totalSpend,
    positionSpend: {},
    positionCounts: { QB: 1, RB: 2, WR: 2, TE: 1 },
    rosterSize: 12,
    starterCount: 6,
    benchDepthCount: 6,
    rosterValue: 300 + index,
    valueDifferential: {
      total: 20 + index * 4,
      average: 2 + index * 0.4,
      comparablePlayerCount: 10,
    },
    bestBuy: {
      playerId: `best-${index}`,
      playerName: `Best ${index}`,
      position: "WR",
      purchasePrice: 10,
      publishedValue: 30,
      valueDifferential: 20,
      adp: 20,
    },
    biggestReach: null,
    keeperCount: index === 0 ? 0 : 1,
    totalKeeperCost: index === 0 ? 0 : 10,
    keeperPublishedValue: index === 0 ? 0 : 20 + index,
    keeperValueDifferential: index === 0 ? 0 : 10 + index,
    nonKeeperAuctionSpend: totalSpend - (index === 0 ? 0 : 10),
    adpContext: {
      acquiredPlayerCount: 12,
      playersWithAdp: 12,
      averageAcquisitionAdp: 40,
    },
    powerRanking: {
      rank: index + 1,
      rosterValue: 300 + index,
      averageSOS: 50,
      rawScore: 200 + index,
      normalizedIndex: 8 + index,
      coverage: "complete" as const,
      status: "Preseason Outlook" as const,
    },
    requiredStarterSlots: { QB: 1, RB: 2, WR: 2, TE: 1 },
    coveredStarterSlots: 6,
    uncoveredStarterSlots: 0,
    starterCoverageByPosition: {
      QB: { required: 1, covered: 1, uncovered: 0 },
      RB: { required: 2, covered: 2, uncovered: 0 },
      WR: { required: 2, covered: 2, uncovered: 0 },
      TE: { required: 1, covered: 1, uncovered: 0 },
    },
    depthByPosition: { RB: 2, WR: 2 },
    totalDepth: 4,
    depthCoverageStatus: "complete" as const,
    rosterSlotCapacity: 16,
    rosterCompleteness: {
      filledSlots: 12,
      capacity: 16,
      ratio: 0.75,
      status: "complete" as const,
    },
  };
}

const publicInput: PostDraftPublicResult = {
  status: "ready",
  season: 2026,
  generatedAt: "2026-09-01T00:00:00.000Z",
  sourceDraftId: "draft-2026",
  sourceDraftStatus: "complete",
  metricsSchemaVersion: "post-draft-metrics-v1",
  records: Array.from({ length: 12 }, (_, index) => ({
    season: 2026,
    franchiseId: index === 0
      ? "prestigio-mundial"
      : index === 1
        ? "shake-n-bakers"
        : `franchise-${index + 1}`,
    rosterId: index + 1,
    teamName: index === 0
      ? "Prestigio Mundial"
      : index === 1
        ? "The Shake-N-Bakers"
        : `Team ${index + 1}`,
    generatedAt: "2026-09-01T00:00:00.000Z",
    source: {
      draftId: "draft-2026",
      draftStatus: "complete",
      metricsSchemaVersion: "post-draft-metrics-v1",
    },
    metrics: buildPublicMetrics(index),
    coverage: {
      status: "complete" as const,
      warnings: [],
      rosterValueCount: 12,
      valueDifferentialCount: 10,
      adpCount: 12,
      positionCount: 12,
    },
  })),
  warnings: [],
};

const grades = calculatePublicDraftGrades(publicInput);
assert.equal(grades.records.length, 12);
assert.equal(grades.records.filter((record) => record.franchiseId === "prestigio-mundial").length, 1);
assert.equal(grades.records.filter((record) => record.franchiseId === "shake-n-bakers").length, 1);
assert.deepEqual(BASE_WEIGHTS, {
  valueEfficiency: 35,
  rosterConstruction: 30,
  budgetManagement: 20,
  keeperEfficiency: 15,
});
assert.equal(Object.values(BASE_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 100);

const fullCoverage = grades.records[1];
assert.equal(fullCoverage.valueEfficiency.baseWeight, 35);
assert.equal(fullCoverage.rosterConstruction.baseWeight, 30);
assert.equal(fullCoverage.budgetManagement.baseWeight, 20);
assert.equal(fullCoverage.keeperEfficiency.baseWeight, 15);
assert.equal(fullCoverage.valueEfficiency.effectiveWeight, 35);
assert.equal(fullCoverage.rosterConstruction.effectiveWeight, 30);
assert.equal(fullCoverage.budgetManagement.effectiveWeight, 20);
assert.equal(fullCoverage.keeperEfficiency.effectiveWeight, 15);

const noKeeper = grades.records[0];
assert.equal(noKeeper.keeperEfficiency.score, null);
assert.equal(noKeeper.keeperEfficiency.status, "not-applicable");
assert.equal(noKeeper.keeperEfficiency.effectiveWeight, 0);
assert.equal(noKeeper.valueEfficiency.effectiveWeight, 41.18);
assert.equal(noKeeper.rosterConstruction.effectiveWeight, 35.29);
assert.equal(noKeeper.budgetManagement.effectiveWeight, 23.53);

for (const record of grades.records) {
  for (const part of [record.valueEfficiency, record.rosterConstruction, record.budgetManagement, record.keeperEfficiency]) {
    if (part.score !== null) assert.ok(part.score >= 0 && part.score <= 100);
  }
  assert.ok(record.draftScore === null || (record.draftScore >= 0 && record.draftScore <= 100));
  assert.equal(record.gradeModelVersion, DRAFT_GRADE_MODEL_VERSION);
}

const score = fullCoverage.draftScore;
assert.ok(score !== null);

function gradeForRemaining(remainingBudget: number) {
  const adjusted = structuredClone(publicInput);
  adjusted.records[1].metrics.totalSpend = 200 - remainingBudget;
  adjusted.records[1].metrics.remainingBudget = remainingBudget;
  return calculatePublicDraftGrades(adjusted).records[1];
}

assert.equal(gradeForRemaining(0).budgetManagement.score, 100);
assert.equal(gradeForRemaining(5).budgetManagement.score, 100);
assert.equal(gradeForRemaining(10).budgetManagement.score, 90);
assert.equal(gradeForRemaining(15).budgetManagement.score, 80);
assert.equal(gradeForRemaining(25).budgetManagement.score, 55);
assert.equal(gradeForRemaining(40).budgetManagement.score, 37.65);
assert.equal(gradeForRemaining(-1).budgetManagement.score, 0);

const lowerSpend = structuredClone(publicInput);
lowerSpend.records[1].metrics.totalSpend = 100;
lowerSpend.records[1].metrics.remainingBudget = 100;
assert.equal(calculatePublicDraftGrades(lowerSpend).records[1].valueEfficiency.score, fullCoverage.valueEfficiency.score);

const shallowDepth = structuredClone(publicInput);
shallowDepth.records[1].metrics.depthByPosition = { RB: 1 };
shallowDepth.records[1].metrics.totalDepth = 1;
const deepDepth = structuredClone(publicInput);
deepDepth.records[1].metrics.depthByPosition = { QB: 1, RB: 2, WR: 2, TE: 1, K: 5, DEF: 5 };
deepDepth.records[1].metrics.totalDepth = 16;
assert.ok(calculatePublicDraftGrades(deepDepth).records[1].rosterConstruction.score! > calculatePublicDraftGrades(shallowDepth).records[1].rosterConstruction.score!);
assert.equal(
  calculatePublicDraftGrades(deepDepth).records[1].rosterConstruction.score,
  calculatePublicDraftGrades({ ...deepDepth, records: deepDepth.records.map((record, index) => index === 1 ? { ...record, metrics: { ...record.metrics, depthByPosition: { QB: 1, RB: 2, WR: 2, TE: 1 }, totalDepth: 6 } } : record) }).records[1].rosterConstruction.score
);

const smallKeeperBargain = structuredClone(publicInput);
smallKeeperBargain.records[0].metrics.keeperCount = 1;
smallKeeperBargain.records[0].metrics.totalKeeperCost = 1;
smallKeeperBargain.records[0].metrics.keeperValueDifferential = 5;
const largeKeeperSurplus = structuredClone(publicInput);
largeKeeperSurplus.records[0].metrics.keeperCount = 1;
largeKeeperSurplus.records[0].metrics.totalKeeperCost = 20;
largeKeeperSurplus.records[0].metrics.keeperValueDifferential = 100;
const bargainGrade = calculatePublicDraftGrades(smallKeeperBargain).records[0];
const largeSurplusGrade = calculatePublicDraftGrades(largeKeeperSurplus).records[0];
assert.ok(bargainGrade.keeperEfficiency.score! > 0);
assert.ok(largeSurplusGrade.keeperEfficiency.score! > bargainGrade.keeperEfficiency.score!);

for (const record of grades.records) {
  const effectiveWeightTotal = [record.valueEfficiency, record.rosterConstruction, record.budgetManagement, record.keeperEfficiency]
    .reduce((sum, part) => sum + part.effectiveWeight, 0);
  assert.equal(effectiveWeightTotal, 100);
}

assert.equal(letterGrade(100), "A+");
assert.equal(letterGrade(97), "A+");
assert.equal(letterGrade(96.99), "A");
assert.equal(letterGrade(93), "A");
assert.equal(letterGrade(92.99), "A-");
assert.equal(letterGrade(90), "A-");
assert.equal(letterGrade(89.99), "B+");
assert.equal(letterGrade(87), "B+");
assert.equal(letterGrade(86.99), "B");
assert.equal(letterGrade(83), "B");
assert.equal(letterGrade(82.99), "B-");
assert.equal(letterGrade(80), "B-");
assert.equal(letterGrade(79.99), "C+");
assert.equal(letterGrade(77), "C+");
assert.equal(letterGrade(76.99), "C");
assert.equal(letterGrade(73), "C");
assert.equal(letterGrade(72.99), "C-");
assert.equal(letterGrade(70), "C-");
assert.equal(letterGrade(69.99), "D+");
assert.equal(letterGrade(67), "D+");
assert.equal(letterGrade(66.99), "D");
assert.equal(letterGrade(63), "D");
assert.equal(letterGrade(62.99), "D-");
assert.equal(letterGrade(60), "D-");
assert.equal(letterGrade(59.99), "F");

const powerRankChanged = structuredClone(publicInput);
powerRankChanged.records[1].metrics.powerRanking.rank = 12;
powerRankChanged.records[1].metrics.powerRanking.normalizedIndex = 99;
assert.equal(calculatePublicDraftGrades(powerRankChanged).records[1].draftScore, score);

const extremeBestBuy = structuredClone(publicInput);
extremeBestBuy.records[1].metrics.bestBuy!.valueDifferential = 99999;
assert.equal(calculatePublicDraftGrades(extremeBestBuy).records[1].draftScore, score);

const incomplete = structuredClone(publicInput);
incomplete.records[0].coverage.rosterValueCount = 2;
incomplete.records[0].coverage.status = "partial";
const incompleteGrade = calculatePublicDraftGrades(incomplete).records[0];
assert.equal(incompleteGrade.status, "not-ready");
assert.equal(incompleteGrade.draftScore, null);
assert.equal(incompleteGrade.letterGrade, null);
assert.notEqual(incompleteGrade.letterGrade, "F");

const deterministicAgain = calculatePublicDraftGrades(publicInput);
assert.deepEqual(deterministicAgain, grades);
assert.equal(JSON.stringify(grades).includes("targetHitRate"), false);
assert.equal(JSON.stringify(grades).includes("capDiscipline"), false);
assert.equal(JSON.stringify(grades).includes("private"), false);

console.log("Public Draft Grade model checks passed.");
