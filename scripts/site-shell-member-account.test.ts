import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import { toSafeCurrentMember } from "../lib/auth/currentMemberContract";

const shell = readFileSync("components/SiteShell.tsx", "utf8");
const currentMemberRoute = readFileSync("app/api/auth/current-member/route.ts", "utf8");
const commish = readFileSync("app/commish/page.tsx", "utf8");
const publicPage = readFileSync("app/matchups/page.tsx", "utf8");

const ray = toSafeCurrentMember(buildCommissionerAccessResult("ray@example.invalid"));
const jeffrey = toSafeCurrentMember({
  ...buildCommissionerAccessResult("jeffrey@example.invalid"),
  role: "pilot-owner",
  ownerDisplayName: "Jeffrey Hudgins",
  canAccessMaintenance: false,
  canRecordSales: false,
});

assert.match(currentMemberRoute, /getCurrentMember/);
assert.match(currentMemberRoute, /Cache-Control.*no-store/);
assert.match(shell, /fetch\("\/api\/auth\/current-member"/);
assert.match(shell, /getSafeReturnTo/);
assert.match(shell, /member\.authenticated/);
assert.match(shell, /League Member Login/);
assert.match(shell, /My War Room/);
assert.match(shell, /Commissioner Hub/);
assert.match(shell, /SignOutControl/);
assert.match(shell, /id="site-mobile-navigation"/);
assert.match(shell, /aria-expanded=\{open\}/);
assert.doesNotMatch(shell, /authenticated\??\s*:/);
assert.doesNotMatch(shell, /email|firebaseUid|canonicalOwnerId|warRoomId|rosterId|idToken|targets|notes|budget|finance/i);
assert.match(publicPage, /<SiteShell/);
assert.match(commish, /requireAuctionAccess\("maintenance"\)/);
assert.match(commish, /<SiteShell activePath="\/commish">/);

assert.equal(ray.displayName, "Ray Long / Jeffrey Hudgins");
assert.equal(ray.franchiseName, "Prestigio Mundial");
assert.equal(ray.canAccessWarRoom, true);
assert.equal(ray.canAccessMaintenance, true);
assert.equal(jeffrey.displayName, "Jeffrey Hudgins");
assert.equal(jeffrey.franchiseName, "Prestigio Mundial");
assert.equal(jeffrey.canAccessWarRoom, true);
assert.equal(jeffrey.canAccessMaintenance, false);

console.log("SiteShell member-account checks passed.");
