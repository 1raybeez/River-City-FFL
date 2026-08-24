import assert from "node:assert/strict";
import {
  getCanonicalChampionNames,
  getCanonicalChampionshipResults,
  getCanonicalChampionshipResultsForSeason,
  getCompletedHistoryResults,
  getHistoricalPostseasonEra,
  getHistoryMatchupCoverageNote,
  hasCanonicalMatchupCoverage,
  HISTORY_CURRENT_SEASON,
  HISTORY_LAST_COMPLETED_SEASON,
  reconcileHallOfFameStats,
} from "../lib/history/historyAuthority";
import { calculateAllTimeStats } from "../lib/stats";

const completedResults = getCompletedHistoryResults();
const championships = getCanonicalChampionshipResults();

assert.equal(HISTORY_CURRENT_SEASON, 2026);
assert.equal(HISTORY_LAST_COMPLETED_SEASON, 2025);
assert.equal(new Set(completedResults.map((result) => result.season)).has(2026), false);
assert.equal(Math.max(...completedResults.map((result) => result.season)), 2025);

const champions2022 = getCanonicalChampionshipResultsForSeason(2022);
assert.deepEqual(
  champions2022.flatMap((result) => result.ownerIds),
  ["tommy-moore", "david-besedich"]
);
assert.equal(champions2022[0]?.isPlatformChampion, true);
assert.equal(champions2022[1]?.isPlatformRunnerUp, true);
assert.equal(champions2022.every((result) => result.isHistoricalChampion), true);

const championNames = getCanonicalChampionNames();
assert.equal(championNames.length, 11);
assert.deepEqual(championNames, [
  "Aaron Hawkins",
  "Jordan Maslyn",
  "Tommy Moore",
  "David Besedich",
  "JD Dowling",
  "Wade Cameron",
  "Brian Stevens",
  "Keith Polarek",
  "Garet Prior",
  "Bryan Doane",
  "Gordie Gahagan",
]);
assert.equal(new Set(championNames).size, championNames.length);
assert.equal(championships.some((result) => result.season === 2026), false);

const reconciled = reconcileHallOfFameStats(calculateAllTimeStats());
const tommy = reconciled.find((stat) => stat.manager === "Tommy Moore");
const david = reconciled.find((stat) => stat.manager === "David Besedich");
assert.deepEqual(tommy && { wins: tommy.wins, titles: tommy.titles }, { wins: 5, titles: [2023, 2022, 2017, 2016, 2013] });
assert.deepEqual(david && { wins: david.wins, titles: david.titles }, { wins: 2, titles: [2022, 2021] });
const legacyDavid = calculateAllTimeStats().find((stat) => stat.manager === "David Besedich");
assert.equal(david?.avgRank, legacyDavid?.avgRank);
assert.equal(reconciled[0]?.manager, "Tommy Moore");
assert.equal(reconciled[0]?.wins, 5);

assert.equal(getHistoricalPostseasonEra(2011), "Consolation Bracket era");
assert.equal(getHistoricalPostseasonEra(2021), "Consolation Bracket era");
assert.equal(getHistoricalPostseasonEra(2022), "Toilet Bowl era");
assert.equal(getHistoricalPostseasonEra(2025), "Toilet Bowl era");

assert.equal(hasCanonicalMatchupCoverage(2017), false);
assert.equal(hasCanonicalMatchupCoverage(2018), true);
assert.equal(hasCanonicalMatchupCoverage(2025), true);
assert.equal(hasCanonicalMatchupCoverage(2026), false);
assert.match(getHistoryMatchupCoverageNote(), /2018/);

const jd2022 = getCompletedHistoryResults().find(
  (result) => result.season === 2022 && result.ownerIds.includes("jd-dowling")
);
assert.equal(jd2022?.finalPlacement, 12);
assert.equal(jd2022?.isLastPlace, true);
assert.equal(jd2022?.isHistoricalChampion, false);

console.log("History authority contract checks passed.");
