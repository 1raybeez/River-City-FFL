import type { ShadowResult } from "./shadowSimulation";
import type { PredictorReadiness } from "./predictorContract";

export const PROMOTION_SCHEMA = "river-city-predictor-promotion-v1" as const;
export type PromotionRecord = Readonly<{ schemaVersion: typeof PROMOTION_SCHEMA; readiness: "PRODUCTION_READY"; approvedBy: string; approvedAt: string; shadowResultId: string; inputEvidenceChecksums: readonly string[]; note: string | null }>;
export type ShadowValidationMetrics = Readonly<{ projectedFinishError: Readonly<Record<string, number>>; playoffBrierScore: number | null; coverageFailures: number; evaluatedWeeks: number }>;

export function validatePromotion(input: { readiness: PredictorReadiness; shadow: ShadowResult | null; approvedBy: string | null; approvedAt?: string; note?: string | null }): PromotionRecord {
  if (input.readiness !== "SHADOW_READY") throw new Error("Promotion requires SHADOW_READY readiness.");
  if (!input.shadow || input.shadow.simulationCount !== 10_000) throw new Error("Promotion requires a valid 10,000-run shadow result.");
  if (!input.approvedBy?.trim()) throw new Error("Promotion requires commissioner approval.");
  return { schemaVersion: PROMOTION_SCHEMA, readiness: "PRODUCTION_READY", approvedBy: input.approvedBy.trim(), approvedAt: input.approvedAt ?? new Date().toISOString(), shadowResultId: input.shadow.resultId, inputEvidenceChecksums: input.shadow.inputEvidenceChecksums, note: input.note ?? null };
}

export function evaluateShadowAgainstActuals(input: { shadow: ShadowResult; actualFinish: Readonly<Record<string, number>>; actualPlayoff: Readonly<Record<string, boolean>> }): ShadowValidationMetrics {
  const projectedFinishError = Object.fromEntries(input.shadow.teamResults.map(team => [team.franchiseId, Math.abs(team.projectedFinish - (input.actualFinish[team.franchiseId] ?? team.projectedFinish))]));
  const brierRows = input.shadow.teamResults.flatMap(team => input.actualPlayoff[team.franchiseId] === undefined ? [] : [(team.playoffProbability - (input.actualPlayoff[team.franchiseId] ? 1 : 0)) ** 2]);
  return { projectedFinishError, playoffBrierScore: brierRows.length ? brierRows.reduce((a, b) => a + b, 0) / brierRows.length : null, coverageFailures: input.shadow.teamResults.filter(team => !Number.isFinite(team.playoffProbability)).length, evaluatedWeeks: 1 };
}
