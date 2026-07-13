export type HistoricalPriceComparisonMatchType =
  | 'sleeper-id'
  | 'name-position'
  | 'none';

export type HistoricalPriceComparisonResult =
  | 'bargain'
  | 'fair'
  | 'overpay'
  | 'unknown';

export type HistoricalPriceComparisonTrend =
  | 'rising'
  | 'falling'
  | 'stable'
  | 'insufficient';

export type HistoricalPriceComparisonPricingStyle =
  | 'usually-overpays'
  | 'usually-fair'
  | 'usually-discounts'
  | 'mixed'
  | 'insufficient';

export type HistoricalPriceComparisonMasterviewRow = {
  season?: number | string | null;
  seasonYear?: number | string | null;
  playerName?: string | null;
  originalPlayerName?: string | null;
  name?: string | null;
  sleeperPlayerId?: string | number | null;
  playerId?: string | number | null;
  position?: string | null;
  auctionPrice?: number | string | null;
  averageValue?: number | string | null;
  raw?: {
    averageValue?: number | string | null;
    original?: Record<string, unknown> | null;
  } | null;
};

export type HistoricalPriceComparisonMasterviewDocument = {
  season?: number | string | null;
  seasonYear?: number | string | null;
  rows?: readonly HistoricalPriceComparisonMasterviewRow[] | null;
  preview?: {
    rows?: readonly HistoricalPriceComparisonMasterviewRow[] | null;
  } | null;
};

export type HistoricalPriceComparisonSleeperRow = {
  season?: number | string | null;
  draftId?: string | null;
  pickNumber?: number | string | null;
  playerId?: string | number | null;
  playerName?: string | null;
  position?: string | null;
  nflTeam?: string | null;
  salePrice?: number | string | null;
  ownerName?: string | null;
  teamName?: string | null;
  isKeeper?: boolean | null;
};

export type HistoricalPriceComparisonSleeperDocument = {
  season?: number | string | null;
  rows?: readonly HistoricalPriceComparisonSleeperRow[] | null;
};

export type HistoricalPriceComparisonSelectedPlayer = {
  playerName?: string | null;
  originalPlayerName?: string | null;
  matchedSleeperName?: string | null;
  sleeperPlayerId?: string | number | null;
  playerId?: string | number | null;
  position?: string | null;
};

export type HistoricalPriceComparisonSeason = {
  season: number;
  expectedValue: number;
  actualSalePrice: number;
  difference: number;
  differencePercent: number | null;
  buyerName: string | null;
  teamName: string | null;
  pickNumber: number | null;
  isKeeper: boolean | null;
  result: HistoricalPriceComparisonResult;
};

export type HistoricalPriceComparisonValueSheetSeason = {
  season: number;
  expectedValue: number;
};

export type HistoricalPriceComparisonSummary = {
  seasonsCompared: number;
  averageExpectedValue: number | null;
  averageActualPrice: number | null;
  averageDifference: number | null;
  averageDifferencePercent: number | null;
  recentAverageActual: number | null;
  recentAverageExpected: number | null;
  highestActualPrice: number | null;
  lowestActualPrice: number | null;
  mostRecentActualPrice: number | null;
  trend: HistoricalPriceComparisonTrend;
  riverCityPricingStyle: HistoricalPriceComparisonPricingStyle;
};

export type HistoricalPriceComparison = {
  playerName: string | null;
  position: string | null;
  matchType: HistoricalPriceComparisonMatchType;
  currentMarketValue: number | null;
  currentOwnerMaxBid: number | null;
  seasons: HistoricalPriceComparisonSeason[];
  valueSheetOnlySeasons: HistoricalPriceComparisonValueSheetSeason[];
  summary: HistoricalPriceComparisonSummary;
  verdict: string;
  warnings: string[];
};

type ExpectedEntry = {
  season: number;
  playerName: string;
  normalizedPlayerName: string;
  position: string;
  playerId: string;
  expectedValue: number;
};

type ActualEntry = {
  season: number;
  playerName: string;
  normalizedPlayerName: string;
  position: string;
  playerId: string;
  actualSalePrice: number;
  buyerName: string | null;
  teamName: string | null;
  pickNumber: number | null;
  isKeeper: boolean | null;
};

type MatchResult<TEntry> =
  | {
      entry: TEntry;
      matchType: Exclude<HistoricalPriceComparisonMatchType, 'none'>;
      warning: null;
    }
  | {
      entry: null;
      matchType: 'none';
      warning: string | null;
    };

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizePosition(value: string | null | undefined) {
  const position = (value ?? '').trim().toUpperCase();

  if (
    position === 'DST' ||
    position === 'D/ST' ||
    position === 'DEFENSE'
  ) {
    return 'DEF';
  }

  return position;
}

function normalizePlayerName(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readString(value: unknown) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const normalizedValue = value.replace(/[$,%]/g, '').trim();
  if (!normalizedValue) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function readOriginalValue(
  row: HistoricalPriceComparisonMasterviewRow,
  keys: readonly string[]
) {
  const original = row.raw?.original;

  if (!original) return null;

  for (const key of keys) {
    const value = original[key];
    if (value !== null && value !== undefined) return value;
  }

  return null;
}

function getExpectedDocumentSeason(
  row: HistoricalPriceComparisonMasterviewRow,
  document: HistoricalPriceComparisonMasterviewDocument
) {
  return (
    toFiniteNumber(row.seasonYear) ??
    toFiniteNumber(row.season) ??
    toFiniteNumber(document.seasonYear) ??
    toFiniteNumber(document.season)
  );
}

function getActualDocumentSeason(
  row: HistoricalPriceComparisonSleeperRow,
  document: HistoricalPriceComparisonSleeperDocument
) {
  return toFiniteNumber(row.season) ?? toFiniteNumber(document.season);
}

function getExpectedPlayerName(row: HistoricalPriceComparisonMasterviewRow) {
  const name =
    row.playerName ??
    row.originalPlayerName ??
    row.name ??
    readOriginalValue(row, ['Name', 'Player', 'Player Name']);

  return typeof name === 'string' ? name.trim() : '';
}

function getExpectedPosition(row: HistoricalPriceComparisonMasterviewRow) {
  const position = row.position ?? readOriginalValue(row, ['Pos', 'Position']);
  return typeof position === 'string' ? normalizePosition(position) : '';
}

function getExpectedValue(row: HistoricalPriceComparisonMasterviewRow) {
  return (
    toFiniteNumber(row.auctionPrice) ??
    toFiniteNumber(row.averageValue) ??
    toFiniteNumber(row.raw?.averageValue) ??
    toFiniteNumber(
      readOriginalValue(row, ['Avg Going Rate', 'Average', 'Avg', 'Value'])
    )
  );
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function roundRatio(value: number) {
  return Math.round(value * 1000) / 1000;
}

function getAverage(values: readonly number[]) {
  return values.length > 0
    ? roundToTenth(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function flattenExpectedEntries(
  documents: readonly HistoricalPriceComparisonMasterviewDocument[]
) {
  const entries: ExpectedEntry[] = [];

  documents.forEach((document) => {
    const rows = document.preview?.rows ?? document.rows ?? [];

    rows.forEach((row) => {
      const season = getExpectedDocumentSeason(row, document);
      const playerName = getExpectedPlayerName(row);
      const position = getExpectedPosition(row);
      const expectedValue = getExpectedValue(row);

      if (
        season === null ||
        !playerName ||
        !position ||
        expectedValue === null ||
        expectedValue < 0
      ) {
        return;
      }

      entries.push({
        season,
        playerName,
        normalizedPlayerName: normalizePlayerName(playerName),
        position,
        playerId: normalizeId(row.sleeperPlayerId ?? row.playerId),
        expectedValue,
      });
    });
  });

  return entries;
}

function flattenActualEntries(
  documents: readonly HistoricalPriceComparisonSleeperDocument[]
) {
  const entries: ActualEntry[] = [];

  documents.forEach((document) => {
    const rows = document.rows ?? [];

    rows.forEach((row) => {
      const season = getActualDocumentSeason(row, document);
      const playerName = readString(row.playerName) ?? '';
      const position = normalizePosition(row.position);
      const actualSalePrice = toFiniteNumber(row.salePrice);

      if (
        season === null ||
        !playerName ||
        !position ||
        actualSalePrice === null ||
        actualSalePrice < 0
      ) {
        return;
      }

      entries.push({
        season,
        playerName,
        normalizedPlayerName: normalizePlayerName(playerName),
        position,
        playerId: normalizeId(row.playerId),
        actualSalePrice,
        buyerName: readString(row.ownerName),
        teamName: readString(row.teamName),
        pickNumber: toFiniteNumber(row.pickNumber),
        isKeeper: row.isKeeper ?? null,
      });
    });
  });

  return entries;
}

function findEntryForSeason<TEntry extends ExpectedEntry | ActualEntry>({
  entries,
  season,
  selectedPlayerId,
  normalizedSelectedPlayerName,
  selectedPosition,
  sourceLabel,
}: {
  entries: readonly TEntry[];
  season: number;
  selectedPlayerId: string;
  normalizedSelectedPlayerName: string;
  selectedPosition: string;
  sourceLabel: string;
}): MatchResult<TEntry> {
  const seasonEntries = entries.filter((entry) => entry.season === season);
  const idMatches = selectedPlayerId
    ? seasonEntries.filter(
        (entry) => entry.playerId && entry.playerId === selectedPlayerId
      )
    : [];

  if (idMatches.length === 1) {
    return {
      entry: idMatches[0],
      matchType: 'sleeper-id',
      warning: null,
    };
  }

  if (idMatches.length > 1) {
    return {
      entry: null,
      matchType: 'none',
      warning: `${season}: ${sourceLabel} match is ambiguous for Sleeper player ID ${selectedPlayerId}.`,
    };
  }

  const nameMatches = seasonEntries.filter(
    (entry) =>
      entry.normalizedPlayerName === normalizedSelectedPlayerName &&
      entry.position === selectedPosition
  );

  if (nameMatches.length === 1) {
    return {
      entry: nameMatches[0],
      matchType: 'name-position',
      warning: null,
    };
  }

  if (nameMatches.length > 1) {
    return {
      entry: null,
      matchType: 'none',
      warning: `${season}: ${sourceLabel} match is ambiguous for normalized name + position.`,
    };
  }

  return {
    entry: null,
    matchType: 'none',
    warning: null,
  };
}

function getSeasonResult({
  actualSalePrice,
  expectedValue,
}: {
  actualSalePrice: number;
  expectedValue: number;
}): HistoricalPriceComparisonResult {
  if (expectedValue <= 0) return 'unknown';

  const ratio = (actualSalePrice - expectedValue) / expectedValue;

  if (ratio <= -0.1) return 'bargain';
  if (ratio >= 0.1) return 'overpay';
  return 'fair';
}

function getTrend(values: readonly HistoricalPriceComparisonSeason[]) {
  if (values.length < 2) {
    return 'insufficient' satisfies HistoricalPriceComparisonTrend;
  }

  const firstValue = values[0].actualSalePrice;
  const lastValue = values[values.length - 1].actualSalePrice;
  const difference = lastValue - firstValue;
  const materialChangeThreshold = Math.max(3, Math.abs(firstValue) * 0.1);

  if (difference >= materialChangeThreshold) {
    return 'rising' satisfies HistoricalPriceComparisonTrend;
  }

  if (difference <= -materialChangeThreshold) {
    return 'falling' satisfies HistoricalPriceComparisonTrend;
  }

  return 'stable' satisfies HistoricalPriceComparisonTrend;
}

function getRiverCityPricingStyle(
  seasons: readonly HistoricalPriceComparisonSeason[]
): HistoricalPriceComparisonPricingStyle {
  const comparableSeasons = seasons.filter(
    (season) => season.result !== 'unknown'
  );

  if (comparableSeasons.length < 2) return 'insufficient';

  const counts = comparableSeasons.reduce(
    (resultCounts, season) => {
      resultCounts[season.result] += 1;
      return resultCounts;
    },
    {
      bargain: 0,
      fair: 0,
      overpay: 0,
      unknown: 0,
    } satisfies Record<HistoricalPriceComparisonResult, number>
  );
  const threshold = comparableSeasons.length * 0.6;

  if (counts.overpay >= threshold) return 'usually-overpays';
  if (counts.bargain >= threshold) return 'usually-discounts';
  if (counts.fair >= threshold) return 'usually-fair';
  return 'mixed';
}

function summarizeComparison(
  seasons: readonly HistoricalPriceComparisonSeason[]
): HistoricalPriceComparisonSummary {
  const openMarketSeasons = seasons.filter((season) => season.isKeeper !== true);
  const openMarketDifferencePercents = openMarketSeasons
    .map((season) => season.differencePercent)
    .filter((differencePercent): differencePercent is number => differencePercent !== null);
  const recentOpenMarketSeasons = openMarketSeasons.slice(-2);
  const mostRecentSeason = seasons[seasons.length - 1] ?? null;

  return {
    seasonsCompared: seasons.length,
    averageExpectedValue: getAverage(
      openMarketSeasons.map((season) => season.expectedValue)
    ),
    averageActualPrice: getAverage(
      openMarketSeasons.map((season) => season.actualSalePrice)
    ),
    averageDifference: getAverage(
      openMarketSeasons.map((season) => season.difference)
    ),
    averageDifferencePercent:
      openMarketDifferencePercents.length > 0
        ? roundRatio(
            openMarketDifferencePercents.reduce(
              (sum, differencePercent) => sum + differencePercent,
              0
            ) / openMarketDifferencePercents.length
          )
        : null,
    recentAverageActual: getAverage(
      recentOpenMarketSeasons.map((season) => season.actualSalePrice)
    ),
    recentAverageExpected: getAverage(
      recentOpenMarketSeasons.map((season) => season.expectedValue)
    ),
    highestActualPrice:
      openMarketSeasons.length > 0
        ? Math.max(...openMarketSeasons.map((season) => season.actualSalePrice))
        : null,
    lowestActualPrice:
      openMarketSeasons.length > 0
        ? Math.min(...openMarketSeasons.map((season) => season.actualSalePrice))
        : null,
    mostRecentActualPrice: mostRecentSeason?.actualSalePrice ?? null,
    trend: getTrend(openMarketSeasons),
    riverCityPricingStyle: getRiverCityPricingStyle(openMarketSeasons),
  };
}

function buildVerdict({
  seasons,
  summary,
  currentMarketValue,
}: {
  seasons: readonly HistoricalPriceComparisonSeason[];
  summary: HistoricalPriceComparisonSummary;
  currentMarketValue: number | null;
}) {
  const openMarketSeasons = seasons.filter((season) => season.isKeeper !== true);

  if (seasons.length === 0) {
    return 'No Sleeper auction sale history is available for this player.';
  }

  if (openMarketSeasons.length === 0) {
    return 'Only keeper-price history is available, so open-market comparisons are limited.';
  }

  if (summary.recentAverageActual !== null && currentMarketValue !== null) {
    const recentDifference = roundToTenth(
      summary.recentAverageActual - currentMarketValue
    );

    if (recentDifference <= -3) {
      return 'Recent River City prices are lower than current 2026 market value.';
    }

    if (recentDifference >= 3) {
      return 'Recent River City prices are higher than current 2026 market value.';
    }
  }

  if (summary.averageDifference === null) {
    return 'Open-market comparison history is limited for this player.';
  }

  if (Math.abs(summary.averageDifference) < 1) {
    return 'This player usually sells close to Masterview expected value in River City.';
  }

  if (summary.averageDifference > 0) {
    return `River City has paid an average of $${summary.averageDifference} above Masterview expected value for this player.`;
  }

  return `River City has paid an average of $${Math.abs(summary.averageDifference)} below Masterview expected value for this player.`;
}

function buildEmptyComparison({
  playerName,
  position,
  currentMarketValue,
  currentOwnerMaxBid,
  warning,
}: {
  playerName: string | null;
  position: string | null;
  currentMarketValue: number | null;
  currentOwnerMaxBid: number | null;
  warning?: string;
}): HistoricalPriceComparison {
  return {
    playerName,
    position,
    matchType: 'none',
    currentMarketValue,
    currentOwnerMaxBid,
    seasons: [],
    valueSheetOnlySeasons: [],
    summary: summarizeComparison([]),
    verdict: 'No Sleeper auction sale history is available for this player.',
    warnings: warning ? [warning] : [],
  };
}

export function calculateHistoricalPriceComparison({
  selectedPlayer,
  currentMarketValue,
  currentOwnerMaxBid,
  masterviewDocuments,
  sleeperAuctionDocuments,
}: {
  selectedPlayer: HistoricalPriceComparisonSelectedPlayer | null;
  currentMarketValue: number | null;
  currentOwnerMaxBid?: number | null;
  masterviewDocuments: readonly HistoricalPriceComparisonMasterviewDocument[];
  sleeperAuctionDocuments: readonly HistoricalPriceComparisonSleeperDocument[];
}): HistoricalPriceComparison {
  const playerName =
    selectedPlayer?.playerName ??
    selectedPlayer?.originalPlayerName ??
    selectedPlayer?.matchedSleeperName ??
    null;
  const position = normalizePosition(selectedPlayer?.position);
  const normalizedSelectedPlayerName = normalizePlayerName(playerName);
  const selectedPlayerId = normalizeId(
    selectedPlayer?.sleeperPlayerId ?? selectedPlayer?.playerId
  );
  const safeCurrentMarketValue = toFiniteNumber(currentMarketValue);
  const safeCurrentOwnerMaxBid = toFiniteNumber(currentOwnerMaxBid);

  if (!selectedPlayer || !playerName || !position) {
    return buildEmptyComparison({
      playerName,
      position: position || null,
      currentMarketValue: safeCurrentMarketValue,
      currentOwnerMaxBid: safeCurrentOwnerMaxBid,
      warning: selectedPlayer ? 'Selected player is missing a name or position.' : undefined,
    });
  }

  const expectedEntries = flattenExpectedEntries(masterviewDocuments);
  const actualEntries = flattenActualEntries(sleeperAuctionDocuments);
  const seasonsToCompare = Array.from(
    new Set([
      ...expectedEntries.map((entry) => entry.season),
      ...actualEntries.map((entry) => entry.season),
    ])
  ).sort((firstSeason, secondSeason) => firstSeason - secondSeason);
  const warnings: string[] = [];
  const seasons: HistoricalPriceComparisonSeason[] = [];
  const valueSheetOnlySeasons: HistoricalPriceComparisonValueSheetSeason[] = [];
  let usedIdMatch = false;
  let usedNameMatch = false;

  seasonsToCompare.forEach((season) => {
    const expectedMatch = findEntryForSeason({
      entries: expectedEntries,
      season,
      selectedPlayerId,
      normalizedSelectedPlayerName,
      selectedPosition: position,
      sourceLabel: 'Masterview expected value',
    });
    const actualMatch = findEntryForSeason({
      entries: actualEntries,
      season,
      selectedPlayerId,
      normalizedSelectedPlayerName,
      selectedPosition: position,
      sourceLabel: 'Sleeper sale',
    });

    if (expectedMatch.warning) warnings.push(expectedMatch.warning);
    if (actualMatch.warning) warnings.push(actualMatch.warning);

    if (expectedMatch.entry && actualMatch.entry) {
      const difference = roundToTenth(
        actualMatch.entry.actualSalePrice - expectedMatch.entry.expectedValue
      );
      const differencePercent =
        expectedMatch.entry.expectedValue > 0
          ? roundRatio(difference / expectedMatch.entry.expectedValue)
          : null;

      seasons.push({
        season,
        expectedValue: roundToTenth(expectedMatch.entry.expectedValue),
        actualSalePrice: roundToTenth(actualMatch.entry.actualSalePrice),
        difference,
        differencePercent,
        buyerName: actualMatch.entry.buyerName,
        teamName: actualMatch.entry.teamName,
        pickNumber: actualMatch.entry.pickNumber,
        isKeeper: actualMatch.entry.isKeeper,
        result: getSeasonResult({
          actualSalePrice: actualMatch.entry.actualSalePrice,
          expectedValue: expectedMatch.entry.expectedValue,
        }),
      });

      usedIdMatch =
        usedIdMatch ||
        expectedMatch.matchType === 'sleeper-id' ||
        actualMatch.matchType === 'sleeper-id';
      usedNameMatch =
        usedNameMatch ||
        expectedMatch.matchType === 'name-position' ||
        actualMatch.matchType === 'name-position';
      return;
    }

    if (expectedMatch.entry && !actualMatch.entry && !actualMatch.warning) {
      valueSheetOnlySeasons.push({
        season,
        expectedValue: roundToTenth(expectedMatch.entry.expectedValue),
      });
      warnings.push(
        `${season}: Expected value exists, but no actual Sleeper sale was found.`
      );
    }

    if (!expectedMatch.entry && actualMatch.entry && !expectedMatch.warning) {
      warnings.push(
        `${season}: Sleeper sale exists, but no Masterview expected value was found.`
      );
    }
  });

  const sortedSeasons = seasons.sort(
    (firstSeason, secondSeason) => firstSeason.season - secondSeason.season
  );
  const summary = summarizeComparison(sortedSeasons);
  const keeperCount = sortedSeasons.filter(
    (season) => season.isKeeper === true
  ).length;
  const finalWarnings = [
    ...warnings,
    ...(keeperCount > 0
      ? [
          `${keeperCount} keeper sale${
            keeperCount === 1 ? '' : 's'
          } shown in the timeline and excluded from open-market summary averages.`,
        ]
      : []),
  ];

  return {
    playerName,
    position,
    matchType: usedIdMatch ? 'sleeper-id' : usedNameMatch ? 'name-position' : 'none',
    currentMarketValue: safeCurrentMarketValue,
    currentOwnerMaxBid: safeCurrentOwnerMaxBid,
    seasons: sortedSeasons,
    valueSheetOnlySeasons: valueSheetOnlySeasons.sort(
      (firstSeason, secondSeason) => firstSeason.season - secondSeason.season
    ),
    summary,
    verdict:
      sortedSeasons.length === 0 && valueSheetOnlySeasons.length > 0
        ? 'Expected value exists, but no actual Sleeper sale was found.'
        : buildVerdict({
            seasons: sortedSeasons,
            summary,
            currentMarketValue: safeCurrentMarketValue,
          }),
    warnings: finalWarnings,
  };
}
