import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { buildMultiTeamRouting } from "@/lib/tradeComparison/multiTeamFoundation";
import { loadTradeComparisonContext } from "@/lib/tradeComparison/serverAdapter";
import type { MultiTeamTradeRequest } from "@/lib/tradeComparison/multiTeamTypes";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequest(value: unknown): MultiTeamTradeRequest | null {
  if (!isRecord(value) || value.version !== "m10" || (value.mode !== "LEAGUE_TRADE" && value.mode !== "SANDBOX") || value.season !== 2026 || !Array.isArray(value.participants)) return null;
  const participants = value.participants.map((item) => {
    if (!isRecord(item) || typeof item.participantId !== "string" || typeof item.franchiseId !== "string" || !Array.isArray(item.outgoing)) return null;
    const outgoing = item.outgoing.map((asset) => isRecord(asset) && typeof asset.playerId === "string" && typeof asset.destinationFranchiseId === "string" ? { playerId: asset.playerId, destinationFranchiseId: asset.destinationFranchiseId } : null);
    return outgoing.every(Boolean) ? { participantId: item.participantId, franchiseId: item.franchiseId, outgoing: outgoing as { playerId: string; destinationFranchiseId: string }[] } : null;
  });
  return participants.every(Boolean) ? { version: "m10", mode: value.mode, season: 2026, participants: participants as MultiTeamTradeRequest["participants"] } : null;
}

export async function POST(request: Request) {
  try {
    const member = await getCurrentMember();
    if (!member.authenticated) return NextResponse.json({ success: false, error: "League Member Login required." }, { status: 401 });
    let input: MultiTeamTradeRequest | null = null;
    try { input = parseRequest(await request.json()); } catch { input = null; }
    if (!input) return NextResponse.json({ success: false, error: "Choose two to four participants and valid player destinations." }, { status: 400 });
    const context = await loadTradeComparisonContext();
    const routing = buildMultiTeamRouting(input, { rosters: context.rosters, playerDirectory: context.multiTeamPlayerDirectory, marketByPlayer: context.marketByPlayer });
    return NextResponse.json({ success: routing.status === "READY", routing: { status: routing.status, mode: routing.mode, errors: routing.errors, participants: routing.participants.map((participant) => ({
      participantId: participant.participantId,
      franchiseId: participant.franchiseId,
      sends: participant.sends.map((asset) => ({ player: asset.player, sourceFranchiseId: asset.sourceFranchiseId, destinationFranchiseId: asset.destinationFranchiseId })),
      receives: participant.receives.map((asset) => ({ player: asset.player, sourceFranchiseId: asset.sourceFranchiseId, destinationFranchiseId: asset.destinationFranchiseId })),
      rosterContext: participant.rosterContext,
      positionalBefore: participant.positionalBefore,
      positionalAfter: participant.positionalAfter,
      market: participant.market,
      reasoning: participant.reasoning,
    })) } }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Trade analysis is temporarily unavailable." }, { status: 503 });
  }
}
