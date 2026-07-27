import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { readAuctionAdpStatus } from "@/lib/auction/adpRefreshService";

export const runtime = "nodejs";

async function getActor() {
  try {
    return await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Auction access required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const season = Number(searchParams.get("season") ?? 2026);
  const status = await readAuctionAdpStatus(Number.isInteger(season) ? season : 2026);

  return NextResponse.json(status);
}
