import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { buildLiveDraftReportV2Review } from "@/lib/draftReportV2/review";
import { readDraftReportV2ReviewSnapshot } from "@/lib/draftReportV2/persistence";
import { hydrateMethodDResults } from "@/lib/draftReportV2/finalGrade";
import { buildOwnerPresentationReports } from "@/lib/draftReportV2/ownerPresentation";
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
  const reports = buildOwnerPresentationReports(review);
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><OwnerPreviewClient reports={reports} selectedFranchiseId={selectedFranchiseId ?? reports[0]?.team.franchiseId ?? ""} /></main></SiteShell>;
}
