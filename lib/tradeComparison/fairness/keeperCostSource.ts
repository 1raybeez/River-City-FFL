import type { FairnessKeeperCostStatus } from "./types";

export type KeeperStatus = "KEEPER" | "NON_KEEPER" | "UNKNOWN";
export type KeeperCostState =
  | "KNOWN_VALUE"
  | "KNOWN_ZERO"
  | "NOT_APPLICABLE"
  | "MISSING";

export type KeeperCostSnapshotEntry = {
  season: number;
  franchiseId: string;
  playerId: string;
  keeperStatus: KeeperStatus;
  keeperCost: number | null;
  costState: KeeperCostState;
  source: string;
  sourceVersion: string;
  generatedAt: string;
};

export type KeeperSourceRecord = {
  season: number;
  franchiseId: string;
  playerId: string;
  isKeeper: boolean | null;
  keeperCost: number | null;
  source: string;
  sourceVersion: string;
  generatedAt: string;
};

export function normalizeKeeperSourceRecord(
  record: KeeperSourceRecord
): KeeperCostSnapshotEntry {
  if (record.isKeeper === true) {
    const costState: KeeperCostState =
      typeof record.keeperCost === "number" && Number.isFinite(record.keeperCost)
        ? record.keeperCost === 0
          ? "KNOWN_ZERO"
          : record.keeperCost > 0
            ? "KNOWN_VALUE"
            : "MISSING"
        : "MISSING";

    return {
      ...record,
      keeperStatus: "KEEPER",
      keeperCost: costState === "MISSING" ? null : record.keeperCost,
      costState,
    };
  }

  if (record.isKeeper === false) {
    return {
      ...record,
      keeperStatus: "NON_KEEPER",
      keeperCost: null,
      costState: "NOT_APPLICABLE",
    };
  }

  return {
    ...record,
    keeperStatus: "UNKNOWN",
    keeperCost: null,
    costState: "MISSING",
  };
}

/**
 * The current fairness evaluator can represent a non-keeper only after an
 * explicit commissioner choice. No default is provided here on purpose.
 */
export function toFairnessKeeperCostStatus(
  entry: KeeperCostSnapshotEntry,
  nonKeeperTreatment: "ZERO_COST_ASSET" | "NO_KEEPER_SURPLUS" | null
): FairnessKeeperCostStatus {
  if (entry.keeperStatus === "KEEPER") {
    if (entry.costState === "KNOWN_ZERO") return "KNOWN_ZERO";
    if (entry.costState === "KNOWN_VALUE") return "KNOWN_VALUE";
    return "MISSING";
  }

  if (entry.keeperStatus === "NON_KEEPER" && nonKeeperTreatment === "ZERO_COST_ASSET") {
    return "KNOWN_ZERO";
  }

  return "MISSING";
}
