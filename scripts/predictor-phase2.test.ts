import assert from "node:assert/strict";
import { adaptPredictorOutcome, buildPredictorCalibrationProgress } from "../lib/predictor/predictorContract";
import { buildDeterministicProjectedStandings } from "../lib/predictor/projectedStandings";
import { MemoryShadowResultStore, runCommissionerShadowSimulation, SHADOW_SIMULATION_COUNT } from "../lib/predictor/shadowSimulation";
import { evaluateShadowAgainstActuals, validatePromotion } from "../lib/predictor/promotion";

async function main() {

const teams = Array.from({ length: 12 }, (_, index) => ({ franchiseId: `team-${index + 1}`, teamName: `Team ${index + 1}`, wins: index % 3, losses: 1 + (index % 2), pointsFor: 100 + index, pointsAgainst: 90 + index }));
const remaining = [{ week: 3, firstFranchiseId: "team-1", secondFranchiseId: "team-2", firstExpectedScore: 110, secondExpectedScore: 100 }, { week: 3, firstFranchiseId: "team-3", secondFranchiseId: "team-4", firstExpectedScore: 100, secondExpectedScore: 110 }];
const progress = buildPredictorCalibrationProgress({ readiness: "CALIBRATING", projectedStandingsStatus: "UNAVAILABLE", probabilityStatus: "CALIBRATING", playerSamples: 0, playerSampleTarget: 50, teamSamples: 0, teamSampleTarget: 12, eligibleWeeks: [], excludedWeeks: [{ week: 1, reason: "PATH C" }], projectionBaselines: [{ week: 2, status: "CAPTURED" }], actualEvidence: [{ week: 2, status: "WAITING" }], residualEvidence: [{ week: 2, status: "MISSING" }], positionCoverage: {}, bucketCoverage: {}, latestEvidenceAt: null });
assert.equal(progress.nextEvent, "Waiting for the next finalized Sleeper week");
assert.equal(adaptPredictorOutcome({ progress }).playoffProbability, null);

const standings = buildDeterministicProjectedStandings(teams, remaining);
assert.equal(standings.length, 12);
assert.equal(standings[0].projectedFinish, 1);
assert.equal(standings.some(team => team.projectedWins !== team.currentWins), true);

const shadow = runCommissionerShadowSimulation({ season: 2026, throughWeek: 2, teams, remaining, inputEvidenceChecksums: ["projection", "residual"], generatedAt: "2026-09-22T00:00:00.000Z", seed: "test" });
assert.equal(shadow.simulationCount, SHADOW_SIMULATION_COUNT);
assert.equal(shadow.teamResults.length, 12);
assert.equal(shadow.teamResults.reduce((sum, team) => sum + team.playoffProbability, 0), 6);
assert.equal(shadow.teamResults.reduce((sum, team) => sum + team.championshipProbability, 0), 1);
const shadowStore = new MemoryShadowResultStore();
assert.equal(await shadowStore.create(shadow), "CREATED");
assert.equal(await shadowStore.create(shadow), "DUPLICATE");
const metrics = evaluateShadowAgainstActuals({ shadow, actualFinish: Object.fromEntries(teams.map((team, index) => [team.franchiseId, index + 1])), actualPlayoff: Object.fromEntries(teams.map((team, index) => [team.franchiseId, index < 6])) });
assert.equal(metrics.evaluatedWeeks, 1);
assert.equal(validatePromotion({ readiness: "SHADOW_READY", shadow, approvedBy: "commissioner", approvedAt: "2026-09-22T00:00:00.000Z" }).readiness, "PRODUCTION_READY");
assert.throws(() => validatePromotion({ readiness: "CALIBRATING", shadow, approvedBy: "commissioner" }), /SHADOW_READY/);
console.log("Predictor Phase 2 tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
