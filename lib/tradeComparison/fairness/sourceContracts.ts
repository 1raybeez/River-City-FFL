/**
 * Minimal server-owned input contracts for a future fairness activation.
 * These deliberately exclude the richer FantasyCalc and War Room payloads.
 */
export const FANTASYCALC_FAIRNESS_CONFIGURATION = {
  format: "Dynasty",
  quarterbackFormat: "1QB",
  teams: 12,
  scoring: "Half PPR",
  tePremium: false,
} as const;

export type FairnessValueSnapshotRow = {
  playerId: string;
  modelValue: number;
  source: "FantasyCalc";
  sourceConfiguration: typeof FANTASYCALC_FAIRNESS_CONFIGURATION;
  generatedAt: string;
  season: number;
  modelValueVersion: string;
};

export type KeeperCostAvailability = "KNOWN_ZERO" | "KNOWN_VALUE" | "MISSING";

export type FairnessKeeperCostSnapshotRow = {
  season: number;
  franchiseId: string;
  playerId: string;
  keeperCost: number | null;
  availability: KeeperCostAvailability;
  source: string;
  sourceVersion: string;
  generatedAt: string;
};

export type FairnessProvenance = {
  valueSource: string;
  valueSourceVersion: string;
  acquisitionCostSource: string;
  acquisitionCostSourceVersion: string;
  /** Legacy label retained only for historical fixture compatibility. */
  keeperCostSource?: string;
  keeperCostSourceVersion?: string;
};

export const FAIRNESS_SOURCE_CONTRACT_LIMITATIONS = [
  "FantasyCalc candidate rows are review-only until a server-owned snapshot is approved.",
  "Keeper costs must come from a minimal approved contract, not the private War Room state object.",
  "Known zero keeper cost and missing keeper cost are separate states.",
] as const;
