import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { buildLiveDraftReportV2Review } from "@/lib/draftReportV2/review";
import V2PreviewClient from "./V2PreviewClient";

export default async function DraftReportV2PreviewPage() {
  try { await requireAuctionAccess("maintenance"); } catch (error) { if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft%2Fv2"); throw error; }
  const review = await buildLiveDraftReportV2Review();
  return <SiteShell activePath="/commish"><main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><V2PreviewClient review={review} /></main></SiteShell>;
}
