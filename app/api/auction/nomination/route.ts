import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionSalesAccess,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  clearGlobalNomination,
  readGlobalNomination,
  setGlobalNomination,
} from "@/lib/auction/globalNominationState";

export const runtime = "nodejs";

async function getWarRoomActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

async function getSalesActor() {
  try {
    return await requireAuctionSalesAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOpeningBid(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET() {
  const actor = await getWarRoomActor();
  if (!actor?.access.warRoomId) {
    return NextResponse.json({ error: "Auction War Room access required." }, { status: 401 });
  }
  const result = await readGlobalNomination();
  return NextResponse.json(result, { status: result.status === "available" ? 200 : 503 });
}

export async function POST(req: Request) {
  const actor = await getSalesActor();
  if (!actor?.access.canRecordSales || !actor.access.canonicalOwnerId || !actor.access.authorizedFranchiseId) {
    return NextResponse.json({ error: "Commissioner sales access required." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Nomination payload is invalid." }, { status: 400 });
  }
  const playerId = readString(body.playerId);
  const playerName = readString(body.playerName);
  const openingBid = readOpeningBid(body.openingBid);
  if (!playerId || !playerName || openingBid === undefined) {
    return NextResponse.json({ error: "Player identity and a valid opening bid are required." }, { status: 400 });
  }

  try {
    const nomination = await setGlobalNomination({
      actorOwnerId: actor.access.canonicalOwnerId,
      franchiseId: actor.access.authorizedFranchiseId,
      rosterId: actor.access.sleeperRosterId,
      playerId,
      playerName,
      position: readString(body.position),
      nflTeam: readString(body.nflTeam),
      openingBid,
    });
    return NextResponse.json({ status: "available", nomination });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to set current nomination." },
      { status: 503 }
    );
  }
}

export async function DELETE() {
  const actor = await getSalesActor();
  if (!actor?.access.canRecordSales || !actor.access.canonicalOwnerId) {
    return NextResponse.json({ error: "Commissioner sales access required." }, { status: 401 });
  }
  try {
    const nomination = await clearGlobalNomination({ actorOwnerId: actor.access.canonicalOwnerId });
    return NextResponse.json({ status: "available", nomination: null, clearedVersion: nomination.version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to clear current nomination." },
      { status: 503 }
    );
  }
}
