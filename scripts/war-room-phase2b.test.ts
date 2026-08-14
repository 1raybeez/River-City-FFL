import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createEmptyWarRoomLiveAuctionState,
  getWarRoomLiveStatePath,
  isGlobalAuctionState,
  legacyLiveAuctionStateClassifications,
  assertWarRoomLiveStateScope,
} from "../lib/auction/warRoomLiveState";

type FakeAccess = Parameters<typeof assertWarRoomLiveStateScope>[0];

function access(ownerId: string, warRoomId: string, franchiseId: string, rosterId: number): FakeAccess {
  return {
    canonicalOwnerId: ownerId,
    authorizedFranchiseId: franchiseId,
    warRoomId,
    sleeperRosterId: rosterId,
  };
}

const ray = access("ray-long", "2026:prestigio-mundial", "prestigio-mundial", 1);
const jeffrey = access("jeffrey-hudgins", "2026:prestigio-mundial", "prestigio-mundial", 1);
const jordan = access("jordan-maslyn", "2026:shake-n-bakers", "shake-n-bakers", 2);
const landon = access("landon-elliott", "2026:shake-n-bakers", "shake-n-bakers", 2);
const wade = access("wade-cameron", "2026:the-wildcard", "the-wildcard", 3);
const jd = access("jd-dowling", "2026:the-art-of-war", "the-art-of-war", 4);

const store = new Map<string, ReturnType<typeof createEmptyWarRoomLiveAuctionState>>();
function stateFor(actor: FakeAccess) {
  const state = store.get(actor.warRoomId!);
  assert.ok(state);
  return state;
}
function write(actor: FakeAccess, update: Partial<ReturnType<typeof createEmptyWarRoomLiveAuctionState>>, requested?: Parameters<typeof assertWarRoomLiveStateScope>[1]) {
  assertWarRoomLiveStateScope(actor, requested);
  const current = store.get(actor.warRoomId!) ?? createEmptyWarRoomLiveAuctionState(actor.warRoomId!, actor.canonicalOwnerId!, "test");
  const next = { ...current, ...update, updatedByOwnerId: actor.canonicalOwnerId! };
  store.set(actor.warRoomId!, next);
  return next;
}

store.set(ray.warRoomId!, createEmptyWarRoomLiveAuctionState(ray.warRoomId!, ray.canonicalOwnerId!, "test"));
store.set(jordan.warRoomId!, createEmptyWarRoomLiveAuctionState(jordan.warRoomId!, jordan.canonicalOwnerId!, "test"));
store.set(wade.warRoomId!, createEmptyWarRoomLiveAuctionState(wade.warRoomId!, wade.canonicalOwnerId!, "test"));
store.set(jd.warRoomId!, createEmptyWarRoomLiveAuctionState(jd.warRoomId!, jd.canonicalOwnerId!, "test"));

write(ray, { keepers: [{ playerId: "p1", playerName: "Ray Keeper", keeperCost: 40, status: "declared" }] });
assert.deepEqual(stateFor(jeffrey).keepers.map((keeper) => keeper.playerId), ["p1"]);
write(jeffrey, { budget: { teamBudget: 200, keeperCostTotal: 40, spentBudget: 0 } });
assert.equal(stateFor(ray).budget.keeperCostTotal, 40);

write(jordan, { purchases: [{ purchaseId: "buy-1", playerId: "p2", playerName: "Shared Player", salePrice: 25, status: "active" }] });
assert.equal(stateFor(landon).purchases[0].salePrice, 25);
write(landon, { nomination: { nominatedPlayerId: "p3", nominatedPlayerName: "Shared Nominee", currentBid: 12, nominatedByOwnerId: "landon-elliott" } });
assert.equal(stateFor(jordan).nomination?.nominatedPlayerId, "p3");

assert.throws(() => stateFor(ray).warRoomId !== wade.warRoomId && assertWarRoomLiveStateScope(ray, { warRoomId: wade.warRoomId }));
assert.throws(() => write(wade, { budget: { teamBudget: 200, keeperCostTotal: 0, spentBudget: 0 } }, { warRoomId: jd.warRoomId }));
assert.throws(() => write(jd, { keepers: [] }, { franchiseId: wade.authorizedFranchiseId }));
assert.throws(() => write(wade, { keepers: [] }, { rosterId: ray.sleeperRosterId }));

assert.equal(getWarRoomLiveStatePath(ray.warRoomId!), "auction_war_rooms/2026:prestigio-mundial/live/2026");
assert.equal(isGlobalAuctionState("current-nomination"), true);
assert.equal(isGlobalAuctionState("published-values"), true);
assert.equal(isGlobalAuctionState("adp"), true);
assert.equal(isGlobalAuctionState("current-nomination"), true);

const purchaseRoute = readFileSync("app/api/auction/purchase-decisions/route.ts", "utf8");
assert.match(purchaseRoute, /requireAuctionSalesAccess/);
const clientSource = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
assert.match(clientSource, /mockAuctionTeams/);
assert.match(clientSource, /mockAuctionData/);
assert.match(readFileSync("lib/auction/mockAuctionData.ts", "utf8"), /Local Demo Data only/);
assert.equal(legacyLiveAuctionStateClassifications.length, 3);
assert.equal(legacyLiveAuctionStateClassifications.some((entry) => entry.migrationAction === "review-before-migration"), true);
assert.doesNotMatch(readFileSync("lib/auction/warRoomLiveState.ts", "utf8"), /\.delete\(/);

const unauthenticated: FakeAccess = {
  canonicalOwnerId: null,
  authorizedFranchiseId: null,
  warRoomId: null,
  sleeperRosterId: null,
};
assert.throws(() => assertWarRoomLiveStateScope(unauthenticated));

console.log("War Room Phase 2B checks passed (fake live state only; no production writes)." );
