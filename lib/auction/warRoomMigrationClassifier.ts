import { classifyLegacyWarRoomScope } from "@/lib/auction/warRoomScope";

export type WarRoomMigrationAction =
  | "NO MIGRATION NEEDED"
  | "MIGRATE TO WAR ROOM"
  | "ALREADY REPRESENTED"
  | "CONFLICT"
  | "DEMO/LOCAL ONLY"
  | "GLOBAL — KEEP GLOBAL";

export type WarRoomMigrationRecord = {
  sourcePath: string;
  sourceType: "owner-profile" | "purchase" | "war-room" | "demo";
  ownerProfileId?: string | null;
  warRoomId?: string | null;
  action: WarRoomMigrationAction;
  targetWarRoomId: string | null;
  reason: string;
};

export function classifyWarRoomMigrationRecord({
  sourcePath,
  sourceType,
  ownerProfileId,
  warRoomId,
  targetAlreadyExists = false,
}: {
  sourcePath: string;
  sourceType: WarRoomMigrationRecord["sourceType"];
  ownerProfileId?: string | null;
  warRoomId?: string | null;
  targetAlreadyExists?: boolean;
}): WarRoomMigrationRecord {
  if (sourceType === "demo") {
    return {
      sourcePath,
      sourceType,
      ownerProfileId,
      warRoomId,
      action: "DEMO/LOCAL ONLY",
      targetWarRoomId: null,
      reason: "Local demo source has no production record.",
    };
  }

  if (sourceType === "purchase") {
    return {
      sourcePath,
      sourceType,
      ownerProfileId,
      warRoomId,
      action: "GLOBAL — KEEP GLOBAL",
      targetWarRoomId: null,
      reason: "Commissioner purchase records remain authoritative and global; manager reads filter them by authorized roster.",
    };
  }

  if (sourceType === "war-room") {
    return {
      sourcePath,
      sourceType,
      ownerProfileId,
      warRoomId,
      action: warRoomId ? "ALREADY REPRESENTED" : "CONFLICT",
      targetWarRoomId: warRoomId ?? null,
      reason: warRoomId
        ? "State is already under the franchise War Room namespace."
        : "War Room state is missing its scope identifier.",
    };
  }

  const legacyScope = ownerProfileId
    ? classifyLegacyWarRoomScope(ownerProfileId)
    : null;
  if (!legacyScope) {
    return {
      sourcePath,
      sourceType,
      ownerProfileId,
      warRoomId,
      action: "CONFLICT",
      targetWarRoomId: null,
      reason: "Legacy owner profile has no deterministic approved War Room mapping.",
    };
  }

  return {
    sourcePath,
    sourceType,
    ownerProfileId,
    warRoomId,
    action: targetAlreadyExists ? "ALREADY REPRESENTED" : "MIGRATE TO WAR ROOM",
    targetWarRoomId: legacyScope.targetWarRoomId,
    reason: targetAlreadyExists
      ? "Target War Room already contains represented state; no migration is proposed."
      : "Legacy owner-profile state requires reviewed migration to the deterministic War Room target.",
  };
}
