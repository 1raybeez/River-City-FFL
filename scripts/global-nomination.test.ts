import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getGlobalNominationPath,
  GLOBAL_NOMINATION_DOCUMENT,
  GLOBAL_NOMINATION_ROOT_COLLECTION,
} from "../lib/auction/globalNominationTypes";

assert.equal(
  getGlobalNominationPath(),
  "auction_draft_runs/2026/state/current_nomination"
);
assert.equal(GLOBAL_NOMINATION_ROOT_COLLECTION, "auction_draft_runs");
assert.equal(GLOBAL_NOMINATION_DOCUMENT, "current_nomination");

const route = readFileSync("app/api/auction/nomination/route.ts", "utf8");
const state = readFileSync("lib/auction/globalNominationState.ts", "utf8");
const page = readFileSync("app/commish/auction/page.tsx", "utf8");
const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const preference = readFileSync("lib/auction/ownerPreferences.ts", "utf8");

assert.match(route, /requireAuctionWarRoomAccess/);
assert.match(route, /requireAuctionSalesAccess/);
assert.match(route, /setGlobalNomination/);
assert.match(route, /clearGlobalNomination/);
assert.doesNotMatch(route, /plannedCap|watchlist|target|note|strategy|preferredEntry/i);
assert.match(state, /collection\(GLOBAL_NOMINATION_ROOT_COLLECTION\)/);
assert.match(state, /state: "active"/);
assert.match(state, /state: "cleared"/);
assert.match(page, /readGlobalNomination/);
assert.match(client, /Current Nomination · League Global/);
assert.match(client, /Set Current Nomination/);
assert.match(client, /NO CURRENT NOMINATION/);
assert.match(client, /fetch\('\/api\/auction\/nomination'/);
assert.doesNotMatch(client, /localStorage|sessionStorage/);
assert.match(preference, /warRoomId/);
assert.doesNotMatch(state, /plannedCap|watchlist|target|note|strategy|preferredEntry/i);

console.log("Global nomination checks passed (fake state/seams only; no production writes).");
