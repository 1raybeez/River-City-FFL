import { NextResponse } from "next/server";
import { getRivalry } from "@/lib/history/rivalryHistory";
import { loadOwnerHeadToHeadPresentation } from "@/lib/managers/ownerHeadToHeadLoader";
import { loadRivalryHubPresentation } from "@/lib/managers/rivalryHubLoader";

function meetingSummary(meeting: NonNullable<Awaited<ReturnType<typeof loadOwnerHeadToHeadPresentation>>>["meetings"][number]) {
  return {
    meetingKey: meeting.meetingKey,
    season: meeting.season,
    contextLabel: meeting.contextLabel,
    classificationLabel: meeting.classificationLabel,
    isChampionshipGame: meeting.isChampionshipGame,
    scoreLabel: meeting.scoreLabel,
    marginLabel: meeting.marginLabel,
    resultLabel: meeting.resultLabel,
    ownerFranchiseName: meeting.ownerFranchiseName,
    opponentFranchiseName: meeting.opponentFranchiseName,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner");
  const opponent = url.searchParams.get("opponent");
  if (!owner || !opponent) {
    return NextResponse.json({ error: "Owner and opponent are required." }, { status: 400 });
  }

  const presentation = await loadOwnerHeadToHeadPresentation(owner, opponent);
  if (!presentation) {
    return NextResponse.json({ supported: false });
  }

  const competitiveRecord = presentation.competitiveMetrics.find(
    (metric) => metric.label === "Competitive Record"
  );
  const completedMeetings = presentation.allMeetingMetrics.find(
    (metric) => metric.label === "All Completed Meetings"
  );
  const latest = presentation.seriesContext.latestMeeting;
  const metricValue = (label: string) =>
    presentation.allMeetingMetrics.find((metric) => metric.label === label)?.value ?? null;
  const notableMeeting = (title: "Closest Meeting" | "Largest Win" | "Largest Loss") => {
    const notable = presentation.notableMeetings.find((item) => item.title === title);
    return notable ? meetingSummary(notable.meeting) : null;
  };
  let rivalryHref: string | null = null;
  try {
    await loadRivalryHubPresentation();
    rivalryHref = getRivalry(owner, opponent) ? "/league-info/rivalries" : null;
  } catch {
    rivalryHref = null;
  }

  return NextResponse.json({
    supported: presentation.isSummarySupported,
    owner: presentation.owner.fullName,
    opponent: presentation.opponent.fullName,
    ownerFranchiseName: presentation.owner.teamName,
    opponentFranchiseName: presentation.opponent.teamName,
    competitiveRecord: competitiveRecord?.value ?? null,
    completedMeetings: completedMeetings?.value ?? null,
    series: presentation.isSummarySupported
      ? {
          regularMeetings: metricValue("Regular"),
          championshipPlayoffMeetings: metricValue("Championship Playoff"),
          championshipGames: metricValue("Championship Games"),
        }
      : null,
    streak: null,
    recentMeetings: presentation.meetings.slice(0, 5).map(meetingSummary),
    closestMeeting: notableMeeting("Closest Meeting"),
    largestWin: notableMeeting("Largest Win"),
    largestLoss: notableMeeting("Largest Loss"),
    coverage: presentation.coverage,
    rivalryHref,
    latestMeeting: latest
      ? {
          season: latest.season,
          scoreLabel: latest.scoreLabel,
          contextLabel: latest.contextLabel,
        }
      : null,
    href: `/managers/owners/${presentation.owner.slug}/opponents/${presentation.opponent.slug}`,
  });
}
