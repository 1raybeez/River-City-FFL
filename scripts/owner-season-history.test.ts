import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOwnerSeasonHistory,
  getAllOwnerSeasonHistory,
  getOwnerSeasonHistory,
  getOwnerSeasonHistoryCoverageSummary,
  getOwnerSeasonHistoryForSeason,
  getUnresolvedOwnerSeasonHistory,
  type OwnerSeasonHistoryRecord,
} from "../lib/history/ownerSeasonHistory";

function requireSeason(
  records: OwnerSeasonHistoryRecord[],
  season: number,
  label: string
) {
  const record = records.find((candidate) => candidate.season === season);
  assert.ok(record, `${label} should include ${season}.`);
  return record;
}

const allRecords = getAllOwnerSeasonHistory();
const rebuiltRecords = buildOwnerSeasonHistory();
const summary = getOwnerSeasonHistoryCoverageSummary(allRecords);

assert.equal(
  new Set(allRecords.map((record) => record.ownerSeasonKey)).size,
  allRecords.length
);
assert.ok(
  allRecords.every((record) => record.ownerSeasonKey === record.recordId)
);
assert.deepEqual(
  rebuiltRecords.map((record) => record.ownerSeasonKey),
  allRecords.map((record) => record.ownerSeasonKey),
  "Owner-season keys must remain stable across rebuilds."
);

const ray = getOwnerSeasonHistory("ray-long");
const jeffrey = getOwnerSeasonHistory("jeffrey-hudgins");
const jordan = getOwnerSeasonHistory("jordan-maslyn");
const landon = getOwnerSeasonHistory("landon-elliott");
const aaron = getOwnerSeasonHistory("aaron-hawkins");
const gordie = getOwnerSeasonHistory("gordie-gahagan");
const rachel = getOwnerSeasonHistory("rachel-woolard");
const tommy = getOwnerSeasonHistory("tommy-moore");
const dave = getOwnerSeasonHistory("david-besedich");

const ownerSeasonSource = readFileSync(
  new URL("../lib/history/ownerSeasonHistory.ts", import.meta.url),
  "utf8"
);
assert.doesNotMatch(ownerSeasonSource, /MANUAL_HISTORY|manual-history/);

const records2011 = getOwnerSeasonHistoryForSeason(2011);
assert.equal(records2011.length, 10);
assert.deepEqual(
  records2011.map((record) => record.finalPlacement),
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
);
assert.equal(records2011.some((record) => record.finalPlacement === 11), false);
assert.equal(records2011.some((record) => record.finalPlacement === 12), false);

const rachel2011 = requireSeason(rachel, 2011, "Rachel");
assert.equal(rachel2011.finalPlacement, 10);
assert.equal(rachel2011.isLastPlace, true);
assert.equal(rachel2011.coverage.matchupSource, "unavailable-no-source");

const tommy2022 = requireSeason(tommy, 2022, "Tommy");
const dave2022 = requireSeason(dave, 2022, "Dave");
assert.equal(tommy2022.finalPlacement, 1);
assert.equal(tommy2022.isPlatformChampion, true);
assert.equal(tommy2022.isPlatformRunnerUp, false);
assert.equal(tommy2022.isHistoricalChampion, true);
assert.equal(tommy2022.historicalChampionshipType, "co-champion");
assert.equal(dave2022.finalPlacement, 2);
assert.equal(dave2022.isPlatformChampion, false);
assert.equal(dave2022.isPlatformRunnerUp, true);
assert.equal(dave2022.isHistoricalChampion, true);
assert.equal(dave2022.historicalChampionshipType, "co-champion");
assert.match(dave2022.championshipNote ?? "", /Damar Hamlin/i);

const ray2025 = requireSeason(ray, 2025, "Ray");
const jeffrey2025 = requireSeason(jeffrey, 2025, "Jeffrey");
assert.equal(ray2025.franchiseId, "prestigio-mundial");
assert.equal(jeffrey2025.franchiseId, "prestigio-mundial");
assert.equal(ray2025.finalPlacement, 12);
assert.equal(jeffrey2025.finalPlacement, 12);
assert.equal(jeffrey2025.placementAttribution, "shared-franchise");
assert.deepEqual(
  ray2025.coOwners.map((owner) => owner.ownerId),
  ["jeffrey-hudgins"]
);
assert.deepEqual(
  jeffrey2025.coOwners.map((owner) => owner.ownerId),
  ["ray-long"]
);

const ray2011 = requireSeason(ray, 2011, "Ray");
assert.equal(ray2011.finalPlacement, 8);
assert.equal(ray2011.ownerSeasonKey, "2011:ray-long:prestigio-mundial");
assert.equal(ray2011.franchiseId, "prestigio-mundial");
assert.equal(ray2011.franchiseName, "Prestigio Mundial");
assert.equal(ray2011.ownershipRole, "primary");
assert.equal(ray2011.isPrimaryOwner, true);
assert.equal(ray2011.isCoOwner, false);
assert.deepEqual(ray2011.coOwners, []);
assert.equal(ray2011.coverage.ownership, "resolved");
assert.equal(ray2011.coverage.franchise, "resolved");
assert.equal(ray2011.sources.placement, "historical-season-results");
assert.equal(ray2011.coverage.seasonResult, "resolved");
assert.equal(ray.some((record) => record.season === 2012), false);
assert.equal(jeffrey.some((record) => record.season === 2011), false);

const ray2013 = requireSeason(ray, 2013, "Ray");
const jeffrey2013 = requireSeason(jeffrey, 2013, "Jeffrey");
assert.equal(ray2013.franchiseId, "prestigio-mundial");
assert.equal(jeffrey2013.franchiseId, "prestigio-mundial");
assert.equal(ray2013.ownershipRole, "co-owner");
assert.equal(jeffrey2013.ownershipRole, "co-owner");
assert.equal(ray2013.placementAttribution, "direct");
assert.equal(jeffrey2013.placementAttribution, "shared-franchise");

const jordan2024 = requireSeason(jordan, 2024, "Jordan");
const landon2024 = requireSeason(landon, 2024, "Landon");
assert.equal(jordan2024.franchiseId, "shake-n-bakers");
assert.equal(jordan2024.finalPlacement, 1);
assert.equal(landon2024.franchiseId, "special-brownies");
assert.equal(landon2024.finalPlacement, 9);

const jordan2025 = requireSeason(jordan, 2025, "Jordan");
const landon2025 = requireSeason(landon, 2025, "Landon");
assert.equal(jordan2025.franchiseId, "shake-n-bakers");
assert.equal(landon2025.franchiseId, "shake-n-bakers");
assert.equal(jordan2025.finalPlacement, 8);
assert.equal(landon2025.finalPlacement, 8);
assert.equal(landon2025.placementAttribution, "shared-franchise");
assert.equal(jordan2025.isPrimaryOwner, true);
assert.equal(landon2025.isCoOwner, true);

const landon2026 = requireSeason(landon, 2026, "Landon");
assert.equal(landon2026.franchiseId, "shake-n-bakers");
assert.equal(landon2026.finalPlacement, null);
assert.equal(landon2026.coverage.placement, "not-available");

const aaron2025 = requireSeason(aaron, 2025, "Aaron");
assert.equal(aaron2025.finalPlacement, 1);
assert.equal(aaron2025.isChampion, true);
assert.equal(aaron2025.coOwners.length, 0);

const gordie2011 = requireSeason(gordie, 2011, "Gordie");
assert.equal(gordie2011.finalPlacement, 1);
assert.equal(gordie2011.isChampion, true);
assert.equal(gordie2011.ownerStatus, "retired");

const jd2011 = requireSeason(getOwnerSeasonHistory("jd-dowling"), 2011, "JD");
assert.equal(jd2011.finalPlacement, 5);
assert.equal(jd2011.franchiseId, null);
assert.equal(jd2011.coverage.franchise, "unresolved");
assert.equal(getUnresolvedOwnerSeasonHistory().length, 0);

const travis2012 = requireSeason(
  getOwnerSeasonHistory("travis-miller"),
  2012,
  "Travis"
);
const darren2012 = requireSeason(
  getOwnerSeasonHistory("darren-kusaj"),
  2012,
  "Darren"
);
assert.equal(travis2012.teamName, "I'm Your Huckleberry");
assert.equal(travis2012.historicalTeamName, "I'm Your Huckleberry");
assert.equal(travis2012.franchiseId, "kissed-by-a-freckle");
assert.equal(darren2012.teamName, "Team Darren");
assert.equal(darren2012.historicalTeamName, "Team Darren");
assert.equal(darren2012.franchiseId, "team-kusaj");

assert.deepEqual(summary.seasons, [
  2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
  2023, 2024, 2025, 2026,
]);
assert.equal(summary.ownersRepresented, 28);
assert.equal(summary.totalRecords, 206);
assert.equal(summary.unresolvedRecords, 0);
assert.deepEqual(summary.duplicateRecordKeys, []);
assert.equal(summary.missingFranchiseAssignments, 1);
assert.equal(summary.recordsWithSeasonResult, 192);
assert.equal(summary.recordsWithoutSeasonResult, 14);
assert.equal(summary.recordsWithHistoricalTeamName, 147);
assert.equal(summary.recordsWithUnavailableMatchupSource, 87);
assert.deepEqual(
  allRecords
    .filter((record) => record.ownerId !== null && record.franchiseId === null)
    .map((record) => `${record.season}:${record.ownerId}`)
    .sort(),
  ["2011:jd-dowling"]
);
assert.deepEqual(
  allRecords
    .filter(
      (record) =>
        record.season < 2026 &&
        record.ownerId !== null &&
        record.finalPlacement === null
    )
    .map((record) => `${record.season}:${record.ownerId}`)
    .sort(),
  []
);
assert.equal(
  getOwnerSeasonHistory("keith-polarek").some(
    (record) => record.season === 2012
  ),
  false
);
assert.equal(
  getOwnerSeasonHistory("zach-woolard").some(
    (record) => record.season === 2013
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
  "opponentHistory",
  "matchups",
];
allRecords
  .filter((record) => record.season < 2018)
  .forEach((record) => {
    assert.equal(record.coverage.matchupSource, "unavailable-no-source");
    forbiddenMatchupFields.forEach((field) => {
      assert.equal(Object.hasOwn(record, field), false);
    });
  });

const requestedSamples = {
  ray: ray2025,
  jeffrey: jeffrey2025,
  jordan: jordan2025,
  landon: landon2025,
  activeSingleOwner: aaron2025,
  retiredOwner: gordie2011,
};

console.log(
  JSON.stringify(
    {
      summary,
      specialCases: {
        ray2011,
        ray2013,
        jeffrey2013,
        ray2025,
        jeffrey2025,
        jordan2024,
        landon2024,
        jordan2025,
        landon2025,
        landon2026,
      },
      requestedSamples,
    },
    null,
    2
  )
);
