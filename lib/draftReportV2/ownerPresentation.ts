export type OwnerPresentationReport = {
  team: { franchiseId: string; currentDisplayName: string; historicalDraftTimeTeamName: string };
  formula: { draftQualityRank: number | null };
  quality: {
    biggestStrength: string;
    biggestWeakness: string;
    components: Record<string, { leagueRank: number | null }>;
  };
  auction: { auctionEfficiency: { leagueRank: number | null } };
  final: { grade: string; methodDScore: number; overallRank: number };
  story: { startingCore: any[]; positionRoom: any[]; usefulDepth: any[]; flexContext: any[] };
};

export function buildOwnerPresentationReports(review: any): OwnerPresentationReport[] {
  return review.snapshot.teams.map((team: any) => {
    const formula = review.formulaC.find((row: any) => row.franchiseId === team.franchiseId);
    const quality = review.quality.teams.find((row: any) => row.franchiseId === team.franchiseId);
    const auction = review.auctionEfficiency.teams.find((row: any) => row.franchiseId === team.franchiseId);
    const final = review.finalGrades.find((row: any) => row.franchiseId === team.franchiseId);
    const contribution = review.contributionMap.find((row: any) => row.franchiseId === team.franchiseId);
    if (!formula || !quality || !auction || !final || !contribution) throw new Error(`Owner presentation is missing frozen data for ${team.franchiseId}.`);
    const playerById = new Map(contribution.allPlayers.map((player: any) => [player.playerId, { playerId: player.playerId, playerName: player.playerName, position: player.position }]));
    const playersFor = (component: string) => (contribution.components[component] ?? []).map((player: any) => playerById.get(player.playerId)).filter(Boolean).slice(0, 6);
    const startingCore = playersFor("STARTING LINEUP");
    const startingCoreIds = new Set(startingCore.map((player: any) => player.playerId));
    const usefulDepth = playersFor("DEPTH").filter((player: any) => !startingCoreIds.has(player.playerId));
    const usefulDepthIds = new Set(usefulDepth.map((player: any) => player.playerId));
    const positionRoom = ["QB ROOM", "RB ROOM", "WR ROOM", "TE ROOM"].flatMap(playersFor).filter((player: any, index: number, all: any[]) => !startingCoreIds.has(player.playerId) && !usefulDepthIds.has(player.playerId) && all.findIndex((candidate) => candidate.playerId === player.playerId) === index);
    const flexContext = playersFor("FLEX DIAGNOSTIC").filter((player: any) => startingCoreIds.has(player.playerId));
    return {
      team: { franchiseId: team.franchiseId, currentDisplayName: team.currentDisplayName, historicalDraftTimeTeamName: team.historicalDraftTimeTeamName },
      formula: { draftQualityRank: formula.draftQualityRank },
      quality: { biggestStrength: quality.biggestStrength, biggestWeakness: quality.biggestWeakness, components: { startingLineup: { leagueRank: quality.components.startingLineup.leagueRank }, depth: { leagueRank: quality.components.depth.leagueRank }, qbRoom: { leagueRank: quality.components.qbRoom.leagueRank }, rbRoom: { leagueRank: quality.components.rbRoom.leagueRank }, wrRoom: { leagueRank: quality.components.wrRoom.leagueRank }, teRoom: { leagueRank: quality.components.teRoom.leagueRank } } },
      auction: { auctionEfficiency: { leagueRank: auction.auctionEfficiency.leagueRank } },
      final: { grade: final.grade, methodDScore: final.methodDScore, overallRank: final.overallRank },
      story: { startingCore, positionRoom, usefulDepth, flexContext },
    };
  });
}
