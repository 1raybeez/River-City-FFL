export type HistoricalPricingTrend =
  | 'rising'
  | 'falling'
  | 'stable'
  | 'insufficient';

export type HistoricalPricingKind =
  | 'exact-history'
  | 'comparable-history'
  | 'none';

export type HistoricalPricingPremiumType =
  | 'premium'
  | 'discount'
  | 'even'
  | 'unknown';

export type HistoricalPricingContextLabel =
  | 'ESTABLISHED HISTORY'
  | 'RISING VALUE'
  | 'FALLING VALUE'
  | 'LIMITED HISTORY'
  | 'COMPARABLE HISTORY';

export type HistoricalPricingMatchMethod =
  | 'sleeper-id'
  | 'name-position'
  | 'comparable-position-band'
  | 'none';

export type HistoricalPricingRowLike = {
  season?: number | null;
  seasonYear?: number | null;
  playerName?: string | null;
  originalPlayerName?: string | null;
  name?: string | null;
  sleeperPlayerId?: string | null;
  playerId?: string | null;
  position?: string | null;
  auctionPrice?: number | string | null;
  averageValue?: number | string | null;
  raw?: {
    averageValue?: number | string | null;
    original?: Record<string, unknown> | null;
  } | null;
};

export type HistoricalPricingDocument = {
  season?: number | null;
  seasonYear?: number | null;
  rows?: readonly HistoricalPricingRowLike[] | null;
  preview?: {
    rows?: readonly HistoricalPricingRowLike[] | null;
  } | null;
};

export type HistoricalPricingSelectedPlayer = {
  playerName?: string | null;
  originalPlayerName?: string | null;
  matchedSleeperName?: string | null;
  sleeperPlayerId?: string | null;
  playerId?: string | null;
  position?: string | null;
};

export type HistoricalPricingYearValue = {
  season: number;
  value: number;
  playerCount: number;
};

export type HistoricalPricingResult = {
  kind: HistoricalPricingKind;
  selectedPlayerName: string | null;
  position: string | null;
  currentMarketValue: number | null;
  yearlyValues: HistoricalPricingYearValue[];
  seasonsWithData: number;
  average: number | null;
  median: number | null;
  low: number | null;
  high: number | null;
  mostRecentValue: number | null;
  recentAverage: number | null;
  recentMedian: number | null;
  currentVsMostRecent: number | null;
  currentVsRecentAverage: number | null;
  careerSeasonsCount: number;
  recentSeasonsCount: number;
  trend: HistoricalPricingTrend;
  historyContextLabel: HistoricalPricingContextLabel;
  premiumDiscountAmount: number | null;
  premiumDiscountType: HistoricalPricingPremiumType;
  matchMethod: HistoricalPricingMatchMethod;
  exactSeasonsWithData: number;
  comparablePlayerCount: number;
  comparablePlayerNames: string[];
  valueBand: {
    low: number;
    high: number;
    center: number;
  } | null;
};

type HistoricalPricingEntry = {
  season: number;
  playerName: string;
  normalizedPlayerName: string;
  position: string;
  playerId: string;
  value: number;
};

const minimumExactSeasons = 2;

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizePlayerName(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizePosition(value: string | null | undefined) {
  const position = (value ?? '').trim().toUpperCase();

  if (position === 'DST' || position === 'D/ST' || position === 'DEFENSE') {
    return 'DEF';
  }

  return position;
}

function readOriginalValue(
  row: HistoricalPricingRowLike,
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

function toFiniteNumber(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const normalizedValue = value.replace(/[$,]/g, '').trim();
  if (!normalizedValue) return null;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getRowSeason(
  row: HistoricalPricingRowLike,
  document: HistoricalPricingDocument
) {
  return (
    toFiniteNumber(row.seasonYear) ??
    toFiniteNumber(row.season) ??
    toFiniteNumber(document.seasonYear) ??
    toFiniteNumber(document.season)
  );
}

function getRowName(row: HistoricalPricingRowLike) {
  const name =
    row.playerName ??
    row.originalPlayerName ??
    row.name ??
    readOriginalValue(row, ['Name', 'Player', 'Player Name']);

  return typeof name === 'string' ? name.trim() : '';
}

function getRowPosition(row: HistoricalPricingRowLike) {
  const position = row.position ?? readOriginalValue(row, ['Pos', 'Position']);
  return typeof position === 'string' ? normalizePosition(position) : '';
}

function getRowValue(row: HistoricalPricingRowLike) {
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

function getMedian(values: readonly number[]) {
  if (values.length === 0) return null;

  const sortedValues = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return roundToTenth(sortedValues[midpoint]);
  }

  return roundToTenth((sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2);
}

function getTrend(values: readonly HistoricalPricingYearValue[]) {
  if (values.length < 2) return 'insufficient' satisfies HistoricalPricingTrend;

  const firstValue = values[0].value;
  const lastValue = values[values.length - 1].value;
  const difference = lastValue - firstValue;

  if (difference >= 3) return 'rising' satisfies HistoricalPricingTrend;
  if (difference <= -3) return 'falling' satisfies HistoricalPricingTrend;
  return 'stable' satisfies HistoricalPricingTrend;
}

function getAverage(values: readonly number[]) {
  return values.length > 0
    ? roundToTenth(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function getCurrentDifference(
  currentMarketValue: number | null,
  comparisonValue: number | null
) {
  return currentMarketValue !== null && comparisonValue !== null
    ? roundToTenth(currentMarketValue - comparisonValue)
    : null;
}

function getPremiumDiscountType(
  difference: number | null
): HistoricalPricingPremiumType {
  if (difference === null) return 'unknown';
  if (difference > 0) return 'premium';
  if (difference < 0) return 'discount';
  return 'even';
}

function getRecentMaterialTrend(
  values: readonly HistoricalPricingYearValue[]
): HistoricalPricingTrend {
  if (values.length < 2) return 'insufficient';

  const previousValue = values[values.length - 2].value;
  const latestValue = values[values.length - 1].value;
  const difference = latestValue - previousValue;
  const materialChangeThreshold = Math.max(5, Math.abs(previousValue) * 0.2);

  if (difference >= materialChangeThreshold) return 'rising';
  if (difference <= -materialChangeThreshold) return 'falling';
  return 'stable';
}

function getHistoryContextLabel({
  kind,
  yearlyValues,
}: {
  kind: HistoricalPricingKind;
  yearlyValues: readonly HistoricalPricingYearValue[];
}): HistoricalPricingContextLabel {
  if (kind === 'comparable-history') return 'COMPARABLE HISTORY';
  if (yearlyValues.length < 2) return 'LIMITED HISTORY';

  const recentTrend = getRecentMaterialTrend(yearlyValues);

  if (recentTrend === 'rising') return 'RISING VALUE';
  if (recentTrend === 'falling') return 'FALLING VALUE';
  if (yearlyValues.length >= 3) return 'ESTABLISHED HISTORY';

  return 'LIMITED HISTORY';
}

function flattenHistoricalEntries(
  documents: readonly HistoricalPricingDocument[]
) {
  const entries: HistoricalPricingEntry[] = [];

  documents.forEach((document) => {
    const rows = document.preview?.rows ?? document.rows ?? [];

    rows.forEach((row) => {
      const season = getRowSeason(row, document);
      const playerName = getRowName(row);
      const position = getRowPosition(row);
      const value = getRowValue(row);

      if (
        season === null ||
        !playerName ||
        !position ||
        value === null ||
        value < 0
      ) {
        return;
      }

      entries.push({
        season,
        playerName,
        normalizedPlayerName: normalizePlayerName(playerName),
        position,
        playerId: normalizeId(row.sleeperPlayerId ?? row.playerId),
        value,
      });
    });
  });

  return entries;
}

function aggregateEntriesBySeason(entries: readonly HistoricalPricingEntry[]) {
  const valuesBySeason = new Map<number, HistoricalPricingEntry[]>();

  entries.forEach((entry) => {
    valuesBySeason.set(entry.season, [
      ...(valuesBySeason.get(entry.season) ?? []),
      entry,
    ]);
  });

  return [...valuesBySeason.entries()]
    .map(([season, seasonEntries]) => {
      const total = seasonEntries.reduce((sum, entry) => sum + entry.value, 0);

      return {
        season,
        value: roundToTenth(total / seasonEntries.length),
        playerCount: new Set(
          seasonEntries.map(
            (entry) => `${entry.normalizedPlayerName}:${entry.position}`
          )
        ).size,
      };
    })
    .sort((a, b) => a.season - b.season);
}

function summarizePricingValues({
  kind,
  selectedPlayerName,
  position,
  currentMarketValue,
  yearlyValues,
  matchMethod,
  exactSeasonsWithData,
  comparablePlayerNames,
  valueBand,
}: {
  kind: HistoricalPricingKind;
  selectedPlayerName: string | null;
  position: string | null;
  currentMarketValue: number | null;
  yearlyValues: HistoricalPricingYearValue[];
  matchMethod: HistoricalPricingMatchMethod;
  exactSeasonsWithData: number;
  comparablePlayerNames: string[];
  valueBand: HistoricalPricingResult['valueBand'];
}): HistoricalPricingResult {
  const values = yearlyValues.map((yearValue) => yearValue.value);
  const recentYearlyValues = yearlyValues.slice(-2);
  const recentValues = recentYearlyValues.map((yearValue) => yearValue.value);
  const average = getAverage(values);
  const mostRecentValue =
    yearlyValues.length > 0
      ? yearlyValues[yearlyValues.length - 1].value
      : null;
  const recentAverage = getAverage(recentValues);
  const premiumDiscountAmount = getCurrentDifference(
    currentMarketValue,
    average
  );

  return {
    kind,
    selectedPlayerName,
    position,
    currentMarketValue,
    yearlyValues,
    seasonsWithData: yearlyValues.length,
    average,
    median: getMedian(values),
    low: values.length > 0 ? roundToTenth(Math.min(...values)) : null,
    high: values.length > 0 ? roundToTenth(Math.max(...values)) : null,
    mostRecentValue,
    recentAverage,
    recentMedian: getMedian(recentValues),
    currentVsMostRecent: getCurrentDifference(
      currentMarketValue,
      mostRecentValue
    ),
    currentVsRecentAverage: getCurrentDifference(
      currentMarketValue,
      recentAverage
    ),
    careerSeasonsCount: yearlyValues.length,
    recentSeasonsCount: recentYearlyValues.length,
    trend: getTrend(yearlyValues),
    historyContextLabel: getHistoryContextLabel({ kind, yearlyValues }),
    premiumDiscountAmount,
    premiumDiscountType: getPremiumDiscountType(premiumDiscountAmount),
    matchMethod,
    exactSeasonsWithData,
    comparablePlayerCount: comparablePlayerNames.length,
    comparablePlayerNames: comparablePlayerNames.slice(0, 6),
    valueBand,
  };
}

function buildEmptyResult({
  selectedPlayerName,
  position,
  currentMarketValue,
  exactSeasonsWithData = 0,
}: {
  selectedPlayerName: string | null;
  position: string | null;
  currentMarketValue: number | null;
  exactSeasonsWithData?: number;
}): HistoricalPricingResult {
  return summarizePricingValues({
    kind: 'none',
    selectedPlayerName,
    position,
    currentMarketValue,
    yearlyValues: [],
    matchMethod: 'none',
    exactSeasonsWithData,
    comparablePlayerNames: [],
    valueBand: null,
  });
}

function getComparablePlayerNames(entries: readonly HistoricalPricingEntry[]) {
  const namesByPlayer = new Map<string, string>();

  entries.forEach((entry) => {
    namesByPlayer.set(
      `${entry.normalizedPlayerName}:${entry.position}`,
      entry.playerName
    );
  });

  return [...namesByPlayer.values()].sort((a, b) => a.localeCompare(b));
}

export function calculateHistoricalPricing({
  selectedPlayer,
  currentMarketValue,
  historicalDocuments,
}: {
  selectedPlayer: HistoricalPricingSelectedPlayer | null;
  currentMarketValue: number | null;
  historicalDocuments: readonly HistoricalPricingDocument[];
}): HistoricalPricingResult {
  const selectedPlayerName =
    selectedPlayer?.playerName ??
    selectedPlayer?.originalPlayerName ??
    selectedPlayer?.matchedSleeperName ??
    null;
  const position = normalizePosition(selectedPlayer?.position);
  const normalizedSelectedPlayerName = normalizePlayerName(selectedPlayerName);
  const selectedPlayerId = normalizeId(
    selectedPlayer?.sleeperPlayerId ?? selectedPlayer?.playerId
  );
  const safeCurrentMarketValue = toFiniteNumber(currentMarketValue);

  if (!selectedPlayer || !selectedPlayerName || !position) {
    return buildEmptyResult({
      selectedPlayerName,
      position: position || null,
      currentMarketValue: safeCurrentMarketValue,
    });
  }

  const entries = flattenHistoricalEntries(historicalDocuments);
  const exactIdEntries = selectedPlayerId
    ? entries.filter(
        (entry) => entry.playerId && entry.playerId === selectedPlayerId
      )
    : [];
  const exactNameEntries = entries.filter(
    (entry) =>
      entry.normalizedPlayerName === normalizedSelectedPlayerName &&
      entry.position === position
  );
  const exactEntries =
    exactIdEntries.length > 0 ? exactIdEntries : exactNameEntries;
  const exactYearlyValues = aggregateEntriesBySeason(exactEntries);

  if (exactYearlyValues.length >= minimumExactSeasons) {
    return summarizePricingValues({
      kind: 'exact-history',
      selectedPlayerName,
      position,
      currentMarketValue: safeCurrentMarketValue,
      yearlyValues: exactYearlyValues,
      matchMethod: exactIdEntries.length > 0 ? 'sleeper-id' : 'name-position',
      exactSeasonsWithData: exactYearlyValues.length,
      comparablePlayerNames: [],
      valueBand: null,
    });
  }

  const comparableCenter =
    safeCurrentMarketValue ?? exactYearlyValues[0]?.value ?? null;

  if (comparableCenter === null) {
    return buildEmptyResult({
      selectedPlayerName,
      position,
      currentMarketValue: safeCurrentMarketValue,
      exactSeasonsWithData: exactYearlyValues.length,
    });
  }

  const bandWidth = Math.max(5, comparableCenter * 0.15);
  const valueBand = {
    low: roundToTenth(comparableCenter - bandWidth),
    high: roundToTenth(comparableCenter + bandWidth),
    center: roundToTenth(comparableCenter),
  };
  const comparableEntries = entries.filter(
    (entry) =>
      entry.position === position &&
      entry.normalizedPlayerName !== normalizedSelectedPlayerName &&
      entry.value >= valueBand.low &&
      entry.value <= valueBand.high
  );
  const comparableYearlyValues = aggregateEntriesBySeason(comparableEntries);

  if (comparableYearlyValues.length === 0) {
    return buildEmptyResult({
      selectedPlayerName,
      position,
      currentMarketValue: safeCurrentMarketValue,
      exactSeasonsWithData: exactYearlyValues.length,
    });
  }

  return summarizePricingValues({
    kind: 'comparable-history',
    selectedPlayerName,
    position,
    currentMarketValue: safeCurrentMarketValue,
    yearlyValues: comparableYearlyValues,
    matchMethod: 'comparable-position-band',
    exactSeasonsWithData: exactYearlyValues.length,
    comparablePlayerNames: getComparablePlayerNames(comparableEntries),
    valueBand,
  });
}
