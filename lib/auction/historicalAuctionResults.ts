export type HistoricalAuctionResultSource = "sleeper";

export type HistoricalAuctionOwnerMapping =
  | "exact"
  | "roster-only"
  | "user-only"
  | "unresolved";

export type HistoricalSleeperAuctionResultRow = {
  season: number;
  draftId: string | null;
  pickNumber: number | null;
  round: number | null;
  draftSlot: number | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  salePrice: number | null;
  rosterId: number | null;
  pickedByUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  isKeeper: boolean | null;
  source: HistoricalAuctionResultSource;
  ownerMapping: HistoricalAuctionOwnerMapping;
};

export type HistoricalAuctionOwnerMappingCounts = Record<
  HistoricalAuctionOwnerMapping,
  number
>;

export type HistoricalAuctionSeasonValidation = {
  draftFound: boolean;
  totalPicks: number;
  auctionPricedPicks: number;
  rowsNormalized: number;
  missingPlayerIds: number;
  missingSalePrices: number;
  unresolvedOwners: number;
  duplicatePickNumbers: number[];
  invalidPrices: number;
  keeperCount: number;
  warnings: string[];
  errors: string[];
};

export type HistoricalAuctionSeasonFile = {
  season: number;
  leagueId: string | null;
  draftId: string | null;
  generatedAt: string;
  source: HistoricalAuctionResultSource;
  validation: HistoricalAuctionSeasonValidation;
  ownerMappingCounts: HistoricalAuctionOwnerMappingCounts;
  rows: HistoricalSleeperAuctionResultRow[];
};

export type HistoricalAuctionManifestSeason = {
  season: number;
  leagueId: string | null;
  draftId: string | null;
  generatedAt: string;
  pickCount: number;
  normalizedResultCount: number;
  ownerMappingCounts: HistoricalAuctionOwnerMappingCounts;
  warnings: string[];
  errors: string[];
  outputPath: string;
  written: boolean;
  source: HistoricalAuctionResultSource;
};

export type HistoricalAuctionManifestFile = {
  generatedAt: string;
  source: HistoricalAuctionResultSource;
  seasons: HistoricalAuctionManifestSeason[];
};

export function createEmptyOwnerMappingCounts(): HistoricalAuctionOwnerMappingCounts {
  return {
    exact: 0,
    "roster-only": 0,
    "user-only": 0,
    unresolved: 0,
  };
}

export function countOwnerMappings(
  rows: readonly HistoricalSleeperAuctionResultRow[]
): HistoricalAuctionOwnerMappingCounts {
  return rows.reduce<HistoricalAuctionOwnerMappingCounts>(
    (counts, row) => {
      counts[row.ownerMapping] += 1;
      return counts;
    },
    createEmptyOwnerMappingCounts()
  );
}

export function findDuplicatePickNumbers(
  rows: readonly Pick<HistoricalSleeperAuctionResultRow, "pickNumber">[]
) {
  const seenPickNumbers = new Set<number>();
  const duplicatePickNumbers = new Set<number>();

  for (const row of rows) {
    if (row.pickNumber === null) continue;
    if (seenPickNumbers.has(row.pickNumber)) {
      duplicatePickNumbers.add(row.pickNumber);
      continue;
    }

    seenPickNumbers.add(row.pickNumber);
  }

  return Array.from(duplicatePickNumbers).sort(
    (firstPick, secondPick) => firstPick - secondPick
  );
}

export function buildHistoricalAuctionSeasonValidation({
  draftFound,
  totalPicks,
  auctionPricedPicks,
  rows,
  invalidPrices,
  warnings,
  errors,
}: {
  draftFound: boolean;
  totalPicks: number;
  auctionPricedPicks: number;
  rows: readonly HistoricalSleeperAuctionResultRow[];
  invalidPrices: number;
  warnings: readonly string[];
  errors: readonly string[];
}): HistoricalAuctionSeasonValidation {
  const duplicatePickNumbers = findDuplicatePickNumbers(rows);
  const missingPlayerIds = rows.filter((row) => row.playerId === null).length;
  const missingSalePrices = rows.filter((row) => row.salePrice === null).length;
  const unresolvedOwners = rows.filter(
    (row) => row.ownerMapping === "unresolved"
  ).length;
  const keeperCount = rows.filter((row) => row.isKeeper === true).length;
  const validationWarnings = [
    ...warnings,
    ...(missingPlayerIds > 0
      ? [`${missingPlayerIds} rows are missing player IDs.`]
      : []),
    ...(missingSalePrices > 0
      ? [`${missingSalePrices} rows are missing sale prices.`]
      : []),
    ...(unresolvedOwners > 0
      ? [`${unresolvedOwners} rows have unresolved historical owners.`]
      : []),
  ];
  const validationErrors = [
    ...errors,
    ...(!draftFound ? ["No Sleeper auction draft was found."] : []),
    ...(duplicatePickNumbers.length > 0
      ? [
          `Duplicate pick numbers found: ${duplicatePickNumbers
            .map(String)
            .join(", ")}.`,
        ]
      : []),
    ...(invalidPrices > 0
      ? [`${invalidPrices} rows have invalid negative sale prices.`]
      : []),
  ];

  return {
    draftFound,
    totalPicks,
    auctionPricedPicks,
    rowsNormalized: rows.length,
    missingPlayerIds,
    missingSalePrices,
    unresolvedOwners,
    duplicatePickNumbers,
    invalidPrices,
    keeperCount,
    warnings: validationWarnings,
    errors: validationErrors,
  };
}
