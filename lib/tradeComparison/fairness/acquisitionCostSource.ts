export type AcquisitionType = "KEEPER" | "AUCTION" | "FREE_AGENT" | "UNKNOWN";
export type AcquisitionCostState =
  | "KNOWN"
  | "KNOWN_ZERO"
  | "NOT_APPLICABLE"
  | "PENDING_AUCTION"
  | "MISSING";

export type AcquisitionCostSnapshotEntry = {
  season: number;
  franchiseId: string;
  playerId: string;
  acquisitionType: AcquisitionType;
  acquisitionCost: number | null;
  costState: AcquisitionCostState;
  source: string;
  sourceVersion: string;
  generatedAt: string;
};

export type AcquisitionSourceRecord = {
  season: number;
  franchiseId: string;
  playerId: string;
  acquisitionType: AcquisitionType;
  acquisitionCost: number | null;
  source: string;
  sourceVersion: string;
  generatedAt: string;
};

export const ACQUISITION_SOURCE_PRIORITY = [
  "sleeper-finalized-draft",
  "sleeper-keeper",
  "server-owned-acquisition-snapshot",
  "approved-historical-fact",
] as const;

export function normalizeAcquisitionSourceRecord(
  record: AcquisitionSourceRecord
): AcquisitionCostSnapshotEntry {
  if (record.acquisitionType === "UNKNOWN") {
    return { ...record, acquisitionCost: null, costState: "MISSING" };
  }

  if (record.acquisitionType === "FREE_AGENT") {
    return {
      ...record,
      acquisitionCost: null,
      costState: "MISSING",
    };
  }

  if (record.acquisitionType === "AUCTION" && record.acquisitionCost === null) {
    return {
      ...record,
      costState: "PENDING_AUCTION",
    };
  }

  if (
    typeof record.acquisitionCost !== "number" ||
    !Number.isFinite(record.acquisitionCost) ||
    record.acquisitionCost < 0
  ) {
    return {
      ...record,
      acquisitionCost: null,
      costState: "MISSING",
    };
  }

  return {
    ...record,
    costState: record.acquisitionCost === 0 ? "KNOWN_ZERO" : "KNOWN",
  };
}

export type AcquisitionRoster = {
  franchiseId: string;
  playerIds: readonly string[];
};

export type AcquisitionReconciliation = {
  entries: AcquisitionCostSnapshotEntry[];
  duplicatePlayerIds: string[];
  orphanedAcquisitions: string[];
  rosteredWithoutAcquisition: string[];
};

export function reconcileAcquisitionSnapshot({
  rosters,
  acquisitions,
}: {
  rosters: readonly AcquisitionRoster[];
  acquisitions: readonly AcquisitionCostSnapshotEntry[];
}): AcquisitionReconciliation {
  const rosterByPlayer = new Map<string, string>();
  rosters.forEach((roster) => {
    roster.playerIds.forEach((playerId) => rosterByPlayer.set(`${roster.franchiseId}:${playerId}`, playerId));
  });

  const seen = new Set<string>();
  const duplicatePlayerIds: string[] = [];
  const orphanedAcquisitions: string[] = [];
  acquisitions.forEach((entry) => {
    const key = `${entry.franchiseId}:${entry.playerId}`;
    if (seen.has(key)) duplicatePlayerIds.push(key);
    seen.add(key);
    if (!rosterByPlayer.has(key)) orphanedAcquisitions.push(key);
  });

  const rosteredWithoutAcquisition = rosters.flatMap((roster) =>
    roster.playerIds
      .filter((playerId) => !seen.has(`${roster.franchiseId}:${playerId}`))
      .map((playerId) => `${roster.franchiseId}:${playerId}`)
  );

  return {
    entries: [...acquisitions],
    duplicatePlayerIds,
    orphanedAcquisitions,
    rosteredWithoutAcquisition,
  };
}
