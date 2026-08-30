import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getCommissionerPostDraftIndex, listNarratives, listPostDraftSnapshots } from "@/lib/postDraftWorkflow";
import { listPostDraftPublications } from "@/lib/postDraftPublication";
import { listPostDraftRecapDrafts } from "@/lib/postDraftRecap";
import PostDraftRecapClient from "./PostDraftRecapClient";
import PostDraftClient from "./PostDraftClient";
import ReportCardOverview from "./ReportCardOverview";

export default async function PostDraftPage() {
  let snapshots;
  let narratives;
  let publications;
  let recapDrafts;
  let reportIndex;
  try {
    [snapshots, narratives, publications, recapDrafts, reportIndex] = await Promise.all([listPostDraftSnapshots(), listNarratives(), listPostDraftPublications(), listPostDraftRecapDrafts(), getCommissionerPostDraftIndex()]);
  } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft");
    throw error;
  }
  return <SiteShell activePath="/commish"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><ReportCardOverview reportIndex={reportIndex} /></div><PostDraftClient initialSnapshots={snapshots} initialNarratives={narratives} initialPublications={publications} reportIndex={reportIndex} /><PostDraftRecapClient initialRecaps={recapDrafts} initialPublications={publications} /></SiteShell>;
}
