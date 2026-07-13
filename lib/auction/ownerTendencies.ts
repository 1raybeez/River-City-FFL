export type OwnerTendencyPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

export type OwnerTendencyConfidence = 'High' | 'Medium' | 'Low';

export type OwnerTendencyTimingLabel =
  | 'early'
  | 'middle'
  | 'late'
  | 'mixed'
  | 'insufficient';

export type OwnerTendencyRosterStyleLabel =
  | 'Stars and Scrubs'
  | 'Balanced Builder'
  | 'Top-Heavy'
  | 'Value Spreader'
  | 'Mixed / No Clear Pattern'
  | 'Insufficient History';

export type OwnerTendencySleeperRow = {
  season?: number | string | null;
  pickNumber?: number | string | null;
  pickedByUserId?: string | null;
  ownerName?: string | null;
  teamName?: string | null;
  playerName?: string | null;
  position?: string | null;
  nflTeam?: string | null;
  salePrice?: number | string | null;
  isKeeper?: boolean | null;
  ownerMapping?: string | null;
};

export type OwnerTendencySleeperDocument = {
  season?: number | string | null;
  rows?: readonly OwnerTendencySleeperRow[] | null;
};

export type OwnerTendencyCurrentManager = {
  sleeperId?: string | number | null;
  fullName?: string | null;
  shortName?: string | null;
  teamName?: string | null;
  tookOver?: number | null;
  coOwner?: {
    fullName?: string | null;
  } | null;
};

export type OwnerTendencyPurchase = {
  season: number;
  purchaseOrder: number | null;
  playerName: string;
  position: OwnerTendencyPosition;
  nflTeam: string | null;
  salePrice: number;
  isKeeper: boolean;
};

export type OwnerTendencyPositionSpending = {
  position: OwnerTendencyPosition;
  totalDollarsSpent: number;
  averageDollarsPerSeason: number | null;
  percentOfOpenMarketSpend: number | null;
  averagePurchasePrice: number | null;
  highestPurchase: OwnerTendencyPurchase | null;
  averageDraftedPerSeason: number | null;
  averageFirstPurchaseOrder: number | null;
  timingLabel: OwnerTendencyTimingLabel;
  keeperDollarsSpent: number;
};

export type OwnerTendencyPurchaseTiming = {
  averageFirstPurchaseOrder: number | null;
  mostCommonFirstPurchasePosition: OwnerTendencyPosition | null;
  averageFirstByPosition: Record<OwnerTendencyPosition, number | null>;
  averageLargestPurchaseOrder: number | null;
  averageSpendAfterFirst25Percent: number | null;
  averageSpendAfterFirst50Percent: number | null;
  averageSpendAfterFirst75Percent: number | null;
  timingLabel: OwnerTendencyTimingLabel;
};

export type OwnerTendencyRosterStyle = {
  rosterStyleLabel: OwnerTendencyRosterStyleLabel;
  rosterStyleReasons: string[];
  averageTop1SpendShare: number | null;
  averageTop3SpendShare: number | null;
  averageTwentyPlusPurchases: number | null;
  averageFortyPlusPurchases: number | null;
};

export type OwnerTendencyNflTeamPreference = {
  nflTeam: string;
  purchaseCount: number;
  dollarsSpent: number;
  seasonsRepresented: number;
  label: string;
};

export type OwnerTendencyFirstPurchaseSeason = {
  season: number;
  firstPurchase: OwnerTendencyPurchase | null;
  firstThreePurchases: OwnerTendencyPurchase[];
};

export type OwnerTendencyRecentVsCareer = {
  meaningfulShifts: string[];
  recentSeasonCount: number;
};

export type OwnerTendencyProfile = {
  ownerId: string;
  ownerName: string;
  currentManagerName: string | null;
  currentTeamName: string | null;
  seasons: number[];
  seasonCount: number;
  purchaseCount: number;
  keeperCount: number;
  openMarketPurchaseCount: number;
  totalOpenMarketSpend: number;
  totalKeeperSpend: number;
  averageOpenMarketSpend: number | null;
  averageKeeperSpend: number | null;
  averageTotalSpend: number | null;
  averageSpendPerSeason: number | null;
  averageMoneyLeft: number | null;
  budgetReconciliationDifference: number | null;
  medianMoneyLeft: number | null;
  averageTopPurchase: number | null;
  highestPurchase: OwnerTendencyPurchase | null;
  completeBudgetSeasonCount: number;
  incompleteBudgetSeasonCount: number;
  positionSpending: OwnerTendencyPositionSpending[];
  purchaseTiming: OwnerTendencyPurchaseTiming;
  rosterStyle: OwnerTendencyRosterStyle;
  nflTeamPreferences: OwnerTendencyNflTeamPreference[];
  firstPurchases: OwnerTendencyFirstPurchaseSeason[];
  recentVsCareer: OwnerTendencyRecentVsCareer;
  tendencies: string[];
  cautions: string[];
  confidence: OwnerTendencyConfidence;
};

export type OwnerTendencyResult = {
  profiles: OwnerTendencyProfile[];
  defaultOwnerId: string | null;
  skippedRows: number;
  warnings: string[];
};

type OwnerSeason = {
  season: number;
  purchases: OwnerTendencyPurchase[];
  incompleteBudget: boolean;
  moneyLeft: number | null;
  totalSpend: number;
  openMarketSpend: number;
  keeperSpend: number;
};

const auctionBudget = 200;
const positions: readonly OwnerTendencyPosition[] = [
  'QB',
  'RB',
  'WR',
  'TE',
  'K',
  'DEF',
];

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

function isOwnerPosition(value: string): value is OwnerTendencyPosition {
  return positions.includes(value as OwnerTendencyPosition);
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

function getAverageRaw(values: readonly number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function getAverageRatio(values: readonly number[]) {
  return values.length > 0
    ? roundRatio(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function getMedian(values: readonly number[]) {
  if (values.length === 0) return null;

  const sortedValues = [...values].sort((first, second) => first - second);
  const midpoint = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) return roundToTenth(sortedValues[midpoint]);
  return roundToTenth((sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2);
}

function getModePosition(values: readonly OwnerTendencyPosition[]) {
  if (values.length === 0) return null;

  const counts = values.reduce<Map<OwnerTendencyPosition, number>>(
    (positionCounts, position) => {
      positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
      return positionCounts;
    },
    new Map()
  );

  return [...counts.entries()].sort(
    (first, second) => second[1] - first[1] || first[0].localeCompare(second[0])
  )[0][0];
}

function getTimingLabel(
  averagePurchaseOrder: number | null,
  averageSeasonPurchaseCount: number | null
): OwnerTendencyTimingLabel {
  if (averagePurchaseOrder === null || averageSeasonPurchaseCount === null) {
    return 'insufficient';
  }

  if (averagePurchaseOrder <= averageSeasonPurchaseCount * 0.33) return 'early';
  if (averagePurchaseOrder <= averageSeasonPurchaseCount * 0.67) return 'middle';
  return 'late';
}

function flattenPurchases(
  documents: readonly OwnerTendencySleeperDocument[]
) {
  const ownerNames = new Map<string, string>();
  const teamNames = new Map<string, string>();
  const purchasesByOwner = new Map<string, OwnerTendencyPurchase[]>();
  const incompleteBudgetByOwnerSeason = new Set<string>();
  const maxPurchaseOrderBySeason = new Map<number, number>();
  let skippedRows = 0;

  documents.forEach((document) => {
    const rows = document.rows ?? [];

    rows.forEach((row) => {
      const ownerId = normalizeId(row.pickedByUserId);
      const season = toFiniteNumber(row.season) ?? toFiniteNumber(document.season);
      const position = normalizePosition(row.position);
      const salePrice = toFiniteNumber(row.salePrice);
      const playerName = readString(row.playerName);
      const purchaseOrder = toFiniteNumber(row.pickNumber);

      if (season !== null && purchaseOrder !== null) {
        maxPurchaseOrderBySeason.set(
          season,
          Math.max(maxPurchaseOrderBySeason.get(season) ?? 0, purchaseOrder)
        );
      }

      if (!ownerId) {
        skippedRows += 1;
        return;
      }

      if (season === null) {
        skippedRows += 1;
        return;
      }

      const ownerSeasonKey = `${ownerId}:${season}`;

      if (
        !playerName ||
        !isOwnerPosition(position) ||
        salePrice === null ||
        salePrice < 0
      ) {
        incompleteBudgetByOwnerSeason.add(ownerSeasonKey);
        skippedRows += 1;
        return;
      }

      const ownerName = readString(row.ownerName);
      const teamName = readString(row.teamName);
      if (ownerName) ownerNames.set(ownerId, ownerName);
      if (teamName) teamNames.set(ownerId, teamName);

      purchasesByOwner.set(ownerId, [
        ...(purchasesByOwner.get(ownerId) ?? []),
        {
          season,
          purchaseOrder,
          playerName,
          position,
          nflTeam: readString(row.nflTeam),
          salePrice,
          isKeeper: row.isKeeper === true,
        },
      ]);
    });
  });

  return {
    ownerNames,
    teamNames,
    purchasesByOwner,
    incompleteBudgetByOwnerSeason,
    maxPurchaseOrderBySeason,
    skippedRows,
  };
}

function buildOwnerSeasons({
  ownerId,
  purchases,
  incompleteBudgetByOwnerSeason,
}: {
  ownerId: string;
  purchases: readonly OwnerTendencyPurchase[];
  incompleteBudgetByOwnerSeason: Set<string>;
}) {
  const seasons = Array.from(new Set(purchases.map((purchase) => purchase.season)))
    .sort((first, second) => first - second);

  return seasons.map<OwnerSeason>((season) => {
    const seasonPurchases = purchases
      .filter((purchase) => purchase.season === season)
      .sort(
        (first, second) =>
          (first.purchaseOrder ?? Number.MAX_SAFE_INTEGER) -
          (second.purchaseOrder ?? Number.MAX_SAFE_INTEGER)
      );
    const openMarketSpend = seasonPurchases
      .filter((purchase) => !purchase.isKeeper)
      .reduce((sum, purchase) => sum + purchase.salePrice, 0);
    const keeperSpend = seasonPurchases
      .filter((purchase) => purchase.isKeeper)
      .reduce((sum, purchase) => sum + purchase.salePrice, 0);
    const totalSpend = openMarketSpend + keeperSpend;
    const incompleteBudget = incompleteBudgetByOwnerSeason.has(
      `${ownerId}:${season}`
    );
    const moneyLeft = incompleteBudget ? null : roundToTenth(auctionBudget - totalSpend);

    return {
      season,
      purchases: seasonPurchases,
      incompleteBudget,
      moneyLeft,
      totalSpend: roundToTenth(totalSpend),
      openMarketSpend: roundToTenth(openMarketSpend),
      keeperSpend: roundToTenth(keeperSpend),
    };
  });
}

function getHighestPurchase(
  purchases: readonly OwnerTendencyPurchase[]
): OwnerTendencyPurchase | null {
  if (purchases.length === 0) return null;

  return [...purchases].sort(
    (first, second) => second.salePrice - first.salePrice
  )[0];
}

function summarizePositionSpending({
  position,
  seasons,
  totalOpenMarketSpend,
  maxPurchaseOrderBySeason,
}: {
  position: OwnerTendencyPosition;
  seasons: readonly OwnerSeason[];
  totalOpenMarketSpend: number;
  maxPurchaseOrderBySeason: Map<number, number>;
}): OwnerTendencyPositionSpending {
  const allPurchases = seasons.flatMap((season) => season.purchases);
  const openMarketPurchases = allPurchases.filter(
    (purchase) => !purchase.isKeeper && purchase.position === position
  );
  const keeperPurchases = allPurchases.filter(
    (purchase) => purchase.isKeeper && purchase.position === position
  );
  const totalDollarsSpent = roundToTenth(
    openMarketPurchases.reduce((sum, purchase) => sum + purchase.salePrice, 0)
  );
  const firstPurchaseOrderRows = seasons
    .map((season) => {
      const firstPositionPurchase = season.purchases.find(
        (purchase) => !purchase.isKeeper && purchase.position === position
      );
      return firstPositionPurchase?.purchaseOrder === null ||
        firstPositionPurchase?.purchaseOrder === undefined
        ? null
        : {
            season: season.season,
            purchaseOrder: firstPositionPurchase.purchaseOrder,
          };
    })
    .filter(
      (
        row
      ): row is {
        season: number;
        purchaseOrder: number;
      } => row !== null
    );
  const firstPurchaseOrders = firstPurchaseOrderRows.map(
    (row) => row.purchaseOrder
  );
  const averagePurchaseOrderLimit = getAverage(
    firstPurchaseOrderRows.flatMap((row) => {
      const maxPurchaseOrder = maxPurchaseOrderBySeason.get(row.season);
      return maxPurchaseOrder ? [maxPurchaseOrder] : [];
    })
  );
  const seasonCounts = seasons.map(
    (season) =>
      season.purchases.filter(
        (purchase) => !purchase.isKeeper && purchase.position === position
      ).length
  );

  return {
    position,
    totalDollarsSpent,
    averageDollarsPerSeason:
      seasons.length > 0 ? roundToTenth(totalDollarsSpent / seasons.length) : null,
    percentOfOpenMarketSpend:
      totalOpenMarketSpend > 0
        ? roundRatio(totalDollarsSpent / totalOpenMarketSpend)
        : null,
    averagePurchasePrice: getAverage(
      openMarketPurchases.map((purchase) => purchase.salePrice)
    ),
    highestPurchase: getHighestPurchase(openMarketPurchases),
    averageDraftedPerSeason: getAverage(seasonCounts),
    averageFirstPurchaseOrder: getAverage(firstPurchaseOrders),
    timingLabel: getTimingLabel(
      getAverage(firstPurchaseOrders),
      averagePurchaseOrderLimit
    ),
    keeperDollarsSpent: roundToTenth(
      keeperPurchases.reduce((sum, purchase) => sum + purchase.salePrice, 0)
    ),
  };
}

function summarizePurchaseTiming(
  seasons: readonly OwnerSeason[],
  maxPurchaseOrderBySeason: Map<number, number>
): OwnerTendencyPurchaseTiming {
  const openMarketSeasons = seasons.map((season) => ({
    ...season,
    purchases: season.purchases.filter((purchase) => !purchase.isKeeper),
  }));
  const firstPurchases = openMarketSeasons
    .map((season) => season.purchases[0] ?? null)
    .filter((purchase): purchase is OwnerTendencyPurchase => purchase !== null);
  const averagePurchaseOrderLimit = getAverage(
    openMarketSeasons.flatMap((season) => {
      const maxPurchaseOrder = maxPurchaseOrderBySeason.get(season.season);
      return maxPurchaseOrder ? [maxPurchaseOrder] : [];
    })
  );
  const averageFirstPurchaseOrder = getAverage(
    firstPurchases
      .map((purchase) => purchase.purchaseOrder)
      .filter((purchaseOrder): purchaseOrder is number => purchaseOrder !== null)
  );
  const averageFirstByPosition = Object.fromEntries(
    positions.map((position) => {
      const firstPositionOrders = openMarketSeasons
        .map((season) => {
          const purchase = season.purchases.find(
            (seasonPurchase) => seasonPurchase.position === position
          );
          return purchase?.purchaseOrder ?? null;
        })
        .filter((purchaseOrder): purchaseOrder is number => purchaseOrder !== null);

      return [position, getAverage(firstPositionOrders)];
    })
  ) as Record<OwnerTendencyPosition, number | null>;
  const largestPurchaseOrders = openMarketSeasons
    .map((season) => getHighestPurchase(season.purchases)?.purchaseOrder ?? null)
    .filter((purchaseOrder): purchaseOrder is number => purchaseOrder !== null);

  function averageSpendAfter(percent: number) {
    return getAverage(
      openMarketSeasons.map((season) => {
        const maxOrder =
          maxPurchaseOrderBySeason.get(season.season) ??
          Math.max(
            ...season.purchases
              .map((purchase) => purchase.purchaseOrder)
              .filter(
                (purchaseOrder): purchaseOrder is number =>
                  purchaseOrder !== null
              ),
            0
          );
        const threshold = maxOrder * percent;

        return roundToTenth(
          season.purchases
            .filter(
              (purchase) =>
                purchase.purchaseOrder !== null &&
                purchase.purchaseOrder > threshold
            )
            .reduce((sum, purchase) => sum + purchase.salePrice, 0)
        );
      })
    );
  }

  return {
    averageFirstPurchaseOrder,
    mostCommonFirstPurchasePosition: getModePosition(
      firstPurchases.map((purchase) => purchase.position)
    ),
    averageFirstByPosition,
    averageLargestPurchaseOrder: getAverage(largestPurchaseOrders),
    averageSpendAfterFirst25Percent: averageSpendAfter(0.25),
    averageSpendAfterFirst50Percent: averageSpendAfter(0.5),
    averageSpendAfterFirst75Percent: averageSpendAfter(0.75),
    timingLabel: getTimingLabel(
      averageFirstPurchaseOrder,
      averagePurchaseOrderLimit
    ),
  };
}

function summarizeRosterStyle({
  seasons,
  openMarketPurchaseCount,
  totalOpenMarketSpend,
  averageMoneyLeft,
}: {
  seasons: readonly OwnerSeason[];
  openMarketPurchaseCount: number;
  totalOpenMarketSpend: number;
  averageMoneyLeft: number | null;
}): OwnerTendencyRosterStyle {
  const seasonStyleRows = seasons
    .map((season) => {
      const purchases = season.purchases
        .filter((purchase) => !purchase.isKeeper)
        .sort((first, second) => second.salePrice - first.salePrice);
      const spend = purchases.reduce((sum, purchase) => sum + purchase.salePrice, 0);

      return {
        top1Share: spend > 0 ? purchases[0]?.salePrice / spend : null,
        top3Share:
          spend > 0
            ? purchases
                .slice(0, 3)
                .reduce((sum, purchase) => sum + purchase.salePrice, 0) / spend
            : null,
        twentyPlusCount: purchases.filter((purchase) => purchase.salePrice >= 20)
          .length,
        fortyPlusCount: purchases.filter((purchase) => purchase.salePrice >= 40)
          .length,
      };
    })
    .filter((row) => row.top1Share !== null && row.top3Share !== null);
  const averageTop1SpendShare = getAverageRatio(
    seasonStyleRows.map((row) => row.top1Share ?? 0)
  );
  const averageTop3SpendShare = getAverageRatio(
    seasonStyleRows.map((row) => row.top3Share ?? 0)
  );
  const averageTwentyPlusPurchases = getAverage(
    seasonStyleRows.map((row) => row.twentyPlusCount)
  );
  const averageFortyPlusPurchases = getAverage(
    seasonStyleRows.map((row) => row.fortyPlusCount)
  );
  const averagePurchasePrice =
    openMarketPurchaseCount > 0
      ? roundToTenth(totalOpenMarketSpend / openMarketPurchaseCount)
      : null;

  if (seasons.length < 2 || openMarketPurchaseCount < 8) {
    return {
      rosterStyleLabel: 'Insufficient History',
      rosterStyleReasons: ['Fewer than 2 reliable seasons or 8 open-market purchases.'],
      averageTop1SpendShare,
      averageTop3SpendShare,
      averageTwentyPlusPurchases,
      averageFortyPlusPurchases,
    };
  }

  // Conservative thresholds: only label extreme styles when top-spend concentration
  // is clearly separated from normal balanced auction behavior.
  if (
    (averageTop1SpendShare ?? 0) >= 0.35 ||
    ((averageTop3SpendShare ?? 0) >= 0.65 && (averageFortyPlusPurchases ?? 0) >= 0.8)
  ) {
    return {
      rosterStyleLabel: 'Stars and Scrubs',
      rosterStyleReasons: [
        'Top purchase or top three purchases take a large share of open-market spend.',
        'Multiple premium purchases show up across reliable seasons.',
      ],
      averageTop1SpendShare,
      averageTop3SpendShare,
      averageTwentyPlusPurchases,
      averageFortyPlusPurchases,
    };
  }

  if ((averageTop3SpendShare ?? 0) >= 0.55 || (averageFortyPlusPurchases ?? 0) >= 0.6) {
    return {
      rosterStyleLabel: 'Top-Heavy',
      rosterStyleReasons: ['Top three purchases carry more than half of spending.'],
      averageTop1SpendShare,
      averageTop3SpendShare,
      averageTwentyPlusPurchases,
      averageFortyPlusPurchases,
    };
  }

  if (
    (averageTop3SpendShare ?? 1) <= 0.42 &&
    (averagePurchasePrice ?? 999) <= 12 &&
    (averageMoneyLeft ?? 999) <= 25
  ) {
    return {
      rosterStyleLabel: 'Value Spreader',
      rosterStyleReasons: ['Spending is spread across many lower-cost purchases.'],
      averageTop1SpendShare,
      averageTop3SpendShare,
      averageTwentyPlusPurchases,
      averageFortyPlusPurchases,
    };
  }

  if ((averageTop3SpendShare ?? 0) >= 0.42 && (averageTop3SpendShare ?? 0) <= 0.55) {
    return {
      rosterStyleLabel: 'Balanced Builder',
      rosterStyleReasons: ['Top purchases are meaningful without dominating total spend.'],
      averageTop1SpendShare,
      averageTop3SpendShare,
      averageTwentyPlusPurchases,
      averageFortyPlusPurchases,
    };
  }

  return {
    rosterStyleLabel: 'Mixed / No Clear Pattern',
    rosterStyleReasons: ['Historical seasons do not meet a stable style threshold.'],
    averageTop1SpendShare,
    averageTop3SpendShare,
    averageTwentyPlusPurchases,
    averageFortyPlusPurchases,
  };
}

function summarizeNflTeamPreferences(
  purchases: readonly OwnerTendencyPurchase[]
) {
  const rowsByTeam = new Map<string, OwnerTendencyPurchase[]>();

  purchases.forEach((purchase) => {
    if (!purchase.nflTeam) return;
    rowsByTeam.set(purchase.nflTeam, [
      ...(rowsByTeam.get(purchase.nflTeam) ?? []),
      purchase,
    ]);
  });

  return [...rowsByTeam.entries()]
    .map(([nflTeam, teamPurchases]) => {
      const seasonsRepresented = new Set(
        teamPurchases.map((purchase) => purchase.season)
      ).size;
      return {
        nflTeam,
        purchaseCount: teamPurchases.length,
        dollarsSpent: roundToTenth(
          teamPurchases.reduce((sum, purchase) => sum + purchase.salePrice, 0)
        ),
        seasonsRepresented,
        label: `Frequently drafts players from ${nflTeam}.`,
      };
    })
    .filter(
      (preference) =>
        preference.seasonsRepresented >= 2 && preference.purchaseCount >= 3
    )
    .sort(
      (first, second) =>
        second.purchaseCount - first.purchaseCount ||
        second.dollarsSpent - first.dollarsSpent
    )
    .slice(0, 4);
}

function summarizeFirstPurchases(
  seasons: readonly OwnerSeason[]
): OwnerTendencyFirstPurchaseSeason[] {
  return seasons.map((season) => {
    const openMarketPurchases = season.purchases.filter(
      (purchase) => !purchase.isKeeper
    );

    return {
      season: season.season,
      firstPurchase: openMarketPurchases[0] ?? null,
      firstThreePurchases: openMarketPurchases.slice(0, 3),
    };
  });
}

function getPositionSpendShares(
  purchases: readonly OwnerTendencyPurchase[]
) {
  const openMarketPurchases = purchases.filter((purchase) => !purchase.isKeeper);
  const totalSpend = openMarketPurchases.reduce(
    (sum, purchase) => sum + purchase.salePrice,
    0
  );

  return Object.fromEntries(
    positions.map((position) => {
      const positionSpend = openMarketPurchases
        .filter((purchase) => purchase.position === position)
        .reduce((sum, purchase) => sum + purchase.salePrice, 0);

      return [position, totalSpend > 0 ? positionSpend / totalSpend : 0];
    })
  ) as Record<OwnerTendencyPosition, number>;
}

function summarizeRecentVsCareer({
  seasons,
  rosterStyle,
  purchaseTiming,
  maxPurchaseOrderBySeason,
}: {
  seasons: readonly OwnerSeason[];
  rosterStyle: OwnerTendencyRosterStyle;
  purchaseTiming: OwnerTendencyPurchaseTiming;
  maxPurchaseOrderBySeason: Map<number, number>;
}): OwnerTendencyRecentVsCareer {
  const recentSeasons = seasons.slice(-2);
  const careerPurchases = seasons.flatMap((season) => season.purchases);
  const recentPurchases = recentSeasons.flatMap((season) => season.purchases);
  const careerShares = getPositionSpendShares(careerPurchases);
  const recentShares = getPositionSpendShares(recentPurchases);
  const careerTopPurchase = getAverage(
    seasons.flatMap((season) => {
      const topPurchase = getHighestPurchase(
        season.purchases.filter((purchase) => !purchase.isKeeper)
      );
      return topPurchase ? [topPurchase.salePrice] : [];
    })
  );
  const recentTopPurchase = getAverage(
    recentSeasons.flatMap((season) => {
      const topPurchase = getHighestPurchase(
        season.purchases.filter((purchase) => !purchase.isKeeper)
      );
      return topPurchase ? [topPurchase.salePrice] : [];
    })
  );
  const recentTiming = summarizePurchaseTiming(
    recentSeasons,
    maxPurchaseOrderBySeason
  );
  const meaningfulShifts: string[] = [];

  positions.forEach((position) => {
    if (recentShares[position] - careerShares[position] >= 0.1) {
      meaningfulShifts.push(`Recently spending more at ${position}.`);
    }
  });

  if (
    recentTopPurchase !== null &&
    careerTopPurchase !== null &&
    recentTopPurchase - careerTopPurchase >= 5
  ) {
    meaningfulShifts.push('Recent drafts show a higher top purchase.');
  }

  if (
    recentTiming.averageFirstByPosition.QB !== null &&
    purchaseTiming.averageFirstByPosition.QB !== null &&
    recentTiming.averageFirstByPosition.QB -
      purchaseTiming.averageFirstByPosition.QB >=
      20
  ) {
    meaningfulShifts.push('Recent drafts show a later-QB approach.');
  }

  if (
    recentTiming.averageFirstByPosition.TE !== null &&
    purchaseTiming.averageFirstByPosition.TE !== null &&
    recentTiming.averageFirstByPosition.TE -
      purchaseTiming.averageFirstByPosition.TE >=
      20
  ) {
    meaningfulShifts.push('Recent drafts show a later-TE approach.');
  }

  if (
    rosterStyle.rosterStyleLabel !== 'Insufficient History' &&
    recentSeasons.length >= 2
  ) {
    const recentStyle = summarizeRosterStyle({
      seasons: recentSeasons,
      openMarketPurchaseCount: recentPurchases.filter(
        (purchase) => !purchase.isKeeper
      ).length,
      totalOpenMarketSpend: recentPurchases
        .filter((purchase) => !purchase.isKeeper)
        .reduce((sum, purchase) => sum + purchase.salePrice, 0),
      averageMoneyLeft: getAverage(
        recentSeasons
          .map((season) => season.moneyLeft)
          .filter((moneyLeft): moneyLeft is number => moneyLeft !== null)
      ),
    });

    if (
      recentStyle.rosterStyleLabel !== rosterStyle.rosterStyleLabel &&
      recentStyle.rosterStyleLabel !== 'Insufficient History'
    ) {
      meaningfulShifts.push(`Recent drafts look more like ${recentStyle.rosterStyleLabel}.`);
    }
  }

  return {
    meaningfulShifts:
      meaningfulShifts.length > 0
        ? meaningfulShifts.slice(0, 3)
        : ['No meaningful recent change.'],
    recentSeasonCount: recentSeasons.length,
  };
}

function buildTendencies({
  seasons,
  positionSpending,
  purchaseTiming,
}: {
  seasons: readonly OwnerSeason[];
  positionSpending: readonly OwnerTendencyPositionSpending[];
  purchaseTiming: OwnerTendencyPurchaseTiming;
}) {
  if (seasons.length < 2) return ['Limited history — tendencies should be treated cautiously.'];

  const tendencies: string[] = [];
  const qbSpend = positionSpending.find((position) => position.position === 'QB');
  const rbSpend = positionSpending.find((position) => position.position === 'RB');
  const wrSpend = positionSpending.find((position) => position.position === 'WR');
  const teSpend = positionSpending.find((position) => position.position === 'TE');
  const kSpend = positionSpending.find((position) => position.position === 'K');
  const defSpend = positionSpending.find((position) => position.position === 'DEF');

  if ((purchaseTiming.averageFirstByPosition.QB ?? 0) >= 96) {
    tendencies.push('Usually waits on quarterback.');
  }

  if (
    qbSpend &&
    (qbSpend.percentOfOpenMarketSpend ?? 1) <= 0.05 &&
    (qbSpend.highestPurchase?.salePrice ?? 0) <= 5
  ) {
    tendencies.push('Rarely spends above $5 at quarterback.');
  }

  if (rbSpend && (rbSpend.percentOfOpenMarketSpend ?? 0) >= 0.35) {
    tendencies.push('Invests heavily at running back.');
  }

  if (
    wrSpend &&
    (wrSpend.averageDraftedPerSeason ?? 0) >= 4 &&
    (wrSpend.averagePurchasePrice ?? 999) <= 15
  ) {
    tendencies.push('Spreads wide-receiver spending across several players.');
  }

  if (
    teSpend &&
    ((teSpend.percentOfOpenMarketSpend ?? 0) >= 0.15 ||
      (teSpend.highestPurchase?.salePrice ?? 0) >= 20)
  ) {
    tendencies.push('Frequently buys an elite tight end.');
  }

  if (
    (kSpend?.averageFirstPurchaseOrder ?? Number.MAX_SAFE_INTEGER) <= 96 &&
    (defSpend?.averageFirstPurchaseOrder ?? Number.MAX_SAFE_INTEGER) <= 96
  ) {
    tendencies.push('Usually fills kicker and defense early.');
  }

  return tendencies.slice(0, 5);
}

function getConfidence({
  completeBudgetSeasonCount,
  incompleteBudgetSeasonCount,
}: {
  completeBudgetSeasonCount: number;
  incompleteBudgetSeasonCount: number;
}): OwnerTendencyConfidence {
  if (completeBudgetSeasonCount >= 4 && incompleteBudgetSeasonCount === 0) {
    return 'High';
  }

  if (completeBudgetSeasonCount >= 2) return 'Medium';
  return 'Low';
}

function buildCautions({
  seasons,
  confidence,
  incompleteBudgetSeasonCount,
  budgetReconciliationDifference,
  currentManager,
}: {
  seasons: readonly OwnerSeason[];
  confidence: OwnerTendencyConfidence;
  incompleteBudgetSeasonCount: number;
  budgetReconciliationDifference: number | null;
  currentManager: OwnerTendencyCurrentManager | null;
}) {
  const cautions: string[] = [];

  if (seasons.length < 2) {
    cautions.push('Fewer than 2 seasons; tendencies should be treated cautiously.');
  }

  if (incompleteBudgetSeasonCount > 0) {
    cautions.push('Some seasons have incomplete purchase pricing.');
  }

  if (seasons.some((season) => season.moneyLeft !== null && season.moneyLeft < 0)) {
    cautions.push('At least one season calculates negative money left.');
  }

  if (
    budgetReconciliationDifference !== null &&
    Math.abs(budgetReconciliationDifference) > 0.25
  ) {
    cautions.push(
      `Budget reconciliation differs by $${Math.abs(
        budgetReconciliationDifference
      ).toFixed(1)}.`
    );
  }

  if (currentManager?.tookOver) {
    cautions.push(
      'Profile includes only this Sleeper user; prior franchise ownership is not merged.'
    );
  }

  if (currentManager?.coOwner?.fullName) {
    cautions.push(
      `Sleeper picked_by cannot separate co-owner attribution for ${currentManager.coOwner.fullName}.`
    );
  }

  if (confidence === 'Low') {
    cautions.push('Low confidence due to limited reliable seasons.');
  }

  return cautions.slice(0, 5);
}

function buildProfile({
  ownerId,
  purchases,
  ownerName,
  teamName,
  currentManager,
  incompleteBudgetByOwnerSeason,
  maxPurchaseOrderBySeason,
}: {
  ownerId: string;
  purchases: readonly OwnerTendencyPurchase[];
  ownerName: string | null;
  teamName: string | null;
  currentManager: OwnerTendencyCurrentManager | null;
  incompleteBudgetByOwnerSeason: Set<string>;
  maxPurchaseOrderBySeason: Map<number, number>;
}): OwnerTendencyProfile {
  const seasons = buildOwnerSeasons({
    ownerId,
    purchases,
    incompleteBudgetByOwnerSeason,
  });
  const allPurchases = seasons.flatMap((season) => season.purchases);
  const openMarketPurchases = allPurchases.filter((purchase) => !purchase.isKeeper);
  const keeperPurchases = allPurchases.filter((purchase) => purchase.isKeeper);
  const totalOpenMarketSpend = roundToTenth(
    openMarketPurchases.reduce((sum, purchase) => sum + purchase.salePrice, 0)
  );
  const totalKeeperSpend = roundToTenth(
    keeperPurchases.reduce((sum, purchase) => sum + purchase.salePrice, 0)
  );
  const completeBudgetSeasonCount = seasons.filter(
    (season) => !season.incompleteBudget
  ).length;
  const incompleteBudgetSeasonCount = seasons.length - completeBudgetSeasonCount;
  const completeBudgetSeasons = seasons.filter(
    (season) => !season.incompleteBudget
  );
  const averageOpenMarketSpend = getAverageRaw(
    completeBudgetSeasons.map((season) => season.openMarketSpend)
  );
  const averageKeeperSpend = getAverageRaw(
    completeBudgetSeasons.map((season) => season.keeperSpend)
  );
  const averageTotalSpend =
    averageOpenMarketSpend !== null && averageKeeperSpend !== null
      ? averageOpenMarketSpend + averageKeeperSpend
      : null;
  const moneyLeftValues = seasons
    .filter((season) => !season.incompleteBudget)
    .map((season) => season.moneyLeft)
    .filter((moneyLeft): moneyLeft is number => moneyLeft !== null);
  const averageMoneyLeft = getAverageRaw(moneyLeftValues);
  const budgetReconciliationDifference =
    averageTotalSpend !== null && averageMoneyLeft !== null
      ? auctionBudget - (averageTotalSpend + averageMoneyLeft)
      : null;
  const positionSpending = positions.map((position) =>
    summarizePositionSpending({
      position,
      seasons,
      totalOpenMarketSpend,
      maxPurchaseOrderBySeason,
    })
  );
  const purchaseTiming = summarizePurchaseTiming(
    seasons,
    maxPurchaseOrderBySeason
  );
  const rosterStyle = summarizeRosterStyle({
    seasons,
    openMarketPurchaseCount: openMarketPurchases.length,
    totalOpenMarketSpend,
    averageMoneyLeft,
  });
  const confidence = getConfidence({
    completeBudgetSeasonCount,
    incompleteBudgetSeasonCount,
  });
  const firstPurchases = summarizeFirstPurchases(seasons);
  const recentVsCareer = summarizeRecentVsCareer({
    seasons,
    rosterStyle,
    purchaseTiming,
    maxPurchaseOrderBySeason,
  });

  return {
    ownerId,
    ownerName:
      currentManager?.fullName ??
      ownerName ??
      currentManager?.shortName ??
      `Sleeper ${ownerId}`,
    currentManagerName: currentManager?.fullName ?? null,
    currentTeamName: currentManager?.teamName ?? teamName,
    seasons: seasons.map((season) => season.season),
    seasonCount: seasons.length,
    purchaseCount: allPurchases.length,
    keeperCount: keeperPurchases.length,
    openMarketPurchaseCount: openMarketPurchases.length,
    totalOpenMarketSpend,
    totalKeeperSpend,
    averageOpenMarketSpend,
    averageKeeperSpend,
    averageTotalSpend,
    averageSpendPerSeason: averageOpenMarketSpend,
    averageMoneyLeft,
    budgetReconciliationDifference,
    medianMoneyLeft: getMedian(moneyLeftValues),
    averageTopPurchase: getAverage(
      seasons.flatMap((season) => {
        const highestPurchase = getHighestPurchase(
          season.purchases.filter((purchase) => !purchase.isKeeper)
        );
        return highestPurchase ? [highestPurchase.salePrice] : [];
      })
    ),
    highestPurchase: getHighestPurchase(openMarketPurchases),
    completeBudgetSeasonCount,
    incompleteBudgetSeasonCount,
    positionSpending,
    purchaseTiming,
    rosterStyle,
    nflTeamPreferences: summarizeNflTeamPreferences(allPurchases),
    firstPurchases,
    recentVsCareer,
    tendencies: buildTendencies({ seasons, positionSpending, purchaseTiming }),
    cautions: buildCautions({
      seasons,
      confidence,
      incompleteBudgetSeasonCount,
      budgetReconciliationDifference,
      currentManager,
    }),
    confidence,
  };
}

export function calculateOwnerTendencies({
  sleeperAuctionDocuments,
  currentManagers = [],
  preferredOwnerId = null,
}: {
  sleeperAuctionDocuments: readonly OwnerTendencySleeperDocument[];
  currentManagers?: readonly OwnerTendencyCurrentManager[];
  preferredOwnerId?: string | null;
}): OwnerTendencyResult {
  const {
    ownerNames,
    teamNames,
    purchasesByOwner,
    incompleteBudgetByOwnerSeason,
    maxPurchaseOrderBySeason,
    skippedRows,
  } = flattenPurchases(sleeperAuctionDocuments);
  const currentManagerBySleeperId = new Map(
    currentManagers.flatMap((manager) => {
      const sleeperId = normalizeId(manager.sleeperId);
      return sleeperId ? [[sleeperId, manager] as const] : [];
    })
  );
  const profiles = [...purchasesByOwner.entries()]
    .map(([ownerId, purchases]) =>
      buildProfile({
        ownerId,
        purchases,
        ownerName: ownerNames.get(ownerId) ?? null,
        teamName: teamNames.get(ownerId) ?? null,
        currentManager: currentManagerBySleeperId.get(ownerId) ?? null,
        incompleteBudgetByOwnerSeason,
        maxPurchaseOrderBySeason,
      })
    )
    .sort((first, second) => first.ownerName.localeCompare(second.ownerName));
  const preferredProfile = preferredOwnerId
    ? profiles.find((profile) => profile.ownerId === preferredOwnerId) ?? null
    : null;
  const defaultOwnerId = preferredProfile?.ownerId ?? profiles[0]?.ownerId ?? null;
  const warnings = [
    ...(skippedRows > 0
      ? [
          `${skippedRows} purchase row${
            skippedRows === 1 ? '' : 's'
          } skipped because owner ID, price, player, or position was missing.`,
        ]
      : []),
    'Historical owner profiles are grouped by Sleeper pickedByUserId only.',
  ];

  return {
    profiles,
    defaultOwnerId,
    skippedRows,
    warnings,
  };
}
