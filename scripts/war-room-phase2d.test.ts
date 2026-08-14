import assert from "node:assert/strict";
import fs from "node:fs";

import { deriveWarRoomBudgetState } from "../lib/auction/warRoomLiveState";

const page = fs.readFileSync("app/commish/auction/page.tsx", "utf8");
const client = fs.readFileSync(
  "app/commish/auction/AuctionWarRoomClient.tsx",
  "utf8"
);

const empty = deriveWarRoomBudgetState({
  teamBudget: 200,
  rosterSlots: 16,
  keepers: [],
  purchases: [],
});
assert.equal(empty.remainingBudget, 200);
assert.equal(empty.keeperCostTotal, 0);
assert.match(client, /No keepers selected in this franchise War Room/);
assert.match(page, /readWarRoomLiveAuctionState/);
assert.match(page, /initialWarRoomLiveState/);
assert.match(page, /initialWarRoomBudget/);
assert.match(client, /isManagerWarRoom/);
assert.match(client, /authorizedPurchaseRows/);
assert.match(client, /Persistent War Room State/);
assert.match(client, /access\.sleeperRosterId/);

// Manager rows are built only from the server-provided filtered decision set.
assert.match(client, /initialPurchaseDecisions \?\? \[\]/);
assert.doesNotMatch(client, /mockAuctionKeepers/);
assert.doesNotMatch(client, /mockAuctionPurchases/);
assert.match(client, /No live Sleeper snapshot or manual sales loaded/);

// The global nomination remains a public/global read and no manager sales path is added.
assert.match(client, /No current nomination selected/);
assert.match(client, /Manual sale controls are commissioner-only/);

console.log("war-room-phase2d.test.ts: PASS");
