import assert from "node:assert/strict";
import { applyFutureExpectedScores, buildFutureExpectedScores } from "../lib/predictor/futureExpectedScores";
import { buildDeterministicProjectedStandings } from "../lib/predictor/projectedStandings";
import { MemoryShadowResultStore } from "../lib/predictor/shadowSimulation";
import { shouldRunShadow } from "../lib/predictor/shadowOrchestration";

const remaining = [{ week: 3, firstFranchiseId: "a", secondFranchiseId: "b" }, { week: 4, firstFranchiseId: "a", secondFranchiseId: "c" }];
const complete = buildFutureExpectedScores({ season: 2026, throughWeek: 2, remaining, scoreFor: (week, franchiseId) => ({ season: 2026, week, franchiseId, expectedScore: franchiseId === "a" ? 120 : 100, status: "AVAILABLE", source: "river-city-future-expected-score-fantasypros-weekly-v1", sourceAsOf: "source", evidenceVersion: "version", reason: null }) });
assert.equal(complete.available, true);
assert.equal(complete.rows.length, 4);
const games = applyFutureExpectedScores(remaining.map(game => ({ ...game, firstExpectedScore: Number.NaN, secondExpectedScore: Number.NaN })), complete);
assert.equal(games[0].firstExpectedScore, 120);
const teams = Array.from({ length: 12 }, (_, index) => ({ franchiseId: index === 0 ? "a" : index === 1 ? "b" : index === 2 ? "c" : `team-${index}`, teamName: `Team ${index}`, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }));
const projected = buildDeterministicProjectedStandings(teams, games);
assert.equal(projected.length, 12);
const unavailable = buildFutureExpectedScores({ season: 2026, throughWeek: 2, remaining, scoreFor: (week, franchiseId) => ({ season: 2026, week, franchiseId, expectedScore: null, status: "UNAVAILABLE", source: "river-city-future-expected-score-fantasypros-weekly-v1", sourceAsOf: null, evidenceVersion: null, reason: "NO_FEED" }) });
assert.equal(unavailable.available, false);
assert.equal(unavailable.rows.every(row => row.expectedScore === null), true);
assert.equal(Number.isNaN(applyFutureExpectedScores(remaining.map(game => ({ ...game, firstExpectedScore: Number.NaN, secondExpectedScore: Number.NaN })), unavailable)[0].firstExpectedScore), true);
async function main() {
  const shadowStore = new MemoryShadowResultStore();
  assert.equal((await shadowStore.findByInput({ season: 2026, throughWeek: 2, simulationCount: 10_000, inputEvidenceChecksums: ["x"] })), null);
  assert.equal(shouldRunShadow({ readiness: "CALIBRATING", currentResultId: null, inputEvidenceChecksums: ["x"], requestedInputEvidenceChecksums: ["x"] }).eligible, false);
  console.log("Predictor Phase 4 expected-score tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
