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
assert.match(client, /undoPersistenceStatus/);
assert.match(client, /Undoing…/);
assert.match(client, /The sale remains active/);
assert.match(client, /payload\.purchaseId !== latestUndoableManualSale\.id/);
assert.match(client, /disabled=\{undoPersistenceStatus === 'saving'\}/);
const purchaseRegion = client.slice(
  client.indexOf("const recordManualSale"),
  client.indexOf("const undoLastManualSale")
);
assert.doesNotMatch(purchaseRegion, /clearCurrentNomination\(\)/);
assert.doesNotMatch(route, /actor\.email/);
const undoRegion = client.slice(
  client.indexOf("const undoLastManualSale"),
  client.indexOf("useEffect(() => {", client.indexOf("const undoLastManualSale"))
);
assert.match(undoRegion, /const response = await fetch/);
assert.doesNotMatch(undoRegion, /void fetch/);
assert.doesNotMatch(undoRegion, /setManualAuctionSales\(nextSales\)[\s\S]*fetch/);
assert.doesNotMatch(client, /initialMockBudgetRows/);
assert.doesNotMatch(client, /Team Budgets/);
assert.doesNotMatch(client, /mock data/);
const utilitySections = client.slice(
  client.indexOf('const draftUtilitySections'),
  client.indexOf('const historyAuditFilterOptions')
);
assert.match(utilitySections, /value: 'budgets', icon: '💰'/);
assert.match(utilitySections, /value: 'heat', icon: '🔥'/);
assert.match(utilitySections, /value: 'trends', icon: '📈'/);
assert.match(utilitySections, /value: 'sales', icon: '🕒'/);
assert.equal((utilitySections.match(/\{ label: [^}]+value:/g) ?? []).length, 4);
assert.ok(utilitySections.indexOf("value: 'budgets'") < utilitySections.indexOf("value: 'heat'"));
assert.match(client, /💰 Current Team Budget/);
assert.match(client, /Authoritative War Room state/);
assert.match(client, /Current team budget is temporarily unavailable/);
assert.match(client, /Current team budget is incomplete/);
assert.match(client, /guidanceBudgetRow\.remainingBudget/);
assert.match(client, /guidanceBudgetRow\.totalSpent/);
assert.match(client, /guidanceBudgetRow\.rosterSpotsRemaining/);
assert.match(client, /guidanceBudgetRow\.maxBid/);

console.log("Purchase integrity checks passed (fake state/seams only; no production writes).");
