import type { FairnessResult } from "./types";

export function serializePublicFairnessResult(result: FairnessResult) {
  return {
    status: result.status,
    coverage: result.coverage,
    modelVersion: result.modelVersion,
    valueSource: result.valueSource,
    valueSourceVersion: result.valueSourceVersion,
    acquisitionCostSource: result.acquisitionCostSource,
    acquisitionCostSourceVersion: result.acquisitionCostSourceVersion,
    keeperCostSource: result.keeperCostSource,
    keeperCostSourceVersion: result.keeperCostSourceVersion,
    calibrationVersion: result.calibrationVersion,
    sideA: result.sideA,
    sideB: result.sideB,
    imbalanceGap: result.imbalanceGap,
    historicalPercentileBand: result.historicalPercentileBand,
    fairnessScore: result.fairnessScore,
    leadingSide: result.leadingSide,
    explanationFactors: [...result.explanationFactors],
    limitations: [...result.limitations],
  };
}
