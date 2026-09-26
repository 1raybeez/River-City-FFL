import assert from "node:assert/strict";
import { MATCHUP_POLL_INTERVAL_MS, shouldPollMatchups } from "../lib/matchupsPolling";
import { evaluateFreezeWindow, getApprovedFreezeWindow } from "../lib/seasonSimulator/freezeWindow";
import { SETTLEMENT_FUNCTION_NAME, SETTLEMENT_SCHEDULE, SETTLEMENT_TIMEZONE } from "../lib/weeklyOperations";
import { buildDurableEvidenceRecord, durableEvidencePath, MemoryImmutableEvidenceStore } from "../lib/seasonSimulator/durableEvidence";
import { classifyWeeklyLifecycle, operationId } from "../lib/weeklyOperationsOrchestrator";
import { classifyWeeklyOperationRun, isEquivalentWeeklyOperationRun, type WeeklyOperationRunDocument } from "../lib/weeklyOperationRunStore";

assert.equal(MATCHUP_POLL_INTERVAL_MS, 60_000);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "in_season" }), true);
assert.equal(shouldPollMatchups({ selectedWeek: 1, currentWeek: 2, leagueStatus: "in_season" }), false);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "complete" }), false);
assert.equal(SETTLEMENT_FUNCTION_NAME, "settleWeeklyHighScore");
assert.equal(SETTLEMENT_SCHEDULE, "15 11-15 * * 2");
assert.equal(SETTLEMENT_TIMEZONE, "America/New_York");
const window = getApprovedFreezeWindow(2026, 2)!;
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T14:59:59-04:00")).reason, "BEFORE_APPROVED_FREEZE_WINDOW");
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T15:00:00-04:00")).eligible, true);
assert.equal(evaluateFreezeWindow(2026, 2, new Date(window.firstKickoff)).eligible, false);
assert.equal(classifyWeeklyLifecycle({ season: 2026, week: 2, beforeFirstKickoff: false, freezeEligible: false, projectionBaselineExists: true, finalityReady: false, actualEvidenceExists: false, actualEvidencePathC: false, residualDatasetExists: false, recapDraftExists: false, recapPublished: false, settlementState: "WAITING" }).state, "WEEK_LIVE");
assert.equal(classifyWeeklyLifecycle({ season: 2026, week: 1, beforeFirstKickoff: false, freezeEligible: false, projectionBaselineExists: false, finalityReady: true, actualEvidenceExists: true, actualEvidencePathC: true, residualDatasetExists: false, recapDraftExists: true, recapPublished: true, settlementState: "ALREADY_SETTLED" }).state, "COMPLETE");
assert.equal(classifyWeeklyLifecycle({ season: 2026, week: 2, beforeFirstKickoff: true, freezeEligible: true, projectionBaselineExists: false, finalityReady: false, actualEvidenceExists: false, actualEvidencePathC: false, residualDatasetExists: false, recapDraftExists: false, recapPublished: false, settlementState: "WAITING" }).state, "PROJECTION_FREEZE_READY");
assert.equal(operationId(2026, 2, "actual-capture"), "2026:week-02:actual-capture");
const run: WeeklyOperationRunDocument = { operationId: "2026:week-02:POST_FINALITY", season: 2026, week: 2, operation: "POST_FINALITY", result: "ACTUALS_CAPTURED", startedAt: "2026-09-22T12:00:00.000Z", completedAt: "2026-09-22T12:01:00.000Z", retryCount: 0, error: null, schemaVersion: "river-city-weekly-operation-run-v1", writePerformed: true, sourceAsOf: "2026-09-22T12:00:00.000Z", evidenceChecksums: ["actual"], issueCodes: [], recommendedAction: null, schedulerInvocationId: "first" };
assert.equal(isEquivalentWeeklyOperationRun(run, { ...run, startedAt: "2026-09-22T13:00:00.000Z", completedAt: "2026-09-22T13:01:00.000Z", schedulerInvocationId: "safe-retry" }), true);
assert.equal(isEquivalentWeeklyOperationRun(run, { ...run, result: "ERROR", error: "provider failure" }), false);
const storedRuns = new Map<string, WeeklyOperationRunDocument>();
const safeCreate = (candidate: WeeklyOperationRunDocument) => {
  const existing = storedRuns.get(candidate.operationId);
  if (!existing) { storedRuns.set(candidate.operationId, candidate); return "CREATED" as const; }
  return classifyWeeklyOperationRun([existing], candidate);
};
assert.equal(safeCreate(run), "CREATED");
assert.equal(safeCreate({ ...run, startedAt: "2026-09-22T13:00:00.000Z", completedAt: "2026-09-22T13:01:00.000Z", schedulerInvocationId: "safe-retry", evidenceChecksums: ["actual"] }), "DUPLICATE");
assert.equal(classifyWeeklyOperationRun([{
  ...run,
  result: "PROVIDER_UNAVAILABLE",
  error: "ESPN returned HTTP 403.",
  writePerformed: false,
  startedAt: "2026-09-22T12:00:00.000Z",
  completedAt: "2026-09-22T12:01:00.000Z",
}], {
  ...run,
  result: "PROVIDER_UNAVAILABLE",
  error: "ESPN returned HTTP 503.",
  writePerformed: false,
  startedAt: "2026-09-22T13:00:00.000Z",
  completedAt: "2026-09-22T13:01:00.000Z",
  schedulerInvocationId: "failed-retry",
}), "RETRY");
assert.equal(classifyWeeklyOperationRun([{
  ...run,
  result: "PROVIDER_UNAVAILABLE",
  error: "provider failure",
  writePerformed: false,
}], { ...run, result: "FROZEN", error: null, writePerformed: true }), "RETRY");
assert.equal(classifyWeeklyOperationRun([run], { ...run, startedAt: "2026-09-22T14:00:00.000Z", completedAt: "2026-09-22T14:01:00.000Z", schedulerInvocationId: "duplicate-success" }), "DUPLICATE");
assert.equal(classifyWeeklyOperationRun([run], { ...run, result: "FROZEN", error: null, writePerformed: true }), "CONFLICT");
(async () => {
  const evidence = buildDurableEvidenceRecord({ season: 2026, week: 2, kind: "ACTUAL", source: "fixture", sourceChecksum: "abc", capturedAt: "now", payload: { immutable: true } });
  const evidencePath = durableEvidencePath(2026, 2, "ACTUAL", "abc");
  const store = new MemoryImmutableEvidenceStore();
  assert.equal(await store.create(evidencePath, evidence), "CREATED");
  assert.equal(await store.create(evidencePath, evidence), "DUPLICATE");
  await assert.rejects(() => store.create(evidencePath, { ...evidence, payload: { conflict: true }, recordChecksum: "different" }), /conflict/);
  console.log("weekly operations control-plane tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
