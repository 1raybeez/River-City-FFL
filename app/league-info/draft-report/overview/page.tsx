import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionWarRoomAccess } from "@/lib/auth/auctionAccess";
import { getOwnerDraftReportCardOverview } from "@/lib/draftReportCard";
import ReportCardOverview from "@/app/commish/post-draft/ReportCardOverview";

export default async function LeagueDraftReportOverviewPage() {
  let session;
  try { session = await requireAuctionWarRoomAccess(); } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/member/login?returnTo=%2Fleague-info%2Fdraft-report%2Foverview");
    throw error;
  }
  let reportIndex;
  try { reportIndex = await getOwnerDraftReportCardOverview(); } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/member/login?returnTo=%2Fleague-info%2Fdraft-report%2Foverview");
    throw error;
  }
  return <SiteShell activePath="/league-info"><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><ReportCardOverview reportIndex={reportIndex} ownerMode={session.access.role !== "commissioner"} ownerFranchiseId={session.access.authorizedFranchiseId} /></main></SiteShell>;
}
