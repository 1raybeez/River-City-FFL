import { adaptPredictorOutcome, type PredictorCalibrationProgress, type PredictorOutcome } from "./predictorContract";
import type { PromotionRecord } from "./promotion";
import { CloudStorageShadowResultStore } from "./durableShadowStore";
import { CloudStoragePromotionStore } from "./promotionStore";

export type ProductionPredictorResult = Readonly<{ promotion: PromotionRecord; playoffProbability: Readonly<Record<string, number>>; championshipProbability: Readonly<Record<string, number>>; evidenceAsOf: string }>;
export function loadProductionPredictorOutcome(input: { progress: PredictorCalibrationProgress; projectedStandings?: PredictorOutcome["projectedStandings"]; production: ProductionPredictorResult | null }): PredictorOutcome { const approved = input.progress.readiness === "PRODUCTION_READY" ? input.production : null; return adaptPredictorOutcome({ progress: input.progress, projectedStandings: input.projectedStandings, production: approved ? { playoffProbability: approved.playoffProbability, championshipProbability: approved.championshipProbability, evidenceAsOf: approved.evidenceAsOf } : null }); }

export async function loadProductionPredictorOutcomeFromStorage(input: { progress: PredictorCalibrationProgress; projectedStandings?: PredictorOutcome["projectedStandings"]; season: number }): Promise<PredictorOutcome> {
  const latestShadow = await new CloudStorageShadowResultStore().readLatest(input.season).catch(() => null);
  const projectedStandings = input.projectedStandings ?? latestShadow?.teamResults.map(team => ({ franchiseId: team.franchiseId, teamName: team.teamName, projectedWins: team.projectedWins, projectedLosses: team.projectedLosses, projectedFinish: team.projectedFinish })) ?? [];
  if (input.progress.readiness !== "PRODUCTION_READY") return loadProductionPredictorOutcome({ ...input, projectedStandings, production: null });
  const promotion = await new CloudStoragePromotionStore().read(input.season);
  if (!promotion) return loadProductionPredictorOutcome({ ...input, projectedStandings, production: null });
  const shadow = await new CloudStorageShadowResultStore().read(promotion.shadowResultId);
  if (!shadow || shadow.resultId !== promotion.shadowResultId) return loadProductionPredictorOutcome({ ...input, projectedStandings, production: null });
  const playoffProbability = Object.fromEntries(shadow.teamResults.map(team => [team.franchiseId, team.playoffProbability]));
  const championshipProbability = Object.fromEntries(shadow.teamResults.filter(team => team.championshipProbability !== null).map(team => [team.franchiseId, team.championshipProbability as number]));
  return loadProductionPredictorOutcome({ ...input, projectedStandings: shadow.teamResults.map(team => ({ franchiseId: team.franchiseId, teamName: team.teamName, projectedWins: team.projectedWins, projectedLosses: team.projectedLosses, projectedFinish: team.projectedFinish })), production: { promotion, playoffProbability, championshipProbability, evidenceAsOf: shadow.generatedAt } });
}
