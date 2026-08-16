import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { calculateRemainingBudget, calculateRosterSpotsRemaining } from "../lib/auction/calculations";

assert.equal(canonicalAuctionTeams.length, 12);
const prestigio = canonicalAuctionTeams.find((team) => team.franchiseId === "prestigio-mundial");
assert.ok(prestigio);
assert.equal(prestigio.rosterId, 1);
assert.equal(calculateRemainingBudget({ teamBudget: 200, keeperCostTotal: 40, spentBudget: 100 }), 60);
assert.equal(calculateRosterSpotsRemaining({ total: prestigio.rosterSlots.total, filled: 16 }), 0);

const route = readFileSync("app/api/auction/purchase-decisions/route.ts", "utf8");
const service = readFileSync("lib/auction/purchaseDecisions.ts", "utf8");
const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");

assert.match(route, /requireAuctionSalesAccess/);
assert.match(route, /getCanonicalAuctionTeamById/);
assert.match(route, /getSleeperPlayerIdentityDirectory/);
assert.match(route, /recordAuctionPurchaseAtomically/);
assert.match(service, /runTransaction/);
assert.match(service, /duplicate-player/);
assert.match(service, /insufficient-budget/);
assert.match(service, /roster-full/);
assert.match(service, /transaction\.create/);
assert.match(service, /player_locks/);
assert.match(service, /playerLockRef/);
assert.match(service, /idempotent/);
assert.match(service, /tagAtPurchase: null/);
assert.match(service, /plannedCapAtPurchase: null/);
assert.match(client, /Sale details are retained; use Retry Sale/);
assert.match(client, /Retry Sale/);
assert.match(client, /manualSalePersistenceStatus/);
const purchaseRegion = client.slice(
  client.indexOf("const recordManualSale"),
  client.indexOf("const undoLastManualSale")
);
assert.doesNotMatch(purchaseRegion, /clearCurrentNomination\(\)/);
assert.doesNotMatch(route, /actor\.email/);

console.log("Purchase integrity checks passed (fake state/seams only; no production writes).");
