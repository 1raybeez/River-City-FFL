import type {
  CanonicalBracketType,
  CanonicalFranchiseMatchup,
  CanonicalMatchupType,
} from "@/lib/history/canonicalMatchupHistory";
import type { OwnerSeasonHistoryRecord } from "@/lib/history/ownerSeasonHistory";
import type { OwnershipRole } from "@/lib/managers/identityTypes";

export type OwnerMatchupResult = "win" | "loss" | "tie";
export type OwnerMatchupSide = "home" | "away";

export type OwnerMatchupEligibility = Readonly<{
  overallCompetitive: boolean;
  regularSeason: boolean;
  championshipPlayoff: boolean;
  thirdPlace: boolean;
  placement: boolean;
  consolation: boolean;
  toiletBowl: boolean;
  rivalry: boolean;
}>;

export type OwnerMatchupEligibilityScope = keyof OwnerMatchupEligibility;

export type OwnerMatchupOpponent = Readonly<{
  ownerId: string;
  ownerSeasonKey: string;
  ownershipRole: OwnershipRole;
}>;

export type OwnerMatchupProjection = Readonly<{
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  season: number;
  week: number;
  side: OwnerMatchupSide;
  ownerId: string;
  ownerSeasonKey: string;
  ownerFranchiseId: string;
  ownershipRole: OwnershipRole;
  teammateOwnerIds: readonly string[];
  opponentFranchiseId: string;
  opponentOwners: readonly OwnerMatchupOpponent[];
  result: OwnerMatchupResult;
  pointsFor: number;
  pointsAgainst: number;
  margin: number;
  matchupType: CanonicalMatchupType;
  bracketType: CanonicalBracketType;
  round: number | null;
  bracketPlacement: number | null;
  isChampionshipGame: boolean;
  eligibility: OwnerMatchupEligibility;
  ownershipSource: "owner-season-history";
  canonicalLineage: Readonly<{
    canonicalMatchupKey: string;
    correctionVersion: number;
    sourceProvider: "sleeper";
    sourceVersion: string;
  }>;
  coverage: Readonly<{
    canonicalMatchup: "resolved";
    ownerSeason: "resolved";
    ownerFranchise: "resolved";
    opponentFranchise: "resolved";
    opponentOwners: "resolved";
  }>;
}>;

export type OwnerMatchupProjectionIssueReason =
  | "unreviewed-franchise-mapping"
  | "missing-franchise"
  | "missing-owner-season"
  | "ambiguous-owner-season"
  | "unresolved-owner-identity"
  | "ownership-coverage-incomplete"
  | "canonical-bye"
  | "canonical-incomplete";

export type OwnerMatchupProjectionIssue = Readonly<{
  unresolvedKey: string;
  canonicalMatchupKey: string;
  season: number;
  side: OwnerMatchupSide;
  sourceFranchiseId: string | null;
  reasons: readonly OwnerMatchupProjectionIssueReason[];
  oppositeSideAlsoFailed: boolean;
  notes: readonly string[];
}>;

export type OwnerMatchupProjectionSeasonCoverage = Readonly<{
  season: number;
  canonicalRecordsRead: number;
  completedCompetitiveCanonicalRecords: number;
  canonicalRecordsProjected: number;
  canonicalRecordsOmitted: number;
  ownerProjectionRecordsCreated: number;
  uniquePhysicalContestsRepresented: number;
  unresolvedIssues: number;
}>;

export type OwnerMatchupProjectionCoverage = Readonly<{
  seasonsRequested: readonly number[];
  canonicalRecordsRead: number;
  completedCompetitiveCanonicalRecords: number;
  byeCanonicalRecords: number;
  incompleteCanonicalRecords: number;
  mappedCanonicalSides: number;
  unmappedCanonicalSides: number;
  ownerResolvedCanonicalSides: number;
  ownerUnresolvedCanonicalSides: number;
  canonicalRecordsProjected: number;
  canonicalRecordsOmitted: number;
  ownerProjectionRecordsCreated: number;
  uniquePhysicalContestsRepresented: number;
  duplicateCanonicalMatchupKeys: readonly string[];
  duplicateOwnerMatchupKeys: readonly string[];
  teammateOpponentViolations: readonly string[];
  unresolvedProjections: readonly OwnerMatchupProjectionIssue[];
  bySeason: readonly OwnerMatchupProjectionSeasonCoverage[];
  byClassification: Readonly<Record<CanonicalMatchupType, number>>;
}>;

export type OwnerMatchupProjectionBuildInput = {
  canonicalMatchups: readonly CanonicalFranchiseMatchup[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
};

export type OwnerMatchupProjectionFilter = Readonly<{
  season?: number;
  startSeason?: number;
  endSeason?: number;
  matchupTypes?: readonly CanonicalMatchupType[];
  eligibilityScope?: OwnerMatchupEligibilityScope;
  franchiseId?: string;
  opponentOwnerId?: string;
  opponentFranchiseId?: string;
  isChampionshipGame?: boolean;
  result?: OwnerMatchupResult;
}>;

type ResolvedOwner = {
  ownerId: string;
  ownerSeasonKey: string;
  ownershipRole: OwnershipRole;
};

type SideResolution = {
  side: OwnerMatchupSide;
  franchiseId: string | null;
  owners: ResolvedOwner[];
  reasons: OwnerMatchupProjectionIssueReason[];
  notes: string[];
};

const MATCHUP_TYPES: readonly CanonicalMatchupType[] = [
  "regular",
  "championship-playoff",
  "third-place",
  "consolation",
  "toilet-bowl",
  "placement",
  "bye",
  "incomplete",
];

let cachedProjections: OwnerMatchupProjection[] | null = null;
let cachedIssues: OwnerMatchupProjectionIssue[] | null = null;
let cachedCoverage: OwnerMatchupProjectionCoverage | null = null;

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function emptyClassificationTotals() {
  return Object.fromEntries(
    MATCHUP_TYPES.map((matchupType) => [matchupType, 0])
  ) as Record<CanonicalMatchupType, number>;
}

function eligibilityFor(
  matchupType: CanonicalMatchupType
): OwnerMatchupEligibility {
  const isRegular = matchupType === "regular";
  const isChampionshipPlayoff =
    matchupType === "championship-playoff";

  return Object.freeze({
    overallCompetitive: isRegular || isChampionshipPlayoff,
    regularSeason: isRegular,
    championshipPlayoff: isChampionshipPlayoff,
    thirdPlace: matchupType === "third-place",
    placement: matchupType === "placement",
    consolation: matchupType === "consolation",
    toiletBowl: matchupType === "toilet-bowl",
    rivalry: isRegular || isChampionshipPlayoff,
  });
}

function ownerMatchupKey(
  canonicalMatchupKey: string,
  side: OwnerMatchupSide,
  ownerId: string
) {
  return `${canonicalMatchupKey}:side:${side}:owner:${ownerId}`;
}

function unresolvedKey(
  canonicalMatchupKey: string,
  side: OwnerMatchupSide
) {
  return `${canonicalMatchupKey}:side:${side}:unresolved`;
}

function freezeOpponent(opponent: OwnerMatchupOpponent) {
  return Object.freeze({ ...opponent });
}

function freezeProjection(
  projection: OwnerMatchupProjection
): OwnerMatchupProjection {
  return Object.freeze({
    ...projection,
    teammateOwnerIds: Object.freeze([...projection.teammateOwnerIds]),
    opponentOwners: Object.freeze(
      projection.opponentOwners.map(freezeOpponent)
    ),
    eligibility: Object.freeze({ ...projection.eligibility }),
    canonicalLineage: Object.freeze({
      ...projection.canonicalLineage,
    }),
    coverage: Object.freeze({ ...projection.coverage }),
  });
}

function freezeIssue(
  issue: OwnerMatchupProjectionIssue
): OwnerMatchupProjectionIssue {
  return Object.freeze({
    ...issue,
    reasons: Object.freeze([...issue.reasons]),
    notes: Object.freeze([...issue.notes]),
  });
}

function cloneProjection(projection: OwnerMatchupProjection) {
  return freezeProjection(projection);
}

function cloneIssue(issue: OwnerMatchupProjectionIssue) {
  return freezeIssue(issue);
}

function requireProjections() {
  if (cachedProjections === null) {
    throw new Error(
      "Owner matchup projections are not initialized. Supply canonical and owner-season input to buildOwnerMatchupProjections() first."
    );
  }
  return cachedProjections;
}

function requireIssues() {
  if (cachedIssues === null) {
    throw new Error(
      "Owner matchup projection coverage is not initialized. Build owner matchup projections first."
    );
  }
  return cachedIssues;
}

function requireCoverage() {
  if (cachedCoverage === null) {
    throw new Error(
      "Owner matchup projection coverage is not initialized. Build owner matchup projections first."
    );
  }
  return cachedCoverage;
}

function isCompetitive(matchup: CanonicalFranchiseMatchup) {
  return (
    matchup.isComplete &&
    matchup.matchupType !== "bye" &&
    matchup.matchupType !== "incomplete"
  );
}

function resolveSide(
  matchup: CanonicalFranchiseMatchup,
  side: OwnerMatchupSide,
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[]
): SideResolution {
  const franchiseId =
    side === "home"
      ? matchup.homeFranchiseId
      : matchup.awayFranchiseId;
  const resolution: SideResolution = {
    side,
    franchiseId,
    owners: [],
    reasons: [],
    notes: [],
  };

  if (franchiseId === null) {
    resolution.reasons.push("missing-franchise");
    return resolution;
  }

  if (matchup.coverage.franchises !== "mapped") {
    resolution.reasons.push("unreviewed-franchise-mapping");
    return resolution;
  }

  const candidates = ownerSeasonRecords.filter(
    (record) =>
      record.season === matchup.season &&
      record.franchiseId === franchiseId
  );

  if (candidates.length === 0) {
    resolution.reasons.push("missing-owner-season");
    return resolution;
  }

  if (
    candidates.some(
      (candidate) =>
        candidate.ownerId === null ||
        candidate.ownershipRole === null ||
        candidate.coverage.identity !== "resolved"
    )
  ) {
    resolution.reasons.push("unresolved-owner-identity");
    return resolution;
  }

  if (
    candidates.some(
      (candidate) =>
        candidate.coverage.ownership !== "resolved" ||
        candidate.coverage.franchise !== "resolved" ||
        candidate.isActiveForSeason !== true
    )
  ) {
    resolution.reasons.push("ownership-coverage-incomplete");
    return resolution;
  }

  const ownerIds = candidates.map((candidate) => candidate.ownerId as string);
  if (
    new Set(ownerIds).size !== ownerIds.length ||
    new Set(candidates.map((candidate) => candidate.ownerSeasonKey)).size !==
      candidates.length
  ) {
    resolution.reasons.push("ambiguous-owner-season");
    return resolution;
  }

  resolution.owners = candidates
    .map((candidate) => ({
      ownerId: candidate.ownerId as string,
      ownerSeasonKey: candidate.ownerSeasonKey,
      ownershipRole: candidate.ownershipRole as OwnershipRole,
    }))
    .sort((first, second) => first.ownerId.localeCompare(second.ownerId));

  return resolution;
}

function issueFromResolution(
  matchup: CanonicalFranchiseMatchup,
  resolution: SideResolution,
  oppositeSideAlsoFailed: boolean
) {
  return freezeIssue({
    unresolvedKey: unresolvedKey(matchup.matchupKey, resolution.side),
    canonicalMatchupKey: matchup.matchupKey,
    season: matchup.season,
    side: resolution.side,
    sourceFranchiseId: resolution.franchiseId,
    reasons: [...resolution.reasons],
    oppositeSideAlsoFailed,
    notes: [...resolution.notes],
  });
}

function coverageOnlyIssues(matchup: CanonicalFranchiseMatchup) {
  const reason: OwnerMatchupProjectionIssueReason =
    matchup.matchupType === "bye"
      ? "canonical-bye"
      : "canonical-incomplete";
  const sides: OwnerMatchupSide[] = ["home", "away"];

  return sides
    .filter((side) =>
      side === "home"
        ? matchup.homeFranchiseId !== null
        : matchup.awayFranchiseId !== null
    )
    .map((side) =>
      freezeIssue({
        unresolvedKey: unresolvedKey(matchup.matchupKey, side),
        canonicalMatchupKey: matchup.matchupKey,
        season: matchup.season,
        side,
        sourceFranchiseId:
          side === "home"
            ? matchup.homeFranchiseId
            : matchup.awayFranchiseId,
        reasons: [reason],
        oppositeSideAlsoFailed: true,
        notes: ["Coverage-only canonical slot; no owner statistics emitted."],
      })
    );
}

function resultFor(pointsFor: number, pointsAgainst: number) {
  if (pointsFor === pointsAgainst) return "tie" as const;
  return pointsFor > pointsAgainst ? ("win" as const) : ("loss" as const);
}

function buildSideProjections({
  matchup,
  ownSide,
  opponentSide,
}: {
  matchup: CanonicalFranchiseMatchup;
  ownSide: SideResolution;
  opponentSide: SideResolution;
}) {
  const pointsFor =
    ownSide.side === "home" ? matchup.homeScore : matchup.awayScore;
  const pointsAgainst =
    ownSide.side === "home" ? matchup.awayScore : matchup.homeScore;

  if (
    ownSide.franchiseId === null ||
    opponentSide.franchiseId === null ||
    pointsFor === null ||
    pointsAgainst === null
  ) {
    return [];
  }

  const opponentOwners = opponentSide.owners.map((owner) =>
    freezeOpponent({
      ownerId: owner.ownerId,
      ownerSeasonKey: owner.ownerSeasonKey,
      ownershipRole: owner.ownershipRole,
    })
  );

  return ownSide.owners.map((owner) =>
    freezeProjection({
      ownerMatchupKey: ownerMatchupKey(
        matchup.matchupKey,
        ownSide.side,
        owner.ownerId
      ),
      canonicalMatchupKey: matchup.matchupKey,
      season: matchup.season,
      week: matchup.week,
      side: ownSide.side,
      ownerId: owner.ownerId,
      ownerSeasonKey: owner.ownerSeasonKey,
      ownerFranchiseId: ownSide.franchiseId as string,
      ownershipRole: owner.ownershipRole,
      teammateOwnerIds: ownSide.owners
        .filter((candidate) => candidate.ownerId !== owner.ownerId)
        .map((candidate) => candidate.ownerId)
        .sort(),
      opponentFranchiseId: opponentSide.franchiseId as string,
      opponentOwners,
      result: resultFor(pointsFor, pointsAgainst),
      pointsFor,
      pointsAgainst,
      margin: pointsFor - pointsAgainst,
      matchupType: matchup.matchupType,
      bracketType: matchup.bracketType,
      round: matchup.round,
      bracketPlacement: matchup.bracketPlacement,
      isChampionshipGame: matchup.isChampionshipGame,
      eligibility: eligibilityFor(matchup.matchupType),
      ownershipSource: "owner-season-history",
      canonicalLineage: {
        canonicalMatchupKey: matchup.matchupKey,
        correctionVersion: matchup.correctionVersion,
        sourceProvider: matchup.source.provider,
        sourceVersion: matchup.source.sourceVersion,
      },
      coverage: {
        canonicalMatchup: "resolved",
        ownerSeason: "resolved",
        ownerFranchise: "resolved",
        opponentFranchise: "resolved",
        opponentOwners: "resolved",
      },
    })
  );
}

function buildSeasonCoverage(
  season: number,
  canonicalMatchups: readonly CanonicalFranchiseMatchup[],
  projections: readonly OwnerMatchupProjection[],
  issues: readonly OwnerMatchupProjectionIssue[]
): OwnerMatchupProjectionSeasonCoverage {
  const seasonCanonical = canonicalMatchups.filter(
    (matchup) => matchup.season === season
  );
  const seasonProjections = projections.filter(
    (projection) => projection.season === season
  );
  const representedKeys = new Set(
    seasonProjections.map((projection) => projection.canonicalMatchupKey)
  );
  const completedCompetitive = seasonCanonical.filter(isCompetitive);

  return Object.freeze({
    season,
    canonicalRecordsRead: seasonCanonical.length,
    completedCompetitiveCanonicalRecords: completedCompetitive.length,
    canonicalRecordsProjected: representedKeys.size,
    canonicalRecordsOmitted:
      completedCompetitive.length - representedKeys.size,
    ownerProjectionRecordsCreated: seasonProjections.length,
    uniquePhysicalContestsRepresented: representedKeys.size,
    unresolvedIssues: issues.filter((issue) => issue.season === season)
      .length,
  });
}

function freezeCoverage(
  coverage: OwnerMatchupProjectionCoverage
): OwnerMatchupProjectionCoverage {
  return Object.freeze({
    ...coverage,
    seasonsRequested: Object.freeze([...coverage.seasonsRequested]),
    duplicateCanonicalMatchupKeys: Object.freeze([
      ...coverage.duplicateCanonicalMatchupKeys,
    ]),
    duplicateOwnerMatchupKeys: Object.freeze([
      ...coverage.duplicateOwnerMatchupKeys,
    ]),
    teammateOpponentViolations: Object.freeze([
      ...coverage.teammateOpponentViolations,
    ]),
    unresolvedProjections: Object.freeze(
      coverage.unresolvedProjections.map(cloneIssue)
    ),
    bySeason: Object.freeze(
      coverage.bySeason.map((season) => Object.freeze({ ...season }))
    ),
    byClassification: Object.freeze({ ...coverage.byClassification }),
  });
}

export function buildOwnerMatchupProjections(
  input: OwnerMatchupProjectionBuildInput
) {
  const duplicateCanonicalMatchupKeys = duplicateValues(
    input.canonicalMatchups.map((matchup) => matchup.matchupKey)
  );
  const canonicalMatchups = [...input.canonicalMatchups]
    .sort((first, second) =>
      first.matchupKey.localeCompare(second.matchupKey)
    )
    .filter(
      (matchup, index, records) =>
        records.findIndex(
          (candidate) => candidate.matchupKey === matchup.matchupKey
        ) === index
    );
  const projections: OwnerMatchupProjection[] = [];
  const issues: OwnerMatchupProjectionIssue[] = [];
  let mappedCanonicalSides = 0;
  let unmappedCanonicalSides = 0;
  let ownerResolvedCanonicalSides = 0;
  let ownerUnresolvedCanonicalSides = 0;

  canonicalMatchups.forEach((matchup) => {
    if (!isCompetitive(matchup)) {
      issues.push(...coverageOnlyIssues(matchup));
      return;
    }

    const home = resolveSide(matchup, "home", input.ownerSeasonRecords);
    const away = resolveSide(matchup, "away", input.ownerSeasonRecords);
    const resolutions = [home, away];

    resolutions.forEach((resolution) => {
      if (
        resolution.franchiseId !== null &&
        matchup.coverage.franchises === "mapped"
      ) {
        mappedCanonicalSides += 1;
      } else {
        unmappedCanonicalSides += 1;
      }

      if (resolution.reasons.length === 0) {
        ownerResolvedCanonicalSides += 1;
      } else {
        ownerUnresolvedCanonicalSides += 1;
      }
    });

    if (home.reasons.length > 0 || away.reasons.length > 0) {
      if (home.reasons.length > 0) {
        issues.push(
          issueFromResolution(matchup, home, away.reasons.length > 0)
        );
      }
      if (away.reasons.length > 0) {
        issues.push(
          issueFromResolution(matchup, away, home.reasons.length > 0)
        );
      }
      return;
    }

    projections.push(
      ...buildSideProjections({
        matchup,
        ownSide: home,
        opponentSide: away,
      }),
      ...buildSideProjections({
        matchup,
        ownSide: away,
        opponentSide: home,
      })
    );
  });

  projections.sort((first, second) =>
    first.ownerMatchupKey.localeCompare(second.ownerMatchupKey)
  );
  issues.sort((first, second) =>
    first.unresolvedKey.localeCompare(second.unresolvedKey)
  );

  const duplicateOwnerMatchupKeys = duplicateValues(
    projections.map((projection) => projection.ownerMatchupKey)
  );
  const teammateOpponentViolations = projections
    .filter(
      (projection) =>
        projection.opponentOwners.some(
          (opponent) =>
            opponent.ownerId === projection.ownerId ||
            projection.teammateOwnerIds.includes(opponent.ownerId)
        )
    )
    .map((projection) => projection.ownerMatchupKey)
    .sort();
  const uniquePhysicalContestsRepresented = new Set(
    projections.map((projection) => projection.canonicalMatchupKey)
  ).size;
  const byClassification = emptyClassificationTotals();
  canonicalMatchups.forEach((matchup) => {
    byClassification[matchup.matchupType] += 1;
  });
  const seasonsRequested = [
    ...new Set(canonicalMatchups.map((matchup) => matchup.season)),
  ].sort();
  const bySeason = seasonsRequested.map((season) =>
    buildSeasonCoverage(season, canonicalMatchups, projections, issues)
  );
  const completedCompetitiveCanonicalRecords =
    canonicalMatchups.filter(isCompetitive).length;
  const canonicalRecordsProjected = uniquePhysicalContestsRepresented;

  const coverage = freezeCoverage({
    seasonsRequested,
    canonicalRecordsRead: canonicalMatchups.length,
    completedCompetitiveCanonicalRecords,
    byeCanonicalRecords: canonicalMatchups.filter(
      (matchup) => matchup.matchupType === "bye"
    ).length,
    incompleteCanonicalRecords: canonicalMatchups.filter(
      (matchup) => matchup.matchupType === "incomplete"
    ).length,
    mappedCanonicalSides,
    unmappedCanonicalSides,
    ownerResolvedCanonicalSides,
    ownerUnresolvedCanonicalSides,
    canonicalRecordsProjected,
    canonicalRecordsOmitted:
      completedCompetitiveCanonicalRecords - canonicalRecordsProjected,
    ownerProjectionRecordsCreated: projections.length,
    uniquePhysicalContestsRepresented,
    duplicateCanonicalMatchupKeys,
    duplicateOwnerMatchupKeys,
    teammateOpponentViolations,
    unresolvedProjections: issues,
    bySeason,
    byClassification,
  });

  cachedProjections = projections.map(cloneProjection);
  cachedIssues = issues.map(cloneIssue);
  cachedCoverage = coverage;

  return Object.freeze(projections.map(cloneProjection));
}

function normalizeOwnerId(ownerIdOrSlug: string) {
  return ownerIdOrSlug.trim().toLowerCase().replace(/\s+/g, "-");
}

function matchesFilter(
  projection: OwnerMatchupProjection,
  filter: OwnerMatchupProjectionFilter = {}
) {
  if (filter.season !== undefined && projection.season !== filter.season) {
    return false;
  }
  if (
    filter.startSeason !== undefined &&
    projection.season < filter.startSeason
  ) {
    return false;
  }
  if (
    filter.endSeason !== undefined &&
    projection.season > filter.endSeason
  ) {
    return false;
  }
  if (
    filter.matchupTypes !== undefined &&
    !filter.matchupTypes.includes(projection.matchupType)
  ) {
    return false;
  }
  if (
    filter.eligibilityScope !== undefined &&
    !projection.eligibility[filter.eligibilityScope]
  ) {
    return false;
  }
  if (
    filter.franchiseId !== undefined &&
    projection.ownerFranchiseId !== filter.franchiseId
  ) {
    return false;
  }
  if (
    filter.opponentOwnerId !== undefined &&
    !projection.opponentOwners.some(
      (opponent) =>
        opponent.ownerId === normalizeOwnerId(filter.opponentOwnerId as string)
    )
  ) {
    return false;
  }
  if (
    filter.opponentFranchiseId !== undefined &&
    projection.opponentFranchiseId !== filter.opponentFranchiseId
  ) {
    return false;
  }
  if (
    filter.isChampionshipGame !== undefined &&
    projection.isChampionshipGame !== filter.isChampionshipGame
  ) {
    return false;
  }
  if (filter.result !== undefined && projection.result !== filter.result) {
    return false;
  }
  return true;
}

function filteredOwnerHistory(
  ownerIdOrSlug: string,
  filter: OwnerMatchupProjectionFilter = {}
) {
  const ownerId = normalizeOwnerId(ownerIdOrSlug);
  return requireProjections().filter(
    (projection) =>
      projection.ownerId === ownerId && matchesFilter(projection, filter)
  );
}

export function getAllOwnerMatchupProjections() {
  return Object.freeze(requireProjections().map(cloneProjection));
}

export function getOwnerMatchupProjection(ownerMatchupKeyValue: string) {
  const projection = requireProjections().find(
    (candidate) => candidate.ownerMatchupKey === ownerMatchupKeyValue
  );
  return projection ? cloneProjection(projection) : null;
}

export function getOwnerMatchupHistory(
  ownerIdOrSlug: string,
  filter: OwnerMatchupProjectionFilter = {}
) {
  return Object.freeze(
    filteredOwnerHistory(ownerIdOrSlug, filter).map(cloneProjection)
  );
}

export function getOwnerMatchupsForSeason(
  ownerIdOrSlug: string,
  season: number,
  filter: OwnerMatchupProjectionFilter = {}
) {
  return getOwnerMatchupHistory(ownerIdOrSlug, { ...filter, season });
}

export function getOwnerHeadToHead(
  ownerAIdOrSlug: string,
  ownerBIdOrSlug: string,
  filter: OwnerMatchupProjectionFilter = {}
) {
  const ownerBId = normalizeOwnerId(ownerBIdOrSlug);
  const seenCanonicalKeys = new Set<string>();
  const records = filteredOwnerHistory(ownerAIdOrSlug, filter).filter(
    (projection) => {
      if (
        !projection.opponentOwners.some(
          (opponent) => opponent.ownerId === ownerBId
        ) ||
        seenCanonicalKeys.has(projection.canonicalMatchupKey)
      ) {
        return false;
      }
      seenCanonicalKeys.add(projection.canonicalMatchupKey);
      return true;
    }
  );
  return Object.freeze(records.map(cloneProjection));
}

export function getUnresolvedOwnerMatchupProjections() {
  return Object.freeze(requireIssues().map(cloneIssue));
}

export function getOwnerMatchupProjectionCoverage() {
  return freezeCoverage(requireCoverage());
}
