import type { AuctionEfficiencyTeam, DraftReportV2Snapshot } from "@/lib/draftReportV2/types";
const round = (value: number) => Math.round(value * 100) / 100;
function rank(value: number | null, values: readonly (number | null)[]) { return value === null ? null : values.filter((candidate): candidate is number => candidate !== null && candidate > value).length + 1; }

export function calculateAuctionEfficiency(snapshot: DraftReportV2Snapshot) {
  const players = new Map(snapshot.players.map((player) => [player.playerId, player]));
  const preliminary: AuctionEfficiencyTeam[] = snapshot.teams.map((team) => {
    const rows = team.acquisitions.map((acquisition) => ({ acquisition, player: players.get(acquisition.playerId) })).filter((row) => row.player);
    const comparable = rows.filter((row) => row.acquisition.purchasePrice !== null && row.player!.evidence.publishedValue !== null).map((row) => ({ ...row, surplus: round(row.player!.evidence.publishedValue! - row.acquisition.purchasePrice!) }));
    const surplus = comparable.length ? round(comparable.reduce((sum, row) => sum + row.surplus, 0)) : null;
    const totalSpend = round(team.acquisitions.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0));
    const keeperEconomicSurplus = rows.filter((row) => row.acquisition.isKeeper).every((row) => row.player!.evidence.publishedValue !== null) ? round(rows.filter((row) => row.acquisition.isKeeper).reduce((sum, row) => sum + (row.player!.evidence.publishedValue! - (row.acquisition.keeperCost ?? row.acquisition.purchasePrice ?? 0)), 0)) : null;
    const best = comparable.slice().sort((a, b) => b.surplus - a.surplus || a.acquisition.playerId.localeCompare(b.acquisition.playerId))[0];
    const reach = comparable.slice().sort((a, b) => a.surplus - b.surplus || a.acquisition.playerId.localeCompare(b.acquisition.playerId))[0];
    return { franchiseId: team.franchiseId, rosterId: team.rosterId, teamName: team.currentDisplayName, auctionEfficiency: { score: surplus, leagueRank: null }, totalSpend, budgetRemaining: round(200 - totalSpend), referenceSurplus: surplus, bestBuy: best ? { playerId: best.acquisition.playerId, playerName: best.acquisition.playerName, surplus: best.surplus } : null, biggestReach: reach ? { playerId: reach.acquisition.playerId, playerName: reach.acquisition.playerName, surplus: reach.surplus } : null, keeperEconomicSurplus, warnings: comparable.length === 0 ? ["No frozen reference value and purchase-price comparisons are available."] : [] };
  });
  const scores = preliminary.map((team) => team.referenceSurplus);
  preliminary.forEach((team) => { team.auctionEfficiency.score = team.referenceSurplus; team.auctionEfficiency.leagueRank = rank(team.referenceSurplus, scores); });
  return { modelVersion: "auction-efficiency-v1" as const, formula: "Auction Efficiency diagnostics use frozen external reference value minus acquisition price; budget, spending concentration, best buy/reach, and keeper economics remain separate diagnostics. Reference values are not River City clearing prices.", teams: preliminary.sort((a, b) => (a.auctionEfficiency.leagueRank ?? 99) - (b.auctionEfficiency.leagueRank ?? 99) || a.franchiseId.localeCompare(b.franchiseId)) };
}
