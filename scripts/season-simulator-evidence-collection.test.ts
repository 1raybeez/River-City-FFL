import assert from "node:assert/strict";
import { buildActualEvidenceArtifact, buildProjectionEvidenceArtifact, pairProjectionAndActualEvidence } from "../lib/seasonSimulator/evidenceCollection";

const projectionInput = {modelVersion: "v1", season: 2026, week: 1, createdAt: "before-kickoff", evidenceAsOf: "before-kickoff", projectionSource: "FANTASYPROS" as const, providerVersion: "v1", providerResponseAsOf: "provider-time", rosterEvidenceAsOf: "roster-time", lineupEvidenceAsOf: "lineup-time", scoringSettingsChecksum: "scoring", projectionInputChecksum: "input", projections: [{franchiseId: "team-1", playerId: "p1", playerName: "Player One", position: "RB" as const, nflTeam: "BUF", projectedPoints: 10, projectedStarter: true, mappingMethod: "EXACT_NAME_TEAM_POSITION"}], projectedLineups: {"team-1": {RB: "p1"}}, expectedTeamScores: {"team-1": {expectedScore: 10, projectedLineup: {RB: "p1"}}}, mappingDiagnostics: {}, coverageDiagnostics: {}, unavailableTeamDiagnostics: [] as readonly unknown[]};
const projection = buildProjectionEvidenceArtifact(projectionInput);
const actualInput = {season: 2026, week: 2, calibrationEligibility: "ELIGIBLE_IF_PAIRED_WITH_VALID_PROJECTION" as const, calibrationEligibilityReason: "A valid pregame projection artifact may be paired later.", finalizedAt: "final", finalityEvidence: {finalized: true}, sleeperLeagueState: {status: "complete"}, matchupResults: [{franchiseId: "team-1", officialTeamScore: 12, officialStarterIds: ["p1"], starterPoints: {p1: 12}, players: [{playerId: "p1", playerName: "Player One", position: "RB" as const, nflTeam: "BUF", actualPoints: 12, availabilityStatus: "ACTIVE"}]}], officialTeamScores: {"team-1": 12}, officialStarterIds: {"team-1": ["p1"]}, playerActuals: [{playerId: "p1", playerName: "Player One", position: "RB" as const, nflTeam: "BUF", actualPoints: 12, availabilityStatus: "ACTIVE"}]};
assert.equal(buildActualEvidenceArtifact({...actualInput, finalized: false}), null);
const actual = buildActualEvidenceArtifact({...actualInput, finalized: true});
assert.ok(actual);
if (actual) {
  assert.ok(Object.isFrozen(actual));
  const paired = pairProjectionAndActualEvidence(projection, actual);
  assert.equal(paired.playerResidualObservations[0].residual, 2);
  assert.equal(paired.playerResidualObservations[0].absoluteResidual, 2);
  assert.equal(paired.playerResidualObservations[0].squaredResidual, 4);
  assert.equal(paired.teamResidualObservations[0].teamResidual, 2);
  assert.equal(paired.diagnostics.validPlayerObservations, 1);
  assert.equal(paired.diagnostics.validTeamObservations, 1);
  assert.equal(paired.diagnostics.checksum, pairProjectionAndActualEvidence(projection, actual).diagnostics.checksum);
}
const pathC = buildActualEvidenceArtifact({...actualInput, week: 1, calibrationEligibility: "INELIGIBLE_PATH_C", calibrationEligibilityReason: "Original pregame Week 1 FantasyPros projection snapshot was not preserved.", finalized: true});
assert.ok(pathC);
if (pathC) {
  assert.equal(pathC.schemaVersion, "river-city-actual-evidence-v1");
  assert.equal(pathC.calibrationEligibility, "INELIGIBLE_PATH_C");
  assert.throws(() => pairProjectionAndActualEvidence(projection, pathC), /PATH C/);
}
const changed = buildProjectionEvidenceArtifact({...projectionInput, projections: [{...projectionInput.projections[0], projectedPoints: 11}]});
assert.notEqual(projection.checksum, changed.checksum);
console.log("Season simulator evidence collection tests passed.");
