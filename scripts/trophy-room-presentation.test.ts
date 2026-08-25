import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCanonicalChampionshipResults, getCanonicalHallOfFameResumes, getCompletedHistoryResults } from '../lib/history/historyAuthority';
import { ownerProfilesById } from '../lib/managers/identityData';

const page = fs.readFileSync('app/history/TrophyRoomExplorer.tsx', 'utf8');
const redirectPage = fs.readFileSync('app/league-info/trophy-room/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /River City Trophy Room/);
assert.match(redirectPage, /redirect\('\/history\?view=trophy-room'\)/);
assert.match(page, /role="tablist"/);
assert.match(page, /aria-selected=\{activeTab === 'champions'\}/);
assert.match(page, /setActiveTab\('leaderboard'\)/);
assert.match(page, /setActiveTab\('shame'\)/);
for (const dataName of ['CHAMPIONS', 'PODIUMS', 'SHAME']) assert.match(page, new RegExp(dataName));
assert.match(page, /getCanonicalChampionshipResults\(\)/);
assert.match(page, /getCanonicalHallOfFameResumes\(\)/);
assert.match(page, /ownerProfilesById\[ownerId\]\?\.fullName/);
assert.doesNotMatch(page, /const CHAMPIONS = \[/);
assert.doesNotMatch(page, /const PODIUMS = \[/);
const championshipResults = getCanonicalChampionshipResults();
assert.deepEqual([...new Set(championshipResults.map((result) => result.season))], Array.from({ length: 15 }, (_, index) => 2025 - index));
assert.equal(championshipResults.length, 16);
assert.deepEqual(
  championshipResults.filter((result) => result.season === 2022).flatMap((result) => result.ownerIds.map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId)).sort(),
  ['David Besedich', 'Tommy Moore']
);
assert.ok(!championshipResults.some((result) => result.season === 2026));

const shameResults = getCompletedHistoryResults().filter((result) => result.finalPlacement === result.teamCount);
const shameSeasonOrder = [...shameResults].sort((first, second) => second.season - first.season).map((result) => result.season);
assert.deepEqual(shameSeasonOrder, Array.from({ length: 15 }, (_, index) => 2025 - index));
assert.equal(shameSeasonOrder[0], 2025);
assert.equal(shameSeasonOrder.at(-1), 2011);
assert.equal(new Set(shameResults.map((result) => result.season)).size, 15);
assert.ok(!shameResults.some((result) => result.season === 2026));
const shameNames = (season: number) => shameResults.find((result) => result.season === season)?.ownerIds.map((ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId).join(' / ');
assert.equal(shameNames(2011), 'Rachel Woolard');
assert.equal(shameNames(2018), 'Landon Elliott');
assert.equal(shameNames(2025), 'Ray Long / Jeffrey Hudgins');
assert.match(page, /final last-place finisher from each completed River City season/);
assert.match(page, /\.sort\(\(first, second\) => second\.year - first\.year\)/);
assert.doesNotMatch(page, /const LOSERS\s*=/);
assert.doesNotMatch(page, /toilet bowl|consolation|bracket/i);

const podiums = getCanonicalHallOfFameResumes().filter((resume) => resume.podiumFinishes > 0);
const david = podiums.find((resume) => resume.manager === 'David Besedich');
const travis = podiums.find((resume) => resume.manager === 'Travis Miller');
assert.deepEqual(
  { gold: david?.championships, silver: david?.runnerUpFinishes, bronze: david?.thirdPlaceFinishes, total: (david?.championships ?? 0) + (david?.runnerUpFinishes ?? 0) + (david?.thirdPlaceFinishes ?? 0) },
  { gold: 2, silver: 0, bronze: 1, total: 3 }
);
assert.deepEqual(
  { gold: travis?.championships, silver: travis?.runnerUpFinishes, bronze: travis?.thirdPlaceFinishes, total: (travis?.championships ?? 0) + (travis?.runnerUpFinishes ?? 0) + (travis?.thirdPlaceFinishes ?? 0) },
  { gold: 0, silver: 2, bronze: 0, total: 2 }
);
assert.equal(podiums.length, 21);
assert.doesNotMatch(page, /const LOSERS = \[/);
assert.doesNotMatch(page, /final-last-place|canonical.*LOSERS|LOSERS.*canonical/i);
assert.match(page, /role="tabpanel"/);
assert.match(page, /grid-cols-1/);
assert.match(page, /focus-visible:ring/);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /isSiteNavItemActive/);

console.log('Trophy Room presentation test passed');
