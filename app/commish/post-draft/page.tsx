import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { getCommissionerPostDraftIndex, listNarratives, listPostDraftSnapshots } from "@/lib/postDraftWorkflow";
import { listPostDraftPublications } from "@/lib/postDraftPublication";
import { listPostDraftRecapDrafts } from "@/lib/postDraftRecap";
import PostDraftRecapClient from "./PostDraftRecapClient";
import PostDraftClient from "./PostDraftClient";
import ReportCardOverview from "./ReportCardOverview";
import ReportCardEmailClient from "./ReportCardEmailClient";
import { getDraftReportV2OwnerPublicationStatus } from "@/lib/draftReportV2/ownerPublication";

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
  const ownerPublication = getDraftReportV2OwnerPublicationStatus();
  return <SiteShell activePath="/commish"><div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><div><a href="/commish/post-draft/v2" className="font-semibold text-orange-700">Open Draft Report V2 commissioner preview →</a><div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Draft Report V2 owner publication</p><p className="mt-1 text-lg font-black text-slate-950">{ownerPublication.enabled ? "ENABLED" : "DISABLED"}</p><p className="mt-1 text-xs text-slate-600">Status only. The canonical owner route remains on V1 unless explicitly enabled with an approved frozen snapshot.</p></div></div><ReportCardOverview reportIndex={reportIndex} /><ReportCardEmailClient /></div><PostDraftClient initialSnapshots={snapshots} initialNarratives={narratives} initialPublications={publications} reportIndex={reportIndex} /><PostDraftRecapClient initialRecaps={recapDrafts} initialPublications={publications} /></SiteShell>;
}
