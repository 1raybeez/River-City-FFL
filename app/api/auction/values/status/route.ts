import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { readAuctionValueStatus } from "@/lib/auction/valueRefreshService";

export const runtime = "nodejs";

async function getAuctionActor() {
  try {
    return await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return null;
    }

    throw error;
  }
}

function readSeason(value: string | null) {
  const season = Number(value ?? 2026);
  return Number.isInteger(season) ? season : 2026;
}

export async function GET(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = await readAuctionValueStatus(readSeason(searchParams.get("season")));

  return NextResponse.json(status);
}
