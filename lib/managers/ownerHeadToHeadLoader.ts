import "server-only";

import {
  getAllSupportedDirectionalHeadToHeadPairs,
  getOwnerHeadToHeadDetail,
  getOwnerHeadToHeadMeetings,
  type OwnerHeadToHeadCoverageState,
  type OwnerHeadToHeadFilter,
  type OwnerHeadToHeadMeeting,
} from "@/lib/history/ownerHeadToHeadDetail";
import {
  getFranchiseById,
  getOwnerProfileById,
} from "@/lib/managers/identityData";
import {
  getOwnerProfileBySlug,
  getOwnerProfileViewModelBySlug,
} from "@/lib/managers/identitySelectors";
import { initializeOwnerMatchupHistory } from "@/lib/managers/ownerMatchupSummaryLoader";

export type OwnerHeadToHeadRouteParams = Readonly<{
  owner: string;
  opponent: string;
}>;

export type OwnerHeadToHeadOwnerPresentation = Readonly<{
  ownerId: string;
  slug: string;
  fullName: string;
  shortName: string;
  photo: string | null;
  teamName: string;
  profileHref: string;
}>;

export type OwnerHeadToHeadMetricPresentation = Readonly<{
  label: string;
  value: string;
  accessibleValue?: string;
}>;

export type OwnerHeadToHeadMeetingPresentation = Readonly<{
  meetingKey: string;
  season: number;
  contextLabel: string;
  classificationLabel: string;
  isChampionshipGame: boolean;
  ownerScore: string;
  opponentScore: string;
  scoreLabel: string;
  accessibleScore: string;
  resultLabel: "Win" | "Loss" | "Tie";
  resultTone: "positive" | "negative" | "neutral";
  marginLabel: string;
  ownerFranchiseName: string;
  opponentFranchiseName: string;
  ownerTeammateNames: readonly string[];
  opponentCoOwnerNames: readonly string[];
  scoringPeriods: readonly Readonly<{
    weekLabel: string;
    scoreLabel: string;
  }>[];
}>;

export type OwnerHeadToHeadFilterPresentation = Readonly<{
  value: OwnerHeadToHeadFilter;
  label: string;
  meetingKeys: readonly string[];
}>;

export type OwnerHeadToHeadNotablePresentation = Readonly<{
  title: "Closest Meeting" | "Largest Win" | "Largest Loss";
  meeting: OwnerHeadToHeadMeetingPresentation;
}>;

export type OwnerHeadToHeadCoveragePresentation = Readonly<{
  state: OwnerHeadToHeadCoverageState;
  title: string;
  detail: string;
}>;

export type OwnerHeadToHeadPresentation = Readonly<{
  relationshipKey: string;
  owner: OwnerHeadToHeadOwnerPresentation;
  opponent: OwnerHeadToHeadOwnerPresentation;
  perspectiveLabel: string;
  backHref: string;
  backLabel: string;
  isSummarySupported: boolean;
  competitiveMetrics: readonly OwnerHeadToHeadMetricPresentation[];
  allMeetingMetrics: readonly OwnerHeadToHeadMetricPresentation[];
  seriesContext: Readonly<{
    firstMeeting: OwnerHeadToHeadMeetingPresentation | null;
    latestMeeting: OwnerHeadToHeadMeetingPresentation | null;
    firstSeason: number | null;
    latestSeason: number | null;
    ownerFranchiseNames: readonly string[];
    opponentFranchiseNames: readonly string[];
  }>;
  notableMeetings: readonly OwnerHeadToHeadNotablePresentation[];
  meetings: readonly OwnerHeadToHeadMeetingPresentation[];
  filters: readonly OwnerHeadToHeadFilterPresentation[];
  coverage: OwnerHeadToHeadCoveragePresentation;
}>;

const FILTERS: readonly Readonly<{
  value: OwnerHeadToHeadFilter;
  label: string;
}>[] = [
  { value: "all", label: "All" },
  { value: "competitive", label: "Competitive" },
  { value: "regular", label: "Regular" },
  { value: "championship-playoff", label: "Championship Playoff" },
  { value: "championship-game", label: "Championship Game" },
  { value: "third-place", label: "Third Place" },
  { value: "placement", label: "Placement" },
  { value: "toilet-bowl", label: "Toilet Bowl" },
  { value: "consolation", label: "Consolation" },
];

function formatPoints(value: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatRecord({
  wins,
  losses,
  ties,
}: {
  wins: number;
  losses: number;
  ties: number;
}) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function accessibleRecord({
  wins,
  losses,
  ties,
}: {
  wins: number;
  losses: number;
  ties: number;
}) {
  return `${wins} wins, ${losses} losses${ties > 0 ? `, ${ties} ties` : ""}`;
}

function formatSignedPoints(value: number) {
  return `${value > 0 ? "+" : ""}${formatPoints(value)}`;
}

function formatSeasonList(seasons: readonly number[]) {
  if (seasons.length === 0) return "none";
  if (seasons.length === 1) return `${seasons[0]}`;
  const first = seasons[0];
  const last = seasons.at(-1) as number;
  const isContinuous = seasons.every(
    (season, index) => season === first + index
  );
  return isContinuous ? `${first}–${last}` : seasons.join(", ");
}

function classificationLabel(meeting: OwnerHeadToHeadMeeting) {
  const labels = {
    regular: "Regular Season",
    "championship-playoff": "Championship Playoff",
    "third-place": "Third Place",
    placement: "Placement",
    "toilet-bowl": "Toilet Bowl",
    consolation: "Consolation",
  } as const;
  return labels[meeting.classification];
}

function meetingContextLabel(meeting: OwnerHeadToHeadMeeting) {
  if (meeting.round !== null) {
    return `Round ${meeting.round} · Week ${meeting.week}`;
  }
  return `Week ${meeting.week}`;
}

function franchiseName(franchiseId: string) {
  return getFranchiseById(franchiseId)?.currentTeamName ?? franchiseId;
}

function ownerName(ownerId: string) {
  return getOwnerProfileById(ownerId)?.fullName ?? ownerId;
}

function toMeetingPresentation(
  meeting: OwnerHeadToHeadMeeting
): OwnerHeadToHeadMeetingPresentation {
  const ownerScore = formatPoints(meeting.ownerScore);
  const opponentScore = formatPoints(meeting.opponentScore);
  const resultLabel =
    meeting.result === "win"
      ? "Win"
      : meeting.result === "loss"
        ? "Loss"
        : "Tie";
  const resultTone =
    meeting.result === "win"
      ? "positive"
      : meeting.result === "loss"
        ? "negative"
        : "neutral";

  return Object.freeze({
    meetingKey: meeting.meetingKey,
    season: meeting.season,
    contextLabel: meetingContextLabel(meeting),
    classificationLabel: classificationLabel(meeting),
    isChampionshipGame: meeting.isChampionshipGame,
    ownerScore,
    opponentScore,
    scoreLabel: `${ownerScore}–${opponentScore}`,
    accessibleScore: `${ownerName(meeting.ownerId)} ${ownerScore}, ${ownerName(
      meeting.opponentOwnerId
    )} ${opponentScore}`,
    resultLabel,
    resultTone,
    marginLabel: formatSignedPoints(meeting.pointDifferential),
    ownerFranchiseName: franchiseName(meeting.ownerFranchiseId),
    opponentFranchiseName: franchiseName(meeting.opponentFranchiseId),
    ownerTeammateNames: Object.freeze(
      meeting.ownerTeammates.map(ownerName).sort()
    ),
    opponentCoOwnerNames: Object.freeze(
      meeting.opponentOwners
        .filter((opponent) => opponent.ownerId !== meeting.opponentOwnerId)
        .map((opponent) => ownerName(opponent.ownerId))
        .sort()
    ),
    scoringPeriods: Object.freeze(
      meeting.scoringPeriods.map((period) =>
        Object.freeze({
          weekLabel: `Week ${period.week}`,
          scoreLabel: `${formatPoints(period.ownerScore)}–${formatPoints(
            period.opponentScore
          )}`,
        })
      )
    ),
  });
}

function coveragePresentation({
  state,
  supportedOverlapSeasons,
  unsupportedOverlapSeasons,
  sourceEnabledNoMeetingSeasons,
}: {
  state: OwnerHeadToHeadCoverageState;
  supportedOverlapSeasons: readonly number[];
  unsupportedOverlapSeasons: readonly number[];
  sourceEnabledNoMeetingSeasons: readonly number[];
}): OwnerHeadToHeadCoveragePresentation {
  if (state === "partial-career-coverage") {
    return Object.freeze({
      state,
      title: "Partial historical coverage",
      detail: `Supported matchup history is available for ${formatSeasonList(
        supportedOverlapSeasons
      )}. Approved overlapping seasons without matchup-level source data: ${formatSeasonList(
        unsupportedOverlapSeasons
      )}.`,
    });
  }
  if (state === "available-no-completed-pair-meetings") {
    return Object.freeze({
      state,
      title: "No supported completed meetings",
      detail: `Matchup source is available for ${formatSeasonList(
        sourceEnabledNoMeetingSeasons.length > 0
          ? sourceEnabledNoMeetingSeasons
          : supportedOverlapSeasons
      )}, but no completed meeting is recorded for this directional pair.`,
    });
  }
  if (state === "unavailable-source") {
    return Object.freeze({
      state,
      title: "Matchup source unavailable",
      detail: `Approved ownership tenure overlaps in ${formatSeasonList(
        unsupportedOverlapSeasons
      )}, but matchup-level source data is unavailable. No meeting record has been inferred.`,
    });
  }
  if (state === "no-approved-tenure-overlap") {
    return Object.freeze({
      state,
      title: "No approved tenure overlap",
      detail:
        "The approved owner-season tenures do not overlap. No head-to-head series is presented.",
    });
  }
  if (state === "not-applicable") {
    return Object.freeze({
      state,
      title: "Head-to-head not applicable",
      detail:
        "This pair does not form an approved opponent relationship, including same-franchise teammates and noncompetitive profiles.",
    });
  }
  return Object.freeze({
    state,
    title: "Supported matchup history",
    detail: `Supported matchup history is available for ${formatSeasonList(
      supportedOverlapSeasons
    )}.`,
  });
}

function ownerPresentation(
  slug: string
): OwnerHeadToHeadOwnerPresentation | null {
  const profile = getOwnerProfileViewModelBySlug(slug);
  if (!profile) return null;
  return Object.freeze({
    ownerId: profile.owner.id,
    slug: profile.owner.slug,
    fullName: profile.owner.fullName,
    shortName: profile.owner.shortName,
    photo: profile.owner.photo,
    teamName: profile.primaryTeamLabel,
    profileHref: `/managers/owners/${profile.owner.slug}`,
  });
}

export async function loadOwnerHeadToHeadStaticParams(): Promise<
  readonly OwnerHeadToHeadRouteParams[]
> {
  await initializeOwnerMatchupHistory();
  const params = getAllSupportedDirectionalHeadToHeadPairs().map((detail) => {
    const owner = getOwnerProfileById(detail.ownerId);
    const opponent = getOwnerProfileById(detail.opponentOwnerId);
    if (!owner || !opponent) {
      throw new Error(
        `Supported head-to-head relationship ${detail.relationshipKey} has an unresolved route identity.`
      );
    }
    return Object.freeze({ owner: owner.slug, opponent: opponent.slug });
  });
  const duplicateKeys = params
    .map(({ owner, opponent }) => `${owner}:${opponent}`)
    .filter((key, index, values) => values.indexOf(key) !== index);
  if (duplicateKeys.length > 0) {
    throw new Error(
      `Head-to-head static params contain duplicate canonical routes: ${[
        ...new Set(duplicateKeys),
      ].join(", ")}.`
    );
  }
  return Object.freeze(params);
}

export async function loadOwnerHeadToHeadPresentation(
  ownerSlug: string,
  opponentSlug: string
): Promise<OwnerHeadToHeadPresentation | null> {
  const ownerProfile = getOwnerProfileBySlug(ownerSlug);
  const opponentProfile = getOwnerProfileBySlug(opponentSlug);
  if (
    !ownerProfile ||
    !opponentProfile ||
    ownerProfile.id === opponentProfile.id
  ) {
    return null;
  }

  await initializeOwnerMatchupHistory();
  const detail = getOwnerHeadToHeadDetail(ownerProfile.id, opponentProfile.id);
  if (!detail) return null;
  const owner = ownerPresentation(ownerProfile.slug);
  const opponent = ownerPresentation(opponentProfile.slug);
  if (!owner || !opponent) return null;

  const engineMeetings = getOwnerHeadToHeadMeetings(
    ownerProfile.id,
    opponentProfile.id,
    "all"
  );
  const meetings = engineMeetings.map(toMeetingPresentation);
  const meetingByKey = new Map(
    meetings.map((meeting) => [meeting.meetingKey, meeting])
  );
  const engineMeetingByKey = new Map(
    engineMeetings.map((meeting) => [meeting.meetingKey, meeting])
  );
  const findPresentedMeeting = (ownerMatchupKey: string) => {
    const engineMeeting = engineMeetings.find(
      (meeting) => meeting.ownerMatchupKey === ownerMatchupKey
    );
    return engineMeeting ? meetingByKey.get(engineMeeting.meetingKey) ?? null : null;
  };
  const summary = detail.summary;
  const competitiveMetrics = summary
    ? [
        {
          label: "Competitive Record",
          value: formatRecord(summary.records.overall),
          accessibleValue: accessibleRecord(summary.records.overall),
        },
        {
          label: "Competitive Meetings",
          value: `${summary.records.overall.games}`,
        },
        {
          label: "Winning %",
          value: formatPercentage(summary.records.overall.winningPercentage),
        },
        {
          label: "Points For",
          value: formatPoints(summary.records.overall.pointsFor),
        },
        {
          label: "Points Against",
          value: formatPoints(summary.records.overall.pointsAgainst),
        },
        {
          label: "Point Differential",
          value: formatSignedPoints(summary.records.overall.pointDifferential),
        },
      ]
    : [];
  const allMeetingMetrics = summary
    ? [
        { label: "All Completed Meetings", value: `${summary.meetings}` },
        { label: "Regular", value: `${summary.records.regularSeason.games}` },
        {
          label: "Championship Playoff",
          value: `${summary.records.championshipPlayoff.games}`,
        },
        {
          label: "Championship Games",
          value: `${summary.records.championshipGames.games}`,
        },
        { label: "Third Place", value: `${summary.records.thirdPlace.games}` },
        { label: "Placement", value: `${summary.records.placement.games}` },
        { label: "Toilet Bowl", value: `${summary.records.toiletBowl.games}` },
        { label: "Consolation", value: `${summary.records.consolation.games}` },
      ].filter(
        (metric, index) => index === 0 || Number.parseInt(metric.value, 10) > 0
      )
    : [];
  const filters = FILTERS.map((filter) =>
    Object.freeze({
      ...filter,
      meetingKeys: Object.freeze(
        getOwnerHeadToHeadMeetings(
          ownerProfile.id,
          opponentProfile.id,
          filter.value
        ).map((meeting) => meeting.meetingKey)
      ),
    })
  ).filter((filter) => filter.value === "all" || filter.meetingKeys.length > 0);
  const firstMeeting = summary
    ? findPresentedMeeting(summary.firstMeeting.ownerMatchupKey)
    : null;
  const latestMeeting = summary
    ? findPresentedMeeting(summary.latestMeeting.ownerMatchupKey)
    : null;
  const notableMeetings = summary
    ? ([
        ["Closest Meeting", summary.factualExtremes.closestMeeting],
        ["Largest Win", summary.factualExtremes.largestVictory],
        ["Largest Loss", summary.factualExtremes.largestDefeat],
      ] as const).flatMap(([title, reference]) => {
        if (!reference) return [];
        const meeting = findPresentedMeeting(reference.ownerMatchupKey);
        return meeting ? [Object.freeze({ title, meeting })] : [];
      })
    : [];

  if (
    engineMeetingByKey.size !== meetings.length ||
    filters.find((filter) => filter.value === "all")?.meetingKeys.length !==
      meetings.length
  ) {
    throw new Error(
      `Head-to-head presentation failed to preserve meeting keys for ${detail.relationshipKey}.`
    );
  }

  return Object.freeze({
    relationshipKey: detail.relationshipKey,
    owner,
    opponent,
    perspectiveLabel: `${owner.fullName} vs ${opponent.fullName}`,
    backHref: owner.profileHref,
    backLabel: `Back to ${owner.shortName}'s profile`,
    isSummarySupported: summary !== null,
    competitiveMetrics: Object.freeze(competitiveMetrics),
    allMeetingMetrics: Object.freeze(allMeetingMetrics),
    seriesContext: Object.freeze({
      firstMeeting,
      latestMeeting,
      firstSeason: summary?.firstMeeting.season ?? null,
      latestSeason: summary?.latestMeeting.season ?? null,
      ownerFranchiseNames: Object.freeze(
        (summary?.franchiseIds ?? []).map(franchiseName).sort()
      ),
      opponentFranchiseNames: Object.freeze(
        (summary?.opponentFranchiseIds ?? []).map(franchiseName).sort()
      ),
    }),
    notableMeetings: Object.freeze(notableMeetings),
    meetings: Object.freeze(meetings),
    filters: Object.freeze(filters),
    coverage: coveragePresentation(detail.coverage),
  });
}
