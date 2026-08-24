import assert from "node:assert/strict";
import {
  getCanonicalChampionNames,
  getCanonicalChampionshipResults,
  getCanonicalChampionshipResultsForSeason,
  getCanonicalHallOfFameResumes,
  getCompletedHistoryResults,
  getHistoricalPostseasonEra,
  getHistoryMatchupCoverageNote,
  hasCanonicalMatchupCoverage,
  HISTORY_CURRENT_SEASON,
  HISTORY_LAST_COMPLETED_SEASON,
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

const resumes = getCanonicalHallOfFameResumes();
assert.equal(resumes.length, 28);
assert.equal(new Set(resumes.map((resume) => resume.ownerId)).size, resumes.length);
const tommy = resumes.find((resume) => resume.manager === "Tommy Moore");
const david = resumes.find((resume) => resume.manager === "David Besedich");
assert.deepEqual(tommy && { championships: tommy.championships, years: tommy.championshipYears }, { championships: 5, years: [2013, 2016, 2017, 2022, 2023] });
assert.deepEqual(david && { championships: david.championships, years: david.championshipYears }, { championships: 2, years: [2021, 2022] });
assert.equal(david?.runnerUpFinishes, 0);
assert.equal(david?.podiumFinishes, 3);
assert.equal(resumes.find((resume) => resume.manager === "JD Dowling")?.seasonsPlayed, 15);
assert.ok(Math.abs((resumes.find((resume) => resume.manager === "JD Dowling")?.averageFinish ?? 0) - 5.9333333333) < 0.000001);
assert.equal(resumes.find((resume) => resume.manager === "Landon Elliott")?.seasonsPlayed, 14);
assert.ok(Math.abs((resumes.find((resume) => resume.manager === "Landon Elliott")?.averageFinish ?? 0) - 7.4285714286) < 0.000001);
assert.equal(resumes.find((resume) => resume.manager === "Darren Kusaj")?.averageFinish, 9.5);
assert.equal(resumes.find((resume) => resume.manager === "Rachel Woolard")?.averageFinish, 10);
assert.equal(resumes.some((resume) => resume.manager === "Unknown"), false);

const coOwnerSeasons = completedResults
  .filter((result) => result.ownerIds.includes("ray-long") && result.ownerIds.includes("jeffrey-hudgins"))
  .map((result) => result.season);
assert.deepEqual(coOwnerSeasons, [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
assert.equal(resumes.find((resume) => resume.manager === "Ray Long")?.seasonsPlayed, 14);

const expectedTopTen = ["Tommy Moore", "David Besedich", "Aaron Hawkins", "Keith Polarek", "Bryan Doane", "Gordie Gahagan", "JD Dowling", "Garet Prior", "Brian Stevens", "Wade Cameron"];
assert.deepEqual(resumes.slice(0, 10).map((resume) => resume.manager), expectedTopTen);
const legacyStats = calculateAllTimeStats();
assert.equal(legacyStats.find((stat) => stat.manager === "David Besedich")?.wins, 1);

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
