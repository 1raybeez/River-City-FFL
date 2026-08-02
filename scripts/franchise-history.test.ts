import assert from "node:assert/strict";

import type { CanonicalFranchiseMatchup } from "../lib/history/canonicalMatchupHistory";
import {
  APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
  buildFranchiseHistories,
  getAllFranchiseCareerSummaries,
  getAllFranchiseHistories,
  getFranchiseCareerSummary,
  getFranchiseHistory,
  getFranchiseHistoryCoverage,
  getFranchiseNameEras,
  getFranchiseOwnershipEras,
  getFranchiseSeasonHistories,
  getFranchiseSeasonHistory,
  getFranchiseTimeline,
  getUnresolvedFranchiseHistories,
  type FranchiseHistoryBuildInput,
} from "../lib/history/franchiseHistory";
import { getAllFranchiseRosterMappings } from "../lib/history/franchiseRosterMappings";
import { getAllHistoricalSeasonResults } from "../lib/history/historicalSeasonResults";
import { getAllOwnerSeasonHistory } from "../lib/history/ownerSeasonHistory";
import { franchises, ownershipTenures } from "../lib/managers/identityData";

assert.throws(
  () => getAllFranchiseHistories(),
  /not initialized/i,
  "Accessors must throw before a successful initialization."
);

function canonicalMatchup({
  matchupKey,
  matchupType,
  homeFranchiseId,
  awayFranchiseId,
  homeScore,
  awayScore,
  isChampionshipGame = false,
  isComplete = true,
  scoringPeriods = 1,
}: {
  matchupKey: string;
  matchupType: CanonicalFranchiseMatchup["matchupType"];
  homeFranchiseId: string | null;
  awayFranchiseId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  isChampionshipGame?: boolean;
  isComplete?: boolean;
  scoringPeriods?: number;
}): CanonicalFranchiseMatchup {
  return {
    matchupKey,
    season: 2020,
    leagueId: "fixture-2020",
    week: 14,
    matchupType,
    bracketType:
      matchupType === "championship-playoff"
        ? "winners"
        : matchupType === "regular" || matchupType === "bye" || matchupType === "incomplete"
          ? null
          : "losers",
    round: matchupType === "regular" ? null : 1,
    bracketPlacement: null,
    isChampionshipGame,
    scoringPeriods: Array.from({ length: scoringPeriods }, (_, index) => ({
      week: 14 + index,
      sourceMatchupId: 1,
      homeScore:
        homeScore === null ? null : homeScore / scoringPeriods,
      awayScore:
        awayScore === null ? null : awayScore / scoringPeriods,
      isComplete,
    })),
    homeFranchiseId,
    awayFranchiseId,
    homeScore,
    awayScore,
    winnerFranchiseId:
      homeScore === null || awayScore === null || homeScore === awayScore
        ? null
        : homeScore > awayScore
          ? homeFranchiseId
          : awayFranchiseId,
    loserFranchiseId:
      homeScore === null || awayScore === null || homeScore === awayScore
        ? null
        : homeScore < awayScore
          ? homeFranchiseId
          : awayFranchiseId,
    isComplete,
    correctionVersion: 1,
    source: {
      provider: "sleeper",
      sourceType: matchupType === "regular" ? "weekly-matchup" : "bracket",
      bracketType:
        matchupType === "championship-playoff"
          ? "winners"
          : matchupType === "regular" || matchupType === "bye" || matchupType === "incomplete"
            ? null
            : "losers",
      sourceMatchupId: 1,
      bracketMatchNumber: matchupType === "regular" ? null : 1,
      retrievedAt: null,
      sourceVersion: "offline-fixture-v1",
    },
    coverage: {
      pairing: matchupType === "bye" ? "partial" : "resolved",
      scores: homeScore === null || awayScore === null ? "missing" : "resolved",
      completion: isComplete ? "resolved" : "incomplete",
      franchises: "mapped",
      classification: isComplete ? "resolved" : "incomplete",
    },
  };
}

const canonicalFixtures: CanonicalFranchiseMatchup[] = [
  canonicalMatchup({
    matchupKey: "fixture:regular",
    matchupType: "regular",
    homeFranchiseId: "prestigio-mundial",
    awayFranchiseId: "the-art-of-war",
    homeScore: 110,
    awayScore: 100,
  }),
  canonicalMatchup({
    matchupKey: "fixture:playoff",
    matchupType: "championship-playoff",
    homeFranchiseId: "prestigio-mundial",
    awayFranchiseId: "the-art-of-war",
    homeScore: 120,
    awayScore: 125,
  }),
  canonicalMatchup({
    matchupKey: "fixture:title-multi-week",
    matchupType: "championship-playoff",
    homeFranchiseId: "shake-n-bakers",
    awayFranchiseId: "the-shepherd",
    homeScore: 210,
    awayScore: 200,
    isChampionshipGame: true,
    scoringPeriods: 2,
  }),
  canonicalMatchup({
    matchupKey: "fixture:third",
    matchupType: "third-place",
    homeFranchiseId: "special-brownies",
    awayFranchiseId: "the-wildcard",
    homeScore: 130,
    awayScore: 120,
  }),
  canonicalMatchup({
    matchupKey: "fixture:placement",
    matchupType: "placement",
    homeFranchiseId: "hall-pass",
    awayFranchiseId: "brilly",
    homeScore: 100,
    awayScore: 90,
  }),
  canonicalMatchup({
    matchupKey: "fixture:consolation",
    matchupType: "consolation",
    homeFranchiseId: "kissed-by-a-freckle",
    awayFranchiseId: "the-bearded-one",
    homeScore: 101,
    awayScore: 99,
  }),
  canonicalMatchup({
    matchupKey: "fixture:toilet",
    matchupType: "toilet-bowl",
    homeFranchiseId: "buckeye-nation",
    awayFranchiseId: "hotub-jellyfish",
    homeScore: 80,
    awayScore: 85,
  }),
  canonicalMatchup({
    matchupKey: "fixture:bye",
    matchupType: "bye",
    homeFranchiseId: "the-shepherd",
    awayFranchiseId: null,
    homeScore: null,
    awayScore: null,
    isComplete: false,
  }),
  canonicalMatchup({
    matchupKey: "fixture:incomplete",
    matchupType: "incomplete",
    homeFranchiseId: "prestigio-mundial",
    awayFranchiseId: "the-art-of-war",
    homeScore: null,
    awayScore: null,
    isComplete: false,
  }),
];

const input: FranchiseHistoryBuildInput = {
  franchises,
  ownershipTenures,
  historicalSeasonResults: getAllHistoricalSeasonResults(),
  ownerSeasonRecords: getAllOwnerSeasonHistory(),
  canonicalMatchups: canonicalFixtures,
  franchiseRosterMappings: getAllFranchiseRosterMappings(),
  statusOverrides: APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
};

const firstBuild = buildFranchiseHistories(input);
const firstSerialized = JSON.stringify(firstBuild);
const coverage = firstBuild.coverage;

assert.equal(coverage.canonicalFranchises, 27);
assert.equal(coverage.activeFranchises, 12);
assert.equal(coverage.dormantFranchises, 1);
assert.equal(coverage.retiredFranchises, 14);
assert.equal(coverage.activeFranchises + coverage.dormantFranchises + coverage.retiredFranchises, 27);
assert.equal(coverage.physicalSeasonResultsRead, 178);
assert.equal(coverage.physicalSeasonResultsConsumed, 177);
assert.equal(coverage.unresolvedSeasonResults, 1);
assert.equal(coverage.franchiseSeasonsWithResult + coverage.unresolvedSeasonResults, 178);
assert.equal(coverage.franchiseSeasonSummaries, 193);
assert.equal(coverage.inactiveFranchiseSeasons, 4);
assert.equal(coverage.currentFranchiseSeasonsWithoutResult, 12);
assert.equal(coverage.ownershipEras, 30);
assert.equal(coverage.nameEras, 110);
assert.equal(coverage.primaryTimelineNameEras, 11);
assert.equal(coverage.timelineEvents, 120);
assert.equal(coverage.rosterMappingsRead, 96);
assert.deepEqual(coverage.reconciliationFailures, []);
assert.ok(Object.values(coverage.duplicateKeys).every((keys) => keys.length === 0));

const physicalResultKeys = firstBuild.histories.flatMap((history) =>
  history.seasons.flatMap((season) =>
    season.source.historicalSeasonResultKey
      ? [season.source.historicalSeasonResultKey]
      : []
  )
);
assert.equal(new Set(physicalResultKeys).size, physicalResultKeys.length);

const prestigio = getFranchiseHistory("prestigio-mundial");
assert.ok(prestigio);
assert.deepEqual(
  prestigio.ownershipEras.map((era) => ({
    start: era.startSeason,
    end: era.endSeason,
    owners: era.ownerIds,
    type: era.ownershipType,
  })),
  [
    { start: 2011, end: 2011, owners: ["ray-long"], type: "solo" },
    {
      start: 2013,
      end: null,
      owners: ["jeffrey-hudgins", "ray-long"],
      type: "co-owned",
    },
  ]
);
const prestigio2012 = getFranchiseSeasonHistory("prestigio-mundial", 2012);
assert.equal(prestigio2012?.coverage.seasonResult, "inactive");
assert.deepEqual(prestigio2012?.ownerIds, []);
assert.ok(prestigio.timeline.some((event) => event.eventType === "inactive" && event.season === 2012));
assert.ok(prestigio.timeline.some((event) => event.eventType === "returned" && event.season === 2013));

const shake = getFranchiseHistory("shake-n-bakers");
assert.ok(shake);
assert.deepEqual(
  shake.ownershipEras.map((era) => ({ start: era.startSeason, owners: era.ownerIds })),
  [
    { start: 2017, owners: ["jordan-maslyn"] },
    { start: 2025, owners: ["jordan-maslyn", "landon-elliott"] },
  ]
);
assert.ok(shake.timeline.some((event) => event.eventType === "co-owner-joined" && event.season === 2025));

const specialBrownies = getFranchiseHistory("special-brownies");
assert.ok(specialBrownies);
assert.equal(specialBrownies.career.status, "dormant");
assert.equal(specialBrownies.career.latestSeason, 2024);
assert.deepEqual(specialBrownies.career.inactiveSeasons, [2025, 2026]);
assert.deepEqual(specialBrownies.ownershipEras.map((era) => era.ownerIds), [["landon-elliott"]]);
assert.ok(specialBrownies.timeline.some((event) => event.eventType === "dormant" && event.season === 2025));
assert.ok(!specialBrownies.timeline.some((event) => event.eventType === "successor-established"));
assert.ok(!shake.timeline.some((event) => event.eventType === "successor-established"));

const travis2012 = getFranchiseSeasonHistory("kissed-by-a-freckle", 2012);
assert.equal(travis2012?.historicalTeamName, "I'm Your Huckleberry");
const darren2012 = getFranchiseSeasonHistory("team-kusaj", 2012);
assert.equal(darren2012?.historicalTeamName, "Team Darren");

const specialNames = getFranchiseNameEras("special-brownies");
const typoEra = specialNames.find((era) => era.historicalName === "Specail Brownies");
assert.equal(typoEra?.timelineVisibility, "complete-history-only");
assert.ok(
  !getFranchiseTimeline("special-brownies").some(
    (event) => event.sourceKey === typoEra?.franchiseNameEraKey
  )
);
assert.equal(new Set(firstBuild.histories.map((history) => history.franchiseId)).size, 27);
assert.ok(
  firstBuild.histories
    .flatMap((history) => history.timeline)
    .every((event) => (event.eventType as string) !== "placement"),
  "Annual placements must not be emitted as generic timeline milestones."
);

const unresolved = getUnresolvedFranchiseHistories();
assert.deepEqual(unresolved.map((record) => record.historicalSeasonResultKey), [
  "historical-season-result:2011:rank-5",
]);
assert.deepEqual(unresolved[0].ownerIds, ["jd-dowling"]);

const tommy2022 = getFranchiseSeasonHistory("the-shepherd", 2022);
const dave2022 = getFranchiseSeasonHistory("the-bearded-one", 2022);
assert.equal(tommy2022?.finalPlacement, 1);
assert.equal(tommy2022?.isPlatformChampion, true);
assert.equal(tommy2022?.historicalChampionshipType, "co-champion");
assert.equal(dave2022?.finalPlacement, 2);
assert.equal(dave2022?.isPlatformChampion, false);
assert.equal(dave2022?.isPlatformRunnerUp, true);
assert.equal(dave2022?.historicalChampionshipType, "co-champion");

assert.equal(coverage.canonicalSourceSlots, 9);
assert.equal(coverage.completedPhysicalContests, 7);
assert.equal(coverage.completedPhysicalContestsConsumed, 7);
assert.equal(coverage.franchiseSideConsumptions, 14);
assert.deepEqual(coverage.unresolvedMatchupSides, []);

assert.equal(prestigio.career.matchupRecords.overall.games, 2);
assert.equal(prestigio.career.matchupRecords.regularSeason.games, 1);
assert.equal(prestigio.career.matchupRecords.championshipPlayoff.games, 1);
assert.equal(prestigio.career.matchupRecords.championshipGames.games, 0);
assert.equal(shake.career.matchupRecords.overall.games, 1);
assert.equal(shake.career.matchupRecords.championshipPlayoff.games, 1);
assert.equal(shake.career.matchupRecords.championshipGames.games, 1);
assert.equal(
  getFranchiseSeasonHistory("shake-n-bakers", 2020)?.source.canonicalMatchupKeys.length,
  1,
  "A multi-week playoff contest must retain one canonical matchup key."
);
assert.equal(specialBrownies.career.matchupRecords.overall.games, 0);
assert.equal(specialBrownies.career.matchupRecords.thirdPlace.games, 1);
assert.equal(getFranchiseCareerSummary("the-shepherd")?.matchupRecords.overall.games, 1);
assert.equal(
  getFranchiseCareerSummary("the-shepherd")?.coverage.completedMatchups,
  1,
  "Bye records must not enter matchup totals."
);

for (const history of firstBuild.histories) {
  const seasonOverallGames = history.seasons.reduce(
    (total, season) => total + season.matchupRecords.overall.games,
    0
  );
  assert.equal(history.career.matchupRecords.overall.games, seasonOverallGames);
  assert.equal(
    history.career.placements.podiums,
    history.seasons.filter((season) => season.isPodium).length
  );
}

assert.ok(Object.isFrozen(firstBuild));
assert.ok(Object.isFrozen(firstBuild.histories));
assert.ok(Object.isFrozen(firstBuild.histories[0].career));
assert.notEqual(getAllFranchiseCareerSummaries(), getAllFranchiseCareerSummaries());
assert.equal(getAllFranchiseCareerSummaries().length, 27);
assert.equal(getFranchiseSeasonHistories("prestigio-mundial").length, prestigio.seasons.length);
assert.equal(getFranchiseOwnershipEras("prestigio-mundial").length, 2);
assert.equal(getFranchiseHistoryCoverage().canonicalFranchises, 27);

const secondBuild = buildFranchiseHistories(input);
assert.equal(JSON.stringify(secondBuild), firstSerialized, "Rebuilds must be deterministic.");

assert.throws(
  () =>
    buildFranchiseHistories({
      ...input,
      franchises: [...franchises, franchises[0]],
    }),
  /duplicate IDs/i
);
assert.equal(
  getAllFranchiseCareerSummaries().length,
  27,
  "A failed rebuild must preserve the previous valid cache."
);

console.log(
  JSON.stringify(
    {
      message: "Franchise History assertions passed.",
      careerSummaries: coverage.canonicalFranchises,
      franchiseSeasonSummaries: coverage.franchiseSeasonSummaries,
      ownershipEras: coverage.ownershipEras,
      nameEras: coverage.nameEras,
      timelineEvents: coverage.timelineEvents,
      completedPhysicalContestsConsumed:
        coverage.completedPhysicalContestsConsumed,
      unresolvedSeasonResults: coverage.unresolvedSeasonResults,
      duplicateKeys: Object.values(coverage.duplicateKeys).reduce(
        (total, keys) => total + keys.length,
        0
      ),
      reconciliationFailures: coverage.reconciliationFailures.length,
    },
    null,
    2
  )
);
