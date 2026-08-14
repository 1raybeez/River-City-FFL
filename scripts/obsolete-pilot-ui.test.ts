import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { getApprovedCompetitiveOwnerIds } from "../lib/auth/canonicalAuctionAuthorizationMaintenance";
import {
  classifyLegacyWarRoomScope,
  getLegacyWarRoomProfileIds,
} from "../lib/auction/warRoomScope";

const page = readFileSync("app/commish/page.tsx", "utf8");
const access = readFileSync("lib/auth/auctionAccess.ts", "utf8");
const authorization = readFileSync(
  "lib/auth/canonicalAuctionAuthorization.ts",
  "utf8"
);
const identityData = readFileSync("lib/managers/identityData.ts", "utf8");
const migration = readFileSync("scripts/migrate-war-room-live-state.ts", "utf8");

assert.doesNotMatch(page, /Pilot Foundation|Owner Access Profiles/);
assert.doesNotMatch(page, /Enable|Map|Reset/);
assert.doesNotMatch(page, /getAuctionPilotProfiles|readAuctionOwnerProfileSettings/);
assert.match(page, /requireAuctionAccess\(\)/);

assert.equal(getApprovedCompetitiveOwnerIds().length, 14);
assert.match(authorization, /resolveCanonicalOwnerAuthorization/);
for (const ownerProfileId of ["ray-long", "jeffrey-hudgins", "wade-cameron", "jd-dowling", "rashad-gresham"]) {
  assert.match(identityData, new RegExp(ownerProfileId));
}

assert.equal(classifyLegacyWarRoomScope("wade")?.targetWarRoomId, "2026:the-wildcard");
assert.equal(classifyLegacyWarRoomScope("jd")?.targetWarRoomId, "2026:the-art-of-war");
assert.equal(classifyLegacyWarRoomScope("rashad")?.targetWarRoomId, "2026:the-gresham-empire");
assert.deepEqual(getLegacyWarRoomProfileIds("2026:prestigio-mundial"), ["ray-jeffrey"]);
assert.match(access, /resolveAuthorizedEmailFromFirestore/);
assert.match(migration, /DRY RUN ONLY/);
assert.match(migration, /--apply/);
assert.doesNotMatch(migration, /\.set\(/);
assert.doesNotMatch(migration, /\.delete\(/);

console.log("Obsolete pilot UI checks passed; authorization and legacy compatibility remain intact.");
