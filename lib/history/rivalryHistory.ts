import type {
  OwnerHeadToHeadCoverageState,
  OwnerHeadToHeadDetail,
  OwnerHeadToHeadMeeting,
} from "@/lib/history/ownerHeadToHeadDetail";
import type { OwnerMatchupReference } from "@/lib/history/ownerMatchupSummary";
import type {
  OwnerProfile,
  OwnerProfileStatus,
} from "@/lib/managers/identityTypes";

export const RIVALRY_SCORE_VERSION = "rivalry-score-v1" as const;

export const RIVALRY_SCORE_WEIGHTS = Object.freeze({
  competitiveness: 0.3,
  frequency: 0.25,
  postseasonSignificance: 0.2,
  recency: 0.15,
  longevity: 0.1,
});

export type RivalryDimensionName = keyof typeof RIVALRY_SCORE_WEIGHTS;

export type RivalryRecognitionSource =
  | "commissioner"
  | "owner-a"
  | "owner-b"
  | "mutual";

export type RivalryCuratedMetadata = Readonly<{
  isRecognized: boolean;
  recognitionSource: RivalryRecognitionSource | null;
  rivalryName: string | null;
  rivalryStory: string | null;
  rivalryStartSeason: number | null;
  displayPriority: number | null;
  notes: readonly string[];
}>;

export type RivalryCuratedRecognitionInput = Readonly<{
  ownerIds: readonly [string, string];
  isRecognized: boolean;
  recognitionSource?: RivalryRecognitionSource;
  rivalryName?: string;
  rivalryStory?: string;
  rivalryStartSeason?: number;
  displayPriority?: number;
  notes?: readonly string[];
}>;

export type RivalryDimensionScore = Readonly<{
  rawValue: number;
  normalizedValue: number | null;
  weight: number;
  weightedContribution: number | null;
}>;

export type RivalryDimensionScores = Readonly<
  Record<RivalryDimensionName, RivalryDimensionScore>
>;

export type RivalryScoreMethodology = Readonly<{
  version: typeof RIVALRY_SCORE_VERSION;
  scoreMinimum: 0;
  scoreMaximum: 100;
  minimumCompetitiveMeetings: 4;
  minimumCompetitiveSeasons: 2;
  competitiveClassifications: readonly [
    "regular",
    "championship-playoff",
  ];
  weights: Readonly<Record<RivalryDimensionName, number>>;
  normalization: "eligible-population-midrank-percentile";
  normalizationTieBehavior: string;
  populationBehavior: string;
  competitivenessFormula: string;
  postseasonFormula: string;
  recencyFormula: string;
  longevityFormula: string;
  streaks: null;
  streaksStatus: "deferred-to-future-analytics-layer";
  franchiseRivalriesStatus: "out-of-scope";
}>;

export type RivalryEligibilityReason =
  | "eligible"
  | "unavailable-source"
  | "no-completed-supported-meetings"
  | "insufficient-competitive-meetings"
  | "insufficient-competitive-seasons";

export type RivalryEligibility = Readonly<{
  isCalculatedRankingEligible: boolean;
  reason: RivalryEligibilityReason;
  competitiveMeetings: number;
  minimumCompetitiveMeetings: 4;
  competitiveSeasons: number;
  minimumCompetitiveSeasons: 2;
}>;

export type RivalryCoverageScope =
  | "full-supported-coverage"
  | "supported-era-only"
  | "supported-no-completed-meetings"
  | "unavailable-source";

export type RivalryCoverage = Readonly<{
  headToHeadStates: readonly [
    OwnerHeadToHeadCoverageState,
    OwnerHeadToHeadCoverageState,
  ];
  scope: RivalryCoverageScope;
  rankingRepresentsSupportedEraOnly: boolean;
  approvedOverlapSeasons: readonly number[];
  supportedOverlapSeasons: readonly number[];
  unsupportedOverlapSeasons: readonly number[];
  sourceEnabledNoMeetingSeasons: readonly number[];
}>;

export type RivalryDirectionalReference = Readonly<{
  ownerId: string;
  opponentOwnerId: string;
  relationshipKey: string;
  opponentSummaryKey: string | null;
  closestMeeting: OwnerMatchupReference | null;
  largestVictory: OwnerMatchupReference | null;
  largestDefeat: OwnerMatchupReference | null;
}>;

export type RivalryRawDimensionInputs = Readonly<{
  competitiveWinningPercentage: number | null;
  competitivenessBalance: number;
  competitiveMeetings: number;
  championshipPlayoffMeetings: number;
  championshipGameMeetings: number;
  postseasonSignificanceUnits: number;
  latestCompetitiveMeetingSeason: number | null;
  competitiveMeetingSeasons: readonly number[];
  distinctCompetitiveMeetingSeasons: number;
}>;

export type RivalryFactualContext = Readonly<{
  allCompletedMeetings: number;
  competitiveMeetings: number;
  regularMeetings: number;
  championshipPlayoffMeetings: number;
  championshipGameMeetings: number;
  thirdPlaceMeetings: number;
  placementMeetings: number;
  toiletBowlMeetings: number;
  consolationMeetings: number;
  averageAbsoluteMarginAllCompleted: number | null;
  uniqueCanonicalMatchupKeys: readonly string[];
  competitiveMeetingSeasons: readonly number[];
}>;

export type RivalrySummary = Readonly<{
  rivalryKey: string;
  ownerIds: readonly [string, string];
  ownerStatuses: readonly [OwnerProfileStatus, OwnerProfileStatus];
  directionalRelationships: readonly [
    RivalryDirectionalReference,
    RivalryDirectionalReference,
  ];
  eligibility: RivalryEligibility;
  calculatedScore: number | null;
  calculatedRank: number | null;
  rawDimensionInputs: RivalryRawDimensionInputs;
  dimensions: RivalryDimensionScores;
  factual: RivalryFactualContext;
  coverage: RivalryCoverage;
  curated: RivalryCuratedMetadata | null;
  methodologyVersion: typeof RIVALRY_SCORE_VERSION;
  streaks: null;
}>;

export type RivalryDimensionRange = Readonly<{
  rawMinimum: number | null;
  rawMaximum: number | null;
  normalizedMinimum: number | null;
  normalizedMaximum: number | null;
}>;

export type RivalryBuildCoverage = Readonly<{
  undirectedRivalryRecords: number;
  calculatedEligibleRivalries: number;
  unrankedRivalryRecords: number;
  supportedEraOnlyScoredRivalries: number;
  recognizedRivalries: number;
  highestCalculatedScore: number | null;
  lowestCalculatedScore: number | null;
  dimensionRanges: Readonly<Record<RivalryDimensionName, RivalryDimensionRange>>;
  duplicateRivalryKeys: readonly string[];
  duplicateDirectionalRelationshipKeys: readonly string[];
  teammateViolations: readonly string[];
  helperAttributionViolations: readonly string[];
  factualReconciliationFailures: readonly string[];
}>;

export type RivalryBuildInput = Readonly<{
  headToHeadDetails: readonly OwnerHeadToHeadDetail[];
  headToHeadMeetings: readonly OwnerHeadToHeadMeeting[];
  ownerProfiles: readonly Pick<OwnerProfile, "id" | "slug" | "status">[];
  curatedRecognitions?: readonly RivalryCuratedRecognitionInput[];
}>;

export type RivalryBuildResult = Readonly<{
  rivalries: readonly RivalrySummary[];
  coverage: RivalryBuildCoverage;
  methodology: RivalryScoreMethodology;
}>;

export type RivalryTopFilter = Readonly<{
  recognizedOnly?: boolean;
  activeOwnersOnly?: boolean;
  minimumScore?: number;
  limit?: number;
}>;

const METHODOLOGY: RivalryScoreMethodology = Object.freeze({
  version: RIVALRY_SCORE_VERSION,
  scoreMinimum: 0,
  scoreMaximum: 100,
  minimumCompetitiveMeetings: 4,
  minimumCompetitiveSeasons: 2,
  competitiveClassifications: Object.freeze([
    "regular",
    "championship-playoff",
  ] as const),
  weights: RIVALRY_SCORE_WEIGHTS,
  normalization: "eligible-population-midrank-percentile",
  normalizationTieBehavior:
    "Equal raw values share the average of their occupied zero-based rank positions divided by population size minus one.",
  populationBehavior:
    "Rank-normalized dimensions use only calculated-eligible rivalry pairs and may move when that population changes. A single positive value, or an all-equal positive population, normalizes to 1; a zero raw value and an all-zero population normalize to 0.",
  competitivenessFormula:
    "1 - (abs(competitiveWinningPercentage - 0.5) * 2)",
  postseasonFormula:
    "championshipPlayoffMeetings + championshipGameMeetings",
  recencyFormula: "latest supported competitive meeting season",
  longevityFormula:
    "count of distinct supported seasons containing a competitive meeting",
  streaks: null,
  streaksStatus: "deferred-to-future-analytics-layer",
  franchiseRivalriesStatus: "out-of-scope",
});

type PairDraft = {
  rivalryKey: string;
  ownerIds: readonly [string, string];
  ownerStatuses: readonly [OwnerProfileStatus, OwnerProfileStatus];
  directionalRelationships: readonly [
    RivalryDirectionalReference,
    RivalryDirectionalReference,
  ];
  eligibility: RivalryEligibility;
  rawDimensionInputs: RivalryRawDimensionInputs;
  factual: RivalryFactualContext;
  coverage: RivalryCoverage;
  curated: RivalryCuratedMetadata | null;
};

let cachedRivalries: RivalrySummary[] | null = null;
let cachedCoverage: RivalryBuildCoverage | null = null;
let cachedOwnerIdByIdentity: Map<string, string> | null = null;

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T;
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

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function sortedOwnerIds(
  firstOwnerId: string,
  secondOwnerId: string
): readonly [string, string] {
  return firstOwnerId.localeCompare(secondOwnerId) <= 0
    ? [firstOwnerId, secondOwnerId]
    : [secondOwnerId, firstOwnerId];
}

function rivalryKey(firstOwnerId: string, secondOwnerId: string) {
  const [ownerAId, ownerBId] = sortedOwnerIds(firstOwnerId, secondOwnerId);
  return `rivalry:${ownerAId}:${ownerBId}`;
}

function expectedRelationshipKey(ownerId: string, opponentOwnerId: string) {
  return `owner-head-to-head:${ownerId}:vs:${opponentOwnerId}`;
}

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function average(values: readonly number[]) {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function isCompetitiveMeeting(meeting: OwnerHeadToHeadMeeting) {
  return (
    meeting.classification === "regular" ||
    meeting.classification === "championship-playoff"
  );
}

function invertResult(result: OwnerHeadToHeadMeeting["result"]) {
  return result === "win" ? "loss" : result === "loss" ? "win" : "tie";
}

function sameStrings(first: readonly string[], second: readonly string[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function directionalReference(
  detail: OwnerHeadToHeadDetail
): RivalryDirectionalReference {
  return {
    ownerId: detail.ownerId,
    opponentOwnerId: detail.opponentOwnerId,
    relationshipKey: detail.relationshipKey,
    opponentSummaryKey: detail.opponentSummaryKey,
    closestMeeting: detail.summary?.factualExtremes.closestMeeting ?? null,
    largestVictory: detail.summary?.factualExtremes.largestVictory ?? null,
    largestDefeat: detail.summary?.factualExtremes.largestDefeat ?? null,
  };
}

function curatedMetadata(
  input: RivalryCuratedRecognitionInput
): RivalryCuratedMetadata {
  if (
    input.rivalryStartSeason !== undefined &&
    (!Number.isInteger(input.rivalryStartSeason) || input.rivalryStartSeason < 1)
  ) {
    throw new Error("Rivalry recognition contains an invalid start season.");
  }
  if (
    input.displayPriority !== undefined &&
    !Number.isFinite(input.displayPriority)
  ) {
    throw new Error("Rivalry recognition contains an invalid display priority.");
  }
  return deepFreeze({
    isRecognized: input.isRecognized,
    recognitionSource: input.recognitionSource ?? null,
    rivalryName: input.rivalryName ?? null,
    rivalryStory: input.rivalryStory ?? null,
    rivalryStartSeason: input.rivalryStartSeason ?? null,
    displayPriority: input.displayPriority ?? null,
    notes: uniqueSortedStrings(input.notes ?? []),
  });
}

function pairCoverage(
  first: OwnerHeadToHeadDetail,
  second: OwnerHeadToHeadDetail
): RivalryCoverage {
  const headToHeadStates: readonly [
    OwnerHeadToHeadCoverageState,
    OwnerHeadToHeadCoverageState,
  ] = [first.coverage.state, second.coverage.state];
  const isPartial =
    first.coverage.isPartialCareerCoverage ||
    second.coverage.isPartialCareerCoverage ||
    headToHeadStates.includes("partial-career-coverage");
  const isUnavailable = headToHeadStates.includes("unavailable-source");
  const hasNoCompletedMeetings = headToHeadStates.includes(
    "available-no-completed-pair-meetings"
  );
  const scope: RivalryCoverageScope = isUnavailable
    ? "unavailable-source"
    : isPartial
      ? "supported-era-only"
      : hasNoCompletedMeetings
        ? "supported-no-completed-meetings"
        : "full-supported-coverage";

  return {
    headToHeadStates,
    scope,
    rankingRepresentsSupportedEraOnly: scope === "supported-era-only",
    approvedOverlapSeasons: uniqueSortedNumbers([
      ...first.coverage.approvedOverlapSeasons,
      ...second.coverage.approvedOverlapSeasons,
    ]),
    supportedOverlapSeasons: uniqueSortedNumbers([
      ...first.coverage.supportedOverlapSeasons,
      ...second.coverage.supportedOverlapSeasons,
    ]),
    unsupportedOverlapSeasons: uniqueSortedNumbers([
      ...first.coverage.unsupportedOverlapSeasons,
      ...second.coverage.unsupportedOverlapSeasons,
    ]),
    sourceEnabledNoMeetingSeasons: uniqueSortedNumbers([
      ...first.coverage.sourceEnabledNoMeetingSeasons,
      ...second.coverage.sourceEnabledNoMeetingSeasons,
    ]),
  };
}

function eligibility(
  coverage: RivalryCoverage,
  competitiveMeetings: number,
  competitiveSeasons: number
): RivalryEligibility {
  let reason: RivalryEligibilityReason = "eligible";
  if (coverage.scope === "unavailable-source") {
    reason = "unavailable-source";
  } else if (competitiveMeetings === 0) {
    reason = "no-completed-supported-meetings";
  } else if (competitiveMeetings < METHODOLOGY.minimumCompetitiveMeetings) {
    reason = "insufficient-competitive-meetings";
  } else if (competitiveSeasons < METHODOLOGY.minimumCompetitiveSeasons) {
    reason = "insufficient-competitive-seasons";
  }
  return {
    isCalculatedRankingEligible: reason === "eligible",
    reason,
    competitiveMeetings,
    minimumCompetitiveMeetings: 4,
    competitiveSeasons,
    minimumCompetitiveSeasons: 2,
  };
}

function rankPercentiles(
  values: readonly Readonly<{ rivalryKey: string; rawValue: number }>[]
) {
  const result = new Map<string, number>();
  if (values.length === 0) return result;
  const ordered = [...values].sort(
    (first, second) =>
      first.rawValue - second.rawValue ||
      first.rivalryKey.localeCompare(second.rivalryKey)
  );
  if (ordered.every((entry) => entry.rawValue === 0)) {
    ordered.forEach((entry) => result.set(entry.rivalryKey, 0));
    return result;
  }
  if (ordered.every((entry) => entry.rawValue === ordered[0].rawValue)) {
    ordered.forEach((entry) => result.set(entry.rivalryKey, 1));
    return result;
  }
  let start = 0;
  while (start < ordered.length) {
    let end = start;
    while (
      end + 1 < ordered.length &&
      ordered[end + 1].rawValue === ordered[start].rawValue
    ) {
      end += 1;
    }
    const percentile =
      ordered[start].rawValue === 0
        ? 0
        : ((start + end) / 2) / (ordered.length - 1);
    for (let index = start; index <= end; index += 1) {
      result.set(ordered[index].rivalryKey, clampUnit(percentile));
    }
    start = end + 1;
  }
  return result;
}

function emptyDimension(rawValue: number, weight: number) {
  return {
    rawValue,
    normalizedValue: null,
    weight,
    weightedContribution: null,
  } satisfies RivalryDimensionScore;
}

function scoredDimension(rawValue: number, normalizedValue: number, weight: number) {
  const normalized = clampUnit(normalizedValue);
  return {
    rawValue,
    normalizedValue: normalized,
    weight,
    weightedContribution: normalized * weight * 100,
  } satisfies RivalryDimensionScore;
}

function compareCalculatedRanking(first: RivalrySummary, second: RivalrySummary) {
  return (
    (second.calculatedScore ?? Number.NEGATIVE_INFINITY) -
      (first.calculatedScore ?? Number.NEGATIVE_INFINITY) ||
    second.factual.competitiveMeetings - first.factual.competitiveMeetings ||
    second.factual.championshipPlayoffMeetings -
      first.factual.championshipPlayoffMeetings ||
    (second.rawDimensionInputs.latestCompetitiveMeetingSeason ?? -1) -
      (first.rawDimensionInputs.latestCompetitiveMeetingSeason ?? -1) ||
    first.rivalryKey.localeCompare(second.rivalryKey)
  );
}

function dimensionRanges(
  rivalries: readonly RivalrySummary[]
): Readonly<Record<RivalryDimensionName, RivalryDimensionRange>> {
  const eligible = rivalries.filter(
    (rivalry) => rivalry.calculatedScore !== null
  );
  return Object.freeze(
    Object.fromEntries(
      (Object.keys(RIVALRY_SCORE_WEIGHTS) as RivalryDimensionName[]).map(
        (dimension) => {
          const raw = eligible.map(
            (rivalry) => rivalry.dimensions[dimension].rawValue
          );
          const normalized = eligible.flatMap((rivalry) => {
            const value = rivalry.dimensions[dimension].normalizedValue;
            return value === null ? [] : [value];
          });
          return [
            dimension,
            Object.freeze({
              rawMinimum: raw.length > 0 ? Math.min(...raw) : null,
              rawMaximum: raw.length > 0 ? Math.max(...raw) : null,
              normalizedMinimum:
                normalized.length > 0 ? Math.min(...normalized) : null,
              normalizedMaximum:
                normalized.length > 0 ? Math.max(...normalized) : null,
            }),
          ];
        }
      )
    ) as Record<RivalryDimensionName, RivalryDimensionRange>
  );
}

function requireInitialized() {
  if (!cachedRivalries || !cachedCoverage || !cachedOwnerIdByIdentity) {
    throw new Error(
      "Rivalries are not initialized. Supply approved Head-to-Head outputs to buildRivalries() first."
    );
  }
}

function resolveOwnerId(ownerIdOrSlug: string) {
  requireInitialized();
  return cachedOwnerIdByIdentity?.get(ownerIdOrSlug.trim().toLowerCase()) ?? null;
}

export function buildRivalries(input: RivalryBuildInput): RivalryBuildResult {
  const inputRelationshipDuplicates = duplicateValues(
    input.headToHeadDetails.map((detail) => detail.relationshipKey)
  );
  const inputMeetingDuplicates = duplicateValues(
    input.headToHeadMeetings.map((meeting) => meeting.meetingKey)
  );
  const profileIdDuplicates = duplicateValues(
    input.ownerProfiles.map((profile) => profile.id)
  );
  const profileSlugDuplicates = duplicateValues(
    input.ownerProfiles.map((profile) => profile.slug)
  );
  if (
    inputRelationshipDuplicates.length > 0 ||
    inputMeetingDuplicates.length > 0 ||
    profileIdDuplicates.length > 0 ||
    profileSlugDuplicates.length > 0
  ) {
    throw new Error(
      `Rivalry input contains duplicate keys: ${[
        ...inputRelationshipDuplicates.map((key) => `relationship:${key}`),
        ...inputMeetingDuplicates.map((key) => `meeting:${key}`),
        ...profileIdDuplicates.map((key) => `profile-id:${key}`),
        ...profileSlugDuplicates.map((key) => `profile-slug:${key}`),
      ].join(", ")}`
    );
  }

  const profileById = new Map(
    input.ownerProfiles.map((profile) => [profile.id, profile])
  );
  const ownerIdentity = new Map<string, string>();
  input.ownerProfiles.forEach((profile) => {
    ownerIdentity.set(profile.id.toLowerCase(), profile.id);
    ownerIdentity.set(profile.slug.toLowerCase(), profile.id);
  });
  const helperAttributionViolations: string[] = [];
  const teammateViolations: string[] = [];
  const factualReconciliationFailures: string[] = [];

  input.headToHeadDetails.forEach((detail) => {
    if (
      !profileById.has(detail.ownerId) ||
      !profileById.has(detail.opponentOwnerId)
    ) {
      helperAttributionViolations.push(detail.relationshipKey);
    }
    if (
      detail.ownerId === detail.opponentOwnerId ||
      detail.relationshipKey !==
        expectedRelationshipKey(detail.ownerId, detail.opponentOwnerId)
    ) {
      factualReconciliationFailures.push(
        `${detail.relationshipKey}:invalid-directional-identity`
      );
    }
    if (
      detail.coverage.duplicateMeetingKeys.length > 0 ||
      detail.coverage.duplicateCanonicalMatchupKeys.length > 0 ||
      detail.coverage.missingProjectionKeys.length > 0 ||
      detail.coverage.missingCanonicalMatchupKeys.length > 0 ||
      detail.coverage.summaryReconciliationFailures.length > 0
    ) {
      factualReconciliationFailures.push(
        `${detail.relationshipKey}:upstream-coverage-failure`
      );
    }
  });

  const detailByRelationship = new Map(
    input.headToHeadDetails.map((detail) => [detail.relationshipKey, detail])
  );
  const meetingsByRelationship = new Map<string, OwnerHeadToHeadMeeting[]>();
  input.headToHeadMeetings.forEach((meeting) => {
    if (
      !profileById.has(meeting.ownerId) ||
      !profileById.has(meeting.opponentOwnerId)
    ) {
      helperAttributionViolations.push(meeting.meetingKey);
    }
    if (
      meeting.ownerId === meeting.opponentOwnerId ||
      meeting.ownerTeammates.includes(meeting.opponentOwnerId)
    ) {
      teammateViolations.push(meeting.meetingKey);
    }
    if (!detailByRelationship.has(meeting.relationshipKey)) {
      factualReconciliationFailures.push(
        `${meeting.meetingKey}:missing-directional-detail`
      );
    }
    const existing = meetingsByRelationship.get(meeting.relationshipKey) ?? [];
    existing.push(meeting);
    meetingsByRelationship.set(meeting.relationshipKey, existing);
  });

  const curatedByPair = new Map<string, RivalryCuratedMetadata>();
  (input.curatedRecognitions ?? []).forEach((recognition) => {
    const [ownerAId, ownerBId] = recognition.ownerIds;
    if (
      ownerAId === ownerBId ||
      !profileById.has(ownerAId) ||
      !profileById.has(ownerBId)
    ) {
      throw new Error(
        `Rivalry recognition contains an invalid canonical owner pair: ${ownerAId}:${ownerBId}.`
      );
    }
    const key = rivalryKey(ownerAId, ownerBId);
    if (curatedByPair.has(key)) {
      throw new Error(`Rivalry recognition contains duplicate pair ${key}.`);
    }
    curatedByPair.set(key, curatedMetadata(recognition));
  });

  const detailsByPair = new Map<string, OwnerHeadToHeadDetail[]>();
  input.headToHeadDetails.forEach((detail) => {
    const key = rivalryKey(detail.ownerId, detail.opponentOwnerId);
    const existing = detailsByPair.get(key) ?? [];
    existing.push(detail);
    detailsByPair.set(key, existing);
  });

  const drafts: PairDraft[] = [];
  [...detailsByPair]
    .sort(([first], [second]) => first.localeCompare(second))
    .forEach(([key, pairDetails]) => {
      const [ownerAId, ownerBId] = sortedOwnerIds(
        pairDetails[0].ownerId,
        pairDetails[0].opponentOwnerId
      );
      const ownerAProfile = profileById.get(ownerAId);
      const ownerBProfile = profileById.get(ownerBId);
      if (!ownerAProfile || !ownerBProfile) return;
      if (
        ownerAProfile.status === "staff" ||
        ownerBProfile.status === "staff"
      ) {
        return;
      }
      const first = pairDetails.find(
        (detail) =>
          detail.ownerId === ownerAId && detail.opponentOwnerId === ownerBId
      );
      const second = pairDetails.find(
        (detail) =>
          detail.ownerId === ownerBId && detail.opponentOwnerId === ownerAId
      );
      if (!first || !second || pairDetails.length !== 2) {
        factualReconciliationFailures.push(`${key}:missing-reverse-detail`);
        return;
      }
      if (
        first.coverage.state === "not-applicable" ||
        second.coverage.state === "not-applicable" ||
        first.coverage.state === "no-approved-tenure-overlap" ||
        second.coverage.state === "no-approved-tenure-overlap"
      ) {
        return;
      }

      const firstMeetings = [
        ...(meetingsByRelationship.get(first.relationshipKey) ?? []),
      ].sort((a, b) => a.canonicalMatchupKey.localeCompare(b.canonicalMatchupKey));
      const secondMeetings = [
        ...(meetingsByRelationship.get(second.relationshipKey) ?? []),
      ].sort((a, b) => a.canonicalMatchupKey.localeCompare(b.canonicalMatchupKey));
      const firstCanonicalKeys = firstMeetings.map(
        (meeting) => meeting.canonicalMatchupKey
      );
      const secondCanonicalKeys = secondMeetings.map(
        (meeting) => meeting.canonicalMatchupKey
      );
      if (!sameStrings(firstCanonicalKeys, secondCanonicalKeys)) {
        factualReconciliationFailures.push(
          `${key}:directional-canonical-keys`
        );
      }
      firstMeetings.forEach((meeting, index) => {
        const reverse = secondMeetings[index];
        if (
          !reverse ||
          meeting.canonicalMatchupKey !== reverse.canonicalMatchupKey ||
          meeting.ownerScore !== reverse.opponentScore ||
          meeting.opponentScore !== reverse.ownerScore ||
          meeting.pointDifferential !== -reverse.pointDifferential ||
          invertResult(meeting.result) !== reverse.result ||
          meeting.classification !== reverse.classification ||
          meeting.isChampionshipGame !== reverse.isChampionshipGame ||
          meeting.season !== reverse.season
        ) {
          factualReconciliationFailures.push(
            `${key}:directional-meeting:${meeting.canonicalMatchupKey}`
          );
        }
      });

      if (Boolean(first.summary) !== Boolean(second.summary)) {
        factualReconciliationFailures.push(`${key}:directional-summary-presence`);
      }
      if (first.summary && second.summary) {
        const firstRecord = first.summary.records.overall;
        const secondRecord = second.summary.records.overall;
        if (
          first.summary.meetings !== firstMeetings.length ||
          second.summary.meetings !== secondMeetings.length ||
          firstRecord.games !==
            firstMeetings.filter(isCompetitiveMeeting).length ||
          secondRecord.games !==
            secondMeetings.filter(isCompetitiveMeeting).length ||
          firstRecord.games !== secondRecord.games ||
          firstRecord.wins !== secondRecord.losses ||
          firstRecord.losses !== secondRecord.wins ||
          firstRecord.ties !== secondRecord.ties ||
          firstRecord.pointsFor !== secondRecord.pointsAgainst ||
          firstRecord.pointsAgainst !== secondRecord.pointsFor
        ) {
          factualReconciliationFailures.push(`${key}:directional-summary`);
        }
      }

      const competitiveMeetings = firstMeetings.filter(isCompetitiveMeeting);
      const competitiveMeetingSeasons = uniqueSortedNumbers(
        competitiveMeetings.map((meeting) => meeting.season)
      );
      const summary = first.summary;
      const competitiveWinningPercentage =
        summary?.records.overall.winningPercentage ?? null;
      const competitivenessBalance =
        competitiveWinningPercentage === null
          ? 0
          : clampUnit(
              1 - Math.abs(competitiveWinningPercentage - 0.5) * 2
            );
      const championshipPlayoffMeetings =
        summary?.records.championshipPlayoff.games ?? 0;
      const championshipGameMeetings =
        summary?.records.championshipGames.games ?? 0;
      const coverage = pairCoverage(first, second);
      const pairEligibility = eligibility(
        coverage,
        competitiveMeetings.length,
        competitiveMeetingSeasons.length
      );
      const latestCompetitiveMeetingSeason =
        competitiveMeetingSeasons.at(-1) ?? null;
      const rawDimensionInputs: RivalryRawDimensionInputs = {
        competitiveWinningPercentage,
        competitivenessBalance,
        competitiveMeetings: competitiveMeetings.length,
        championshipPlayoffMeetings,
        championshipGameMeetings,
        postseasonSignificanceUnits:
          championshipPlayoffMeetings + championshipGameMeetings,
        latestCompetitiveMeetingSeason,
        competitiveMeetingSeasons,
        distinctCompetitiveMeetingSeasons: competitiveMeetingSeasons.length,
      };
      const factual: RivalryFactualContext = {
        allCompletedMeetings: summary?.meetings ?? firstMeetings.length,
        competitiveMeetings: competitiveMeetings.length,
        regularMeetings: summary?.records.regularSeason.games ?? 0,
        championshipPlayoffMeetings,
        championshipGameMeetings,
        thirdPlaceMeetings: summary?.records.thirdPlace.games ?? 0,
        placementMeetings: summary?.records.placement.games ?? 0,
        toiletBowlMeetings: summary?.records.toiletBowl.games ?? 0,
        consolationMeetings: summary?.records.consolation.games ?? 0,
        averageAbsoluteMarginAllCompleted: average(
          firstMeetings.map((meeting) => Math.abs(meeting.pointDifferential))
        ),
        uniqueCanonicalMatchupKeys: uniqueSortedStrings(firstCanonicalKeys),
        competitiveMeetingSeasons,
      };
      drafts.push({
        rivalryKey: key,
        ownerIds: [ownerAId, ownerBId],
        ownerStatuses: [ownerAProfile.status, ownerBProfile.status],
        directionalRelationships: [
          directionalReference(first),
          directionalReference(second),
        ],
        eligibility: pairEligibility,
        rawDimensionInputs,
        factual,
        coverage,
        curated: curatedByPair.get(key) ?? null,
      });
    });

  curatedByPair.forEach((_, key) => {
    if (!drafts.some((draft) => draft.rivalryKey === key)) {
      throw new Error(
        `Recognized rivalry ${key} has no applicable approved Head-to-Head relationship.`
      );
    }
  });

  const upstreamFailures = uniqueSortedStrings([
    ...teammateViolations.map((key) => `teammate:${key}`),
    ...helperAttributionViolations.map((key) => `helper:${key}`),
    ...factualReconciliationFailures,
  ]);
  if (upstreamFailures.length > 0) {
    throw new Error(
      `Rivalry factual reconciliation failed: ${upstreamFailures.join(", ")}`
    );
  }

  const eligibleDrafts = drafts.filter(
    (draft) => draft.eligibility.isCalculatedRankingEligible
  );
  const frequency = rankPercentiles(
    eligibleDrafts.map((draft) => ({
      rivalryKey: draft.rivalryKey,
      rawValue: draft.rawDimensionInputs.competitiveMeetings,
    }))
  );
  const postseason = rankPercentiles(
    eligibleDrafts.map((draft) => ({
      rivalryKey: draft.rivalryKey,
      rawValue: draft.rawDimensionInputs.postseasonSignificanceUnits,
    }))
  );
  const recency = rankPercentiles(
    eligibleDrafts.map((draft) => ({
      rivalryKey: draft.rivalryKey,
      rawValue: draft.rawDimensionInputs.latestCompetitiveMeetingSeason ?? 0,
    }))
  );
  const longevity = rankPercentiles(
    eligibleDrafts.map((draft) => ({
      rivalryKey: draft.rivalryKey,
      rawValue: draft.rawDimensionInputs.distinctCompetitiveMeetingSeasons,
    }))
  );

  const unrankedRivalries: RivalrySummary[] = [];
  const scoredRivalries: RivalrySummary[] = [];
  drafts.forEach((draft) => {
    const raw = draft.rawDimensionInputs;
    if (!draft.eligibility.isCalculatedRankingEligible) {
      unrankedRivalries.push(
        deepFreeze({
          ...draft,
          calculatedScore: null,
          calculatedRank: null,
          dimensions: {
            competitiveness: emptyDimension(
              raw.competitivenessBalance,
              RIVALRY_SCORE_WEIGHTS.competitiveness
            ),
            frequency: emptyDimension(
              raw.competitiveMeetings,
              RIVALRY_SCORE_WEIGHTS.frequency
            ),
            postseasonSignificance: emptyDimension(
              raw.postseasonSignificanceUnits,
              RIVALRY_SCORE_WEIGHTS.postseasonSignificance
            ),
            recency: emptyDimension(
              raw.latestCompetitiveMeetingSeason ?? 0,
              RIVALRY_SCORE_WEIGHTS.recency
            ),
            longevity: emptyDimension(
              raw.distinctCompetitiveMeetingSeasons,
              RIVALRY_SCORE_WEIGHTS.longevity
            ),
          },
          methodologyVersion: RIVALRY_SCORE_VERSION,
          streaks: null,
        })
      );
      return;
    }
    const dimensions: RivalryDimensionScores = {
      competitiveness: scoredDimension(
        raw.competitivenessBalance,
        raw.competitivenessBalance,
        RIVALRY_SCORE_WEIGHTS.competitiveness
      ),
      frequency: scoredDimension(
        raw.competitiveMeetings,
        frequency.get(draft.rivalryKey) as number,
        RIVALRY_SCORE_WEIGHTS.frequency
      ),
      postseasonSignificance: scoredDimension(
        raw.postseasonSignificanceUnits,
        postseason.get(draft.rivalryKey) as number,
        RIVALRY_SCORE_WEIGHTS.postseasonSignificance
      ),
      recency: scoredDimension(
        raw.latestCompetitiveMeetingSeason as number,
        recency.get(draft.rivalryKey) as number,
        RIVALRY_SCORE_WEIGHTS.recency
      ),
      longevity: scoredDimension(
        raw.distinctCompetitiveMeetingSeasons,
        longevity.get(draft.rivalryKey) as number,
        RIVALRY_SCORE_WEIGHTS.longevity
      ),
    };
    const calculatedScore = (
      Object.values(dimensions) as RivalryDimensionScore[]
    ).reduce(
      (total, dimension) =>
        total + (dimension.weightedContribution as number),
      0
    );
    scoredRivalries.push(
      deepFreeze({
        ...draft,
        calculatedScore,
        calculatedRank: null,
        dimensions,
        methodologyVersion: RIVALRY_SCORE_VERSION,
        streaks: null,
      })
    );
  });

  const ranked = [...scoredRivalries]
    .sort(compareCalculatedRanking)
    .map((rivalry, index) =>
      deepFreeze({ ...rivalry, calculatedRank: index + 1 })
    );
  const nextRivalries = [...ranked, ...unrankedRivalries].sort((first, second) =>
    first.rivalryKey.localeCompare(second.rivalryKey)
  );
  const duplicateRivalryKeys = duplicateValues(
    nextRivalries.map((rivalry) => rivalry.rivalryKey)
  );
  if (duplicateRivalryKeys.length > 0) {
    throw new Error(
      `Rivalry build produced duplicate keys: ${duplicateRivalryKeys.join(", ")}`
    );
  }
  const scores = ranked.map((rivalry) => rivalry.calculatedScore as number);
  const ranges = dimensionRanges(nextRivalries);
  const buildCoverage: RivalryBuildCoverage = deepFreeze({
    undirectedRivalryRecords: nextRivalries.length,
    calculatedEligibleRivalries: ranked.length,
    unrankedRivalryRecords: unrankedRivalries.length,
    supportedEraOnlyScoredRivalries: ranked.filter(
      (rivalry) => rivalry.coverage.rankingRepresentsSupportedEraOnly
    ).length,
    recognizedRivalries: nextRivalries.filter(
      (rivalry) => rivalry.curated?.isRecognized
    ).length,
    highestCalculatedScore: scores.length > 0 ? Math.max(...scores) : null,
    lowestCalculatedScore: scores.length > 0 ? Math.min(...scores) : null,
    dimensionRanges: ranges,
    duplicateRivalryKeys,
    duplicateDirectionalRelationshipKeys: inputRelationshipDuplicates,
    teammateViolations: [],
    helperAttributionViolations: [],
    factualReconciliationFailures: [],
  });

  cachedRivalries = nextRivalries.map((rivalry) => immutableClone(rivalry));
  cachedCoverage = immutableClone(buildCoverage);
  cachedOwnerIdByIdentity = new Map(ownerIdentity);

  return immutableClone({
    rivalries: cachedRivalries,
    coverage: buildCoverage,
    methodology: METHODOLOGY,
  });
}

export function getAllRivalries() {
  requireInitialized();
  return immutableClone(cachedRivalries as RivalrySummary[]);
}

export function getRivalry(
  ownerAIdOrSlug: string,
  ownerBIdOrSlug: string
) {
  const ownerAId = resolveOwnerId(ownerAIdOrSlug);
  const ownerBId = resolveOwnerId(ownerBIdOrSlug);
  if (!ownerAId || !ownerBId || ownerAId === ownerBId) return null;
  const key = rivalryKey(ownerAId, ownerBId);
  const rivalry = (cachedRivalries as RivalrySummary[]).find(
    (candidate) => candidate.rivalryKey === key
  );
  return rivalry ? immutableClone(rivalry) : null;
}

export function getRivalriesForOwner(ownerIdOrSlug: string) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  if (!ownerId) return immutableClone([] as RivalrySummary[]);
  const rivalries = (cachedRivalries as RivalrySummary[]).filter((rivalry) =>
    rivalry.ownerIds.includes(ownerId)
  );
  const calculated = rivalries
    .filter((rivalry) => rivalry.calculatedScore !== null)
    .sort(compareCalculatedRanking);
  const unranked = rivalries
    .filter((rivalry) => rivalry.calculatedScore === null)
    .sort((first, second) => first.rivalryKey.localeCompare(second.rivalryKey));
  return immutableClone([...calculated, ...unranked]);
}

export function getTopRivalries(filter: RivalryTopFilter = {}) {
  requireInitialized();
  const minimumScore = filter.minimumScore ?? 0;
  const limit = filter.limit ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 100) {
    throw new Error("Rivalry minimum score must be between 0 and 100.");
  }
  if (
    limit !== Number.POSITIVE_INFINITY &&
    (!Number.isInteger(limit) || limit < 0)
  ) {
    throw new Error("Rivalry result limit must be a non-negative integer.");
  }
  return immutableClone(
    (cachedRivalries as RivalrySummary[])
      .filter(
        (rivalry) =>
          rivalry.calculatedScore !== null &&
          rivalry.calculatedScore >= minimumScore
      )
      .filter(
        (rivalry) => !filter.recognizedOnly || rivalry.curated?.isRecognized
      )
      .filter(
        (rivalry) =>
          !filter.activeOwnersOnly ||
          rivalry.ownerStatuses.every((status) => status === "active")
      )
      .sort(compareCalculatedRanking)
      .slice(0, limit)
  );
}

export function getRecognizedRivalries() {
  requireInitialized();
  return immutableClone(
    (cachedRivalries as RivalrySummary[])
      .filter((rivalry) => rivalry.curated?.isRecognized)
      .sort(
        (first, second) =>
          (second.curated?.displayPriority ?? Number.NEGATIVE_INFINITY) -
            (first.curated?.displayPriority ?? Number.NEGATIVE_INFINITY) ||
          first.rivalryKey.localeCompare(second.rivalryKey)
      )
  );
}

export function getRivalryCoverage(
  ownerAIdOrSlug: string,
  ownerBIdOrSlug: string
) {
  return getRivalry(ownerAIdOrSlug, ownerBIdOrSlug)?.coverage ?? null;
}

export function getRivalryScoreMethodology() {
  requireInitialized();
  return immutableClone(METHODOLOGY);
}

export function getRivalryBuildCoverage() {
  requireInitialized();
  return immutableClone(cachedCoverage as RivalryBuildCoverage);
}
