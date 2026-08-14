import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createEmptyWarRoomLiveAuctionState,
  deriveWarRoomBudgetState,
  filterPurchasesForWarRoom,
  getWarRoomLiveStatePath,
  isGlobalAuctionState,
  assertWarRoomLiveStateScope,
} from "../lib/auction/warRoomLiveState";
import { classifyWarRoomMigrationRecord } from "../lib/auction/warRoomMigrationClassifier";
import type { AuctionPurchaseDecisionSnapshot } from "../lib/auction/purchaseDecisionTypes";

type Scope = Parameters<typeof assertWarRoomLiveStateScope>[0];
const ray: Scope = {
  canonicalOwnerId: "ray-long",
  authorizedFranchiseId: "prestigio-mundial",
  warRoomId: "2026:prestigio-mundial",
  sleeperRosterId: 1,
};
const jeffrey: Scope = { ...ray, canonicalOwnerId: "jeffrey-hudgins" };
const jordan: Scope = {
  canonicalOwnerId: "jordan-maslyn",
  authorizedFranchiseId: "shake-n-bakers",
  warRoomId: "2026:shake-n-bakers",
  sleeperRosterId: 2,
};
const landon: Scope = { ...jordan, canonicalOwnerId: "landon-elliott" };
const wade: Scope = {
  canonicalOwnerId: "wade-cameron",
  authorizedFranchiseId: "the-wildcard",
  warRoomId: "2026:the-wildcard",
  sleeperRosterId: 3,
};

const persisted = new Map<string, ReturnType<typeof createEmptyWarRoomLiveAuctionState>>();
function write(
  scope: Scope,
  patch: Partial<ReturnType<typeof createEmptyWarRoomLiveAuctionState>>,
  requested?: Parameters<typeof assertWarRoomLiveStateScope>[1]
) {
  assertWarRoomLiveStateScope(scope, requested);
  const current = persisted.get(scope.warRoomId!) ?? createEmptyWarRoomLiveAuctionState(scope.warRoomId!, scope.canonicalOwnerId!, "test");
  persisted.set(scope.warRoomId!, { ...current, ...patch, updatedByOwnerId: scope.canonicalOwnerId! });
}
function read(scope: Scope) {
  return persisted.get(scope.warRoomId!);
}

write(ray, { keepers: [{ playerId: "p1", playerName: "Prestigio Keeper", keeperCost: 40, status: "declared" }] });
assert.deepEqual(read(jeffrey)?.keepers.map((keeper) => keeper.playerId), ["p1"]);
write(jeffrey, { budget: { teamBudget: 200, keeperCostTotal: 40, spentBudget: 0 } });
assert.equal(read(ray)?.budget.keeperCostTotal, 40);

write(jordan, { nomination: { nominatedPlayerId: "p2", nominatedPlayerName: "Shake Nominee", currentBid: 10, nominatedByOwnerId: "jordan-maslyn" } });
assert.equal(read(landon)?.nomination?.nominatedPlayerId, "p2");

assert.throws(() => write(ray, { keepers: [] }, { warRoomId: jordan.warRoomId }));
assert.throws(() => assertWarRoomLiveStateScope(ray, { warRoomId: jordan.warRoomId }));
assert.throws(() => assertWarRoomLiveStateScope(wade, { franchiseId: ray.authorizedFranchiseId }));

const purchases = [
  { buyerRosterId: 1, buyerTeamId: "2026:prestigio-mundial", purchaseId: "a" },
  { buyerRosterId: 2, buyerTeamId: "2026:shake-n-bakers", purchaseId: "b" },
] as unknown as AuctionPurchaseDecisionSnapshot[];
assert.deepEqual(filterPurchasesForWarRoom(purchases, 1).map((purchase) => purchase.purchaseId), ["a"]);
assert.deepEqual(filterPurchasesForWarRoom(purchases, 2).map((purchase) => purchase.purchaseId), ["b"]);

const budget = deriveWarRoomBudgetState({
  teamBudget: 200,
  rosterSlots: 16,
  keepers: read(ray)?.keepers ?? [],
  purchases: [{ purchaseId: "a", playerId: "p3", playerName: "Bought", salePrice: 25, status: "active" }],
});
assert.equal(budget.keeperCostTotal, 40);
assert.equal(budget.spentBudget, 25);
assert.equal(budget.remainingBudget, 135);
assert.equal(budget.maxBid > 0, true);

assert.equal(isGlobalAuctionState("current-nomination"), true);
assert.equal(isGlobalAuctionState("published-values"), true);
assert.equal(isGlobalAuctionState("adp"), true);

assert.equal(getWarRoomLiveStatePath(ray.warRoomId!), "auction_war_rooms/2026:prestigio-mundial/live/2026");
assert.equal(classifyWarRoomMigrationRecord({
  sourcePath: "auction_owner_profiles/ray-jeffrey/settings/2026",
  sourceType: "owner-profile",
  ownerProfileId: "ray-jeffrey",
}).targetWarRoomId, "2026:prestigio-mundial");
assert.equal(classifyWarRoomMigrationRecord({
  sourcePath: "auction_draft_runs/2026/purchase_decisions",
  sourceType: "purchase",
}).action, "GLOBAL — KEEP GLOBAL");
assert.equal(classifyWarRoomMigrationRecord({
  sourcePath: "demo",
  sourceType: "demo",
}).action, "DEMO/LOCAL ONLY");

const firestoreSource = readFileSync("lib/auction/warRoomLiveStateFirestore.ts", "utf8");
assert.match(firestoreSource, /firestore/);
assert.match(firestoreSource, /transaction\.set/);
assert.doesNotMatch(firestoreSource, /transaction\.delete/);
const migrationSource = readFileSync("scripts/migrate-war-room-live-state.ts", "utf8");
assert.match(migrationSource, /--apply/);
assert.match(migrationSource, /DRY RUN ONLY/);
assert.doesNotMatch(migrationSource, /\.set\(/);
assert.doesNotMatch(migrationSource, /\.delete\(/);
const purchaseRoute = readFileSync("app/api/auction/purchase-decisions/route.ts", "utf8");
assert.match(purchaseRoute, /requireAuctionSalesAccess/);
assert.match(purchaseRoute, /readAuthorizedWarRoomPurchaseSnapshots/);
assert.match(readFileSync("firestore.rules", "utf8"), /match \/\{document=\*\*\}/);

console.log("War Room Phase 2C checks passed (fake state only; no production writes)." );
