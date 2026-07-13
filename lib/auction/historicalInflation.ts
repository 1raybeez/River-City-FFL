export type HistoricalInflationPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

export type HistoricalInflationResult = 'bargain' | 'fair' | 'overpay' | 'unknown';

export type HistoricalInflationTrend =
  | 'rising'
  | 'falling'
  | 'stable'
  | 'mixed'
  | 'insufficient';

export type HistoricalInflationLiveContext =
  | 'hotter-than-normal'
  | 'colder-than-normal'
  | 'near-normal'
  | 'insufficient-live-sample';

export type HistoricalInflationMasterviewRow = {
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

export type HistoricalInflationMasterviewDocument = {
  season?: number | string | null;
  seasonYear?: number | string | null;
  rows?: readonly HistoricalInflationMasterviewRow[] | null;
  preview?: {
    rows?: readonly HistoricalInflationMasterviewRow[] | null;
  } | null;
};

export type HistoricalInflationSleeperRow = {
  season?: number | string | null;
  pickNumber?: number | string | null;
  playerId?: string | number | null;
  playerName?: string | null;
  position?: string | null;
  salePrice?: number | string | null;
  isKeeper?: boolean | null;
};

export type HistoricalInflationSleeperDocument = {
  season?: number | string | null;
  rows?: readonly HistoricalInflationSleeperRow[] | null;
};

export type HistoricalInflationLivePurchase = {
  position?: string | null;
  purchasePrice?: number | string | null;
  expectedValue?: number | string | null;
  status?: string | null;
};

export type HistoricalInflationMarketHeat = {
  position?: string | null;
  expectedTotal?: number | string | null;
  actualSpent?: number | string | null;
  inflationPercent?: number | string | null;
};

export type HistoricalInflationPlayerImpact = {
  playerName: string;
  season: number;
  position: HistoricalInflationPosition;
  expectedValue: number;
  actualSalePrice: number;
  difference: number;
  differencePercent: number | null;
};

export type HistoricalInflationPositionSeason = {
  season: number;
  position: HistoricalInflationPosition;
  matchedOpenMarketPurchases: number;
  keeperPurchases: number;
  averageExpectedValue: number | null;
  averageActualSalePrice: number | null;
  averageDollarDifference: number | null;
  weightedInflationPercentage: number | null;
  medianIndividualPercentageDifference: number | null;
  bargainCount: number;
  fairCount: number;
  overpayCount: number;
  highestOverpayPlayer: HistoricalInflationPlayerImpact | null;
  largestBargainPlayer: HistoricalInflationPlayerImpact | null;
};

export type HistoricalInflationSeason = {
  season: number;
  matchedPurchases: number;
  openMarketPurchases: number;
  keeperPurchases: number;
  unmatchedPurchases: number;
  ambiguousPurchases: number;
  positions: HistoricalInflationPositionSeason[];
};

export type HistoricalInflationLivePositionContext = {
  historicalInflation: number | null;
  recentHistoricalInflation: number | null;
  currentLiveInflation: number | null;
  differenceFromHistorical: number | null;
  currentLivePurchaseCount: number;
  context: HistoricalInflationLiveContext;
};

export type HistoricalInflationPositionSummary = {
  position: HistoricalInflationPosition;
  seasonsAvailable: number;
  matchedPurchaseCount: number;
  averageInflationPercentage: number | null;
  recent2SeasonInflationPercentage: number | null;
  averageDollarDifference: number | null;
  overpayRate: number | null;
  bargainRate: number | null;
  volatility: number | null;
  trend: HistoricalInflationTrend;
  verdict: string;
  liveContext: HistoricalInflationLivePositionContext;
};

export type HistoricalInflationLeagueSummary = {
  seasonsAvailable: number;
  totalMatchedPurchases: number;
  totalOpenMarketPurchases: number;
  totalKeeperPurchases: number;
  overallWeightedInflation: number | null;
  overallAverageDollarDifference: number | null;
  averageOpenMarketSalePrice: number | null;
  overpayPercentage: number | null;
  bargainPercentage: number | null;
  mostHistoricallyInflatedPosition: HistoricalInflationPosition | null;
  mostHistoricallyDiscountedPosition: HistoricalInflationPosition | null;
  mostVolatilePosition: HistoricalInflationPosition | null;
  biggestHistoricalOverpay: HistoricalInflationPlayerImpact | null;
  biggestHistoricalBargain: HistoricalInflationPlayerImpact | null;
  averageHighestPurchasePerSeason: number | null;
  averageTop3PurchasesPerSeason: number | null;
  averageMoneySpentPerDraftedPlayer: number | null;
  leagueDnaFacts: string[];
};

export type HistoricalInflationResultSet = {
  seasons: HistoricalInflationSeason[];
  positions: HistoricalInflationPositionSummary[];
  leagueSummary: HistoricalInflationLeagueSummary;
  draftTrends: string[];
  warnings: string[];
};

type ExpectedEntry = {
  season: number;
  playerName: string;
  normalizedPlayerName: string;
  position: HistoricalInflationPosition;
  playerId: string;
  expectedValue: number;
};

type ActualEntry = {
  season: number;
  playerName: string;
  normalizedPlayerName: string;
  position: HistoricalInflationPosition;
  playerId: string;
  actualSalePrice: number;
  pickNumber: number | null;
  isKeeper: boolean | null;
};

type MatchedPurchase = {
  season: number;
  playerName: string;
  position: HistoricalInflationPosition;
  expectedValue: number;
  actualSalePrice: number;
  difference: number;
  differencePercent: number | null;
  result: HistoricalInflationResult;
  isKeeper: boolean | null;
};

type SeasonMatchStats = {
  unmatchedPurchases: number;
  ambiguousPurchases: number;
};

const historicalInflationPositions: readonly HistoricalInflationPosition[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'K',
  'DEF',
];

function isHistoricalInflationPosition(
  value: string
): value is HistoricalInflationPosition {
  return historicalInflationPositions.includes(
    value as HistoricalInflationPosition
  );
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

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value).trim();
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
  row: HistoricalInflationMasterviewRow,
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
  row: HistoricalInflationMasterviewRow,
  document: HistoricalInflationMasterviewDocument
) {
  return (
    toFiniteNumber(row.seasonYear) ??
    toFiniteNumber(row.season) ??
    toFiniteNumber(document.seasonYear) ??
    toFiniteNumber(document.season)
  );
}

function getActualDocumentSeason(
  row: HistoricalInflationSleeperRow,
  document: HistoricalInflationSleeperDocument
) {
  return toFiniteNumber(row.season) ?? toFiniteNumber(document.season);
}

function getExpectedPlayerName(row: HistoricalInflationMasterviewRow) {
  const name =
    row.playerName ??
    row.originalPlayerName ??
    row.name ??
    readOriginalValue(row, ['Name', 'Player', 'Player Name']);

  return typeof name === 'string' ? name.trim() : '';
}

function getExpectedPosition(row: HistoricalInflationMasterviewRow) {
  const position = row.position ?? readOriginalValue(row, ['Pos', 'Position']);
  return typeof position === 'string' ? normalizePosition(position) : '';
}

function getExpectedValue(row: HistoricalInflationMasterviewRow) {
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

function getMedian(values: readonly number[]) {
  if (values.length === 0) return null;

  const sortedValues = [...values].sort((first, second) => first - second);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) {
    return roundToTenth(sortedValues[midpoint]);
  }

  return roundToTenth((sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2);
}

function getStandardDeviation(values: readonly number[]) {
  if (values.length < 2) return null;

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    values.length;

  return roundToTenth(Math.sqrt(variance));
}

function flattenExpectedEntries(
  documents: readonly HistoricalInflationMasterviewDocument[]
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
        !isHistoricalInflationPosition(position) ||
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
  documents: readonly HistoricalInflationSleeperDocument[]
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
        !isHistoricalInflationPosition(position) ||
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
        pickNumber: toFiniteNumber(row.pickNumber),
        isKeeper: row.isKeeper ?? null,
      });
    });
  });

  return entries;
}

function findExpectedEntryForActual({
  actual,
  expectedEntries,
}: {
  actual: ActualEntry;
  expectedEntries: readonly ExpectedEntry[];
}) {
  const sameSeasonEntries = expectedEntries.filter(
    (entry) => entry.season === actual.season
  );
  const idMatches = actual.playerId
    ? sameSeasonEntries.filter(
        (entry) => entry.playerId && entry.playerId === actual.playerId
      )
    : [];

  if (idMatches.length === 1) return { entry: idMatches[0], ambiguous: false };
  if (idMatches.length > 1) return { entry: null, ambiguous: true };

  const nameMatches = sameSeasonEntries.filter(
    (entry) =>
      entry.normalizedPlayerName === actual.normalizedPlayerName &&
      entry.position === actual.position
  );

  if (nameMatches.length === 1) return { entry: nameMatches[0], ambiguous: false };
  if (nameMatches.length > 1) return { entry: null, ambiguous: true };

  return { entry: null, ambiguous: false };
}

function getPurchaseResult({
  actualSalePrice,
  expectedValue,
}: {
  actualSalePrice: number;
  expectedValue: number;
}): HistoricalInflationResult {
  if (expectedValue <= 0) return 'unknown';

  const ratio = (actualSalePrice - expectedValue) / expectedValue;

  if (ratio <= -0.1) return 'bargain';
  if (ratio >= 0.1) return 'overpay';
  return 'fair';
}

function buildMatchedPurchases({
  expectedEntries,
  actualEntries,
}: {
  expectedEntries: readonly ExpectedEntry[];
  actualEntries: readonly ActualEntry[];
}) {
  const matchedPurchases: MatchedPurchase[] = [];
  const statsBySeason = new Map<number, SeasonMatchStats>();

  actualEntries.forEach((actual) => {
    const stats = statsBySeason.get(actual.season) ?? {
      unmatchedPurchases: 0,
      ambiguousPurchases: 0,
    };
    const match = findExpectedEntryForActual({ actual, expectedEntries });

    if (!match.entry) {
      if (match.ambiguous) {
        stats.ambiguousPurchases += 1;
      } else {
        stats.unmatchedPurchases += 1;
      }

      statsBySeason.set(actual.season, stats);
      return;
    }

    const difference = roundToTenth(
      actual.actualSalePrice - match.entry.expectedValue
    );
    const differencePercent =
      match.entry.expectedValue > 0
        ? roundRatio(difference / match.entry.expectedValue)
        : null;

    matchedPurchases.push({
      season: actual.season,
      playerName: actual.playerName,
      position: actual.position,
      expectedValue: roundToTenth(match.entry.expectedValue),
      actualSalePrice: roundToTenth(actual.actualSalePrice),
      difference,
      differencePercent,
      result: getPurchaseResult({
        actualSalePrice: actual.actualSalePrice,
        expectedValue: match.entry.expectedValue,
      }),
      isKeeper: actual.isKeeper,
    });
    statsBySeason.set(actual.season, stats);
  });

  return { matchedPurchases, statsBySeason };
}

function getWeightedInflationPercentage(
  purchases: readonly Pick<MatchedPurchase, 'expectedValue' | 'actualSalePrice'>[]
) {
  const percentagePurchases = purchases.filter(
    (purchase) => purchase.expectedValue > 0
  );
  const expectedTotal = percentagePurchases.reduce(
    (sum, purchase) => sum + purchase.expectedValue,
    0
  );

  if (expectedTotal <= 0) return null;

  const actualTotal = percentagePurchases.reduce(
    (sum, purchase) => sum + purchase.actualSalePrice,
    0
  );

  return roundToTenth(((actualTotal - expectedTotal) / expectedTotal) * 100);
}

function getHighestOverpay(
  purchases: readonly MatchedPurchase[]
): HistoricalInflationPlayerImpact | null {
  const overpays = purchases.filter((purchase) => purchase.difference > 0);
  if (overpays.length === 0) return null;

  const purchase = [...overpays].sort(
    (first, second) => second.difference - first.difference
  )[0];

  return {
    playerName: purchase.playerName,
    season: purchase.season,
    position: purchase.position,
    expectedValue: purchase.expectedValue,
    actualSalePrice: purchase.actualSalePrice,
    difference: purchase.difference,
    differencePercent: purchase.differencePercent,
  };
}

function getLargestBargain(
  purchases: readonly MatchedPurchase[]
): HistoricalInflationPlayerImpact | null {
  const bargains = purchases.filter((purchase) => purchase.difference < 0);
  if (bargains.length === 0) return null;

  const purchase = [...bargains].sort(
    (first, second) => first.difference - second.difference
  )[0];

  return {
    playerName: purchase.playerName,
    season: purchase.season,
    position: purchase.position,
    expectedValue: purchase.expectedValue,
    actualSalePrice: purchase.actualSalePrice,
    difference: purchase.difference,
    differencePercent: purchase.differencePercent,
  };
}

function summarizePositionSeason({
  season,
  position,
  matchedPurchases,
}: {
  season: number;
  position: HistoricalInflationPosition;
  matchedPurchases: readonly MatchedPurchase[];
}): HistoricalInflationPositionSeason {
  const positionPurchases = matchedPurchases.filter(
    (purchase) => purchase.season === season && purchase.position === position
  );
  const openMarketPurchases = positionPurchases.filter(
    (purchase) => purchase.isKeeper !== true
  );
  const percentageDifferences = openMarketPurchases
    .map((purchase) =>
      purchase.differencePercent === null
        ? null
        : purchase.differencePercent * 100
    )
    .filter((difference): difference is number => difference !== null);

  return {
    season,
    position,
    matchedOpenMarketPurchases: openMarketPurchases.length,
    keeperPurchases: positionPurchases.length - openMarketPurchases.length,
    averageExpectedValue: getAverage(
      openMarketPurchases.map((purchase) => purchase.expectedValue)
    ),
    averageActualSalePrice: getAverage(
      openMarketPurchases.map((purchase) => purchase.actualSalePrice)
    ),
    averageDollarDifference: getAverage(
      openMarketPurchases.map((purchase) => purchase.difference)
    ),
    weightedInflationPercentage:
      getWeightedInflationPercentage(openMarketPurchases),
    medianIndividualPercentageDifference: getMedian(percentageDifferences),
    bargainCount: openMarketPurchases.filter(
      (purchase) => purchase.result === 'bargain'
    ).length,
    fairCount: openMarketPurchases.filter((purchase) => purchase.result === 'fair')
      .length,
    overpayCount: openMarketPurchases.filter(
      (purchase) => purchase.result === 'overpay'
    ).length,
    highestOverpayPlayer: getHighestOverpay(openMarketPurchases),
    largestBargainPlayer: getLargestBargain(openMarketPurchases),
  };
}

function summarizeSeasons({
  seasons,
  matchedPurchases,
  statsBySeason,
}: {
  seasons: readonly number[];
  matchedPurchases: readonly MatchedPurchase[];
  statsBySeason: Map<number, SeasonMatchStats>;
}) {
  return seasons.map<HistoricalInflationSeason>((season) => {
    const seasonPurchases = matchedPurchases.filter(
      (purchase) => purchase.season === season
    );
    const openMarketPurchases = seasonPurchases.filter(
      (purchase) => purchase.isKeeper !== true
    );
    const stats = statsBySeason.get(season) ?? {
      unmatchedPurchases: 0,
      ambiguousPurchases: 0,
    };

    return {
      season,
      matchedPurchases: seasonPurchases.length,
      openMarketPurchases: openMarketPurchases.length,
      keeperPurchases: seasonPurchases.length - openMarketPurchases.length,
      unmatchedPurchases: stats.unmatchedPurchases,
      ambiguousPurchases: stats.ambiguousPurchases,
      positions: historicalInflationPositions.map((position) =>
        summarizePositionSeason({ season, position, matchedPurchases })
      ),
    };
  });
}

function getTrend(values: readonly number[]): HistoricalInflationTrend {
  if (values.length < 2) return 'insufficient';

  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const difference = lastValue - firstValue;
  const valueRange = Math.max(...values) - Math.min(...values);

  if (Math.abs(difference) <= 5 && valueRange <= 12) return 'stable';
  if (difference >= 5) return 'rising';
  if (difference <= -5) return 'falling';
  return 'mixed';
}

function getRate({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}) {
  return denominator > 0 ? roundRatio(numerator / denominator) : null;
}

function getLiveInflationFromPurchases(
  purchases: readonly HistoricalInflationLivePurchase[],
  position: HistoricalInflationPosition
) {
  const activePurchases = purchases.filter((purchase) => {
    const purchasePosition = normalizePosition(purchase.position);
    return (
      purchase.status !== 'voided' &&
      isHistoricalInflationPosition(purchasePosition) &&
      purchasePosition === position
    );
  });
  const expectedTotal = activePurchases.reduce(
    (sum, purchase) => sum + (toFiniteNumber(purchase.expectedValue) ?? 0),
    0
  );
  const actualTotal = activePurchases.reduce(
    (sum, purchase) => sum + (toFiniteNumber(purchase.purchasePrice) ?? 0),
    0
  );

  return {
    purchaseCount: activePurchases.length,
    inflationPercent:
      expectedTotal > 0
        ? roundToTenth(((actualTotal - expectedTotal) / expectedTotal) * 100)
        : null,
  };
}

function getMarketHeatInflation(
  marketHeatRows: readonly HistoricalInflationMarketHeat[],
  position: HistoricalInflationPosition
) {
  const row = marketHeatRows.find((heatRow) => {
    const heatPosition = normalizePosition(heatRow.position);
    return (
      isHistoricalInflationPosition(heatPosition) && heatPosition === position
    );
  });

  return row ? toFiniteNumber(row.inflationPercent) : null;
}

function getLiveContext({
  historicalInflation,
  recentHistoricalInflation,
  currentLiveInflation,
  currentLivePurchaseCount,
}: {
  historicalInflation: number | null;
  recentHistoricalInflation: number | null;
  currentLiveInflation: number | null;
  currentLivePurchaseCount: number;
}): HistoricalInflationLiveContext {
  if (
    currentLivePurchaseCount < 3 ||
    currentLiveInflation === null ||
    historicalInflation === null
  ) {
    return 'insufficient-live-sample';
  }

  const comparisonBase = recentHistoricalInflation ?? historicalInflation;
  const difference = currentLiveInflation - comparisonBase;

  if (Math.abs(difference) <= 5) return 'near-normal';
  if (difference > 5) return 'hotter-than-normal';
  return 'colder-than-normal';
}

function buildPositionVerdict({
  position,
  matchedPurchaseCount,
  averageInflationPercentage,
  recent2SeasonInflationPercentage,
  trend,
}: {
  position: HistoricalInflationPosition;
  matchedPurchaseCount: number;
  averageInflationPercentage: number | null;
  recent2SeasonInflationPercentage: number | null;
  trend: HistoricalInflationTrend;
}) {
  if (matchedPurchaseCount < 6 || averageInflationPercentage === null) {
    return `${position} pricing is too sparse for a strong conclusion.`;
  }

  if (position === 'K' || position === 'DEF') {
    return `${position} pricing has large percentage swings because small dollar baselines move quickly.`;
  }

  if (
    recent2SeasonInflationPercentage !== null &&
    averageInflationPercentage !== null &&
    recent2SeasonInflationPercentage - averageInflationPercentage >= 8
  ) {
    return `Recent ${position} prices are rising faster than their historical average.`;
  }

  if (trend === 'rising') {
    return `${position} prices have been trending hotter in River City.`;
  }

  if (trend === 'falling') {
    return `${position} prices have cooled compared with earlier seasons.`;
  }

  if (averageInflationPercentage >= 10) {
    return `River City usually overpays for ${position}.`;
  }

  if (averageInflationPercentage <= -10) {
    return `${position} has generally sold below expected value.`;
  }

  return `${position} generally sells near expected value.`;
}

function summarizePositions({
  seasons,
  matchedPurchases,
  currentLivePurchases,
  currentMarketHeat,
}: {
  seasons: readonly HistoricalInflationSeason[];
  matchedPurchases: readonly MatchedPurchase[];
  currentLivePurchases: readonly HistoricalInflationLivePurchase[];
  currentMarketHeat: readonly HistoricalInflationMarketHeat[];
}) {
  return historicalInflationPositions.map<HistoricalInflationPositionSummary>(
    (position) => {
      const positionPurchases = matchedPurchases.filter(
        (purchase) =>
          purchase.position === position && purchase.isKeeper !== true
      );
      const positionSeasonSummaries = seasons
        .map((season) =>
          season.positions.find(
            (positionSeason) => positionSeason.position === position
          )
        )
        .filter(
          (positionSeason): positionSeason is HistoricalInflationPositionSeason =>
            positionSeason !== undefined
        )
        .filter(
          (positionSeason) => positionSeason.matchedOpenMarketPurchases > 0
        );
      const seasonInflationValues = positionSeasonSummaries
        .map((positionSeason) => positionSeason.weightedInflationPercentage)
        .filter((value): value is number => value !== null);
      const recentSeasonInflationValues = seasonInflationValues.slice(-2);
      const averageInflationPercentage = getAverage(seasonInflationValues);
      const recent2SeasonInflationPercentage = getAverage(
        recentSeasonInflationValues
      );
      const overpayCount = positionPurchases.filter(
        (purchase) => purchase.result === 'overpay'
      ).length;
      const bargainCount = positionPurchases.filter(
        (purchase) => purchase.result === 'bargain'
      ).length;
      const liveFromPurchases = getLiveInflationFromPurchases(
        currentLivePurchases,
        position
      );
      const marketHeatInflation = getMarketHeatInflation(
        currentMarketHeat,
        position
      );
      const currentLiveInflation =
        liveFromPurchases.inflationPercent ?? marketHeatInflation;
      const comparisonBase =
        recent2SeasonInflationPercentage ?? averageInflationPercentage;
      const differenceFromHistorical =
        currentLiveInflation !== null && comparisonBase !== null
          ? roundToTenth(currentLiveInflation - comparisonBase)
          : null;
      const trend = getTrend(seasonInflationValues);

      return {
        position,
        seasonsAvailable: positionSeasonSummaries.length,
        matchedPurchaseCount: positionPurchases.length,
        averageInflationPercentage,
        recent2SeasonInflationPercentage,
        averageDollarDifference: getAverage(
          positionPurchases.map((purchase) => purchase.difference)
        ),
        overpayRate: getRate({
          numerator: overpayCount,
          denominator: positionPurchases.length,
        }),
        bargainRate: getRate({
          numerator: bargainCount,
          denominator: positionPurchases.length,
        }),
        volatility: getStandardDeviation(seasonInflationValues),
        trend,
        verdict: buildPositionVerdict({
          position,
          matchedPurchaseCount: positionPurchases.length,
          averageInflationPercentage,
          recent2SeasonInflationPercentage,
          trend,
        }),
        liveContext: {
          historicalInflation: averageInflationPercentage,
          recentHistoricalInflation: recent2SeasonInflationPercentage,
          currentLiveInflation,
          differenceFromHistorical,
          currentLivePurchaseCount: liveFromPurchases.purchaseCount,
          context: getLiveContext({
            historicalInflation: averageInflationPercentage,
            recentHistoricalInflation: recent2SeasonInflationPercentage,
            currentLiveInflation,
            currentLivePurchaseCount: liveFromPurchases.purchaseCount,
          }),
        },
      };
    }
  );
}

function getBestPositionByValue(
  positions: readonly HistoricalInflationPositionSummary[],
  valueGetter: (position: HistoricalInflationPositionSummary) => number | null,
  direction: 'highest' | 'lowest'
) {
  const valuedPositions = positions
    .map((position) => ({
      position: position.position,
      value: valueGetter(position),
    }))
    .filter((entry): entry is { position: HistoricalInflationPosition; value: number } =>
      entry.value !== null
    );

  if (valuedPositions.length === 0) return null;

  return [...valuedPositions].sort((first, second) =>
    direction === 'highest' ? second.value - first.value : first.value - second.value
  )[0].position;
}

function averageTopPurchasesBySeason({
  purchases,
  count,
}: {
  purchases: readonly MatchedPurchase[];
  count: number;
}) {
  const purchasesBySeason = new Map<number, MatchedPurchase[]>();

  purchases.forEach((purchase) => {
    purchasesBySeason.set(purchase.season, [
      ...(purchasesBySeason.get(purchase.season) ?? []),
      purchase,
    ]);
  });

  const seasonAverages = [...purchasesBySeason.values()].flatMap(
    (seasonPurchases) => {
      const topPurchases = [...seasonPurchases]
        .sort((first, second) => second.actualSalePrice - first.actualSalePrice)
        .slice(0, count);

      return topPurchases.length > 0
        ? [topPurchases.reduce((sum, purchase) => sum + purchase.actualSalePrice, 0) / topPurchases.length]
        : [];
    }
  );

  return getAverage(seasonAverages);
}

function buildLeagueDnaFacts({
  positions,
  overallWeightedInflation,
  overpayPercentage,
  bargainPercentage,
  mostHistoricallyInflatedPosition,
  mostHistoricallyDiscountedPosition,
  mostVolatilePosition,
}: {
  positions: readonly HistoricalInflationPositionSummary[];
  overallWeightedInflation: number | null;
  overpayPercentage: number | null;
  bargainPercentage: number | null;
  mostHistoricallyInflatedPosition: HistoricalInflationPosition | null;
  mostHistoricallyDiscountedPosition: HistoricalInflationPosition | null;
  mostVolatilePosition: HistoricalInflationPosition | null;
}) {
  const facts: string[] = [];
  const inflatedPosition = positions.find(
    (position) => position.position === mostHistoricallyInflatedPosition
  );
  const discountedPosition = positions.find(
    (position) => position.position === mostHistoricallyDiscountedPosition
  );

  if (
    inflatedPosition &&
    inflatedPosition.averageInflationPercentage !== null &&
    inflatedPosition.averageInflationPercentage > 3
  ) {
    facts.push(
      inflatedPosition.position === 'K' || inflatedPosition.position === 'DEF'
        ? `${inflatedPosition.position} has the highest percentage inflation, helped by low-dollar baselines.`
        : `${inflatedPosition.position} has been River City's most inflated position since 2021.`
    );
  }

  if (
    discountedPosition &&
    discountedPosition.averageInflationPercentage !== null &&
    discountedPosition.averageInflationPercentage < -3
  ) {
    facts.push(
      `${discountedPosition.position} has been River City's most discounted position against Masterview.`
    );
  }

  if (
    overpayPercentage !== null &&
    bargainPercentage !== null &&
    overpayPercentage - bargainPercentage >= 0.05
  ) {
    facts.push('The league overpays more often than it finds 10% bargains.');
  } else if (
    overpayPercentage !== null &&
    bargainPercentage !== null &&
    bargainPercentage - overpayPercentage >= 0.05
  ) {
    facts.push('The league finds 10% bargains more often than it overpays.');
  }

  if (mostVolatilePosition) {
    facts.push(`${mostVolatilePosition} spending is the most volatile year to year.`);
  }

  if (overallWeightedInflation !== null) {
    if (overallWeightedInflation >= 5) {
      facts.push('Open-market prices have finished above Masterview expectations overall.');
    } else if (overallWeightedInflation <= -5) {
      facts.push('Open-market prices have finished below Masterview expectations overall.');
    } else {
      facts.push('Open-market prices have stayed close to Masterview expectations overall.');
    }
  }

  const closestPosition = positions
    .filter((position) => position.averageInflationPercentage !== null)
    .sort(
      (first, second) =>
        Math.abs(first.averageInflationPercentage ?? 0) -
        Math.abs(second.averageInflationPercentage ?? 0)
    )[0];

  if (closestPosition) {
    facts.push(
      `${closestPosition.position} pricing has stayed closest to preseason expectations.`
    );
  }

  return facts.slice(0, 6);
}

function summarizeLeague({
  seasons,
  positions,
  matchedPurchases,
}: {
  seasons: readonly HistoricalInflationSeason[];
  positions: readonly HistoricalInflationPositionSummary[];
  matchedPurchases: readonly MatchedPurchase[];
}): HistoricalInflationLeagueSummary {
  const openMarketPurchases = matchedPurchases.filter(
    (purchase) => purchase.isKeeper !== true
  );
  const percentagePurchases = openMarketPurchases.filter(
    (purchase) => purchase.expectedValue > 0
  );
  const expectedTotal = percentagePurchases.reduce(
    (sum, purchase) => sum + purchase.expectedValue,
    0
  );
  const actualTotal = percentagePurchases.reduce(
    (sum, purchase) => sum + purchase.actualSalePrice,
    0
  );
  const overallWeightedInflation =
    expectedTotal > 0
      ? roundToTenth(((actualTotal - expectedTotal) / expectedTotal) * 100)
      : null;
  const overpayCount = openMarketPurchases.filter(
    (purchase) => purchase.result === 'overpay'
  ).length;
  const bargainCount = openMarketPurchases.filter(
    (purchase) => purchase.result === 'bargain'
  ).length;
  const mostHistoricallyInflatedPosition = getBestPositionByValue(
    positions,
    (position) => position.averageInflationPercentage,
    'highest'
  );
  const mostHistoricallyDiscountedPosition = getBestPositionByValue(
    positions,
    (position) => position.averageInflationPercentage,
    'lowest'
  );
  const mostVolatilePosition = getBestPositionByValue(
    positions,
    (position) => position.volatility,
    'highest'
  );
  const leagueDnaFacts = buildLeagueDnaFacts({
    positions,
    overallWeightedInflation,
    overpayPercentage: getRate({
      numerator: overpayCount,
      denominator: openMarketPurchases.length,
    }),
    bargainPercentage: getRate({
      numerator: bargainCount,
      denominator: openMarketPurchases.length,
    }),
    mostHistoricallyInflatedPosition,
    mostHistoricallyDiscountedPosition,
    mostVolatilePosition,
  });

  return {
    seasonsAvailable: seasons.filter((season) => season.openMarketPurchases > 0)
      .length,
    totalMatchedPurchases: matchedPurchases.length,
    totalOpenMarketPurchases: openMarketPurchases.length,
    totalKeeperPurchases: matchedPurchases.length - openMarketPurchases.length,
    overallWeightedInflation,
    overallAverageDollarDifference: getAverage(
      openMarketPurchases.map((purchase) => purchase.difference)
    ),
    averageOpenMarketSalePrice: getAverage(
      openMarketPurchases.map((purchase) => purchase.actualSalePrice)
    ),
    overpayPercentage: getRate({
      numerator: overpayCount,
      denominator: openMarketPurchases.length,
    }),
    bargainPercentage: getRate({
      numerator: bargainCount,
      denominator: openMarketPurchases.length,
    }),
    mostHistoricallyInflatedPosition,
    mostHistoricallyDiscountedPosition,
    mostVolatilePosition,
    biggestHistoricalOverpay: getHighestOverpay(openMarketPurchases),
    biggestHistoricalBargain: getLargestBargain(openMarketPurchases),
    averageHighestPurchasePerSeason: averageTopPurchasesBySeason({
      purchases: openMarketPurchases,
      count: 1,
    }),
    averageTop3PurchasesPerSeason: averageTopPurchasesBySeason({
      purchases: openMarketPurchases,
      count: 3,
    }),
    averageMoneySpentPerDraftedPlayer: getAverage(
      openMarketPurchases.map((purchase) => purchase.actualSalePrice)
    ),
    leagueDnaFacts,
  };
}

function buildWarnings({
  seasons,
  matchedPurchases,
}: {
  seasons: readonly HistoricalInflationSeason[];
  matchedPurchases: readonly MatchedPurchase[];
}) {
  const warnings: string[] = [];
  const totalUnmatched = seasons.reduce(
    (sum, season) => sum + season.unmatchedPurchases,
    0
  );
  const totalAmbiguous = seasons.reduce(
    (sum, season) => sum + season.ambiguousPurchases,
    0
  );
  const keeperCount = matchedPurchases.filter(
    (purchase) => purchase.isKeeper === true
  ).length;

  seasons.forEach((season) => {
    if (season.unmatchedPurchases > 0) {
      warnings.push(
        `${season.season}: ${season.unmatchedPurchases} Sleeper purchases were excluded because no Masterview match was found.`
      );
    }

    if (season.ambiguousPurchases > 0) {
      warnings.push(
        `${season.season}: ${season.ambiguousPurchases} Sleeper purchases were excluded because the Masterview match was ambiguous.`
      );
    }
  });

  if (keeperCount > 0) {
    warnings.push(
      `${keeperCount} keeper purchase${keeperCount === 1 ? '' : 's'} kept in coverage counts and excluded from open-market inflation averages.`
    );
  }

  if (totalUnmatched === 0 && totalAmbiguous === 0 && keeperCount === 0) {
    warnings.push('No historical inflation validation warnings.');
  }

  return warnings;
}

export function calculateHistoricalInflation({
  masterviewDocuments,
  sleeperAuctionDocuments,
  currentLivePurchases = [],
  currentMarketHeat = [],
}: {
  masterviewDocuments: readonly HistoricalInflationMasterviewDocument[];
  sleeperAuctionDocuments: readonly HistoricalInflationSleeperDocument[];
  currentLivePurchases?: readonly HistoricalInflationLivePurchase[];
  currentMarketHeat?: readonly HistoricalInflationMarketHeat[];
}): HistoricalInflationResultSet {
  const expectedEntries = flattenExpectedEntries(masterviewDocuments);
  const actualEntries = flattenActualEntries(sleeperAuctionDocuments);
  const seasonsToCompare = Array.from(
    new Set([
      ...expectedEntries.map((entry) => entry.season),
      ...actualEntries.map((entry) => entry.season),
    ])
  ).sort((firstSeason, secondSeason) => firstSeason - secondSeason);
  const { matchedPurchases, statsBySeason } = buildMatchedPurchases({
    expectedEntries,
    actualEntries,
  });
  const seasons = summarizeSeasons({
    seasons: seasonsToCompare,
    matchedPurchases,
    statsBySeason,
  });
  const positions = summarizePositions({
    seasons,
    matchedPurchases,
    currentLivePurchases,
    currentMarketHeat,
  });
  const leagueSummary = summarizeLeague({
    seasons,
    positions,
    matchedPurchases,
  });

  return {
    seasons,
    positions,
    leagueSummary,
    draftTrends: leagueSummary.leagueDnaFacts,
    warnings: buildWarnings({ seasons, matchedPurchases }),
  };
}
