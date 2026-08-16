import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveKeeperEditState } from "../lib/auction/keeperAuthorityTypes";

assert.equal(resolveKeeperEditState("pre_draft"), "editable");
assert.equal(resolveKeeperEditState("drafting"), "locked");
assert.equal(resolveKeeperEditState("paused"), "locked");
assert.equal(resolveKeeperEditState("complete"), "locked");
assert.equal(resolveKeeperEditState("unexpected"), "unavailable");
assert.equal(resolveKeeperEditState(null), "unavailable");

const route = readFileSync("app/api/auction/keepers/route.ts", "utf8");
const page = readFileSync("app/commish/auction/page.tsx", "utf8");
const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const authority = readFileSync("lib/auction/keeperAuthority.ts", "utf8");
const authorityTypes = readFileSync("lib/auction/keeperAuthorityTypes.ts", "utf8");
const activeKeeperFiles = [
  route,
  page,
  client,
  authority,
  authorityTypes,
].join("\n");

assert.match(route, /readKeeperAuthority/);
assert.match(route, /assertAuthorizedWarRoomRequest/);
assert.match(route, /keeperAuthority\.state === \"locked\" \? 409 : 503/);
assert.match(page, /readWarRoomLiveAuctionState\(warRoomId\)/);
assert.match(page, /initialKeeperAuthority/);
assert.match(client, /fetch\('\/api\/auction\/keepers'/);
assert.match(authorityTypes, /Keepers are locked because the draft has started\./);
assert.match(authorityTypes, /Keeper edits are temporarily unavailable while draft status cannot be verified\./);
assert.doesNotMatch(client, /localStorage|sessionStorage/);
assert.doesNotMatch(activeKeeperFiles, /Aug 22|keeperLockAt/);

console.log("Keeper authority checks passed (fake status/state only; no production writes).");
