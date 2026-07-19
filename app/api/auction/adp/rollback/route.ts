import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { rollbackAuctionAdpRefresh } from "@/lib/auction/adpRefreshService";

export const runtime = "nodejs";

async function getActor() {
  try {
    return await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Auction access required." }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { season?: unknown };
    const season =
      typeof body.season === "number" && Number.isInteger(body.season)
        ? body.season
        : 2026;
    const status = await rollbackAuctionAdpRefresh({ season, actor });

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to roll back ADP run." },
      { status: 400 }
    );
  }
}
