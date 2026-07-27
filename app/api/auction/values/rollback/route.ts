import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { rollbackAuctionValueRefresh } from "@/lib/auction/valueRefreshService";

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

function readSeason(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : 2026;
}

export async function POST(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { season?: unknown };
    const status = await rollbackAuctionValueRefresh({
      season: readSeason(body.season),
      actor,
    });

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to roll back auction values.",
      },
      { status: 400 }
    );
  }
}
