import type { OwnerSeasonHistoryRecord } from "@/lib/history/ownerSeasonHistory";
import type { OwnerProfileViewModel } from "@/lib/managers/identitySelectors";

export type OwnerCareerTimelineEventSource =
  | "owner-season-history"
  | "curated-profile-timeline";

export type OwnerCareerTimelineEvent = Readonly<{
  eventKey: string;
  year: string;
  title: string;
  detail: string | null;
  badges: readonly string[];
  source: OwnerCareerTimelineEventSource;
  sortYear: number | null;
  sortOrder: number;
}>;

function formatPlacement(placement: number) {
  const remainder = placement % 100;
  if (remainder >= 11 && remainder <= 13) return `${placement}th`;

  const suffix =
    placement % 10 === 1
      ? "st"
      : placement % 10 === 2
        ? "nd"
        : placement % 10 === 3
          ? "rd"
          : "th";
  return `${placement}${suffix}`;
}

function getOwnershipLabel(record: OwnerSeasonHistoryRecord) {
  if (record.ownershipRole === "primary") return "Primary Owner";
  if (record.ownershipRole === "co-owner") return "Co-Owner";
  if (record.ownershipRole === "legacy-owner") return "Legacy Owner";
  return null;
}

function getSeasonBadges(record: OwnerSeasonHistoryRecord) {
  const badges: string[] = [];

  if (record.isPlatformChampion) badges.push("Champion");
  else if (record.isPlatformRunnerUp) badges.push("Runner-Up");
  else if (record.isThirdPlace) badges.push("Third Place");
  else if (record.isPodium) badges.push("Podium");

  if (record.historicalChampionshipType === "co-champion") {
    badges.push("Historical Co-Champion");
  } else if (record.isHistoricalChampion && !record.isPlatformChampion) {
    badges.push("Historical Champion");
  }

  if (record.isLastPlace) badges.push("Last Place");
  return badges;
}

function getSeasonDetail(record: OwnerSeasonHistoryRecord) {
  const details: string[] = [];
  const ownershipLabel = getOwnershipLabel(record);

  if (record.franchiseName) details.push(record.franchiseName);
  else if (record.coverage.franchise === "unresolved") {
    details.push("Franchise unresolved");
  }

  if (
    record.historicalTeamName &&
    record.historicalTeamName !== record.franchiseName
  ) {
    details.push(`Historical team: ${record.historicalTeamName}`);
  }

  if (ownershipLabel) details.push(ownershipLabel);
  if (record.coOwners.length > 0) {
    details.push(
      `With ${record.coOwners.map((owner) => owner.ownerName).join(" and ")}`
    );
  }

  return details.join(" · ") || "Approved River City season result.";
}

function getCompletedSeasonRecords(records: readonly OwnerSeasonHistoryRecord[]) {
  return records
    .filter(
      (record) =>
        record.coverage.seasonResult === "resolved" &&
        record.finalPlacement !== null
    )
    .sort((first, second) => first.season - second.season);
}

function buildSeasonEvents(records: readonly OwnerSeasonHistoryRecord[]) {
  const completedRecords = getCompletedSeasonRecords(records);
  const firstSeason = completedRecords[0]?.season ?? null;
  const representedSeasons = new Set(
    completedRecords.map((record) => record.season)
  );
  const events: OwnerCareerTimelineEvent[] = [];

  completedRecords.forEach((record, index) => {
    const previousRecord = completedRecords[index - 1];
    const returnedAfterGap =
      previousRecord !== undefined &&
      record.season - previousRecord.season > 1;
    const participationTitle =
      record.season === firstSeason
        ? "Joined River City"
        : returnedAfterGap
          ? "Returned to River City"
          : null;

    events.push({
      eventKey: `season-result:${record.ownerSeasonKey}`,
      year: `${record.season}`,
      title: `${participationTitle ? `${participationTitle} · ` : ""}Finished ${formatPlacement(record.finalPlacement as number)}`,
      detail: getSeasonDetail(record),
      badges: getSeasonBadges(record),
      source: "owner-season-history",
      sortYear: record.season,
      sortOrder: 30,
    });

    if (!previousRecord || !returnedAfterGap) return;

    for (
      let missingSeason = previousRecord.season + 1;
      missingSeason < record.season;
      missingSeason += 1
    ) {
      if (representedSeasons.has(missingSeason)) continue;
      events.push({
        eventKey: `participation-gap:${record.ownerId}:${missingSeason}`,
        year: `${missingSeason}`,
        title: "Did not participate",
        detail: "No approved owner-season result exists for this season.",
        badges: [],
        source: "owner-season-history",
        sortYear: missingSeason,
        sortOrder: 20,
      });
    }
  });

  return events;
}

function parseTimelineYear(year: string) {
  const parsed = Number.parseInt(year, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildCuratedEvents(profile: OwnerProfileViewModel) {
  const tenures = [...profile.currentTenures, ...profile.legacyTenures];
  const genericTenureStartTitles = new Set(
    tenures.map((tenure) => {
      const franchiseName =
        tenure.franchise?.currentTeamName ?? tenure.franchiseId;
      return `${tenure.roleLabel} of ${franchiseName}`;
    })
  );
  const legacyEndByTitle = new Map<
    string,
    { title: string; detail: string }
  >(
    tenures.flatMap((tenure) => {
      if (tenure.role !== "legacy-owner") return [];
      const franchiseName =
        tenure.franchise?.currentTeamName ?? tenure.franchiseId;
      return [
        [
          `${franchiseName} legacy archived`,
          {
            title: `Final season as ${franchiseName} owner`,
            detail: `Retired owner legacy begins after ${tenure.endSeason ?? tenure.endLabel ?? "this season"}.`,
          },
        ] as const,
      ];
    })
  );

  return profile.timeline.flatMap((item, index) => {
    if (
      item.year === "Career" ||
      item.title === "Fantasy era begins" ||
      item.title === "Season away from league" ||
      item.title === "Special Brownies ownership begins" ||
      genericTenureStartTitles.has(item.title)
    ) {
      return [];
    }

    const legacyEnd = legacyEndByTitle.get(item.title);
    if (item.title.endsWith("legacy archived") && !legacyEnd) return [];

    const sortOrder =
      legacyEnd || item.title.startsWith("Final season")
        ? 40
        : 10;

    return [
      {
        eventKey: `curated:${profile.owner.id}:${item.year}:${index}`,
        year: item.year,
        title: legacyEnd?.title ?? item.title,
        detail: legacyEnd?.detail ?? item.detail ?? null,
        badges: [],
        source: "curated-profile-timeline" as const,
        sortYear: parseTimelineYear(item.year),
        sortOrder,
      },
    ];
  });
}

export function buildOwnerCareerTimeline(
  profile: OwnerProfileViewModel,
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[]
): readonly OwnerCareerTimelineEvent[] {
  return [...buildSeasonEvents(ownerSeasonRecords), ...buildCuratedEvents(profile)]
    .sort((first, second) => {
      if (first.sortYear === null && second.sortYear === null) {
        return (
          first.sortOrder - second.sortOrder ||
          first.eventKey.localeCompare(second.eventKey)
        );
      }
      if (first.sortYear === null) return 1;
      if (second.sortYear === null) return -1;
      return (
        first.sortYear - second.sortYear ||
        first.sortOrder - second.sortOrder ||
        first.eventKey.localeCompare(second.eventKey)
      );
    });
}
