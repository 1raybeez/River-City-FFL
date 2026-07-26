import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { validateAuctionLiveDraftStrategyInput } from "@/lib/auction/liveDraftStrategy";
import {
  readAuctionOwnerProfileSettings,
  updateAuctionOwnerLiveDraftStrategy,
} from "@/lib/auction/ownerProfileSettings";
import { getAuctionOwnerProfile } from "@/lib/auction/ownerProfiles";

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

function getEditableOwnerProfile(
  actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>
) {
  const ownerProfileId = actor.access.ownerProfileId;
  const profile = getAuctionOwnerProfile(ownerProfileId);
  const canEditOwnStrategy =
    profile?.active &&
    (profile.role === "commissioner" ||
      profile.role === "co-commissioner" ||
      (profile.role === "pilot-owner" && profile.pilotEnabled));

  return canEditOwnStrategy ? profile : null;
}

export async function GET() {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getEditableOwnerProfile(actor);
  if (!profile) {
    return NextResponse.json(
      { error: "Live strategy editing is not enabled for this owner." },
      { status: 403 }
    );
  }

  const settings = await readAuctionOwnerProfileSettings({
    ownerProfileId: profile.ownerProfileId,
  });
  return NextResponse.json({
    liveDraftStrategy: settings?.liveDraftStrategy ?? null,
  });
}

export async function PUT(req: Request) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getEditableOwnerProfile(actor);
  if (!profile) {
    return NextResponse.json(
      { error: "Live strategy editing is not enabled for this owner." },
      { status: 403 }
    );
  }

  try {
    const body = await readBody(req);
    const currentRemainingBudget =
      typeof body.currentRemainingBudget === "number" &&
      Number.isFinite(body.currentRemainingBudget) &&
      body.currentRemainingBudget >= 0
        ? Math.floor(body.currentRemainingBudget)
        : null;
    const strategy = validateAuctionLiveDraftStrategyInput(
      body.strategy,
      currentRemainingBudget
    );
    const liveDraftStrategy = await updateAuctionOwnerLiveDraftStrategy({
      ownerProfileId: profile.ownerProfileId,
      strategy,
      updatedBy: actor.email,
    });

    return NextResponse.json({ liveDraftStrategy });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save live strategy.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getEditableOwnerProfile(actor);
  if (!profile) {
    return NextResponse.json(
      { error: "Live strategy editing is not enabled for this owner." },
      { status: 403 }
    );
  }

  await updateAuctionOwnerLiveDraftStrategy({
    ownerProfileId: profile.ownerProfileId,
    strategy: null,
    updatedBy: actor.email,
  });

  return NextResponse.json({ liveDraftStrategy: null });
}
