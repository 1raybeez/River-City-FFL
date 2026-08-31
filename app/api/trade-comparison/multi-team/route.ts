import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { buildMultiTeamRouting } from "@/lib/tradeComparison/multiTeamFoundation";
import { loadTradeComparisonContext } from "@/lib/tradeComparison/serverAdapter";
import type { MultiTeamTradeRequest } from "@/lib/tradeComparison/multiTeamTypes";
import { buildTwoTeamFairnessActivation } from "@/lib/tradeComparison/fairness/activation";
import { serializePublicFairnessResult } from "@/lib/tradeComparison/fairness/publicSerializer";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequest(value: unknown): MultiTeamTradeRequest | null {
  if (!isRecord(value) || value.version !== "m10" || (value.mode !== "LEAGUE_TRADE" && value.mode !== "SANDBOX") || value.season !== 2026 || !Array.isArray(value.participants)) return null;
  const participants = value.participants.map((item) => {
    if (!isRecord(item) || typeof item.participantId !== "string" || typeof item.franchiseId !== "string" || !Array.isArray(item.outgoing)) return null;
    const outgoing = item.outgoing.map((asset) => isRecord(asset) && typeof asset.playerId === "string" && typeof asset.destinationFranchiseId === "string" ? { playerId: asset.playerId, destinationFranchiseId: asset.destinationFranchiseId } : null);
    const faab = item.faab === undefined || item.faab === null ? null : isRecord(item.faab) && typeof item.faab.amount === "number" && typeof item.faab.destinationFranchiseId === "string" ? { amount: item.faab.amount, destinationFranchiseId: item.faab.destinationFranchiseId } : undefined;
    return outgoing.every(Boolean) && (item.faab === undefined || item.faab === null || faab !== undefined) ? { participantId: item.participantId, franchiseId: item.franchiseId, outgoing: outgoing as { playerId: string; destinationFranchiseId: string }[], faab: faab ?? null } : null;
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
    const context = await loadTradeComparisonContext({ includeAcquisitionSnapshot: input.mode === "LEAGUE_TRADE" && input.participants.length === 2 });
    const routing = buildMultiTeamRouting(input, { rosters: context.rosters, playerDirectory: context.multiTeamPlayerDirectory, marketByPlayer: context.marketByPlayer });
    const internalFairness = routing.status === "READY" && input.mode === "LEAGUE_TRADE" && input.participants.length === 2 && context.acquisitionSnapshot
      ? buildTwoTeamFairnessActivation({ participants: routing.participants, acquisitionSnapshot: context.acquisitionSnapshot, marketByPlayer: context.marketByPlayer, draftStatus: context.draftStatus })
      : input.mode === "LEAGUE_TRADE" && input.participants.length !== 2
        ? { status: "NOT_APPLICABLE" as const, result: null, reason: "TWO_TEAM_ONLY", affectedPlayerNames: [] }
        : null;
    const riverCityFairness = internalFairness?.result
      ? { ...internalFairness, result: serializePublicFairnessResult(internalFairness.result) }
      : internalFairness;
    return NextResponse.json({ success: routing.status === "READY", routing: { status: routing.status, mode: routing.mode, errors: routing.errors, sandboxMarketFairness: routing.sandboxMarketFairness ?? null, riverCityFairness, participants: routing.participants.map((participant) => ({
      participantId: participant.participantId,
      franchiseId: participant.franchiseId,
      sends: participant.sends.map((asset) => ({ player: asset.player, sourceFranchiseId: asset.sourceFranchiseId, destinationFranchiseId: asset.destinationFranchiseId })),
      receives: participant.receives.map((asset) => ({ player: asset.player, sourceFranchiseId: asset.sourceFranchiseId, destinationFranchiseId: asset.destinationFranchiseId })),
      rosterContext: participant.rosterContext,
      faabSent: participant.faabSent,
      faabReceived: participant.faabReceived,
      positionalBefore: participant.positionalBefore,
      positionalAfter: participant.positionalAfter,
      market: participant.market,
      reasoning: participant.reasoning,
    })) } }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Trade analysis is temporarily unavailable." }, { status: 503 });
  }
}
