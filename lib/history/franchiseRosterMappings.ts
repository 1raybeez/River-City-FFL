import type {
  CanonicalMatchupBuildInput,
  CanonicalMatchupSeasonInput,
} from "@/lib/history/canonicalMatchupHistory";
import { franchisesById } from "@/lib/managers/identityData";

export type FranchiseRosterMapping = Readonly<{
  mappingKey: string;
  season: number;
  leagueId: string;
  rosterId: number;
  franchiseId: string;
  resolution: "commissioner-approved";
}>;

export type FranchiseRosterMappingCoverage = Readonly<{
  totalMappings: number;
  seasons: readonly number[];
  mappingsBySeason: Readonly<Record<number, number>>;
  duplicateSourceKeys: readonly string[];
  duplicateSeasonFranchises: readonly string[];
  unknownFranchiseIds: readonly string[];
}>;

const LEAGUE_IDS = {
  2018: "342868033913540608",
  2019: "466632190273253376",
  2020: "530115541505298432",
  2021: "677751457528762368",
  2022: "784542934581256192",
  2023: "997510104398315520",
  2024: "1072545817749331968",
  2025: "1199749375539027968",
} as const;

const FRANCHISES_BY_SEASON = {
  2018: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "ricky-crickets",
    "kissed-by-a-freckle",
    "deebow-and-arrow",
    "buckeye-nation",
    "brilly",
    "receding-zuerlein",
  ],
  2019: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "deebow-and-arrow",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2020: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "hotub-jellyfish",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2021: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "hotub-jellyfish",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2022: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "the-gresham-empire",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2023: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "the-gresham-empire",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2024: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "special-brownies",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "the-gresham-empire",
    "buckeye-nation",
    "brilly",
    "the-bearded-one",
  ],
  2025: [
    "prestigio-mundial",
    "the-art-of-war",
    "shake-n-bakers",
    "the-shepherd",
    "tax-season",
    "the-wildcard",
    "hall-pass",
    "kissed-by-a-freckle",
    "the-gresham-empire",
    "buckeye-nation",
    "hawkins-heroes",
    "the-bearded-one",
  ],
} as const;

function mappingKey(season: number, leagueId: string, rosterId: number) {
  return `sleeper:${season}:${leagueId}:roster:${rosterId}`;
}

const mappings: readonly FranchiseRosterMapping[] = Object.freeze(
  Object.entries(FRANCHISES_BY_SEASON).flatMap(
    ([seasonValue, franchiseIds]) => {
      const season = Number(seasonValue) as keyof typeof LEAGUE_IDS;
      const leagueId = LEAGUE_IDS[season];

      return franchiseIds.map((franchiseId, index) =>
        Object.freeze({
          mappingKey: mappingKey(season, leagueId, index + 1),
          season,
          leagueId,
          rosterId: index + 1,
          franchiseId,
          resolution: "commissioner-approved" as const,
        })
      );
    }
  )
);

function duplicateValues(values: readonly string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function buildCoverage(): FranchiseRosterMappingCoverage {
  const seasons = [...new Set(mappings.map((mapping) => mapping.season))].sort();
  const mappingsBySeason = Object.fromEntries(
    seasons.map((season) => [
      season,
      mappings.filter((mapping) => mapping.season === season).length,
    ])
  );
  const duplicateSourceKeys = duplicateValues(
    mappings.map((mapping) => mapping.mappingKey)
  );
  const duplicateSeasonFranchises = duplicateValues(
    mappings.map(
      (mapping) => `${mapping.season}:${mapping.franchiseId}`
    )
  );
  const unknownFranchiseIds = [
    ...new Set(
      mappings
        .map((mapping) => mapping.franchiseId)
        .filter((franchiseId) => franchisesById[franchiseId] === undefined)
    ),
  ].sort();

  return Object.freeze({
    totalMappings: mappings.length,
    seasons: Object.freeze(seasons),
    mappingsBySeason: Object.freeze(mappingsBySeason),
    duplicateSourceKeys: Object.freeze(duplicateSourceKeys),
    duplicateSeasonFranchises: Object.freeze(duplicateSeasonFranchises),
    unknownFranchiseIds: Object.freeze(unknownFranchiseIds),
  });
}

const coverage = buildCoverage();

if (
  coverage.totalMappings !== 96 ||
  coverage.seasons.length !== 8 ||
  coverage.seasons.some(
    (season) => coverage.mappingsBySeason[season] !== 12
  ) ||
  coverage.duplicateSourceKeys.length > 0 ||
  coverage.duplicateSeasonFranchises.length > 0 ||
  coverage.unknownFranchiseIds.length > 0
) {
  throw new Error("Reviewed franchise roster mappings failed validation.");
}

const mappingsByKey = new Map(
  mappings.map((mapping) => [mapping.mappingKey, mapping])
);

function cloneMapping(mapping: FranchiseRosterMapping) {
  return Object.freeze({ ...mapping });
}

function cloneCoverage() {
  return Object.freeze({
    ...coverage,
    seasons: Object.freeze([...coverage.seasons]),
    mappingsBySeason: Object.freeze({ ...coverage.mappingsBySeason }),
    duplicateSourceKeys: Object.freeze([
      ...coverage.duplicateSourceKeys,
    ]),
    duplicateSeasonFranchises: Object.freeze([
      ...coverage.duplicateSeasonFranchises,
    ]),
    unknownFranchiseIds: Object.freeze([...coverage.unknownFranchiseIds]),
  });
}

export function getFranchiseMapping(
  season: number,
  leagueId: string,
  rosterId: number
) {
  const mapping = mappingsByKey.get(mappingKey(season, leagueId, rosterId));
  return mapping ? cloneMapping(mapping) : null;
}

export function getAllFranchiseRosterMappings() {
  return Object.freeze(mappings.map(cloneMapping));
}

export function getFranchiseMappingCoverage() {
  return cloneCoverage();
}

function applySeasonMappings(
  seasonInput: CanonicalMatchupSeasonInput
): CanonicalMatchupSeasonInput {
  const seasonMappings = mappings.filter(
    (mapping) =>
      mapping.season === seasonInput.season &&
      mapping.leagueId === seasonInput.leagueId
  );

  if (seasonMappings.length === 0) {
    return { ...seasonInput };
  }

  return {
    ...seasonInput,
    franchiseIdByRosterId: Object.fromEntries(
      seasonMappings.map((mapping) => [
        mapping.rosterId,
        mapping.franchiseId,
      ])
    ),
  };
}

/**
 * Returns a new canonical build input with the reviewed mapping attached.
 * Acquisition input and nested source rows remain untouched.
 */
export function applyFranchiseRosterMappings(
  input: CanonicalMatchupBuildInput
): CanonicalMatchupBuildInput {
  return {
    seasons: input.seasons.map(applySeasonMappings),
  };
}
