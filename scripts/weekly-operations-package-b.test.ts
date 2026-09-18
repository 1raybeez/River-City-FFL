import assert from "node:assert/strict";
import { captureWeeklyActualEvidence } from "../lib/seasonSimulator/actualEvidenceService";
import { buildProjectionEvidenceArtifact, type ActualEvidenceArtifact } from "../lib/seasonSimulator/evidenceCollection";
import { buildCalibrationReadiness, MemoryCalibrationReadinessStore, APPROVED_CALIBRATION_THRESHOLDS } from "../lib/seasonSimulator/calibrationReadiness";
import { MemoryImmutableEvidenceStore } from "../lib/seasonSimulator/durableEvidence";
import { pairWeeklyProjectionAndActual } from "../lib/seasonSimulator/postFinalityEvidence";
import { MemoryRecapDraftStore } from "../lib/weeklyRecapDraft";
import { runPostFinalityAutomation } from "../lib/weeklyPostFinality";

const rosters = Array.from({ length: 12 }, (_, index) => ({ roster_id: index + 1 }));
const matchups = Array.from({ length: 6 }, (_, index) => [{ roster_id: index * 2 + 1, matchup_id: index + 1, points: 100 + index, starters: [`p${index * 2 + 1}`], starters_points: [10], players_points: { [`p${index * 2 + 1}`]: 10 } }, { roster_id: index * 2 + 2, matchup_id: index + 1, points: 90 + index, starters: [`p${index * 2 + 2}`], starters_points: [9], players_points: { [`p${index * 2 + 2}`]: 9 } }]).flat();
const playerDirectory = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`p${index + 1}`, { playerId: `p${index + 1}`, displayName: `Player ${index + 1}`, position: "RB", nflTeam: "BUF", injuryStatus: null }]));
const baseInput = { season: 2026, week: 2, now: new Date("2026-09-22T17:00:00.000Z"), state: { week: 3, season: "2026" }, league: { status: "in_season", season: "2026", settings: { last_scored_leg: 2 } }, rosters, matchups, playerDirectory, finalizedAt: "2026-09-22T17:00:00.000Z" };

function projection() {
  return buildProjectionEvidenceArtifact({ modelVersion: "fixture", season: 2026, week: 2, createdAt: "2026-09-17T19:00:00.000Z", evidenceAsOf: "2026-09-17T19:00:00.000Z", projectionSource: "FANTASYPROS", providerVersion: "fixture", providerResponseAsOf: "2026-09-17T18:00:00.000Z", rosterEvidenceAsOf: "2026-09-17T19:00:00.000Z", lineupEvidenceAsOf: "2026-09-17T19:00:00.000Z", scoringSettingsChecksum: "settings", projectionInputChecksum: "input", projections: Array.from({ length: 12 }, (_, index) => ({ franchiseId: String(index + 1), playerId: `p${index + 1}`, playerName: `Player ${index + 1}`, position: "RB", nflTeam: "BUF", projectedPoints: 10, projectedStarter: true, mappingMethod: "FIXTURE" })), projectedLineups: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(index + 1), [`p${index + 1}`]])), expectedTeamScores: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [String(index + 1), { expectedScore: 10, projectedLineup: [`p${index + 1}`] }])), mappingDiagnostics: {}, coverageDiagnostics: {}, unavailableTeamDiagnostics: [], capturePurpose: "CALIBRATION_BASELINE", capturedWithinApprovedWindow: true });
}

async function main() {
  const waiting = captureWeeklyActualEvidence({ ...baseInput, state: { week: 2 }, league: { ...baseInput.league, settings: { last_scored_leg: 1 } } });
  assert.equal(waiting.state, "WAITING_FOR_FINALITY");
  const captured = captureWeeklyActualEvidence(baseInput);
  assert.equal(captured.state, "CAPTURED");
  assert.equal(captured.artifact?.matchupResults.length, 12);
  assert.equal(captured.artifact?.matchupResults.filter(row => row.officialTeamScore !== null).length, 12);
  const actual = captured.artifact!;
  const pathC = captureWeeklyActualEvidence({ ...baseInput, season: 2026, week: 1 });
  assert.equal(pathC.artifact?.calibrationEligibility, "INELIGIBLE_PATH_C");

  const store = new MemoryImmutableEvidenceStore();
  const pair = pairWeeklyProjectionAndActual(projection(), actual);
  assert.equal(pair.state, "PAIRED");
  assert.equal(pair.residual?.season, 2026);
  assert.equal(pairWeeklyProjectionAndActual(projection(), { ...actual, week: 1 } as ActualEvidenceArtifact).state, "CONFLICT");
  assert.equal(pairWeeklyProjectionAndActual(projection(), pathC.artifact).state, "INELIGIBLE_PATH_C");
  assert.equal(pairWeeklyProjectionAndActual(null, actual).state, "NO_PAIR");
  assert.equal(pair.residual?.diagnostics.checksum, pairWeeklyProjectionAndActual(projection(), actual).residual?.diagnostics.checksum);

  const readiness = buildCalibrationReadiness([pair.residual!], "2026-09-22T17:00:00.000Z");
  assert.equal(readiness.status, "CALIBRATING");
  assert.equal(readiness.modelEligible, false);
  assert.deepEqual(APPROVED_CALIBRATION_THRESHOLDS, { minimumPlayerSamples: 50, minimumTeamSamples: 12 });
  const readinessStore = new MemoryCalibrationReadinessStore();
  const drafts = new MemoryRecapDraftStore();
  const first = await runPostFinalityAutomation({ ...baseInput, projection: projection(), evidenceStore: store, readinessStore, draftStore: drafts });
  assert.equal(first.state, "RECAP_DRAFT_READY");
  assert.equal(first.writePerformed, true);
  assert.equal(first.draft?.status, "REVIEW_DRAFT");
  assert.equal(first.draft?.matchups.length, 6);
  const retry = await runPostFinalityAutomation({ ...baseInput, projection: projection(), existingActual: first.actual, existingResiduals: [first.residual!], existingReadiness: first.readiness, existingDraft: first.draft, evidenceStore: store, readinessStore, draftStore: drafts });
  assert.equal(retry.state, "RECAP_DRAFT_READY");
  assert.equal(retry.draft?.draftChecksum, first.draft?.draftChecksum);
  const protectedWeek1 = await runPostFinalityAutomation({ ...baseInput, week: 1, projection: projection(), existingActual: pathC.artifact, evidenceStore: store, readinessStore, draftStore: drafts });
  assert.equal(protectedWeek1.state, "WEEK_1_PATH_C_PROTECTED");
  assert.equal(protectedWeek1.writePerformed, false);
  console.log("weekly operations Package B tests passed");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
