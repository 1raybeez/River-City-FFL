import assert from "node:assert/strict";
import {
  buildOwnerSeasonHistory,
  getAllOwnerSeasonHistory,
  getOwnerSeasonHistory,
  getOwnerSeasonHistoryCoverageSummary,
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

const unresolved2011 = getUnresolvedOwnerSeasonHistory().filter(
  (record) => record.season === 2011
);
assert.equal(unresolved2011.length, 3);
assert.deepEqual(
  unresolved2011.map((record) => record.finalPlacement).sort((a, b) => {
    return (a ?? 0) - (b ?? 0);
  }),
  [5, 9, 12]
);

assert.deepEqual(summary.seasons, [
  2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
  2023, 2024, 2025, 2026,
]);
assert.equal(summary.ownersRepresented, 28);
assert.equal(summary.totalRecords, 210);
assert.equal(summary.unresolvedRecords, 3);
assert.deepEqual(summary.duplicateRecordKeys, []);
assert.equal(summary.missingFranchiseAssignments, 3);
assert.deepEqual(
  allRecords
    .filter((record) => record.ownerId !== null && record.franchiseId === null)
    .map((record) => `${record.season}:${record.ownerId}`)
    .sort(),
  [
    "2012:darren-kusaj",
    "2012:landon-elliott",
    "2012:travis-miller",
  ]
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
  ["2012:keith-polarek", "2013:zach-woolard"]
);

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
