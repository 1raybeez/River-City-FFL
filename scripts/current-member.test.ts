import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toSafeCurrentMember } from "../lib/auth/currentMemberContract";
import { getSafeReturnTo } from "../lib/auth/safeReturnTo";
import { buildCommissionerAccessResult } from "../lib/auction/ownerProfiles";
import type { AuctionAccessResult } from "../lib/auction/ownerProfiles";

const memberSource = readFileSync("lib/auth/currentMember.ts", "utf8");
const sessionSource = readFileSync("app/api/auth/session/route.ts", "utf8");
const loginSource = readFileSync("app/member/login/page.tsx", "utf8");

const managerAccess: AuctionAccessResult = {
  ...buildCommissionerAccessResult("commissioner@example.invalid"),
  email: "jeffrey@example.invalid",
  role: "pilot-owner",
  ownerDisplayName: "Jeffrey Hudgins",
  sleeperTeamName: "Prestigio Mundial",
  ownerProfileLabel: "Prestigio Mundial",
  canAccessMaintenance: false,
  canRecordSales: false,
};
const jordanAccess = { ...managerAccess, ownerDisplayName: "Jordan Maslyn", sleeperTeamName: "The Shake-N-Bakers", ownerProfileLabel: "The Shake-N-Bakers" };
const landonAccess = { ...jordanAccess, ownerDisplayName: "Landon Elliott" };
const rayAccess = buildCommissionerAccessResult("ray@example.invalid");

assert.deepEqual(toSafeCurrentMember(null), {
  authenticated: false,
  displayName: null,
  franchiseName: null,
  canAccessWarRoom: false,
  canAccessMaintenance: false,
});
assert.equal(toSafeCurrentMember(managerAccess).displayName, "Jeffrey Hudgins");
assert.equal(toSafeCurrentMember(managerAccess).franchiseName, "Prestigio Mundial");
assert.equal(toSafeCurrentMember(rayAccess).canAccessMaintenance, true);
assert.equal(toSafeCurrentMember(managerAccess).canAccessMaintenance, false);
assert.equal(toSafeCurrentMember(managerAccess).displayName !== toSafeCurrentMember(rayAccess).displayName, true);
assert.equal(toSafeCurrentMember(jordanAccess).franchiseName, "The Shake-N-Bakers");
assert.equal(toSafeCurrentMember(landonAccess).franchiseName, "The Shake-N-Bakers");

for (const value of ["/", "/commish/auction", "/league-info/legislative/new"]) {
  assert.equal(getSafeReturnTo(value), value);
}
for (const value of ["https://evil.example", "//evil.example", "javascript:alert(1)", "%2F%2Fevil.example", "%E0%A4%A"]) {
  assert.equal(getSafeReturnTo(value), "/");
}
assert.equal(getSafeReturnTo(undefined), "/");

for (const source of [memberSource, sessionSource, loginSource]) {
  assert.doesNotMatch(source, /raw email|Firebase UID|idToken.*response|access\s*[,}]/i);
}
assert.match(memberSource, /verifyAuctionSession/);
assert.match(sessionSource, /member: toSafeCurrentMember\(access\)/);
assert.doesNotMatch(sessionSource, /email,\s*access/);
assert.match(loginSource, /getSafeReturnTo/);
assert.match(loginSource, /\/api\/auth\/session/);

console.log("Current-member contract and safe login checks passed.");
