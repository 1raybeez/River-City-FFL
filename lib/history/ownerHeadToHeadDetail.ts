import type {
  CanonicalBracketType,
  CanonicalFranchiseMatchup,
  CanonicalMatchupSource,
  CanonicalMatchupType,
} from "@/lib/history/canonicalMatchupHistory";
import type {
  OwnerMatchupOpponent,
  OwnerMatchupProjection,
  OwnerMatchupProjectionCoverage,
  OwnerMatchupResult,
} from "@/lib/history/ownerMatchupProjection";
import type {
  OwnerCareerMatchupSummary,
  OwnerMatchupRecord,
  OwnerMatchupRecordSplits,
  OwnerMatchupReference,
  OwnerOpponentMatchupSummary,
  OwnerSeasonMatchupSummary,
} from "@/lib/history/ownerMatchupSummary";
import type {
  OwnerProfile,
  OwnershipRole,
} from "@/lib/managers/identityTypes";

export type OwnerHeadToHeadClassification = Exclude<
  CanonicalMatchupType,
  "bye" | "incomplete"
>;

export type OwnerHeadToHeadFilter =
  | "all"
  | "competitive"
  | "regular"
  | "championship-playoff"
  | "third-place"
  | "placement"
  | "toilet-bowl"
  | "consolation"
  | "championship-game";

export type OwnerHeadToHeadCoverageState =
  | "available"
  | "available-no-completed-pair-meetings"
  | "partial-career-coverage"
  | "unavailable-source"
  | "no-approved-tenure-overlap"
  | "not-applicable";

export type OwnerHeadToHeadMeetingScoringPeriod = Readonly<{
  week: number;
  sourceMatchupId: number | null;
  ownerScore: number;
  opponentScore: number;
  isComplete: true;
}>;

export type OwnerHeadToHeadMeeting = Readonly<{
  meetingKey: string;
  relationshipKey: string;
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  opponentSummaryKey: string;
  season: number;
  leagueId: string;
  week: number;
  classification: OwnerHeadToHeadClassification;
  bracketType: CanonicalBracketType;
  round: number | null;
  bracketPlacement: number | null;
  isChampionshipGame: boolean;
  ownerId: string;
  opponentOwnerId: string;
  ownerSeasonKey: string;
  ownerFranchiseId: string;
  opponentFranchiseId: string;
  ownerRole: OwnershipRole;
  ownerTeammates: readonly string[];
  opponentOwners: readonly OwnerMatchupOpponent[];
  ownerScore: number;
  opponentScore: number;
  pointDifferential: number;
  result: OwnerMatchupResult;
  winnerOwnerIds: readonly string[];
  loserOwnerIds: readonly string[];
  scoringPeriods: readonly OwnerHeadToHeadMeetingScoringPeriod[];
  notable: Readonly<{
    isClosestMeeting: boolean;
    isLargestWin: boolean;
    isLargestLoss: boolean;
  }>;
  source: Readonly<{
    projectionSource: "owner-matchup-projection";
    canonicalSource: CanonicalMatchupSource;
    correctionVersion: number;
  }>;
}>;

export type OwnerHeadToHeadCoverage = Readonly<{
  state: OwnerHeadToHeadCoverageState;
  ownerId: string;
  opponentOwnerId: string;
  isPartialCareerCoverage: boolean;
  approvedOverlapSeasons: readonly number[];
  supportedOverlapSeasons: readonly number[];
  unsupportedOverlapSeasons: readonly number[];
  sourceEnabledNoMeetingSeasons: readonly number[];
  meetingsExpected: number;
  meetingsBuilt: number;
  uniqueCanonicalMeetings: number;
  duplicateMeetingKeys: readonly string[];
  duplicateCanonicalMatchupKeys: readonly string[];
  missingProjectionKeys: readonly string[];
  missingCanonicalMatchupKeys: readonly string[];
  summaryReconciliationFailures: readonly string[];
}>;

export type OwnerHeadToHeadDetail = Readonly<{
  relationshipKey: string;
  ownerId: string;
  opponentOwnerId: string;
  opponentSummaryKey: string | null;
  summary: OwnerOpponentMatchupSummary | null;
  meetingKeysNewestFirst: readonly string[];
  meetingKeysChronological: readonly string[];
  coverage: OwnerHeadToHeadCoverage;
}>;

export type OwnerHeadToHeadBuildCoverage = Readonly<{
  directionalHeadToHeadDetails: number;
  supportedDirectionalRelationships: number;
  coverageOnlyRelationships: number;
  directionalMeetings: number;
  uniquePhysicalCanonicalContestsRepresented: number;
  competitiveMeetingCredits: number;
  secondaryClassificationMeetingCredits: number;
  championshipGameMeetingCredits: number;
  classificationTotals: Readonly<
    Record<OwnerHeadToHeadClassification, number>
  >;
  duplicateRelationshipKeys: readonly string[];
  duplicateMeetingKeys: readonly string[];
  relationshipReconciliationFailures: readonly string[];
  teammateViolations: readonly string[];
  helperAttributionViolations: readonly string[];
}>;

export type OwnerHeadToHeadDetailBuildInput = Readonly<{
  canonicalMatchups: readonly CanonicalFranchiseMatchup[];
  projections: readonly OwnerMatchupProjection[];
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
  careerSummaries: readonly OwnerCareerMatchupSummary[];
  seasonSummaries: readonly OwnerSeasonMatchupSummary[];
  ownerProfiles: readonly Pick<OwnerProfile, "id" | "slug" | "status">[];
  projectionCoverage: OwnerMatchupProjectionCoverage;
}>;

export type OwnerHeadToHeadDetailBuildResult = Readonly<{
  details: readonly OwnerHeadToHeadDetail[];
  meetings: readonly OwnerHeadToHeadMeeting[];
  coverage: OwnerHeadToHeadBuildCoverage;
}>;

const CLASSIFICATIONS: readonly OwnerHeadToHeadClassification[] = [
  "regular",
  "championship-playoff",
  "third-place",
  "consolation",
  "toilet-bowl",
  "placement",
];

let cachedDetails: OwnerHeadToHeadDetail[] | null = null;
let cachedMeetings: OwnerHeadToHeadMeeting[] | null = null;
let cachedCoverageByRelationship: Map<string, OwnerHeadToHeadCoverage> | null =
  null;
let cachedOwnerIdByIdentity: Map<string, string> | null = null;
let cachedBuildCoverage: OwnerHeadToHeadBuildCoverage | null = null;

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)])
    ) as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach((item) => deepFreeze(item));
    Object.freeze(value);
  }
  return value;
}

function immutableClone<T>(value: T): T {
  return deepFreeze(cloneValue(value));
}

function uniqueSortedStrings(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function uniqueSortedNumbers(values: readonly number[]) {
  return [...new Set(values)].sort((first, second) => first - second);
}

function duplicates(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function relationshipKey(ownerId: string, opponentOwnerId: string) {
  return `owner-head-to-head:${ownerId}:vs:${opponentOwnerId}`;
}

function meetingKey(
  ownerId: string,
  opponentOwnerId: string,
  canonicalMatchupKey: string
) {
  return `owner-head-to-head-meeting:${ownerId}:vs:${opponentOwnerId}:matchup:${canonicalMatchupKey}`;
}

function seasonSummaryKey(ownerId: string, season: number) {
  return `${ownerId}:${season}`;
}

function compareNewestFirst(
  first: OwnerHeadToHeadMeeting,
  second: OwnerHeadToHeadMeeting
) {
  return (
    second.season - first.season ||
    second.week - first.week ||
    compareNullableRound(second.round, first.round, true) ||
    first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey) ||
    first.meetingKey.localeCompare(second.meetingKey)
  );
}

function compareChronological(
  first: OwnerHeadToHeadMeeting,
  second: OwnerHeadToHeadMeeting
) {
  return (
    first.season - second.season ||
    first.week - second.week ||
    compareNullableRound(first.round, second.round, false) ||
    first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey) ||
    first.meetingKey.localeCompare(second.meetingKey)
  );
}

function compareNullableRound(
  first: number | null,
  second: number | null,
  nullLast: boolean
) {
  if (first === second) return 0;
  if (first === null) return nullLast ? 1 : -1;
  if (second === null) return nullLast ? -1 : 1;
  return first - second;
}

function compareSummaryChronology(
  first: OwnerHeadToHeadMeeting,
  second: OwnerHeadToHeadMeeting
) {
  return (
    first.season - second.season ||
    first.week - second.week ||
    first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey) ||
    first.ownerMatchupKey.localeCompare(second.ownerMatchupKey)
  );
}

function compensatedSum(values: readonly number[]) {
  let sum = 0;
  let compensation = 0;
  values.forEach((value) => {
    const adjusted = value - compensation;
    const next = sum + adjusted;
    compensation = next - sum - adjusted;
    sum = next;
  });
  return sum;
}

function buildRecord(
  meetings: readonly OwnerHeadToHeadMeeting[]
): OwnerMatchupRecord {
  const ordered = [...meetings].sort((first, second) =>
    first.ownerMatchupKey.localeCompare(second.ownerMatchupKey)
  );
  const games = ordered.length;
  const wins = ordered.filter((meeting) => meeting.result === "win").length;
  const losses = ordered.filter((meeting) => meeting.result === "loss").length;
  const ties = ordered.filter((meeting) => meeting.result === "tie").length;
  const pointsFor = compensatedSum(ordered.map((meeting) => meeting.ownerScore));
  const pointsAgainst = compensatedSum(
    ordered.map((meeting) => meeting.opponentScore)
  );
  return {
    games,
    wins,
    losses,
    ties,
    winningPercentage: games > 0 ? (wins + 0.5 * ties) / games : null,
    pointsFor,
    pointsAgainst,
    pointDifferential: pointsFor - pointsAgainst,
  };
}

function buildRecordSplits(
  meetings: readonly OwnerHeadToHeadMeeting[]
): OwnerMatchupRecordSplits {
  return {
    overall: buildRecord(
      meetings.filter(
        (meeting) =>
          meeting.classification === "regular" ||
          meeting.classification === "championship-playoff"
      )
    ),
    regularSeason: buildRecord(
      meetings.filter((meeting) => meeting.classification === "regular")
    ),
    championshipPlayoff: buildRecord(
      meetings.filter(
        (meeting) => meeting.classification === "championship-playoff"
      )
    ),
    championshipGames: buildRecord(
      meetings.filter(
        (meeting) =>
          meeting.classification === "championship-playoff" &&
          meeting.isChampionshipGame
      )
    ),
    thirdPlace: buildRecord(
      meetings.filter((meeting) => meeting.classification === "third-place")
    ),
    placement: buildRecord(
      meetings.filter((meeting) => meeting.classification === "placement")
    ),
    consolation: buildRecord(
      meetings.filter((meeting) => meeting.classification === "consolation")
    ),
    toiletBowl: buildRecord(
      meetings.filter((meeting) => meeting.classification === "toilet-bowl")
    ),
  };
}

function referenceFor(meeting: OwnerHeadToHeadMeeting): OwnerMatchupReference {
  return {
    ownerMatchupKey: meeting.ownerMatchupKey,
    canonicalMatchupKey: meeting.canonicalMatchupKey,
    season: meeting.season,
    week: meeting.week,
    matchupType: meeting.classification,
    isChampionshipGame: meeting.isChampionshipGame,
    result: meeting.result,
    pointsFor: meeting.ownerScore,
    pointsAgainst: meeting.opponentScore,
    margin: meeting.pointDifferential,
  };
}

function sameValue(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function referenceMatchesMeeting(
  reference: OwnerMatchupReference | null,
  meeting: OwnerHeadToHeadMeeting
) {
  return (
    reference?.ownerMatchupKey === meeting.ownerMatchupKey &&
    reference.canonicalMatchupKey === meeting.canonicalMatchupKey
  );
}

function reconcileSummary(
  summary: OwnerOpponentMatchupSummary,
  meetings: readonly OwnerHeadToHeadMeeting[]
) {
  const failures: string[] = [];
  const ordered = [...meetings].sort(compareSummaryChronology);
  const records = buildRecordSplits(meetings);
  const first = ordered[0] ? referenceFor(ordered[0]) : null;
  const latest = ordered.at(-1) ? referenceFor(ordered.at(-1) as OwnerHeadToHeadMeeting) : null;
  const ownerFranchiseIds = uniqueSortedStrings(
    meetings.map((meeting) => meeting.ownerFranchiseId)
  );
  const opponentFranchiseIds = uniqueSortedStrings(
    meetings.map((meeting) => meeting.opponentFranchiseId)
  );
  const teammateIds = uniqueSortedStrings(
    meetings.flatMap((meeting) => meeting.ownerTeammates)
  );
  const otherOpponentIds = uniqueSortedStrings(
    meetings.flatMap((meeting) =>
      meeting.opponentOwners
        .map((opponent) => opponent.ownerId)
        .filter((ownerId) => ownerId !== summary.opponentOwnerId)
    )
  );
  const lineage = {
    ownerMatchupKeys: uniqueSortedStrings(
      meetings.map((meeting) => meeting.ownerMatchupKey)
    ),
    canonicalMatchupKeys: uniqueSortedStrings(
      meetings.map((meeting) => meeting.canonicalMatchupKey)
    ),
    ownerSeasonKeys: uniqueSortedStrings(
      meetings.map((meeting) => meeting.ownerSeasonKey)
    ),
    correctionVersions: uniqueSortedNumbers(
      meetings.map((meeting) => meeting.source.correctionVersion)
    ),
    sourceVersions: uniqueSortedStrings(
      meetings.map((meeting) => meeting.source.canonicalSource.sourceVersion)
    ),
    source: "owner-matchup-projection" as const,
  };

  const checks: readonly [string, unknown, unknown][] = [
    ["all completed meetings", meetings.length, summary.meetings],
    ["record splits", records, summary.records],
    ["first meeting", first, summary.firstMeeting],
    ["latest meeting", latest, summary.latestMeeting],
    ["seasons", uniqueSortedNumbers(meetings.map((meeting) => meeting.season)), summary.seasons],
    ["canonical keys", lineage.canonicalMatchupKeys, summary.canonicalMatchupKeys],
    ["projection keys", lineage.ownerMatchupKeys, summary.ownerMatchupKeys],
    ["owner franchises", ownerFranchiseIds, summary.franchiseIds],
    ["opponent franchises", opponentFranchiseIds, summary.opponentFranchiseIds],
    ["lineage", lineage, summary.lineage],
    ["projections consumed", meetings.length, summary.coverage.projectionsConsumed],
    ["unique canonical meetings", new Set(lineage.canonicalMatchupKeys).size, summary.coverage.uniqueCanonicalMeetings],
    ["duplicate canonical keys", duplicates(meetings.map((meeting) => meeting.canonicalMatchupKey)), summary.coverage.duplicateCanonicalMatchupKeys],
    ["owner teammate meeting count", meetings.filter((meeting) => meeting.ownerTeammates.length > 0).length, summary.coOwnerContext.meetingsWhereOwnerHadTeammates],
    ["opponent teammate meeting count", meetings.filter((meeting) => meeting.opponentOwners.length > 1).length, summary.coOwnerContext.meetingsWhereOpponentHadTeammates],
    ["teammate IDs", teammateIds, summary.coOwnerContext.teammateOwnerIdsEncountered],
    ["other opponent IDs", otherOpponentIds, summary.coOwnerContext.otherOpponentOwnerIdsEncountered],
  ];

  checks.forEach(([label, actual, expected]) => {
    if (!sameValue(actual, expected)) failures.push(label);
  });

  const notableReferences: readonly [string, OwnerMatchupReference | null][] = [
    ["closest meeting", summary.factualExtremes.closestMeeting],
    ["largest win", summary.factualExtremes.largestVictory],
    ["largest loss", summary.factualExtremes.largestDefeat],
  ];
  notableReferences.forEach(([label, reference]) => {
    if (reference === null) return;
    const matchingMeeting = meetings.find((meeting) =>
      referenceMatchesMeeting(reference, meeting)
    );
    if (!matchingMeeting || !sameValue(referenceFor(matchingMeeting), reference)) {
      failures.push(label);
    }
  });
  if (summary.factualExtremes.closestMeeting === null && meetings.length > 0) {
    failures.push("closest meeting");
  }
  if (
    (summary.factualExtremes.largestVictory === null) !==
    !meetings.some((meeting) => meeting.result === "win")
  ) {
    failures.push("largest win");
  }
  if (
    (summary.factualExtremes.largestDefeat === null) !==
    !meetings.some((meeting) => meeting.result === "loss")
  ) {
    failures.push("largest loss");
  }

  return uniqueSortedStrings(failures);
}

function isSupportedSeason(summary: OwnerSeasonMatchupSummary) {
  return (
    summary.coverage.sourceAvailability === "available" ||
    summary.coverage.sourceAvailability === "available-no-completed-games"
  );
}

function buildPairCoverage({
  ownerId,
  opponentOwnerId,
  summary,
  meetings,
  seasonSummaryByOwnerSeason,
  profileById,
  missingProjectionKeys = [],
  missingCanonicalMatchupKeys = [],
  reconciliationFailures = [],
}: {
  ownerId: string;
  opponentOwnerId: string;
  summary: OwnerOpponentMatchupSummary | null;
  meetings: readonly OwnerHeadToHeadMeeting[];
  seasonSummaryByOwnerSeason: ReadonlyMap<string, OwnerSeasonMatchupSummary>;
  profileById: ReadonlyMap<string, OwnerHeadToHeadDetailBuildInput["ownerProfiles"][number]>;
  missingProjectionKeys?: readonly string[];
  missingCanonicalMatchupKeys?: readonly string[];
  reconciliationFailures?: readonly string[];
}): OwnerHeadToHeadCoverage {
  const ownerProfile = profileById.get(ownerId);
  const opponentProfile = profileById.get(opponentOwnerId);
  const ownerSeasons = [...seasonSummaryByOwnerSeason.values()].filter(
    (candidate) => candidate.ownerId === ownerId
  );
  const opponentBySeason = new Map(
    [...seasonSummaryByOwnerSeason.values()]
      .filter((candidate) => candidate.ownerId === opponentOwnerId)
      .map((candidate) => [candidate.season, candidate])
  );
  const overlaps = ownerSeasons
    .map((ownerSeason) => ({
      owner: ownerSeason,
      opponent: opponentBySeason.get(ownerSeason.season),
    }))
    .filter(
      (pair): pair is {
        owner: OwnerSeasonMatchupSummary;
        opponent: OwnerSeasonMatchupSummary;
      } => Boolean(pair.opponent)
    );
  const eligibleOverlaps = overlaps.filter(
    ({ owner, opponent }) =>
      !owner.franchiseIds.some((franchiseId) =>
        opponent.franchiseIds.includes(franchiseId)
      )
  );
  const approvedOverlapSeasons = uniqueSortedNumbers(
    eligibleOverlaps.map(({ owner }) => owner.season)
  );
  const supportedOverlapSeasons = uniqueSortedNumbers(
    eligibleOverlaps
      .filter(
        ({ owner, opponent }) =>
          isSupportedSeason(owner) && isSupportedSeason(opponent)
      )
      .map(({ owner }) => owner.season)
  );
  const unsupportedOverlapSeasons = approvedOverlapSeasons.filter(
    (season) => !supportedOverlapSeasons.includes(season)
  );
  const meetingSeasons = new Set(meetings.map((meeting) => meeting.season));
  const sourceEnabledNoMeetingSeasons = supportedOverlapSeasons.filter(
    (season) => !meetingSeasons.has(season)
  );
  const duplicateMeetingKeys = duplicates(
    meetings.map((meeting) => meeting.meetingKey)
  );
  const duplicateCanonicalMatchupKeys = duplicates(
    meetings.map((meeting) => meeting.canonicalMatchupKey)
  );
  const isNotApplicable =
    ownerId === opponentOwnerId ||
    ownerProfile?.status === "staff" ||
    opponentProfile?.status === "staff" ||
    (overlaps.length > 0 && eligibleOverlaps.length === 0);
  let state: OwnerHeadToHeadCoverageState;
  if (isNotApplicable) {
    state = "not-applicable";
  } else if (approvedOverlapSeasons.length === 0) {
    state = "no-approved-tenure-overlap";
  } else if (meetings.length > 0 && unsupportedOverlapSeasons.length > 0) {
    state = "partial-career-coverage";
  } else if (meetings.length > 0) {
    state = "available";
  } else if (supportedOverlapSeasons.length > 0) {
    state = "available-no-completed-pair-meetings";
  } else {
    state = "unavailable-source";
  }

  return deepFreeze({
    state,
    ownerId,
    opponentOwnerId,
    isPartialCareerCoverage:
      supportedOverlapSeasons.length > 0 && unsupportedOverlapSeasons.length > 0,
    approvedOverlapSeasons,
    supportedOverlapSeasons,
    unsupportedOverlapSeasons,
    sourceEnabledNoMeetingSeasons,
    meetingsExpected: summary?.meetings ?? 0,
    meetingsBuilt: meetings.length,
    uniqueCanonicalMeetings: new Set(
      meetings.map((meeting) => meeting.canonicalMatchupKey)
    ).size,
    duplicateMeetingKeys,
    duplicateCanonicalMatchupKeys,
    missingProjectionKeys: uniqueSortedStrings(missingProjectionKeys),
    missingCanonicalMatchupKeys: uniqueSortedStrings(missingCanonicalMatchupKeys),
    summaryReconciliationFailures: uniqueSortedStrings(reconciliationFailures),
  });
}

function buildMeeting({
  summary,
  projection,
  canonical,
}: {
  summary: OwnerOpponentMatchupSummary;
  projection: OwnerMatchupProjection;
  canonical: CanonicalFranchiseMatchup;
}): OwnerHeadToHeadMeeting {
  if (
    !canonical.isComplete ||
    canonical.matchupType === "bye" ||
    canonical.matchupType === "incomplete" ||
    canonical.homeScore === null ||
    canonical.awayScore === null
  ) {
    throw new Error(`Canonical matchup ${canonical.matchupKey} is not a completed classified contest.`);
  }
  const canonicalOwnerFranchiseId =
    projection.side === "home"
      ? canonical.homeFranchiseId
      : canonical.awayFranchiseId;
  const canonicalOpponentFranchiseId =
    projection.side === "home"
      ? canonical.awayFranchiseId
      : canonical.homeFranchiseId;
  const canonicalOwnerScore =
    projection.side === "home" ? canonical.homeScore : canonical.awayScore;
  const canonicalOpponentScore =
    projection.side === "home" ? canonical.awayScore : canonical.homeScore;
  if (
    projection.canonicalMatchupKey !== canonical.matchupKey ||
    projection.season !== canonical.season ||
    projection.week !== canonical.week ||
    projection.matchupType !== canonical.matchupType ||
    projection.bracketType !== canonical.bracketType ||
    projection.round !== canonical.round ||
    projection.bracketPlacement !== canonical.bracketPlacement ||
    projection.isChampionshipGame !== canonical.isChampionshipGame ||
    projection.ownerFranchiseId !== canonicalOwnerFranchiseId ||
    projection.opponentFranchiseId !== canonicalOpponentFranchiseId ||
    projection.pointsFor !== canonicalOwnerScore ||
    projection.pointsAgainst !== canonicalOpponentScore ||
    projection.canonicalLineage.canonicalMatchupKey !== canonical.matchupKey ||
    projection.canonicalLineage.correctionVersion !== canonical.correctionVersion ||
    projection.canonicalLineage.sourceProvider !== canonical.source.provider ||
    projection.canonicalLineage.sourceVersion !== canonical.source.sourceVersion
  ) {
    throw new Error(
      `Owner projection ${projection.ownerMatchupKey} does not reconcile with canonical matchup ${canonical.matchupKey}.`
    );
  }
  const scoringPeriods = canonical.scoringPeriods.map((period) => {
    if (!period.isComplete || period.homeScore === null || period.awayScore === null) {
      throw new Error(`Canonical matchup ${canonical.matchupKey} has an incomplete scoring period.`);
    }
    return deepFreeze({
      week: period.week,
      sourceMatchupId: period.sourceMatchupId,
      ownerScore: projection.side === "home" ? period.homeScore : period.awayScore,
      opponentScore: projection.side === "home" ? period.awayScore : period.homeScore,
      isComplete: true as const,
    });
  });
  const winnerOwnerIds =
    projection.result === "tie"
      ? []
      : projection.result === "win"
        ? [projection.ownerId, ...projection.teammateOwnerIds]
        : projection.opponentOwners.map((opponent) => opponent.ownerId);
  const loserOwnerIds =
    projection.result === "tie"
      ? []
      : projection.result === "loss"
        ? [projection.ownerId, ...projection.teammateOwnerIds]
        : projection.opponentOwners.map((opponent) => opponent.ownerId);

  return deepFreeze({
    meetingKey: meetingKey(
      summary.ownerId,
      summary.opponentOwnerId,
      canonical.matchupKey
    ),
    relationshipKey: relationshipKey(summary.ownerId, summary.opponentOwnerId),
    ownerMatchupKey: projection.ownerMatchupKey,
    canonicalMatchupKey: canonical.matchupKey,
    opponentSummaryKey: summary.summaryKey,
    season: canonical.season,
    leagueId: canonical.leagueId,
    week: canonical.week,
    classification: canonical.matchupType,
    bracketType: canonical.bracketType,
    round: canonical.round,
    bracketPlacement: canonical.bracketPlacement,
    isChampionshipGame: canonical.isChampionshipGame,
    ownerId: projection.ownerId,
    opponentOwnerId: summary.opponentOwnerId,
    ownerSeasonKey: projection.ownerSeasonKey,
    ownerFranchiseId: projection.ownerFranchiseId,
    opponentFranchiseId: projection.opponentFranchiseId,
    ownerRole: projection.ownershipRole,
    ownerTeammates: uniqueSortedStrings(projection.teammateOwnerIds),
    opponentOwners: [...projection.opponentOwners]
      .sort((first, second) => first.ownerId.localeCompare(second.ownerId))
      .map((opponent) => deepFreeze({ ...opponent })),
    ownerScore: projection.pointsFor,
    opponentScore: projection.pointsAgainst,
    pointDifferential: projection.margin,
    result: projection.result,
    winnerOwnerIds: uniqueSortedStrings(winnerOwnerIds),
    loserOwnerIds: uniqueSortedStrings(loserOwnerIds),
    scoringPeriods,
    notable: deepFreeze({
      isClosestMeeting: referenceMatchesMeeting(
        summary.factualExtremes.closestMeeting,
        { ownerMatchupKey: projection.ownerMatchupKey, canonicalMatchupKey: canonical.matchupKey } as OwnerHeadToHeadMeeting
      ),
      isLargestWin: referenceMatchesMeeting(
        summary.factualExtremes.largestVictory,
        { ownerMatchupKey: projection.ownerMatchupKey, canonicalMatchupKey: canonical.matchupKey } as OwnerHeadToHeadMeeting
      ),
      isLargestLoss: referenceMatchesMeeting(
        summary.factualExtremes.largestDefeat,
        { ownerMatchupKey: projection.ownerMatchupKey, canonicalMatchupKey: canonical.matchupKey } as OwnerHeadToHeadMeeting
      ),
    }),
    source: deepFreeze({
      projectionSource: "owner-matchup-projection" as const,
      canonicalSource: cloneValue(canonical.source),
      correctionVersion: canonical.correctionVersion,
    }),
  });
}

function requireInitialized() {
  if (
    !cachedDetails ||
    !cachedMeetings ||
    !cachedCoverageByRelationship ||
    !cachedOwnerIdByIdentity ||
    !cachedBuildCoverage
  ) {
    throw new Error(
      "Owner head-to-head details are not initialized. Supply approved upstream outputs to buildOwnerHeadToHeadDetails() first."
    );
  }
}

function resolveOwnerId(ownerIdOrSlug: string) {
  requireInitialized();
  return cachedOwnerIdByIdentity?.get(ownerIdOrSlug.trim().toLowerCase()) ?? null;
}

function matchesFilter(
  meeting: OwnerHeadToHeadMeeting,
  filter: OwnerHeadToHeadFilter
) {
  if (filter === "all") return true;
  if (filter === "competitive") {
    return (
      meeting.classification === "regular" ||
      meeting.classification === "championship-playoff"
    );
  }
  if (filter === "championship-game") return meeting.isChampionshipGame;
  return meeting.classification === filter;
}

export function buildOwnerHeadToHeadDetails(
  input: OwnerHeadToHeadDetailBuildInput
): OwnerHeadToHeadDetailBuildResult {
  if (
    input.projectionCoverage.ownerProjectionRecordsCreated !==
    input.projections.length
  ) {
    throw new Error(
      "Owner head-to-head projection input does not reconcile with projection coverage."
    );
  }
  const duplicateCanonicalInputKeys = duplicates(
    input.canonicalMatchups.map((matchup) => matchup.matchupKey)
  );
  const duplicateProjectionInputKeys = duplicates(
    input.projections.map((projection) => projection.ownerMatchupKey)
  );
  const duplicateSummaryInputKeys = duplicates(
    input.opponentSummaries.map((summary) => summary.summaryKey)
  );
  const duplicateRelationshipInputKeys = duplicates(
    input.opponentSummaries.map((summary) =>
      relationshipKey(summary.ownerId, summary.opponentOwnerId)
    )
  );
  const duplicateProfileIds = duplicates(input.ownerProfiles.map((profile) => profile.id));
  const duplicateProfileSlugs = duplicates(input.ownerProfiles.map((profile) => profile.slug));
  const duplicateSeasonSummaryKeys = duplicates(
    input.seasonSummaries.map((summary) => seasonSummaryKey(summary.ownerId, summary.season))
  );
  const duplicateCareerOwnerIds = duplicates(
    input.careerSummaries.map((summary) => summary.ownerId)
  );
  const structuralDuplicates = [
    ...duplicateCanonicalInputKeys.map((key) => `canonical:${key}`),
    ...duplicateProjectionInputKeys.map((key) => `projection:${key}`),
    ...duplicateSummaryInputKeys.map((key) => `summary:${key}`),
    ...duplicateRelationshipInputKeys.map((key) => `relationship:${key}`),
    ...duplicateProfileIds.map((key) => `profile-id:${key}`),
    ...duplicateProfileSlugs.map((key) => `profile-slug:${key}`),
    ...duplicateSeasonSummaryKeys.map((key) => `season-summary:${key}`),
    ...duplicateCareerOwnerIds.map((key) => `career-summary:${key}`),
  ];
  if (structuralDuplicates.length > 0) {
    throw new Error(`Owner head-to-head input contains duplicate keys: ${structuralDuplicates.join(", ")}`);
  }

  const canonicalByKey = new Map(
    input.canonicalMatchups.map((matchup) => [matchup.matchupKey, matchup])
  );
  const projectionByKey = new Map(
    input.projections.map((projection) => [projection.ownerMatchupKey, projection])
  );
  const profileById = new Map(input.ownerProfiles.map((profile) => [profile.id, profile]));
  const careerByOwner = new Map(
    input.careerSummaries.map((summary) => [summary.ownerId, summary])
  );
  const seasonSummaryByOwnerSeason = new Map(
    input.seasonSummaries.map((summary) => [seasonSummaryKey(summary.ownerId, summary.season), summary])
  );
  const ownerIdentity = new Map<string, string>();
  input.ownerProfiles.forEach((profile) => {
    ownerIdentity.set(profile.id.toLowerCase(), profile.id);
    ownerIdentity.set(profile.slug.toLowerCase(), profile.id);
  });
  const teammateViolations: string[] = [];
  const helperAttributionViolations: string[] = [];
  const relationshipReconciliationFailures: string[] = [];
  const meetings: OwnerHeadToHeadMeeting[] = [];
  const details: OwnerHeadToHeadDetail[] = [];
  const coverageByRelationship = new Map<string, OwnerHeadToHeadCoverage>();

  input.projections.forEach((projection) => {
    if (!profileById.has(projection.ownerId)) {
      helperAttributionViolations.push(`${projection.ownerMatchupKey}:owner:${projection.ownerId}`);
    }
    if (
      !seasonSummaryByOwnerSeason
        .get(seasonSummaryKey(projection.ownerId, projection.season))
        ?.ownerSeasonKeys.includes(projection.ownerSeasonKey)
    ) {
      helperAttributionViolations.push(`${projection.ownerMatchupKey}:owner-season:${projection.ownerSeasonKey}`);
    }
    projection.opponentOwners.forEach((opponent) => {
      if (
        opponent.ownerId === projection.ownerId ||
        projection.teammateOwnerIds.includes(opponent.ownerId)
      ) {
        teammateViolations.push(`${projection.ownerMatchupKey}:${opponent.ownerId}`);
      }
      if (
        !profileById.has(opponent.ownerId) ||
        !seasonSummaryByOwnerSeason
          .get(seasonSummaryKey(opponent.ownerId, projection.season))
          ?.ownerSeasonKeys.includes(opponent.ownerSeasonKey)
      ) {
        helperAttributionViolations.push(`${projection.ownerMatchupKey}:opponent:${opponent.ownerId}`);
      }
    });
  });

  input.opponentSummaries.forEach((summary) => {
    const key = relationshipKey(summary.ownerId, summary.opponentOwnerId);
    const missingProjectionKeys: string[] = [];
    const missingCanonicalMatchupKeys: string[] = [];
    const pairMeetings: OwnerHeadToHeadMeeting[] = [];
    const expectedProjectionKeys = new Set(summary.ownerMatchupKeys);
    summary.ownerMatchupKeys.forEach((ownerMatchupKey) => {
      const projection = projectionByKey.get(ownerMatchupKey);
      if (!projection) {
        missingProjectionKeys.push(ownerMatchupKey);
        return;
      }
      const canonical = canonicalByKey.get(projection.canonicalMatchupKey);
      if (!canonical) {
        missingCanonicalMatchupKeys.push(projection.canonicalMatchupKey);
        return;
      }
      if (
        projection.ownerId !== summary.ownerId ||
        !projection.opponentOwners.some(
          (opponent) => opponent.ownerId === summary.opponentOwnerId
        ) ||
        projection.teammateOwnerIds.includes(summary.opponentOwnerId) ||
        projection.ownerId === summary.opponentOwnerId ||
        !summary.canonicalMatchupKeys.includes(projection.canonicalMatchupKey)
      ) {
        relationshipReconciliationFailures.push(`${key}:invalid-projection:${ownerMatchupKey}`);
        return;
      }
      pairMeetings.push(buildMeeting({ summary, projection, canonical }));
    });
    input.projections
      .filter(
        (projection) =>
          projection.ownerId === summary.ownerId &&
          projection.opponentOwners.some(
            (opponent) => opponent.ownerId === summary.opponentOwnerId
          ) &&
          summary.canonicalMatchupKeys.includes(projection.canonicalMatchupKey)
      )
      .forEach((projection) => {
        if (!expectedProjectionKeys.has(projection.ownerMatchupKey)) {
          relationshipReconciliationFailures.push(`${key}:unexpected-projection:${projection.ownerMatchupKey}`);
        }
      });
    const reconciliationFailures = reconcileSummary(summary, pairMeetings);
    reconciliationFailures.forEach((failure) =>
      relationshipReconciliationFailures.push(`${key}:${failure}`)
    );
    const pairCoverage = buildPairCoverage({
      ownerId: summary.ownerId,
      opponentOwnerId: summary.opponentOwnerId,
      summary,
      meetings: pairMeetings,
      seasonSummaryByOwnerSeason,
      profileById,
      missingProjectionKeys,
      missingCanonicalMatchupKeys,
      reconciliationFailures,
    });
    coverageByRelationship.set(key, pairCoverage);
    const newest = [...pairMeetings].sort(compareNewestFirst);
    const chronological = [...pairMeetings].sort(compareChronological);
    details.push(
      deepFreeze({
        relationshipKey: key,
        ownerId: summary.ownerId,
        opponentOwnerId: summary.opponentOwnerId,
        opponentSummaryKey: summary.summaryKey,
        summary: immutableClone(summary),
        meetingKeysNewestFirst: newest.map((meeting) => meeting.meetingKey),
        meetingKeysChronological: chronological.map((meeting) => meeting.meetingKey),
        coverage: pairCoverage,
      })
    );
    meetings.push(...pairMeetings);
  });

  const profiles = [...input.ownerProfiles].sort((first, second) => first.id.localeCompare(second.id));
  profiles.forEach((owner) => {
    profiles.forEach((opponent) => {
      const key = relationshipKey(owner.id, opponent.id);
      if (coverageByRelationship.has(key)) return;
      const pairCoverage = buildPairCoverage({
        ownerId: owner.id,
        opponentOwnerId: opponent.id,
        summary: null,
        meetings: [],
        seasonSummaryByOwnerSeason,
        profileById,
      });
      coverageByRelationship.set(key, pairCoverage);
      if (
        pairCoverage.state === "available-no-completed-pair-meetings" ||
        pairCoverage.state === "unavailable-source" ||
        pairCoverage.state === "partial-career-coverage"
      ) {
        details.push(
          deepFreeze({
            relationshipKey: key,
            ownerId: owner.id,
            opponentOwnerId: opponent.id,
            opponentSummaryKey: null,
            summary: null,
            meetingKeysNewestFirst: [],
            meetingKeysChronological: [],
            coverage: pairCoverage,
          })
        );
      }
    });
  });

  const duplicateRelationshipKeys = duplicates(
    details.map((detail) => detail.relationshipKey)
  );
  const duplicateMeetingKeys = duplicates(
    meetings.map((meeting) => meeting.meetingKey)
  );
  const allFailures = uniqueSortedStrings([
    ...relationshipReconciliationFailures,
    ...details.flatMap((detail) =>
      detail.coverage.missingProjectionKeys.map(
        (missing) => `${detail.relationshipKey}:missing-projection:${missing}`
      )
    ),
    ...details.flatMap((detail) =>
      detail.coverage.missingCanonicalMatchupKeys.map(
        (missing) => `${detail.relationshipKey}:missing-canonical:${missing}`
      )
    ),
  ]);
  if (
    duplicateRelationshipKeys.length > 0 ||
    duplicateMeetingKeys.length > 0 ||
    allFailures.length > 0 ||
    teammateViolations.length > 0 ||
    helperAttributionViolations.length > 0 ||
    input.projectionCoverage.duplicateOwnerMatchupKeys.length > 0 ||
    input.projectionCoverage.teammateOpponentViolations.length > 0
  ) {
    throw new Error(
      `Owner head-to-head detail reconciliation failed: ${[
        ...duplicateRelationshipKeys.map((key) => `duplicate-relationship:${key}`),
        ...duplicateMeetingKeys.map((key) => `duplicate-meeting:${key}`),
        ...allFailures,
        ...teammateViolations.map((key) => `teammate:${key}`),
        ...helperAttributionViolations.map((key) => `helper:${key}`),
      ].join(", ")}`
    );
  }

  const classificationTotals = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [
      classification,
      meetings.filter((meeting) => meeting.classification === classification).length,
    ])
  ) as Record<OwnerHeadToHeadClassification, number>;
  const buildCoverage: OwnerHeadToHeadBuildCoverage = deepFreeze({
    directionalHeadToHeadDetails: details.length,
    supportedDirectionalRelationships: input.opponentSummaries.length,
    coverageOnlyRelationships: details.filter((detail) => detail.summary === null).length,
    directionalMeetings: meetings.length,
    uniquePhysicalCanonicalContestsRepresented: new Set(
      meetings.map((meeting) => meeting.canonicalMatchupKey)
    ).size,
    competitiveMeetingCredits: meetings.filter(
      (meeting) =>
        meeting.classification === "regular" ||
        meeting.classification === "championship-playoff"
    ).length,
    secondaryClassificationMeetingCredits: meetings.filter(
      (meeting) =>
        meeting.classification !== "regular" &&
        meeting.classification !== "championship-playoff"
    ).length,
    championshipGameMeetingCredits: meetings.filter(
      (meeting) => meeting.isChampionshipGame
    ).length,
    classificationTotals,
    duplicateRelationshipKeys,
    duplicateMeetingKeys,
    relationshipReconciliationFailures: allFailures,
    teammateViolations: uniqueSortedStrings(teammateViolations),
    helperAttributionViolations: uniqueSortedStrings(helperAttributionViolations),
  });

  if (
    input.careerSummaries.some((summary) => !profileById.has(summary.ownerId)) ||
    input.seasonSummaries.some((summary) => !careerByOwner.has(summary.ownerId))
  ) {
    throw new Error("Owner head-to-head coverage input contains an unknown owner summary.");
  }

  const nextDetails = details
    .sort((first, second) => first.relationshipKey.localeCompare(second.relationshipKey))
    .map((detail) => immutableClone(detail));
  const nextMeetings = meetings
    .sort((first, second) => first.meetingKey.localeCompare(second.meetingKey))
    .map((meeting) => immutableClone(meeting));
  cachedDetails = nextDetails;
  cachedMeetings = nextMeetings;
  cachedCoverageByRelationship = new Map(
    [...coverageByRelationship].map(([key, coverage]) => [key, immutableClone(coverage)])
  );
  cachedOwnerIdByIdentity = new Map(ownerIdentity);
  cachedBuildCoverage = immutableClone(buildCoverage);

  return immutableClone({
    details: nextDetails,
    meetings: nextMeetings,
    coverage: buildCoverage,
  });
}

export function getAllOwnerHeadToHeadDetails() {
  requireInitialized();
  return immutableClone(cachedDetails as OwnerHeadToHeadDetail[]);
}

export function getAllSupportedDirectionalHeadToHeadPairs() {
  return immutableClone(
    getAllOwnerHeadToHeadDetails().filter((detail) => detail.summary !== null)
  );
}

export function getOwnerHeadToHeadDetail(
  ownerIdOrSlug: string,
  opponentIdOrSlug: string
) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  const opponentOwnerId = resolveOwnerId(opponentIdOrSlug);
  if (!ownerId || !opponentOwnerId) return null;
  const detail = (cachedDetails as OwnerHeadToHeadDetail[]).find(
    (candidate) =>
      candidate.relationshipKey === relationshipKey(ownerId, opponentOwnerId)
  );
  return detail ? immutableClone(detail) : null;
}

export function getOwnerHeadToHeadMeetings(
  ownerIdOrSlug: string,
  opponentIdOrSlug: string,
  filter: OwnerHeadToHeadFilter = "all"
) {
  const detail = getOwnerHeadToHeadDetail(ownerIdOrSlug, opponentIdOrSlug);
  if (!detail) return immutableClone([] as OwnerHeadToHeadMeeting[]);
  const meetingByKey = new Map(
    (cachedMeetings as OwnerHeadToHeadMeeting[]).map((meeting) => [meeting.meetingKey, meeting])
  );
  return immutableClone(
    detail.meetingKeysNewestFirst
      .map((key) => meetingByKey.get(key))
      .filter((meeting): meeting is OwnerHeadToHeadMeeting => Boolean(meeting))
      .filter((meeting) => matchesFilter(meeting, filter))
  );
}

export function getOwnerHeadToHeadMeetingsChronological(
  ownerIdOrSlug: string,
  opponentIdOrSlug: string,
  filter: OwnerHeadToHeadFilter = "all"
) {
  const detail = getOwnerHeadToHeadDetail(ownerIdOrSlug, opponentIdOrSlug);
  if (!detail) return immutableClone([] as OwnerHeadToHeadMeeting[]);
  const meetingByKey = new Map(
    (cachedMeetings as OwnerHeadToHeadMeeting[]).map((meeting) => [meeting.meetingKey, meeting])
  );
  return immutableClone(
    detail.meetingKeysChronological
      .map((key) => meetingByKey.get(key))
      .filter((meeting): meeting is OwnerHeadToHeadMeeting => Boolean(meeting))
      .filter((meeting) => matchesFilter(meeting, filter))
  );
}

export function getOwnerHeadToHeadMeeting(key: string) {
  requireInitialized();
  const meeting = (cachedMeetings as OwnerHeadToHeadMeeting[]).find(
    (candidate) => candidate.meetingKey === key
  );
  return meeting ? immutableClone(meeting) : null;
}

export function getOwnerHeadToHeadCoverage(
  ownerIdOrSlug: string,
  opponentIdOrSlug: string
) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  const opponentOwnerId = resolveOwnerId(opponentIdOrSlug);
  if (!ownerId || !opponentOwnerId) return null;
  const coverage = cachedCoverageByRelationship?.get(
    relationshipKey(ownerId, opponentOwnerId)
  );
  return coverage ? immutableClone(coverage) : null;
}

export function getOwnerHeadToHeadBuildCoverage() {
  requireInitialized();
  return immutableClone(cachedBuildCoverage as OwnerHeadToHeadBuildCoverage);
}
