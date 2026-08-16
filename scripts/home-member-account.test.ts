import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import { toSafeCurrentMember } from "../lib/auth/currentMemberContract";

const page = readFileSync("app/HomeClient.tsx", "utf8");
const wrapper = readFileSync("app/page.tsx", "utf8");
const siteShell = readFileSync("components/SiteShell.tsx", "utf8");

const ray = toSafeCurrentMember(buildCommissionerAccessResult("ray@example.invalid"));
const jeffrey = toSafeCurrentMember({
  ...buildCommissionerAccessResult("jeffrey@example.invalid"),
  role: "pilot-owner",
  ownerDisplayName: "Jeffrey Hudgins",
  canAccessMaintenance: false,
  canRecordSales: false,
});
const jordan = { ...jeffrey, displayName: "Jordan Maslyn", franchiseName: "The Shake-N-Bakers" };
const landon = { ...jordan, displayName: "Landon Elliott" };

assert.match(wrapper, /getCurrentMember/);
assert.match(wrapper, /anonymousCurrentMember/);
assert.match(page, /initialMember\.authenticated/);
assert.match(page, /League Member Login/);
assert.match(page, /href="\/member\/login\?returnTo=%2F"/);
assert.match(page, /SignOutControl/);
assert.match(page, /href="\/commish\/auction"/);
assert.match(page, /href="\/commish"/);
assert.match(page, /initialMember\.canAccessWarRoom/);
assert.match(page, /initialMember\.canAccessMaintenance/);
assert.match(page, /id="home-mobile-navigation"/);
assert.match(siteShell, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);

assert.equal(ray.displayName, "Ray Long / Jeffrey Hudgins");
assert.equal(ray.franchiseName, "Prestigio Mundial");
assert.equal(ray.canAccessWarRoom, true);
assert.equal(ray.canAccessMaintenance, true);
assert.equal(jeffrey.displayName, "Jeffrey Hudgins");
assert.equal(jeffrey.franchiseName, "Prestigio Mundial");
assert.equal(jeffrey.canAccessMaintenance, false);
assert.equal(jordan.displayName, "Jordan Maslyn");
assert.equal(landon.displayName, "Landon Elliott");
assert.equal(jordan.franchiseName, landon.franchiseName);

for (const unsafeField of ["email", "firebaseUid", "canonicalOwnerId", "warRoomId", "rosterId", "idToken", "targets", "notes"]) {
  assert.doesNotMatch(page, new RegExp(unsafeField, "i"));
}

assert.match(page, /Open Your War Room/);
assert.match(page, /Join Google Meet/);
assert.match(page, /fetch\("\/api\/rsvps"/);
assert.match(page, /href="\/matchups"/);
assert.match(page, /href="\/league-info\/legislative"/);

console.log("Home member-account checks passed.");
