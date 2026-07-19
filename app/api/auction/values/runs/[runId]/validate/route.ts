import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  readAuctionValueStatus,
  validateAuctionValueRefreshRun,
} from "@/lib/auction/valueRefreshService";

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
    const run = await validateAuctionValueRefreshRun({ runId, actor });
    const status = await readAuctionValueStatus(run.season);

    return NextResponse.json({ run, status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to validate value run.",
      },
      { status: 400 }
    );
  }
}
