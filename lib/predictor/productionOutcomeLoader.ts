import { adaptPredictorOutcome, type PredictorCalibrationProgress, type PredictorOutcome } from "./predictorContract";
import type { PromotionRecord } from "./promotion";

export type ProductionPredictorResult = Readonly<{ promotion: PromotionRecord; playoffProbability: Readonly<Record<string, number>>; championshipProbability: Readonly<Record<string, number>>; evidenceAsOf: string }>;
export function loadProductionPredictorOutcome(input: { progress: PredictorCalibrationProgress; projectedStandings?: PredictorOutcome["projectedStandings"]; production: ProductionPredictorResult | null }): PredictorOutcome { const approved = input.progress.readiness === "PRODUCTION_READY" ? input.production : null; return adaptPredictorOutcome({ progress: input.progress, projectedStandings: input.projectedStandings, production: approved ? { playoffProbability: approved.playoffProbability, championshipProbability: approved.championshipProbability, evidenceAsOf: approved.evidenceAsOf } : null }); }
