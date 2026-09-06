import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getCommissionerDraftReportCard } from "@/lib/draftReportCard";
import DraftReportCardView from "@/app/league-info/draft-report/DraftReportCardView";

export default async function CommissionerPostDraftReportPage({ searchParams }: { searchParams: Promise<{ franchiseId?: string }> }) {
  const { franchiseId } = await searchParams;
  if (!franchiseId) redirect("/commish/post-draft");
  let report;
  try { report = await getCommissionerDraftReportCard(franchiseId); } catch (error) {
    if (error instanceof AuctionAccessError) redirect(`/commish/login?returnTo=${encodeURIComponent(`/commish/post-draft/report?franchiseId=${franchiseId}`)}`);
    throw error;
  }
  return <SiteShell activePath="/commish"><DraftReportCardView report={report} /></SiteShell>;
}
