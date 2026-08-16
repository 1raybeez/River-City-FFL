import HomeClient from "@/app/HomeClient";
import {
  anonymousCurrentMember,
  getCurrentMember,
} from "@/lib/auth/currentMember";
import { getPublishedLeagueRecap } from "@/lib/postDraftRecap";
import type { PublicLeagueRecap } from "@/lib/postDraftNarrativeTypes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let member = anonymousCurrentMember;
  let publishedRecap: PublicLeagueRecap | null = null;
  try {
    member = await getCurrentMember();
  } catch {
    // Public Home remains available when the optional session cannot be read.
  }
  try {
    publishedRecap = await getPublishedLeagueRecap(2026);
  } catch {
    // The legacy client recap remains available if publication lookup is unavailable.
  }
  return <HomeClient initialMember={member} initialPublishedRecap={publishedRecap} />;
}
