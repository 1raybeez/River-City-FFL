import { NextResponse } from "next/server";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { buildServerTradeRecommendation } from "@/lib/tradeComparison/serverRecommendationAdapter";
import type { MultiTeamTradeRequest } from "@/lib/tradeComparison/multiTeamTypes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isRequest(value: unknown): value is MultiTeamTradeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  return request.version === "m10" && request.season === 2026 && (request.mode === "LEAGUE_TRADE" || request.mode === "SANDBOX") && Array.isArray(request.participants);
}

export async function POST(request: Request) {
  try {
    await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) return NextResponse.json({ success: false, error: "Commissioner access is required." }, { status: 401 });
    throw error;
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 }); }
  if (!isRequest(body)) return NextResponse.json({ success: false, error: "A valid diagnostic trade request is required." }, { status: 400 });
  const diagnostic = await buildServerTradeRecommendation(body);
  return NextResponse.json({ success: diagnostic.status === "READY", diagnostic }, { headers: { "Cache-Control": "private, no-store" } });
}
