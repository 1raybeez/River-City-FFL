import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalHallOfFameResumes } from "../lib/history/historyAuthority";
import { ownerProfilesById } from "../lib/managers/identityData";
import { franchises } from "../lib/managers/identityData";

const page = readFileSync("app/history/page.tsx", "utf8");
const explorer = readFileSync("app/history/HallOfFameResumeExplorer.tsx", "utf8");
const resumes = getCanonicalHallOfFameResumes();
const champions = resumes.filter((resume) => resume.championships > 0);
const activeFranchises = franchises.filter((franchise) => franchise.status === "active");
const activeOwnerIds = new Set(activeFranchises.flatMap((franchise) => franchise.activeOwnerIds));
const retired = resumes.filter((resume) => !activeOwnerIds.has(resume.ownerId) || resume.ownerId === "landon-elliott");

assert.equal(resumes.length, 28);
assert.equal(resumes.some((resume) => resume.manager === "Unknown"), false);
assert.match(page, /const rankings = getCanonicalHallOfFameResumes\(\);/);
assert.match(explorer, /Hall of Fame all-time résumé rankings/);
for (const field of ["Titles", "Podiums", "Avg Finish", "Seasons", "Status"]) {
  assert.match(explorer, new RegExp(field));
}
assert.match(explorer, /<thead/);
assert.match(explorer, /scope="col"/);
assert.match(explorer, /<caption/);
assert.match(explorer, /md:hidden/);
assert.match(explorer, /useState<ResumeView>\("active"\)/);
assert.match(explorer, /ACTIVE FRANCHISES/);
assert.match(explorer, /RETIRED OWNERS/);
assert.match(explorer, /ALL-TIME OWNERS/);
assert.match(explorer, /aria-pressed/);
assert.match(explorer, /view === "active"/);
assert.match(explorer, /stat\.status === "FORMER"/);
assert.match(explorer, /stat\.rank <= 3/);
assert.doesNotMatch(explorer, /overflow-x-auto/);

assert.equal(activeFranchises.length, 12);
assert.equal(retired.length, 15);
assert.match(page, /activeFranchiseCount=\{activeFranchises\.length\}/);
assert.match(page, /primaryOwnerId = franchise\.primaryOwnerIds\[0\] \?\? franchise\.activeOwnerIds\[0\]/);
assert.match(page, /coOwnerLabel/);
assert.match(explorer, /activeFranchiseCount/);
assert.match(explorer, /active franchises/);
assert.match(explorer, /allTimeRankings\.filter\(\(stat\) => stat\.status === "FORMER"\)/);
assert.match(page, /franchise\.coOwnerIds\.filter/);
assert.match(page, /ownerProfilesById\[ownerId\]\?\.fullName/);
assert.match(page, /\.sort\(\(first, second\) => first\.rank - second\.rank\)/);
assert.deepEqual(
  [1, 2, 3, 7, 9, 10, 11, 16, 19, 20, 23, 26],
  activeFranchises.flatMap((franchise) => {
    const primaryOwnerId = franchise.primaryOwnerIds[0] ?? franchise.activeOwnerIds[0];
    const rank = resumes.findIndex((resume) => resume.ownerId === primaryOwnerId) + 1;
    return rank > 0 ? [rank] : [];
  }).sort((first, second) => first - second)
);
assert.equal(ownerProfilesById["landon-elliott"]?.status, "active");
assert.equal(ownerProfilesById["jeffrey-hudgins"]?.status, "active");
assert.equal(activeOwnerIds.has("landon-elliott"), true);
assert.equal(activeOwnerIds.has("jeffrey-hudgins"), true);
assert.deepEqual(resumes.slice(0, 3).map((resume) => resume.manager), ["Tommy Moore", "David Besedich", "Aaron Hawkins"]);
assert.equal(resumes.findIndex((resume) => resume.manager === "Ray Long") + 1, 19);
assert.equal(resumes.findIndex((resume) => resume.manager === "Jeffrey Hudgins") + 1, 18);
assert.equal(resumes.findIndex((resume) => resume.manager === "Landon Elliott") + 1, 21);
assert.match(page, /HallOfFameResumeExplorer rankings=\{resumeRows\} allTimeRankings=\{allTimeRows\}/);

assert.match(page, /Champions Club/);
assert.match(page, /rankings\.filter\(\(stat\) => stat\.championships > 0\)/);
assert.match(page, /HallOfFameResumeExplorer/);
assert.equal(champions.length, 11);
assert.deepEqual(
  resumes.find((resume) => resume.manager === "Tommy Moore")?.championshipYears,
  [2013, 2016, 2017, 2022, 2023]
);
assert.deepEqual(
  resumes.find((resume) => resume.manager === "David Besedich")?.championshipYears,
  [2021, 2022]
);
assert.match(explorer, /Hall of Fame methodology/);
assert.match(explorer, /<details/);
assert.match(explorer, /2011–2025/);
assert.match(explorer, /Co-owners receive the shared season placement/);
assert.match(explorer, /2022 co-champions/);
for (const unsupported of ["W-L", "Win %", "playoff appearances", "finals appearances", "Toilet Bowl records", "finance"]) {
  assert.doesNotMatch(`${page}\n${explorer}`, new RegExp(unsupported, "i"));
}
for (const preserved of ["League at a glance", "Recent champions", "League eras", "Historical data coverage", "Explore more history"]) {
  assert.match(page, new RegExp(preserved, "i"));
}

console.log("Hall of Fame B2 presentation checks passed.");
