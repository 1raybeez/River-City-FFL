import assert from "node:assert/strict";
import {
  acquireCanonicalMatchupInput,
  CanonicalMatchupAcquisitionError,
} from "../lib/history/canonicalMatchupAcquisition";
import {
  buildCanonicalMatchups,
  getAllCanonicalMatchups,
  getCanonicalCoverage,
  getCanonicalMatchup,
  getCanonicalMatchupsForSeason,
  type CanonicalMatchupBuildInput,
  type CanonicalMatchupRow,
} from "../lib/history/canonicalMatchupHistory";
import type { BracketMatch } from "../lib/sleeper";

function row(
  rosterId: number,
  matchupId: number | undefined,
  points: number | null
): CanonicalMatchupRow {
  return {
    roster_id: rosterId,
    matchup_id: matchupId,
    points,
  };
}

const winnersBracket: BracketMatch[] = [
  { r: 1, m: 1, t1: 1, t2: 2, w: 1, l: 2 },
  { r: 1, m: 2, t1: 3, t2: null, w: null, l: null },
  { r: 2, m: 3, t1: 1, t2: 3, w: 1, l: 3, p: 1 },
  { r: 2, m: 4, t1: 2, t2: 4, w: 2, l: 4, p: 3 },
  { r: 2, m: 5, t1: 5, t2: 6, w: 5, l: 6, p: 5 },
  { r: 3, m: 6, t1: 9, t2: 10, w: null, l: null },
  // A repeated source slot must be reported and deduplicated.
  { r: 2, m: 5, t1: 5, t2: 6, w: 5, l: 6, p: 5 },
];

const fixture: CanonicalMatchupBuildInput = {
  seasons: [
    {
      season: 2024,
      leagueId: "fixture-2024",
      playoffWeekStart: 3,
      finalScoringPeriod: 5,
      completedScoringPeriods: [1, 3, 4, 5],
      matchupRowsByWeek: {
        1: [
          row(2, 1, 90),
          row(1, 1, 100),
          row(3, 2, 77),
          row(4, 2, 77),
          row(11, undefined, 25),
          row(12, undefined, 30),
          row(20, 9, 1),
          row(21, 9, 2),
          row(22, 9, 3),
        ],
        2: [row(5, 3, 50), row(6, 4, null), row(7, 4, null)],
        3: [
          row(1, 11, 60),
          row(2, 11, 50),
          row(3, undefined, 45),
          row(7, 12, 30),
          row(8, 12, 40),
        ],
        4: [
          row(1, 13, 110),
          row(3, 13, 100),
          row(2, 14, 95),
          row(4, 14, 80),
          row(5, 15, 70),
          row(6, 15, 60),
        ],
        5: [row(9, 16, 88), row(10, 16, 87)],
      },
      winnersBracket,
      losersBracket: [{ r: 1, m: 1, t1: 7, t2: 8, w: 8, l: 7, p: 1 }],
      losersBracketType: "toilet-bowl",
      franchiseIdByRosterId: Object.fromEntries(
        Array.from({ length: 22 }, (_, index) => [
          index + 1,
          `franchise-${index + 1}`,
        ])
      ),
      correctionVersion: 2,
      retrievedAt: "2026-07-30T12:00:00.000Z",
      sourceVersion: "fixture-v1",
    },
    {
      season: 2025,
      leagueId: "fixture-2025",
      playoffWeekStart: 2,
      finalScoringPeriod: 3,
      completedScoringPeriods: [1, 2, 3],
      matchupRowsByWeek: {
        1: [row(1, 1, 1), row(2, 1, 2)],
        2: [
          row(1, 1, 21),
          row(2, 1, 22),
          row(3, 2, 30),
          row(4, 2, 20),
        ],
        3: [
          row(1, 1, 11),
          row(2, 1, 12),
          row(3, 3, 10),
          row(4, 3, 5),
        ],
      },
      winnersBracket: [
        { r: 1, m: 1, t1: 1, t2: 2, w: 2, l: 1, p: 1 },
      ],
      losersBracket: [{ r: 1, m: 1, t1: 3, t2: 4, w: 3, l: 4 }],
      losersBracketType: "consolation",
      playoffRoundScoringPeriods: { 1: [2, 3] },
      retrievedAt: "2026-07-30T12:00:00.000Z",
      sourceVersion: "fixture-v1",
    },
  ],
};

async function main() {
assert.throws(
  () => getAllCanonicalMatchups(),
  /not initialized/,
  "Accessors must not represent an uninitialized engine as valid empty history."
);
const firstBuild = buildCanonicalMatchups(fixture);
const firstKeys = firstBuild.map((matchup) => matchup.matchupKey);
const firstSnapshot = JSON.stringify(firstBuild);
const secondBuild = buildCanonicalMatchups(fixture);
const coverage = getCanonicalCoverage();

assert.deepEqual(
  secondBuild.map((matchup) => matchup.matchupKey),
  firstKeys,
  "Canonical keys must remain stable across deterministic rebuilds."
);
assert.equal(
  JSON.stringify(secondBuild),
  firstSnapshot,
  "The same input must produce byte-for-byte deterministic records."
);
assert.equal(new Set(firstKeys).size, firstKeys.length);
assert.equal(
  firstKeys.filter(
    (key) => key === "sleeper:2024:fixture-2024:regular:w1:m1"
  ).length,
  1,
  "Two Sleeper score rows must create one physical regular contest."
);
assert.ok(
  firstKeys.includes(
    "sleeper:2024:fixture-2024:bracket:winners:r2:m3"
  )
);
assert.ok(
  firstKeys.includes(
    "sleeper:2024:fixture-2024:bracket:losers:r1:m1"
  )
);

const types = new Set(firstBuild.map((matchup) => matchup.matchupType));
[
  "regular",
  "championship-playoff",
  "third-place",
  "consolation",
  "toilet-bowl",
  "placement",
  "bye",
  "incomplete",
].forEach((matchupType) => {
  assert.ok(types.has(matchupType as never), `Missing ${matchupType} fixture.`);
});

const regular = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:regular:w1:m1"
);
assert.ok(regular);
assert.equal(regular.homeFranchiseId, "franchise-1");
assert.equal(regular.awayFranchiseId, "franchise-2");
assert.equal(regular.homeScore, 100);
assert.equal(regular.awayScore, 90);
assert.equal(regular.winnerFranchiseId, "franchise-1");
assert.equal(regular.correctionVersion, 2);

const tiedRegular = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:regular:w1:m2"
);
assert.ok(tiedRegular);
assert.equal(tiedRegular.isComplete, true);
assert.equal(tiedRegular.winnerFranchiseId, null);
assert.equal(tiedRegular.loserFranchiseId, null);

const regularBye = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:regular:w2:m3"
);
assert.ok(regularBye);
assert.equal(regularBye.matchupType, "bye");
assert.equal(regularBye.isComplete, false);
assert.equal(regularBye.awayFranchiseId, null);

const incompleteRegular = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:regular:w2:m4"
);
assert.ok(incompleteRegular);
assert.equal(incompleteRegular.matchupType, "incomplete");
assert.equal(incompleteRegular.isComplete, false);

const titleGame = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r2:m3"
);
assert.ok(titleGame);
assert.equal(titleGame.matchupType, "championship-playoff");
assert.equal(titleGame.round, 2);
assert.equal(titleGame.bracketPlacement, 1);
assert.equal(titleGame.isChampionshipGame, true);
assert.deepEqual(
  titleGame.scoringPeriods.map((period) => period.week),
  [4]
);

const earlierChampionshipPlayoff = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r1:m1"
);
assert.equal(
  earlierChampionshipPlayoff?.matchupType,
  "championship-playoff"
);
assert.equal(earlierChampionshipPlayoff?.isChampionshipGame, false);
assert.equal(earlierChampionshipPlayoff?.bracketPlacement, null);

const thirdPlace = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r2:m4"
);
assert.equal(thirdPlace?.matchupType, "third-place");
assert.equal(thirdPlace?.isChampionshipGame, false);
const placement = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r2:m5"
);
assert.equal(placement?.matchupType, "placement");
const toiletBowl = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:losers:r1:m1"
);
assert.equal(toiletBowl?.matchupType, "toilet-bowl");
assert.equal(toiletBowl?.winnerFranchiseId, "franchise-8");
assert.equal(toiletBowl?.isChampionshipGame, false);
const consolation = getCanonicalMatchup(
  "sleeper:2025:fixture-2025:bracket:losers:r1:m1"
);
assert.equal(consolation?.matchupType, "consolation");
assert.deepEqual(
  consolation?.scoringPeriods.map((period) => period.week),
  [2, 3]
);
assert.equal(consolation?.homeScore, 40);
assert.equal(consolation?.awayScore, 25);
assert.equal(
  consolation?.homeFranchiseId,
  "sleeper-roster:2025:fixture-2025:3"
);
assert.equal(consolation?.isChampionshipGame, false);

const completedTitleGames = firstBuild.filter(
  (matchup) => matchup.isComplete && matchup.isChampionshipGame
);
assert.equal(completedTitleGames.length, fixture.seasons.length);
fixture.seasons.forEach(({ season }) => {
  assert.equal(
    completedTitleGames.filter((matchup) => matchup.season === season).length,
    1,
    `${season} should contain exactly one completed title game.`
  );
});
assert.ok(
  firstBuild
    .filter((matchup) => matchup.matchupType === "championship-playoff")
    .some((matchup) => !matchup.isChampionshipGame),
  "A winners-bracket playoff classification must not imply a title game."
);
assert.ok(
  completedTitleGames.every(
    (matchup) =>
      matchup.bracketType === "winners" &&
      matchup.bracketPlacement === 1 &&
      matchup.matchupType === "championship-playoff"
  )
);
assert.ok(
  firstBuild
    .filter((matchup) => matchup.bracketType === "losers")
    .every((matchup) => !matchup.isChampionshipGame)
);

const bracketBye = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r1:m2"
);
assert.equal(bracketBye?.matchupType, "bye");
assert.equal(bracketBye?.isComplete, false);
const incompleteBracket = getCanonicalMatchup(
  "sleeper:2024:fixture-2024:bracket:winners:r3:m6"
);
assert.equal(incompleteBracket?.matchupType, "incomplete");
assert.equal(incompleteBracket?.isComplete, false);

assert.equal(
  firstBuild.some(
    (matchup) =>
      matchup.homeFranchiseId === "franchise-20" ||
      matchup.awayFranchiseId === "franchise-20" ||
      matchup.homeFranchiseId === "franchise-21" ||
      matchup.awayFranchiseId === "franchise-21" ||
      matchup.homeFranchiseId === "franchise-22" ||
      matchup.awayFranchiseId === "franchise-22"
  ),
  false,
  "Ambiguous three-row groups must not become physical contests."
);
assert.equal(coverage.duplicateMatchupKeys.length, 1);
assert.equal(
  coverage.duplicateMatchupKeys[0],
  "sleeper:2024:fixture-2024:bracket:winners:r2:m5"
);
assert.equal(
  coverage.canonicalMatchups,
  new Set(secondBuild.map((matchup) => matchup.matchupKey)).size
);

const serialized = JSON.stringify(secondBuild);
assert.equal(/owner/i.test(serialized), false, "Canonical output contains owner data.");
assert.equal(/manager/i.test(serialized), false, "Canonical output contains manager data.");

const season2024 = getCanonicalMatchupsForSeason(2024);
assert.ok(season2024.length > 0);
assert.ok(season2024.every((matchup) => matchup.season === 2024));
const cachedCount = getAllCanonicalMatchups().length;
season2024[0].scoringPeriods[0].homeScore = 999;
season2024[0].coverage.scores = "missing";
assert.notEqual(
  getCanonicalMatchupsForSeason(2024)[0].scoringPeriods[0].homeScore,
  999,
  "Returned scoring periods must not mutate cached state."
);
assert.equal(
  getCanonicalMatchupsForSeason(2024)[0].coverage.scores,
  "resolved",
  "Returned coverage must not mutate cached state."
);
assert.equal(getAllCanonicalMatchups().length, cachedCount);

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error("fixture network failure");
};
try {
  await assert.rejects(
    () =>
      acquireCanonicalMatchupInput({
        leagueIds: { 2025: "failed-fixture-league" },
      }),
    (error: unknown) =>
      error instanceof CanonicalMatchupAcquisitionError &&
      error.endpoint === "/league/failed-fixture-league"
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log(
  JSON.stringify(
    {
      coverage,
      classifications: coverage.classificationTotals,
      stableKeys: firstKeys,
    },
    null,
    2
  )
);

}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
