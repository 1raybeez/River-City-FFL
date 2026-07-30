import assert from "node:assert/strict";
import {
  applyFranchiseRosterMappings,
  getAllFranchiseRosterMappings,
  getFranchiseMapping,
  getFranchiseMappingCoverage,
} from "../lib/history/franchiseRosterMappings";
import type {
  CanonicalFranchiseMatchup,
  CanonicalMatchupBuildInput,
  CanonicalMatchupType,
} from "../lib/history/canonicalMatchupHistory";
import {
  getAllOwnerSeasonHistory,
  type OwnerSeasonHistoryRecord,
} from "../lib/history/ownerSeasonHistory";
import {
  buildOwnerMatchupProjections,
  getAllOwnerMatchupProjections,
  getOwnerHeadToHead,
  getOwnerMatchupHistory,
  getOwnerMatchupProjection,
  getOwnerMatchupProjectionCoverage,
  getOwnerMatchupsForSeason,
  getUnresolvedOwnerMatchupProjections,
} from "../lib/history/ownerMatchupProjection";
import { ownerProfilesById } from "../lib/managers/identityData";

function canonicalMatchup({
  key,
  season,
  type,
  home,
  away,
  homeScore = 100,
  awayScore = 90,
  mapped = true,
  complete = true,
  title = false,
  scoringWeeks = [1],
}: {
  key: string;
  season: number;
  type: CanonicalMatchupType;
  home: string | null;
  away: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  mapped?: boolean;
  complete?: boolean;
  title?: boolean;
  scoringWeeks?: number[];
}): CanonicalFranchiseMatchup {
  const scoresResolved = homeScore !== null && awayScore !== null;
  const winner =
    complete && scoresResolved && homeScore !== awayScore
      ? (homeScore as number) > (awayScore as number)
        ? home
        : away
      : null;
  const loser =
    complete && scoresResolved && homeScore !== awayScore
      ? (homeScore as number) > (awayScore as number)
        ? away
        : home
      : null;

  return {
    matchupKey: key,
    season,
    leagueId: `fixture-${season}`,
    week: scoringWeeks[0] ?? 1,
    matchupType: type,
    bracketType: type === "regular" ? null : "winners",
    round: type === "regular" ? null : 1,
    bracketPlacement: title ? 1 : null,
    isChampionshipGame: title,
    scoringPeriods: scoringWeeks.map((week) => ({
      week,
      sourceMatchupId: 1,
      homeScore:
        homeScore === null ? null : homeScore / scoringWeeks.length,
      awayScore:
        awayScore === null ? null : awayScore / scoringWeeks.length,
      isComplete: complete && scoresResolved,
    })),
    homeFranchiseId: home,
    awayFranchiseId: away,
    homeScore,
    awayScore,
    winnerFranchiseId: winner,
    loserFranchiseId: loser,
    isComplete: complete,
    correctionVersion: 1,
    source: {
      provider: "sleeper",
      sourceType: type === "regular" ? "weekly-matchup" : "bracket",
      bracketType: type === "regular" ? null : "winners",
      sourceMatchupId: type === "regular" ? 1 : null,
      bracketMatchNumber: type === "regular" ? null : 1,
      retrievedAt: null,
      sourceVersion: "fixture-v1",
    },
    coverage: {
      pairing: away === null ? "partial" : "resolved",
      scores: scoresResolved ? "resolved" : "missing",
      completion: complete ? "resolved" : "incomplete",
      franchises: mapped ? "mapped" : "source-roster",
      classification: complete ? "resolved" : "incomplete",
    },
  };
}

function requireOwnerSeason(
  records: readonly OwnerSeasonHistoryRecord[],
  season: number,
  ownerId: string,
  franchiseId: string
) {
  const record = records.find(
    (candidate) =>
      candidate.season === season &&
      candidate.ownerId === ownerId &&
      candidate.franchiseId === franchiseId
  );
  assert.ok(record, `Missing ${season} ${ownerId} ${franchiseId}.`);
  return record;
}

assert.throws(() => getAllOwnerMatchupProjections(), /not initialized/);
assert.throws(() => getOwnerMatchupProjectionCoverage(), /not initialized/);

const mappings = getAllFranchiseRosterMappings();
const mappingCoverage = getFranchiseMappingCoverage();
assert.equal(mappings.length, 96);
assert.equal(mappingCoverage.totalMappings, 96);
assert.deepEqual(mappingCoverage.seasons, [
  2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
]);
mappingCoverage.seasons.forEach((season) => {
  assert.equal(mappingCoverage.mappingsBySeason[season], 12);
});
assert.deepEqual(mappingCoverage.duplicateSourceKeys, []);
assert.deepEqual(mappingCoverage.duplicateSeasonFranchises, []);
assert.deepEqual(mappingCoverage.unknownFranchiseIds, []);
assert.equal(
  new Set(mappings.map((mapping) => mapping.mappingKey)).size,
  96
);

const landon2018Mapping = getFranchiseMapping(
  2018,
  "342868033913540608",
  5
);
assert.ok(landon2018Mapping);
assert.equal(landon2018Mapping.franchiseId, "special-brownies");
assert.equal(landon2018Mapping.resolution, "commissioner-approved");
assert.equal(Object.isFrozen(landon2018Mapping), true);
assert.equal(Object.isFrozen(mappings), true);
assert.ok(
  ownerProfilesById["landon-elliott"].sleeperIds.includes(
    "342885779137216512"
  )
);
assert.throws(() => {
  (mappings as unknown as FranchiseRosterMappingMutation[]).push({});
});

type FranchiseRosterMappingMutation = Record<string, unknown>;

const acquisitionFixture: CanonicalMatchupBuildInput = {
  seasons: [
    {
      season: 2018,
      leagueId: "342868033913540608",
      playoffWeekStart: 2,
      finalScoringPeriod: 2,
      completedScoringPeriods: [1],
      matchupRowsByWeek: {},
      winnersBracket: [],
      losersBracket: [],
      losersBracketType: "toilet-bowl",
    },
  ],
};
const acquisitionSnapshot = JSON.stringify(acquisitionFixture);
const mappedFixture = applyFranchiseRosterMappings(acquisitionFixture);
assert.equal(JSON.stringify(acquisitionFixture), acquisitionSnapshot);
assert.equal(mappedFixture.seasons[0].franchiseIdByRosterId?.[5], "special-brownies");

const ownerSeasonRecords = getAllOwnerSeasonHistory();
requireOwnerSeason(
  ownerSeasonRecords,
  2018,
  "landon-elliott",
  "special-brownies"
);
requireOwnerSeason(
  ownerSeasonRecords,
  2024,
  "billy-biddle",
  "brilly"
);

const canonicalInput: CanonicalFranchiseMatchup[] = [
  canonicalMatchup({
    key: "2023:regular:hall-brilly",
    season: 2023,
    type: "regular",
    home: "hall-pass",
    away: "brilly",
  }),
  canonicalMatchup({
    key: "2024:regular:prestigio-hall",
    season: 2024,
    type: "regular",
    home: "prestigio-mundial",
    away: "hall-pass",
  }),
  canonicalMatchup({
    key: "2024:playoff:prestigio-hall",
    season: 2024,
    type: "championship-playoff",
    home: "prestigio-mundial",
    away: "hall-pass",
    title: true,
    scoringWeeks: [15, 16],
  }),
  canonicalMatchup({
    key: "2024:third:shake-special",
    season: 2024,
    type: "third-place",
    home: "shake-n-bakers",
    away: "special-brownies",
  }),
  canonicalMatchup({
    key: "2024:toilet:brilly-hall",
    season: 2024,
    type: "toilet-bowl",
    home: "brilly",
    away: "hall-pass",
  }),
  canonicalMatchup({
    key: "2024:placement:hall-art",
    season: 2024,
    type: "placement",
    home: "hall-pass",
    away: "the-art-of-war",
  }),
  canonicalMatchup({
    key: "2024:consolation:brilly-wildcard",
    season: 2024,
    type: "consolation",
    home: "brilly",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "2024:tie:art-wildcard",
    season: 2024,
    type: "regular",
    home: "the-art-of-war",
    away: "the-wildcard",
    homeScore: 88,
    awayScore: 88,
  }),
  canonicalMatchup({
    key: "2024:bye",
    season: 2024,
    type: "bye",
    home: "hall-pass",
    away: null,
    complete: false,
    awayScore: null,
  }),
  canonicalMatchup({
    key: "2024:incomplete",
    season: 2024,
    type: "incomplete",
    home: "hall-pass",
    away: "brilly",
    complete: false,
    homeScore: null,
    awayScore: null,
  }),
  canonicalMatchup({
    key: "2024:unreviewed",
    season: 2024,
    type: "regular",
    home: "sleeper-roster:2024:fixture:99",
    away: "hall-pass",
    mapped: false,
  }),
  canonicalMatchup({
    key: "2024:missing-owner",
    season: 2024,
    type: "regular",
    home: "franchise-without-tenure",
    away: "hall-pass",
  }),
  canonicalMatchup({
    key: "2025:regular:shake-hawkins",
    season: 2025,
    type: "regular",
    home: "shake-n-bakers",
    away: "hawkins-heroes",
  }),
  canonicalMatchup({
    key: "2025:title:shake-prestigio",
    season: 2025,
    type: "championship-playoff",
    home: "shake-n-bakers",
    away: "prestigio-mundial",
    title: true,
  }),
];
canonicalInput.push(canonicalInput[0]);

const canonicalSnapshot = JSON.stringify(canonicalInput);
const ownerSeasonSnapshot = JSON.stringify(ownerSeasonRecords);
const firstBuild = buildOwnerMatchupProjections({
  canonicalMatchups: canonicalInput,
  ownerSeasonRecords,
});
const firstSnapshot = JSON.stringify(firstBuild);
const secondBuild = buildOwnerMatchupProjections({
  canonicalMatchups: canonicalInput,
  ownerSeasonRecords,
});
assert.equal(JSON.stringify(secondBuild), firstSnapshot);
assert.equal(JSON.stringify(canonicalInput), canonicalSnapshot);
assert.equal(JSON.stringify(ownerSeasonRecords), ownerSeasonSnapshot);
assert.equal(Object.isFrozen(firstBuild), true);
assert.throws(() => {
  (firstBuild as unknown as OwnerProjectionMutation[]).push({});
});

type OwnerProjectionMutation = Record<string, unknown>;

const projectionKeys = firstBuild.map(
  (projection) => projection.ownerMatchupKey
);
assert.equal(new Set(projectionKeys).size, projectionKeys.length);
assert.ok(
  projectionKeys.includes(
    "2024:regular:prestigio-hall:side:home:owner:ray-long"
  )
);
assert.ok(
  projectionKeys.includes(
    "2024:regular:prestigio-hall:side:home:owner:jeffrey-hudgins"
  )
);

const prestigioRegular = firstBuild.filter(
  (projection) =>
    projection.canonicalMatchupKey === "2024:regular:prestigio-hall"
);
assert.equal(prestigioRegular.length, 3);
const dougAgainstPrestigio = prestigioRegular.find(
  (projection) => projection.ownerId === "doug-fordham"
);
assert.ok(dougAgainstPrestigio);
assert.deepEqual(
  dougAgainstPrestigio.opponentOwners.map((owner) => owner.ownerId),
  ["jeffrey-hudgins", "ray-long"]
);
assert.equal(getOwnerHeadToHead("doug-fordham", "ray-long").length, 2);
assert.equal(
  getOwnerHeadToHead("doug-fordham", "jeffrey-hudgins").length,
  2
);
assert.equal(getOwnerHeadToHead("ray-long", "jeffrey-hudgins").length, 0);

const shake2024 = getOwnerMatchupsForSeason("jordan-maslyn", 2024).filter(
  (projection) => projection.ownerFranchiseId === "shake-n-bakers"
);
assert.equal(shake2024.length, 1);
assert.equal(
  getOwnerMatchupsForSeason("landon-elliott", 2024).some(
    (projection) => projection.ownerFranchiseId === "shake-n-bakers"
  ),
  false
);
assert.equal(
  getOwnerMatchupsForSeason("landon-elliott", 2024).some(
    (projection) => projection.ownerFranchiseId === "special-brownies"
  ),
  true
);
assert.equal(
  getOwnerMatchupsForSeason("landon-elliott", 2025).filter(
    (projection) => projection.ownerFranchiseId === "shake-n-bakers"
  ).length,
  2
);
assert.equal(getOwnerHeadToHead("jordan-maslyn", "landon-elliott").length, 1);
assert.equal(
  getOwnerHeadToHead("jordan-maslyn", "landon-elliott")[0]
    .canonicalMatchupKey,
  "2024:third:shake-special"
);

assert.equal(getOwnerMatchupsForSeason("aaron-hawkins", 2023).length, 0);
assert.equal(
  getOwnerMatchupsForSeason("billy-biddle", 2024).some(
    (projection) => projection.ownerFranchiseId === "brilly"
  ),
  true
);
assert.equal(
  firstBuild.some(
    (projection) =>
      projection.ownerId === "1133560977729064960" ||
      projection.ownerId === "342885779137216512"
  ),
  false
);

const regularProjection = getOwnerMatchupProjection(
  "2024:regular:prestigio-hall:side:home:owner:ray-long"
);
assert.ok(regularProjection);
assert.equal(regularProjection.eligibility.overallCompetitive, true);
assert.equal(regularProjection.eligibility.rivalry, true);
const playoffProjection = getOwnerMatchupHistory("ray-long", {
  matchupTypes: ["championship-playoff"],
})[0];
assert.ok(playoffProjection);
assert.equal(playoffProjection.eligibility.overallCompetitive, true);
assert.equal(playoffProjection.isChampionshipGame, true);
assert.equal(playoffProjection.canonicalMatchupKey, "2024:playoff:prestigio-hall");
const thirdPlaceProjection = getOwnerMatchupHistory("jordan-maslyn", {
  matchupTypes: ["third-place"],
})[0];
assert.ok(thirdPlaceProjection);
assert.equal(thirdPlaceProjection.eligibility.overallCompetitive, false);
assert.equal(thirdPlaceProjection.eligibility.thirdPlace, true);
const toiletProjection = getOwnerMatchupHistory("billy-biddle", {
  matchupTypes: ["toilet-bowl"],
})[0];
assert.ok(toiletProjection);
assert.equal(toiletProjection.eligibility.overallCompetitive, false);
assert.equal(toiletProjection.eligibility.rivalry, false);
assert.equal(toiletProjection.eligibility.toiletBowl, true);
const placementProjection = getOwnerMatchupHistory("doug-fordham", {
  matchupTypes: ["placement"],
})[0];
assert.ok(placementProjection);
assert.equal(placementProjection.eligibility.overallCompetitive, false);
assert.equal(placementProjection.eligibility.placement, true);
const consolationProjection = getOwnerMatchupHistory("billy-biddle", {
  matchupTypes: ["consolation"],
})[0];
assert.ok(consolationProjection);
assert.equal(consolationProjection.eligibility.overallCompetitive, false);
assert.equal(consolationProjection.eligibility.consolation, true);

const tieProjections = firstBuild.filter(
  (projection) => projection.canonicalMatchupKey === "2024:tie:art-wildcard"
);
assert.equal(tieProjections.length, 2);
tieProjections.forEach((projection) => {
  assert.equal(projection.result, "tie");
  assert.equal(projection.margin, 0);
});
assert.equal(
  firstBuild.filter(
    (projection) =>
      projection.canonicalMatchupKey === "2024:playoff:prestigio-hall"
  ).length,
  3,
  "A multi-week contest must emit one result per credited owner."
);
assert.equal(
  firstBuild.some(
    (projection) =>
      projection.canonicalMatchupKey === "2024:bye" ||
      projection.canonicalMatchupKey === "2024:incomplete" ||
      projection.canonicalMatchupKey === "2024:unreviewed" ||
      projection.canonicalMatchupKey === "2024:missing-owner"
  ),
  false
);

const unresolved = getUnresolvedOwnerMatchupProjections();
assert.ok(
  unresolved.some((issue) => issue.reasons.includes("canonical-bye"))
);
assert.ok(
  unresolved.some((issue) => issue.reasons.includes("canonical-incomplete"))
);
assert.ok(
  unresolved.some((issue) =>
    issue.reasons.includes("unreviewed-franchise-mapping")
  )
);
assert.ok(
  unresolved.some((issue) => issue.reasons.includes("missing-owner-season"))
);

const coverage = getOwnerMatchupProjectionCoverage();
assert.deepEqual(coverage.duplicateCanonicalMatchupKeys, [
  "2023:regular:hall-brilly",
]);
assert.deepEqual(coverage.duplicateOwnerMatchupKeys, []);
assert.deepEqual(coverage.teammateOpponentViolations, []);
assert.equal(
  coverage.uniquePhysicalContestsRepresented,
  new Set(firstBuild.map((projection) => projection.canonicalMatchupKey)).size
);
assert.equal(
  getOwnerHeadToHead("doug-fordham", "billy-biddle").filter(
    (projection) => projection.season === 2023
  ).length,
  1,
  "Head-to-head must de-duplicate a repeated canonical input."
);
assert.ok(
  coverage.uniquePhysicalContestsRepresented <
    coverage.ownerProjectionRecordsCreated
);
assert.equal(Object.isFrozen(coverage), true);
assert.equal(Object.isFrozen(coverage.bySeason), true);

console.log("Owner matchup projection tests passed.");
console.log(
  JSON.stringify(
    {
      mappings: mappingCoverage.totalMappings,
      projections: coverage.ownerProjectionRecordsCreated,
      uniqueCanonicalContests:
        coverage.uniquePhysicalContestsRepresented,
      unresolvedIssues: coverage.unresolvedProjections.length,
    },
    null,
    2
  )
);
