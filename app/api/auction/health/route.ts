import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { readAuctionProductionHealth } from "@/lib/auction/productionRuntime";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json(
        { error: "Auction War Room access required." },
        { status: 401 }
      );
    }

    throw error;
  }

  const health = await readAuctionProductionHealth();

  return NextResponse.json(health);
}
