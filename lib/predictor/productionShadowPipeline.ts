import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import { getPredictorCalibrationProgress } from "./calibrationStatus";
import { applyFutureExpectedScores, buildFantasyProsScoreMatrix, buildFutureExpectedScoresFromFantasyPros } from "./futureExpectedScores";
import { loadCanonicalLivePredictorInputs } from "./liveInputs";
import { runShadowIfEligible } from "./shadowOrchestration";
import { SHADOW_SIMULATION_COUNT, type ShadowResultStore } from "./shadowSimulation";
import { loadCalibratedTeamVariance } from "./calibratedVariance";
import { CloudStorageImmutableEvidenceStore } from "@/lib/seasonSimulator/durableEvidence";

export type ProductionShadowPipelineResult = Readonly<{ state: "NOT_READY" | "ALREADY_EXISTS" | "CREATED"; reason?: string; resultId?: string }>;

const VARIANCE_MODEL_IDENTITY = "river-city-variance-v1";
const PLAYOFF_WEEKS = [15, 16, 17] as const;

export async function buildCurrentPredictorInputIdentity(input: { now: Date; fantasyProsApiKey: string }) {
  const live = await loadCanonicalLivePredictorInputs();
  const expected = await buildFutureExpectedScoresFromFantasyPros({ season: live.season, throughWeek: live.currentWeek, remaining: live.schedule.remaining, now: input.now, apiKey: input.fantasyProsApiKey });
  if (!expected.available) throw new Error("EXPECTED_SCORES_UNAVAILABLE");
  let playoff;
  try { playoff = await buildFantasyProsScoreMatrix({ season: live.season, weeks: PLAYOFF_WEEKS, franchiseIds: live.standings.map(team => team.franchiseId), now: input.now, apiKey: input.fantasyProsApiKey }); } catch { playoff = { rows: [], inputChecksum: checksum({ model: "river-city-playoff-expected-scores-v1", season: live.season, weeks: PLAYOFF_WEEKS, status: "UNAVAILABLE" }) }; }
  const calibrationProgress = await getPredictorCalibrationProgress();
  const variance = await loadCalibratedTeamVariance({ season: live.season, throughWeek: live.currentWeek, store: new CloudStorageImmutableEvidenceStore() });
  const calibration = checksum({ readiness: calibrationProgress.readiness, eligibleWeeks: calibrationProgress.eligibleWeeks, playerSamples: calibrationProgress.playerSamples, teamSamples: calibrationProgress.teamSamples, latestEvidenceAt: calibrationProgress.latestEvidenceAt });
  const inputIdentities = { standings: checksum(live.standings), schedule: checksum(live.schedule.schedule.matchups), expectedScores: expected.inputChecksum, playoffExpectedScores: playoff.inputChecksum, calibration, variance: variance.evidenceIdentity ?? VARIANCE_MODEL_IDENTITY };
  return { live, expected, playoff, variance, inputIdentities, inputEvidenceChecksums: Object.values(inputIdentities).sort() };
}

export async function runProductionShadowPipeline(input: { now?: Date; fantasyProsApiKey: string; shadowStore: ShadowResultStore }): Promise<ProductionShadowPipelineResult> {
  const now = input.now ?? new Date();
  const progress = await getPredictorCalibrationProgress();
  if (progress.readiness !== "SHADOW_READY") return { state: "NOT_READY", reason: "CALIBRATION_NOT_SHADOW_READY" };
  let current;
  try { current = await buildCurrentPredictorInputIdentity({ now, fantasyProsApiKey: input.fantasyProsApiKey }); } catch { return { state: "NOT_READY", reason: "EXPECTED_SCORES_UNAVAILABLE" }; }
  const { live, expected } = current;
  if (current.variance.status !== "READY") return { state: "NOT_READY", reason: "VARIANCE_NOT_READY" };
  const remaining = applyFutureExpectedScores(live.schedule.remaining, expected);
  const inputEvidenceChecksums = current.inputEvidenceChecksums;
  const playoffExpectedScores = current.playoff.rows.length === PLAYOFF_WEEKS.length * live.standings.length && current.playoff.rows.every(row => row.status === "AVAILABLE" && row.expectedScore !== null)
    ? Object.fromEntries(PLAYOFF_WEEKS.map(week => [String(week), Object.fromEntries(current.playoff.rows.filter(row => row.week === week).map(row => [row.franchiseId, row.expectedScore!]))]))
    : undefined;
  const existing = await input.shadowStore.findByInput({ season: live.season, throughWeek: live.currentWeek, simulationCount: SHADOW_SIMULATION_COUNT, inputEvidenceChecksums });
  if (existing) return { state: "ALREADY_EXISTS", resultId: existing.resultId };
  const result = runShadowIfEligible({ readiness: progress.readiness, currentResultId: null, inputEvidenceChecksums, requestedInputEvidenceChecksums: inputEvidenceChecksums, season: live.season, throughWeek: live.currentWeek, teams: live.standings, remaining, generatedAt: now.toISOString(), playoffExpectedScores, variance: current.variance, inputIdentities: { standings: current.inputIdentities.standings, schedule: current.inputIdentities.schedule, expectedScores: current.inputIdentities.expectedScores, playoffExpectedScores: current.inputIdentities.playoffExpectedScores, calibration: current.inputIdentities.calibration, varianceModel: "river-city-variance-v1" } });
  if (!result) return { state: "NOT_READY", reason: "SHADOW_TRIGGER_NOT_ELIGIBLE" };
  await input.shadowStore.create(result);
  return { state: "CREATED", resultId: result.resultId };
}
