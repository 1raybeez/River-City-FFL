import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { readRecommendedNowForActor } from "@/lib/auction/recommendedNowServer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>;
  try {
    actor = await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json({ error: "Auction War Room access required." }, { status: 401 });
    }
    throw error;
  }

  try {
    const result = await readRecommendedNowForActor(actor, {
      diagnostic: new URL(request.url).searchParams.get("diagnostic") === "1",
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[recommended-now] Recommendation engine failed", error);
    const rosterUnavailable = error instanceof Error && error.message === "Authorized War Room roster is unavailable.";
    return NextResponse.json({ error: rosterUnavailable ? "Authorized War Room roster is unavailable." : "Recommended Now is temporarily unavailable." }, { status: rosterUnavailable ? 409 : 500 });
  }
}
