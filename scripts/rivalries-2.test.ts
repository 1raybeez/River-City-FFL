import assert from "node:assert/strict";
import type {
  OwnerHeadToHeadCoverage,
  OwnerHeadToHeadDetail,
  OwnerHeadToHeadMeeting,
} from "../lib/history/ownerHeadToHeadDetail";
import type {
  OwnerMatchupRecord,
  OwnerMatchupRecordSplits,
  OwnerMatchupReference,
  OwnerOpponentMatchupSummary,
} from "../lib/history/ownerMatchupSummary";
import {
  RIVALRY_SCORE_VERSION,
  RIVALRY_SCORE_WEIGHTS,
  buildRivalries,
  getAllRivalries,
  getRecognizedRivalries,
  getRivalriesForOwner,
  getRivalry,
  getRivalryBuildCoverage,
  getRivalryCoverage,
  getRivalryScoreMethodology,
  getTopRivalries,
  type RivalryBuildInput,
} from "../lib/history/rivalryHistory";
import { OwnerProfileStatus } from "../lib/managers/identityTypes";

type MeetingSeed = Readonly<{
  season: number;
  classification:
    | "regular"
    | "championship-playoff"
    | "third-place"
    | "placement"
    | "toilet-bowl"
    | "consolation";
  ownerAScore: number;
  ownerBScore: number;
  isChampionshipGame?: boolean;
}>;

type PairFixtureOptions = Readonly<{
  ownerAId: string;
  ownerBId: string;
  ownerAFranchiseId: string;
  ownerBFranchiseId: string;
  seeds: readonly MeetingSeed[];
  canonicalPrefix?: string;
  coverageState?: OwnerHeadToHeadCoverage["state"];
  unsupportedOverlapSeasons?: readonly number[];
  ownerATeammates?: readonly string[];
  ownerBTeammates?: readonly string[];
  ownerAOpponentOwners?: readonly string[];
  ownerBOpponentOwners?: readonly string[];
}>;

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

function ownerMatchupKey(ownerId: string, canonicalMatchupKey: string) {
  return `owner-matchup:${ownerId}:${canonicalMatchupKey}`;
}

function resultFor(pointsFor: number, pointsAgainst: number) {
  return pointsFor > pointsAgainst
    ? ("win" as const)
    : pointsFor < pointsAgainst
      ? ("loss" as const)
      : ("tie" as const);
}

function record(meetings: readonly OwnerHeadToHeadMeeting[]): OwnerMatchupRecord {
  const games = meetings.length;
  const wins = meetings.filter((meeting) => meeting.result === "win").length;
  const losses = meetings.filter((meeting) => meeting.result === "loss").length;
  const ties = meetings.filter((meeting) => meeting.result === "tie").length;
  const pointsFor = meetings.reduce(
    (total, meeting) => total + meeting.ownerScore,
    0
  );
  const pointsAgainst = meetings.reduce(
    (total, meeting) => total + meeting.opponentScore,
    0
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

function recordSplits(
  meetings: readonly OwnerHeadToHeadMeeting[]
): OwnerMatchupRecordSplits {
  return {
    overall: record(
      meetings.filter(
        (meeting) =>
          meeting.classification === "regular" ||
          meeting.classification === "championship-playoff"
      )
    ),
    regularSeason: record(
      meetings.filter((meeting) => meeting.classification === "regular")
    ),
    championshipPlayoff: record(
      meetings.filter(
        (meeting) => meeting.classification === "championship-playoff"
      )
    ),
    championshipGames: record(
      meetings.filter((meeting) => meeting.isChampionshipGame)
    ),
    thirdPlace: record(
      meetings.filter((meeting) => meeting.classification === "third-place")
    ),
    placement: record(
      meetings.filter((meeting) => meeting.classification === "placement")
    ),
    consolation: record(
      meetings.filter((meeting) => meeting.classification === "consolation")
    ),
    toiletBowl: record(
      meetings.filter((meeting) => meeting.classification === "toilet-bowl")
    ),
  };
}

function reference(meeting: OwnerHeadToHeadMeeting): OwnerMatchupReference {
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

function extremes(meetings: readonly OwnerHeadToHeadMeeting[]) {
  const closest = [...meetings].sort(
    (first, second) =>
      Math.abs(first.pointDifferential) - Math.abs(second.pointDifferential) ||
      first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey)
  )[0];
  const wins = meetings
    .filter((meeting) => meeting.result === "win")
    .sort(
      (first, second) =>
        second.pointDifferential - first.pointDifferential ||
        first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey)
    );
  const losses = meetings
    .filter((meeting) => meeting.result === "loss")
    .sort(
      (first, second) =>
        first.pointDifferential - second.pointDifferential ||
        first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey)
    );
  return {
    closestMeeting: closest ? reference(closest) : null,
    largestVictory: wins[0] ? reference(wins[0]) : null,
    largestDefeat: losses[0] ? reference(losses[0]) : null,
  };
}

function makeCoverage(
  ownerId: string,
  opponentOwnerId: string,
  meetings: readonly OwnerHeadToHeadMeeting[],
  state: OwnerHeadToHeadCoverage["state"],
  unsupportedOverlapSeasons: readonly number[]
): OwnerHeadToHeadCoverage {
  const supported = [...new Set(meetings.map((meeting) => meeting.season))].sort();
  const approved = [...new Set([...supported, ...unsupportedOverlapSeasons])].sort();
  return {
    state,
    ownerId,
    opponentOwnerId,
    isPartialCareerCoverage:
      state === "partial-career-coverage" || unsupportedOverlapSeasons.length > 0,
    approvedOverlapSeasons: approved,
    supportedOverlapSeasons: supported,
    unsupportedOverlapSeasons,
    sourceEnabledNoMeetingSeasons: [],
    meetingsExpected: meetings.length,
    meetingsBuilt: meetings.length,
    uniqueCanonicalMeetings: meetings.length,
    duplicateMeetingKeys: [],
    duplicateCanonicalMatchupKeys: [],
    missingProjectionKeys: [],
    missingCanonicalMatchupKeys: [],
    summaryReconciliationFailures: [],
  };
}

function makeSummary(
  ownerId: string,
  opponentOwnerId: string,
  meetings: readonly OwnerHeadToHeadMeeting[]
): OwnerOpponentMatchupSummary | null {
  if (meetings.length === 0) return null;
  const chronological = [...meetings].sort(
    (first, second) =>
      first.season - second.season ||
      first.week - second.week ||
      first.canonicalMatchupKey.localeCompare(second.canonicalMatchupKey)
  );
  const records = recordSplits(meetings);
  return {
    summaryKey: `owner-opponent:${ownerId}:vs:${opponentOwnerId}`,
    summaryType: "opponent",
    ownerId,
    opponentOwnerId,
    meetings: meetings.length,
    records,
    firstMeeting: reference(chronological[0]),
    latestMeeting: reference(chronological.at(-1) as OwnerHeadToHeadMeeting),
    seasons: [...new Set(chronological.map((meeting) => meeting.season))],
    canonicalMatchupKeys: meetings.map(
      (meeting) => meeting.canonicalMatchupKey
    ),
    ownerMatchupKeys: meetings.map((meeting) => meeting.ownerMatchupKey),
    franchiseIds: [...new Set(meetings.map((meeting) => meeting.ownerFranchiseId))],
    opponentFranchiseIds: [
      ...new Set(meetings.map((meeting) => meeting.opponentFranchiseId)),
    ],
    coOwnerContext: {
      meetingsWhereOwnerHadTeammates: meetings.filter(
        (meeting) => meeting.ownerTeammates.length > 0
      ).length,
      meetingsWhereOpponentHadTeammates: meetings.filter(
        (meeting) => meeting.opponentOwners.length > 1
      ).length,
      teammateOwnerIdsEncountered: [
        ...new Set(meetings.flatMap((meeting) => meeting.ownerTeammates)),
      ].sort(),
      otherOpponentOwnerIdsEncountered: [
        ...new Set(
          meetings.flatMap((meeting) =>
            meeting.opponentOwners
              .map((opponent) => opponent.ownerId)
              .filter((id) => id !== opponentOwnerId)
          )
        ),
      ].sort(),
    },
    factualExtremes: extremes(meetings),
    streaks: null,
    lineage: {
      ownerMatchupKeys: meetings.map((meeting) => meeting.ownerMatchupKey),
      canonicalMatchupKeys: meetings.map(
        (meeting) => meeting.canonicalMatchupKey
      ),
      ownerSeasonKeys: [
        ...new Set(meetings.map((meeting) => meeting.ownerSeasonKey)),
      ],
      correctionVersions: [1],
      sourceVersions: ["rivalry-fixture-v1"],
      source: "owner-matchup-projection",
    },
    coverage: {
      projectionsConsumed: meetings.length,
      uniqueCanonicalMeetings: meetings.length,
      duplicateCanonicalMatchupKeys: [],
    },
  };
}

function makeDirectionalMeetings({
  ownerId,
  opponentOwnerId,
  ownerFranchiseId,
  opponentFranchiseId,
  seeds,
  canonicalPrefix,
  ownerTeammates,
  opponentOwners,
}: {
  ownerId: string;
  opponentOwnerId: string;
  ownerFranchiseId: string;
  opponentFranchiseId: string;
  seeds: readonly MeetingSeed[];
  canonicalPrefix: string;
  ownerTeammates: readonly string[];
  opponentOwners: readonly string[];
}): OwnerHeadToHeadMeeting[] {
  return seeds.map((seed, index) => {
    const canonicalMatchupKey = `${canonicalPrefix}:${seed.season}:${index + 1}`;
    const ownerIsA = ownerId.localeCompare(opponentOwnerId) <= 0;
    const ownerScore = ownerIsA ? seed.ownerAScore : seed.ownerBScore;
    const opponentScore = ownerIsA ? seed.ownerBScore : seed.ownerAScore;
    const result = resultFor(ownerScore, opponentScore);
    return {
      meetingKey: meetingKey(ownerId, opponentOwnerId, canonicalMatchupKey),
      relationshipKey: relationshipKey(ownerId, opponentOwnerId),
      ownerMatchupKey: ownerMatchupKey(ownerId, canonicalMatchupKey),
      canonicalMatchupKey,
      opponentSummaryKey: `owner-opponent:${ownerId}:vs:${opponentOwnerId}`,
      season: seed.season,
      leagueId: `rivalry-fixture-${seed.season}`,
      week: seed.classification === "regular" ? index + 1 : 15,
      classification: seed.classification,
      bracketType:
        seed.classification === "regular"
          ? null
          : seed.classification === "championship-playoff"
            ? "winners"
            : "losers",
      round: seed.classification === "regular" ? null : 1,
      bracketPlacement: seed.isChampionshipGame ? 1 : null,
      isChampionshipGame: seed.isChampionshipGame ?? false,
      ownerId,
      opponentOwnerId,
      ownerSeasonKey: `${ownerId}:${seed.season}:${ownerFranchiseId}`,
      ownerFranchiseId,
      opponentFranchiseId,
      ownerRole: ownerTeammates.length > 0 ? "co-owner" : "primary",
      ownerTeammates,
      opponentOwners: opponentOwners.map((id) => ({
        ownerId: id,
        ownerSeasonKey: `${id}:${seed.season}:${opponentFranchiseId}`,
        ownershipRole: opponentOwners.length > 1 ? "co-owner" : "primary",
      })),
      ownerScore,
      opponentScore,
      pointDifferential: ownerScore - opponentScore,
      result,
      winnerOwnerIds:
        result === "win"
          ? [ownerId]
          : result === "loss"
            ? [...opponentOwners]
            : [],
      loserOwnerIds:
        result === "loss"
          ? [ownerId]
          : result === "win"
            ? [...opponentOwners]
            : [],
      scoringPeriods: [
        {
          week: seed.classification === "regular" ? index + 1 : 15,
          sourceMatchupId: seed.classification === "regular" ? index + 1 : null,
          ownerScore,
          opponentScore,
          isComplete: true,
        },
      ],
      notable: {
        isClosestMeeting: false,
        isLargestWin: false,
        isLargestLoss: false,
      },
      source: {
        projectionSource: "owner-matchup-projection",
        canonicalSource: {
          provider: "sleeper",
          sourceType:
            seed.classification === "regular" ? "weekly-matchup" : "bracket",
          bracketType:
            seed.classification === "regular"
              ? null
              : seed.classification === "championship-playoff"
                ? "winners"
                : "losers",
          sourceMatchupId:
            seed.classification === "regular" ? index + 1 : null,
          bracketMatchNumber:
            seed.classification === "regular" ? null : index + 1,
          retrievedAt: null,
          sourceVersion: "rivalry-fixture-v1",
        },
        correctionVersion: 1,
      },
    };
  });
}

function makePair(options: PairFixtureOptions) {
  const {
    ownerAId,
    ownerBId,
    ownerAFranchiseId,
    ownerBFranchiseId,
    seeds,
    canonicalPrefix = `${ownerAId}-${ownerBId}`,
    coverageState = "available",
    unsupportedOverlapSeasons = [],
    ownerATeammates = [],
    ownerBTeammates = [],
    ownerAOpponentOwners = [ownerBId],
    ownerBOpponentOwners = [ownerAId],
  } = options;
  const aMeetings = makeDirectionalMeetings({
    ownerId: ownerAId,
    opponentOwnerId: ownerBId,
    ownerFranchiseId: ownerAFranchiseId,
    opponentFranchiseId: ownerBFranchiseId,
    seeds,
    canonicalPrefix,
    ownerTeammates: ownerATeammates,
    opponentOwners: ownerAOpponentOwners,
  });
  const bMeetings = makeDirectionalMeetings({
    ownerId: ownerBId,
    opponentOwnerId: ownerAId,
    ownerFranchiseId: ownerBFranchiseId,
    opponentFranchiseId: ownerAFranchiseId,
    seeds,
    canonicalPrefix,
    ownerTeammates: ownerBTeammates,
    opponentOwners: ownerBOpponentOwners,
  });
  const aSummary = makeSummary(ownerAId, ownerBId, aMeetings);
  const bSummary = makeSummary(ownerBId, ownerAId, bMeetings);
  const makeDetail = (
    ownerId: string,
    opponentOwnerId: string,
    meetings: readonly OwnerHeadToHeadMeeting[],
    summary: OwnerOpponentMatchupSummary | null
  ): OwnerHeadToHeadDetail => ({
    relationshipKey: relationshipKey(ownerId, opponentOwnerId),
    ownerId,
    opponentOwnerId,
    opponentSummaryKey: summary?.summaryKey ?? null,
    summary,
    meetingKeysNewestFirst: meetings.map((meeting) => meeting.meetingKey),
    meetingKeysChronological: meetings.map((meeting) => meeting.meetingKey),
    coverage: makeCoverage(
      ownerId,
      opponentOwnerId,
      meetings,
      coverageState,
      unsupportedOverlapSeasons
    ),
  });
  return {
    details: [
      makeDetail(ownerAId, ownerBId, aMeetings, aSummary),
      makeDetail(ownerBId, ownerAId, bMeetings, bSummary),
    ],
    meetings: [...aMeetings, ...bMeetings],
  };
}

function availableSeeds(): MeetingSeed[] {
  return [
    { season: 2018, classification: "regular", ownerAScore: 110, ownerBScore: 100 },
    { season: 2019, classification: "regular", ownerAScore: 90, ownerBScore: 105 },
    { season: 2020, classification: "regular", ownerAScore: 120, ownerBScore: 100 },
    { season: 2021, classification: "regular", ownerAScore: 88, ownerBScore: 98 },
    { season: 2022, classification: "regular", ownerAScore: 95, ownerBScore: 108 },
    { season: 2023, classification: "regular", ownerAScore: 115, ownerBScore: 104 },
    { season: 2024, classification: "regular", ownerAScore: 91, ownerBScore: 102 },
    { season: 2024, classification: "regular", ownerAScore: 89, ownerBScore: 99 },
    { season: 2025, classification: "regular", ownerAScore: 101, ownerBScore: 112 },
    { season: 2025, classification: "championship-playoff", ownerAScore: 117, ownerBScore: 109 },
    { season: 2025, classification: "championship-playoff", ownerAScore: 100, ownerBScore: 114, isChampionshipGame: true },
    { season: 2025, classification: "toilet-bowl", ownerAScore: 130, ownerBScore: 90 },
  ];
}

assert.throws(() => getAllRivalries(), /not initialized/);
assert.throws(() => getRivalry("ray-long", "wade-cameron"), /not initialized/);
assert.throws(() => getRivalryBuildCoverage(), /not initialized/);
assert.throws(() => getRivalryScoreMethodology(), /not initialized/);

const profiles = [
  { id: "ray-long", slug: "ray-long", status: OwnerProfileStatus.Active },
  { id: "jeffrey-hudgins", slug: "jeffrey-hudgins", status: OwnerProfileStatus.Active },
  { id: "wade-cameron", slug: "wade-cameron", status: OwnerProfileStatus.Active },
  { id: "jordan-maslyn", slug: "jordan-maslyn", status: OwnerProfileStatus.Active },
  { id: "landon-elliott", slug: "landon-elliott", status: OwnerProfileStatus.Retired },
  { id: "tommy-moore", slug: "tommy-moore", status: OwnerProfileStatus.Active },
  { id: "david-besedich", slug: "david-besedich", status: OwnerProfileStatus.Active },
  { id: "jd-dowling", slug: "jd-dowling", status: OwnerProfileStatus.Active },
  { id: "chris-smith", slug: "chris-smith", status: OwnerProfileStatus.Retired },
  { id: "gordie-locke", slug: "gordie-locke", status: OwnerProfileStatus.Retired },
  { id: "rashad-jennings", slug: "rashad-jennings", status: OwnerProfileStatus.Active },
  { id: "brian-davis", slug: "brian-davis", status: OwnerProfileStatus.Active },
] as const;

const rayWade = makePair({
  ownerAId: "ray-long",
  ownerBId: "wade-cameron",
  ownerAFranchiseId: "prestigio-mundial",
  ownerBFranchiseId: "the-wildcard",
  seeds: availableSeeds(),
  canonicalPrefix: "prestigio-wade",
  coverageState: "partial-career-coverage",
  unsupportedOverlapSeasons: [2011, 2013, 2014, 2015, 2016, 2017],
  ownerATeammates: ["jeffrey-hudgins"],
  ownerBOpponentOwners: ["ray-long", "jeffrey-hudgins"],
});
const jeffreyWade = makePair({
  ownerAId: "jeffrey-hudgins",
  ownerBId: "wade-cameron",
  ownerAFranchiseId: "prestigio-mundial",
  ownerBFranchiseId: "the-wildcard",
  seeds: availableSeeds(),
  canonicalPrefix: "prestigio-wade",
  coverageState: "partial-career-coverage",
  unsupportedOverlapSeasons: [2013, 2014, 2015, 2016, 2017],
  ownerATeammates: ["ray-long"],
  ownerBOpponentOwners: ["ray-long", "jeffrey-hudgins"],
});
const jordanLandon = makePair({
  ownerAId: "jordan-maslyn",
  ownerBId: "landon-elliott",
  ownerAFranchiseId: "shake-n-bakers",
  ownerBFranchiseId: "special-brownies",
  seeds: [
    { season: 2023, classification: "regular", ownerAScore: 100, ownerBScore: 90 },
    { season: 2023, classification: "regular", ownerAScore: 95, ownerBScore: 100 },
    { season: 2024, classification: "regular", ownerAScore: 105, ownerBScore: 99 },
    { season: 2024, classification: "regular", ownerAScore: 88, ownerBScore: 94 },
    { season: 2024, classification: "regular", ownerAScore: 103, ownerBScore: 98 },
  ],
});
const tommyDave = makePair({
  ownerAId: "tommy-moore",
  ownerBId: "david-besedich",
  ownerAFranchiseId: "tommy-franchise",
  ownerBFranchiseId: "the-bearded-one",
  seeds: [
    { season: 2022, classification: "regular", ownerAScore: 100, ownerBScore: 90 },
    { season: 2022, classification: "regular", ownerAScore: 90, ownerBScore: 100 },
    { season: 2022, classification: "championship-playoff", ownerAScore: 110, ownerBScore: 105 },
    { season: 2022, classification: "championship-playoff", ownerAScore: 101, ownerBScore: 100, isChampionshipGame: true },
  ],
});
const jdTommy = makePair({
  ownerAId: "jd-dowling",
  ownerBId: "tommy-moore",
  ownerAFranchiseId: "the-art-of-war",
  ownerBFranchiseId: "tommy-franchise",
  seeds: [
    { season: 2023, classification: "regular", ownerAScore: 100, ownerBScore: 99 },
    { season: 2024, classification: "regular", ownerAScore: 90, ownerBScore: 101 },
    { season: 2024, classification: "regular", ownerAScore: 102, ownerBScore: 103 },
  ],
});
const preSleeper = makePair({
  ownerAId: "chris-smith",
  ownerBId: "gordie-locke",
  ownerAFranchiseId: "legacy-a",
  ownerBFranchiseId: "legacy-b",
  seeds: [],
  coverageState: "unavailable-source",
  unsupportedOverlapSeasons: [2011, 2012, 2013],
});
const secondaryOnly = makePair({
  ownerAId: "rashad-jennings",
  ownerBId: "brian-davis",
  ownerAFranchiseId: "rashad-franchise",
  ownerBFranchiseId: "brian-franchise",
  seeds: [
    { season: 2023, classification: "third-place", ownerAScore: 100, ownerBScore: 90 },
    { season: 2023, classification: "placement", ownerAScore: 95, ownerBScore: 90 },
    { season: 2024, classification: "toilet-bowl", ownerAScore: 88, ownerBScore: 87 },
    { season: 2024, classification: "consolation", ownerAScore: 110, ownerBScore: 100 },
  ],
});

const fixtures = [
  rayWade,
  jeffreyWade,
  jordanLandon,
  tommyDave,
  jdTommy,
  preSleeper,
  secondaryOnly,
];
const baseInput: RivalryBuildInput = {
  headToHeadDetails: fixtures.flatMap((fixture) => fixture.details),
  headToHeadMeetings: fixtures.flatMap((fixture) => fixture.meetings),
  ownerProfiles: profiles,
};
const inputSnapshot = JSON.stringify(baseInput);
const uncuratedBuild = buildRivalries(baseInput);
const uncuratedJordanScore = getRivalry(
  "jordan-maslyn",
  "landon-elliott"
)?.calculatedScore;
assert.equal(JSON.stringify(baseInput), inputSnapshot);
assert.equal(uncuratedBuild.coverage.recognizedRivalries, 0);
assert.equal(getRivalry("ray-long", "wade-cameron")?.curated, null);

const curatedInput: RivalryBuildInput = {
  ...baseInput,
  curatedRecognitions: [
    {
      ownerIds: ["jordan-maslyn", "landon-elliott"],
      isRecognized: true,
      recognitionSource: "commissioner",
      rivalryName: "Fixture Rivalry",
      displayPriority: 10,
      notes: ["Focused test recognition."],
    },
    {
      ownerIds: ["tommy-moore", "david-besedich"],
      isRecognized: true,
      recognitionSource: "mutual",
      rivalryStory: "Curated story only.",
      rivalryStartSeason: 2022,
      displayPriority: 5,
    },
  ],
};
const firstBuild = buildRivalries(curatedInput);
const firstSnapshot = JSON.stringify(firstBuild);
const secondBuild = buildRivalries(curatedInput);
assert.equal(JSON.stringify(secondBuild), firstSnapshot);
assert.equal(JSON.stringify(baseInput), inputSnapshot);

assert.equal(firstBuild.rivalries.length, 7);
assert.equal(firstBuild.coverage.calculatedEligibleRivalries, 3);
assert.equal(firstBuild.coverage.unrankedRivalryRecords, 4);
assert.equal(firstBuild.coverage.supportedEraOnlyScoredRivalries, 2);
assert.equal(firstBuild.coverage.recognizedRivalries, 2);
assert.deepEqual(firstBuild.coverage.duplicateRivalryKeys, []);
assert.deepEqual(firstBuild.coverage.teammateViolations, []);
assert.deepEqual(firstBuild.coverage.helperAttributionViolations, []);
assert.deepEqual(firstBuild.coverage.factualReconciliationFailures, []);
assert.equal(Object.isFrozen(firstBuild), true);
assert.equal(Object.isFrozen(firstBuild.rivalries), true);
assert.equal(Object.isFrozen(firstBuild.rivalries[0].dimensions), true);
assert.equal(Object.isFrozen(getAllRivalries()), true);

const ray = getRivalry("ray-long", "wade-cameron");
const rayReverse = getRivalry("wade-cameron", "ray-long");
const jeffrey = getRivalry("jeffrey-hudgins", "wade-cameron");
assert.ok(ray);
assert.ok(jeffrey);
assert.deepEqual(rayReverse, ray);
assert.equal(ray.rivalryKey, "rivalry:ray-long:wade-cameron");
assert.deepEqual(ray.ownerIds, ["ray-long", "wade-cameron"]);
assert.deepEqual(
  ray.directionalRelationships.map((relationship) => relationship.relationshipKey),
  [
    "owner-head-to-head:ray-long:vs:wade-cameron",
    "owner-head-to-head:wade-cameron:vs:ray-long",
  ]
);
assert.equal(ray.factual.allCompletedMeetings, 12);
assert.equal(ray.factual.competitiveMeetings, 11);
assert.equal(ray.factual.toiletBowlMeetings, 1);
assert.equal(ray.rawDimensionInputs.championshipPlayoffMeetings, 2);
assert.equal(ray.rawDimensionInputs.championshipGameMeetings, 1);
assert.equal(ray.rawDimensionInputs.postseasonSignificanceUnits, 3);
assert.equal(ray.coverage.scope, "supported-era-only");
assert.equal(ray.coverage.rankingRepresentsSupportedEraOnly, true);
assert.equal(ray.curated, null);
assert.equal(ray.streaks, null);
assert.equal(jeffrey.factual.allCompletedMeetings, 12);
assert.notEqual(jeffrey.rivalryKey, ray.rivalryKey);
assert.equal(getRivalry("ray-long", "jeffrey-hudgins"), null);
assert.equal(getRivalryCoverage("ray-long", "jeffrey-hudgins"), null);

const jordan = getRivalry("jordan-maslyn", "landon-elliott");
assert.ok(jordan);
assert.equal(jordan.calculatedScore, uncuratedJordanScore);
assert.equal(jordan.eligibility.isCalculatedRankingEligible, true);
assert.deepEqual(jordan.factual.competitiveMeetingSeasons, [2023, 2024]);
assert.equal(jordan.ownerStatuses.includes(OwnerProfileStatus.Retired), true);
assert.equal(
  jordan.factual.uniqueCanonicalMatchupKeys.some((key) => key.includes("2025")),
  false
);
assert.equal(
  jordan.directionalRelationships.some((relationship) =>
    relationship.ownerId === "landon-elliott"
      ? relationship.relationshipKey.includes("landon-elliott")
      : false
  ),
  true
);

const tommy = getRivalry("tommy-moore", "david-besedich");
assert.ok(tommy);
assert.equal(tommy.factual.competitiveMeetings, 4);
assert.equal(tommy.eligibility.reason, "insufficient-competitive-seasons");
assert.equal(tommy.calculatedScore, null);
assert.equal(tommy.curated?.isRecognized, true);
assert.equal(tommy.rawDimensionInputs.postseasonSignificanceUnits, 3);
const jd = getRivalry("jd-dowling", "tommy-moore");
assert.ok(jd);
assert.equal(jd.eligibility.reason, "insufficient-competitive-meetings");
assert.equal(jd.calculatedScore, null);
const oldPair = getRivalry("chris-smith", "gordie-locke");
assert.ok(oldPair);
assert.equal(oldPair.coverage.scope, "unavailable-source");
assert.equal(oldPair.eligibility.reason, "unavailable-source");
assert.equal(oldPair.calculatedScore, null);
const secondary = getRivalry("rashad-jennings", "brian-davis");
assert.ok(secondary);
assert.equal(secondary.factual.allCompletedMeetings, 4);
assert.equal(secondary.factual.competitiveMeetings, 0);
assert.equal(secondary.eligibility.reason, "no-completed-supported-meetings");
assert.equal(secondary.calculatedScore, null);

const methodology = getRivalryScoreMethodology();
assert.equal(methodology.version, RIVALRY_SCORE_VERSION);
assert.equal(
  Object.values(RIVALRY_SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
  1
);
assert.deepEqual(methodology.competitiveClassifications, [
  "regular",
  "championship-playoff",
]);
assert.equal(methodology.streaks, null);
assert.equal(
  methodology.streaksStatus,
  "deferred-to-future-analytics-layer"
);
assert.equal(methodology.franchiseRivalriesStatus, "out-of-scope");

const calculated = getTopRivalries();
assert.equal(calculated.length, 3);
assert.equal(calculated.every((rivalry) => rivalry.calculatedScore !== null), true);
calculated.forEach((rivalry) => {
  Object.values(rivalry.dimensions).forEach((dimension) => {
    assert.ok(dimension.normalizedValue !== null);
    assert.ok(dimension.normalizedValue >= 0);
    assert.ok(dimension.normalizedValue <= 1);
  });
  const contributionSum = Object.values(rivalry.dimensions).reduce(
    (sum, dimension) => sum + (dimension.weightedContribution ?? 0),
    0
  );
  assert.equal(rivalry.calculatedScore, contributionSum);
});
assert.equal(
  calculated.findIndex((rivalry) => rivalry.rivalryKey === jeffrey.rivalryKey) <
    calculated.findIndex((rivalry) => rivalry.rivalryKey === ray.rivalryKey),
  true
);
assert.equal(jeffrey.calculatedScore, ray.calculatedScore);
assert.equal(
  jeffrey.dimensions.frequency.normalizedValue,
  ray.dimensions.frequency.normalizedValue
);
assert.equal(
  jeffrey.dimensions.postseasonSignificance.normalizedValue,
  ray.dimensions.postseasonSignificance.normalizedValue
);
assert.equal(jeffrey.dimensions.recency.normalizedValue, ray.dimensions.recency.normalizedValue);
assert.equal(jeffrey.dimensions.longevity.normalizedValue, ray.dimensions.longevity.normalizedValue);
assert.ok(
  (jordan.dimensions.competitiveness.normalizedValue ?? 0) >
    (ray.dimensions.competitiveness.normalizedValue ?? 0)
);
assert.ok(
  (ray.dimensions.frequency.normalizedValue ?? 0) >
    (jordan.dimensions.frequency.normalizedValue ?? 0)
);
assert.ok(
  (ray.dimensions.postseasonSignificance.normalizedValue ?? 0) >
    (jordan.dimensions.postseasonSignificance.normalizedValue ?? 0)
);
assert.equal(jordan.dimensions.postseasonSignificance.normalizedValue, 0);
assert.ok(
  (ray.dimensions.recency.normalizedValue ?? 0) >
    (jordan.dimensions.recency.normalizedValue ?? 0)
);
assert.ok(
  (ray.dimensions.longevity.normalizedValue ?? 0) >
    (jordan.dimensions.longevity.normalizedValue ?? 0)
);

assert.deepEqual(
  getRecognizedRivalries().map((rivalry) => rivalry.rivalryKey),
  [
    "rivalry:jordan-maslyn:landon-elliott",
    "rivalry:david-besedich:tommy-moore",
  ]
);
assert.deepEqual(
  getTopRivalries({ recognizedOnly: true }).map(
    (rivalry) => rivalry.rivalryKey
  ),
  ["rivalry:jordan-maslyn:landon-elliott"]
);
assert.equal(
  getRivalriesForOwner("landon-elliott")[0].rivalryKey,
  "rivalry:jordan-maslyn:landon-elliott"
);
assert.equal(
  getTopRivalries({ activeOwnersOnly: true }).some(
    (rivalry) => rivalry.rivalryKey === jordan.rivalryKey
  ),
  false
);
assert.equal(
  getTopRivalries({ limit: 1 }).length,
  1
);

const coverage = getRivalryBuildCoverage();
Object.values(coverage.dimensionRanges).forEach((range) => {
  assert.ok(range.normalizedMinimum !== null);
  assert.ok(range.normalizedMaximum !== null);
  assert.ok(range.normalizedMinimum >= 0);
  assert.ok(range.normalizedMaximum <= 1);
});

const preservedCache = JSON.stringify(getAllRivalries());
assert.throws(
  () =>
    buildRivalries({
      ...curatedInput,
      headToHeadMeetings: [
        ...curatedInput.headToHeadMeetings,
        curatedInput.headToHeadMeetings[0],
      ],
    }),
  /duplicate keys/
);
assert.equal(JSON.stringify(getAllRivalries()), preservedCache);

const helperMeeting = {
  ...curatedInput.headToHeadMeetings[0],
  meetingKey: "owner-head-to-head-meeting:helper:invalid",
  relationshipKey: "owner-head-to-head:helper:vs:wade-cameron",
  ownerId: "temporary-helper",
};
assert.throws(
  () =>
    buildRivalries({
      ...curatedInput,
      headToHeadMeetings: [
        ...curatedInput.headToHeadMeetings,
        helperMeeting,
      ],
    }),
  /factual reconciliation failed/
);
assert.equal(JSON.stringify(getAllRivalries()), preservedCache);

assert.throws(
  () =>
    buildRivalries({
      ...curatedInput,
      curatedRecognitions: [
        {
          ownerIds: ["ray-long", "jeffrey-hudgins"],
          isRecognized: true,
          recognitionSource: "commissioner",
        },
      ],
    }),
  /no applicable approved Head-to-Head relationship/
);
assert.equal(JSON.stringify(getAllRivalries()), preservedCache);
assert.equal(JSON.stringify(baseInput), inputSnapshot);

console.log("Rivalries 2.0 tests passed.");
console.log(JSON.stringify(coverage, null, 2));
