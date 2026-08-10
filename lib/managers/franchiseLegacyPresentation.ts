import type {
  FranchiseHistory,
  FranchiseHistoryStatus,
  FranchiseTimelineEventType,
} from "@/lib/history/franchiseHistory";

export type FranchiseLegacyMetric = Readonly<{
  label: string;
  value: string | number;
}>;

export type FranchiseLegacyOwnershipRow = Readonly<{
  rowKey: string;
  yearLabel: string;
  title: string;
  detail: string;
  viewerParticipates: boolean;
}>;

export type FranchiseLegacyNameEra = Readonly<{
  nameEraKey: string;
  historicalName: string;
  yearLabel: string;
  isPrimary: boolean;
}>;

export type FranchiseLegacyTimelineEvent = Readonly<{
  eventKey: string;
  season: number;
  eventType: FranchiseTimelineEventType;
  title: string;
  detail: string | null;
}>;

export type OwnerFranchiseLegacyCard = Readonly<{
  franchiseId: string;
  franchiseName: string;
  status: FranchiseHistoryStatus;
  statusLabel: string;
  ownerRelationshipLabel: string;
  ownerFirstSeason: number;
  ownerLatestSeason: number;
  ownerSeasonLabel: string;
  metrics: readonly FranchiseLegacyMetric[];
  matchupSummary: string;
  matchupSeasonLabel: string | null;
  ownershipRows: readonly FranchiseLegacyOwnershipRow[];
  primaryNames: readonly FranchiseLegacyNameEra[];
  completeNameHistory: readonly FranchiseLegacyNameEra[];
  timeline: readonly FranchiseLegacyTimelineEvent[];
}>;

export type OwnerFranchiseLegacyPresentation = Readonly<{
  ownerId: string;
  cards: readonly OwnerFranchiseLegacyCard[];
  emptyMessage: string;
}>;

type OwnerIdentity = Readonly<{
  id: string;
  fullName: string;
  status: string;
}>;

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatSeasonRange(startSeason: number, endSeason: number | null) {
  if (endSeason === null) return `${startSeason}–Present`;
  return startSeason === endSeason
    ? `${startSeason}`
    : `${startSeason}–${endSeason}`;
}

function formatOwnerNames(
  ownerIds: readonly string[],
  ownersById: ReadonlyMap<string, OwnerIdentity>
) {
  const names = ownerIds.map(
    (ownerId) => ownersById.get(ownerId)?.fullName ?? ownerId
  );
  if (names.length <= 1) return names[0] ?? "Approved owner";
  return `${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

function formatRecord({
  wins,
  losses,
  ties,
}: FranchiseHistory["career"]["matchupRecords"]["overall"]) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatPlacement(placement: number | null) {
  if (placement === null) return "—";
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

function roleLabel(
  era: FranchiseHistory["ownershipEras"][number],
  ownerId: string
) {
  if (era.ownershipType === "co-owned") return "Co-Owners";
  if (era.primaryOwnerIds.includes(ownerId)) return "Primary Owner";
  return "Owner";
}

function buildOwnershipRows(
  history: FranchiseHistory,
  ownerId: string,
  ownersById: ReadonlyMap<string, OwnerIdentity>
) {
  const relevantEras = history.ownershipEras.filter((era) =>
    era.ownerIds.includes(ownerId)
  );
  const rows: FranchiseLegacyOwnershipRow[] = relevantEras.map((era) => ({
    rowKey: era.franchiseEraKey,
    yearLabel: formatSeasonRange(era.startSeason, era.endSeason),
    title: formatOwnerNames(era.ownerIds, ownersById),
    detail: roleLabel(era, ownerId),
    viewerParticipates: true,
  }));

  for (let index = 1; index < relevantEras.length; index += 1) {
    const previous = relevantEras[index - 1];
    const current = relevantEras[index];
    const previousEnd = previous.endSeason ?? previous.startSeason;
    const inactiveSeasons = history.seasons
      .filter(
        (season) =>
          season.coverage.seasonResult === "inactive" &&
          season.season > previousEnd &&
          season.season < current.startSeason
      )
      .map((season) => season.season);

    if (inactiveSeasons.length === 0) continue;
    rows.push({
      rowKey: `inactive:${history.franchiseId}:${inactiveSeasons.join("-")}`,
      yearLabel: formatSeasonRange(
        inactiveSeasons[0],
        inactiveSeasons.at(-1) ?? inactiveSeasons[0]
      ),
      title: "Inactive",
      detail: "No approved franchise participation",
      viewerParticipates: false,
    });
  }

  return rows.sort(
    (first, second) =>
      Number(first.yearLabel.slice(0, 4)) - Number(second.yearLabel.slice(0, 4)) ||
      first.rowKey.localeCompare(second.rowKey)
  );
}

function buildOwnerTimeline(
  history: FranchiseHistory,
  ownerId: string,
  ownershipRows: readonly FranchiseLegacyOwnershipRow[],
  ownerLatestSeason: number
) {
  const ownerSeasons = new Set(
    history.seasons
      .filter((season) => season.ownerIds.includes(ownerId))
      .map((season) => season.season)
  );
  const inactiveSeasons = new Set(
    ownershipRows
      .filter((row) => !row.viewerParticipates)
      .flatMap((row) => {
        const start = Number(row.yearLabel.slice(0, 4));
        const end = Number(row.yearLabel.slice(-4));
        return Array.from(
          { length: Math.max(1, end - start + 1) },
          (_, index) => start + index
        );
      })
  );

  return history.timeline
    .filter((event) => {
      if (event.ownerIds.includes(ownerId)) return true;
      if (event.ownerIds.length > 0) return false;
      if (ownerSeasons.has(event.season) || inactiveSeasons.has(event.season)) {
        return true;
      }
      return (
        (event.eventType === "dormant" || event.eventType === "retired") &&
        ownerLatestSeason === history.career.latestSeason
      );
    })
    .map((event) => ({
      eventKey: event.eventKey,
      season: event.season,
      eventType: event.eventType,
      title: event.title,
      detail: event.detail,
    }));
}

function buildCard(
  history: FranchiseHistory,
  ownerId: string,
  ownersById: ReadonlyMap<string, OwnerIdentity>
): OwnerFranchiseLegacyCard {
  const ownerSeasons = history.seasons.filter((season) =>
    season.ownerIds.includes(ownerId)
  );
  const ownerFirstSeason = ownerSeasons[0]?.season;
  const ownerLatestSeason = ownerSeasons.at(-1)?.season;
  if (ownerFirstSeason === undefined || ownerLatestSeason === undefined) {
    throw new Error(
      `Franchise ${history.franchiseId} has an ownership era for ${ownerId} without owner-season coverage.`
    );
  }

  const ownershipRows = buildOwnershipRows(history, ownerId, ownersById);
  const relationshipRoles = [
    ...new Set(
      ownershipRows
        .filter((row) => row.viewerParticipates)
        .map((row) => row.detail)
    ),
  ];
  const metrics: FranchiseLegacyMetric[] = [
    { label: "Franchise Seasons", value: history.career.seasonsActive },
    {
      label: "League Titles",
      value: history.career.placements.historicalChampionships,
    },
    { label: "Podiums", value: history.career.placements.podiums },
    {
      label: "Best Finish",
      value: formatPlacement(history.career.placements.bestFinish),
    },
    {
      label: "Worst Finish",
      value: formatPlacement(history.career.placements.worstFinish),
    },
  ];
  if (
    history.career.placements.platformChampionships !==
    history.career.placements.historicalChampionships
  ) {
    metrics.splice(2, 0, {
      label: "Platform Titles",
      value: history.career.placements.platformChampionships,
    });
  }

  const overall = history.career.matchupRecords.overall;
  const matchupSummary =
    overall.games > 0
      ? `${formatRecord(overall)} · ${PERCENT_FORMATTER.format(
          overall.winningPercentage ?? 0
        )}`
      : "No completed matchup record";
  const matchupSeasonLabel =
    history.career.firstMatchupSeason === null ||
    history.career.latestMatchupSeason === null
      ? null
      : formatSeasonRange(
          history.career.firstMatchupSeason,
          history.career.latestMatchupSeason
        );
  const nameEras = history.nameEras.map((era) => ({
    nameEraKey: era.franchiseNameEraKey,
    historicalName: era.historicalName,
    yearLabel: formatSeasonRange(era.startSeason, era.endSeason),
    isPrimary: era.timelineVisibility === "primary",
  }));

  return {
    franchiseId: history.franchiseId,
    franchiseName: history.career.currentDisplayName,
    status: history.career.status,
    statusLabel:
      history.career.status === "active"
        ? "Active"
        : history.career.status === "dormant"
          ? "Dormant"
          : "Retired",
    ownerRelationshipLabel: relationshipRoles.join(" / "),
    ownerFirstSeason,
    ownerLatestSeason,
    ownerSeasonLabel: ownershipRows
      .filter((row) => row.viewerParticipates)
      .map((row) => row.yearLabel)
      .join("; "),
    metrics,
    matchupSummary,
    matchupSeasonLabel,
    ownershipRows,
    primaryNames: nameEras.filter((era) => era.isPrimary),
    completeNameHistory: nameEras,
    timeline: buildOwnerTimeline(
      history,
      ownerId,
      ownershipRows,
      ownerLatestSeason
    ),
  };
}

export function buildOwnerFranchiseLegacyPresentation({
  ownerId,
  histories,
  owners,
}: {
  ownerId: string;
  histories: readonly FranchiseHistory[];
  owners: readonly OwnerIdentity[];
}): OwnerFranchiseLegacyPresentation {
  const owner = owners.find((candidate) => candidate.id === ownerId);
  if (!owner) throw new Error(`Unknown owner ${ownerId}.`);
  const ownersById = new Map(owners.map((candidate) => [candidate.id, candidate]));
  const associatedHistories = histories
    .filter((history) =>
      history.ownershipEras.some((era) => era.ownerIds.includes(ownerId))
    )
    .sort(
      (first, second) =>
        (first.seasons.find((season) => season.ownerIds.includes(ownerId))
          ?.season ?? Number.MAX_SAFE_INTEGER) -
          (second.seasons.find((season) => season.ownerIds.includes(ownerId))
            ?.season ?? Number.MAX_SAFE_INTEGER) ||
        first.career.currentDisplayName.localeCompare(
          second.career.currentDisplayName
        )
    );

  return {
    ownerId,
    cards: associatedHistories.map((history) =>
      buildCard(history, ownerId, ownersById)
    ),
    emptyMessage:
      owner.status === "staff"
        ? "This staff profile has no competitive franchise history."
        : "No approved canonical franchise history is available for this owner.",
  };
}
