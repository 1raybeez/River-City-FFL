import type { TradeComparisonResult } from "./types";

export function serializePublicTradeComparison(result: TradeComparisonResult) {
  return {
    status: result.status,
    errors: result.errors.map((error) => ({ code: error.code, message: error.message })),
    coverage: result.coverage,
    auctionValueContext: { sideA: result.auctionValueContext.sideA, sideB: result.auctionValueContext.sideB, season: result.auctionValueContext.season, sourceLabel: result.auctionValueContext.sourceLabel },
    sides: result.sides?.map((side) => ({
      franchiseId: side.franchiseId,
      franchiseName: side.franchiseName,
      players: side.players.map((player) => ({ playerId: player.playerId, name: player.name, position: player.position, nflTeam: player.nflTeam, auctionValue: { value: player.auctionValue.value, season: player.auctionValue.season, sourceLabel: player.auctionValue.sourceLabel } })),
      positionalBefore: { ...side.positionalBefore },
      positionalAfter: { ...side.positionalAfter },
    })) ?? null,
  };
}
