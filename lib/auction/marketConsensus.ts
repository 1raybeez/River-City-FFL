import type {
  AuctionPlayerId,
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTimestamp,
} from "@/lib/auction/types";
import type { AuctionValueSourceRegistryId } from "@/lib/auction/valueSourceRegistry";

export type MarketConsensusWarningSeverity = "info" | "warning" | "error";

export type MarketConsensusWarningCode =
  | "missing-player-identity"
  | "missing-auction-value"
  | "low-source-coverage"
  | "high-source-disagreement"
  | "single-source-consensus";

export interface MarketConsensusWarning {
  code: MarketConsensusWarningCode;
  severity: MarketConsensusWarningSeverity;
  message: string;
  sourceIds: string[];
}

export interface MarketConsensusSourceValue {
  sourceId: AuctionValueSourceRegistryId | (string & {});
  sourceDisplayName: string;
  seasonYear: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId | null;
  playerName: string;
  normalizedPlayerName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  auctionValue: number | null;
  rank: number | null;
  tier: string | null;
  confidence: number;
  importedAt: AuctionTimestamp | null;
  warnings: MarketConsensusWarning[];
}

export interface MarketConsensusPlayer {
  id: string;
  seasonYear: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId | null;
  playerName: string;
  normalizedPlayerName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  sourceValues: MarketConsensusSourceValue[];
  low: number | null;
  high: number | null;
  average: number | null;
  median: number | null;
  sourceCount: number;
  confidenceScore: number;
  disagreementScore: number;
  bestAvailableValueGap: number | null;
  warnings: MarketConsensusWarning[];
}

export interface MarketConsensusManifest {
  generatedAt: AuctionTimestamp;
  seasonYear: AuctionSeasonYear;
  sourceIds: string[];
  sourceCount: number;
  playerCount: number;
  expectedSourceCount: number;
  minimumSourceCount: number;
  lowCoveragePlayerCount: number;
  highDisagreementPlayerCount: number;
  warnings: MarketConsensusWarning[];
}

export interface BuildMarketConsensusPlayerInput {
  seasonYear: AuctionSeasonYear;
  sourceValues: readonly MarketConsensusSourceValue[];
  expectedSourceCount?: number;
  minimumSourceCount?: number;
  referenceValue?: number | null;
}

export interface BuildMarketConsensusPlayersInput {
  seasonYear: AuctionSeasonYear;
  sourceValues: readonly MarketConsensusSourceValue[];
  expectedSourceCount?: number;
  minimumSourceCount?: number;
  referenceValues?: ReadonlyMap<string, number | null>;
}

function isFiniteNonNegativeValue(
  value: number | null | undefined
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function getValidAuctionValues(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  return sourceValues
    .map((sourceValue) => sourceValue.auctionValue)
    .filter(isFiniteNonNegativeValue);
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getConsensusPlayerId(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const sleeperPlayerId =
    sourceValues.find((sourceValue) => sourceValue.sleeperPlayerId)
      ?.sleeperPlayerId ?? null;

  if (sleeperPlayerId) return `sleeper:${sleeperPlayerId}`;

  const firstSourceValue = sourceValues[0];
  return [
    "name",
    firstSourceValue?.normalizedPlayerName ?? "unknown",
    firstSourceValue?.position ?? "UNK",
  ].join(":");
}

function getSourceCoverageWarning({
  sourceValues,
  sourceCount,
  minimumSourceCount,
}: {
  sourceValues: readonly MarketConsensusSourceValue[];
  sourceCount: number;
  minimumSourceCount: number;
}): MarketConsensusWarning[] {
  if (sourceCount >= minimumSourceCount) return [];

  return [
    {
      code:
        sourceCount <= 1 ? "single-source-consensus" : "low-source-coverage",
      severity: "warning",
      message: `Consensus only has ${sourceCount} source value${sourceCount === 1 ? "" : "s"}; target minimum is ${minimumSourceCount}.`,
      sourceIds: sourceValues.map((sourceValue) => sourceValue.sourceId),
    },
  ];
}

export function calculateMarketConsensusLow(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const values = getValidAuctionValues(sourceValues);
  return values.length > 0 ? Math.min(...values) : null;
}

export function calculateMarketConsensusHigh(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const values = getValidAuctionValues(sourceValues);
  return values.length > 0 ? Math.max(...values) : null;
}

export function calculateMarketConsensusAverage(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const values = getValidAuctionValues(sourceValues);
  if (values.length === 0) return null;

  return roundToTenth(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

export function calculateMarketConsensusMedian(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const values = [...getValidAuctionValues(sourceValues)].sort(
    (firstValue, secondValue) => firstValue - secondValue
  );
  if (values.length === 0) return null;

  const middleIndex = Math.floor(values.length / 2);
  if (values.length % 2 === 1) return values[middleIndex];

  return roundToTenth((values[middleIndex - 1] + values[middleIndex]) / 2);
}

export function calculateMarketConsensusSourceCount(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  return new Set(
    sourceValues
      .filter((sourceValue) => isFiniteNonNegativeValue(sourceValue.auctionValue))
      .map((sourceValue) => sourceValue.sourceId)
  ).size;
}

export function calculateMarketConsensusDisagreementScore(
  sourceValues: readonly MarketConsensusSourceValue[]
) {
  const low = calculateMarketConsensusLow(sourceValues);
  const high = calculateMarketConsensusHigh(sourceValues);
  const average = calculateMarketConsensusAverage(sourceValues);

  if (low === null || high === null || average === null || average <= 0) {
    return 0;
  }

  return clampScore(((high - low) / average) * 100);
}

export function calculateMarketConsensusConfidenceScore({
  sourceValues,
  expectedSourceCount,
}: {
  sourceValues: readonly MarketConsensusSourceValue[];
  expectedSourceCount: number;
}) {
  const sourceCount = calculateMarketConsensusSourceCount(sourceValues);
  const sourceCoverageScore =
    expectedSourceCount <= 0
      ? 100
      : Math.min(1, sourceCount / expectedSourceCount) * 55;
  const averageSourceConfidence =
    sourceValues.length > 0
      ? sourceValues.reduce(
          (sum, sourceValue) =>
            sum + Math.max(0, Math.min(100, sourceValue.confidence)),
          0
        ) / sourceValues.length
      : 0;
  const disagreementScore =
    calculateMarketConsensusDisagreementScore(sourceValues);
  const disagreementPenalty = Math.min(35, disagreementScore * 0.35);

  return clampScore(
    sourceCoverageScore + averageSourceConfidence * 0.45 - disagreementPenalty
  );
}

export function calculateMarketConsensusBestAvailableValueGap({
  sourceValues,
  referenceValue,
}: {
  sourceValues: readonly MarketConsensusSourceValue[];
  referenceValue?: number | null;
}) {
  const average = calculateMarketConsensusAverage(sourceValues);
  const high = calculateMarketConsensusHigh(sourceValues);
  const safeReferenceValue = isFiniteNonNegativeValue(referenceValue)
    ? referenceValue
    : null;

  if (average === null) return null;

  if (safeReferenceValue !== null) {
    return roundToTenth(average - safeReferenceValue);
  }

  return high === null ? null : roundToTenth(high - average);
}

export function buildMarketConsensusCoverageWarnings({
  sourceValues,
  expectedSourceCount,
  minimumSourceCount,
}: {
  sourceValues: readonly MarketConsensusSourceValue[];
  expectedSourceCount: number;
  minimumSourceCount: number;
}) {
  const sourceCount = calculateMarketConsensusSourceCount(sourceValues);
  const missingValueWarnings = sourceValues
    .filter((sourceValue) => !isFiniteNonNegativeValue(sourceValue.auctionValue))
    .map(
      (sourceValue): MarketConsensusWarning => ({
        code: "missing-auction-value",
        severity: "info",
        message: `${sourceValue.sourceDisplayName} did not provide a usable auction value.`,
        sourceIds: [sourceValue.sourceId],
      })
    );
  const sourceCoverageWarnings = getSourceCoverageWarning({
    sourceValues,
    sourceCount,
    minimumSourceCount,
  });
  const disagreementScore =
    calculateMarketConsensusDisagreementScore(sourceValues);
  const disagreementWarnings =
    disagreementScore >= 40
      ? [
          {
            code: "high-source-disagreement",
            severity: "warning",
            message: `Source values disagree by ${disagreementScore}%. Review before trusting the consensus.`,
            sourceIds: sourceValues.map((sourceValue) => sourceValue.sourceId),
          } satisfies MarketConsensusWarning,
        ]
      : [];
  const expectedCoverageWarnings =
    expectedSourceCount > 0 && sourceCount === 0
      ? [
          {
            code: "missing-auction-value",
            severity: "error",
            message: "No source provided a usable auction value.",
            sourceIds: sourceValues.map((sourceValue) => sourceValue.sourceId),
          } satisfies MarketConsensusWarning,
        ]
      : [];

  return [
    ...missingValueWarnings,
    ...sourceCoverageWarnings,
    ...disagreementWarnings,
    ...expectedCoverageWarnings,
  ];
}

export function buildMarketConsensusPlayer({
  seasonYear,
  sourceValues,
  expectedSourceCount = sourceValues.length,
  minimumSourceCount = 2,
  referenceValue = null,
}: BuildMarketConsensusPlayerInput): MarketConsensusPlayer {
  const firstSourceValue = sourceValues[0] ?? null;
  const sleeperPlayerId =
    sourceValues.find((sourceValue) => sourceValue.sleeperPlayerId)
      ?.sleeperPlayerId ?? null;
  const playerName = firstSourceValue?.playerName ?? "Unknown Player";
  const normalizedPlayerName =
    firstSourceValue?.normalizedPlayerName ?? "unknown-player";
  const position = firstSourceValue?.position ?? null;
  const nflTeam = firstSourceValue?.nflTeam ?? null;
  const warnings = buildMarketConsensusCoverageWarnings({
    sourceValues,
    expectedSourceCount,
    minimumSourceCount,
  });

  return {
    id: getConsensusPlayerId(sourceValues),
    seasonYear,
    sleeperPlayerId,
    playerName,
    normalizedPlayerName,
    position,
    nflTeam,
    sourceValues: [...sourceValues],
    low: calculateMarketConsensusLow(sourceValues),
    high: calculateMarketConsensusHigh(sourceValues),
    average: calculateMarketConsensusAverage(sourceValues),
    median: calculateMarketConsensusMedian(sourceValues),
    sourceCount: calculateMarketConsensusSourceCount(sourceValues),
    confidenceScore: calculateMarketConsensusConfidenceScore({
      sourceValues,
      expectedSourceCount,
    }),
    disagreementScore: calculateMarketConsensusDisagreementScore(sourceValues),
    bestAvailableValueGap: calculateMarketConsensusBestAvailableValueGap({
      sourceValues,
      referenceValue,
    }),
    warnings,
  };
}

export function buildMarketConsensusPlayers({
  seasonYear,
  sourceValues,
  expectedSourceCount,
  minimumSourceCount = 2,
  referenceValues,
}: BuildMarketConsensusPlayersInput) {
  const groupedValues = sourceValues.reduce(
    (groups, sourceValue) => {
      const groupKey = sourceValue.sleeperPlayerId
        ? `sleeper:${sourceValue.sleeperPlayerId}`
        : [
            "name",
            sourceValue.normalizedPlayerName,
            sourceValue.position ?? "UNK",
          ].join(":");
      const currentGroup = groups.get(groupKey) ?? [];
      currentGroup.push(sourceValue);
      groups.set(groupKey, currentGroup);
      return groups;
    },
    new Map<string, MarketConsensusSourceValue[]>()
  );
  const safeExpectedSourceCount =
    expectedSourceCount ??
    new Set(sourceValues.map((sourceValue) => sourceValue.sourceId)).size;

  return Array.from(groupedValues.entries()).map(([groupKey, values]) =>
    buildMarketConsensusPlayer({
      seasonYear,
      sourceValues: values,
      expectedSourceCount: safeExpectedSourceCount,
      minimumSourceCount,
      referenceValue: referenceValues?.get(groupKey) ?? null,
    })
  );
}

export function buildMarketConsensusManifest({
  generatedAt,
  seasonYear,
  players,
  expectedSourceCount,
  minimumSourceCount,
}: {
  generatedAt: AuctionTimestamp;
  seasonYear: AuctionSeasonYear;
  players: readonly MarketConsensusPlayer[];
  expectedSourceCount: number;
  minimumSourceCount: number;
}): MarketConsensusManifest {
  const sourceIds = Array.from(
    new Set(
      players.flatMap((player) =>
        player.sourceValues.map((sourceValue) => sourceValue.sourceId)
      )
    )
  ).sort();
  const warnings = players.flatMap((player) => player.warnings);

  return {
    generatedAt,
    seasonYear,
    sourceIds,
    sourceCount: sourceIds.length,
    playerCount: players.length,
    expectedSourceCount,
    minimumSourceCount,
    lowCoveragePlayerCount: players.filter(
      (player) => player.sourceCount < minimumSourceCount
    ).length,
    highDisagreementPlayerCount: players.filter(
      (player) => player.disagreementScore >= 40
    ).length,
    warnings,
  };
}
