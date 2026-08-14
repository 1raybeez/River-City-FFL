import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAuthorizationMappingPlan,
  getApprovedCompetitiveOwnerIds,
  maskAuthorizationEmail,
  validateAuthorizationInput,
  verifyAuthorizationSnapshot,
  type AuthorizationMappingInput,
} from "../lib/auth/canonicalAuctionAuthorizationMaintenance";
import { ownerProfilesById } from "../lib/managers/identityData";
import { OwnerProfileStatus } from "../lib/managers/identityTypes";

const ownerIds = getApprovedCompetitiveOwnerIds();
const completeInput: AuthorizationMappingInput[] = ownerIds.map((canonicalOwnerId, index) => ({
  email: `owner-${index}@example.invalid`,
  canonicalOwnerId,
}));

const initialPlan = buildAuthorizationMappingPlan(completeInput, []);
assert.equal(initialPlan.entries.length, ownerIds.length);
assert.equal(initialPlan.proposedWrites, ownerIds.length);
assert.equal(initialPlan.conflicts, 0);
assert.equal(initialPlan.deletes, 0);
assert.equal(initialPlan.uniqueWarRoomIds.includes("2026:prestigio-mundial"), true);
assert.equal(initialPlan.uniqueWarRoomIds.includes("2026:shake-n-bakers"), true);
assert.equal(initialPlan.soloWarRoomIds.length > 0, true);

const ray = initialPlan.entries.find((entry) => entry.authorization?.canonicalOwnerId === "ray-long");
const jeffrey = initialPlan.entries.find(
  (entry) => entry.authorization?.canonicalOwnerId === "jeffrey-hudgins"
);
const jordan = initialPlan.entries.find(
  (entry) => entry.authorization?.canonicalOwnerId === "jordan-maslyn"
);
const landon = initialPlan.entries.find(
  (entry) => entry.authorization?.canonicalOwnerId === "landon-elliott"
);
assert.equal(ray?.authorization?.warRoomId, "2026:prestigio-mundial");
assert.equal(jeffrey?.authorization?.warRoomId, ray?.authorization?.warRoomId);
assert.equal(jordan?.authorization?.warRoomId, "2026:shake-n-bakers");
assert.equal(landon?.authorization?.warRoomId, jordan?.authorization?.warRoomId);
assert.notEqual(ray?.authorization?.canonicalOwnerId, jeffrey?.authorization?.canonicalOwnerId);
assert.notEqual(jordan?.authorization?.canonicalOwnerId, landon?.authorization?.canonicalOwnerId);

assert.throws(() =>
  validateAuthorizationInput(completeInput.slice(1))
);
assert.throws(() =>
  validateAuthorizationInput([
    ...completeInput,
    { email: "extra@example.invalid", canonicalOwnerId: "not-an-owner" },
  ])
);
assert.throws(() =>
  validateAuthorizationInput([
    ...completeInput.slice(0, -1),
    { email: completeInput[0].email, canonicalOwnerId: completeInput.at(-1)!.canonicalOwnerId },
  ])
);
assert.throws(() =>
  validateAuthorizationInput([
    ...completeInput.slice(0, -1),
    {
      email: "staff@example.invalid",
      canonicalOwnerId: Object.values(ownerProfilesById).find(
        (owner) => owner.status === OwnerProfileStatus.Staff
      )!.id,
    },
  ])
);
assert.throws(() =>
  validateAuthorizationInput([
    ...completeInput.slice(0, -1),
    { email: "not-an-email", canonicalOwnerId: completeInput.at(-1)!.canonicalOwnerId },
  ])
);

const duplicateEmail = completeInput.map((entry) => ({ ...entry }));
duplicateEmail[1] = { ...duplicateEmail[1], email: duplicateEmail[0].email.toUpperCase() };
assert.throws(() => validateAuthorizationInput(duplicateEmail));

const equivalentExisting = completeInput.map((entry, index) => ({
  normalizedEmail: index === 0 ? entry.email.toUpperCase() : entry.email,
  canonicalOwnerId: entry.canonicalOwnerId,
}));
const idempotentPlan = buildAuthorizationMappingPlan(completeInput, equivalentExisting);
assert.equal(idempotentPlan.entries.every((entry) => entry.action === "ALREADY CONFIGURED"), true);
assert.equal(idempotentPlan.proposedWrites, 0);
assert.doesNotThrow(() => verifyAuthorizationSnapshot(equivalentExisting, completeInput));

const conflictingExisting = equivalentExisting.map((entry) => ({ ...entry }));
conflictingExisting[0] = { ...conflictingExisting[0], canonicalOwnerId: completeInput[1].canonicalOwnerId };
assert.equal(buildAuthorizationMappingPlan(completeInput, conflictingExisting).conflicts > 0, true);
assert.throws(() => verifyAuthorizationSnapshot(conflictingExisting, completeInput));

assert.match(maskAuthorizationEmail("Private.Owner@example.invalid"), /^P\*\*\*@example\.invalid$/i);
assert.doesNotMatch(maskAuthorizationEmail("Private.Owner@example.invalid"), /Private\.Owner/i);

const source = readFileSync("scripts/manage-auction-authorizations.ts", "utf8");
assert.match(source, /process\.argv\.includes\("--apply"\)/);
assert.match(source, /DRY RUN ONLY — no Firestore writes were performed/);
assert.match(source, /\.set\(/);
assert.doesNotMatch(source, /\.delete\(/);
assert.match(source, /FieldValue\.serverTimestamp/);
assert.match(source, /expected Firebase project/);

console.log("Auction authorization mapping checks passed (fake emails only; no Firestore writes)." );
