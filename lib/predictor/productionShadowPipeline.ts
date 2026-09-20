import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import { getPredictorCalibrationProgress } from "./calibrationStatus";
import { applyFutureExpectedScores, buildFutureExpectedScoresFromFantasyPros } from "./futureExpectedScores";
import { loadCanonicalLivePredictorInputs } from "./liveInputs";
import { runShadowIfEligible } from "./shadowOrchestration";
import { SHADOW_SIMULATION_COUNT, type ShadowResultStore } from "./shadowSimulation";

export type ProductionShadowPipelineResult = Readonly<{ state: "NOT_READY" | "ALREADY_EXISTS" | "CREATED"; reason?: string; resultId?: string }>;

export async function runProductionShadowPipeline(input: { now?: Date; fantasyProsApiKey: string; shadowStore: ShadowResultStore }): Promise<ProductionShadowPipelineResult> {
  const now = input.now ?? new Date();
  const progress = await getPredictorCalibrationProgress();
  if (progress.readiness !== "SHADOW_READY") return { state: "NOT_READY", reason: "CALIBRATION_NOT_SHADOW_READY" };
  const live = await loadCanonicalLivePredictorInputs();
  const expected = await buildFutureExpectedScoresFromFantasyPros({ season: live.season, throughWeek: live.currentWeek, remaining: live.schedule.remaining, now, apiKey: input.fantasyProsApiKey });
  if (!expected.available) return { state: "NOT_READY", reason: "EXPECTED_SCORES_UNAVAILABLE" };
  const remaining = applyFutureExpectedScores(live.schedule.remaining, expected);
  const inputEvidenceChecksums = [checksum(live.standings), checksum(live.schedule.schedule.matchups), expected.inputChecksum];
  const existing = await input.shadowStore.findByInput({ season: live.season, throughWeek: live.currentWeek, simulationCount: SHADOW_SIMULATION_COUNT, inputEvidenceChecksums });
  if (existing) return { state: "ALREADY_EXISTS", resultId: existing.resultId };
  const result = runShadowIfEligible({ readiness: progress.readiness, currentResultId: null, inputEvidenceChecksums, requestedInputEvidenceChecksums: inputEvidenceChecksums, season: live.season, throughWeek: live.currentWeek, teams: live.standings, remaining, generatedAt: now.toISOString() });
  if (!result) return { state: "NOT_READY", reason: "SHADOW_TRIGGER_NOT_ELIGIBLE" };
  await input.shadowStore.create(result);
  return { state: "CREATED", resultId: result.resultId };
}
