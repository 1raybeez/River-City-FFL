import type {
  RivalryBuildCoverage,
  RivalryScoreMethodology,
  RivalrySummary,
} from "@/lib/history/rivalryHistory";
import type { OwnerHeadToHeadDetail } from "@/lib/history/ownerHeadToHeadDetail";
import type { OwnerProfileStatus } from "@/lib/managers/identityTypes";

export const RIVALRY_HUB_INITIAL_CARD_COUNT = 3;

export const RIVALRY_EXPLORER_CATEGORY_IDS = [
  "most-competitive",
  "most-played",
  "championship",
  "biggest-series-leads",
  "recently-active",
  "recognized",
] as const;

export type RivalryExplorerCategoryId =
  (typeof RIVALRY_EXPLORER_CATEGORY_IDS)[number];

export type RivalryHubOwnerInput = Readonly<{
  ownerId: string;
  slug: string;
  fullName: string;
  shortName: string;
  photo: string | null;
  teamName: string;
  status: OwnerProfileStatus;
}>;

export type RivalryOwnerPresentation = RivalryHubOwnerInput;

export type HeadToHeadFinderOpponentPresentation = Readonly<{
  ownerId: string;
  slug: string;
  fullName: string;
  photo: string | null;
  href: string;
}>;

export type HeadToHeadFinderOwnerPresentation = Readonly<{
  ownerId: string;
  slug: string;
  fullName: string;
  photo: string | null;
  opponents: readonly HeadToHeadFinderOpponentPresentation[];
}>;

export type RivalryScoreExplanationPresentation = Readonly<{
  key:
    | "competitiveness"
    | "frequency"
    | "postseasonSignificance"
    | "recency"
    | "longevity";
  label: string;
  normalizedPercent: number;
  normalizedLabel: string;
  weightLabel: string;
  contributionLabel: string;
}>;

export type RivalryCoveragePresentation = Readonly<{
  scope:
    | "full-supported-coverage"
    | "supported-era-only"
    | "supported-no-completed-meetings"
    | "unavailable-source";
  badgeLabel: string | null;
  detail: string;
}>;

export type RivalryCardPresentation = Readonly<{
  rivalryKey: string;
  ownerIds: readonly [string, string];
  ownerStatuses: readonly [OwnerProfileStatus, OwnerProfileStatus];
  ownerA: RivalryOwnerPresentation;
  ownerB: RivalryOwnerPresentation;
  headToHeadHref: string | null;
  calculatedRank: number | null;
  rankLabel: string | null;
  calculatedScore: number | null;
  scoreLabel: string | null;
  isCalculatedEligible: boolean;
  eligibilityLabel: string | null;
  competitiveRecordLabel: string | null;
  competitiveRecordAccessibleLabel: string | null;
  seriesLeaderLabel: string | null;
  seriesWinDifferential: number | null;
  winningPercentageDistanceFromEven: number | null;
  competitiveMeetings: number;
  allCompletedMeetings: number;
  distinctCompetitiveSeasons: number;
  firstCompetitiveSeason: number | null;
  latestCompetitiveSeason: number | null;
  championshipPlayoffMeetings: number;
  championshipGameMeetings: number;
  coverage: RivalryCoveragePresentation;
  scoreExplanation: readonly RivalryScoreExplanationPresentation[];
  recognitionLabel: string | null;
  categoryHighlights: Readonly<
    Record<"top" | RivalryExplorerCategoryId, string>
  >;
}>;

export type RivalryCategoryPresentation = Readonly<{
  id: RivalryExplorerCategoryId;
  label: string;
  description: string;
  orderedRivalryKeys: readonly string[];
  emptyMessage: string;
}>;

export type RivalryHubPresentation = Readonly<{
  initialCardCount: 3;
  ownerOptions: readonly RivalryOwnerPresentation[];
  headToHeadFinderOwners: readonly HeadToHeadFinderOwnerPresentation[];
  cards: readonly RivalryCardPresentation[];
  topRivalryKeys: readonly string[];
  categories: readonly RivalryCategoryPresentation[];
  methodology: Readonly<{
    version: string;
    summary: string;
    requirements: readonly string[];
  }>;
  buildCoverage: RivalryBuildCoverage;
}>;

export type RivalryHubPresentationInput = Readonly<{
  rivalries: readonly RivalrySummary[];
  topRivalries: readonly RivalrySummary[];
  recognizedRivalries: readonly RivalrySummary[];
  methodology: RivalryScoreMethodology;
  buildCoverage: RivalryBuildCoverage;
  ownerDisplays: readonly RivalryHubOwnerInput[];
  headToHeadDetails: readonly OwnerHeadToHeadDetail[];
}>;

export type RivalryHubCardFilter = Readonly<{
  ownerId: string | null;
  activeOwnersOnly: boolean;
}>;

const COMPONENTS = [
  ["competitiveness", "Competitiveness"],
  ["frequency", "Frequency"],
  ["postseasonSignificance", "Postseason"],
  ["recency", "Recency"],
  ["longevity", "Longevity"],
] as const;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach((item) => deepFreeze(item));
    Object.freeze(value);
  }
  return value;
}

function formatRecord(wins: number, losses: number, ties: number) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function compareNullableDescending(
  first: number | null,
  second: number | null
) {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return second - first;
}

function coveragePresentation(
  rivalry: RivalrySummary
): RivalryCoveragePresentation {
  switch (rivalry.coverage.scope) {
    case "supported-era-only":
      return {
        scope: rivalry.coverage.scope,
        badgeLabel: "Supported Era",
        detail:
          "Calculated from available Sleeper matchup history. Earlier matchup-level history is unavailable.",
      };
    case "supported-no-completed-meetings":
      return {
        scope: rivalry.coverage.scope,
        badgeLabel: "No Completed Meetings",
        detail: "No completed meetings exist in the supported source-enabled seasons.",
      };
    case "unavailable-source":
      return {
        scope: rivalry.coverage.scope,
        badgeLabel: "Historical Data Unavailable",
        detail:
          "Historical matchup data is unavailable, so no matchup record is inferred.",
      };
    case "full-supported-coverage":
      return {
        scope: rivalry.coverage.scope,
        badgeLabel: null,
        detail: "Supported matchup history is available for the approved tenure overlap.",
      };
  }
}

function eligibilityLabel(rivalry: RivalrySummary) {
  if (rivalry.eligibility.isCalculatedRankingEligible) return null;
  switch (rivalry.eligibility.reason) {
    case "insufficient-competitive-meetings":
      return `Not Ranked · ${rivalry.eligibility.competitiveMeetings} of ${rivalry.eligibility.minimumCompetitiveMeetings} meetings`;
    case "insufficient-competitive-seasons":
      return `Not Ranked · ${rivalry.eligibility.competitiveSeasons} of ${rivalry.eligibility.minimumCompetitiveSeasons} seasons`;
    case "no-completed-supported-meetings":
      return "No completed supported meetings";
    case "unavailable-source":
      return "Historical matchup data unavailable";
    case "eligible":
      return null;
  }
}

function recognitionLabel(
  rivalry: RivalrySummary,
  ownerA: RivalryHubOwnerInput,
  ownerB: RivalryHubOwnerInput
) {
  if (!rivalry.curated?.isRecognized) return null;
  switch (rivalry.curated.recognitionSource) {
    case "commissioner":
      return "Commissioner recognized";
    case "owner-a":
      return `Recognized by ${ownerA.fullName}`;
    case "owner-b":
      return `Recognized by ${ownerB.fullName}`;
    case "mutual":
      return "Mutually recognized";
    default:
      return "Recognized rivalry";
  }
}

function scoreExplanation(rivalry: RivalrySummary) {
  if (rivalry.calculatedScore === null) return [];
  return COMPONENTS.map(([key, label]) => {
    const dimension = rivalry.dimensions[key];
    const normalizedPercent = Math.round(
      (dimension.normalizedValue ?? 0) * 100
    );
    return {
      key,
      label,
      normalizedPercent,
      normalizedLabel: `${normalizedPercent}%`,
      weightLabel: `${Math.round(dimension.weight * 100)}% weight`,
      contributionLabel: `${(dimension.weightedContribution ?? 0).toFixed(1)} points`,
    };
  });
}

function categoryDefinitions(
  mostCompetitive: readonly string[],
  mostPlayed: readonly string[],
  championship: readonly string[],
  biggestSeriesLeads: readonly string[],
  recentlyActive: readonly string[],
  recognized: readonly string[]
): readonly RivalryCategoryPresentation[] {
  return [
    {
      id: "most-competitive",
      label: "Most Competitive",
      description:
        "The most balanced eligible competitive series across supported history.",
      orderedRivalryKeys: mostCompetitive,
      emptyMessage: "No eligible competitive rivalries match this scope.",
    },
    {
      id: "most-played",
      label: "Most Played",
      description:
        "The eligible pairs with the most regular-season and championship-playoff meetings.",
      orderedRivalryKeys: mostPlayed,
      emptyMessage: "No eligible rivalry meetings match this scope.",
    },
    {
      id: "championship",
      label: "Championship Rivalries",
      description:
        "Supported pairs ordered by title-game meetings, then all championship-playoff meetings.",
      orderedRivalryKeys: championship,
      emptyMessage: "No championship-playoff meetings match this scope.",
    },
    {
      id: "biggest-series-leads",
      label: "Biggest Series Leads",
      description:
        "The largest factual win gaps among eligible competitive series.",
      orderedRivalryKeys: biggestSeriesLeads,
      emptyMessage: "No eligible series leads match this scope.",
    },
    {
      id: "recently-active",
      label: "Recently Active",
      description:
        "Eligible rivalries ordered by their latest supported competitive meeting.",
      orderedRivalryKeys: recentlyActive,
      emptyMessage: "No recently active eligible rivalries match this scope.",
    },
    {
      id: "recognized",
      label: "Recognized Rivalries",
      description:
        "League-recognized rivalries are curated separately from calculated rankings.",
      orderedRivalryKeys: recognized,
      emptyMessage:
        "No recognized rivalries have been added yet. Recognition will be curated separately from calculated rankings.",
    },
  ];
}

export function filterOrderedRivalryCards(
  cards: readonly RivalryCardPresentation[],
  orderedRivalryKeys: readonly string[],
  filter: RivalryHubCardFilter
) {
  const cardByKey = new Map(cards.map((card) => [card.rivalryKey, card]));
  return orderedRivalryKeys
    .map((key) => cardByKey.get(key))
    .filter((card): card is RivalryCardPresentation => Boolean(card))
    .filter(
      (card) =>
        card.ownerStatuses.every(
          (status) => status === "active" || status === "retired"
        ) &&
        (filter.ownerId === null || card.ownerIds.includes(filter.ownerId)) &&
        (!filter.activeOwnersOnly ||
          card.ownerStatuses.every((status) => status === "active"))
    );
}

export function limitRivalryCards(
  cards: readonly RivalryCardPresentation[],
  expanded: boolean,
  initialCount = RIVALRY_HUB_INITIAL_CARD_COUNT
) {
  return expanded ? cards : cards.slice(0, initialCount);
}

export function buildRivalryHubPresentation(
  input: RivalryHubPresentationInput
): RivalryHubPresentation {
  const ownerById = new Map(
    input.ownerDisplays.map((owner) => [owner.ownerId, owner])
  );
  const detailByKey = new Map(
    input.headToHeadDetails.map((detail) => [detail.relationshipKey, detail])
  );
  const competitiveOwner = (owner: RivalryHubOwnerInput) =>
    owner.status === "active" || owner.status === "retired";
  const finderOpponentsByOwnerId = new Map<
    string,
    HeadToHeadFinderOpponentPresentation[]
  >();

  input.headToHeadDetails.forEach((detail) => {
    if (!detail.summary) return;
    const owner = ownerById.get(detail.ownerId);
    const opponent = ownerById.get(detail.opponentOwnerId);
    if (
      !owner ||
      !opponent ||
      !competitiveOwner(owner) ||
      !competitiveOwner(opponent)
    ) {
      return;
    }
    const opponents = finderOpponentsByOwnerId.get(owner.ownerId) ?? [];
    opponents.push({
      ownerId: opponent.ownerId,
      slug: opponent.slug,
      fullName: opponent.fullName,
      photo: opponent.photo,
      href: `/managers/owners/${owner.slug}/opponents/${opponent.slug}`,
    });
    finderOpponentsByOwnerId.set(owner.ownerId, opponents);
  });

  const cards = input.rivalries.map((rivalry) => {
    const ownerA = ownerById.get(rivalry.ownerIds[0]);
    const ownerB = ownerById.get(rivalry.ownerIds[1]);
    if (!ownerA || !ownerB) {
      throw new Error(`Rivalry ${rivalry.rivalryKey} has unresolved owner display data.`);
    }

    const ownerADirection = rivalry.directionalRelationships.find(
      (relationship) => relationship.ownerId === ownerA.ownerId
    );
    const directionalDetail = ownerADirection
      ? detailByKey.get(ownerADirection.relationshipKey)
      : null;
    const record = directionalDetail?.summary?.records.overall ?? null;
    const recordLabel = record
      ? formatRecord(record.wins, record.losses, record.ties)
      : null;
    const seriesLeader = record
      ? record.wins > record.losses
        ? `${ownerA.shortName} leads ${formatRecord(record.wins, record.losses, record.ties)}`
        : record.losses > record.wins
          ? `${ownerB.shortName} leads ${formatRecord(record.losses, record.wins, record.ties)}`
          : `Series tied ${formatRecord(record.wins, record.losses, record.ties)}`
      : null;
    const seasons = rivalry.rawDimensionInputs.competitiveMeetingSeasons;
    const firstSeason = seasons[0] ?? null;
    const latestSeason =
      rivalry.rawDimensionInputs.latestCompetitiveMeetingSeason;
    const scoreLabel =
      rivalry.calculatedScore === null
        ? null
        : rivalry.calculatedScore.toFixed(1);
    const recognition = recognitionLabel(rivalry, ownerA, ownerB);

    return {
      rivalryKey: rivalry.rivalryKey,
      ownerIds: rivalry.ownerIds,
      ownerStatuses: rivalry.ownerStatuses,
      ownerA,
      ownerB,
      headToHeadHref: directionalDetail?.summary
        ? `/managers/owners/${ownerA.slug}/opponents/${ownerB.slug}`
        : null,
      calculatedRank: rivalry.calculatedRank,
      rankLabel:
        rivalry.calculatedRank === null ? null : `#${rivalry.calculatedRank}`,
      calculatedScore: rivalry.calculatedScore,
      scoreLabel,
      isCalculatedEligible:
        rivalry.eligibility.isCalculatedRankingEligible,
      eligibilityLabel: eligibilityLabel(rivalry),
      competitiveRecordLabel: recordLabel,
      competitiveRecordAccessibleLabel: record
        ? `${ownerA.fullName} competitive record: ${record.wins} wins, ${record.losses} losses, and ${record.ties} ties.`
        : null,
      seriesLeaderLabel: seriesLeader,
      seriesWinDifferential: record
        ? Math.abs(record.wins - record.losses)
        : null,
      winningPercentageDistanceFromEven:
        record?.winningPercentage === null || record?.winningPercentage === undefined
          ? null
          : Math.abs(record.winningPercentage - 0.5),
      competitiveMeetings: rivalry.factual.competitiveMeetings,
      allCompletedMeetings: rivalry.factual.allCompletedMeetings,
      distinctCompetitiveSeasons:
        rivalry.rawDimensionInputs.distinctCompetitiveMeetingSeasons,
      firstCompetitiveSeason: firstSeason,
      latestCompetitiveSeason: latestSeason,
      championshipPlayoffMeetings:
        rivalry.factual.championshipPlayoffMeetings,
      championshipGameMeetings: rivalry.factual.championshipGameMeetings,
      coverage: coveragePresentation(rivalry),
      scoreExplanation: scoreExplanation(rivalry),
      recognitionLabel: recognition,
      categoryHighlights: {
        top: scoreLabel === null ? "Not ranked" : `Rivalry Score ${scoreLabel}`,
        "most-competitive": `Competitiveness ${Math.round((rivalry.dimensions.competitiveness.normalizedValue ?? 0) * 100)}%`,
        "most-played": `${rivalry.factual.competitiveMeetings} competitive meetings`,
        championship: `${rivalry.factual.championshipGameMeetings} championship games · ${rivalry.factual.championshipPlayoffMeetings} championship playoff meetings`,
        "biggest-series-leads": seriesLeader ?? "No supported competitive record",
        "recently-active": latestSeason
          ? `Latest competitive meeting ${latestSeason}`
          : "No supported competitive meeting",
        recognized: recognition ?? "Not recognized",
      },
    } satisfies RivalryCardPresentation;
  });

  const eligible = input.rivalries.filter(
    (rivalry) => rivalry.eligibility.isCalculatedRankingEligible
  );
  const cardByKey = new Map(cards.map((card) => [card.rivalryKey, card]));
  const keys = (rivalries: readonly RivalrySummary[]) =>
    rivalries.map((rivalry) => rivalry.rivalryKey);

  const mostCompetitive = [...eligible].sort(
    (first, second) =>
      compareNullableDescending(
        first.dimensions.competitiveness.normalizedValue,
        second.dimensions.competitiveness.normalizedValue
      ) ||
      second.factual.competitiveMeetings - first.factual.competitiveMeetings ||
      compareNullableDescending(
        first.rawDimensionInputs.latestCompetitiveMeetingSeason,
        second.rawDimensionInputs.latestCompetitiveMeetingSeason
      ) ||
      first.rivalryKey.localeCompare(second.rivalryKey)
  );
  const mostPlayed = [...eligible].sort(
    (first, second) =>
      second.factual.competitiveMeetings - first.factual.competitiveMeetings ||
      second.rawDimensionInputs.distinctCompetitiveMeetingSeasons -
        first.rawDimensionInputs.distinctCompetitiveMeetingSeasons ||
      compareNullableDescending(
        first.rawDimensionInputs.latestCompetitiveMeetingSeason,
        second.rawDimensionInputs.latestCompetitiveMeetingSeason
      ) ||
      first.rivalryKey.localeCompare(second.rivalryKey)
  );
  const championship = input.rivalries
    .filter((rivalry) => rivalry.factual.championshipPlayoffMeetings > 0)
    .sort(
      (first, second) =>
        second.factual.championshipGameMeetings -
          first.factual.championshipGameMeetings ||
        second.factual.championshipPlayoffMeetings -
          first.factual.championshipPlayoffMeetings ||
        compareNullableDescending(
          first.calculatedScore,
          second.calculatedScore
        ) ||
        compareNullableDescending(
          first.rawDimensionInputs.latestCompetitiveMeetingSeason,
          second.rawDimensionInputs.latestCompetitiveMeetingSeason
        ) ||
        first.rivalryKey.localeCompare(second.rivalryKey)
    );
  const biggestSeriesLeads = [...eligible].sort((first, second) => {
    const firstCard = cardByKey.get(first.rivalryKey);
    const secondCard = cardByKey.get(second.rivalryKey);
    return (
      compareNullableDescending(
        firstCard?.seriesWinDifferential ?? null,
        secondCard?.seriesWinDifferential ?? null
      ) ||
      second.factual.competitiveMeetings - first.factual.competitiveMeetings ||
      compareNullableDescending(
        firstCard?.winningPercentageDistanceFromEven ?? null,
        secondCard?.winningPercentageDistanceFromEven ?? null
      ) ||
      first.rivalryKey.localeCompare(second.rivalryKey)
    );
  });
  const recentlyActive = [...eligible].sort(
    (first, second) =>
      compareNullableDescending(
        first.rawDimensionInputs.latestCompetitiveMeetingSeason,
        second.rawDimensionInputs.latestCompetitiveMeetingSeason
      ) ||
      compareNullableDescending(first.calculatedScore, second.calculatedScore) ||
      first.rivalryKey.localeCompare(second.rivalryKey)
  );

  const presentation: RivalryHubPresentation = {
    initialCardCount: RIVALRY_HUB_INITIAL_CARD_COUNT,
    ownerOptions: [...ownerById.values()]
      .filter((owner) => cards.some((card) => card.ownerIds.includes(owner.ownerId)))
      .sort((first, second) => first.fullName.localeCompare(second.fullName)),
    headToHeadFinderOwners: [...finderOpponentsByOwnerId.entries()]
      .map(([ownerId, opponents]) => {
        const owner = ownerById.get(ownerId) as RivalryHubOwnerInput;
        return {
          ownerId: owner.ownerId,
          slug: owner.slug,
          fullName: owner.fullName,
          photo: owner.photo,
          opponents: opponents.sort((first, second) =>
            first.fullName.localeCompare(second.fullName)
          ),
        };
      })
      .sort((first, second) => first.fullName.localeCompare(second.fullName)),
    cards,
    topRivalryKeys: keys(input.topRivalries),
    categories: categoryDefinitions(
      keys(mostCompetitive),
      keys(mostPlayed),
      keys(championship),
      keys(biggestSeriesLeads),
      keys(recentlyActive),
      keys(input.recognizedRivalries)
    ),
    methodology: {
      version: input.methodology.version,
      summary:
        "Rivalry Score combines competitiveness, frequency, postseason significance, recency, and longevity across supported matchup history.",
      requirements: [
        "30% Competitiveness · 25% Frequency · 20% Postseason · 15% Recency · 10% Longevity",
        `At least ${input.methodology.minimumCompetitiveMeetings} competitive meetings across ${input.methodology.minimumCompetitiveSeasons} competitive seasons are required.`,
        "Competitive meetings include regular season and championship playoff only.",
        "Secondary classifications do not influence the score.",
        "Streaks are not currently included.",
        "Recognized rivalries are curated separately.",
        "Some matchup history before Sleeper may be unavailable.",
      ],
    },
    buildCoverage: input.buildCoverage,
  };

  return deepFreeze(presentation);
}
