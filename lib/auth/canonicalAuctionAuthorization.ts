import { activeManagers } from "@/lib/managers/activeManagers";
import {
  franchisesById,
  ownerProfilesById,
} from "@/lib/managers/identityData";
import { OwnerProfileStatus } from "@/lib/managers/identityTypes";

export type CanonicalAuctionOwnerAuthorization = {
  canonicalOwnerId: string;
  authorizedFranchiseId: string;
  warRoomId: string;
  ownerDisplayName: string;
  sleeperUserId: string | null;
  sleeperRosterId: number | null;
  teamName: string;
};

export type AuthorizedOwnerEmailMapping = {
  normalizedEmail: string;
  canonicalOwnerId: string;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function getSleeperRosterId(canonicalOwnerId: string, franchiseId: string) {
  const owner = ownerProfilesById[canonicalOwnerId];
  const manager = activeManagers.find(
    (candidate) =>
      candidate.fullName === owner?.fullName ||
      candidate.teamName === franchisesById[franchiseId]?.currentTeamName
  );

  return manager?.roster ?? null;
}

export function resolveCanonicalOwnerAuthorization(
  canonicalOwnerId: string
): CanonicalAuctionOwnerAuthorization | null {
  const owner = ownerProfilesById[canonicalOwnerId];
  const franchiseId = owner?.currentFranchiseIds[0];
  const franchise = franchiseId ? franchisesById[franchiseId] : undefined;

  if (
    !owner ||
    owner.status !== OwnerProfileStatus.Active ||
    !franchiseId ||
    !franchise
  ) {
    return null;
  }

  const sleeperRosterId = getSleeperRosterId(canonicalOwnerId, franchiseId);

  return {
    canonicalOwnerId,
    authorizedFranchiseId: franchiseId,
    warRoomId: `2026:${franchiseId}`,
    ownerDisplayName: owner.fullName,
    sleeperUserId: owner.sleeperIds[0] ?? null,
    sleeperRosterId,
    teamName: franchise.currentTeamName,
  };
}

export function resolveAuthorizedEmailMapping(
  email: string | null | undefined,
  mappings: readonly AuthorizedOwnerEmailMapping[]
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const matches = mappings.filter(
    (mapping) => normalizeEmail(mapping.normalizedEmail) === normalizedEmail
  );

  if (matches.length > 1) {
    throw new Error("Ambiguous auction owner email authorization mapping.");
  }

  const mapping = matches[0];
  if (!mapping) return null;

  const authorization = resolveCanonicalOwnerAuthorization(
    mapping.canonicalOwnerId
  );
  if (!authorization) {
    throw new Error("Invalid auction owner email authorization mapping.");
  }

  return authorization;
}

export function assertWarRoomScope(
  authorization: CanonicalAuctionOwnerAuthorization,
  requestedWarRoomId?: string | null,
  requestedFranchiseId?: string | null,
  requestedOwnerId?: string | null
) {
  if (
    (requestedWarRoomId && requestedWarRoomId !== authorization.warRoomId) ||
    (requestedFranchiseId &&
      requestedFranchiseId !== authorization.authorizedFranchiseId) ||
    (requestedOwnerId && requestedOwnerId !== authorization.canonicalOwnerId)
  ) {
    throw new Error("Requested War Room scope is not authorized.");
  }

  return authorization;
}
