import assert from "node:assert/strict";
import { getHistoricalSeasonResultsForOwner } from "../lib/history/historicalSeasonResults";
import {
  buildOwnerCareerSummaries,
  getActiveOwnerCareerSummaries,
  getAllOwnerCareerSummaries,
  getOwnerCareerSummary,
  getOwnerCareerSummaryCoverage,
  getRetiredOwnerCareerSummaries,
  type OwnerCareerSummary,
} from "../lib/history/ownerCareerSummary";
import {
  getAllOwnerSeasonHistory,
  getOwnerSeasonHistory,
} from "../lib/history/ownerSeasonHistory";

function requireSummary(ownerId: string) {
  const summary = getOwnerCareerSummary(ownerId);
  assert.ok(summary, `Expected a career summary for ${ownerId}.`);
  return summary;
}

function requireFranchise(summary: OwnerCareerSummary, franchiseId: string) {
  const franchise = summary.franchiseHistory.find(
    (candidate) => candidate.franchiseId === franchiseId
  );
  assert.ok(
    franchise,
    `Expected ${summary.ownerId} to include franchise ${franchiseId}.`
  );
  return franchise;
}

const allSummaries = getAllOwnerCareerSummaries();
const rebuiltSummaries = buildOwnerCareerSummaries();
const coverage = getOwnerCareerSummaryCoverage();
const resolvedSeasonRecords = getAllOwnerSeasonHistory().filter(
  (record) => record.ownerId !== null
);

assert.equal(
  new Set(allSummaries.map((summary) => summary.ownerId)).size,
  allSummaries.length,
  "Career-summary owner IDs must be unique."
);
assert.deepEqual(coverage.duplicateSummaryIds, []);
assert.deepEqual(coverage.duplicateConsumedOwnerSeasonKeys, []);
assert.equal(rebuiltSummaries.length, allSummaries.length);

allSummaries.forEach((summary) => {
  const ownerRecords = getOwnerSeasonHistory(summary.ownerId);
  const historicalResults = getHistoricalSeasonResultsForOwner(
    summary.ownerId
  );
  const uniqueOwnerSeasonKeys = new Set(
    ownerRecords.map((record) => record.ownerSeasonKey)
  );
  const uniqueSeasons = new Set(ownerRecords.map((record) => record.season));
  const knownPlacements = ownerRecords.flatMap((record) =>
    record.finalPlacement === null ? [] : [record.finalPlacement]
  );
  const expectedAverage =
    knownPlacements.length > 0
      ? knownPlacements.reduce((sum, placement) => sum + placement, 0) /
        knownPlacements.length
      : null;

  assert.equal(
    uniqueOwnerSeasonKeys.size,
    ownerRecords.length,
    `${summary.ownerId} must not consume an owner-season key twice.`
  );
  assert.equal(
    summary.seasons.seasonsRepresented,
    uniqueSeasons.size,
    `${summary.ownerId} must count unique represented seasons.`
  );
  assert.equal(
    summary.placements.podiums,
    ownerRecords.filter((record) => record.isPodium).length,
    `${summary.ownerId} podiums must use placement-based owner-season flags.`
  );
  assert.equal(
    summary.placements.averageFinish,
    expectedAverage,
    `${summary.ownerId} average must use only known placements.`
  );
  assert.equal(
    summary.coverage.ownerSeasonRecords,
    ownerRecords.length,
    `${summary.ownerId} coverage must match consumed records.`
  );
  assert.equal(
    ownerRecords.filter((record) => record.historicalSeasonResultKey !== null)
      .length,
    historicalResults.length,
    `${summary.ownerId} must consume every approved historical owner credit once.`
  );
  assert.equal(
    summary.placements.platformChampionships,
    historicalResults.filter((result) => result.isPlatformChampion).length,
    `${summary.ownerId} platform titles must reconcile to Historical Season Results.`
  );
  assert.equal(
    summary.placements.historicalChampionships,
    historicalResults.filter((result) => result.isHistoricalChampion).length,
    `${summary.ownerId} historical titles must reconcile to Historical Season Results.`
  );
  assert.equal(summary.coverage.unresolvedRecordsAttributed, 0);
  assert.equal(summary.futureEnrichment.regularSeasonRecord, null);
  assert.equal(summary.futureEnrichment.playoffRecord, null);
  assert.equal(summary.futureEnrichment.winningPercentage, null);
  assert.equal(summary.futureEnrichment.playoffAppearances, null);
  assert.equal(summary.futureEnrichment.pointsFor, null);
  assert.equal(summary.futureEnrichment.pointsAgainst, null);
  assert.equal(summary.futureEnrichment.careerWinnings, null);
  assert.equal(summary.futureEnrichment.netEarnings, null);
  assert.equal(summary.futureEnrichment.favoriteVictimOwnerId, null);
  assert.equal(summary.futureEnrichment.nemesisOwnerId, null);
  assert.equal(summary.futureEnrichment.mostPlayedOpponentOwnerId, null);
  assert.equal(summary.futureEnrichment.statisticalRivalryOwnerId, null);
  assert.equal(summary.futureEnrichment.draftPerformance, null);
  assert.equal(summary.futureEnrichment.tradePerformance, null);
});

const ray = requireSummary("ray-long");
const jeffrey = requireSummary("jeffrey-hudgins");
const jordan = requireSummary("jordan-maslyn");
const landon = requireSummary("landon-elliott");
const aaron = requireSummary("aaron-hawkins");
const gordie = requireSummary("gordie-gahagan");
const tommy = requireSummary("tommy-moore");
const dave = requireSummary("david-besedich");
const travis = requireSummary("travis-miller");
const keith = requireSummary("keith-polarek");
const damon = requireSummary("damon-davis");

const rayPrestigio = requireFranchise(ray, "prestigio-mundial");
const jeffreyPrestigio = requireFranchise(jeffrey, "prestigio-mundial");
assert.deepEqual(
  {
    platformChampionships: rayPrestigio.platformChampionships,
    historicalChampionships: rayPrestigio.historicalChampionships,
    runnerUpFinishes: rayPrestigio.runnerUpFinishes,
    thirdPlaceFinishes: rayPrestigio.thirdPlaceFinishes,
    podiums: rayPrestigio.podiums,
    lastPlaceFinishes: rayPrestigio.lastPlaceFinishes,
  },
  {
    platformChampionships: jeffreyPrestigio.platformChampionships,
    historicalChampionships: jeffreyPrestigio.historicalChampionships,
    runnerUpFinishes: jeffreyPrestigio.runnerUpFinishes,
    thirdPlaceFinishes: jeffreyPrestigio.thirdPlaceFinishes,
    podiums: jeffreyPrestigio.podiums,
    lastPlaceFinishes: jeffreyPrestigio.lastPlaceFinishes,
  }
);
assert.equal(rayPrestigio.firstSeason, 2011);
assert.equal(rayPrestigio.seasonsRepresented, 15);
assert.deepEqual(rayPrestigio.ownershipRoles, ["primary", "co-owner"]);
assert.equal(jeffreyPrestigio.firstSeason, 2013);
assert.equal(jeffreyPrestigio.seasonsRepresented, 14);
assert.deepEqual(jeffreyPrestigio.ownershipRoles, ["co-owner"]);
assert.equal(
  getOwnerSeasonHistory("ray-long").some(
    (record) => record.season === 2012
  ),
  false
);
assert.equal(
  getOwnerSeasonHistory("jeffrey-hudgins").some(
    (record) => record.season === 2011
  ),
  false
);
assert.equal(ray.placements.platformChampionships, 0);
assert.equal(ray.placements.historicalChampionships, 0);
assert.equal(ray.placements.runnerUpFinishes, 0);
assert.equal(ray.placements.thirdPlaceFinishes, 3);
assert.equal(jeffrey.placements.platformChampionships, 0);
assert.equal(jeffrey.placements.historicalChampionships, 0);
assert.equal(jeffrey.placements.runnerUpFinishes, 0);
assert.equal(jeffrey.placements.thirdPlaceFinishes, 3);
assert.equal(ray.coverage.missingFranchiseRecords, 0);
assert.equal(ray.latestFranchise?.franchiseId, "prestigio-mundial");
assert.equal(jeffrey.latestFranchise?.franchiseId, "prestigio-mundial");
assert.equal(tommy.placements.platformChampionships, 5);
assert.equal(tommy.placements.historicalChampionships, 5);
assert.equal(dave.placements.platformChampionships, 1);
assert.equal(dave.placements.historicalChampionships, 2);
assert.equal(dave.placements.runnerUpFinishes, 1);
assert.equal(dave.placements.podiums, 3);
assert.equal(
  resolvedSeasonRecords.filter(
    (record) =>
      record.season === 2025 &&
      record.franchiseId === "prestigio-mundial"
  ).length,
  2,
  "Prestigio should remain one franchise with two owner attributions."
);

const jordanShake = requireFranchise(jordan, "shake-n-bakers");
const landonShake = requireFranchise(landon, "shake-n-bakers");
const landonSpecialBrownies = requireFranchise(landon, "special-brownies");
assert.equal(landon.franchiseHistory.length, 2);
assert.equal(jordan.franchiseHistory.length, 1);
assert.equal(landonSpecialBrownies.latestSeason, 2024);
assert.equal(landonShake.firstSeason, 2025);
assert.equal(landonShake.latestSeason, 2026);
assert.equal(landonShake.platformChampionships, 0);
assert.equal(landonShake.historicalChampionships, 0);
assert.equal(jordanShake.platformChampionships, 1);
assert.equal(jordanShake.historicalChampionships, 1);
assert.equal(
  getOwnerSeasonHistory("landon-elliott").some(
    (record) =>
      record.season < 2025 && record.franchiseId === "shake-n-bakers"
  ),
  false
);
assert.equal(
  getOwnerSeasonHistory("jordan-maslyn").some(
    (record) => record.franchiseId === "special-brownies"
  ),
  false
);

assert.equal(aaron.placements.platformChampionships, 1);
assert.equal(aaron.placements.historicalChampionships, 1);
assert.equal(aaron.latestFranchise?.franchiseId, "hawkins-heroes");
assert.equal(gordie.ownerStatus, "retired");
assert.equal(gordie.latestFranchise?.franchiseId, "freakshow-freaks");

assert.equal(travis.coverage.missingFranchiseRecords, 0);
assert.equal(coverage.missingFranchiseRecords, 1);
assert.equal(keith.seasons.seasonsRepresented, 4);
assert.equal(keith.seasons.seasonsWithKnownPlacement, 4);
assert.equal(keith.placements.averageFinish, 3.5);

assert.equal(damon.ownerStatus, "staff");
assert.equal(damon.seasons.seasonsRepresented, 0);
assert.equal(damon.latestFranchise, null);
assert.deepEqual(damon.franchiseHistory, []);
assert.equal(damon.placements.averageFinish, null);

assert.equal(
  allSummaries.some((summary) => summary.ownerId.includes("unresolved")),
  false
);
assert.equal(
  allSummaries.some((summary) => summary.ownerId === "unknown"),
  false
);

const mutableRay = requireSummary("ray-long");
mutableRay.notes.push("consumer mutation");
mutableRay.seasons.seasonsRepresented = -1;
mutableRay.franchiseHistory[0].ownershipRoles.push("staff");
mutableRay.coverage.ownerSeasonRecords = -1;
const freshRay = requireSummary("ray-long");
assert.equal(freshRay.notes.includes("consumer mutation"), false);
assert.notEqual(freshRay.seasons.seasonsRepresented, -1);
assert.equal(
  freshRay.franchiseHistory[0].ownershipRoles.includes("staff"),
  false
);
assert.notEqual(freshRay.coverage.ownerSeasonRecords, -1);

assert.equal(
  getActiveOwnerCareerSummaries().every(
    (summary) => summary.ownerStatus === "active"
  ),
  true
);
assert.equal(
  getRetiredOwnerCareerSummaries().every(
    (summary) => summary.ownerStatus === "retired"
  ),
  true
);

console.log(
  JSON.stringify(
    {
      coverage,
      requestedSamples: {
        ray,
        jeffrey,
        jordan,
        landon,
        aaron,
        gordie,
        missingFranchiseOwner: travis,
        missingPlacementOwner: keith,
      },
      staff: damon,
    },
    null,
    2
  )
);
