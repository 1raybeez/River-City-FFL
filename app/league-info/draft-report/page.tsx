import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getOwnerDraftReportCard } from "@/lib/draftReportCard";
import DraftReportCardView from "./DraftReportCardView";

export default async function OwnerDraftReportPage() {
  let report;
  try { report = await getOwnerDraftReportCard(); } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/auction/login?returnTo=%2Fleague-info%2Fdraft-report");
    throw error;
  }
  if (!report) redirect("/commish/post-draft");
  return <SiteShell activePath="/league-info"><DraftReportCardView report={report} /></SiteShell>;
}
