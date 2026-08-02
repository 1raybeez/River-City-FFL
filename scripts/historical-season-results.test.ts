import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  HISTORICAL_SEASON_RESULTS_SOURCE,
  getAllHistoricalSeasonResults,
  getHistoricalSeasonResult,
  getHistoricalSeasonResultsCoverage,
  getHistoricalSeasonResultsForOwner,
  getHistoricalSeasonResultsForSeason,
} from "../lib/history/historicalSeasonResults";
import { getOwnerCareerSummary } from "../lib/history/ownerCareerSummary";
import { getOwnerSeasonHistory } from "../lib/history/ownerSeasonHistory";

function requireResult(ownerIdOrSlug: string, season: number) {
  const result = getHistoricalSeasonResult(ownerIdOrSlug, season);
  assert.ok(result, `Expected ${ownerIdOrSlug} to have a ${season} result.`);
  return result;
}

const allResults = getAllHistoricalSeasonResults();
const coverage = getHistoricalSeasonResultsCoverage();

assert.equal(existsSync(HISTORICAL_SEASON_RESULTS_SOURCE.workbookPath), true);
assert.equal(
  HISTORICAL_SEASON_RESULTS_SOURCE.workbookPath,
  "data/source/historical/river-city-final-standings-and-payouts.xlsx"
);
assert.equal(
  HISTORICAL_SEASON_RESULTS_SOURCE.workbookSha256,
  "4b0d96b19b93e6039807558f1f49ca9d4e7aae1a728bb5636001cef964fe6552"
);

assert.equal(allResults.length, 178);
assert.equal(coverage.totalSeasonResults, 178);
assert.equal(coverage.totalOwnerCredits, 192);
assert.equal(coverage.historicalChampionResults, 16);
assert.equal(coverage.missingHistoricalTeamNameResults, 43);
assert.deepEqual(coverage.seasons, [
  2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
  2023, 2024, 2025,
]);
assert.deepEqual(coverage.duplicateSeasonResultKeys, []);
assert.deepEqual(coverage.duplicateSeasonPlacements, []);
assert.deepEqual(coverage.unresolvedOwnerResultKeys, []);
assert.deepEqual(coverage.seasonsWithInvalidPlacementCounts, []);
assert.deepEqual(coverage.unresolvedFranchiseResultKeys, [
  "historical-season-result:2011:rank-5",
]);

const results2011 = getHistoricalSeasonResultsForSeason(2011);
assert.equal(results2011.length, 10);
assert.deepEqual(
  results2011.map((result) => result.finalPlacement),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);
assert.equal(results2011.some((result) => result.finalPlacement > 10), false);
assert.equal(requireResult("jd-dowling", 2011).finalPlacement, 5);
assert.equal(requireResult("darren-kusaj", 2011).finalPlacement, 9);
const rachel2011 = requireResult("rachel-woolard", 2011);
assert.equal(rachel2011.finalPlacement, 10);
assert.equal(rachel2011.isLastPlace, true);
assert.equal(requireResult("ray-long", 2011).finalPlacement, 8);
assert.equal(getHistoricalSeasonResult("jeffrey-hudgins", 2011), null);

for (let season = 2012; season <= 2025; season += 1) {
  const seasonResults = getHistoricalSeasonResultsForSeason(season);
  assert.equal(seasonResults.length, 12, `${season} must have 12 results.`);
  assert.deepEqual(
    seasonResults.map((result) => result.finalPlacement),
    Array.from({ length: 12 }, (_, index) => index + 1),
    `${season} must contain each platform placement exactly once.`
  );
}

const tommy2022 = requireResult("tommy-moore", 2022);
const dave2022 = requireResult("david-besedich", 2022);
assert.equal(tommy2022.finalPlacement, 1);
assert.equal(tommy2022.isPlatformChampion, true);
assert.equal(tommy2022.isPlatformRunnerUp, false);
assert.equal(tommy2022.isHistoricalChampion, true);
assert.equal(dave2022.finalPlacement, 2);
assert.equal(dave2022.isPlatformChampion, false);
assert.equal(dave2022.isPlatformRunnerUp, true);
assert.equal(dave2022.isHistoricalChampion, true);
assert.match(tommy2022.championshipNote ?? "", /Damar Hamlin/i);
assert.equal(tommy2022.championshipNote, dave2022.championshipNote);
assert.deepEqual(
  getHistoricalSeasonResultsForSeason(2022)
    .filter((result) => result.isHistoricalChampion)
    .flatMap((result) => result.ownerIds),
  ["tommy-moore", "david-besedich"]
);

const jordan2022 = requireResult("jordan-maslyn", 2022);
const jd2022 = requireResult("jd-dowling", 2022);
assert.equal(jordan2022.finalPlacement, 11);
assert.equal(jordan2022.isLastPlace, false);
assert.equal(jd2022.finalPlacement, 12);
assert.equal(jd2022.isLastPlace, true);

const landon2012 = requireResult("landon-elliott", 2012);
assert.equal(landon2012.franchiseId, "special-brownies");
assert.equal(landon2012.rawTeamName, "Special Brownies");
assert.equal(landon2012.coverage.franchise, "resolved");

const travis2012 = requireResult("travis-miller", 2012);
assert.equal(travis2012.franchiseId, "kissed-by-a-freckle");
assert.equal(travis2012.rawTeamName, "I'm Your Huckleberry");
assert.equal(travis2012.coverage.franchise, "resolved");

const darren2012 = requireResult("darren-kusaj", 2012);
assert.equal(darren2012.franchiseId, "team-kusaj");
assert.equal(darren2012.rawTeamName, "Team Darren");
assert.equal(darren2012.coverage.franchise, "resolved");

const ray2013 = requireResult("ray-long", 2013);
const jeffrey2013 = requireResult("jeffrey-hudgins", 2013);
assert.equal(ray2013.seasonResultKey, jeffrey2013.seasonResultKey);
assert.deepEqual(ray2013.ownerIds, ["ray-long", "jeffrey-hudgins"]);
assert.equal(getHistoricalSeasonResult("ray-long", 2012), null);

const jordan2025 = requireResult("jordan-maslyn", 2025);
const landon2025 = requireResult("landon-elliott", 2025);
assert.equal(jordan2025.seasonResultKey, landon2025.seasonResultKey);
assert.equal(jordan2025.franchiseId, "shake-n-bakers");
assert.deepEqual(jordan2025.ownerIds, [
  "jordan-maslyn",
  "landon-elliott",
]);
assert.equal(
  getHistoricalSeasonResultsForOwner("landon-elliott").some(
    (result) =>
      result.season < 2025 && result.franchiseId === "shake-n-bakers"
  ),
  false
);

const forbiddenMatchupFields = [
  "wins",
  "losses",
  "ties",
  "winningPercentage",
  "pointsFor",
  "pointsAgainst",
  "regularSeasonRecord",
  "playoffRecord",
  "opponentHistory",
  "matchups",
];

allResults
  .filter((result) => result.season < 2018)
  .forEach((result) => {
    assert.equal(result.coverage.matchupSource, "unavailable-no-source");
    forbiddenMatchupFields.forEach((field) => {
      assert.equal(
        Object.hasOwn(result, field),
        false,
        `${result.seasonResultKey} must not fabricate ${field}.`
      );
    });
  });

allResults
  .filter((result) => result.season >= 2018)
  .forEach((result) => {
    assert.equal(
      result.coverage.matchupSource,
      "available-in-separate-engine"
    );
  });

for (let season = 2012; season <= 2025; season += 1) {
  getHistoricalSeasonResultsForSeason(season).forEach((result) => {
    result.ownerIds.forEach((ownerId) => {
      const existingRecord = getOwnerSeasonHistory(ownerId).find(
        (candidate) => candidate.season === season
      );
      assert.ok(
        existingRecord,
        `Existing owner-season history should remain consumable for ${ownerId} ${season}.`
      );
      assert.equal(existingRecord.finalPlacement, result.finalPlacement);
    });
  });
}

assert.ok(getOwnerCareerSummary("tommy-moore"));
assert.ok(getOwnerCareerSummary("david-besedich"));
assert.equal(getHistoricalSeasonResult("not-an-owner", 2022), null);
assert.deepEqual(getHistoricalSeasonResultsForOwner("not-an-owner"), []);

const mutable = requireResult("ray-long", 2025);
mutable.ownerIds.push("consumer-mutation");
mutable.source.corroboratingReferences.push("consumer-mutation");
mutable.notes.push("consumer-mutation");
const fresh = requireResult("ray-long", 2025);
assert.equal(fresh.ownerIds.includes("consumer-mutation"), false);
assert.equal(
  fresh.source.corroboratingReferences.includes("consumer-mutation"),
  false
);
assert.equal(fresh.notes.includes("consumer-mutation"), false);

const summary = {
  coverage,
  season2011: results2011.map((result) => ({
    placement: result.finalPlacement,
    ownerIds: result.ownerIds,
    franchiseId: result.franchiseId,
  })),
  championship2022: {
    platformChampion: tommy2022.ownerIds,
    platformRunnerUp: dave2022.ownerIds,
    historicalChampions: getHistoricalSeasonResultsForSeason(2022)
      .filter((result) => result.isHistoricalChampion)
      .flatMap((result) => result.ownerIds),
    championshipNote: tommy2022.championshipNote,
  },
  espnFranchises: {
    landon: landon2012.franchiseId,
    travis: travis2012.franchiseId,
    darren: darren2012.franchiseId,
  },
};

console.log(JSON.stringify(summary, null, 2));
