import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertWarRoomScope,
  resolveAuthorizedEmailMapping,
  resolveCanonicalOwnerAuthorization,
} from "../lib/auth/canonicalAuctionAuthorization";

const fakeMappings = [
  { normalizedEmail: "ray.test@example.invalid", canonicalOwnerId: "ray-long" },
  {
    normalizedEmail: "jeffrey.test@example.invalid",
    canonicalOwnerId: "jeffrey-hudgins",
  },
  {
    normalizedEmail: "jordan.test@example.invalid",
    canonicalOwnerId: "jordan-maslyn",
  },
  {
    normalizedEmail: "landon.test@example.invalid",
    canonicalOwnerId: "landon-elliott",
  },
  { normalizedEmail: "wade.test@example.invalid", canonicalOwnerId: "wade-cameron" },
  { normalizedEmail: "jd.test@example.invalid", canonicalOwnerId: "jd-dowling" },
];

const ray = resolveAuthorizedEmailMapping(
  "  RAY.TEST@EXAMPLE.INVALID ",
  fakeMappings
);
const jeffrey = resolveAuthorizedEmailMapping(
  "jeffrey.test@example.invalid",
  fakeMappings
);
const jordan = resolveAuthorizedEmailMapping(
  "jordan.test@example.invalid",
  fakeMappings
);
const landon = resolveAuthorizedEmailMapping(
  "landon.test@example.invalid",
  fakeMappings
);
const wade = resolveAuthorizedEmailMapping(
  "wade.test@example.invalid",
  fakeMappings
);
const jd = resolveAuthorizedEmailMapping("jd.test@example.invalid", fakeMappings);

assert.equal(ray?.canonicalOwnerId, "ray-long");
assert.equal(jeffrey?.canonicalOwnerId, "jeffrey-hudgins");
assert.notEqual(ray?.canonicalOwnerId, jeffrey?.canonicalOwnerId);
assert.equal(ray?.warRoomId, "2026:prestigio-mundial");
assert.equal(jeffrey?.warRoomId, ray?.warRoomId);

assert.equal(jordan?.canonicalOwnerId, "jordan-maslyn");
assert.equal(landon?.canonicalOwnerId, "landon-elliott");
assert.notEqual(jordan?.canonicalOwnerId, landon?.canonicalOwnerId);
assert.equal(jordan?.warRoomId, "2026:shake-n-bakers");
assert.equal(landon?.warRoomId, jordan?.warRoomId);

assert.equal(wade?.warRoomId, "2026:the-wildcard");
assert.equal(jd?.warRoomId, "2026:the-art-of-war");
assert.notEqual(wade?.warRoomId, jd?.warRoomId);
assert.equal(resolveAuthorizedEmailMapping("unknown@example.invalid", fakeMappings), null);
assert.equal(resolveCanonicalOwnerAuthorization("landon-elliott")?.authorizedFranchiseId, "shake-n-bakers");

assert.doesNotThrow(() => assertWarRoomScope(ray!, "2026:prestigio-mundial"));
assert.throws(() => assertWarRoomScope(ray!, "2026:shake-n-bakers"));
assert.throws(() => assertWarRoomScope(ray!, undefined, "shake-n-bakers"));
assert.throws(() => assertWarRoomScope(ray!, undefined, undefined, "jeffrey-hudgins"));

assert.throws(() =>
  resolveAuthorizedEmailMapping("ray.test@example.invalid", [
    ...fakeMappings,
    { normalizedEmail: "ray.test@example.invalid", canonicalOwnerId: "ray-long" },
  ])
);
assert.throws(() =>
  resolveAuthorizedEmailMapping("bad-owner@example.invalid", [
    { normalizedEmail: "bad-owner@example.invalid", canonicalOwnerId: "not-an-owner" },
  ])
);

const accessSource = readFileSync("lib/auth/auctionAccess.ts", "utf8");
const sessionSource = readFileSync("app/api/auth/session/route.ts", "utf8");
const clientSource = readFileSync(
  "app/commish/auction/AuctionWarRoomClient.tsx",
  "utf8"
);
const loginSource = readFileSync("app/commish/auction/login/page.tsx", "utf8");

assert.match(accessSource, /resolveAuthorizedEmailFromFirestore/);
assert.match(accessSource, /canAccessMaintenance: false/);
assert.match(accessSource, /canRecordSales: false/);
assert.match(sessionSource, /getAuctionAccessForVerifiedEmail/);
assert.doesNotMatch(clientSource, /normalizedEmail|authorized_owner_emails/);
assert.match(loginSource, /approved River City league account/);

console.log("Canonical auction authorization checks passed.");
