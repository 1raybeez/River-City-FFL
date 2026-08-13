import { NextResponse } from "next/server";
import { loadOwnerHeadToHeadPresentation } from "@/lib/managers/ownerHeadToHeadLoader";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner");
  const opponent = url.searchParams.get("opponent");
  if (!owner || !opponent) {
    return NextResponse.json({ error: "Owner and opponent are required." }, { status: 400 });
  }

  const presentation = await loadOwnerHeadToHeadPresentation(owner, opponent);
  if (!presentation || !presentation.isSummarySupported) {
    return NextResponse.json({ supported: false });
  }

  const competitiveRecord = presentation.competitiveMetrics.find(
    (metric) => metric.label === "Competitive Record"
  );
  const completedMeetings = presentation.allMeetingMetrics.find(
    (metric) => metric.label === "All Completed Meetings"
  );
  const latest = presentation.seriesContext.latestMeeting;

  return NextResponse.json({
    supported: true,
    owner: presentation.owner.fullName,
    opponent: presentation.opponent.fullName,
    competitiveRecord: competitiveRecord?.value ?? null,
    completedMeetings: completedMeetings?.value ?? null,
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
