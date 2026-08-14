import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertWarRoomScope,
  resolveAuthorizedEmailMapping,
} from "../lib/auth/canonicalAuctionAuthorization";

const home = readFileSync("app/page.tsx", "utf8");
const auctionPage = readFileSync("app/commish/auction/page.tsx", "utf8");
const login = readFileSync("app/commish/auction/login/page.tsx", "utf8");
const access = readFileSync("lib/auth/auctionAccess.ts", "utf8");
const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");

assert.match(home, /Open Your War Room/);
assert.match(home, /href="\/commish\/auction"/);
assert.doesNotMatch(home, /canonicalOwnerId|warRoomId|ownerProfileId|authorized_owner_emails/);

const mappings = [
  { normalizedEmail: "ray@example.invalid", canonicalOwnerId: "ray-long" },
  { normalizedEmail: "jeffrey@example.invalid", canonicalOwnerId: "jeffrey-hudgins" },
  { normalizedEmail: "jordan@example.invalid", canonicalOwnerId: "jordan-maslyn" },
  { normalizedEmail: "landon@example.invalid", canonicalOwnerId: "landon-elliott" },
  { normalizedEmail: "wade@example.invalid", canonicalOwnerId: "wade-cameron" },
];
const ray = resolveAuthorizedEmailMapping("ray@example.invalid", mappings);
const jeffrey = resolveAuthorizedEmailMapping("jeffrey@example.invalid", mappings);
const jordan = resolveAuthorizedEmailMapping("jordan@example.invalid", mappings);
const landon = resolveAuthorizedEmailMapping("landon@example.invalid", mappings);
const wade = resolveAuthorizedEmailMapping("wade@example.invalid", mappings);

assert.equal(ray?.warRoomId, "2026:prestigio-mundial");
assert.equal(jeffrey?.warRoomId, ray?.warRoomId);
assert.notEqual(ray?.canonicalOwnerId, jeffrey?.canonicalOwnerId);
assert.equal(jordan?.warRoomId, "2026:shake-n-bakers");
assert.equal(landon?.warRoomId, jordan?.warRoomId);
assert.notEqual(jordan?.canonicalOwnerId, landon?.canonicalOwnerId);
assert.equal(wade?.warRoomId, "2026:the-wildcard");
assert.equal(resolveAuthorizedEmailMapping("unknown@example.invalid", mappings), null);
assert.doesNotThrow(() => assertWarRoomScope(ray!, "2026:prestigio-mundial"));
assert.throws(() => assertWarRoomScope(ray!, "2026:shake-n-bakers"));

assert.match(auctionPage, /requireAuctionWarRoomAccess/);
assert.match(auctionPage, /returnTo=%2Fcommish%2Fauction/);
assert.match(login, /approved River City league account/);
assert.match(login, /router\.replace\(returnTo\)/);
assert.match(login, /startsWith\('\/commish'\)/);
assert.match(access, /resolveAuthorizedEmailFromFirestore/);
assert.match(access, /canRecordSales: false/);
assert.match(client, /draftBoardTitle/);
assert.match(client, /ownerIdentityLabel/);
assert.doesNotMatch(client, /War Room Switcher|war-room-switcher|switchWarRoom/i);

console.log("war-room-phase3.test.ts: PASS (fake identities only; no production writes).");
