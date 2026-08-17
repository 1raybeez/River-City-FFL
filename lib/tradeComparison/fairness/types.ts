export const FAIRNESS_MODEL_VERSION = "river-city-fairness-v2.0" as const;
export const FAIRNESS_CALIBRATION_VERSION =
  "river-city-trades-2019-2025-v1" as const;

export type FairnessCoverage = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
export type FairnessStatus = "READY" | "UNAVAILABLE";
export type FairnessLeadingSide = "A" | "B" | null;
export type FairnessFaabMode = "EXPLICIT" | "NEUTRAL";
export type FairnessKeeperCostStatus = "KNOWN_ZERO" | "KNOWN_VALUE" | "MISSING";

export type FairnessPlayer = {
  playerId: string;
  value: number | null;
  keeperCost: number | null;
  keeperCostStatus: FairnessKeeperCostStatus;
};

export type FairnessSideInput = {
  playersSent: FairnessPlayer[];
  playersReceived: FairnessPlayer[];
  faabSent?: number | null;
  faabReceived?: number | null;
};

export type FairnessCalibration = {
  version: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

export type FairnessExplanationFactor =
  | "BEST_PLAYER_PREMIUM"
  | "SECONDARY_PLAYER_DISCOUNT"
  | "KEEPER_SURPLUS_EDGE"
  | "ROSTER_SLOT_TAX"
  | "FAAB_EDGE"
  | "HISTORICAL_BAND";

export type FairnessSideResult = {
  netValue: number;
  talentSent: number;
  talentReceived: number;
  keeperSurplusSent: number;
  keeperSurplusReceived: number;
  deltaTalent: number;
  deltaSurplus: number;
  deltaFaab: number;
  rosterTax: number;
};

export type FairnessResult = {
  status: FairnessStatus;
  coverage: FairnessCoverage;
  modelVersion: typeof FAIRNESS_MODEL_VERSION;
  valueSource: string | null;
  valueSourceVersion: string | null;
  acquisitionCostSource: string | null;
  acquisitionCostSourceVersion: string | null;
  keeperCostSource: string | null;
  keeperCostSourceVersion: string | null;
  calibrationVersion: string | null;
  sideA: FairnessSideResult | null;
  sideB: FairnessSideResult | null;
  imbalanceGap: number | null;
  historicalPercentileBand: "P25" | "P50" | "P75" | "P90" | "ABOVE_P90" | null;
  fairnessScore: number | null;
  leadingSide: FairnessLeadingSide;
  explanationFactors: FairnessExplanationFactor[];
  limitations: string[];
};
