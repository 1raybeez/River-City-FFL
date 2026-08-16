import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { listNarratives, listPostDraftSnapshots } from "@/lib/postDraftWorkflow";
import PostDraftClient from "./PostDraftClient";

export default async function PostDraftPage() {
  let snapshots;
  let narratives;
  try {
    [snapshots, narratives] = await Promise.all([listPostDraftSnapshots(), listNarratives()]);
  } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Fpost-draft");
    throw error;
  }
  return <SiteShell activePath="/commish"><PostDraftClient initialSnapshots={snapshots} initialNarratives={narratives} /></SiteShell>;
}
