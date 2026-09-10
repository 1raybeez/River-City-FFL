import HomeClient from "@/app/HomeClient";
import {
  anonymousCurrentMember,
  getCurrentMember,
} from "@/lib/auth/currentMember";
import { getPublishedLeagueRecap } from "@/lib/postDraftRecap";
import type { PublicLeagueRecap } from "@/lib/postDraftNarrativeTypes";
import { getHomeBoxOneState } from "@/lib/home/boxOneServer";
import type { BoxOneState } from "@/lib/home/boxOneState";
import { getHomeLiveSeasonState } from "@/lib/home/liveSeasonState";
import type { HomeLiveSeasonState } from "@/lib/home/liveSeasonState";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let member = anonymousCurrentMember;
  let publishedRecap: PublicLeagueRecap | null = null;
  let boxOneState: BoxOneState;
  let liveSeasonState: HomeLiveSeasonState;
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
  try {
    boxOneState = await getHomeBoxOneState(2026);
  } catch {
    boxOneState = {
      state: "DATA_UNAVAILABLE",
      season: 2026,
      draftStatus: "unknown",
      draftId: null,
      draftStartAt: null,
      seasonStartAt: null,
      openingEvent: null,
      timezone: "America/New_York",
      title: "DRAFT / SEASON DETAILS UNAVAILABLE",
      actions: {
        showRsvp: false,
        showCalendarInvite: false,
        showMeet: false,
        showLocation: false,
        showDraftCountdown: false,
        showSeasonCountdown: false,
        primaryAction: "none",
      },
      unavailableReason: "draft-status",
    };
  }
  try {
    liveSeasonState = await getHomeLiveSeasonState();
  } catch {
    liveSeasonState = {
      activeWeek: 1,
      phase: "WEEK_ACTIVE",
      finality: { activeWeek: 1, finalizedWeek: null, finalizedWeeks: [], statCorrectionBufferWeeks: 1 },
      weeklyHighScore: [],
      playoffWeekStart: null,
      seasonType: null,
    };
  }
  return <HomeClient initialMember={member} initialPublishedRecap={publishedRecap} initialBoxOneState={boxOneState} initialLiveSeasonState={liveSeasonState} />;
}
