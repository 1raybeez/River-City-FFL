import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionWarRoomAccess } from "@/lib/auth/auctionAccess";
import { getOwnerDraftReportCard } from "@/lib/draftReportCard";
import { draftReportV2OwnerPublicationEnabled, getDraftReportV2OwnerPublicationConfig, isDraftReportV2OwnerPublicationReviewValid } from "@/lib/draftReportV2/ownerPublication";
import { readDraftReportV2ReviewSnapshotForOwner } from "@/lib/draftReportV2/persistence";
import { hydrateMethodDResults } from "@/lib/draftReportV2/finalGrade";
import { buildOwnerPresentationReports } from "@/lib/draftReportV2/ownerPresentation";
import { OwnerReport } from "@/app/commish/post-draft/v2/owner-preview/OwnerPreviewClient";
import DraftReportCardView from "./DraftReportCardView";

export default async function OwnerDraftReportPage() {
  if (draftReportV2OwnerPublicationEnabled()) {
    let session;
    try { session = await requireAuctionWarRoomAccess(); } catch (error) {
      if (error instanceof AuctionAccessError) redirect("/member/login?returnTo=%2Fleague-info%2Fdraft-report");
      throw error;
    }
    if (session.access.role === "commissioner") redirect("/commish/post-draft");
    try {
      const config = getDraftReportV2OwnerPublicationConfig();
      const frozenReview = config.snapshotId ? await readDraftReportV2ReviewSnapshotForOwner(config.snapshotId) : null;
      if (frozenReview) {
        const review = hydrateMethodDResults(frozenReview);
        const reports = buildOwnerPresentationReports(review);
        if (!isDraftReportV2OwnerPublicationReviewValid(review, config) || reports.length !== 12) throw new Error("Published Draft Report V2 integrity validation failed.");
        const report = reports.find((candidate) => candidate.team.franchiseId === session.access.authorizedFranchiseId);
        if (!report) throw new Error("Published Draft Report V2 owner report is unavailable.");
        return <SiteShell activePath="/league-info"><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><OwnerReport report={report} /></main></SiteShell>;
      }
    } catch {
      // Publication-integrity failures deliberately fall through to V1.
    }
  }
  let report;
  try { report = await getOwnerDraftReportCard(); } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/member/login?returnTo=%2Fleague-info%2Fdraft-report");
    throw error;
  }
  if (!report) redirect("/commish/post-draft");
  return <SiteShell activePath="/league-info"><DraftReportCardView report={report} /></SiteShell>;
}
