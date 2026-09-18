import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { getLeagueInfo, getNFLState } from "../../lib/sleeper";
import { buildProjectionCandidate } from "../../lib/seasonSimulator/projectionCandidateService";
import { CloudStorageImmutableEvidenceStore, listDurableEvidence } from "../../lib/seasonSimulator/durableEvidence";
import { freezeWeeklyProjections } from "../../lib/seasonSimulator/freezeService";
import { EspnNflScheduleAdapter } from "../../lib/nflKickoffSchedule";
import { FirestoreWeeklyOperationRunStore } from "../../lib/weeklyOperationRunStore";
import { buildRunRecord } from "../../lib/weeklyOperationsOrchestrator";

export const WEEKLY_OPERATIONS_SCHEDULE = "0 * * * *" as const;
export const WEEKLY_OPERATIONS_TIMEZONE = "America/New_York" as const;
export const fantasyProsApiKey = defineSecret("FANTASYPROS_API_KEY");
export const APPROVED_LOCAL_BASELINE_CHECKSUMS: Readonly<Record<string, string>> = {
  "2026:week-02": "c772f1a1c66ccbdf49f27d4ffb2bd3bedea6cd72779571206a4c0d5bd6feb394",
};

async function hasCloudBaseline(store: CloudStorageImmutableEvidenceStore, season: number, week: number) {
  if (APPROVED_LOCAL_BASELINE_CHECKSUMS[`${season}:week-${String(week).padStart(2, "0")}`]) return true;
  const paths = await listDurableEvidence(store, season, week, "PROJECTION");
  const records = await Promise.all(paths.map(path => store.read(path)));
  const authoritative = records.filter(record => record?.kind === "PROJECTION" && typeof record.payload === "object" && record.payload !== null && (record.payload as { capturePurpose?: unknown }).capturePurpose === "CALIBRATION_BASELINE");
  if (authoritative.length > 1) throw new Error("DURABLE_EVIDENCE_CONFLICT: multiple authoritative projection baselines exist.");
  return authoritative.length === 1;
}

export async function executeWeeklyOperations(now = new Date(), apiKey = fantasyProsApiKey.value(), invocationId = "manual-test") {
  const state = await getNFLState();
  const league = await getLeagueInfo(undefined, { fresh: true });
  const season = Number(league.season ?? state.season);
  const week = Number(state.week);
  if (!Number.isInteger(season) || season < 2018 || !Number.isInteger(week) || week < 1 || week > 18 || !["in_season", "complete"].includes(String(league.status))) return { state: "NO_OP", season, week, reason: "Sleeper league is outside an active supported season." };
  const store = new CloudStorageImmutableEvidenceStore();
  const result = await freezeWeeklyProjections({ season, week, now, schedule: new EspnNflScheduleAdapter(), evidence: store, hasAuthoritativeBaseline: () => hasCloudBaseline(store, season, week), buildCandidate: async window => (await buildProjectionCandidate({ season, week, now, apiKey, freezeWindow: window })).artifact });
  const operation = buildRunRecord({ season, week, operation: "PROJECTION_FREEZE", result: result.state, startedAt: now.toISOString(), completedAt: new Date().toISOString(), retryCount: 0, error: result.reason });
  if (result.state !== "WAITING" && result.state !== "ALREADY_FROZEN") await new FirestoreWeeklyOperationRunStore().create({ ...operation, schemaVersion: "river-city-weekly-operation-run-v1", writePerformed: result.writePerformed, sourceAsOf: null, evidenceChecksums: result.sourceChecksum ? [result.sourceChecksum] : [], issueCodes: result.reason ? [result.state] : [], recommendedAction: result.reason, schedulerInvocationId: invocationId });
  return result;
}

export const runWeeklyOperations = onSchedule({ schedule: WEEKLY_OPERATIONS_SCHEDULE, timeZone: WEEKLY_OPERATIONS_TIMEZONE, region: "us-central1", retryCount: 0, secrets: [fantasyProsApiKey] }, async event => {
  const result = await executeWeeklyOperations(new Date(), fantasyProsApiKey.value(), event.context?.eventId ?? "scheduler");
  logger.info("River City weekly operations run", { state: result.state, season: result.season, week: result.week, writePerformed: "writePerformed" in result ? result.writePerformed : false });
  if (["CONFLICT", "ERROR", "MISSED", "FREEZE_COVERAGE_INCOMPLETE"].includes(result.state)) throw new Error(`Weekly operations ${result.state}: ${result.reason ?? "review required"}`);
});
