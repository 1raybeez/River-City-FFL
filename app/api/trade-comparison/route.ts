import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { loadTradeComparisonContext } from "@/lib/tradeComparison/serverAdapter";
import { buildTradeComparison } from "@/lib/tradeComparison/adapter";
import { serializePublicTradeComparison } from "@/lib/tradeComparison/publicSerializer";
import type { TradeComparisonInput } from "@/lib/tradeComparison/types";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPlayerIds(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) return null;
  const playerIds = value.map((playerId) => typeof playerId === "string" ? playerId.trim() : "");
  return playerIds.every((playerId) => playerId.length > 0 && playerId.length <= 64) ? playerIds : null;
}

function parseInput(value: unknown): TradeComparisonInput | null {
  if (!isRecord(value) || !Number.isInteger(value.season) || value.season !== 2026) return null;
  const sideA = isRecord(value.sideA) ? value.sideA : null;
  const sideB = isRecord(value.sideB) ? value.sideB : null;
  if (!sideA || !sideB || typeof sideA.franchiseId !== "string" || typeof sideB.franchiseId !== "string") return null;
  const playerIdsA = readPlayerIds(sideA.playerIds);
  const playerIdsB = readPlayerIds(sideB.playerIds);
  if (!playerIdsA || !playerIdsB) return null;
  return { season: 2026, sideA: { franchiseId: sideA.franchiseId.trim(), playerIds: playerIdsA }, sideB: { franchiseId: sideB.franchiseId.trim(), playerIds: playerIdsB } };
}

async function requireMember() {
  const member = await getCurrentMember();
  return member.authenticated ? member : null;
}

export async function GET() {
  try {
    if (!(await requireMember())) return NextResponse.json({ success: false, error: "League Member Login required." }, { status: 401 });
    const { rosters, playerDirectory } = await loadTradeComparisonContext();
    return NextResponse.json({
      success: true,
      franchises: rosters.map((roster) => ({
        franchiseId: roster.franchiseId,
        franchiseName: roster.franchiseName,
        available: roster.available,
        availableFaab: roster.availableFaab ?? null,
        avatar: roster.avatar ?? null,
        players: roster.players.map((player) => ({ playerId: player.playerId, name: player.name, position: player.position, nflTeam: player.nflTeam, injuryStatus: player.injuryStatus ?? null, avatar: player.avatar ?? null, byeWeek: player.byeWeek ?? null })),
      })),
      sandboxPlayers: Object.values(playerDirectory).map((player) => ({ playerId: player.playerId, name: player.displayName, position: player.position, nflTeam: player.nflTeam, injuryStatus: player.injuryStatus ?? null, avatar: player.avatar ?? null, byeWeek: null })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Current roster data is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireMember())) return NextResponse.json({ success: false, error: "League Member Login required." }, { status: 401 });
    let input: TradeComparisonInput | null;
    try {
      input = parseInput(await request.json());
    } catch {
      input = null;
    }
    if (!input) return NextResponse.json({ success: false, error: "Choose two franchises and at least one current player on each side." }, { status: 400 });
    const context = await loadTradeComparisonContext();
    const result = buildTradeComparison({ input, ...context });
    return NextResponse.json({ success: true, comparison: serializePublicTradeComparison(result) }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Trade comparison is temporarily unavailable." }, { status: 503 });
  }
}
