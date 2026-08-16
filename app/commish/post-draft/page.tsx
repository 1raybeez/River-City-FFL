import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { listNarratives, listPostDraftSnapshots } from "@/lib/postDraftWorkflow";
import { listPostDraftPublications } from "@/lib/postDraftPublication";
import PostDraftClient from "./PostDraftClient";

export default async function PostDraftPage() {
  let snapshots;
  let narratives;
  let publications;
  try {
    [snapshots, narratives, publications] = await Promise.all([listPostDraftSnapshots(), listNarratives(), listPostDraftPublications()]);
  } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft");
    throw error;
  }
  return <SiteShell activePath="/commish"><PostDraftClient initialSnapshots={snapshots} initialNarratives={narratives} initialPublications={publications} /></SiteShell>;
}
