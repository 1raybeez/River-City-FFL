import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getCanonicalChampionshipResultsForSeason,
  getCanonicalHallOfFameResumes,
} from "../lib/history/historyAuthority";
import { ownerProfilesById } from "../lib/managers/identityData";

const historyPage = readFileSync("app/history/page.tsx", "utf8");
const hallOfFame = readFileSync("app/history/HallOfFameResumeExplorer.tsx", "utf8");
const trophyRoom = readFileSync("app/history/TrophyRoomExplorer.tsx", "utf8");
const portrait = readFileSync("components/OwnerPortrait.tsx", "utf8");

for (const ownerId of ["tommy-moore", "david-besedich", "aaron-hawkins", "keith-polarek", "bryan-doane", "gordie-gahagan"]) {
  assert.ok(ownerProfilesById[ownerId]?.fullName);
  assert.ok(ownerProfilesById[ownerId]?.photo, `${ownerId} should resolve a canonical portrait`);
}

const resumes = getCanonicalHallOfFameResumes();
assert.deepEqual(resumes.find((resume) => resume.manager === "Tommy Moore")?.championshipYears, [2013, 2016, 2017, 2022, 2023]);
assert.equal(resumes.find((resume) => resume.manager === "Tommy Moore")?.championships, 5);
assert.deepEqual(getCanonicalChampionshipResultsForSeason(2022).flatMap((result) => result.ownerIds), ["tommy-moore", "david-besedich"]);

assert.match(historyPage, /<OwnerPortrait name=\{stat\.manager\}/);
assert.match(historyPage, /photo=\{ownerProfilesById\[stat\.ownerId\]\?\.photo\}/);
assert.match(hallOfFame, /<OwnerPortrait name=\{stat\.manager\}/);
assert.match(trophyRoom, /<OwnerPortrait name=\{champ\.name\}/);
assert.match(trophyRoom, /<OwnerPortrait name=\{podium\.name\}/);
assert.match(trophyRoom, /<OwnerPortrait name=\{loser\.name\}/);
assert.match(portrait, /photo \?/);
assert.match(portrait, /aria-hidden="true"/);
assert.match(portrait, /RC/);
assert.doesNotMatch(portrait, /src=\{[^}]*\|\|/);

console.log("History owner portrait checks passed.");
