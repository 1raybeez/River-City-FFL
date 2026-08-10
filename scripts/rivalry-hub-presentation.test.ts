import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  RIVALRY_SCORE_VERSION,
  RIVALRY_SCORE_WEIGHTS,
  type RivalryBuildCoverage,
  type RivalryScoreMethodology,
  type RivalrySummary,
} from "../lib/history/rivalryHistory";
import type { OwnerHeadToHeadDetail } from "../lib/history/ownerHeadToHeadDetail";
import {
  RIVALRY_HUB_INITIAL_CARD_COUNT,
  buildRivalryHubPresentation,
  filterOrderedRivalryCards,
  limitRivalryCards,
  type RivalryHubOwnerInput,
} from "../lib/managers/rivalryHubPresentation";

type PairSeed = Readonly<{
  ownerA: string;
  ownerB: string;
  score: number | null;
  rank: number | null;
  competitiveness: number;
  meetings: number;
  allMeetings?: number;
  seasons: readonly number[];
  wins: number;
  losses: number;
  ties?: number;
  playoff?: number;
  title?: number;
  coverage?: RivalrySummary["coverage"]["scope"];
  statuses?: RivalrySummary["ownerStatuses"];
}>;

const ownerSeeds = [
  ["brian-stevens", "Brian Stevens", "Brian", "B Stevens Franchise", "active"],
  ["tommy-moore", "Tommy Moore", "Tommy", "Tommy Franchise", "active"],
  ["jd-dowling", "JD Dowling", "JD", "JD Franchise", "active"],
  ["landon-elliott", "Landon Elliott", "Landon", "Shake-N-Bakers", "active"],
  ["david-besedich", "David Besedich", "David", "David Franchise", "active"],
  ["ray-long", "Ray Long", "Ray", "Prestigio Mundial", "active"],
  ["jeffrey-hudgins", "Jeffrey Hudgins", "Jeffrey", "Prestigio Mundial", "active"],
  ["wade-cameron", "Wade Cameron", "Wade", "Wade Franchise", "active"],
  ["jordan-maslyn", "Jordan Maslyn", "Jordan", "Shake-N-Bakers", "active"],
  ["chris-smith", "Chris Smith", "Chris", "Retired Franchise", "retired"],
  ["gordie-locke", "Gordie Locke", "Gordie", "Legacy Franchise", "retired"],
  ["adam-lind", "Adam Lind", "Adam", "Former Franchise", "retired"],
  ["league-staff", "League Staff", "Staff", "River City FFL", "staff"],
] as const;

const owners: RivalryHubOwnerInput[] = ownerSeeds.map(
  ([ownerId, fullName, shortName, teamName, status]) => ({
    ownerId,
    slug: ownerId,
    fullName,
    shortName,
    photo: `/managers/${shortName}.png`,
    teamName,
    status,
  })
);

function relationshipKey(ownerId: string, opponentOwnerId: string) {
  return `owner-head-to-head:${ownerId}:vs:${opponentOwnerId}`;
}

function rivalry(seed: PairSeed): RivalrySummary {
  const ties = seed.ties ?? 0;
  const competitive = seed.meetings;
  const playoff = seed.playoff ?? 0;
  const title = seed.title ?? 0;
  const eligible = seed.score !== null;
  const coverageScope = seed.coverage ?? "full-supported-coverage";
  const dimensions = Object.fromEntries(
    Object.entries(RIVALRY_SCORE_WEIGHTS).map(([key, weight]) => [
      key,
      {
        rawValue: key === "competitiveness" ? seed.competitiveness : competitive,
        normalizedValue: eligible
          ? key === "competitiveness"
            ? seed.competitiveness
            : 0.5
          : null,
        weight,
        weightedContribution: eligible
          ? (key === "competitiveness" ? seed.competitiveness : 0.5) *
            weight *
            100
          : null,
      },
    ])
  ) as RivalrySummary["dimensions"];
  return {
    rivalryKey: `rivalry:${seed.ownerA}:${seed.ownerB}`,
    ownerIds: [seed.ownerA, seed.ownerB],
    ownerStatuses: seed.statuses ?? ["active", "active"],
    directionalRelationships: [
      {
        ownerId: seed.ownerA,
        opponentOwnerId: seed.ownerB,
        relationshipKey: relationshipKey(seed.ownerA, seed.ownerB),
        opponentSummaryKey: `${seed.ownerA}:${seed.ownerB}`,
        closestMeeting: null,
        largestVictory: null,
        largestDefeat: null,
      },
      {
        ownerId: seed.ownerB,
        opponentOwnerId: seed.ownerA,
        relationshipKey: relationshipKey(seed.ownerB, seed.ownerA),
        opponentSummaryKey: `${seed.ownerB}:${seed.ownerA}`,
        closestMeeting: null,
        largestVictory: null,
        largestDefeat: null,
      },
    ],
    eligibility: {
      isCalculatedRankingEligible: eligible,
      reason: eligible ? "eligible" : "insufficient-competitive-meetings",
      competitiveMeetings: competitive,
      minimumCompetitiveMeetings: 4,
      competitiveSeasons: seed.seasons.length,
      minimumCompetitiveSeasons: 2,
    },
    calculatedScore: seed.score,
    calculatedRank: seed.rank,
    rawDimensionInputs: {
      competitiveWinningPercentage:
        competitive === 0 ? null : (seed.wins + 0.5 * ties) / competitive,
      competitivenessBalance: seed.competitiveness,
      competitiveMeetings: competitive,
      championshipPlayoffMeetings: playoff,
      championshipGameMeetings: title,
      postseasonSignificanceUnits: playoff + title,
      latestCompetitiveMeetingSeason: seed.seasons.at(-1) ?? null,
      competitiveMeetingSeasons: seed.seasons,
      distinctCompetitiveMeetingSeasons: seed.seasons.length,
    },
    dimensions,
    factual: {
      allCompletedMeetings: seed.allMeetings ?? competitive,
      competitiveMeetings: competitive,
      regularMeetings: competitive - playoff,
      championshipPlayoffMeetings: playoff,
      championshipGameMeetings: title,
      thirdPlaceMeetings: (seed.allMeetings ?? competitive) - competitive,
      placementMeetings: 0,
      toiletBowlMeetings: 0,
      consolationMeetings: 0,
      averageAbsoluteMarginAllCompleted: 8,
      uniqueCanonicalMatchupKeys: Array.from(
        { length: seed.allMeetings ?? competitive },
        (_, index) => `${seed.ownerA}:${seed.ownerB}:${index}`
      ),
      competitiveMeetingSeasons: seed.seasons,
    },
    coverage: {
      headToHeadStates:
        coverageScope === "supported-era-only"
          ? ["partial-career-coverage", "partial-career-coverage"]
          : ["available", "available"],
      scope: coverageScope,
      rankingRepresentsSupportedEraOnly: coverageScope === "supported-era-only",
      approvedOverlapSeasons: seed.seasons,
      supportedOverlapSeasons: seed.seasons,
      unsupportedOverlapSeasons:
        coverageScope === "supported-era-only" ? [2016, 2017] : [],
      sourceEnabledNoMeetingSeasons: [],
    },
    curated: null,
    methodologyVersion: RIVALRY_SCORE_VERSION,
    streaks: null,
  };
}

const seeds: PairSeed[] = [
  {
    ownerA: "brian-stevens",
    ownerB: "tommy-moore",
    score: 90.04,
    rank: 1,
    competitiveness: 0.7,
    meetings: 10,
    seasons: [2021, 2022, 2023, 2024, 2025],
    wins: 6,
    losses: 4,
    playoff: 2,
    title: 1,
  },
  {
    ownerA: "jd-dowling",
    ownerB: "landon-elliott",
    score: 82.22,
    rank: 2,
    competitiveness: 1,
    meetings: 6,
    seasons: [2022, 2023, 2024],
    wins: 3,
    losses: 3,
  },
  {
    ownerA: "david-besedich",
    ownerB: "tommy-moore",
    score: 79.97,
    rank: 3,
    competitiveness: 0.55,
    meetings: 12,
    allMeetings: 14,
    seasons: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
    wins: 4,
    losses: 8,
    playoff: 4,
    title: 2,
  },
  {
    ownerA: "ray-long",
    ownerB: "wade-cameron",
    score: 70.55,
    rank: 4,
    competitiveness: 0.9,
    meetings: 12,
    seasons: [2018, 2019, 2020, 2021, 2022, 2023],
    wins: 5,
    losses: 7,
    coverage: "supported-era-only",
  },
  {
    ownerA: "jeffrey-hudgins",
    ownerB: "wade-cameron",
    score: 69.12,
    rank: 5,
    competitiveness: 0.85,
    meetings: 11,
    seasons: [2018, 2019, 2020, 2021, 2022, 2023],
    wins: 5,
    losses: 6,
    coverage: "supported-era-only",
  },
  {
    ownerA: "jordan-maslyn",
    ownerB: "landon-elliott",
    score: 64.4,
    rank: 6,
    competitiveness: 0.6,
    meetings: 8,
    seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
    wins: 4,
    losses: 4,
  },
  {
    ownerA: "chris-smith",
    ownerB: "gordie-locke",
    score: 50,
    rank: 7,
    competitiveness: 0.65,
    meetings: 5,
    seasons: [2018, 2019],
    wins: 3,
    losses: 2,
    statuses: ["retired", "retired"],
  },
  {
    ownerA: "adam-lind",
    ownerB: "brian-stevens",
    score: 45,
    rank: 8,
    competitiveness: 0.5,
    meetings: 5,
    seasons: [2018, 2019],
    wins: 2,
    losses: 3,
    statuses: ["retired", "active"],
  },
  {
    ownerA: "brian-stevens",
    ownerB: "league-staff",
    score: 40,
    rank: 9,
    competitiveness: 0.5,
    meetings: 4,
    seasons: [2024, 2025],
    wins: 2,
    losses: 2,
    statuses: ["active", "staff"],
  },
  {
    ownerA: "brian-stevens",
    ownerB: "wade-cameron",
    score: null,
    rank: null,
    competitiveness: 1,
    meetings: 2,
    seasons: [2025],
    wins: 1,
    losses: 1,
  },
];

const rivalries = seeds.map(rivalry);
const details = seeds.flatMap((seed) => {
  const ties = seed.ties ?? 0;
  const summary = {
    records: {
      overall: {
        games: seed.meetings,
        wins: seed.wins,
        losses: seed.losses,
        ties,
        winningPercentage:
          seed.meetings === 0
            ? null
            : (seed.wins + 0.5 * ties) / seed.meetings,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
      },
    },
  };
  return [
    {
      relationshipKey: relationshipKey(seed.ownerA, seed.ownerB),
      ownerId: seed.ownerA,
      opponentOwnerId: seed.ownerB,
      summary,
    } as OwnerHeadToHeadDetail,
    {
      relationshipKey: relationshipKey(seed.ownerB, seed.ownerA),
      ownerId: seed.ownerB,
      opponentOwnerId: seed.ownerA,
      summary,
    } as OwnerHeadToHeadDetail,
  ];
});
details.push(
  {
    relationshipKey: relationshipKey("ray-long", "jeffrey-hudgins"),
    ownerId: "ray-long",
    opponentOwnerId: "jeffrey-hudgins",
    summary: null,
  } as OwnerHeadToHeadDetail,
  {
    relationshipKey: relationshipKey("jeffrey-hudgins", "ray-long"),
    ownerId: "jeffrey-hudgins",
    opponentOwnerId: "ray-long",
    summary: null,
  } as OwnerHeadToHeadDetail
);

const methodology: RivalryScoreMethodology = {
  version: RIVALRY_SCORE_VERSION,
  scoreMinimum: 0,
  scoreMaximum: 100,
  minimumCompetitiveMeetings: 4,
  minimumCompetitiveSeasons: 2,
  competitiveClassifications: ["regular", "championship-playoff"],
  weights: RIVALRY_SCORE_WEIGHTS,
  normalization: "eligible-population-midrank-percentile",
  normalizationTieBehavior: "fixture",
  populationBehavior: "fixture",
  competitivenessFormula: "fixture",
  postseasonFormula: "fixture",
  recencyFormula: "fixture",
  longevityFormula: "fixture",
  streaks: null,
  streaksStatus: "deferred-to-future-analytics-layer",
  franchiseRivalriesStatus: "out-of-scope",
};

const buildCoverage: RivalryBuildCoverage = {
  undirectedRivalryRecords: rivalries.length,
  calculatedEligibleRivalries: 9,
  unrankedRivalryRecords: 1,
  supportedEraOnlyScoredRivalries: 2,
  recognizedRivalries: 0,
  highestCalculatedScore: 90.04,
  lowestCalculatedScore: 40,
  dimensionRanges: Object.fromEntries(
    Object.keys(RIVALRY_SCORE_WEIGHTS).map((key) => [
      key,
      {
        rawMinimum: 0,
        rawMaximum: 1,
        normalizedMinimum: 0,
        normalizedMaximum: 1,
      },
    ])
  ) as RivalryBuildCoverage["dimensionRanges"],
  duplicateRivalryKeys: [],
  duplicateDirectionalRelationshipKeys: [],
  teammateViolations: [],
  helperAttributionViolations: [],
  factualReconciliationFailures: [],
};

const presentation = buildRivalryHubPresentation({
  rivalries,
  topRivalries: rivalries.filter((item) => item.calculatedScore !== null),
  recognizedRivalries: [],
  methodology,
  buildCoverage,
  ownerDisplays: owners,
  headToHeadDetails: details,
});

const category = (id: string) => {
  const result = presentation.categories.find((item) => item.id === id);
  assert.ok(result, `Missing category ${id}`);
  return result;
};
const card = (key: string) => {
  const result = presentation.cards.find((item) => item.rivalryKey === key);
  assert.ok(result, `Missing card ${key}`);
  return result;
};
const finderOwner = (ownerId: string) => {
  const result = presentation.headToHeadFinderOwners.find(
    (owner) => owner.ownerId === ownerId
  );
  assert.ok(result, `Missing Head-to-Head Finder owner ${ownerId}`);
  return result;
};

assert.equal(RIVALRY_HUB_INITIAL_CARD_COUNT, 3);
assert.equal(presentation.initialCardCount, 3);
assert.deepEqual(presentation.topRivalryKeys.slice(0, 3), [
  "rivalry:brian-stevens:tommy-moore",
  "rivalry:jd-dowling:landon-elliott",
  "rivalry:david-besedich:tommy-moore",
]);
assert.equal(
  presentation.topRivalryKeys.includes("rivalry:brian-stevens:wade-cameron"),
  false
);
assert.equal(
  category("most-competitive").orderedRivalryKeys[0],
  "rivalry:jd-dowling:landon-elliott"
);
assert.equal(
  category("most-played").orderedRivalryKeys[0],
  "rivalry:david-besedich:tommy-moore"
);
assert.equal(
  category("championship").orderedRivalryKeys[0],
  "rivalry:david-besedich:tommy-moore"
);
assert.equal(
  category("biggest-series-leads").orderedRivalryKeys[0],
  "rivalry:david-besedich:tommy-moore"
);
assert.equal(
  category("recently-active").orderedRivalryKeys[0],
  "rivalry:brian-stevens:tommy-moore"
);
assert.deepEqual(category("recognized").orderedRivalryKeys, []);
assert.match(category("recognized").emptyMessage, /No recognized rivalries/i);
assert.equal(
  new Set(
    presentation.categories.flatMap((item) =>
      item.orderedRivalryKeys.map((key) => `${item.id}:${key}`)
    )
  ).size,
  presentation.categories.reduce(
    (total, item) => total + item.orderedRivalryKeys.length,
    0
  )
);

const ray = card("rivalry:ray-long:wade-cameron");
const jeffrey = card("rivalry:jeffrey-hudgins:wade-cameron");
const rayFinder = finderOwner("ray-long");
const jeffreyFinder = finderOwner("jeffrey-hudgins");
const wadeFinder = finderOwner("wade-cameron");
const jordanFinder = finderOwner("jordan-maslyn");
assert.notEqual(ray.ownerA.ownerId, jeffrey.ownerA.ownerId);
assert.notEqual(rayFinder.ownerId, jeffreyFinder.ownerId);
assert.equal(rayFinder.opponents.length > 0, true);
assert.equal(
  rayFinder.opponents.some((owner) => owner.ownerId === "jeffrey-hudgins"),
  false
);
assert.equal(jeffreyFinder.opponents.length > 0, true);
assert.equal(
  jeffreyFinder.opponents.some((owner) => owner.ownerId === "ray-long"),
  false
);
assert.equal(
  rayFinder.opponents.find((owner) => owner.ownerId === "wade-cameron")?.href,
  "/managers/owners/ray-long/opponents/wade-cameron"
);
assert.equal(
  wadeFinder.opponents.find((owner) => owner.ownerId === "ray-long")?.href,
  "/managers/owners/wade-cameron/opponents/ray-long"
);
assert.equal(
  jordanFinder.opponents.some((owner) => owner.ownerId === "landon-elliott"),
  true
);
assert.equal(
  presentation.headToHeadFinderOwners.some((owner) => owner.ownerId === "league-staff"),
  false
);
assert.equal(
  presentation.headToHeadFinderOwners.some((owner) => owner.ownerId === "temporary-helper"),
  false
);
assert.equal(
  presentation.cards.some(
    (item) => item.ownerIds.includes("ray-long") && item.ownerIds.includes("jeffrey-hudgins")
  ),
  false
);
assert.equal(
  presentation.ownerOptions.some((owner) => owner.ownerId === "temporary-helper"),
  false
);
assert.equal(ray.calculatedScore, 70.55);
assert.equal(ray.scoreLabel, "70.5");
assert.equal(ray.coverage.badgeLabel, "Supported Era");
assert.equal(ray.scoreExplanation[0].normalizedPercent, 90);
assert.equal(ray.scoreExplanation[0].weightLabel, "30% weight");
assert.equal(
  ray.headToHeadHref,
  "/managers/owners/ray-long/opponents/wade-cameron"
);
assert.equal(
  card("rivalry:david-besedich:tommy-moore").seriesLeaderLabel,
  "Tommy leads 8-4"
);
assert.equal(
  card("rivalry:david-besedich:tommy-moore").allCompletedMeetings,
  14
);
assert.equal(
  presentation.cards.some((item) => item.ownerStatuses.every((status) => status === "retired")),
  true
);
assert.equal(
  presentation.cards.filter((item) =>
    item.ownerStatuses.every((status) => status === "active")
  ).length < presentation.cards.length,
  true
);
const allTimeTop = filterOrderedRivalryCards(
  presentation.cards,
  presentation.topRivalryKeys,
  { ownerId: null, activeOwnersOnly: false }
);
const activeTop = filterOrderedRivalryCards(
  presentation.cards,
  presentation.topRivalryKeys,
  { ownerId: null, activeOwnersOnly: true }
);
const rayTop = filterOrderedRivalryCards(
  presentation.cards,
  presentation.topRivalryKeys,
  { ownerId: "ray-long", activeOwnersOnly: false }
);
const retiredOwnerAllTime = filterOrderedRivalryCards(
  presentation.cards,
  presentation.topRivalryKeys,
  { ownerId: "adam-lind", activeOwnersOnly: false }
);
const retiredOwnerActive = filterOrderedRivalryCards(
  presentation.cards,
  presentation.topRivalryKeys,
  { ownerId: "adam-lind", activeOwnersOnly: true }
);
assert.equal(
  allTimeTop.some((item) => item.ownerStatuses.includes("retired")),
  true
);
assert.equal(
  allTimeTop.some((item) =>
    item.ownerStatuses.every((status) => status === "retired")
  ),
  true
);
assert.equal(
  activeTop.some((item) => item.ownerStatuses.includes("retired")),
  false
);
assert.equal(
  allTimeTop.some(
    (item) =>
      item.ownerStatuses.includes("active") &&
      item.ownerStatuses.includes("retired")
  ),
  true
);
assert.equal(
  activeTop.every((item) =>
    item.ownerStatuses.every((status) => status === "active")
  ),
  true
);
assert.equal(
  allTimeTop.some((item) => item.ownerStatuses.includes("staff")),
  false
);
assert.deepEqual(rayTop.map((item) => item.rivalryKey), [ray.rivalryKey]);
assert.equal(rayTop[0].calculatedScore, ray.calculatedScore);
assert.equal(retiredOwnerAllTime.length, 1);
assert.equal(retiredOwnerAllTime[0].rivalryKey, "rivalry:adam-lind:brian-stevens");
assert.deepEqual(retiredOwnerActive, []);
presentation.categories.forEach((item) => {
  const activeCategoryCards = filterOrderedRivalryCards(
    presentation.cards,
    item.orderedRivalryKeys,
    { ownerId: null, activeOwnersOnly: true }
  );
  assert.equal(
    activeCategoryCards.every((candidate) =>
      candidate.ownerStatuses.every((status) => status === "active")
    ),
    true,
    `${item.label} retained an inactive owner pair.`
  );
});
assert.deepEqual(
  limitRivalryCards(allTimeTop, false).map((item) => item.rivalryKey),
  presentation.topRivalryKeys.slice(0, 3)
);
assert.deepEqual(
  limitRivalryCards(allTimeTop, true).map((item) => item.rivalryKey),
  presentation.topRivalryKeys.filter(
    (key) => key !== "rivalry:brian-stevens:league-staff"
  )
);
assert.equal(Object.isFrozen(presentation), true);
assert.equal(Object.isFrozen(presentation.cards), true);
assert.equal("meetings" in ray, false);
assert.equal("meetingKeys" in ray, false);
assert.deepEqual(
  presentation.topRivalryKeys.slice(0, RIVALRY_HUB_INITIAL_CARD_COUNT),
  presentation.topRivalryKeys.slice(0, 3)
);

const pageSource = readFileSync("app/league-info/rivalries/page.tsx", "utf8");
const clientSource = readFileSync(
  "components/league-info/RivalryHubClient.tsx",
  "utf8"
);
const loaderSource = readFileSync("lib/managers/rivalryHubLoader.ts", "utf8");
assert.match(loaderSource, /buildRivalries/);
assert.match(loaderSource, /getTopRivalries/);
assert.doesNotMatch(pageSource + clientSource, /api\.sleeper\.app|fetch\s*\(/);
assert.doesNotMatch(pageSource + clientSource, /LEAGUE_HISTORY|MANAGER_MAP/);
assert.doesNotMatch(
  pageSource + clientSource,
  /Blood Feud|Recent Heat|getIntensityLabel|currentStreak/
);
assert.match(clientSource, /aria-pressed=\{scope === value\}/);
assert.match(clientSource, /role="status"/);
assert.match(clientSource, /disabled=\{!headToHeadOwner\}/);
assert.match(clientSource, /disabled=\{!headToHeadOpponent\}/);
assert.match(clientSource, /Choose an owner first/);

console.log("Rivalry Hub presentation tests passed.");
console.log(
  JSON.stringify(
    {
      cards: presentation.cards.length,
      topInitial: presentation.initialCardCount,
      categories: presentation.categories.map((item) => ({
        id: item.id,
        records: item.orderedRivalryKeys.length,
      })),
    },
    null,
    2
  )
);
