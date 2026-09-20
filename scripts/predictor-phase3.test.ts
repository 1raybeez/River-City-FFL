import assert from "node:assert/strict";
import { buildDeterministicProjectedStandings } from "../lib/predictor/projectedStandings";
import { shouldRunShadow } from "../lib/predictor/shadowOrchestration";
import { MemoryValidationHistoryStore, buildValidationHistoryRecord } from "../lib/predictor/validationHistory";
import { loadProductionPredictorOutcome } from "../lib/predictor/productionOutcomeLoader";
import { buildPredictorCalibrationProgress } from "../lib/predictor/predictorContract";
import { runCommissionerShadowSimulation } from "../lib/predictor/shadowSimulation";

const teams = Array.from({ length: 12 }, (_, index) => ({ franchiseId: `team-${index + 1}`, teamName: `Team ${index + 1}`, wins: 1, losses: 0, ties: 0, pointsFor: 100, pointsAgainst: 90 }));
const remaining = [{ week: 3, firstFranchiseId: "team-1", secondFranchiseId: "team-2", firstExpectedScore: 100, secondExpectedScore: 100 }];
const standings = buildDeterministicProjectedStandings(teams, remaining);
assert.equal(standings.find(team => team.franchiseId === "team-1")?.projectedTies, 1);
assert.equal(standings.find(team => team.franchiseId === "team-1")?.tiebreakerStatus, "COMMISSIONER_PLATFORM_RESOLUTION_REQUIRED");
assert.deepEqual(shouldRunShadow({ readiness: "CALIBRATING", currentResultId: null, inputEvidenceChecksums: ["a"], requestedInputEvidenceChecksums: ["a"] }).eligible, false);
assert.deepEqual(shouldRunShadow({ readiness: "SHADOW_READY", currentResultId: null, inputEvidenceChecksums: ["a"], requestedInputEvidenceChecksums: ["a"] }).eligible, true);
const shadowOne = runCommissionerShadowSimulation({ season: 2026, throughWeek: 2, teams, remaining, inputEvidenceChecksums: ["a"], generatedAt: "2026-09-20T00:00:00.000Z", seed: "stable", allowLegacyFixtureVariance: true });
const shadowTwo = runCommissionerShadowSimulation({ season: 2026, throughWeek: 2, teams, remaining, inputEvidenceChecksums: ["a"], generatedAt: "2026-09-21T00:00:00.000Z", seed: "stable", allowLegacyFixtureVariance: true });
assert.equal(shadowOne.resultId, shadowTwo.resultId);
assert.equal(shadowOne.simulationCount, 10_000);
const progress = buildPredictorCalibrationProgress({ readiness: "SHADOW_READY", projectedStandingsStatus: "READY", probabilityStatus: "SHADOW_ONLY", playerSamples: 50, playerSampleTarget: 50, teamSamples: 12, teamSampleTarget: 12, eligibleWeeks: [2], excludedWeeks: [], projectionBaselines: [{ week: 2, status: "CAPTURED" }], actualEvidence: [{ week: 2, status: "WAITING" }], residualEvidence: [{ week: 2, status: "PAIRED" }], positionCoverage: {}, bucketCoverage: {}, latestEvidenceAt: "2026-09-20T00:00:00.000Z" });
assert.equal(loadProductionPredictorOutcome({ progress, production: null }).playoffProbability, null);
async function main() {
  const history = new MemoryValidationHistoryStore();
  const record = buildValidationHistoryRecord({ season: 2026, throughWeek: 2, shadowResultId: "shadow", inputEvidenceChecksums: ["a"], metrics: { projectedFinishError: {}, playoffBrierScore: null, coverageFailures: 0, evaluatedWeeks: 0 }, evaluatedAt: "2026-09-20T00:00:00.000Z" });
  assert.equal(await history.create(record), "CREATED");
  assert.equal(await history.create(record), "DUPLICATE");
  console.log("Predictor Phase 3 foundation tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
