import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";
import { assertWarRoomScope } from "@/lib/auth/canonicalAuctionAuthorization";

export const AUCTION_WAR_ROOM_COLLECTION = "auction_war_rooms";
export const AUCTION_WAR_ROOM_SCHEMA_VERSION = 1;

export type WarRoomActorContext = {
  canonicalOwnerId: string;
  warRoomId: string;
  franchiseId: string;
  actorEmail: string;
};

export function resolveWarRoomActorContext(
  access: Pick<
    AuctionAccessResult,
    | "authenticated"
    | "email"
    | "canonicalOwnerId"
    | "authorizedFranchiseId"
    | "warRoomId"
    | "sleeperRosterId"
    | "canAccessWarRoom"
  >
): WarRoomActorContext | null {
  if (
    !access.authenticated ||
    !access.canAccessWarRoom ||
    !access.email ||
    !access.canonicalOwnerId ||
    !access.authorizedFranchiseId ||
    !access.warRoomId
  ) {
    return null;
  }

  return {
    canonicalOwnerId: access.canonicalOwnerId,
    warRoomId: access.warRoomId,
    franchiseId: access.authorizedFranchiseId,
    actorEmail: access.email,
  };
}

export function assertAuthorizedWarRoomRequest(
  access: Pick<
    AuctionAccessResult,
    | "canonicalOwnerId"
    | "authorizedFranchiseId"
    | "warRoomId"
    | "sleeperRosterId"
  >,
  requested?: {
    ownerId?: string | null;
    ownerProfileId?: string | null;
    franchiseId?: string | null;
    warRoomId?: string | null;
    rosterId?: string | number | null;
  }
) {
  if (
    !access.canonicalOwnerId ||
    !access.authorizedFranchiseId ||
    !access.warRoomId
  ) {
    throw new Error("Authenticated War Room scope is required.");
  }

  const requestedOwnerId = requested?.ownerId ?? requested?.ownerProfileId;
  const requestedRosterId = requested?.rosterId;

  if (
    requestedRosterId !== undefined &&
    requestedRosterId !== null &&
    String(requestedRosterId) !== String(access.sleeperRosterId)
  ) {
    throw new Error("Requested War Room roster scope is not authorized.");
  }

  return assertWarRoomScope(
    {
      canonicalOwnerId: access.canonicalOwnerId ?? "",
      authorizedFranchiseId: access.authorizedFranchiseId ?? "",
      warRoomId: access.warRoomId ?? "",
      ownerDisplayName: "",
      sleeperUserId: null,
      sleeperRosterId: null,
      teamName: "",
    },
    requested?.warRoomId,
    requested?.franchiseId,
    requestedOwnerId
  );
}

export type LegacyWarRoomClassification = {
  legacyOwnerProfileId: string;
  targetWarRoomId: string;
  classification: "combined-owner-profile" | "pilot-owner-profile";
};

const legacyWarRoomMappings: Record<string, LegacyWarRoomClassification> = {
  "ray-jeffrey": {
    legacyOwnerProfileId: "ray-jeffrey",
    targetWarRoomId: "2026:prestigio-mundial",
    classification: "combined-owner-profile",
  },
  wade: {
    legacyOwnerProfileId: "wade",
    targetWarRoomId: "2026:the-wildcard",
    classification: "pilot-owner-profile",
  },
  jd: {
    legacyOwnerProfileId: "jd",
    targetWarRoomId: "2026:the-art-of-war",
    classification: "pilot-owner-profile",
  },
  rashad: {
    legacyOwnerProfileId: "rashad",
    targetWarRoomId: "2026:the-gresham-empire",
    classification: "pilot-owner-profile",
  },
};

export function classifyLegacyWarRoomScope(ownerProfileId: string) {
  return legacyWarRoomMappings[ownerProfileId] ?? null;
}

export function getLegacyWarRoomProfileIds(warRoomId: string) {
  return Object.values(legacyWarRoomMappings)
    .filter((mapping) => mapping.targetWarRoomId === warRoomId)
    .map((mapping) => mapping.legacyOwnerProfileId);
}

export type WarRoomStateRecord = {
  warRoomId: string;
  actorOwnerId: string;
  actorEmail: string;
  stateType: string;
};
