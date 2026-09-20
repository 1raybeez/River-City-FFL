import assert from "node:assert/strict";
import { buildCalibratedTeamVariance } from "../lib/predictor/calibratedVariance";
import { runCommissionerShadowSimulation } from "../lib/predictor/shadowSimulation";
import { validatePromotion } from "../lib/predictor/promotion";
import { MemoryValidationHistoryStore, buildValidationHistoryRecord } from "../lib/predictor/validationHistory";

const observations = Array.from({ length: 12 }, (_, index) => ({ season: 2026, week: 2, playerId: `team-${index}`, position: "LEAGUE" as const, projectedPoints: 100, actualPoints: 100 + (index % 2), actualFinal: true, availabilityStatus: "AVAILABLE", projectionSource: "FANTASYPROS", providerVersion: null, projectionBucket: "20+" as const, residual: index % 2, absoluteResidual: index % 2, squaredResidual: index % 2 }));
const variance = buildCalibratedTeamVariance(observations, "variance-evidence-1", [2]);
assert.equal(variance.status, "READY");
assert.equal(variance.sample(100, "seed", 1), variance.sample(100, "seed", 1));
assert.notEqual(variance.evidenceIdentity, "variance-evidence-2");

const teams = Array.from({ length: 12 }, (_, index) => ({ franchiseId: `team-${index}`, teamName: `Team ${index}`, wins: 1, losses: 0, ties: 0, pointsFor: 100, pointsAgainst: 90 }));
const remaining = [{ week: 3, firstFranchiseId: "team-0", secondFranchiseId: "team-1", firstExpectedScore: 100, secondExpectedScore: 100 }];
const result = runCommissionerShadowSimulation({ season: 2026, throughWeek: 2, teams, remaining, inputEvidenceChecksums: ["variance-evidence-1"], generatedAt: "2026-09-20T00:00:00.000Z", seed: "final", variance, playoffExpectedScores: Object.fromEntries([15, 16, 17].map(week => [String(week), Object.fromEntries(teams.map(team => [team.franchiseId, 100]))])) });
assert.equal(result.simulationCount, 10_000);
assert.equal(result.varianceSource, "CALIBRATED");
assert.equal(result.varianceEvidenceIdentity, "variance-evidence-1");
assert.equal(result.teamResults.reduce((sum, team) => sum + team.playoffProbability, 0), 6);
assert.equal(validatePromotion({ readiness: "SHADOW_READY", shadow: result, approvedBy: "commissioner" }).readiness, "PRODUCTION_READY");

async function main() {
  const history = new MemoryValidationHistoryStore();
  const record = buildValidationHistoryRecord({ season: 2026, throughWeek: 2, shadowResultId: result.resultId, inputEvidenceChecksums: ["variance-evidence-1"], metrics: { projectedFinishError: {}, playoffBrierScore: null, coverageFailures: 0, evaluatedWeeks: 0 }, evaluatedAt: "2026-09-20T00:00:00.000Z" });
  assert.equal(await history.create(record), "CREATED");
  assert.equal((await history.list(2026)).length, 1);
  console.log("Predictor final engineering checks passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
