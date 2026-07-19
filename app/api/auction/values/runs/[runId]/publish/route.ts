import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { publishAuctionValueRefreshRun } from "@/lib/auction/valueRefreshService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

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

export async function POST(_req: Request, context: RouteContext) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  try {
    const { runId } = await context.params;
    const run = await publishAuctionValueRefreshRun({ runId, actor });

    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to publish value run.",
      },
      { status: 400 }
    );
  }
}
