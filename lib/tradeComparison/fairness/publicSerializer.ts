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
    coverageDetail: result.coverageDetail
      ? {
          modelValue: result.coverageDetail.modelValue,
          acquisitionCost: result.coverageDetail.acquisitionCost,
          auctionConsensus: result.coverageDetail.auctionConsensus,
          adpConsensus: result.coverageDetail.adpConsensus,
          calibration: result.coverageDetail.calibration,
        }
      : undefined,
    marketIntelligence: result.marketIntelligence
      ? {
          packages: result.marketIntelligence.packages.map((pkg) => ({
            packageId: pkg.packageId,
            totalAuctionConsensus: pkg.totalAuctionConsensus,
            auctionConsensusCoverage: pkg.auctionConsensusCoverage,
            completeAuctionContextCount: pkg.completeAuctionContextCount,
            totalPlayerCount: pkg.totalPlayerCount,
            medianAdp: pkg.medianAdp,
            bestAdp: pkg.bestAdp,
            adpCoverage: pkg.adpCoverage,
            completeAdpContextCount: pkg.completeAdpContextCount,
          })),
          signalAgreement: {
            state: result.marketIntelligence.signalAgreement.state,
            modelPackageId: result.marketIntelligence.signalAgreement.modelPackageId,
            supportingSignals: result.marketIntelligence.signalAgreement.supportingSignals.map((signal) => ({
              signal: signal.signal,
              strongerPackageId: signal.strongerPackageId,
              disposition: signal.disposition,
            })),
          },
          reasoning: result.marketIntelligence.reasoning.map((factor) => ({
            packageId: factor.packageId,
            source: factor.source,
            code: factor.code,
          })),
        }
      : undefined,
  };
}
