import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  readWarRoomLiveAuctionState,
  updateWarRoomKeepers,
} from "@/lib/auction/warRoomLiveStateFirestore";
import { assertAuthorizedWarRoomRequest } from "@/lib/auction/warRoomScope";
import type { WarRoomKeeperState } from "@/lib/auction/warRoomLiveState";
import { readKeeperAuthority } from "@/lib/auction/keeperAuthority";

export const runtime = "nodejs";

async function getActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

async function readBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readScope(body: Record<string, unknown>) {
  return {
    ownerId: typeof body.ownerId === "string" ? body.ownerId : null,
    ownerProfileId:
      typeof body.ownerProfileId === "string" ? body.ownerProfileId : null,
    franchiseId:
      typeof body.franchiseId === "string" ? body.franchiseId : null,
    warRoomId: typeof body.warRoomId === "string" ? body.warRoomId : null,
    rosterId:
      typeof body.rosterId === "string" || typeof body.rosterId === "number"
        ? body.rosterId
        : null,
  };
}

function parseKeepers(value: unknown): WarRoomKeeperState[] | null {
  if (!Array.isArray(value)) return null;

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const keeper = entry as Record<string, unknown>;
    const playerId = typeof keeper.playerId === "string" ? keeper.playerId.trim() : "";
    const playerName = typeof keeper.playerName === "string" ? keeper.playerName.trim() : "";
    const keeperCost =
      keeper.keeperCost === null
        ? null
        : typeof keeper.keeperCost === "number" && Number.isFinite(keeper.keeperCost)
          ? keeper.keeperCost
          : undefined;
    const status = keeper.status === "locked" ? "locked" : "declared";
    if (!playerId || !playerName || keeperCost === undefined) return [];
    return [{ playerId, playerName, keeperCost, status }];
  });
}

export async function GET() {
  const actor = await getActor();
  if (!actor?.access.warRoomId) {
    return NextResponse.json({ error: "Auction War Room access required." }, { status: 401 });
  }

  const state = await readWarRoomLiveAuctionState(actor.access.warRoomId);
  return NextResponse.json({
    keepers: state?.keepers ?? [],
    keeperAuthority: await readKeeperAuthority(),
  });
}

export async function PUT(req: Request) {
  const actor = await getActor();
  if (!actor?.access.warRoomId || !actor.access.canonicalOwnerId) {
    return NextResponse.json({ error: "Auction War Room access required." }, { status: 401 });
  }

  const body = await readBody(req);
  try {
    assertAuthorizedWarRoomRequest(actor.access, readScope(body));
    const keeperAuthority = await readKeeperAuthority();
    if (keeperAuthority.state !== "editable") {
      return NextResponse.json(
        { error: keeperAuthority.message, keeperAuthority },
        { status: keeperAuthority.state === "locked" ? 409 : 503 }
      );
    }
    const keepers = parseKeepers(body.keepers);
    if (!keepers) {
      return NextResponse.json({ error: "keepers must be an array." }, { status: 400 });
    }

    const state = await updateWarRoomKeepers({
      warRoomId: actor.access.warRoomId,
      actorOwnerId: actor.access.canonicalOwnerId,
      keepers,
    });
    return NextResponse.json({ keepers: state.keepers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save keepers." },
      { status: 400 }
    );
  }
}
