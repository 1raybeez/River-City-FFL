import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { readWarRoomLiveAuctionState } from "@/lib/auction/warRoomLiveStateFirestore";
import { deriveWarRoomBudgetState } from "@/lib/auction/warRoomLiveState";
import { readAuthorizedWarRoomPurchaseSnapshots } from "@/lib/auction/warRoomPurchaseView";

export const runtime = "nodejs";

async function getActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor?.access.warRoomId) {
    return NextResponse.json({ error: "Auction War Room access required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const season = Number(searchParams.get("season") ?? 2026);
  const [state, purchases] = await Promise.all([
    readWarRoomLiveAuctionState(actor.access.warRoomId),
    readAuthorizedWarRoomPurchaseSnapshots({
      access: actor.access,
      season: Number.isInteger(season) ? season : 2026,
      requestedScope: {
        ownerId: searchParams.get("ownerId"),
        ownerProfileId: searchParams.get("ownerProfileId"),
        franchiseId: searchParams.get("franchiseId"),
        warRoomId: searchParams.get("warRoomId"),
        rosterId: searchParams.get("rosterId"),
      },
    }),
  ]);

  const budget = deriveWarRoomBudgetState({
    teamBudget: riverCityAuctionLeagueSettings.auctionBudgetPerTeam,
    rosterSlots: 16,
    keepers: state?.keepers ?? [],
    purchases: purchases.map((purchase) => ({
      purchaseId: purchase.purchaseId,
      playerId: purchase.sleeperPlayerId,
      playerName: purchase.playerName,
      salePrice: purchase.salePrice,
      status: purchase.status,
    })),
  });

  return NextResponse.json({ budget });
}
