import { getLeagueInfo, getNFLState } from "@/lib/sleeper";
import { CloudStorageImmutableEvidenceStore, listDurableEvidence, type DurableEvidenceRecord } from "@/lib/seasonSimulator/durableEvidence";
import { APPROVED_CALIBRATION_THRESHOLDS } from "@/lib/seasonSimulator/calibrationReadiness";
import { buildPredictorCalibrationProgress, type PredictorCalibrationProgress } from "./predictorContract";

const SEASON = 2026;

async function records(store: CloudStorageImmutableEvidenceStore, week: number, kind: DurableEvidenceRecord["kind"]) {
  const paths = await listDurableEvidence(store, SEASON, week, kind);
  return (await Promise.all(paths.map(path => store.read(path)))).filter((record): record is DurableEvidenceRecord => Boolean(record));
}

export async function getPredictorCalibrationProgress(): Promise<PredictorCalibrationProgress> {
  const [state, league] = await Promise.all([getNFLState(), getLeagueInfo(undefined, { fresh: true })]);
  const currentWeek = Number(state.week);
  const lastScoredLeg = Number(league.settings?.last_scored_leg);
  const weeks = Array.from({ length: Math.max(1, Math.min(14, Number.isInteger(currentWeek) ? currentWeek : 1)) }, (_, index) => index + 1);
  const store = new CloudStorageImmutableEvidenceStore();
  const grouped = await Promise.all(weeks.map(async week => ({ week, projection: await records(store, week, "PROJECTION"), actual: await records(store, week, "ACTUAL"), residual: await records(store, week, "RESIDUAL") })));
  const residualRecords = grouped.flatMap(row => row.residual);
  const eligibleResiduals = residualRecords.filter(record => (record.payload as { diagnostics?: { validPlayerObservations?: number; validTeamObservations?: number } } | null)?.diagnostics);
  const playerSamples = eligibleResiduals.reduce((sum, record) => sum + Number((record.payload as { diagnostics?: { validPlayerObservations?: number } }).diagnostics?.validPlayerObservations ?? 0), 0);
  const teamSamples = eligibleResiduals.reduce((sum, record) => sum + Number((record.payload as { diagnostics?: { validTeamObservations?: number } }).diagnostics?.validTeamObservations ?? 0), 0);
  const eligibleWeeks = eligibleResiduals.map(record => record.week).filter((week, index, values) => values.indexOf(week) === index).sort((a, b) => a - b);
  const readiness = playerSamples >= APPROVED_CALIBRATION_THRESHOLDS.minimumPlayerSamples && teamSamples >= APPROVED_CALIBRATION_THRESHOLDS.minimumTeamSamples ? "SHADOW_READY" : "CALIBRATING";
  const latestEvidenceAt = [...grouped.flatMap(row => [...row.projection, ...row.actual, ...row.residual])].map(record => record.capturedAt).sort().at(-1) ?? null;
  const positionCoverage: Record<string, number> = {};
  const bucketCoverage: Record<string, number> = {};
  for (const record of eligibleResiduals) {
    const payload = record.payload as { playerResidualObservations?: readonly { position?: string; projectionBucket?: string }[] };
    for (const observation of payload.playerResidualObservations ?? []) {
      if (observation.position) positionCoverage[observation.position] = (positionCoverage[observation.position] ?? 0) + 1;
      if (observation.projectionBucket) bucketCoverage[observation.projectionBucket] = (bucketCoverage[observation.projectionBucket] ?? 0) + 1;
    }
  }
  return buildPredictorCalibrationProgress({
    readiness,
    projectedStandingsStatus: "UNAVAILABLE",
    probabilityStatus: readiness === "SHADOW_READY" ? "SHADOW_ONLY" : "CALIBRATING",
    playerSamples,
    playerSampleTarget: 50,
    teamSamples,
    teamSampleTarget: 12,
    eligibleWeeks,
    excludedWeeks: [{ week: 1, reason: "PATH C: no authoritative pregame projection baseline" }],
    projectionBaselines: grouped.map(row => ({ week: row.week, status: row.projection.some(record => (record.payload as { capturePurpose?: string } | null)?.capturePurpose === "CALIBRATION_BASELINE") ? "CAPTURED" : "MISSING" })),
    actualEvidence: grouped.map(row => ({ week: row.week, status: row.actual.length ? "CAPTURED" : row.week <= lastScoredLeg ? "MISSING" : "WAITING" })),
    residualEvidence: grouped.map(row => ({ week: row.week, status: row.residual.length ? "PAIRED" : "MISSING" })),
    positionCoverage,
    bucketCoverage,
    latestEvidenceAt,
  });
}
