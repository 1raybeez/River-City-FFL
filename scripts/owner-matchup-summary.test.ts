import assert from "node:assert/strict";
import type {
  CanonicalFranchiseMatchup,
  CanonicalMatchupType,
} from "../lib/history/canonicalMatchupHistory";
import {
  getAllOwnerSeasonHistory,
  type OwnerSeasonHistoryRecord,
} from "../lib/history/ownerSeasonHistory";
import {
  buildOwnerMatchupProjections,
  getOwnerMatchupProjectionCoverage,
} from "../lib/history/ownerMatchupProjection";
import {
  buildOwnerMatchupSummaries,
  getAllOwnerCareerMatchupSummaries,
  getOwnerCareerMatchupSummary,
  getOwnerMatchupSummaryCoverage,
  getOwnerOpponentMatchupSummaries,
  getOwnerOpponentMatchupSummary,
  getOwnerSeasonMatchupSummaries,
  getOwnerSeasonMatchupSummary,
} from "../lib/history/ownerMatchupSummary";
import { ownerProfiles } from "../lib/managers/identityData";

function canonicalMatchup({
  key,
  season,
  type,
  home,
  away,
  homeScore = 100,
  awayScore = 90,
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
    leagueId: `summary-fixture-${season}`,
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
      sourceVersion: "summary-fixture-v1",
    },
    coverage: {
      pairing: away === null ? "partial" : "resolved",
      scores: scoresResolved ? "resolved" : "missing",
      completion: complete ? "resolved" : "incomplete",
      franchises: "mapped",
      classification: complete ? "resolved" : "incomplete",
    },
  };
}

function requireOwnerSeason(
  records: readonly OwnerSeasonHistoryRecord[],
  ownerId: string,
  season: number
) {
  const record = records.find(
    (candidate) =>
      candidate.ownerId === ownerId && candidate.season === season
  );
  assert.ok(record, `Missing ${season} owner-season for ${ownerId}.`);
  return record;
}

assert.throws(
  () => getAllOwnerCareerMatchupSummaries(),
  /not initialized/
);
assert.throws(
  () => getOwnerSeasonMatchupSummaries("ray-long"),
  /not initialized/
);
assert.throws(
  () => getOwnerOpponentMatchupSummaries("ray-long"),
  /not initialized/
);
assert.throws(() => getOwnerMatchupSummaryCoverage(), /not initialized/);

const ownerSeasonRecords = getAllOwnerSeasonHistory();
const canonicalMatchups: CanonicalFranchiseMatchup[] = [
  canonicalMatchup({
    key: "summary:2023:regular:hall-brilly",
    season: 2023,
    type: "regular",
    home: "hall-pass",
    away: "brilly",
    homeScore: 111.11,
    awayScore: 101.01,
  }),
  canonicalMatchup({
    key: "summary:2024:regular:prestigio-hall",
    season: 2024,
    type: "regular",
    home: "prestigio-mundial",
    away: "hall-pass",
    homeScore: 100.11,
    awayScore: 90.22,
  }),
  canonicalMatchup({
    key: "summary:2024:title:prestigio-hall",
    season: 2024,
    type: "championship-playoff",
    home: "prestigio-mundial",
    away: "hall-pass",
    homeScore: 80.33,
    awayScore: 100.44,
    title: true,
    scoringWeeks: [15, 16],
  }),
  canonicalMatchup({
    key: "summary:2024:third:shake-special",
    season: 2024,
    type: "third-place",
    home: "shake-n-bakers",
    away: "special-brownies",
  }),
  canonicalMatchup({
    key: "summary:2024:semifinal:brilly-wildcard",
    season: 2024,
    type: "championship-playoff",
    home: "brilly",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "summary:2024:placement:hall-art",
    season: 2024,
    type: "placement",
    home: "hall-pass",
    away: "the-art-of-war",
  }),
  canonicalMatchup({
    key: "summary:2024:consolation:brilly-wildcard",
    season: 2024,
    type: "consolation",
    home: "brilly",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "summary:2024:toilet:brilly-hall",
    season: 2024,
    type: "toilet-bowl",
    home: "brilly",
    away: "hall-pass",
  }),
  canonicalMatchup({
    key: "summary:2024:tie:art-wildcard",
    season: 2024,
    type: "regular",
    home: "the-art-of-war",
    away: "the-wildcard",
    homeScore: 88.08,
    awayScore: 88.08,
  }),
  canonicalMatchup({
    key: "summary:2025:regular:shake-hawkins",
    season: 2025,
    type: "regular",
    home: "shake-n-bakers",
    away: "hawkins-heroes",
  }),
  canonicalMatchup({
    key: "summary:2026:incomplete:hall-art",
    season: 2026,
    type: "incomplete",
    home: "hall-pass",
    away: "the-art-of-war",
    homeScore: null,
    awayScore: null,
    complete: false,
  }),
];

const projectionBuild = buildOwnerMatchupProjections({
  canonicalMatchups,
  ownerSeasonRecords,
});
const projectionCoverage = getOwnerMatchupProjectionCoverage();
const ownerProfileInputs = ownerProfiles.map(({ id, slug, status }) => ({
  id,
  slug,
  status,
}));
const canonicalSnapshot = JSON.stringify(canonicalMatchups);
const ownerSeasonSnapshot = JSON.stringify(ownerSeasonRecords);
const profilesSnapshot = JSON.stringify(ownerProfileInputs);
const projectionSnapshot = JSON.stringify(projectionBuild);
const coverageSnapshot = JSON.stringify(projectionCoverage);
const buildInput = {
  projections: projectionBuild,
  ownerSeasonRecords,
  ownerProfiles: ownerProfileInputs,
  projectionCoverage,
};

const firstBuild = buildOwnerMatchupSummaries(buildInput);
const firstBuildSnapshot = JSON.stringify(firstBuild);
const secondBuild = buildOwnerMatchupSummaries(buildInput);
assert.equal(JSON.stringify(secondBuild), firstBuildSnapshot);
assert.equal(JSON.stringify(canonicalMatchups), canonicalSnapshot);
assert.equal(JSON.stringify(ownerSeasonRecords), ownerSeasonSnapshot);
assert.equal(JSON.stringify(ownerProfileInputs), profilesSnapshot);
assert.equal(JSON.stringify(projectionBuild), projectionSnapshot);
assert.equal(JSON.stringify(projectionCoverage), coverageSnapshot);

assert.equal(Object.isFrozen(firstBuild), true);
assert.equal(Object.isFrozen(firstBuild.careerSummaries), true);
assert.equal(Object.isFrozen(firstBuild.careerSummaries[0].records), true);
assert.equal(
  Object.isFrozen(firstBuild.opponentSummaries[0].canonicalMatchupKeys),
  true
);
assert.equal(
  new Set(firstBuild.careerSummaries.map((summary) => summary.summaryKey))
    .size,
  firstBuild.careerSummaries.length
);
assert.equal(
  new Set(firstBuild.seasonSummaries.map((summary) => summary.summaryKey))
    .size,
  firstBuild.seasonSummaries.length
);
assert.equal(
  new Set(firstBuild.opponentSummaries.map((summary) => summary.summaryKey))
    .size,
  firstBuild.opponentSummaries.length
);

const rayCareer = getOwnerCareerMatchupSummary("ray-long");
assert.ok(rayCareer);
assert.equal(rayCareer.records.overall.games, 2);
assert.equal(rayCareer.records.overall.wins, 1);
assert.equal(rayCareer.records.overall.losses, 1);
assert.equal(rayCareer.records.overall.winningPercentage, 0.5);
assert.equal(rayCareer.records.overall.pointsFor, 100.11 + 80.33);
assert.equal(rayCareer.records.overall.pointsAgainst, 90.22 + 100.44);
assert.equal(
  rayCareer.records.overall.pointDifferential,
  100.11 + 80.33 - (90.22 + 100.44)
);
assert.equal(rayCareer.records.regularSeason.games, 1);
assert.equal(rayCareer.records.championshipPlayoff.games, 1);
assert.equal(rayCareer.records.championshipGames.games, 1);
assert.equal(rayCareer.firstMatchupSeason, 2024);
assert.equal(rayCareer.latestMatchupSeason, 2024);
assert.deepEqual(rayCareer.seasonsWithMatchupData, [2024]);
assert.equal(rayCareer.streaks, null);

const ray2011 = getOwnerSeasonMatchupSummary("ray-long", 2011);
assert.ok(ray2011);
assert.equal(
  ray2011.coverage.sourceAvailability,
  "unavailable-no-source"
);
assert.equal(ray2011.records.overall.games, 0);
assert.equal(ray2011.records.overall.winningPercentage, null);
assert.deepEqual(ray2011.franchiseIds, ["prestigio-mundial"]);
assert.deepEqual(ray2011.ownershipRoles, ["primary"]);
assert.equal(getOwnerSeasonMatchupSummary("ray-long", 2012), null);

const ray2026 = getOwnerSeasonMatchupSummary("ray-long", 2026);
assert.ok(ray2026);
assert.equal(
  ray2026.coverage.sourceAvailability,
  "available-no-completed-games"
);
assert.equal(ray2026.records.overall.games, 0);
assert.equal(ray2026.records.overall.winningPercentage, null);

const staffCareer = getOwnerCareerMatchupSummary("damon-davis");
assert.ok(staffCareer);
assert.equal(staffCareer.coverage.sourceAvailability, "not-applicable");
assert.equal(staffCareer.records.overall.winningPercentage, null);

const jdCareer = getOwnerCareerMatchupSummary("jd-dowling");
assert.ok(jdCareer);
assert.equal(jdCareer.records.regularSeason.games, 1);
assert.equal(jdCareer.records.regularSeason.ties, 1);
assert.equal(jdCareer.records.regularSeason.winningPercentage, 0.5);
assert.equal(jdCareer.records.placement.games, 1);
assert.equal(jdCareer.records.overall.games, 1);

const jordanCareer = getOwnerCareerMatchupSummary("jordan-maslyn");
assert.ok(jordanCareer);
assert.equal(jordanCareer.records.thirdPlace.games, 1);
assert.equal(jordanCareer.records.regularSeason.games, 1);
assert.equal(jordanCareer.records.overall.games, 1);

const billyCareer = getOwnerCareerMatchupSummary("billy-biddle");
assert.ok(billyCareer);
assert.equal(billyCareer.records.consolation.games, 1);
assert.equal(billyCareer.records.toiletBowl.games, 1);
assert.equal(billyCareer.records.championshipPlayoff.games, 1);
assert.equal(billyCareer.records.championshipGames.games, 0);
assert.equal(billyCareer.records.overall.games, 2);

const rayVsDoug = getOwnerOpponentMatchupSummary(
  "ray-long",
  "doug-fordham"
);
const dougVsRay = getOwnerOpponentMatchupSummary(
  "doug-fordham",
  "ray-long"
);
assert.ok(rayVsDoug);
assert.ok(dougVsRay);
assert.equal(rayVsDoug.meetings, 2);
assert.equal(rayVsDoug.records.overall.games, 2);
assert.equal(dougVsRay.meetings, 2);
assert.equal(dougVsRay.records.overall.games, 2);
assert.equal(
  rayVsDoug.factualExtremes.closestMeeting?.canonicalMatchupKey,
  "summary:2024:regular:prestigio-hall"
);
assert.equal(
  rayVsDoug.factualExtremes.largestVictory?.canonicalMatchupKey,
  "summary:2024:regular:prestigio-hall"
);
assert.equal(
  rayVsDoug.factualExtremes.largestDefeat?.canonicalMatchupKey,
  "summary:2024:title:prestigio-hall"
);
assert.equal(rayVsDoug.coOwnerContext.meetingsWhereOwnerHadTeammates, 2);
assert.deepEqual(
  rayVsDoug.coOwnerContext.teammateOwnerIdsEncountered,
  ["jeffrey-hudgins"]
);
assert.equal(dougVsRay.coOwnerContext.meetingsWhereOpponentHadTeammates, 2);
assert.deepEqual(
  dougVsRay.coOwnerContext.otherOpponentOwnerIdsEncountered,
  ["jeffrey-hudgins"]
);
assert.equal(
  getOwnerOpponentMatchupSummary("ray-long", "jeffrey-hudgins"),
  null
);
assert.equal(
  getOwnerOpponentMatchupSummary("jeffrey-hudgins", "ray-long"),
  null
);

const dougCareer = getOwnerCareerMatchupSummary("doug-fordham");
assert.ok(dougCareer);
assert.equal(
  dougCareer.records.overall.games,
  3,
  "Doug receives one career game per physical contest, not one per Prestigio co-owner."
);
assert.equal(dougVsRay.meetings, 2);
assert.equal(
  getOwnerOpponentMatchupSummary(
    "doug-fordham",
    "jeffrey-hudgins"
  )?.meetings,
  2
);

const jordanVsLandon = getOwnerOpponentMatchupSummary(
  "jordan-maslyn",
  "landon-elliott"
);
assert.ok(jordanVsLandon);
assert.deepEqual(jordanVsLandon.seasons, [2024]);
assert.equal(
  jordanVsLandon.canonicalMatchupKeys.includes(
    "summary:2025:regular:shake-hawkins"
  ),
  false
);
assert.deepEqual(
  getOwnerSeasonMatchupSummary("landon-elliott", 2024)?.franchiseIds,
  ["special-brownies"]
);
assert.deepEqual(
  getOwnerSeasonMatchupSummary("landon-elliott", 2025)?.franchiseIds,
  ["shake-n-bakers"]
);

assert.equal(getOwnerSeasonMatchupSummary("aaron-hawkins", 2023), null);
assert.equal(
  getOwnerCareerMatchupSummary("aaron-hawkins")?.seasonsWithMatchupData
    .includes(2023),
  false
);
assert.equal(
  firstBuild.careerSummaries.some(
    (summary) =>
      summary.ownerId === "1133560977729064960" ||
      summary.ownerId === "342885779137216512" ||
      summary.ownerId === "nakedbuddha"
  ),
  false
);
assert.equal(
  firstBuild.opponentSummaries.some(
    (summary) =>
      summary.ownerId === "1133560977729064960" ||
      summary.opponentOwnerId === "1133560977729064960" ||
      summary.ownerId === "nakedbuddha" ||
      summary.opponentOwnerId === "nakedbuddha"
  ),
  false
);

firstBuild.careerSummaries.forEach((summary) => {
  assert.equal(summary.streaks, null);
  Object.values(summary.records).forEach((record) => {
    assert.equal(record.games, record.wins + record.losses + record.ties);
  });
});
firstBuild.seasonSummaries.forEach((summary) => {
  assert.equal(summary.streaks, null);
});
firstBuild.opponentSummaries.forEach((summary) => {
  assert.equal(summary.streaks, null);
});

const coverage = getOwnerMatchupSummaryCoverage();
assert.equal(
  coverage.sourceProjectionRecords,
  projectionCoverage.ownerProjectionRecordsCreated
);
assert.equal(
  coverage.uniqueSourceProjectionKeys,
  projectionCoverage.ownerProjectionRecordsCreated
);
assert.equal(
  coverage.careerProjectionConsumptions,
  coverage.uniqueSourceProjectionKeys
);
assert.equal(
  coverage.seasonProjectionConsumptions,
  coverage.uniqueSourceProjectionKeys
);
assert.equal(
  coverage.projectionCanonicalKeysObserved,
  projectionCoverage.uniquePhysicalContestsRepresented
);
assert.deepEqual(coverage.duplicateSourceProjectionKeys, []);
assert.deepEqual(coverage.projectionKeysMissingFromCareerSummaries, []);
assert.deepEqual(coverage.projectionKeysRepeatedInCareerSummaries, []);
assert.deepEqual(coverage.projectionKeysMissingFromSeasonSummaries, []);
assert.deepEqual(coverage.projectionKeysRepeatedInSeasonSummaries, []);
assert.deepEqual(coverage.careerSeasonReconciliationFailures, []);
assert.deepEqual(coverage.careerProjectionReconciliationFailures, []);
assert.deepEqual(coverage.classificationReconciliationFailures, []);
assert.deepEqual(coverage.titleGameSubsetViolations, []);
assert.deepEqual(coverage.opponentPairDuplicateCanonicalKeys, []);
assert.deepEqual(coverage.teammateOpponentSummaryViolations, []);
assert.deepEqual(coverage.unknownOwnerSummaryIds, []);
assert.deepEqual(coverage.helperAccountSummaryViolations, []);
assert.deepEqual(coverage.duplicateCareerSummaryKeys, []);
assert.deepEqual(coverage.duplicateSeasonSummaryKeys, []);
assert.deepEqual(coverage.duplicateOpponentSummaryKeys, []);
assert.equal(
  coverage.expectedOpponentRelationshipConsumptions,
  coverage.actualOpponentRelationshipConsumptions
);
assert.equal(
  getOwnerCareerMatchupSummary("billy-biddle")?.records
    .championshipGames.games,
  0,
  "A completed winners-bracket game is not automatically a title game."
);
assert.equal(
  rayCareer.lineage.canonicalMatchupKeys.filter(
    (key) => key === "summary:2024:title:prestigio-hall"
  ).length,
  1,
  "A multi-week title matchup must summarize once per credited owner."
);
firstBuild.seasonSummaries
  .filter((summary) => summary.season >= 2011 && summary.season <= 2017)
  .forEach((summary) => {
    assert.equal(
      summary.coverage.sourceAvailability,
      "unavailable-no-source"
    );
  });

const duplicatedBuild = buildOwnerMatchupSummaries({
  ...buildInput,
  projections: [...projectionBuild, projectionBuild[0]],
  projectionCoverage: {
    ...projectionCoverage,
    ownerProjectionRecordsCreated: projectionBuild.length + 1,
  },
});
assert.deepEqual(duplicatedBuild.coverage.duplicateSourceProjectionKeys, [
  projectionBuild[0].ownerMatchupKey,
]);
assert.equal(
  getOwnerCareerMatchupSummary(projectionBuild[0].ownerId)?.lineage
    .ownerMatchupKeys.length,
  firstBuild.careerSummaries.find(
    (summary) => summary.ownerId === projectionBuild[0].ownerId
  )?.lineage.ownerMatchupKeys.length
);

buildOwnerMatchupSummaries(buildInput);
const preservedCache = JSON.stringify(getAllOwnerCareerMatchupSummaries());
assert.throws(
  () =>
    buildOwnerMatchupSummaries({
      ...buildInput,
      ownerProfiles: [...ownerProfileInputs, ownerProfileInputs[0]],
    }),
  /duplicate owner profiles/
);
assert.equal(
  JSON.stringify(getAllOwnerCareerMatchupSummaries()),
  preservedCache
);
assert.equal(
  getOwnerSeasonMatchupSummaries("ray-long").length,
  rayCareer.seasonSummaryKeys.length
);
assert.equal(
  getOwnerOpponentMatchupSummaries("ray-long").length,
  rayCareer.opponentSummaryKeys.length
);

requireOwnerSeason(ownerSeasonRecords, "ray-long", 2011);
requireOwnerSeason(ownerSeasonRecords, "jeffrey-hudgins", 2013);
assert.equal(
  ownerSeasonRecords.some(
    (record) =>
      record.ownerId === "jeffrey-hudgins" && record.season === 2011
  ),
  false
);

console.log("Owner matchup summary tests passed.");
console.log(
  JSON.stringify(
    {
      careerSummaries: firstBuild.coverage.careerSummariesCreated,
      seasonSummaries: firstBuild.coverage.seasonSummariesCreated,
      opponentSummaries: firstBuild.coverage.opponentSummariesCreated,
      sourceProjections: firstBuild.coverage.sourceProjectionRecords,
      uniqueCanonicalContests:
        firstBuild.coverage.projectionCanonicalKeysObserved,
      noSourceOwnerSeasons: firstBuild.coverage.noSourceOwnerSeasons,
      sourceAvailableNoGameOwnerSeasons:
        firstBuild.coverage.sourceAvailableNoGameOwnerSeasons,
    },
    null,
    2
  )
);
