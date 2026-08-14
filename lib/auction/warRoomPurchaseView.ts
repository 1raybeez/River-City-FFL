import "server-only";

import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";
import type { AuctionPurchaseDecisionSnapshot } from "@/lib/auction/purchaseDecisionTypes";
import { readAuctionPurchaseDecisionSnapshots } from "@/lib/auction/purchaseDecisions";
import { assertAuthorizedWarRoomRequest } from "@/lib/auction/warRoomScope";
import { filterPurchasesForWarRoom } from "@/lib/auction/warRoomLiveState";

export async function readAuthorizedWarRoomPurchaseSnapshots({
  access,
  season = 2026,
  requestedScope,
}: {
  access: AuctionAccessResult;
  season?: number;
  requestedScope?: {
    ownerId?: string | null;
    ownerProfileId?: string | null;
    franchiseId?: string | null;
    warRoomId?: string | null;
    rosterId?: string | number | null;
  };
}): Promise<AuctionPurchaseDecisionSnapshot[]> {
  if (!access.canAccessWarRoom || !access.warRoomId || !access.sleeperRosterId) {
    throw new Error("Authenticated War Room scope is required.");
  }
  assertAuthorizedWarRoomRequest(access, requestedScope);

  const snapshots = await readAuctionPurchaseDecisionSnapshots({ season });
  const rosterId = access.sleeperRosterId;
  return filterPurchasesForWarRoom(snapshots, rosterId, season);
}
