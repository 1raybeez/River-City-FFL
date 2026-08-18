import {
  adjustedTalent,
  FAAB_WEIGHT,
  keeperSurplus,
  KEEPER_SURPLUS_WEIGHT,
  rosterTax,
} from "./packageValue";
import { RIVER_CITY_HISTORICAL_CALIBRATION, scoreHistoricalGap } from "./historicalCalibration";
import {
  FAIRNESS_CALIBRATION_VERSION,
  FAIRNESS_MODEL_VERSION,
  type FairnessCalibration,
  type FairnessFaabMode,
  type FairnessExplanationFactor,
  type FairnessPlayer,
  type FairnessResult,
  type FairnessSideInput,
} from "./types";
import type { FairnessProvenance } from "./sourceContracts";

function hasCompletePlayers(players: readonly FairnessPlayer[]) {
  return players.every(
    (player) =>
      typeof player.value === "number" &&
      Number.isFinite(player.value) &&
      typeof player.keeperCost === "number" &&
      Number.isFinite(player.keeperCost) &&
      player.keeperCostStatus !== "MISSING" &&
      (player.keeperCostStatus === "KNOWN_ZERO" ? player.keeperCost === 0 : player.keeperCost >= 0)
  );
}

function unavailableResult(coverage: "PARTIAL" | "UNAVAILABLE", limitations: string[]): FairnessResult {
  return {
    status: "UNAVAILABLE",
    coverage,
    modelVersion: FAIRNESS_MODEL_VERSION,
    valueSource: null,
    valueSourceVersion: null,
    acquisitionCostSource: null,
    acquisitionCostSourceVersion: null,
    keeperCostSource: null,
    keeperCostSourceVersion: null,
    calibrationVersion: null,
    sideA: null,
    sideB: null,
    imbalanceGap: null,
    historicalPercentileBand: null,
    fairnessScore: null,
    leadingSide: null,
    explanationFactors: [],
    limitations,
    coverageDetail: {
      modelValue: coverage === "UNAVAILABLE" ? "UNAVAILABLE" : "PARTIAL",
      acquisitionCost: coverage === "UNAVAILABLE" ? "UNAVAILABLE" : "PARTIAL",
      auctionConsensus: "UNAVAILABLE",
      adpConsensus: "UNAVAILABLE",
      calibration: "UNAVAILABLE",
    },
  };
}

function sideResult(side: FairnessSideInput) {
  const talentSent = adjustedTalent(side.playersSent);
  const talentReceived = adjustedTalent(side.playersReceived);
  const keeperSurplusSent = keeperSurplus(side.playersSent);
  const keeperSurplusReceived = keeperSurplus(side.playersReceived);
  const deltaTalent = talentReceived - talentSent;
  const deltaSurplus = keeperSurplusReceived - keeperSurplusSent;
  const deltaFaab = (side.faabReceived ?? 0) - (side.faabSent ?? 0);
  const tax = rosterTax(side.playersSent, side.playersReceived);
  const netValue = deltaTalent + deltaSurplus * KEEPER_SURPLUS_WEIGHT + deltaFaab * FAAB_WEIGHT - tax;
  return { netValue, talentSent, talentReceived, keeperSurplusSent, keeperSurplusReceived, deltaTalent, deltaSurplus, deltaFaab, rosterTax: tax };
}

export function evaluateFairness({
  sideA,
  sideB,
  valueSource,
  provenance,
  calibration = RIVER_CITY_HISTORICAL_CALIBRATION,
  faabMode = "NEUTRAL" as FairnessFaabMode,
}: {
  sideA: FairnessSideInput;
  sideB: FairnessSideInput;
  valueSource: string;
  provenance: FairnessProvenance;
  calibration?: FairnessCalibration | null;
  faabMode?: FairnessFaabMode;
}): FairnessResult {
  const allPlayers = [...sideA.playersSent, ...sideA.playersReceived, ...sideB.playersSent, ...sideB.playersReceived];
  if (allPlayers.length === 0) return unavailableResult("UNAVAILABLE", ["No player assets were supplied."]);
  if (!hasCompletePlayers(allPlayers)) {
    const hasPartial = allPlayers.some(
      (player) => player.value !== null || player.keeperCost !== null || player.keeperCostStatus !== "MISSING"
    );
    return unavailableResult(hasPartial ? "PARTIAL" : "UNAVAILABLE", [
      "Fairness requires complete player-value and keeper-cost coverage.",
      "Missing values are not converted to zero.",
    ]);
  }
  if (!calibration) return unavailableResult("UNAVAILABLE", ["Historical calibration is unavailable."]);

  const configuredSideA = faabMode === "EXPLICIT" ? sideA : { ...sideA, faabSent: 0, faabReceived: 0 };
  const configuredSideB = faabMode === "EXPLICIT" ? sideB : { ...sideB, faabSent: 0, faabReceived: 0 };
  const resultA = sideResult(configuredSideA);
  const resultB = sideResult(configuredSideB);
  const gap = Math.abs(Math.max(resultA.netValue, resultB.netValue) - Math.min(resultA.netValue, resultB.netValue));
  const historical = scoreHistoricalGap(gap, calibration);
  const factors: FairnessExplanationFactor[] = ["HISTORICAL_BAND"];
  if (allPlayers.some((player) => (player.value ?? 0) > 40)) factors.push("BEST_PLAYER_PREMIUM");
  if (allPlayers.length > 2) factors.push("SECONDARY_PLAYER_DISCOUNT");
  if (resultA.deltaSurplus !== 0 || resultB.deltaSurplus !== 0) factors.push("KEEPER_SURPLUS_EDGE");
  if (resultA.rosterTax > 0 || resultB.rosterTax > 0) factors.push("ROSTER_SLOT_TAX");
  if (resultA.deltaFaab !== 0 || resultB.deltaFaab !== 0) factors.push("FAAB_EDGE");

  return {
    status: "READY",
    coverage: "COMPLETE",
    modelVersion: FAIRNESS_MODEL_VERSION,
    valueSource,
    valueSourceVersion: provenance.valueSourceVersion,
    acquisitionCostSource: provenance.acquisitionCostSource,
    acquisitionCostSourceVersion: provenance.acquisitionCostSourceVersion,
    keeperCostSource: provenance.keeperCostSource ?? provenance.acquisitionCostSource,
    keeperCostSourceVersion: provenance.keeperCostSourceVersion ?? provenance.acquisitionCostSourceVersion,
    calibrationVersion: calibration.version || FAIRNESS_CALIBRATION_VERSION,
    sideA: resultA,
    sideB: resultB,
    imbalanceGap: gap,
    historicalPercentileBand: historical.band,
    fairnessScore: historical.score,
    leadingSide: resultA.netValue === resultB.netValue ? null : resultA.netValue > resultB.netValue ? "A" : "B",
    explanationFactors: factors,
    limitations: [
      "This is a River City-specific model estimate, not an objective determination of trade fairness.",
      ...(faabMode === "NEUTRAL" ? ["FAAB is neutral until explicit transferred-FAAB inputs are approved."] : []),
    ],
    coverageDetail: {
      modelValue: "COMPLETE",
      acquisitionCost: "COMPLETE",
      auctionConsensus: "UNAVAILABLE",
      adpConsensus: "UNAVAILABLE",
      calibration: "COMPLETE",
    },
  };
}
