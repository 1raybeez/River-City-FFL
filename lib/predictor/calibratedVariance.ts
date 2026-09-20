import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import { listDurableEvidence, type CloudStorageImmutableEvidenceStore } from "@/lib/seasonSimulator/durableEvidence";
import { buildVarianceModel, projectionBucket, sampleSimulatedPoints, type ProjectionResidualObservation, type VarianceModel } from "@/lib/seasonSimulator/varianceFoundation";

export const CALIBRATED_VARIANCE_SOURCE = "RIVER_CITY_TEAM_RESIDUAL_BOOTSTRAP" as const;
export const CALIBRATED_VARIANCE_MODEL = "river-city-variance-v1" as const;
export const MINIMUM_TEAM_VARIANCE_SAMPLES = 12 as const;

export type CalibratedVarianceContract = Readonly<{
  status: "READY" | "UNAVAILABLE";
  source: typeof CALIBRATED_VARIANCE_SOURCE;
  modelVersion: typeof CALIBRATED_VARIANCE_MODEL;
  evidenceIdentity: string | null;
  eligibleResidualWeeks: readonly number[];
  teamSampleCount: number;
  models: readonly VarianceModel[];
  sample: (expectedScore: number, seed: string, drawIndex: number) => number | null;
}>;

function unavailable(weeks: readonly number[], evidenceIdentity: string | null = null): CalibratedVarianceContract {
  return { status: "UNAVAILABLE", source: CALIBRATED_VARIANCE_SOURCE, modelVersion: CALIBRATED_VARIANCE_MODEL, evidenceIdentity, eligibleResidualWeeks: weeks, teamSampleCount: 0, models: [], sample: () => null };
}

export function buildCalibratedTeamVariance(observations: readonly ProjectionResidualObservation[], evidenceIdentity: string, eligibleResidualWeeks: readonly number[]): CalibratedVarianceContract {
  const models = ["0-5", "5-10", "10-15", "15-20", "20+"].map(bucket => buildVarianceModel(observations, "LEAGUE", bucket as ProjectionResidualObservation["projectionBucket"], MINIMUM_TEAM_VARIANCE_SAMPLES)).filter((model): model is VarianceModel => Boolean(model));
  const league = buildVarianceModel(observations, "LEAGUE", null, MINIMUM_TEAM_VARIANCE_SAMPLES);
  if (!league) return unavailable(eligibleResidualWeeks, evidenceIdentity);
  const allModels = [...models, league];
  return {
    status: "READY", source: CALIBRATED_VARIANCE_SOURCE, modelVersion: CALIBRATED_VARIANCE_MODEL, evidenceIdentity, eligibleResidualWeeks, teamSampleCount: observations.length, models: allModels,
    sample: (expectedScore, seed, drawIndex) => {
      const selected = models.find(model => model.projectionBucket === projectionBucket(expectedScore)) ?? league;
      return sampleSimulatedPoints(expectedScore, "QB", selected, seed, drawIndex);
    },
  };
}

export async function loadCalibratedTeamVariance(input: { season: number; throughWeek: number; store: CloudStorageImmutableEvidenceStore }): Promise<CalibratedVarianceContract> {
  const records = [] as Awaited<ReturnType<typeof input.store.read>>[];
  const paths = await Promise.all(Array.from({ length: input.throughWeek }, (_, index) => listDurableEvidence(input.store, input.season, index + 1, "RESIDUAL")));
  for (const weekPaths of paths) for (const path of weekPaths) records.push(await input.store.read(path));
  const valid = records.filter((record): record is NonNullable<typeof record> => Boolean(record));
  const observations: ProjectionResidualObservation[] = [];
  const weeks: number[] = [];
  const identities: string[] = [];
  for (const record of valid) {
    const payload = record.payload as { week?: number; diagnostics?: { validTeamObservations?: number }; teamResidualObservations?: readonly { franchiseId: string; expectedTeamScore: number | null; actualTeamScore: number | null; completeCoverage: boolean }[] };
    const rows = payload.teamResidualObservations ?? [];
    const complete = rows.filter(row => row.completeCoverage && Number.isFinite(row.expectedTeamScore) && Number.isFinite(row.actualTeamScore));
    if (complete.length < 1) continue;
    weeks.push(Number(payload.week ?? record.week)); identities.push(record.recordChecksum);
    for (const row of complete) {
      const observation = { season: record.season, week: record.week, playerId: row.franchiseId, position: "LEAGUE" as const, projectedPoints: row.expectedTeamScore, actualPoints: row.actualTeamScore, actualFinal: true, availabilityStatus: "AVAILABLE", projectionSource: "FANTASYPROS", providerVersion: null };
      const built = (await import("@/lib/seasonSimulator/varianceFoundation")).calculateResidualObservation(observation);
      if (built) observations.push(built);
    }
  }
  return buildCalibratedTeamVariance(observations, checksum({ source: CALIBRATED_VARIANCE_SOURCE, modelVersion: CALIBRATED_VARIANCE_MODEL, records: identities.sort() }), [...new Set(weeks)].sort((a, b) => a - b));
}
