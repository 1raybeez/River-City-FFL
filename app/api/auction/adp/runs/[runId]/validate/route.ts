import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  readAuctionAdpStatus,
  validateAuctionAdpRefreshRun,
} from "@/lib/auction/adpRefreshService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

async function getActor() {
  try {
    return await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

export async function POST(_req: Request, context: RouteContext) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Auction access required." }, { status: 401 });
  }

  try {
    const { runId } = await context.params;
    const run = await validateAuctionAdpRefreshRun({ runId, actor });
    const status = await readAuctionAdpStatus(run.season);

    return NextResponse.json({ run, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate ADP run." },
      { status: 400 }
    );
  }
}
