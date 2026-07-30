import type { CanonicalMatchupType } from "@/lib/history/canonicalMatchupHistory";
import type {
  OwnerMatchupProjection,
  OwnerMatchupProjectionCoverage,
  OwnerMatchupResult,
} from "@/lib/history/ownerMatchupProjection";
import type { OwnerSeasonHistoryRecord } from "@/lib/history/ownerSeasonHistory";
import type {
  OwnerProfile,
  OwnerProfileStatus,
  OwnershipRole,
} from "@/lib/managers/identityTypes";

export type OwnerMatchupRecord = Readonly<{
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winningPercentage: number | null;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}>;

export type OwnerMatchupRecordSplits = Readonly<{
  overall: OwnerMatchupRecord;
  regularSeason: OwnerMatchupRecord;
  championshipPlayoff: OwnerMatchupRecord;
  championshipGames: OwnerMatchupRecord;
  thirdPlace: OwnerMatchupRecord;
  placement: OwnerMatchupRecord;
  consolation: OwnerMatchupRecord;
  toiletBowl: OwnerMatchupRecord;
}>;

export type OwnerMatchupSourceAvailability =
  | "available"
  | "available-no-completed-games"
  | "unavailable-no-source"
  | "not-applicable";

export type OwnerMatchupReference = Readonly<{
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  season: number;
  week: number;
  matchupType: CanonicalMatchupType;
  isChampionshipGame: boolean;
  result: OwnerMatchupResult;
  pointsFor: number;
  pointsAgainst: number;
  margin: number;
}>;

export type OwnerMatchupSummaryLineage = Readonly<{
  ownerMatchupKeys: readonly string[];
  canonicalMatchupKeys: readonly string[];
  ownerSeasonKeys: readonly string[];
  correctionVersions: readonly number[];
  sourceVersions: readonly string[];
  source: "owner-matchup-projection";
}>;

export type OwnerCareerMatchupCoverage = Readonly<{
  sourceAvailability: OwnerMatchupSourceAvailability;
  projectionsConsumed: number;
  ownerSeasonsRepresented: number;
  noSourceSeasons: number;
  sourceAvailableNoGameSeasons: number;
}>;

export type OwnerSeasonMatchupCoverage = Readonly<{
  sourceAvailability: OwnerMatchupSourceAvailability;
  projectionsConsumed: number;
}>;

export type OwnerOpponentMatchupCoverage = Readonly<{
  projectionsConsumed: number;
  uniqueCanonicalMeetings: number;
  duplicateCanonicalMatchupKeys: readonly string[];
}>;

export type OwnerOpponentCoOwnerContext = Readonly<{
  meetingsWhereOwnerHadTeammates: number;
  meetingsWhereOpponentHadTeammates: number;
  teammateOwnerIdsEncountered: readonly string[];
  otherOpponentOwnerIdsEncountered: readonly string[];
}>;

export type OwnerOpponentFactualExtremes = Readonly<{
  closestMeeting: OwnerMatchupReference | null;
  largestVictory: OwnerMatchupReference | null;
  largestDefeat: OwnerMatchupReference | null;
}>;

export type OwnerCareerMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "career";
  ownerId: string;
  ownerSlug: string;
  ownerStatus: OwnerProfileStatus;
  records: OwnerMatchupRecordSplits;
  firstMatchup: OwnerMatchupReference | null;
  latestMatchup: OwnerMatchupReference | null;
  firstMatchupSeason: number | null;
  latestMatchupSeason: number | null;
  approvedParticipationSeasons: readonly number[];
  seasonsWithMatchupData: readonly number[];
  seasonsWithoutMatchupSource: readonly number[];
  seasonsWithSourceButNoCompletedGames: readonly number[];
  seasonSummaryKeys: readonly string[];
  opponentSummaryKeys: readonly string[];
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerCareerMatchupCoverage;
}>;

export type OwnerSeasonMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "season";
  ownerId: string;
  season: number;
  ownerSeasonKeys: readonly string[];
  franchiseIds: readonly string[];
  ownershipRoles: readonly OwnershipRole[];
  records: OwnerMatchupRecordSplits;
  firstMatchup: OwnerMatchupReference | null;
  latestMatchup: OwnerMatchupReference | null;
  opponentOwnerIds: readonly string[];
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerSeasonMatchupCoverage;
}>;

export type OwnerOpponentMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "opponent";
  ownerId: string;
  opponentOwnerId: string;
  meetings: number;
  records: OwnerMatchupRecordSplits;
  firstMeeting: OwnerMatchupReference;
  latestMeeting: OwnerMatchupReference;
  seasons: readonly number[];
  canonicalMatchupKeys: readonly string[];
  ownerMatchupKeys: readonly string[];
  franchiseIds: readonly string[];
  opponentFranchiseIds: readonly string[];
  coOwnerContext: OwnerOpponentCoOwnerContext;
  factualExtremes: OwnerOpponentFactualExtremes;
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerOpponentMatchupCoverage;
}>;

export type OwnerMatchupSummaryOwnerCoverage = Readonly<{
  ownerId: string;
  sourceProjections: number;
  careerConsumptions: number;
  seasonConsumptions: number;
  opponentRelationshipConsumptions: number;
}>;

export type OwnerMatchupSummarySeasonCoverage = Readonly<{
  season: number;
  sourceProjections: number;
  seasonConsumptions: number;
  summariesCreated: number;
}>;

export type OwnerMatchupSummaryCoverage = Readonly<{
  sourceProjectionRecords: number;
  uniqueSourceProjectionKeys: number;
  duplicateSourceProjectionKeys: readonly string[];
  careerSummariesCreated: number;
  seasonSummariesCreated: number;
  opponentSummariesCreated: number;
  careerProjectionConsumptions: number;
  seasonProjectionConsumptions: number;
  expectedOpponentRelationshipConsumptions: number;
  actualOpponentRelationshipConsumptions: number;
  projectionKeysMissingFromCareerSummaries: readonly string[];
  projectionKeysRepeatedInCareerSummaries: readonly string[];
  projectionKeysMissingFromSeasonSummaries: readonly string[];
  projectionKeysRepeatedInSeasonSummaries: readonly string[];
  careerSeasonReconciliationFailures: readonly string[];
  careerProjectionReconciliationFailures: readonly string[];
  classificationReconciliationFailures: readonly string[];
  titleGameSubsetViolations: readonly string[];
  opponentPairDuplicateCanonicalKeys: readonly string[];
  teammateOpponentSummaryViolations: readonly string[];
  unknownOwnerSummaryIds: readonly string[];
  helperAccountSummaryViolations: readonly string[];
  duplicateCareerSummaryKeys: readonly string[];
  duplicateSeasonSummaryKeys: readonly string[];
  duplicateOpponentSummaryKeys: readonly string[];
  noSourceOwnerSeasons: number;
  sourceAvailableNoGameOwnerSeasons: number;
  projectionCanonicalKeysObserved: number;
  byOwner: readonly OwnerMatchupSummaryOwnerCoverage[];
  bySeason: readonly OwnerMatchupSummarySeasonCoverage[];
  byClassification: Readonly<Record<CanonicalMatchupType, number>>;
}>;

export type OwnerMatchupSummaryBuildInput = {
  projections: readonly OwnerMatchupProjection[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
  ownerProfiles: readonly Pick<
    OwnerProfile,
    "id" | "slug" | "status"
  >[];
  projectionCoverage: OwnerMatchupProjectionCoverage;
};

export type OwnerMatchupSummaryBuildResult = Readonly<{
  careerSummaries: readonly OwnerCareerMatchupSummary[];
  seasonSummaries: readonly OwnerSeasonMatchupSummary[];
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
  coverage: OwnerMatchupSummaryCoverage;
}>;

type OwnerProfileInput = OwnerMatchupSummaryBuildInput["ownerProfiles"][number];

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

let cachedCareerSummaries: OwnerCareerMatchupSummary[] | null = null;
let cachedSeasonSummaries: OwnerSeasonMatchupSummary[] | null = null;
let cachedOpponentSummaries: OwnerOpponentMatchupSummary[] | null = null;
let cachedCoverage: OwnerMatchupSummaryCoverage | null = null;

function normalizeOwnerId(ownerIdOrSlug: string) {
  return ownerIdOrSlug.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveOwnerId(ownerIdOrSlug: string) {
  const normalized = normalizeOwnerId(ownerIdOrSlug);
  return (
    requireCareerSummaries().find(
      (summary) =>
        summary.ownerId === normalized || summary.ownerSlug === normalized
    )?.ownerId ?? normalized
  );
}

function uniqueSortedStrings(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function uniqueSortedNumbers(values: readonly number[]) {
  return [...new Set(values)].sort((first, second) => first - second);
}

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function countValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
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

function emptyClassificationTotals() {
  return Object.fromEntries(
    MATCHUP_TYPES.map((matchupType) => [matchupType, 0])
  ) as Record<CanonicalMatchupType, number>;
}

function compareProjection(
  first: OwnerMatchupProjection,
  second: OwnerMatchupProjection
) {
  return (
    first.season - second.season ||
    first.week - second.week ||
    first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey) ||
    first.ownerMatchupKey.localeCompare(second.ownerMatchupKey)
  );
}

function dedupeByOwnerMatchupKey(
  projections: readonly OwnerMatchupProjection[]
) {
  const seen = new Set<string>();
  return [...projections]
    .sort((first, second) =>
      first.ownerMatchupKey.localeCompare(second.ownerMatchupKey)
    )
    .filter((projection) => {
      if (seen.has(projection.ownerMatchupKey)) return false;
      seen.add(projection.ownerMatchupKey);
      return true;
    });
}

function dedupeByCanonicalMatchupKey(
  projections: readonly OwnerMatchupProjection[]
) {
  const seen = new Set<string>();
  return [...projections]
    .sort(compareProjection)
    .filter((projection) => {
      if (seen.has(projection.canonicalMatchupKey)) return false;
      seen.add(projection.canonicalMatchupKey);
      return true;
    });
}

function buildRecord(
  source: readonly OwnerMatchupProjection[]
): OwnerMatchupRecord {
  const projections = dedupeByOwnerMatchupKey(source);
  const games = projections.length;
  const wins = projections.filter(
    (projection) => projection.result === "win"
  ).length;
  const losses = projections.filter(
    (projection) => projection.result === "loss"
  ).length;
  const ties = projections.filter(
    (projection) => projection.result === "tie"
  ).length;
  const pointsFor = compensatedSum(
    projections.map((projection) => projection.pointsFor)
  );
  const pointsAgainst = compensatedSum(
    projections.map((projection) => projection.pointsAgainst)
  );

  return Object.freeze({
    games,
    wins,
    losses,
    ties,
    winningPercentage: games > 0 ? (wins + 0.5 * ties) / games : null,
    pointsFor,
    pointsAgainst,
    pointDifferential: pointsFor - pointsAgainst,
  });
}

function buildRecordSplits(
  projections: readonly OwnerMatchupProjection[]
): OwnerMatchupRecordSplits {
  return Object.freeze({
    overall: buildRecord(
      projections.filter(
        (projection) => projection.eligibility.overallCompetitive
      )
    ),
    regularSeason: buildRecord(
      projections.filter(
        (projection) => projection.matchupType === "regular"
      )
    ),
    championshipPlayoff: buildRecord(
      projections.filter(
        (projection) =>
          projection.matchupType === "championship-playoff"
      )
    ),
    championshipGames: buildRecord(
      projections.filter(
        (projection) =>
          projection.matchupType === "championship-playoff" &&
          projection.isChampionshipGame
      )
    ),
    thirdPlace: buildRecord(
      projections.filter(
        (projection) => projection.matchupType === "third-place"
      )
    ),
    placement: buildRecord(
      projections.filter(
        (projection) => projection.matchupType === "placement"
      )
    ),
    consolation: buildRecord(
      projections.filter(
        (projection) => projection.matchupType === "consolation"
      )
    ),
    toiletBowl: buildRecord(
      projections.filter(
        (projection) => projection.matchupType === "toilet-bowl"
      )
    ),
  });
}

function toReference(
  projection: OwnerMatchupProjection
): OwnerMatchupReference {
  return Object.freeze({
    ownerMatchupKey: projection.ownerMatchupKey,
    canonicalMatchupKey: projection.canonicalMatchupKey,
    season: projection.season,
    week: projection.week,
    matchupType: projection.matchupType,
    isChampionshipGame: projection.isChampionshipGame,
    result: projection.result,
    pointsFor: projection.pointsFor,
    pointsAgainst: projection.pointsAgainst,
    margin: projection.margin,
  });
}

function firstProjection(
  projections: readonly OwnerMatchupProjection[]
) {
  return [...projections].sort(compareProjection)[0] ?? null;
}

function latestProjection(
  projections: readonly OwnerMatchupProjection[]
) {
  return [...projections].sort(compareProjection).at(-1) ?? null;
}

function buildLineage(
  projections: readonly OwnerMatchupProjection[]
): OwnerMatchupSummaryLineage {
  return Object.freeze({
    ownerMatchupKeys: Object.freeze(
      uniqueSortedStrings(
        projections.map((projection) => projection.ownerMatchupKey)
      )
    ),
    canonicalMatchupKeys: Object.freeze(
      uniqueSortedStrings(
        projections.map((projection) => projection.canonicalMatchupKey)
      )
    ),
    ownerSeasonKeys: Object.freeze(
      uniqueSortedStrings(
        projections.map((projection) => projection.ownerSeasonKey)
      )
    ),
    correctionVersions: Object.freeze(
      uniqueSortedNumbers(
        projections.map(
          (projection) => projection.canonicalLineage.correctionVersion
        )
      )
    ),
    sourceVersions: Object.freeze(
      uniqueSortedStrings(
        projections.map(
          (projection) => projection.canonicalLineage.sourceVersion
        )
      )
    ),
    source: "owner-matchup-projection",
  });
}

function careerSummaryKey(ownerId: string) {
  return `owner-matchup-summary:career:${ownerId}`;
}

function seasonSummaryKey(ownerId: string, season: number) {
  return `owner-matchup-summary:season:${season}:owner:${ownerId}`;
}

function opponentSummaryKey(ownerId: string, opponentOwnerId: string) {
  return `owner-matchup-summary:opponent:${ownerId}:vs:${opponentOwnerId}`;
}

function buildSourceAvailability({
  season,
  projections,
  projectionCoverage,
}: {
  season: number;
  projections: readonly OwnerMatchupProjection[];
  projectionCoverage: OwnerMatchupProjectionCoverage;
}): OwnerMatchupSourceAvailability {
  if (projections.length > 0) return "available";
  if (projectionCoverage.seasonsRequested.includes(season)) {
    return "available-no-completed-games";
  }
  return "unavailable-no-source";
}

function buildSeasonSummaries(
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[],
  projections: readonly OwnerMatchupProjection[],
  projectionCoverage: OwnerMatchupProjectionCoverage
) {
  const grouped = new Map<string, OwnerSeasonHistoryRecord[]>();

  ownerSeasonRecords.forEach((record) => {
    if (record.ownerId === null) return;
    const key = `${record.season}:${record.ownerId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  });

  return [...grouped.values()]
    .map((records) => {
      const firstRecord = records[0];
      const ownerId = firstRecord.ownerId as string;
      const season = firstRecord.season;
      const seasonProjections = dedupeByOwnerMatchupKey(
        projections.filter(
          (projection) =>
            projection.ownerId === ownerId &&
            projection.season === season
        )
      );
      const first = firstProjection(seasonProjections);
      const latest = latestProjection(seasonProjections);

      return Object.freeze({
        summaryKey: seasonSummaryKey(ownerId, season),
        summaryType: "season" as const,
        ownerId,
        season,
        ownerSeasonKeys: Object.freeze(
          uniqueSortedStrings(
            records.map((record) => record.ownerSeasonKey)
          )
        ),
        franchiseIds: Object.freeze(
          uniqueSortedStrings(
            records.flatMap((record) =>
              record.franchiseId === null ? [] : [record.franchiseId]
            )
          )
        ),
        ownershipRoles: Object.freeze(
          uniqueSortedStrings(
            records.flatMap((record) =>
              record.ownershipRole === null
                ? []
                : [record.ownershipRole]
            )
          ) as OwnershipRole[]
        ),
        records: buildRecordSplits(seasonProjections),
        firstMatchup: first ? toReference(first) : null,
        latestMatchup: latest ? toReference(latest) : null,
        opponentOwnerIds: Object.freeze(
          uniqueSortedStrings(
            seasonProjections.flatMap((projection) =>
              projection.opponentOwners.map(
                (opponent) => opponent.ownerId
              )
            )
          )
        ),
        streaks: null,
        lineage: buildLineage(seasonProjections),
        coverage: Object.freeze({
          sourceAvailability: buildSourceAvailability({
            season,
            projections: seasonProjections,
            projectionCoverage,
          }),
          projectionsConsumed: seasonProjections.length,
        }),
      });
    })
    .sort((first, second) =>
      first.summaryKey.localeCompare(second.summaryKey)
    );
}

function chooseClosest(
  projections: readonly OwnerMatchupProjection[]
) {
  return (
    [...projections].sort(
      (first, second) =>
        Math.abs(first.margin) - Math.abs(second.margin) ||
        compareProjection(first, second)
    )[0] ?? null
  );
}

function chooseLargestVictory(
  projections: readonly OwnerMatchupProjection[]
) {
  return (
    projections
      .filter((projection) => projection.result === "win")
      .sort(
        (first, second) =>
          second.margin - first.margin ||
          compareProjection(first, second)
      )[0] ?? null
  );
}

function chooseLargestDefeat(
  projections: readonly OwnerMatchupProjection[]
) {
  return (
    projections
      .filter((projection) => projection.result === "loss")
      .sort(
        (first, second) =>
          first.margin - second.margin ||
          compareProjection(first, second)
      )[0] ?? null
  );
}

function buildOpponentSummaries(
  projections: readonly OwnerMatchupProjection[]
) {
  const grouped = new Map<string, OwnerMatchupProjection[]>();

  projections.forEach((projection) => {
    projection.opponentOwners.forEach((opponent) => {
      if (
        opponent.ownerId === projection.ownerId ||
        projection.teammateOwnerIds.includes(opponent.ownerId)
      ) {
        return;
      }
      const key = `${projection.ownerId}:${opponent.ownerId}`;
      grouped.set(key, [...(grouped.get(key) ?? []), projection]);
    });
  });

  return [...grouped.entries()]
    .map(([pairKey, pairProjections]) => {
      const separatorIndex = pairKey.indexOf(":");
      const ownerId = pairKey.slice(0, separatorIndex);
      const opponentOwnerId = pairKey.slice(separatorIndex + 1);
      const duplicateCanonicalMatchupKeys = duplicateValues(
        pairProjections.map(
          (projection) => projection.canonicalMatchupKey
        )
      );
      const meetings = dedupeByCanonicalMatchupKey(pairProjections);
      const first = firstProjection(meetings) as OwnerMatchupProjection;
      const latest = latestProjection(meetings) as OwnerMatchupProjection;
      const closest = chooseClosest(meetings);
      const largestVictory = chooseLargestVictory(meetings);
      const largestDefeat = chooseLargestDefeat(meetings);

      return Object.freeze({
        summaryKey: opponentSummaryKey(ownerId, opponentOwnerId),
        summaryType: "opponent" as const,
        ownerId,
        opponentOwnerId,
        meetings: meetings.length,
        records: buildRecordSplits(meetings),
        firstMeeting: toReference(first),
        latestMeeting: toReference(latest),
        seasons: Object.freeze(
          uniqueSortedNumbers(
            meetings.map((projection) => projection.season)
          )
        ),
        canonicalMatchupKeys: Object.freeze(
          uniqueSortedStrings(
            meetings.map(
              (projection) => projection.canonicalMatchupKey
            )
          )
        ),
        ownerMatchupKeys: Object.freeze(
          uniqueSortedStrings(
            meetings.map((projection) => projection.ownerMatchupKey)
          )
        ),
        franchiseIds: Object.freeze(
          uniqueSortedStrings(
            meetings.map(
              (projection) => projection.ownerFranchiseId
            )
          )
        ),
        opponentFranchiseIds: Object.freeze(
          uniqueSortedStrings(
            meetings.map(
              (projection) => projection.opponentFranchiseId
            )
          )
        ),
        coOwnerContext: Object.freeze({
          meetingsWhereOwnerHadTeammates: meetings.filter(
            (projection) => projection.teammateOwnerIds.length > 0
          ).length,
          meetingsWhereOpponentHadTeammates: meetings.filter(
            (projection) => projection.opponentOwners.length > 1
          ).length,
          teammateOwnerIdsEncountered: Object.freeze(
            uniqueSortedStrings(
              meetings.flatMap(
                (projection) => projection.teammateOwnerIds
              )
            )
          ),
          otherOpponentOwnerIdsEncountered: Object.freeze(
            uniqueSortedStrings(
              meetings.flatMap((projection) =>
                projection.opponentOwners
                  .map((opponent) => opponent.ownerId)
                  .filter(
                    (candidateOwnerId) =>
                      candidateOwnerId !== opponentOwnerId
                  )
              )
            )
          ),
        }),
        factualExtremes: Object.freeze({
          closestMeeting: closest ? toReference(closest) : null,
          largestVictory: largestVictory
            ? toReference(largestVictory)
            : null,
          largestDefeat: largestDefeat
            ? toReference(largestDefeat)
            : null,
        }),
        streaks: null,
        lineage: buildLineage(meetings),
        coverage: Object.freeze({
          projectionsConsumed: meetings.length,
          uniqueCanonicalMeetings: meetings.length,
          duplicateCanonicalMatchupKeys: Object.freeze(
            duplicateCanonicalMatchupKeys
          ),
        }),
      });
    })
    .sort((first, second) =>
      first.summaryKey.localeCompare(second.summaryKey)
    );
}

function buildCareerSummaries({
  ownerProfiles,
  ownerSeasonRecords,
  projections,
  seasonSummaries,
  opponentSummaries,
}: {
  ownerProfiles: readonly OwnerProfileInput[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
  projections: readonly OwnerMatchupProjection[];
  seasonSummaries: readonly OwnerSeasonMatchupSummary[];
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
}) {
  return [...ownerProfiles]
    .sort((first, second) => first.id.localeCompare(second.id))
    .map((owner) => {
      const ownerProjections = dedupeByOwnerMatchupKey(
        projections.filter(
          (projection) => projection.ownerId === owner.id
        )
      );
      const ownerSeasonSummaries = seasonSummaries.filter(
        (summary) => summary.ownerId === owner.id
      );
      const ownerOpponentSummaries = opponentSummaries.filter(
        (summary) => summary.ownerId === owner.id
      );
      const participationSeasons = uniqueSortedNumbers(
        ownerSeasonRecords.flatMap((record) =>
          record.ownerId === owner.id ? [record.season] : []
        )
      );
      const seasonsWithMatchupData = uniqueSortedNumbers(
        ownerProjections.map((projection) => projection.season)
      );
      const seasonsWithoutMatchupSource = ownerSeasonSummaries
        .filter(
          (summary) =>
            summary.coverage.sourceAvailability ===
            "unavailable-no-source"
        )
        .map((summary) => summary.season)
        .sort((first, second) => first - second);
      const seasonsWithSourceButNoCompletedGames = ownerSeasonSummaries
        .filter(
          (summary) =>
            summary.coverage.sourceAvailability ===
            "available-no-completed-games"
        )
        .map((summary) => summary.season)
        .sort((first, second) => first - second);
      const first = firstProjection(ownerProjections);
      const latest = latestProjection(ownerProjections);
      const sourceAvailability: OwnerMatchupSourceAvailability =
        ownerSeasonSummaries.length === 0
          ? "not-applicable"
          : ownerProjections.length > 0
            ? "available"
            : ownerSeasonSummaries.some(
                  (summary) =>
                    summary.coverage.sourceAvailability ===
                    "available-no-completed-games"
                )
              ? "available-no-completed-games"
              : "unavailable-no-source";

      return Object.freeze({
        summaryKey: careerSummaryKey(owner.id),
        summaryType: "career" as const,
        ownerId: owner.id,
        ownerSlug: owner.slug,
        ownerStatus: owner.status,
        records: buildRecordSplits(ownerProjections),
        firstMatchup: first ? toReference(first) : null,
        latestMatchup: latest ? toReference(latest) : null,
        firstMatchupSeason: first?.season ?? null,
        latestMatchupSeason: latest?.season ?? null,
        approvedParticipationSeasons: Object.freeze(
          participationSeasons
        ),
        seasonsWithMatchupData: Object.freeze(
          seasonsWithMatchupData
        ),
        seasonsWithoutMatchupSource: Object.freeze(
          seasonsWithoutMatchupSource
        ),
        seasonsWithSourceButNoCompletedGames: Object.freeze(
          seasonsWithSourceButNoCompletedGames
        ),
        seasonSummaryKeys: Object.freeze(
          ownerSeasonSummaries.map((summary) => summary.summaryKey).sort()
        ),
        opponentSummaryKeys: Object.freeze(
          ownerOpponentSummaries
            .map((summary) => summary.summaryKey)
            .sort()
        ),
        streaks: null,
        lineage: buildLineage(ownerProjections),
        coverage: Object.freeze({
          sourceAvailability,
          projectionsConsumed: ownerProjections.length,
          ownerSeasonsRepresented: ownerSeasonSummaries.length,
          noSourceSeasons: seasonsWithoutMatchupSource.length,
          sourceAvailableNoGameSeasons:
            seasonsWithSourceButNoCompletedGames.length,
        }),
      });
    });
}

function recordSignature(record: OwnerMatchupRecord) {
  return JSON.stringify(record);
}

function splitSignatures(splits: OwnerMatchupRecordSplits) {
  return Object.entries(splits)
    .map(([key, record]) => `${key}:${recordSignature(record)}`)
    .sort()
    .join("|");
}

function buildCoverage({
  input,
  projections,
  careerSummaries,
  seasonSummaries,
  opponentSummaries,
}: {
  input: OwnerMatchupSummaryBuildInput;
  projections: readonly OwnerMatchupProjection[];
  careerSummaries: readonly OwnerCareerMatchupSummary[];
  seasonSummaries: readonly OwnerSeasonMatchupSummary[];
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
}): OwnerMatchupSummaryCoverage {
  const sourceKeys = input.projections.map(
    (projection) => projection.ownerMatchupKey
  );
  const uniqueSourceKeys = uniqueSortedStrings(sourceKeys);
  const careerKeys = careerSummaries.flatMap(
    (summary) => summary.lineage.ownerMatchupKeys
  );
  const seasonKeys = seasonSummaries.flatMap(
    (summary) => summary.lineage.ownerMatchupKeys
  );
  const careerCounts = countValues(careerKeys);
  const seasonCounts = countValues(seasonKeys);
  const careerByOwner = new Map(
    careerSummaries.map((summary) => [summary.ownerId, summary])
  );
  const seasonsByOwner = new Map<string, OwnerSeasonMatchupSummary[]>();
  seasonSummaries.forEach((summary) => {
    seasonsByOwner.set(summary.ownerId, [
      ...(seasonsByOwner.get(summary.ownerId) ?? []),
      summary,
    ]);
  });
  const careerSeasonReconciliationFailures: string[] = [];
  const careerProjectionReconciliationFailures: string[] = [];

  careerSummaries.forEach((career) => {
    const seasonProjectionKeys = uniqueSortedStrings(
      (seasonsByOwner.get(career.ownerId) ?? []).flatMap(
        (summary) => summary.lineage.ownerMatchupKeys
      )
    );
    if (
      JSON.stringify(seasonProjectionKeys) !==
      JSON.stringify(career.lineage.ownerMatchupKeys)
    ) {
      careerSeasonReconciliationFailures.push(career.ownerId);
      return;
    }

    const ownerProjections = projections.filter(
      (projection) => projection.ownerId === career.ownerId
    );
    const expectedSplits = buildRecordSplits(ownerProjections);
    if (splitSignatures(expectedSplits) !== splitSignatures(career.records)) {
      careerProjectionReconciliationFailures.push(career.ownerId);
    }
  });

  const classificationReconciliationFailures = projections
    .filter((projection) => {
      const career = careerByOwner.get(projection.ownerId);
      if (!career) return true;
      const split =
        projection.matchupType === "regular"
          ? career.records.regularSeason
          : projection.matchupType === "championship-playoff"
            ? career.records.championshipPlayoff
            : projection.matchupType === "third-place"
              ? career.records.thirdPlace
              : projection.matchupType === "placement"
                ? career.records.placement
                : projection.matchupType === "consolation"
                  ? career.records.consolation
                  : projection.matchupType === "toilet-bowl"
                    ? career.records.toiletBowl
                    : null;
      return split === null;
    })
    .map((projection) => projection.ownerMatchupKey)
    .sort();
  const titleGameSubsetViolations = projections
    .filter(
      (projection) =>
        projection.isChampionshipGame &&
        projection.matchupType !== "championship-playoff"
    )
    .map((projection) => projection.ownerMatchupKey)
    .sort();
  const opponentPairDuplicateCanonicalKeys = opponentSummaries
    .filter(
      (summary) =>
        summary.coverage.duplicateCanonicalMatchupKeys.length > 0
    )
    .map((summary) => summary.summaryKey)
    .sort();
  const teammateOpponentSummaryViolations = opponentSummaries
    .filter((summary) =>
      projections.some(
        (projection) =>
          projection.ownerId === summary.ownerId &&
          summary.canonicalMatchupKeys.includes(
            projection.canonicalMatchupKey
          ) &&
          projection.teammateOwnerIds.includes(
            summary.opponentOwnerId
          )
      )
    )
    .map((summary) => summary.summaryKey)
    .sort();
  const profileOwnerIds = new Set(
    input.ownerProfiles.map((owner) => owner.id)
  );
  const unknownOwnerSummaryIds = uniqueSortedStrings(
    [
      ...careerSummaries.map((summary) => summary.ownerId),
      ...seasonSummaries.map((summary) => summary.ownerId),
      ...opponentSummaries.flatMap((summary) => [
        summary.ownerId,
        summary.opponentOwnerId,
      ]),
    ].filter((ownerId) => !profileOwnerIds.has(ownerId))
  );
  const resolvedOwnerSeasonKeys = new Set(
    input.ownerSeasonRecords.flatMap((record) =>
      record.ownerId === null ? [] : [record.ownerSeasonKey]
    )
  );
  const helperAccountSummaryViolations = projections
    .filter(
      (projection) =>
        !profileOwnerIds.has(projection.ownerId) ||
        !resolvedOwnerSeasonKeys.has(projection.ownerSeasonKey) ||
        projection.opponentOwners.some(
          (opponent) =>
            !profileOwnerIds.has(opponent.ownerId) ||
            !resolvedOwnerSeasonKeys.has(opponent.ownerSeasonKey)
        )
    )
    .map((projection) => projection.ownerMatchupKey)
    .sort();
  const byClassification = emptyClassificationTotals();
  projections.forEach((projection) => {
    byClassification[projection.matchupType] += 1;
  });
  const ownerIds = uniqueSortedStrings([
    ...input.ownerProfiles.map((owner) => owner.id),
    ...projections.map((projection) => projection.ownerId),
  ]);
  const byOwner = ownerIds.map((ownerId) =>
    Object.freeze({
      ownerId,
      sourceProjections: projections.filter(
        (projection) => projection.ownerId === ownerId
      ).length,
      careerConsumptions: careerSummaries
        .filter((summary) => summary.ownerId === ownerId)
        .reduce(
          (total, summary) =>
            total + summary.lineage.ownerMatchupKeys.length,
          0
        ),
      seasonConsumptions: seasonSummaries
        .filter((summary) => summary.ownerId === ownerId)
        .reduce(
          (total, summary) =>
            total + summary.lineage.ownerMatchupKeys.length,
          0
        ),
      opponentRelationshipConsumptions: opponentSummaries
        .filter((summary) => summary.ownerId === ownerId)
        .reduce((total, summary) => total + summary.meetings, 0),
    })
  );
  const allSeasons = uniqueSortedNumbers([
    ...input.projectionCoverage.seasonsRequested,
    ...seasonSummaries.map((summary) => summary.season),
  ]);
  const bySeason = allSeasons.map((season) =>
    Object.freeze({
      season,
      sourceProjections: projections.filter(
        (projection) => projection.season === season
      ).length,
      seasonConsumptions: seasonSummaries
        .filter((summary) => summary.season === season)
        .reduce(
          (total, summary) =>
            total + summary.lineage.ownerMatchupKeys.length,
          0
        ),
      summariesCreated: seasonSummaries.filter(
        (summary) => summary.season === season
      ).length,
    })
  );

  return Object.freeze({
    sourceProjectionRecords: input.projections.length,
    uniqueSourceProjectionKeys: uniqueSourceKeys.length,
    duplicateSourceProjectionKeys: Object.freeze(
      duplicateValues(sourceKeys)
    ),
    careerSummariesCreated: careerSummaries.length,
    seasonSummariesCreated: seasonSummaries.length,
    opponentSummariesCreated: opponentSummaries.length,
    careerProjectionConsumptions: careerKeys.length,
    seasonProjectionConsumptions: seasonKeys.length,
    expectedOpponentRelationshipConsumptions: projections.reduce(
      (total, projection) =>
        total + projection.opponentOwners.length,
      0
    ),
    actualOpponentRelationshipConsumptions: opponentSummaries.reduce(
      (total, summary) => total + summary.meetings,
      0
    ),
    projectionKeysMissingFromCareerSummaries: Object.freeze(
      uniqueSourceKeys.filter((key) => !careerCounts.has(key))
    ),
    projectionKeysRepeatedInCareerSummaries: Object.freeze(
      [...careerCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
        .sort()
    ),
    projectionKeysMissingFromSeasonSummaries: Object.freeze(
      uniqueSourceKeys.filter((key) => !seasonCounts.has(key))
    ),
    projectionKeysRepeatedInSeasonSummaries: Object.freeze(
      [...seasonCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
        .sort()
    ),
    careerSeasonReconciliationFailures: Object.freeze(
      careerSeasonReconciliationFailures.sort()
    ),
    careerProjectionReconciliationFailures: Object.freeze(
      careerProjectionReconciliationFailures.sort()
    ),
    classificationReconciliationFailures: Object.freeze(
      classificationReconciliationFailures
    ),
    titleGameSubsetViolations: Object.freeze(titleGameSubsetViolations),
    opponentPairDuplicateCanonicalKeys: Object.freeze(
      opponentPairDuplicateCanonicalKeys
    ),
    teammateOpponentSummaryViolations: Object.freeze(
      teammateOpponentSummaryViolations
    ),
    unknownOwnerSummaryIds: Object.freeze(unknownOwnerSummaryIds),
    helperAccountSummaryViolations: Object.freeze(
      helperAccountSummaryViolations
    ),
    duplicateCareerSummaryKeys: Object.freeze(
      duplicateValues(
        careerSummaries.map((summary) => summary.summaryKey)
      )
    ),
    duplicateSeasonSummaryKeys: Object.freeze(
      duplicateValues(
        seasonSummaries.map((summary) => summary.summaryKey)
      )
    ),
    duplicateOpponentSummaryKeys: Object.freeze(
      duplicateValues(
        opponentSummaries.map((summary) => summary.summaryKey)
      )
    ),
    noSourceOwnerSeasons: seasonSummaries.filter(
      (summary) =>
        summary.coverage.sourceAvailability ===
        "unavailable-no-source"
    ).length,
    sourceAvailableNoGameOwnerSeasons: seasonSummaries.filter(
      (summary) =>
        summary.coverage.sourceAvailability ===
        "available-no-completed-games"
    ).length,
    projectionCanonicalKeysObserved: uniqueSortedStrings(
      projections.map(
        (projection) => projection.canonicalMatchupKey
      )
    ).length,
    byOwner: Object.freeze(byOwner),
    bySeason: Object.freeze(bySeason),
    byClassification: Object.freeze(byClassification),
  });
}

function freezeRecord(record: OwnerMatchupRecord) {
  return Object.freeze({ ...record });
}

function freezeSplits(splits: OwnerMatchupRecordSplits) {
  return Object.freeze({
    overall: freezeRecord(splits.overall),
    regularSeason: freezeRecord(splits.regularSeason),
    championshipPlayoff: freezeRecord(splits.championshipPlayoff),
    championshipGames: freezeRecord(splits.championshipGames),
    thirdPlace: freezeRecord(splits.thirdPlace),
    placement: freezeRecord(splits.placement),
    consolation: freezeRecord(splits.consolation),
    toiletBowl: freezeRecord(splits.toiletBowl),
  });
}

function freezeReference(reference: OwnerMatchupReference | null) {
  return reference ? Object.freeze({ ...reference }) : null;
}

function freezeLineage(lineage: OwnerMatchupSummaryLineage) {
  return Object.freeze({
    ...lineage,
    ownerMatchupKeys: Object.freeze([...lineage.ownerMatchupKeys]),
    canonicalMatchupKeys: Object.freeze([
      ...lineage.canonicalMatchupKeys,
    ]),
    ownerSeasonKeys: Object.freeze([...lineage.ownerSeasonKeys]),
    correctionVersions: Object.freeze([...lineage.correctionVersions]),
    sourceVersions: Object.freeze([...lineage.sourceVersions]),
  });
}

function cloneCareerSummary(summary: OwnerCareerMatchupSummary) {
  return Object.freeze({
    ...summary,
    records: freezeSplits(summary.records),
    firstMatchup: freezeReference(summary.firstMatchup),
    latestMatchup: freezeReference(summary.latestMatchup),
    approvedParticipationSeasons: Object.freeze([
      ...summary.approvedParticipationSeasons,
    ]),
    seasonsWithMatchupData: Object.freeze([
      ...summary.seasonsWithMatchupData,
    ]),
    seasonsWithoutMatchupSource: Object.freeze([
      ...summary.seasonsWithoutMatchupSource,
    ]),
    seasonsWithSourceButNoCompletedGames: Object.freeze([
      ...summary.seasonsWithSourceButNoCompletedGames,
    ]),
    seasonSummaryKeys: Object.freeze([...summary.seasonSummaryKeys]),
    opponentSummaryKeys: Object.freeze([...summary.opponentSummaryKeys]),
    streaks: null,
    lineage: freezeLineage(summary.lineage),
    coverage: Object.freeze({ ...summary.coverage }),
  });
}

function cloneSeasonSummary(summary: OwnerSeasonMatchupSummary) {
  return Object.freeze({
    ...summary,
    ownerSeasonKeys: Object.freeze([...summary.ownerSeasonKeys]),
    franchiseIds: Object.freeze([...summary.franchiseIds]),
    ownershipRoles: Object.freeze([...summary.ownershipRoles]),
    records: freezeSplits(summary.records),
    firstMatchup: freezeReference(summary.firstMatchup),
    latestMatchup: freezeReference(summary.latestMatchup),
    opponentOwnerIds: Object.freeze([...summary.opponentOwnerIds]),
    streaks: null,
    lineage: freezeLineage(summary.lineage),
    coverage: Object.freeze({ ...summary.coverage }),
  });
}

function cloneOpponentSummary(summary: OwnerOpponentMatchupSummary) {
  return Object.freeze({
    ...summary,
    records: freezeSplits(summary.records),
    firstMeeting: freezeReference(summary.firstMeeting) as OwnerMatchupReference,
    latestMeeting: freezeReference(summary.latestMeeting) as OwnerMatchupReference,
    seasons: Object.freeze([...summary.seasons]),
    canonicalMatchupKeys: Object.freeze([
      ...summary.canonicalMatchupKeys,
    ]),
    ownerMatchupKeys: Object.freeze([...summary.ownerMatchupKeys]),
    franchiseIds: Object.freeze([...summary.franchiseIds]),
    opponentFranchiseIds: Object.freeze([
      ...summary.opponentFranchiseIds,
    ]),
    coOwnerContext: Object.freeze({
      ...summary.coOwnerContext,
      teammateOwnerIdsEncountered: Object.freeze([
        ...summary.coOwnerContext.teammateOwnerIdsEncountered,
      ]),
      otherOpponentOwnerIdsEncountered: Object.freeze([
        ...summary.coOwnerContext.otherOpponentOwnerIdsEncountered,
      ]),
    }),
    factualExtremes: Object.freeze({
      closestMeeting: freezeReference(
        summary.factualExtremes.closestMeeting
      ),
      largestVictory: freezeReference(
        summary.factualExtremes.largestVictory
      ),
      largestDefeat: freezeReference(
        summary.factualExtremes.largestDefeat
      ),
    }),
    streaks: null,
    lineage: freezeLineage(summary.lineage),
    coverage: Object.freeze({
      ...summary.coverage,
      duplicateCanonicalMatchupKeys: Object.freeze([
        ...summary.coverage.duplicateCanonicalMatchupKeys,
      ]),
    }),
  });
}

function cloneCoverage(coverage: OwnerMatchupSummaryCoverage) {
  return Object.freeze({
    ...coverage,
    duplicateSourceProjectionKeys: Object.freeze([
      ...coverage.duplicateSourceProjectionKeys,
    ]),
    projectionKeysMissingFromCareerSummaries: Object.freeze([
      ...coverage.projectionKeysMissingFromCareerSummaries,
    ]),
    projectionKeysRepeatedInCareerSummaries: Object.freeze([
      ...coverage.projectionKeysRepeatedInCareerSummaries,
    ]),
    projectionKeysMissingFromSeasonSummaries: Object.freeze([
      ...coverage.projectionKeysMissingFromSeasonSummaries,
    ]),
    projectionKeysRepeatedInSeasonSummaries: Object.freeze([
      ...coverage.projectionKeysRepeatedInSeasonSummaries,
    ]),
    careerSeasonReconciliationFailures: Object.freeze([
      ...coverage.careerSeasonReconciliationFailures,
    ]),
    careerProjectionReconciliationFailures: Object.freeze([
      ...coverage.careerProjectionReconciliationFailures,
    ]),
    classificationReconciliationFailures: Object.freeze([
      ...coverage.classificationReconciliationFailures,
    ]),
    titleGameSubsetViolations: Object.freeze([
      ...coverage.titleGameSubsetViolations,
    ]),
    opponentPairDuplicateCanonicalKeys: Object.freeze([
      ...coverage.opponentPairDuplicateCanonicalKeys,
    ]),
    teammateOpponentSummaryViolations: Object.freeze([
      ...coverage.teammateOpponentSummaryViolations,
    ]),
    unknownOwnerSummaryIds: Object.freeze([
      ...coverage.unknownOwnerSummaryIds,
    ]),
    helperAccountSummaryViolations: Object.freeze([
      ...coverage.helperAccountSummaryViolations,
    ]),
    duplicateCareerSummaryKeys: Object.freeze([
      ...coverage.duplicateCareerSummaryKeys,
    ]),
    duplicateSeasonSummaryKeys: Object.freeze([
      ...coverage.duplicateSeasonSummaryKeys,
    ]),
    duplicateOpponentSummaryKeys: Object.freeze([
      ...coverage.duplicateOpponentSummaryKeys,
    ]),
    byOwner: Object.freeze(
      coverage.byOwner.map((owner) => Object.freeze({ ...owner }))
    ),
    bySeason: Object.freeze(
      coverage.bySeason.map((season) => Object.freeze({ ...season }))
    ),
    byClassification: Object.freeze({ ...coverage.byClassification }),
  });
}

function requireCareerSummaries() {
  if (cachedCareerSummaries === null) {
    throw new Error(
      "Owner matchup summaries are not initialized. Supply projection and coverage input to buildOwnerMatchupSummaries() first."
    );
  }
  return cachedCareerSummaries;
}

function requireSeasonSummaries() {
  if (cachedSeasonSummaries === null) {
    throw new Error(
      "Owner matchup summaries are not initialized. Build summaries first."
    );
  }
  return cachedSeasonSummaries;
}

function requireOpponentSummaries() {
  if (cachedOpponentSummaries === null) {
    throw new Error(
      "Owner matchup summaries are not initialized. Build summaries first."
    );
  }
  return cachedOpponentSummaries;
}

function requireCoverage() {
  if (cachedCoverage === null) {
    throw new Error(
      "Owner matchup summary coverage is not initialized. Build summaries first."
    );
  }
  return cachedCoverage;
}

export function buildOwnerMatchupSummaries(
  input: OwnerMatchupSummaryBuildInput
): OwnerMatchupSummaryBuildResult {
  const duplicateProfileIds = duplicateValues(
    input.ownerProfiles.map((owner) => owner.id)
  );
  if (duplicateProfileIds.length > 0) {
    throw new Error(
      `Owner matchup summary input has duplicate owner profiles: ${duplicateProfileIds.join(", ")}.`
    );
  }
  if (
    input.projectionCoverage.ownerProjectionRecordsCreated !==
    input.projections.length
  ) {
    throw new Error(
      "Owner matchup summary input does not reconcile with projection coverage."
    );
  }

  const projections = dedupeByOwnerMatchupKey(input.projections);
  const seasonSummaries = buildSeasonSummaries(
    input.ownerSeasonRecords,
    projections,
    input.projectionCoverage
  );
  const opponentSummaries = buildOpponentSummaries(projections);
  const careerSummaries = buildCareerSummaries({
    ownerProfiles: input.ownerProfiles,
    ownerSeasonRecords: input.ownerSeasonRecords,
    projections,
    seasonSummaries,
    opponentSummaries,
  });
  const coverage = buildCoverage({
    input,
    projections,
    careerSummaries,
    seasonSummaries,
    opponentSummaries,
  });

  cachedCareerSummaries = careerSummaries.map(cloneCareerSummary);
  cachedSeasonSummaries = seasonSummaries.map(cloneSeasonSummary);
  cachedOpponentSummaries = opponentSummaries.map(cloneOpponentSummary);
  cachedCoverage = cloneCoverage(coverage);

  return Object.freeze({
    careerSummaries: Object.freeze(
      careerSummaries.map(cloneCareerSummary)
    ),
    seasonSummaries: Object.freeze(
      seasonSummaries.map(cloneSeasonSummary)
    ),
    opponentSummaries: Object.freeze(
      opponentSummaries.map(cloneOpponentSummary)
    ),
    coverage: cloneCoverage(coverage),
  });
}

export function getAllOwnerCareerMatchupSummaries() {
  return Object.freeze(requireCareerSummaries().map(cloneCareerSummary));
}

export function getOwnerCareerMatchupSummary(ownerIdOrSlug: string) {
  const normalized = normalizeOwnerId(ownerIdOrSlug);
  const summary = requireCareerSummaries().find(
    (candidate) =>
      candidate.ownerId === normalized ||
      candidate.ownerSlug === normalized
  );
  return summary ? cloneCareerSummary(summary) : null;
}

export function getOwnerSeasonMatchupSummary(
  ownerIdOrSlug: string,
  season: number
) {
  const normalized = resolveOwnerId(ownerIdOrSlug);
  const summary = requireSeasonSummaries().find(
    (candidate) =>
      candidate.ownerId === normalized && candidate.season === season
  );
  return summary ? cloneSeasonSummary(summary) : null;
}

export function getOwnerSeasonMatchupSummaries(ownerIdOrSlug: string) {
  const normalized = resolveOwnerId(ownerIdOrSlug);
  return Object.freeze(
    requireSeasonSummaries()
      .filter((summary) => summary.ownerId === normalized)
      .map(cloneSeasonSummary)
  );
}

export function getOwnerOpponentMatchupSummary(
  ownerIdOrSlug: string,
  opponentOwnerIdOrSlug: string
) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  const opponentOwnerId = resolveOwnerId(opponentOwnerIdOrSlug);
  const summary = requireOpponentSummaries().find(
    (candidate) =>
      candidate.ownerId === ownerId &&
      candidate.opponentOwnerId === opponentOwnerId
  );
  return summary ? cloneOpponentSummary(summary) : null;
}

export function getOwnerOpponentMatchupSummaries(
  ownerIdOrSlug: string
) {
  const normalized = resolveOwnerId(ownerIdOrSlug);
  return Object.freeze(
    requireOpponentSummaries()
      .filter((summary) => summary.ownerId === normalized)
      .map(cloneOpponentSummary)
  );
}

export function getOwnerMatchupSummaryCoverage() {
  return cloneCoverage(requireCoverage());
}
