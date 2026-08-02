import type {
  CanonicalFranchiseMatchup,
  CanonicalMatchupType,
} from "@/lib/history/canonicalMatchupHistory";
import type { FranchiseRosterMapping } from "@/lib/history/franchiseRosterMappings";
import type { HistoricalSeasonResult } from "@/lib/history/historicalSeasonResults";
import type { OwnerSeasonHistoryRecord } from "@/lib/history/ownerSeasonHistory";
import type {
  Franchise,
  OwnershipRole,
  OwnershipTenure,
} from "@/lib/managers/identityTypes";

export type FranchiseHistoryStatus = "active" | "dormant" | "retired";

export const APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES = Object.freeze({
  "special-brownies": "dormant",
} satisfies Readonly<Record<string, FranchiseHistoryStatus>>);

export type FranchiseMatchupRecord = Readonly<{
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winningPercentage: number | null;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}>;

export type FranchiseMatchupRecordSplits = Readonly<{
  overall: FranchiseMatchupRecord;
  regularSeason: FranchiseMatchupRecord;
  championshipPlayoff: FranchiseMatchupRecord;
  championshipGames: FranchiseMatchupRecord;
  thirdPlace: FranchiseMatchupRecord;
  placement: FranchiseMatchupRecord;
  consolation: FranchiseMatchupRecord;
  toiletBowl: FranchiseMatchupRecord;
}>;

export type FranchiseSeasonOwnerRole = Readonly<{
  ownerId: string;
  role: OwnershipRole | null;
  isPrimaryOwner: boolean;
  isCoOwner: boolean;
  ownerSeasonKeys: readonly string[];
}>;

export type FranchiseSeasonSource = Readonly<{
  historicalSeasonResultKey: string | null;
  ownerSeasonKeys: readonly string[];
  canonicalMatchupKeys: readonly string[];
  source: "approved-history-engines";
}>;

export type FranchiseSeasonCoverage = Readonly<{
  seasonResult: "available" | "not-yet-available" | "inactive";
  franchiseIdentity: "resolved";
  ownership: "resolved" | "partial" | "not-applicable";
  historicalName: "available" | "not-available";
  matchupSource:
    | "available"
    | "available-no-completed-games"
    | "unavailable-no-source";
  completedMatchups: number;
}>;

export type FranchiseSeasonSummary = Readonly<{
  franchiseSeasonKey: string;
  franchiseId: string;
  season: number;
  canonicalDisplayName: string;
  historicalTeamName: string | null;
  ownerIds: readonly string[];
  primaryOwnerIds: readonly string[];
  coOwnerIds: readonly string[];
  ownershipRoles: readonly FranchiseSeasonOwnerRole[];
  status: FranchiseHistoryStatus;
  finalPlacement: number | null;
  teamCount: 10 | 12 | null;
  isPlatformChampion: boolean;
  isPlatformRunnerUp: boolean;
  isHistoricalChampion: boolean;
  historicalChampionshipType: "sole" | "co-champion" | null;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  championshipNote: string | null;
  matchupRecords: FranchiseMatchupRecordSplits;
  source: FranchiseSeasonSource;
  coverage: FranchiseSeasonCoverage;
}>;

export type FranchisePlacementSummary = Readonly<{
  platformChampionships: number;
  historicalChampionships: number;
  runnerUpFinishes: number;
  thirdPlaceFinishes: number;
  podiums: number;
  lastPlaceFinishes: number;
  bestFinish: number | null;
  worstFinish: number | null;
  averageFinish: number | null;
}>;

export type FranchiseCareerCoverage = Readonly<{
  seasonSummaries: number;
  seasonsWithResult: number;
  seasonsWithoutResult: number;
  seasonsWithoutMatchupSource: number;
  sourceAvailableNoGameSeasons: number;
  completedMatchups: number;
}>;

export type FranchiseHistoryLineage = Readonly<{
  historicalSeasonResultKeys: readonly string[];
  ownerSeasonKeys: readonly string[];
  canonicalMatchupKeys: readonly string[];
  ownershipTenureIds: readonly string[];
  source: "franchise-history-builder";
}>;

export type FranchiseCareerSummary = Readonly<{
  summaryKey: string;
  summaryType: "career";
  franchiseId: string;
  franchiseSlug: string;
  currentDisplayName: string;
  status: FranchiseHistoryStatus;
  firstSeason: number | null;
  latestSeason: number | null;
  seasonsActive: number;
  seasonsInactive: number;
  activeSeasons: readonly number[];
  inactiveSeasons: readonly number[];
  currentOwnerIds: readonly string[];
  formerOwnerIds: readonly string[];
  placements: FranchisePlacementSummary;
  matchupRecords: FranchiseMatchupRecordSplits;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  firstMatchupSeason: number | null;
  latestMatchupSeason: number | null;
  seasonSummaryKeys: readonly string[];
  ownershipEraKeys: readonly string[];
  nameEraKeys: readonly string[];
  timelineEventKeys: readonly string[];
  lineage: FranchiseHistoryLineage;
  coverage: FranchiseCareerCoverage;
}>;

export type FranchiseOwnershipEra = Readonly<{
  franchiseEraKey: string;
  franchiseId: string;
  startSeason: number;
  endSeason: number | null;
  ownerIds: readonly string[];
  primaryOwnerIds: readonly string[];
  coOwnerIds: readonly string[];
  ownershipType: "solo" | "co-owned";
  isCurrent: boolean;
  ownerTenureIds: readonly string[];
  franchiseSeasonKeys: readonly string[];
  source: "owner-season-history-and-identity-tenure";
  notes: readonly string[];
}>;

export type FranchiseNameEra = Readonly<{
  franchiseNameEraKey: string;
  franchiseId: string;
  historicalName: string;
  startSeason: number;
  endSeason: number;
  franchiseSeasonKeys: readonly string[];
  sourceResultKeys: readonly string[];
  timelineVisibility: "primary" | "complete-history-only";
  source: "historical-season-results";
  confidence: "source-observed-commissioner-mapped";
  notes: readonly string[];
}>;

export type FranchiseTimelineEventType =
  | "founded"
  | "meaningful-rebrand"
  | "ownership-change"
  | "co-owner-joined"
  | "co-owner-left"
  | "inactive"
  | "returned"
  | "platform-champion"
  | "historical-champion"
  | "historical-co-champion"
  | "runner-up"
  | "first-podium"
  | "first-last-place"
  | "retired"
  | "dormant"
  | "successor-established";

export type FranchiseTimelineEvent = Readonly<{
  eventKey: string;
  franchiseId: string;
  season: number;
  eventType: FranchiseTimelineEventType;
  title: string;
  detail: string | null;
  ownerIds: readonly string[];
  sourceKey: string;
  source: "franchise-history-builder" | "commissioner-approved";
}>;

export type FranchiseSuccession = Readonly<{
  relationshipKey: string;
  predecessorFranchiseId: string;
  successorFranchiseId: string;
  effectiveSeason: number;
  source: "commissioner-approved";
  notes: readonly string[];
}>;

export type UnresolvedFranchiseHistory = Readonly<{
  unresolvedHistoryKey: string;
  historicalSeasonResultKey: string;
  season: number;
  finalPlacement: number;
  ownerIds: readonly string[];
  rawOwnerLabel: string;
  rawTeamName: string | null;
  reason: "unresolved-franchise";
}>;

export type UnresolvedFranchiseMatchupSide = Readonly<{
  matchupKey: string;
  season: number;
  side: "home" | "away" | "contest";
  franchiseId: string | null;
  reason: "missing-franchise" | "unknown-franchise" | "same-franchise-sides" | "missing-score";
}>;

export type FranchiseHistoryDuplicateKeys = Readonly<{
  franchiseIds: readonly string[];
  historicalSeasonResultKeys: readonly string[];
  canonicalMatchupKeys: readonly string[];
  franchiseCareerKeys: readonly string[];
  franchiseSeasonKeys: readonly string[];
  ownershipEraKeys: readonly string[];
  nameEraKeys: readonly string[];
  timelineEventKeys: readonly string[];
}>;

export type FranchiseHistoryCoverage = Readonly<{
  canonicalFranchises: number;
  activeFranchises: number;
  dormantFranchises: number;
  retiredFranchises: number;
  physicalSeasonResultsRead: number;
  physicalSeasonResultsConsumed: number;
  unresolvedSeasonResults: number;
  franchiseSeasonSummaries: number;
  franchiseSeasonsWithResult: number;
  inactiveFranchiseSeasons: number;
  currentFranchiseSeasonsWithoutResult: number;
  ownershipEras: number;
  nameEras: number;
  primaryTimelineNameEras: number;
  timelineEvents: number;
  rosterMappingsRead: number;
  canonicalSourceSlots: number;
  completedPhysicalContests: number;
  completedPhysicalContestsConsumed: number;
  franchiseSideConsumptions: number;
  unresolvedMatchupSides: readonly UnresolvedFranchiseMatchupSide[];
  unresolvedFranchiseHistories: readonly UnresolvedFranchiseHistory[];
  duplicateKeys: FranchiseHistoryDuplicateKeys;
  reconciliationFailures: readonly string[];
}>;

export type FranchiseHistory = Readonly<{
  franchiseId: string;
  career: FranchiseCareerSummary;
  seasons: readonly FranchiseSeasonSummary[];
  ownershipEras: readonly FranchiseOwnershipEra[];
  nameEras: readonly FranchiseNameEra[];
  timeline: readonly FranchiseTimelineEvent[];
}>;

export type FranchiseHistoryBuildInput = Readonly<{
  franchises: readonly Franchise[];
  ownershipTenures: readonly OwnershipTenure[];
  historicalSeasonResults: readonly HistoricalSeasonResult[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
  canonicalMatchups: readonly CanonicalFranchiseMatchup[];
  franchiseRosterMappings: readonly FranchiseRosterMapping[];
  statusOverrides: Readonly<Record<string, FranchiseHistoryStatus>>;
  timelineWorthyNameEraKeys?: readonly string[];
  successorRelationships?: readonly FranchiseSuccession[];
}>;

export type FranchiseHistoryBuildResult = Readonly<{
  histories: readonly FranchiseHistory[];
  coverage: FranchiseHistoryCoverage;
}>;

type MutableRecord = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

type MutableSplits = Record<keyof FranchiseMatchupRecordSplits, MutableRecord>;

type SeasonDraft = Omit<
  FranchiseSeasonSummary,
  "matchupRecords" | "source" | "coverage"
> & {
  ownerSeasonKeys: string[];
  historicalSeasonResultKey: string | null;
  matchupRecords: MutableSplits;
  canonicalMatchupKeys: string[];
  matchupSource: FranchiseSeasonCoverage["matchupSource"];
  ownershipCoverage: FranchiseSeasonCoverage["ownership"];
  seasonResultCoverage: FranchiseSeasonCoverage["seasonResult"];
};

const COMPETITIVE_TYPES = new Set<CanonicalMatchupType>([
  "regular",
  "championship-playoff",
  "third-place",
  "placement",
  "consolation",
  "toilet-bowl",
]);

let cachedBuildResult: FranchiseHistoryBuildResult | null = null;

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach((child) => deepFreeze(child));
  return Object.freeze(value);
}

function cloneFrozen<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates].sort();
}

function emptyMutableRecord(): MutableRecord {
  return { games: 0, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 };
}

function emptyMutableSplits(): MutableSplits {
  return {
    overall: emptyMutableRecord(),
    regularSeason: emptyMutableRecord(),
    championshipPlayoff: emptyMutableRecord(),
    championshipGames: emptyMutableRecord(),
    thirdPlace: emptyMutableRecord(),
    placement: emptyMutableRecord(),
    consolation: emptyMutableRecord(),
    toiletBowl: emptyMutableRecord(),
  };
}

function finalizeRecord(record: MutableRecord): FranchiseMatchupRecord {
  return {
    ...record,
    winningPercentage:
      record.games === 0
        ? null
        : (record.wins + 0.5 * record.ties) / record.games,
    pointDifferential: record.pointsFor - record.pointsAgainst,
  };
}

function finalizeSplits(splits: MutableSplits): FranchiseMatchupRecordSplits {
  return {
    overall: finalizeRecord(splits.overall),
    regularSeason: finalizeRecord(splits.regularSeason),
    championshipPlayoff: finalizeRecord(splits.championshipPlayoff),
    championshipGames: finalizeRecord(splits.championshipGames),
    thirdPlace: finalizeRecord(splits.thirdPlace),
    placement: finalizeRecord(splits.placement),
    consolation: finalizeRecord(splits.consolation),
    toiletBowl: finalizeRecord(splits.toiletBowl),
  };
}

function addGame(
  record: MutableRecord,
  pointsFor: number,
  pointsAgainst: number
) {
  record.games += 1;
  record.pointsFor += pointsFor;
  record.pointsAgainst += pointsAgainst;
  if (pointsFor > pointsAgainst) record.wins += 1;
  else if (pointsFor < pointsAgainst) record.losses += 1;
  else record.ties += 1;
}

function addMatchupToSplits(
  splits: MutableSplits,
  matchup: CanonicalFranchiseMatchup,
  pointsFor: number,
  pointsAgainst: number
) {
  if (matchup.matchupType === "regular") {
    addGame(splits.overall, pointsFor, pointsAgainst);
    addGame(splits.regularSeason, pointsFor, pointsAgainst);
    return;
  }
  if (matchup.matchupType === "championship-playoff") {
    addGame(splits.overall, pointsFor, pointsAgainst);
    addGame(splits.championshipPlayoff, pointsFor, pointsAgainst);
    if (matchup.isChampionshipGame) {
      addGame(splits.championshipGames, pointsFor, pointsAgainst);
    }
    return;
  }
  if (matchup.matchupType === "third-place") {
    addGame(splits.thirdPlace, pointsFor, pointsAgainst);
  } else if (matchup.matchupType === "placement") {
    addGame(splits.placement, pointsFor, pointsAgainst);
  } else if (matchup.matchupType === "consolation") {
    addGame(splits.consolation, pointsFor, pointsAgainst);
  } else if (matchup.matchupType === "toilet-bowl") {
    addGame(splits.toiletBowl, pointsFor, pointsAgainst);
  }
}

function mergeMutableSplits(target: MutableSplits, source: FranchiseMatchupRecordSplits) {
  (Object.keys(target) as Array<keyof MutableSplits>).forEach((key) => {
    target[key].games += source[key].games;
    target[key].wins += source[key].wins;
    target[key].losses += source[key].losses;
    target[key].ties += source[key].ties;
    target[key].pointsFor += source[key].pointsFor;
    target[key].pointsAgainst += source[key].pointsAgainst;
  });
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function seasonKey(franchiseId: string, season: number) {
  return `franchise-season:${season}:${franchiseId}`;
}

function getStatus(
  franchise: Franchise,
  overrides: Readonly<Record<string, FranchiseHistoryStatus>>
) {
  return overrides[franchise.id] ?? franchise.status;
}

function buildOwnerRoles(
  result: HistoricalSeasonResult | null,
  rows: readonly OwnerSeasonHistoryRecord[]
) {
  const expectedOwnerIds = result
    ? result.ownerIds
    : [...new Set(rows.flatMap((row) => (row.ownerId ? [row.ownerId] : [])))];

  return [...expectedOwnerIds]
    .sort()
    .map((ownerId): FranchiseSeasonOwnerRole => {
      const ownerRows = rows.filter((row) => row.ownerId === ownerId);
      const first = ownerRows[0];
      return {
        ownerId,
        role: first?.ownershipRole ?? null,
        isPrimaryOwner: first?.isPrimaryOwner === true,
        isCoOwner: first?.isCoOwner === true,
        ownerSeasonKeys: ownerRows.map((row) => row.ownerSeasonKey).sort(),
      };
    });
}

function ownerSignature(season: Pick<FranchiseSeasonSummary, "ownershipRoles">) {
  return season.ownershipRoles
    .map(
      (owner) =>
        `${owner.ownerId}:${owner.role ?? "unknown"}:${owner.isPrimaryOwner ? 1 : 0}:${owner.isCoOwner ? 1 : 0}`
    )
    .sort()
    .join("|");
}

function buildOwnershipEras(
  franchiseId: string,
  seasons: readonly FranchiseSeasonSummary[],
  tenures: readonly OwnershipTenure[],
  currentSeason: number,
  status: FranchiseHistoryStatus
) {
  const participating = seasons
    .filter((season) => season.coverage.seasonResult !== "inactive")
    .sort((a, b) => a.season - b.season);
  const groups: FranchiseSeasonSummary[][] = [];

  participating.forEach((season) => {
    const previousGroup = groups.at(-1);
    const previous = previousGroup?.at(-1);
    if (
      previous &&
      season.season === previous.season + 1 &&
      ownerSignature(season) === ownerSignature(previous)
    ) {
      previousGroup?.push(season);
    } else {
      groups.push([season]);
    }
  });

  return groups.map((group): FranchiseOwnershipEra => {
    const first = group[0];
    const last = group[group.length - 1];
    const ownerIds = [...first.ownerIds].sort();
    const isCurrent =
      status === "active" && last.season === currentSeason;
    const overlappingTenures = tenures.filter(
      (tenure) =>
        tenure.franchiseId === franchiseId &&
        ownerIds.includes(tenure.ownerId) &&
        tenure.startSeason <= last.season &&
        (tenure.endSeason === undefined || tenure.endSeason >= first.season)
    );
    return {
      franchiseEraKey: `franchise-ownership-era:${franchiseId}:${first.season}`,
      franchiseId,
      startSeason: first.season,
      endSeason: isCurrent ? null : last.season,
      ownerIds,
      primaryOwnerIds: [...first.primaryOwnerIds],
      coOwnerIds: [...first.coOwnerIds],
      ownershipType: ownerIds.length > 1 ? "co-owned" : "solo",
      isCurrent,
      ownerTenureIds: overlappingTenures.map((tenure) => tenure.id).sort(),
      franchiseSeasonKeys: group.map((season) => season.franchiseSeasonKey),
      source: "owner-season-history-and-identity-tenure",
      notes: overlappingTenures.flatMap((tenure) => tenure.notes ?? []),
    };
  });
}

function buildNameEras(
  franchiseId: string,
  seasons: readonly FranchiseSeasonSummary[],
  explicitTimelineKeys: ReadonlySet<string>
) {
  const namedSeasons = seasons
    .filter(
      (season): season is FranchiseSeasonSummary & { historicalTeamName: string } =>
        season.historicalTeamName !== null
    )
    .sort((a, b) => a.season - b.season);
  const groups: Array<typeof namedSeasons> = [];

  namedSeasons.forEach((season) => {
    const previousGroup = groups.at(-1);
    const previous = previousGroup?.at(-1);
    if (
      previous &&
      season.season === previous.season + 1 &&
      normalizeName(season.historicalTeamName) ===
        normalizeName(previous.historicalTeamName)
    ) {
      previousGroup?.push(season);
    } else {
      groups.push([season]);
    }
  });

  return groups.map((group): FranchiseNameEra => {
    const first = group[0];
    const last = group[group.length - 1];
    const key = `franchise-name-era:${franchiseId}:${first.season}`;
    const sustained = group.length >= 2;
    return {
      franchiseNameEraKey: key,
      franchiseId,
      historicalName: first.historicalTeamName,
      startSeason: first.season,
      endSeason: last.season,
      franchiseSeasonKeys: group.map((season) => season.franchiseSeasonKey),
      sourceResultKeys: group.flatMap((season) =>
        season.source.historicalSeasonResultKey
          ? [season.source.historicalSeasonResultKey]
          : []
      ),
      timelineVisibility:
        sustained || explicitTimelineKeys.has(key)
          ? "primary"
          : "complete-history-only",
      source: "historical-season-results",
      confidence: "source-observed-commissioner-mapped",
      notes: sustained
        ? ["Sustained for at least two consecutive sourced seasons."]
        : ["Preserved in complete name history without automatic timeline promotion."],
    };
  });
}

function timelineEvent(
  franchiseId: string,
  season: number,
  eventType: FranchiseTimelineEventType,
  sourceKey: string,
  title: string,
  detail: string | null,
  ownerIds: readonly string[] = [],
  source: FranchiseTimelineEvent["source"] = "franchise-history-builder"
): FranchiseTimelineEvent {
  return {
    eventKey: `franchise-event:${franchiseId}:${season}:${eventType}:${sourceKey}`,
    franchiseId,
    season,
    eventType,
    title,
    detail,
    ownerIds: [...ownerIds].sort(),
    sourceKey,
    source,
  };
}

function buildTimeline(
  franchise: Franchise,
  status: FranchiseHistoryStatus,
  seasons: readonly FranchiseSeasonSummary[],
  eras: readonly FranchiseOwnershipEra[],
  nameEras: readonly FranchiseNameEra[],
  successions: readonly FranchiseSuccession[]
) {
  const events: FranchiseTimelineEvent[] = [];
  const activeSeasons = seasons.filter(
    (season) => season.coverage.seasonResult !== "inactive"
  );
  const first = activeSeasons[0];
  if (first) {
    events.push(
      timelineEvent(
        franchise.id,
        first.season,
        "founded",
        first.franchiseSeasonKey,
        `${franchise.currentTeamName} enters River City`,
        null,
        first.ownerIds
      )
    );
  }

  seasons
    .filter((season) => season.coverage.seasonResult === "inactive")
    .forEach((season, index, inactive) => {
      if (!activeSeasons.some((activeSeason) => activeSeason.season > season.season)) {
        return;
      }
      if (index > 0 && inactive[index - 1].season === season.season - 1) return;
      events.push(
        timelineEvent(
          franchise.id,
          season.season,
          "inactive",
          season.franchiseSeasonKey,
          "Franchise inactive",
          "No approved franchise-season result exists for this season."
        )
      );
    });

  eras.forEach((era, index) => {
    if (index === 0) return;
    const previous = eras[index - 1];
    if ((previous.endSeason ?? previous.startSeason) < era.startSeason - 1) {
      events.push(
        timelineEvent(
          franchise.id,
          era.startSeason,
          "returned",
          era.franchiseEraKey,
          "Franchise returned",
          null,
          era.ownerIds
        )
      );
    }
    const joined = era.ownerIds.filter((ownerId) => !previous.ownerIds.includes(ownerId));
    const left = previous.ownerIds.filter((ownerId) => !era.ownerIds.includes(ownerId));
    const eventType: FranchiseTimelineEventType =
      joined.length > 0 && left.length === 0
        ? "co-owner-joined"
        : left.length > 0 && joined.length === 0
          ? "co-owner-left"
          : "ownership-change";
    events.push(
      timelineEvent(
        franchise.id,
        era.startSeason,
        eventType,
        era.franchiseEraKey,
        eventType === "co-owner-joined"
          ? "Co-owner joined"
          : eventType === "co-owner-left"
            ? "Co-owner left"
            : "Ownership changed",
        null,
        era.ownerIds
      )
    );
  });

  nameEras.forEach((era, index) => {
    if (index === 0 || era.timelineVisibility !== "primary") return;
    if (
      nameEras
        .slice(0, index)
        .some(
          (previous) =>
            normalizeName(previous.historicalName) ===
            normalizeName(era.historicalName)
        )
    ) {
      return;
    }
    events.push(
      timelineEvent(
        franchise.id,
        era.startSeason,
        "meaningful-rebrand",
        era.franchiseNameEraKey,
        `Became ${era.historicalName}`,
        null
      )
    );
  });

  const resultSeasons = seasons.filter((season) => season.finalPlacement !== null);
  const firstPodiumSeason = resultSeasons.find((season) => season.isPodium)?.season;
  const firstLastPlaceSeason = resultSeasons.find((season) => season.isLastPlace)?.season;
  resultSeasons.forEach((season) => {
    const sourceKey = season.source.historicalSeasonResultKey as string;
    if (season.isPlatformChampion) {
      events.push(
        timelineEvent(franchise.id, season.season, "platform-champion", sourceKey, "Platform champion", null, season.ownerIds)
      );
    }
    if (season.historicalChampionshipType === "co-champion") {
      events.push(
        timelineEvent(franchise.id, season.season, "historical-co-champion", sourceKey, "Historical co-champion", season.championshipNote, season.ownerIds)
      );
    } else if (season.isHistoricalChampion && !season.isPlatformChampion) {
      events.push(
        timelineEvent(franchise.id, season.season, "historical-champion", sourceKey, "Historical champion", season.championshipNote, season.ownerIds)
      );
    }
    if (season.isPlatformRunnerUp) {
      events.push(
        timelineEvent(franchise.id, season.season, "runner-up", sourceKey, "Runner-up", null, season.ownerIds)
      );
    }
    if (season.isPodium && season.season === firstPodiumSeason) {
      events.push(
        timelineEvent(franchise.id, season.season, "first-podium", sourceKey, "First podium", null, season.ownerIds)
      );
    }
    if (season.isLastPlace && season.season === firstLastPlaceSeason) {
      events.push(
        timelineEvent(franchise.id, season.season, "first-last-place", sourceKey, "First last-place result", null, season.ownerIds)
      );
    }
  });

  const latestActive = activeSeasons.at(-1);
  if (latestActive && status !== "active") {
    const eventSeason = status === "dormant" ? latestActive.season + 1 : latestActive.season;
    events.push(
      timelineEvent(
        franchise.id,
        eventSeason,
        status,
        `franchise-career:${franchise.id}`,
        status === "dormant" ? "Franchise became dormant" : "Franchise retired",
        null
      )
    );
  }

  successions
    .filter(
      (relationship) =>
        relationship.predecessorFranchiseId === franchise.id ||
        relationship.successorFranchiseId === franchise.id
    )
    .forEach((relationship) => {
      events.push(
        timelineEvent(
          franchise.id,
          relationship.effectiveSeason,
          "successor-established",
          relationship.relationshipKey,
          "Commissioner-approved franchise succession",
          relationship.notes.join(" ") || null,
          [],
          "commissioner-approved"
        )
      );
    });

  return events.sort(
    (a, b) =>
      a.season - b.season ||
      a.eventType.localeCompare(b.eventType) ||
      a.eventKey.localeCompare(b.eventKey)
  );
}

function placementSummary(seasons: readonly FranchiseSeasonSummary[]): FranchisePlacementSummary {
  const results = seasons.filter(
    (season): season is FranchiseSeasonSummary & { finalPlacement: number } =>
      season.finalPlacement !== null
  );
  const placements = results.map((season) => season.finalPlacement);
  return {
    platformChampionships: results.filter((season) => season.isPlatformChampion).length,
    historicalChampionships: results.filter((season) => season.isHistoricalChampion).length,
    runnerUpFinishes: results.filter((season) => season.isPlatformRunnerUp).length,
    thirdPlaceFinishes: results.filter((season) => season.isThirdPlace).length,
    podiums: results.filter((season) => season.isPodium).length,
    lastPlaceFinishes: results.filter((season) => season.isLastPlace).length,
    bestFinish: placements.length > 0 ? Math.min(...placements) : null,
    worstFinish: placements.length > 0 ? Math.max(...placements) : null,
    averageFinish:
      placements.length > 0
        ? placements.reduce((sum, placement) => sum + placement, 0) /
          placements.length
        : null,
  };
}

function requireBuildResult() {
  if (!cachedBuildResult) {
    throw new Error(
      "Franchise History is not initialized. Call buildFranchiseHistories() first."
    );
  }
  return cachedBuildResult;
}

export function buildFranchiseHistories(
  input: FranchiseHistoryBuildInput
): FranchiseHistoryBuildResult {
  const duplicateFranchiseIds = duplicateValues(input.franchises.map((franchise) => franchise.id));
  const duplicateResultKeys = duplicateValues(
    input.historicalSeasonResults.map((result) => result.seasonResultKey)
  );
  if (duplicateFranchiseIds.length > 0 || duplicateResultKeys.length > 0) {
    throw new Error(
      `Invalid Franchise History input: duplicate IDs (${[
        ...duplicateFranchiseIds,
        ...duplicateResultKeys,
      ].join(", ")}).`
    );
  }

  const franchiseById = new Map(
    input.franchises.map((franchise) => [franchise.id, franchise])
  );
  const currentSeason = Math.max(
    ...input.ownerSeasonRecords.map((record) => record.season),
    ...input.historicalSeasonResults.map((result) => result.season)
  );
  const historicalChampionCounts = new Map<number, number>();
  input.historicalSeasonResults.forEach((result) => {
    if (result.isHistoricalChampion) {
      historicalChampionCounts.set(
        result.season,
        (historicalChampionCounts.get(result.season) ?? 0) + 1
      );
    }
  });

  const unresolvedHistories: UnresolvedFranchiseHistory[] = [];
  const draftsByKey = new Map<string, SeasonDraft>();
  const createDraft = ({
    franchise,
    season,
    result,
    ownerRows,
    status,
    resultCoverage,
  }: {
    franchise: Franchise;
    season: number;
    result: HistoricalSeasonResult | null;
    ownerRows: readonly OwnerSeasonHistoryRecord[];
    status: FranchiseHistoryStatus;
    resultCoverage: FranchiseSeasonCoverage["seasonResult"];
  }) => {
    const roles = buildOwnerRoles(result, ownerRows);
    const key = seasonKey(franchise.id, season);
    const ownerSeasonKeys = ownerRows.map((row) => row.ownerSeasonKey).sort();
    const expectedOwners = result?.ownerIds.length ?? roles.length;
    draftsByKey.set(key, {
      franchiseSeasonKey: key,
      franchiseId: franchise.id,
      season,
      canonicalDisplayName: franchise.currentTeamName,
      historicalTeamName: result?.rawTeamName ?? null,
      ownerIds: roles.map((role) => role.ownerId),
      primaryOwnerIds: roles.filter((role) => role.isPrimaryOwner).map((role) => role.ownerId),
      coOwnerIds: roles.filter((role) => role.isCoOwner).map((role) => role.ownerId),
      ownershipRoles: roles,
      status,
      finalPlacement: result?.finalPlacement ?? null,
      teamCount: result?.teamCount ?? null,
      isPlatformChampion: result?.isPlatformChampion ?? false,
      isPlatformRunnerUp: result?.isPlatformRunnerUp ?? false,
      isHistoricalChampion: result?.isHistoricalChampion ?? false,
      historicalChampionshipType: result?.isHistoricalChampion
        ? (historicalChampionCounts.get(season) ?? 0) > 1
          ? "co-champion"
          : "sole"
        : null,
      isThirdPlace: result?.isThirdPlace ?? false,
      isPodium: result?.isPodium ?? false,
      isLastPlace: result?.isLastPlace ?? false,
      championshipNote: result?.championshipNote ?? null,
      ownerSeasonKeys,
      historicalSeasonResultKey: result?.seasonResultKey ?? null,
      matchupRecords: emptyMutableSplits(),
      canonicalMatchupKeys: [],
      matchupSource: "unavailable-no-source",
      ownershipCoverage:
        expectedOwners === 0
          ? "not-applicable"
          : roles.every((role) => role.role !== null) && roles.length === expectedOwners
            ? "resolved"
            : "partial",
      seasonResultCoverage: resultCoverage,
    });
  };

  input.historicalSeasonResults.forEach((result) => {
    if (!result.franchiseId || !franchiseById.has(result.franchiseId)) {
      unresolvedHistories.push({
        unresolvedHistoryKey: `unresolved-franchise-history:${result.seasonResultKey}`,
        historicalSeasonResultKey: result.seasonResultKey,
        season: result.season,
        finalPlacement: result.finalPlacement,
        ownerIds: [...result.ownerIds],
        rawOwnerLabel: result.rawOwnerLabel,
        rawTeamName: result.rawTeamName,
        reason: "unresolved-franchise",
      });
      return;
    }
    const franchise = franchiseById.get(result.franchiseId) as Franchise;
    const ownerRows = input.ownerSeasonRecords.filter(
      (record) =>
        record.season === result.season &&
        record.franchiseId === result.franchiseId &&
        (record.historicalSeasonResultKey === result.seasonResultKey ||
          result.ownerIds.includes(record.ownerId ?? ""))
    );
    createDraft({
      franchise,
      season: result.season,
      result,
      ownerRows,
      status: "active",
      resultCoverage: "available",
    });
  });

  const currentRowsByFranchise = new Map<string, OwnerSeasonHistoryRecord[]>();
  input.ownerSeasonRecords
    .filter(
      (record) =>
        record.season === currentSeason &&
        record.franchiseId !== null &&
        record.finalPlacement === null
    )
    .forEach((record) => {
      const rows = currentRowsByFranchise.get(record.franchiseId as string) ?? [];
      rows.push(record);
      currentRowsByFranchise.set(record.franchiseId as string, rows);
    });
  currentRowsByFranchise.forEach((rows, franchiseId) => {
    const key = seasonKey(franchiseId, currentSeason);
    const franchise = franchiseById.get(franchiseId);
    if (!franchise || draftsByKey.has(key)) return;
    createDraft({
      franchise,
      season: currentSeason,
      result: null,
      ownerRows: rows,
      status: "active",
      resultCoverage: "not-yet-available",
    });
  });

  input.franchises.forEach((franchise) => {
    const status = getStatus(franchise, input.statusOverrides);
    const activeYears = [...draftsByKey.values()]
      .filter((draft) => draft.franchiseId === franchise.id)
      .map((draft) => draft.season)
      .sort((a, b) => a - b);
    if (activeYears.length === 0) return;
    const first = activeYears[0];
    const last = status === "dormant" ? currentSeason : activeYears.at(-1) as number;
    for (let season = first; season <= last; season += 1) {
      const key = seasonKey(franchise.id, season);
      if (draftsByKey.has(key)) continue;
      const hasLaterActiveSeason = activeYears.some((year) => year > season);
      if (!hasLaterActiveSeason && status !== "dormant") continue;
      createDraft({
        franchise,
        season,
        result: null,
        ownerRows: [],
        status: "dormant",
        resultCoverage: "inactive",
      });
    }
  });

  const canonicalSeasons = new Set(input.canonicalMatchups.map((matchup) => matchup.season));
  draftsByKey.forEach((draft) => {
    draft.matchupSource = canonicalSeasons.has(draft.season)
      ? "available-no-completed-games"
      : "unavailable-no-source";
  });

  const duplicateCanonicalMatchupKeys = duplicateValues(
    input.canonicalMatchups.map((matchup) => matchup.matchupKey)
  );
  const canonicalMatchups = [...input.canonicalMatchups]
    .sort((a, b) => a.matchupKey.localeCompare(b.matchupKey))
    .filter(
      (matchup, index, rows) =>
        rows.findIndex((candidate) => candidate.matchupKey === matchup.matchupKey) === index
    );
  const unresolvedMatchupSides: UnresolvedFranchiseMatchupSide[] = [];
  let completedPhysicalContests = 0;
  let completedPhysicalContestsConsumed = 0;
  let franchiseSideConsumptions = 0;

  canonicalMatchups.forEach((matchup) => {
    if (!matchup.isComplete || !COMPETITIVE_TYPES.has(matchup.matchupType)) return;
    completedPhysicalContests += 1;
    if (
      matchup.homeFranchiseId !== null &&
      matchup.homeFranchiseId === matchup.awayFranchiseId
    ) {
      unresolvedMatchupSides.push({
        matchupKey: matchup.matchupKey,
        season: matchup.season,
        side: "contest",
        franchiseId: matchup.homeFranchiseId,
        reason: "same-franchise-sides",
      });
      return;
    }
    const sides = [
      { side: "home" as const, franchiseId: matchup.homeFranchiseId, pointsFor: matchup.homeScore, pointsAgainst: matchup.awayScore },
      { side: "away" as const, franchiseId: matchup.awayFranchiseId, pointsFor: matchup.awayScore, pointsAgainst: matchup.homeScore },
    ];
    let valid = true;
    sides.forEach((side) => {
      if (!side.franchiseId) {
        unresolvedMatchupSides.push({ matchupKey: matchup.matchupKey, season: matchup.season, side: side.side, franchiseId: null, reason: "missing-franchise" });
        valid = false;
      } else if (!franchiseById.has(side.franchiseId)) {
        unresolvedMatchupSides.push({ matchupKey: matchup.matchupKey, season: matchup.season, side: side.side, franchiseId: side.franchiseId, reason: "unknown-franchise" });
        valid = false;
      }
      if (side.pointsFor === null || side.pointsAgainst === null) {
        unresolvedMatchupSides.push({ matchupKey: matchup.matchupKey, season: matchup.season, side: side.side, franchiseId: side.franchiseId, reason: "missing-score" });
        valid = false;
      }
    });
    if (!valid) return;

    completedPhysicalContestsConsumed += 1;
    sides.forEach((side) => {
      const key = seasonKey(side.franchiseId as string, matchup.season);
      let draft = draftsByKey.get(key);
      if (!draft) {
        const franchise = franchiseById.get(side.franchiseId as string) as Franchise;
        const ownerRows = input.ownerSeasonRecords.filter(
          (record) =>
            record.season === matchup.season && record.franchiseId === side.franchiseId
        );
        createDraft({
          franchise,
          season: matchup.season,
          result: null,
          ownerRows,
          status: "active",
          resultCoverage: "not-yet-available",
        });
        draft = draftsByKey.get(key) as SeasonDraft;
      }
      addMatchupToSplits(
        draft.matchupRecords,
        matchup,
        side.pointsFor as number,
        side.pointsAgainst as number
      );
      draft.canonicalMatchupKeys.push(matchup.matchupKey);
      draft.matchupSource = "available";
      franchiseSideConsumptions += 1;
    });
  });

  const seasonSummaries = [...draftsByKey.values()]
    .sort((a, b) => a.season - b.season || a.franchiseId.localeCompare(b.franchiseId))
    .map((draft): FranchiseSeasonSummary => ({
      franchiseSeasonKey: draft.franchiseSeasonKey,
      franchiseId: draft.franchiseId,
      season: draft.season,
      canonicalDisplayName: draft.canonicalDisplayName,
      historicalTeamName: draft.historicalTeamName,
      ownerIds: [...draft.ownerIds],
      primaryOwnerIds: [...draft.primaryOwnerIds],
      coOwnerIds: [...draft.coOwnerIds],
      ownershipRoles: draft.ownershipRoles.map((role) => ({ ...role, ownerSeasonKeys: [...role.ownerSeasonKeys] })),
      status: draft.status,
      finalPlacement: draft.finalPlacement,
      teamCount: draft.teamCount,
      isPlatformChampion: draft.isPlatformChampion,
      isPlatformRunnerUp: draft.isPlatformRunnerUp,
      isHistoricalChampion: draft.isHistoricalChampion,
      historicalChampionshipType: draft.historicalChampionshipType,
      isThirdPlace: draft.isThirdPlace,
      isPodium: draft.isPodium,
      isLastPlace: draft.isLastPlace,
      championshipNote: draft.championshipNote,
      matchupRecords: finalizeSplits(draft.matchupRecords),
      source: {
        historicalSeasonResultKey: draft.historicalSeasonResultKey,
        ownerSeasonKeys: [...draft.ownerSeasonKeys],
        canonicalMatchupKeys: [...new Set(draft.canonicalMatchupKeys)].sort(),
        source: "approved-history-engines",
      },
      coverage: {
        seasonResult: draft.seasonResultCoverage,
        franchiseIdentity: "resolved",
        ownership: draft.ownershipCoverage,
        historicalName: draft.historicalTeamName ? "available" : "not-available",
        matchupSource: draft.matchupSource,
        completedMatchups: new Set(draft.canonicalMatchupKeys).size,
      },
    }));

  const explicitTimelineNameKeys = new Set(input.timelineWorthyNameEraKeys ?? []);
  const historiesWithoutCareer = input.franchises
    .map((franchise) => {
      const status = getStatus(franchise, input.statusOverrides);
      const seasons = seasonSummaries.filter((season) => season.franchiseId === franchise.id);
      const eras = buildOwnershipEras(
        franchise.id,
        seasons,
        input.ownershipTenures,
        currentSeason,
        status
      );
      const nameEras = buildNameEras(franchise.id, seasons, explicitTimelineNameKeys);
      const timeline = buildTimeline(
        franchise,
        status,
        seasons,
        eras,
        nameEras,
        input.successorRelationships ?? []
      );
      return { franchise, status, seasons, eras, nameEras, timeline };
    })
    .sort((a, b) => a.franchise.id.localeCompare(b.franchise.id));

  const histories: FranchiseHistory[] = historiesWithoutCareer.map(
    ({ franchise, status, seasons, eras, nameEras, timeline }) => {
      const activeSeasons = seasons.filter(
        (season) => season.coverage.seasonResult !== "inactive"
      );
      const inactiveSeasons = seasons.filter(
        (season) => season.coverage.seasonResult === "inactive"
      );
      const careerMutable = emptyMutableSplits();
      activeSeasons.forEach((season) => mergeMutableSplits(careerMutable, season.matchupRecords));
      const matchupRecords = finalizeSplits(careerMutable);
      const matchupSeasons = activeSeasons.filter(
        (season) => season.coverage.completedMatchups > 0
      );
      const allOwnerIds = [...new Set(eras.flatMap((era) => era.ownerIds))].sort();
      const currentOwnerIds = status === "active" ? [...franchise.activeOwnerIds].sort() : [];
      const historicalResultKeys = activeSeasons.flatMap((season) =>
        season.source.historicalSeasonResultKey
          ? [season.source.historicalSeasonResultKey]
          : []
      );
      const ownerSeasonKeys = activeSeasons.flatMap((season) => season.source.ownerSeasonKeys);
      const canonicalMatchupKeys = [...new Set(activeSeasons.flatMap((season) => season.source.canonicalMatchupKeys))].sort();
      const career: FranchiseCareerSummary = {
        summaryKey: `franchise-career:${franchise.id}`,
        summaryType: "career",
        franchiseId: franchise.id,
        franchiseSlug: franchise.slug,
        currentDisplayName: franchise.currentTeamName,
        status,
        firstSeason: activeSeasons[0]?.season ?? null,
        latestSeason: activeSeasons.at(-1)?.season ?? null,
        seasonsActive: activeSeasons.length,
        seasonsInactive: inactiveSeasons.length,
        activeSeasons: activeSeasons.map((season) => season.season),
        inactiveSeasons: inactiveSeasons.map((season) => season.season),
        currentOwnerIds,
        formerOwnerIds: allOwnerIds.filter((ownerId) => !currentOwnerIds.includes(ownerId)),
        placements: placementSummary(seasons),
        matchupRecords,
        pointsFor: matchupRecords.overall.pointsFor,
        pointsAgainst: matchupRecords.overall.pointsAgainst,
        pointDifferential: matchupRecords.overall.pointDifferential,
        firstMatchupSeason: matchupSeasons[0]?.season ?? null,
        latestMatchupSeason: matchupSeasons.at(-1)?.season ?? null,
        seasonSummaryKeys: seasons.map((season) => season.franchiseSeasonKey),
        ownershipEraKeys: eras.map((era) => era.franchiseEraKey),
        nameEraKeys: nameEras.map((era) => era.franchiseNameEraKey),
        timelineEventKeys: timeline.map((event) => event.eventKey),
        lineage: {
          historicalSeasonResultKeys: historicalResultKeys,
          ownerSeasonKeys,
          canonicalMatchupKeys,
          ownershipTenureIds: eras.flatMap((era) => era.ownerTenureIds),
          source: "franchise-history-builder",
        },
        coverage: {
          seasonSummaries: seasons.length,
          seasonsWithResult: seasons.filter((season) => season.finalPlacement !== null).length,
          seasonsWithoutResult: seasons.filter((season) => season.finalPlacement === null).length,
          seasonsWithoutMatchupSource: seasons.filter((season) => season.coverage.matchupSource === "unavailable-no-source").length,
          sourceAvailableNoGameSeasons: seasons.filter((season) => season.coverage.matchupSource === "available-no-completed-games").length,
          completedMatchups: canonicalMatchupKeys.length,
        },
      };
      return {
        franchiseId: franchise.id,
        career,
        seasons,
        ownershipEras: eras,
        nameEras,
        timeline,
      };
    }
  );

  const allCareers = histories.map((history) => history.career);
  const allSeasons = histories.flatMap((history) => history.seasons);
  const allEras = histories.flatMap((history) => history.ownershipEras);
  const allNameEras = histories.flatMap((history) => history.nameEras);
  const allEvents = histories.flatMap((history) => history.timeline);
  const duplicateKeys: FranchiseHistoryDuplicateKeys = {
    franchiseIds: duplicateFranchiseIds,
    historicalSeasonResultKeys: duplicateResultKeys,
    canonicalMatchupKeys: duplicateCanonicalMatchupKeys,
    franchiseCareerKeys: duplicateValues(allCareers.map((career) => career.summaryKey)),
    franchiseSeasonKeys: duplicateValues(allSeasons.map((season) => season.franchiseSeasonKey)),
    ownershipEraKeys: duplicateValues(allEras.map((era) => era.franchiseEraKey)),
    nameEraKeys: duplicateValues(allNameEras.map((era) => era.franchiseNameEraKey)),
    timelineEventKeys: duplicateValues(allEvents.map((event) => event.eventKey)),
  };
  const reconciliationFailures: string[] = [];
  if (
    input.historicalSeasonResults.length !==
    allSeasons.filter((season) => season.finalPlacement !== null).length +
      unresolvedHistories.length
  ) {
    reconciliationFailures.push("Historical season-result consumption does not reconcile.");
  }
  if (completedPhysicalContests !== completedPhysicalContestsConsumed + new Set(unresolvedMatchupSides.map((side) => side.matchupKey)).size) {
    reconciliationFailures.push("Completed physical-contest consumption does not reconcile.");
  }
  if (franchiseSideConsumptions !== completedPhysicalContestsConsumed * 2) {
    reconciliationFailures.push("Franchise-side matchup consumption does not reconcile.");
  }
  const duplicateOutputKeys = Object.entries(duplicateKeys)
    .filter(([, values]) => values.length > 0)
    .map(([kind]) => kind);
  if (duplicateOutputKeys.length > 0) {
    reconciliationFailures.push(`Duplicate keys detected: ${duplicateOutputKeys.join(", ")}.`);
  }

  const coverage: FranchiseHistoryCoverage = {
    canonicalFranchises: histories.length,
    activeFranchises: histories.filter((history) => history.career.status === "active").length,
    dormantFranchises: histories.filter((history) => history.career.status === "dormant").length,
    retiredFranchises: histories.filter((history) => history.career.status === "retired").length,
    physicalSeasonResultsRead: input.historicalSeasonResults.length,
    physicalSeasonResultsConsumed: allSeasons.filter((season) => season.finalPlacement !== null).length,
    unresolvedSeasonResults: unresolvedHistories.length,
    franchiseSeasonSummaries: allSeasons.length,
    franchiseSeasonsWithResult: allSeasons.filter((season) => season.finalPlacement !== null).length,
    inactiveFranchiseSeasons: allSeasons.filter((season) => season.coverage.seasonResult === "inactive").length,
    currentFranchiseSeasonsWithoutResult: allSeasons.filter((season) => season.season === currentSeason && season.coverage.seasonResult === "not-yet-available").length,
    ownershipEras: allEras.length,
    nameEras: allNameEras.length,
    primaryTimelineNameEras: allNameEras.filter((era) => era.timelineVisibility === "primary").length,
    timelineEvents: allEvents.length,
    rosterMappingsRead: input.franchiseRosterMappings.length,
    canonicalSourceSlots: canonicalMatchups.length,
    completedPhysicalContests,
    completedPhysicalContestsConsumed,
    franchiseSideConsumptions,
    unresolvedMatchupSides,
    unresolvedFranchiseHistories: unresolvedHistories,
    duplicateKeys,
    reconciliationFailures,
  };

  const nextResult = cloneFrozen({ histories, coverage });
  cachedBuildResult = nextResult;
  return cloneFrozen(nextResult);
}

export function getAllFranchiseHistories() {
  return cloneFrozen(requireBuildResult().histories);
}

export function getFranchiseHistory(franchiseId: string) {
  const history = requireBuildResult().histories.find(
    (candidate) => candidate.franchiseId === franchiseId
  );
  return history ? cloneFrozen(history) : null;
}

export function getAllFranchiseCareerSummaries() {
  return cloneFrozen(requireBuildResult().histories.map((history) => history.career));
}

export function getFranchiseCareerSummary(franchiseId: string) {
  return getFranchiseHistory(franchiseId)?.career ?? null;
}

export function getFranchiseSeasonHistory(franchiseId: string, season: number) {
  const history = getFranchiseHistory(franchiseId);
  const summary = history?.seasons.find((candidate) => candidate.season === season);
  return summary ? cloneFrozen(summary) : null;
}

export function getFranchiseSeasonHistories(franchiseId: string) {
  return cloneFrozen(getFranchiseHistory(franchiseId)?.seasons ?? []);
}

export function getFranchiseOwnershipEras(franchiseId: string) {
  return cloneFrozen(getFranchiseHistory(franchiseId)?.ownershipEras ?? []);
}

export function getFranchiseNameEras(franchiseId: string) {
  return cloneFrozen(getFranchiseHistory(franchiseId)?.nameEras ?? []);
}

export function getFranchiseTimeline(franchiseId: string) {
  return cloneFrozen(getFranchiseHistory(franchiseId)?.timeline ?? []);
}

export function getUnresolvedFranchiseHistories() {
  return cloneFrozen(requireBuildResult().coverage.unresolvedFranchiseHistories);
}

export function getFranchiseHistoryCoverage() {
  return cloneFrozen(requireBuildResult().coverage);
}
