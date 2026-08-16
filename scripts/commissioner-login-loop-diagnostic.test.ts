import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCommissionerAccessResult,
} from "../lib/auction/ownerProfiles";

const accessSource = readFileSync("lib/auth/auctionAccess.ts", "utf8");
const commishPage = readFileSync("app/commish/page.tsx", "utf8");
const sessionRoute = readFileSync("app/api/auth/session/route.ts", "utf8");
const loginPage = readFileSync("app/commish/login/page.tsx", "utf8");

const commissionerAccess = buildCommissionerAccessResult("commissioner@example.invalid");
assert.equal(commissionerAccess.canAccessMaintenance, true);
assert.equal(commissionerAccess.canAccessWarRoom, true);
assert.equal(commissionerAccess.canRecordSales, true);

assert.match(accessSource, /const canonicalAuthorization =/);
assert.match(accessSource, /const isExplicitCommissioner = isAuctionCommissionerEmail/);
assert.match(accessSource, /role: "commissioner"/);
assert.match(accessSource, /return buildCanonicalManagerAccessResult\(/);
assert.match(accessSource, /role: "pilot-owner"/);
assert.match(accessSource, /canAccessMaintenance: false/);
assert.match(accessSource, /canRecordSales: false/);
assert.match(commishPage, /requireAuctionAccess\("maintenance"\)/);
assert.match(sessionRoute, /!access\.canAccessWarRoom && !access\.canAccessMaintenance/);
assert.match(loginPage, /River City Commissioner Hub/);

assert.match(accessSource, /canAccessMaintenance: commissionerAccess\.canAccessMaintenance/);
assert.match(accessSource, /canRecordSales: commissionerAccess\.canRecordSales/);

console.log("Commissioner capability precedence checks passed (no production writes).");
