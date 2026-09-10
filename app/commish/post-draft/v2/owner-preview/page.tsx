import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { buildLiveDraftReportV2Review } from "@/lib/draftReportV2/review";
import { readDraftReportV2ReviewSnapshot } from "@/lib/draftReportV2/persistence";
import { hydrateMethodDResults } from "@/lib/draftReportV2/finalGrade";
import OwnerPreviewClient from "./OwnerPreviewClient";

export default async function DraftReportV2OwnerPreviewPage({ searchParams }: { searchParams: Promise<{ franchiseId?: string }> }) {
  let session;
  try { session = await requireAuctionAccess("maintenance"); } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft%2Fv2%2Fowner-preview");
    throw error;
  }
  const liveReview = await buildLiveDraftReportV2Review();
  const frozenReview = await readDraftReportV2ReviewSnapshot(liveReview.snapshot.snapshotId);
  const review = hydrateMethodDResults(frozenReview ?? liveReview);
  const finalGrades = review.finalGrades;
  const requestedFranchiseId = (await searchParams).franchiseId;
  const defaultFranchiseId = session.access.authorizedFranchiseId && finalGrades.some((row) => row.franchiseId === session.access.authorizedFranchiseId)
    ? session.access.authorizedFranchiseId
    : finalGrades[0]?.franchiseId;
  const selectedFranchiseId = finalGrades.some((row) => row.franchiseId === requestedFranchiseId) ? requestedFranchiseId : defaultFranchiseId;
  const reports = review.snapshot.teams.map((team: any) => {
    const formula = review.formulaC.find((row: any) => row.franchiseId === team.franchiseId);
    const quality = review.quality.teams.find((row: any) => row.franchiseId === team.franchiseId);
    const auction = review.auctionEfficiency.teams.find((row: any) => row.franchiseId === team.franchiseId);
    const final = finalGrades.find((row) => row.franchiseId === team.franchiseId);
    const contribution = review.contributionMap.find((row: any) => row.franchiseId === team.franchiseId);
    if (!formula || !quality || !auction || !final || !contribution) throw new Error(`Owner preview is missing frozen data for ${team.franchiseId}.`);
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
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><OwnerPreviewClient reports={reports} selectedFranchiseId={selectedFranchiseId ?? reports[0]?.team.franchiseId ?? ""} /></main></SiteShell>;
}
