import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import { toSafeCurrentMember } from "../lib/auth/currentMemberContract";

const menu = readFileSync("components/MemberAccountMenu.tsx", "utf8");
const shell = readFileSync("components/SiteShell.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");

const ray = toSafeCurrentMember(buildCommissionerAccessResult("ray@example.invalid"));
const manager = toSafeCurrentMember({ ...buildCommissionerAccessResult("jeffrey@example.invalid"), ownerDisplayName: "Jeffrey Hudgins", canAccessMaintenance: false, canRecordSales: false });

assert.equal(ray.authenticated, true);
assert.equal(ray.franchiseName, "Prestigio Mundial");
assert.equal(ray.canAccessWarRoom, true);
assert.equal(ray.canAccessMaintenance, true);
assert.equal(manager.franchiseName, "Prestigio Mundial");
assert.equal(manager.canAccessWarRoom, true);
assert.equal(manager.canAccessMaintenance, false);

assert.match(shell, /MemberAccountMenu/);
assert.match(home, /MemberAccountMenu/);
assert.match(menu, /aria-haspopup="menu"/);
assert.match(menu, /aria-expanded=\{open\}/);
assert.match(menu, /role="menu"/);
assert.match(menu, /role="menuitem"/);
assert.match(menu, /Escape/);
assert.match(menu, /pointerdown/);
assert.match(menu, /My War Room/);
assert.match(menu, /Commissioner Hub/);
assert.match(menu, /signOutControl/);
assert.match(menu, /mobile/);
assert.match(menu, /href="\/commish\/auction"/);
assert.match(menu, /href="\/commish"/);
assert.doesNotMatch(`${menu}\n${shell}`, /email|firebaseUid|canonicalOwnerId|warRoomId|rosterId|idToken|targets|notes|budget|finance/i);
assert.doesNotMatch(menu, /fetch\(["']\/api\/auth\/logout/);
assert.match(shell, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);

console.log("Member account menu checks passed.");
