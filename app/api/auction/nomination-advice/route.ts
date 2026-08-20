import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { readGlobalNomination } from "@/lib/auction/globalNominationState";
import { buildNominatedPlayerAdvice } from "@/lib/auction/nominationAdvisor";
import { readRecommendedNowForActor } from "@/lib/auction/recommendedNowServer";

export const runtime = "nodejs";

export async function GET() {
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
    const nominationState = await readGlobalNomination();
    if (nominationState.status !== "available") {
      return NextResponse.json(
        { status: "unavailable", advice: null, error: nominationState.error ?? "Current nomination is unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    const nomination = nominationState.nomination;
    if (!nomination?.playerId || !nomination.playerName) {
      return NextResponse.json(
        { status: "available", advice: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const recommendedNow = await readRecommendedNowForActor(actor, {
      evaluationPlayerId: nomination.playerId,
    });
    const recommendationRank = recommendedNow.recommendations.findIndex(
      (recommendation) => recommendation.playerId === nomination.playerId
    );
    const advice = buildNominatedPlayerAdvice({
      nomination: {
        playerId: nomination.playerId,
        playerName: nomination.playerName,
        position: nomination.position,
        nflTeam: nomination.nflTeam,
        currentBid: nomination.currentBid,
        nominatedByFranchiseId: null,
        nominatedByRosterId: null,
        status: "active",
      },
      evaluation: recommendedNow.evaluation ?? null,
      recommendationRank: recommendationRank >= 0 ? recommendationRank + 1 : null,
    });
    return NextResponse.json(
      { status: "available", advice },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[nomination-advice] Advisor failed", error);
    return NextResponse.json(
      { status: "unavailable", advice: null, error: "Nomination advice is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
