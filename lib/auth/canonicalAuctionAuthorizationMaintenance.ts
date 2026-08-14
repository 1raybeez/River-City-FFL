import {
  franchisesById,
  ownerProfilesById,
} from "@/lib/managers/identityData";
import { OwnerProfileStatus } from "@/lib/managers/identityTypes";
import {
  resolveAuthorizedEmailMapping,
  resolveCanonicalOwnerAuthorization,
  type AuthorizedOwnerEmailMapping,
  type CanonicalAuctionOwnerAuthorization,
} from "@/lib/auth/canonicalAuctionAuthorization";

export type AuthorizationMappingInput = {
  email: string;
  canonicalOwnerId: string;
};

export type ExistingAuthorizationMapping = AuthorizedOwnerEmailMapping & {
  documentId?: string;
};

export type AuthorizationMappingAction =
  | "CREATE"
  | "ALREADY CONFIGURED"
  | "CONFLICT"
  | "INVALID";

export type AuthorizationMappingPlanEntry = {
  input: AuthorizationMappingInput;
  normalizedEmail: string;
  maskedEmail: string;
  authorization: CanonicalAuctionOwnerAuthorization | null;
  action: AuthorizationMappingAction;
  reason?: string;
};

export type AuthorizationMappingPlan = {
  entries: AuthorizationMappingPlanEntry[];
  unexpectedExisting: ExistingAuthorizationMapping[];
  uniqueWarRoomIds: string[];
  soloWarRoomIds: string[];
  conflicts: number;
  proposedWrites: number;
  deletes: 0;
};

export const AUCTION_AUTHORIZATION_SCHEMA_VERSION = 1;

export function normalizeAuthorizationEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function maskAuthorizationEmail(email: string) {
  const normalized = normalizeAuthorizationEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0 || at === normalized.length - 1) return "[masked email]";
  return `${normalized[0]}***${normalized.slice(at)}`;
}

export function getApprovedCompetitiveOwnerIds() {
  return Object.values(ownerProfilesById)
    .filter(
      (owner) =>
        owner.status === OwnerProfileStatus.Active &&
        owner.currentFranchiseIds.length === 1 &&
        Boolean(franchisesById[owner.currentFranchiseIds[0]])
    )
    .map((owner) => owner.id)
    .sort();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authorizationForOwner(canonicalOwnerId: string) {
  const owner = ownerProfilesById[canonicalOwnerId];
  const authorization = resolveCanonicalOwnerAuthorization(canonicalOwnerId);
  if (!owner || owner.status === OwnerProfileStatus.Staff) return null;
  return authorization;
}

function validateSharedWarRooms(
  authorizations: readonly CanonicalAuctionOwnerAuthorization[]
) {
  const byOwner = new Map(
    authorizations.map((authorization) => [
      authorization.canonicalOwnerId,
      authorization,
    ])
  );
  const pairs = [
    ["ray-long", "jeffrey-hudgins", "2026:prestigio-mundial"],
    ["jordan-maslyn", "landon-elliott", "2026:shake-n-bakers"],
  ] as const;

  for (const [first, second, expectedWarRoomId] of pairs) {
    const firstAuthorization = byOwner.get(first);
    const secondAuthorization = byOwner.get(second);
    if (
      !firstAuthorization ||
      !secondAuthorization ||
      firstAuthorization.warRoomId !== expectedWarRoomId ||
      secondAuthorization.warRoomId !== expectedWarRoomId
    ) {
      throw new Error("Approved co-owner War Room validation failed.");
    }
  }
}

export function validateAuthorizationInput(
  input: readonly AuthorizationMappingInput[],
  expectedOwnerIds: readonly string[] = getApprovedCompetitiveOwnerIds()
) {
  const expected = new Set(expectedOwnerIds);
  const errors: string[] = [];
  const seenEmails = new Set<string>();
  const seenOwners = new Set<string>();
  const entries: AuthorizationMappingPlanEntry[] = [];
  const authorizations: CanonicalAuctionOwnerAuthorization[] = [];

  for (const mapping of input) {
    const normalizedEmail = normalizeAuthorizationEmail(mapping.email);
    let reason: string | undefined;
    let authorization: CanonicalAuctionOwnerAuthorization | null = null;

    if (!isValidEmail(normalizedEmail)) reason = "invalid email";
    else if (seenEmails.has(normalizedEmail)) reason = "duplicate normalized email";
    else if (!expected.has(mapping.canonicalOwnerId)) reason = "unexpected owner";
    else if (seenOwners.has(mapping.canonicalOwnerId)) reason = "duplicate owner";
    else {
      authorization = authorizationForOwner(mapping.canonicalOwnerId);
      if (!authorization) reason = "owner lacks an approved active 2026 franchise";
    }

    if (normalizedEmail) seenEmails.add(normalizedEmail);
    if (mapping.canonicalOwnerId) seenOwners.add(mapping.canonicalOwnerId);
    if (authorization) authorizations.push(authorization);
    entries.push({
      input: mapping,
      normalizedEmail,
      maskedEmail: maskAuthorizationEmail(mapping.email),
      authorization,
      action: reason ? "INVALID" : "CREATE",
      ...(reason ? { reason } : {}),
    });
    if (reason) errors.push(reason);
  }

  for (const ownerId of expectedOwnerIds) {
    if (!seenOwners.has(ownerId)) errors.push("missing approved owner");
  }
  validateSharedWarRooms(authorizations);

  if (errors.length > 0) {
    throw new Error(`Invalid auction authorization input: ${errors.join("; ")}`);
  }

  return entries;
}

export function buildAuthorizationMappingPlan(
  input: readonly AuthorizationMappingInput[],
  existing: readonly ExistingAuthorizationMapping[],
  expectedOwnerIds: readonly string[] = getApprovedCompetitiveOwnerIds()
): AuthorizationMappingPlan {
  const validated = validateAuthorizationInput(input, expectedOwnerIds);
  const existingByEmail = new Map<string, ExistingAuthorizationMapping[]>();
  for (const mapping of existing) {
    const normalizedEmail = normalizeAuthorizationEmail(mapping.normalizedEmail);
    const matches = existingByEmail.get(normalizedEmail) ?? [];
    matches.push({ ...mapping, normalizedEmail });
    existingByEmail.set(normalizedEmail, matches);
  }

  const entries = validated.map((entry) => {
    const matches = existingByEmail.get(entry.normalizedEmail) ?? [];
    if (matches.length > 1) {
      return { ...entry, action: "CONFLICT" as const, reason: "duplicate existing mapping" };
    }
    if (matches.length === 1) {
      return matches[0].canonicalOwnerId === entry.input.canonicalOwnerId
        ? { ...entry, action: "ALREADY CONFIGURED" as const }
        : { ...entry, action: "CONFLICT" as const, reason: "existing owner differs" };
    }
    return entry;
  });

  const expectedEmails = new Set(entries.map((entry) => entry.normalizedEmail));
  const unexpectedExisting = existing.filter(
    (mapping) => !expectedEmails.has(normalizeAuthorizationEmail(mapping.normalizedEmail))
  );
  const conflicts =
    entries.filter((entry) => entry.action === "CONFLICT").length +
    unexpectedExisting.length;
  const authorizations = entries.flatMap((entry) =>
    entry.authorization ? [entry.authorization] : []
  );
  const uniqueWarRoomIds = [...new Set(authorizations.map((entry) => entry.warRoomId))].sort();
  const soloWarRoomIds = uniqueWarRoomIds.filter(
    (warRoomId) => authorizations.filter((entry) => entry.warRoomId === warRoomId).length === 1
  );

  return {
    entries,
    unexpectedExisting,
    uniqueWarRoomIds,
    soloWarRoomIds,
    conflicts,
    proposedWrites: entries.filter((entry) => entry.action === "CREATE").length,
    deletes: 0,
  };
}

export function verifyAuthorizationSnapshot(
  mappings: readonly ExistingAuthorizationMapping[],
  expectedInput: readonly AuthorizationMappingInput[],
  expectedOwnerIds: readonly string[] = getApprovedCompetitiveOwnerIds()
) {
  const plan = buildAuthorizationMappingPlan(expectedInput, mappings, expectedOwnerIds);
  if (plan.conflicts > 0 || plan.proposedWrites > 0 || plan.unexpectedExisting.length > 0) {
    throw new Error("Post-apply authorization verification failed.");
  }
  if (mappings.length !== expectedInput.length) {
    throw new Error("Unexpected authorization document count.");
  }
  if (resolveCanonicalOwnerAuthorization("unknown-owner")) {
    throw new Error("Unknown owner unexpectedly resolved.");
  }
  if (resolveAuthorizedEmailMapping("unknown@example.invalid", mappings)) {
    throw new Error("Unknown email unexpectedly resolved.");
  }
  return plan;
}
