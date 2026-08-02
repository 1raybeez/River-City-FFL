import { ownerProfiles, ownerProfilesById } from "@/lib/managers/identityData";

export const HISTORICAL_SEASON_RESULTS_SOURCE = {
  workbookPath:
    "data/source/historical/river-city-final-standings-and-payouts.xlsx",
  workbookSha256:
    "4b0d96b19b93e6039807558f1f49ca9d4e7aae1a728bb5636001cef964fe6552",
} as const;

export type HistoricalMatchupSourceAvailability =
  | "unavailable-no-source"
  | "available-in-separate-engine";

export type HistoricalSeasonResultSource = {
  workbookPath: string;
  workbookSha256: string;
  sheetName: string;
  cellRange: string;
  corroboratingReferences: string[];
};

export type HistoricalSeasonResultCoverage = {
  seasonResult: "available";
  ownerIdentity: "resolved";
  franchise: "resolved" | "unresolved";
  historicalTeamName: "available" | "not-available";
  matchupSource: HistoricalMatchupSourceAvailability;
};

export type HistoricalSeasonResult = {
  /** Stable identity for one physical franchise finish, independent of owner credit. */
  seasonResultKey: string;
  season: number;
  teamCount: 10 | 12;
  /** The workbook/platform order. The 2022 co-champion ruling does not erase it. */
  finalPlacement: number;
  franchiseId: string | null;
  ownerIds: string[];
  rawOwnerLabel: string;
  rawTeamName: string | null;
  isPlatformChampion: boolean;
  isPlatformRunnerUp: boolean;
  isHistoricalChampion: boolean;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  championshipNote: string | null;
  source: HistoricalSeasonResultSource;
  coverage: HistoricalSeasonResultCoverage;
  notes: string[];
};

export type HistoricalSeasonCoverage = {
  season: number;
  expectedPlacements: 10 | 12;
  resultCount: number;
  ownerCredits: number;
  historicalChampionResults: number;
  matchupSource: HistoricalMatchupSourceAvailability;
  isComplete: boolean;
};

export type HistoricalSeasonResultsCoverage = {
  source: typeof HISTORICAL_SEASON_RESULTS_SOURCE;
  seasons: number[];
  firstSeason: number;
  latestSeason: number;
  totalSeasonResults: number;
  totalOwnerCredits: number;
  historicalChampionResults: number;
  duplicateSeasonResultKeys: string[];
  duplicateSeasonPlacements: string[];
  unresolvedOwnerResultKeys: string[];
  unresolvedFranchiseResultKeys: string[];
  missingHistoricalTeamNameResults: number;
  seasonsWithInvalidPlacementCounts: number[];
  bySeason: HistoricalSeasonCoverage[];
};

type RawSeasonRow = readonly [
  rawOwnerLabel: string,
  ownerId: string,
  rawTeamName?: string | null,
];

type RawSeason = {
  season: number;
  rows: readonly RawSeasonRow[];
};

const FRANCHISE_BY_OWNER_ID: Readonly<Record<string, string>> = {
  "aaron-hawkins": "hawkins-heroes",
  "adam-lind": "hotub-jellyfish",
  "billy-biddle": "brilly",
  "brian-stevens": "buckeye-nation",
  "bryan-doane": "drinkin-irish",
  "chris-barras": "receding-zuerlein",
  "darren-kusaj": "team-kusaj",
  "david-besedich": "the-bearded-one",
  "doug-fordham": "hall-pass",
  "garet-prior": "the-land-of-cleve",
  "gordie-gahagan": "freakshow-freaks",
  "james-minnix": "hyde-the-russell-sprouts",
  "jd-dowling": "the-art-of-war",
  "jordan-maslyn": "shake-n-bakers",
  "keith-polarek": "team-polarek",
  "landon-elliott": "special-brownies",
  "nicholas-bates": "master-debatesr",
  "patrick-leahey": "deebow-and-arrow",
  "rachel-woolard": "zach-s-2nd-team",
  "rashad-gresham": "the-gresham-empire",
  "ray-long": "prestigio-mundial",
  "ricky-taylor": "ricky-crickets",
  "stan-schoppe": "tax-season",
  "tommy-moore": "the-shepherd",
  "travis-miller": "kissed-by-a-freckle",
  "wade-cameron": "the-wildcard",
  "zach-woolard": "saved-by-the-zach",
};

const RAW_SEASONS: readonly RawSeason[] = [
  {
    season: 2011,
    rows: [
      ["Gordie", "gordie-gahagan"],
      ["Wade", "wade-cameron"],
      ["Zach", "zach-woolard"],
      ["Keith", "keith-polarek"],
      ["JD", "jd-dowling"],
      ["Bryan", "bryan-doane"],
      ["Chris", "chris-barras"],
      ["Ray", "ray-long"],
      ["Darren", "darren-kusaj"],
      ["Rachel", "rachel-woolard"],
    ],
  },
  {
    season: 2012,
    rows: [
      ["Bryan", "bryan-doane"],
      ["Chris", "chris-barras"],
      ["Nicholas", "nicholas-bates"],
      ["James", "james-minnix"],
      ["Tommy", "tommy-moore"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Gordie", "gordie-gahagan"],
      ["Wade", "wade-cameron"],
      ["Travis", "travis-miller", "I'm Your Huckleberry"],
      ["Darren", "darren-kusaj", "Team Darren"],
      ["JD", "jd-dowling"],
      ["Zach", "zach-woolard"],
    ],
  },
  {
    season: 2013,
    rows: [
      ["Tommy", "tommy-moore"],
      ["James", "james-minnix"],
      ["Bryan", "bryan-doane"],
      ["Landon", "landon-elliott"],
      ["Chris", "chris-barras"],
      ["Keith", "keith-polarek"],
      ["JD", "jd-dowling"],
      ["Garet", "garet-prior"],
      ["Gordie", "gordie-gahagan"],
      ["Ray", "ray-long"],
      ["Wade", "wade-cameron"],
      ["Travis", "travis-miller"],
    ],
  },
  {
    season: 2014,
    rows: [
      ["Garet", "garet-prior"],
      ["Gordie", "gordie-gahagan"],
      ["Keith", "keith-polarek"],
      ["Chris", "chris-barras"],
      ["Bryan", "bryan-doane"],
      ["Travis", "travis-miller"],
      ["James", "james-minnix"],
      ["Wade", "wade-cameron"],
      ["JD", "jd-dowling"],
      ["Ray", "ray-long"],
      ["Tommy", "tommy-moore"],
      ["Landon", "landon-elliott"],
    ],
  },
  {
    season: 2015,
    rows: [
      ["Keith", "keith-polarek", "Team Polarek"],
      ["JD", "jd-dowling", "Mad Panda"],
      ["Tommy", "tommy-moore", "The Not That Great CornJulio"],
      ["Chris", "chris-barras", "Momma Said Gronk You Out"],
      ["Garet", "garet-prior", "McCown Town"],
      ["Ray", "ray-long", "Check My Balls"],
      ["Minnix", "james-minnix", "Lil' Breezy Baby"],
      ["Wade", "wade-cameron", "Fightin' Fitz-magics"],
      ["Landon", "landon-elliott", "Specail Brownies"],
      ["Gordie", "gordie-gahagan", "Freakshow Freak"],
      ["Bryan", "bryan-doane", "Drinkin' Irish"],
      ["Travis", "travis-miller", "I'm Your Huckleberry"],
    ],
  },
  {
    season: 2016,
    rows: [
      ["Tommy", "tommy-moore", "Breesus Take the Wheel"],
      ["Minnix", "james-minnix", "Thank My Luck-y Johnson"],
      ["Ray", "ray-long", "Making America Great Again"],
      ["Gordie", "gordie-gahagan", "Freakshow Freaks"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Chris", "chris-barras", "Brate and Switch"],
      ["Bryan", "bryan-doane", "Weeping Snowflakes"],
      ["JD", "jd-dowling", "Mad Panda"],
      ["Travis", "travis-miller", "Fully Repaired Nelson"],
      ["Brian", "brian-stevens", "Chickn Parm u Taste So Good"],
      ["Garet", "garet-prior", "RG Threveland"],
      ["Wade", "wade-cameron", "Late Round Flyers"],
    ],
  },
  {
    season: 2017,
    rows: [
      ["Tommy", "tommy-moore", "Deez Lutz"],
      ["JD", "jd-dowling", "Dog Will Hunt"],
      ["Minnix", "james-minnix", "Hyde the Russell Sprouts"],
      ["Travis", "travis-miller", "Wentz in Pain"],
      ["Jordan", "jordan-maslyn", "Hooked on a Thielen"],
      ["Ray", "ray-long", "Prestige Worldwide"],
      ["Garet", "garet-prior", "The Land of Cleve"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Patrick", "patrick-leahey", "Winning is the Pryority"],
      ["Wade", "wade-cameron", "Bad JuJu"],
      ["Chris", "chris-barras", "Thanks a lot Evans!"],
      ["Brian", "brian-stevens", "Ertz So Good"],
    ],
  },
  {
    season: 2018,
    rows: [
      ["Brian", "brian-stevens", "kerryon my wayward son"],
      ["Tommy", "tommy-moore", "Big Al's Dingers"],
      ["Ray", "ray-long", "Prestigio Mundial"],
      ["Jordan", "jordan-maslyn", "In My Thielens"],
      ["Chris", "chris-barras", "Receding Zuerlein"],
      ["Wade", "wade-cameron", "O Saquon You See"],
      ["Patrick", "patrick-leahey", "Nuk if You Buck"],
      ["JD", "jd-dowling", "Mad Panda"],
      ["Ricky", "ricky-taylor", "Ricky Crickets"],
      ["Billy", "billy-biddle", "Biddle Me this Batman"],
      ["Travis", "travis-miller", "Wentz Upon a Time"],
      ["Landon", "landon-elliott", "Special Brownies"],
    ],
  },
  {
    season: 2019,
    rows: [
      ["Wade", "wade-cameron", "Witchdoctors"],
      ["Travis", "travis-miller", "Trash Panda"],
      ["Brian", "brian-stevens", "Stevens247"],
      ["Patrick", "patrick-leahey", "Deebow and Arrow"],
      ["Ray/Jeffrey", "ray-long", "Prestigio Mundial"],
      ["Dave", "david-besedich", "My Beard Smells Like Dicks"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Billy", "billy-biddle", "Thugsof Thanos"],
      ["Jordan", "jordan-maslyn", "Shake n Bakers"],
      ["JD", "jd-dowling", "Notmillatime27"],
      ["Doug", "doug-fordham", "Patrick Jr"],
      ["Tommy", "tommy-moore", "Moore's Monstars"],
    ],
  },
  {
    season: 2020,
    rows: [
      ["JD", "jd-dowling", "F U Minshew"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Dave", "david-besedich", "BeardSmellsLikeBalls"],
      ["Brian", "brian-stevens", "Infinity Chubb"],
      ["Ray/Jeffrey", "ray-long", "Prestigio Mundial"],
      ["Doug", "doug-fordham", "Saquon can have my ACL"],
      ["Jordan", "jordan-maslyn", "Aaron Jonestown Massacre"],
      ["Wade", "wade-cameron", "Witch Doctors"],
      ["Adam", "adam-lind", "Big Dick Nick Pics"],
      ["Billy", "billy-biddle", "Knights of Chadwick"],
      ["Travis", "travis-miller", "Trash Pandas"],
      ["Tommy", "tommy-moore", "Diamond Dogs"],
    ],
  },
  {
    season: 2021,
    rows: [
      ["Dave", "david-besedich", "The Schmendricks"],
      ["JD", "jd-dowling", "Asian Symbols"],
      ["Adam", "adam-lind", "Hot Tub Jelly Fish"],
      ["Wade", "wade-cameron", "Late Round Flyers"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Doug", "doug-fordham", "Back to Jacksonville"],
      ["Billy", "billy-biddle", "BeeristheAnswer"],
      ["Tommy", "tommy-moore", "The People's Champ"],
      ["Travis", "travis-miller", "Trash Pandas"],
      ["Ray", "ray-long", "Prestigio Mundial"],
      ["Brian", "brian-stevens", "Not Mad Just Disappointed"],
      ["Jordan", "jordan-maslyn", "Let Russ Cook(s)"],
    ],
  },
  {
    season: 2022,
    rows: [
      ["Tommy", "tommy-moore", "The Hellfire Club"],
      ["Dave", "david-besedich", "The Schmendricks"],
      ["Brian", "brian-stevens", "It's a New Day"],
      ["Billy", "billy-biddle", "The Originals"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Doug", "doug-fordham", "Closed for Rennovations"],
      ["Ray/Jeffrey", "ray-long", "Prestigio Mundial"],
      ["Travis", "travis-miller", "Trash Pandas"],
      ["Wade", "wade-cameron", "RVA Panthers"],
      ["Rashad", "rashad-gresham", "John Cockslam & 4Skins"],
      ["Jordan", "jordan-maslyn", "Dak Daddy"],
      ["JD", "jd-dowling", "Panda Loco"],
    ],
  },
  {
    season: 2023,
    rows: [
      ["Tommy", "tommy-moore", "The Ship of Theseus"],
      ["Brian", "brian-stevens", "It's a New Day"],
      ["Ray/Jeffrey", "ray-long", "The Righteous Gemstones"],
      ["JD", "jd-dowling", "Clown Punchers"],
      ["Billy", "billy-biddle", "Brilly"],
      ["Travis", "travis-miller", "Trash Pandas"],
      ["Wade", "wade-cameron", "The Dollar Bins"],
      ["Dave", "david-besedich", "The Tush Pushers"],
      ["Doug", "doug-fordham", "Closed for Rennovations"],
      ["Rashad", "rashad-gresham", "Snyder's Sloppy Seconds"],
      ["Jordan", "jordan-maslyn", "Getting Chiggy Wit It"],
      ["Landon", "landon-elliott", "Special Brownies"],
    ],
  },
  {
    season: 2024,
    rows: [
      ["Jordan", "jordan-maslyn", "Get.Your.Guy"],
      ["Wade", "wade-cameron", "Stroud 2B an Achane"],
      ["Doug", "doug-fordham", "NowGiveMeMyThemeMusic"],
      ["Dave", "david-besedich", "The Schmendricks"],
      ["JD", "jd-dowling", 'The Mad "Panda"'],
      ["Tommy", "tommy-moore", "Fancy Ass Bitches"],
      ["Travis", "travis-miller", "Love'n Trash Pandas"],
      ["Ray", "ray-long", "The Righteous Gemstones"],
      ["Landon", "landon-elliott", "Special Brownies"],
      ["Billy", "billy-biddle", "Brilly"],
      ["Brian", "brian-stevens", "It's a New Day"],
      ["Rashad", "rashad-gresham", "Snyder's Sloppy Seconds"],
    ],
  },
  {
    season: 2025,
    rows: [
      ["Aaron", "aaron-hawkins", "Nudas Priest"],
      ["Travis", "travis-miller", "Trash Pandas"],
      ["JD", "jd-dowling", "The Mad Panda"],
      ["Dave", "david-besedich", "The Schmendricks"],
      ["Rashad", "rashad-gresham", "#FuckTSwift"],
      ["Stan", "stan-schoppe", "Stanal Fissures"],
      ["Tommy", "tommy-moore", "ETN' Deez Nutz"],
      ["Jordan", "jordan-maslyn", "Shake-n-Bakers"],
      ["Brian", "brian-stevens", "It's a New Day"],
      ["Doug", "doug-fordham", "Broken Toe Joe"],
      ["Wade", "wade-cameron", "Carolina Reapers"],
      ["Ray/Jeffrey", "ray-long", "Prestigio Mundial"],
    ],
  },
] as const;

const PAST_STANDINGS_COLUMN_BY_SEASON: Readonly<Record<number, string>> = {
  2011: "U",
  2012: "T",
  2013: "S",
  2014: "R",
  2015: "Q",
  2016: "P",
  2017: "O",
  2018: "N",
  2019: "M",
  2020: "L",
  2021: "K",
  2022: "J",
  2023: "I",
  2024: "H",
  2025: "G",
};

const CHAMPIONSHIP_NOTE_2022 =
  "The Damar Hamlin game ended the fantasy championship unresolved; River City recognizes Tommy Moore and David Besedich as 2022 co-champions while preserving Sleeper's points order of Tommy first and Dave second.";

function getOwnerIds(ownerId: string, season: number) {
  if (ownerId === "ray-long" && season >= 2013) {
    return ["ray-long", "jeffrey-hudgins"];
  }

  if (ownerId === "jordan-maslyn" && season === 2025) {
    return ["jordan-maslyn", "landon-elliott"];
  }

  return [ownerId];
}

function getFranchiseId(ownerId: string, season: number) {
  if (ownerId === "jd-dowling" && season === 2011) return null;
  if (ownerId === "jordan-maslyn" && season === 2025) {
    return "shake-n-bakers";
  }

  return FRANCHISE_BY_OWNER_ID[ownerId] ?? null;
}

function getSource(
  season: number,
  finalPlacement: number,
  ownerId: string
) {
  const pastStandingsCell = `${PAST_STANDINGS_COLUMN_BY_SEASON[season]}${
    finalPlacement + 1
  }`;
  const corroboratingReferences = [
    `Past Standings!${pastStandingsCell}`,
  ];

  if (finalPlacement === 1) {
    corroboratingReferences.push(
      `Prior_Champs!A${season - 2009}:B${season - 2009}`
    );
  }

  if (season < 2015) {
    return {
      ...HISTORICAL_SEASON_RESULTS_SOURCE,
      sheetName: "Past Standings",
      cellRange: pastStandingsCell,
      corroboratingReferences,
    };
  }

  if (season === 2018 && ownerId === "jd-dowling") {
    return {
      ...HISTORICAL_SEASON_RESULTS_SOURCE,
      sheetName: "Past Standings",
      cellRange: pastStandingsCell,
      corroboratingReferences: [
        "2018_Regular_Season_Standings!G14:H14",
        ...corroboratingReferences,
      ],
    };
  }

  if (season === 2018 && ownerId === "landon-elliott") {
    return {
      ...HISTORICAL_SEASON_RESULTS_SOURCE,
      sheetName: "Past Standings",
      cellRange: pastStandingsCell,
      corroboratingReferences: [
        "2018_Regular_Season_Standings!G10:H10",
        ...corroboratingReferences,
      ],
    };
  }

  const row = finalPlacement + 2;
  const cellRange = season === 2021 ? `H${row}:J${row}` : `F${row}:H${row}`;

  return {
    ...HISTORICAL_SEASON_RESULTS_SOURCE,
    sheetName: `${season}_Regular_Season_Standings`,
    cellRange,
    corroboratingReferences,
  };
}

function createHistoricalSeasonResults() {
  return RAW_SEASONS.flatMap(({ season, rows }) => {
    const teamCount = season === 2011 ? 10 : 12;

    return rows.map(
      ([rawOwnerLabel, ownerId, rawTeamName = null], index) => {
        const finalPlacement = index + 1;
        const franchiseId = getFranchiseId(ownerId, season);
        const ownerIds = getOwnerIds(ownerId, season);
        const isHistoricalChampion =
          finalPlacement === 1 ||
          (season === 2022 && ownerId === "david-besedich");
        const notes: string[] = [];

        if (season === 2011 && ownerId === "jd-dowling") {
          notes.push(
            "The commissioner-approved workbook establishes JD's 2011 participation and fifth-place finish, but no approved 2011 franchise mapping is available."
          );
        }

        if (
          season === 2012 &&
          ["landon-elliott", "travis-miller", "darren-kusaj"].includes(
            ownerId
          )
        ) {
          notes.push(
            "The historical team and franchise mapping is commissioner-approved for the ESPN era."
          );
        }

        if (season === 2022 && isHistoricalChampion) {
          notes.push(CHAMPIONSHIP_NOTE_2022);
        }

        return {
          seasonResultKey: `historical-season-result:${season}:rank-${finalPlacement}`,
          season,
          teamCount,
          finalPlacement,
          franchiseId,
          ownerIds,
          rawOwnerLabel,
          rawTeamName,
          isPlatformChampion: finalPlacement === 1,
          isPlatformRunnerUp: finalPlacement === 2,
          isHistoricalChampion,
          isThirdPlace: finalPlacement === 3,
          isPodium: finalPlacement <= 3,
          isLastPlace: finalPlacement === teamCount,
          championshipNote:
            season === 2022 ? CHAMPIONSHIP_NOTE_2022 : null,
          source: getSource(season, finalPlacement, ownerId),
          coverage: {
            seasonResult: "available" as const,
            ownerIdentity: "resolved" as const,
            franchise: franchiseId ? ("resolved" as const) : ("unresolved" as const),
            historicalTeamName: rawTeamName
              ? ("available" as const)
              : ("not-available" as const),
            matchupSource:
              season < 2018
                ? ("unavailable-no-source" as const)
                : ("available-in-separate-engine" as const),
          },
          notes,
        } satisfies HistoricalSeasonResult;
      }
    );
  });
}

const historicalSeasonResults = createHistoricalSeasonResults();
const ownerIdBySlug = new Map(
  ownerProfiles.map((owner) => [owner.slug.toLowerCase(), owner.id])
);

function cloneResult(result: HistoricalSeasonResult): HistoricalSeasonResult {
  return {
    ...result,
    ownerIds: [...result.ownerIds],
    source: {
      ...result.source,
      corroboratingReferences: [...result.source.corroboratingReferences],
    },
    coverage: { ...result.coverage },
    notes: [...result.notes],
  };
}

function resolveOwnerId(ownerIdOrSlug: string) {
  const normalized = ownerIdOrSlug.trim().toLowerCase();
  if (ownerProfilesById[normalized]) return normalized;
  return ownerIdBySlug.get(normalized) ?? null;
}

function getDuplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

export function getAllHistoricalSeasonResults() {
  return historicalSeasonResults.map(cloneResult);
}

export function getHistoricalSeasonResultsForSeason(season: number) {
  return historicalSeasonResults
    .filter((result) => result.season === season)
    .map(cloneResult);
}

export function getHistoricalSeasonResult(
  ownerIdOrSlug: string,
  season: number
) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  if (!ownerId) return null;

  const result = historicalSeasonResults.find(
    (candidate) =>
      candidate.season === season && candidate.ownerIds.includes(ownerId)
  );
  return result ? cloneResult(result) : null;
}

export function getHistoricalSeasonResultsForOwner(ownerIdOrSlug: string) {
  const ownerId = resolveOwnerId(ownerIdOrSlug);
  if (!ownerId) return [];

  return historicalSeasonResults
    .filter((result) => result.ownerIds.includes(ownerId))
    .map(cloneResult);
}

export function getHistoricalSeasonResultsCoverage(): HistoricalSeasonResultsCoverage {
  const seasons = RAW_SEASONS.map(({ season }) => season);
  const bySeason = seasons.map((season): HistoricalSeasonCoverage => {
    const results = historicalSeasonResults.filter(
      (result) => result.season === season
    );
    const expectedPlacements = season === 2011 ? 10 : 12;

    return {
      season,
      expectedPlacements,
      resultCount: results.length,
      ownerCredits: results.reduce(
        (total, result) => total + result.ownerIds.length,
        0
      ),
      historicalChampionResults: results.filter(
        (result) => result.isHistoricalChampion
      ).length,
      matchupSource:
        season < 2018
          ? "unavailable-no-source"
          : "available-in-separate-engine",
      isComplete:
        results.length === expectedPlacements &&
        new Set(results.map((result) => result.finalPlacement)).size ===
          expectedPlacements,
    };
  });
  const duplicateSeasonPlacements = getDuplicateValues(
    historicalSeasonResults.map(
      (result) => `${result.season}:${result.finalPlacement}`
    )
  );

  return {
    source: { ...HISTORICAL_SEASON_RESULTS_SOURCE },
    seasons: [...seasons],
    firstSeason: seasons[0],
    latestSeason: seasons.at(-1) ?? seasons[0],
    totalSeasonResults: historicalSeasonResults.length,
    totalOwnerCredits: historicalSeasonResults.reduce(
      (total, result) => total + result.ownerIds.length,
      0
    ),
    historicalChampionResults: historicalSeasonResults.filter(
      (result) => result.isHistoricalChampion
    ).length,
    duplicateSeasonResultKeys: getDuplicateValues(
      historicalSeasonResults.map((result) => result.seasonResultKey)
    ),
    duplicateSeasonPlacements,
    unresolvedOwnerResultKeys: historicalSeasonResults
      .filter((result) =>
        result.ownerIds.some((ownerId) => !ownerProfilesById[ownerId])
      )
      .map((result) => result.seasonResultKey),
    unresolvedFranchiseResultKeys: historicalSeasonResults
      .filter((result) => result.franchiseId === null)
      .map((result) => result.seasonResultKey),
    missingHistoricalTeamNameResults: historicalSeasonResults.filter(
      (result) => result.rawTeamName === null
    ).length,
    seasonsWithInvalidPlacementCounts: bySeason
      .filter((season) => !season.isComplete)
      .map((season) => season.season),
    bySeason,
  };
}
