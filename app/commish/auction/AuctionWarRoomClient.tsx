'use client';

import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import playerValues2025 from '@/data/auction/processed/player-values-2025.json';
import generatedMasterview2026 from '@/data/auction/generated/masterview-2026.json';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  DollarSign,
  FileWarning,
  Gavel,
  Grid3X3,
  History,
  Lock,
  MessageCircle,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import {
  mockAuctionAuditLog,
  mockAuctionKeepers,
  mockAuctionPlayerValues,
  mockAuctionPurchases,
  mockAuctionTeams,
  mockCurrentNomination,
} from '@/lib/auction/mockAuctionData';
import { riverCityAuctionLeagueSettings } from '@/lib/auction/leagueSettings';
import {
  calculateAverageDollarsPerOpenRosterSpot,
  calculateKeeperCostByTeam,
  calculateMaxBid,
  calculatePurchaseSpendByTeam,
  calculateRemainingBudget,
  calculateRosterSpotsRemaining,
  calculateTotalSpent,
} from '@/lib/auction/calculations';
import {
  byeWeekOptions2025,
  getByeWeekForNflTeam,
} from '@/lib/auction/byeWeeks';
import {
  fadePlayerNames,
  targetPlayerNames,
  watchlistPlayerNames,
} from '@/lib/auction/draftPreferences';
import {
  calculateAuctionInflationState,
  recommendRayJeffreyMaxBid,
  type BidRecommendationNeedLevel,
  type BidRecommendationPreference,
  type BidRecommendationPurchaseSample,
} from '@/lib/auction/bidRecommendations';
import {
  buildAuctionAdvisorSummary,
  type AuctionAdvisorPlayerValue,
  type AuctionAdvisorPurchase,
} from '@/lib/auction/auctionAdvisor';
import {
  calculateBenchDepthNeeds,
  calculateByeWeekConcentrationWarnings,
  calculateMaxBidPressureWarnings,
  calculateOverspendingWarnings,
  calculatePositionCounts,
  calculateStarterNeeds,
  rosterGuidancePositionOrder,
  type RosterGuidancePlayer,
  type RosterGuidancePlayerValue,
  type RosterGuidanceSeverity,
  type RosterGuidanceWarning,
} from '@/lib/auction/rosterGuidance';
import type { AuctionTeamId } from '@/lib/auction/types';

const statusStyles: Record<string, string> = {
  active: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  live: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  locked: 'border-blue-600/20 bg-blue-600/10 text-blue-600',
  matched: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  unmatched: 'border-rose-600/20 bg-rose-600/10 text-rose-600',
  ambiguous: 'border-yellow-600/20 bg-yellow-600/10 text-yellow-700 dark:text-yellow-300',
  'missing-review': 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500',
  outbid: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500',
  winning: 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  mock: 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  manual: 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  'Manual Taken': 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  'Sleeper Taken': 'border-blue-600/20 bg-blue-600/10 text-blue-600',
  high: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  medium: 'border-yellow-600/20 bg-yellow-600/10 text-yellow-700 dark:text-yellow-300',
  low: 'border-rose-600/20 bg-rose-600/10 text-rose-600',
};

type ProcessedPlayerValueStatus = {
  taken?: string | null;
  raw?: Record<string, string | number | null>;
};

type ProcessedPlayerSiteValue = {
  sourceName: string;
  value?: number | null;
  rawValue?: string | number | null;
};

type ProcessedPlayerValueRow = {
  rowNumber: number;
  sleeperPlayerId?: string | null;
  originalPlayerName: string;
  matchedSleeperName?: string | null;
  matchedSearchName?: string | null;
  appliedAlias?: string | null;
  position?: string | null;
  nflTeam?: string | null;
  siteValues?: ProcessedPlayerSiteValue[];
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  status?: ProcessedPlayerValueStatus | null;
  matchStatus: string;
  matchMethod?: string | null;
};

type ProcessedPlayerValuesFile = {
  generatedAt: string;
  season: number;
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  rows: ProcessedPlayerValueRow[];
};

type GeneratedMasterviewSourceValue = {
  sourceName: string;
  auctionValue?: number | null;
  normalizedAuctionValue?: number | null;
  matchStatus?: string | null;
  matchMethod?: string | null;
};

type GeneratedMasterviewRow = {
  season: number;
  sleeperPlayerId?: string | null;
  playerName: string;
  position?: string | null;
  nflTeam?: string | null;
  sourceValues?: GeneratedMasterviewSourceValue[];
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  sourceCount?: number | null;
  confidenceScore?: number | null;
  warnings?: string[];
};

type GeneratedMasterviewFile = {
  generatedAt: string;
  season: number;
  rowCount: number;
  sourceValueCount: number;
  sourceFiles?: string[];
  rows: GeneratedMasterviewRow[];
};

type AuctionValueSourceOption = {
  id: 'generated-2026' | 'historical-2025';
  label: string;
  shortLabel: string;
  path: string;
  file: ProcessedPlayerValuesFile;
};

type PlayerPoolSortKey = 'averageValue' | 'highValue' | 'position' | 'playerName';
type PlayerPoolPreferenceFilter = 'all' | 'target' | 'fade' | 'watch';
type PlayerPoolPreferenceTag = Exclude<PlayerPoolPreferenceFilter, 'all'>;
type SleeperSnapshotLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type AdvisorChatRequestStatus = 'idle' | 'loading' | 'error';

type SleeperSnapshotPurchase = {
  draftId: string | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number | null;
  round: number | null;
  draftSlot: number | null;
  pickNo: number | null;
  auctionPrice: number | null;
  needsAuctionPriceReview: boolean;
};

type SleeperSnapshotResponse = {
  season: number;
  leagueId?: string | null;
  status?: string;
  draft?: {
    draft_id?: string | null;
    status?: string | null;
    type?: string | null;
  } | null;
  purchases?: SleeperSnapshotPurchase[];
  counts?: {
    purchases: number;
    picks: number;
    pricedPurchases: number;
    missingAuctionPrices: number;
    keepers: number;
  };
  warnings?: string[];
  fetchedAt?: string;
  error?: string;
};

type PurchaseSource = 'demo' | 'sleeper' | 'manual';

type AuctionWarRoomPurchaseRow = {
  id: string;
  teamId: AuctionTeamId;
  rosterId: number | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  purchasePrice: number;
  projectedValue: number | null;
  rayMaxBid: number | null;
  status: 'active' | 'voided';
  source: PurchaseSource;
};

type ManualAuctionSale = {
  id: string;
  playerRowNumber: number;
  playerId: string | null;
  playerName: string;
  matchedSleeperName: string | null;
  position: string | null;
  nflTeam: string | null;
  salePrice: number;
  teamId: AuctionTeamId;
  rosterId: number | null;
  teamName: string;
  managerName: string;
  recordedAt: string;
};

function formatPurchaseSourceLabel(source: PurchaseSource) {
  if (source === 'manual') return 'Manual Entry';
  if (source === 'sleeper') return 'Sleeper Snapshot';
  return 'Local Demo Data';
}

type LocalAdvisorChatQuestionId =
  | 'target-next'
  | 'positions-needed'
  | 'overspending'
  | 'bye-risk'
  | 'best-values';
type LocalAdvisorPlayerIntent = 'lookup' | 'max-bid' | 'bid' | 'nominate';
type LocalAdvisorChatSourceLabel = 'Protected local API' | 'Local fallback';

type LocalAdvisorChatMessage = {
  id: string;
  question: string;
  summary: string;
  recommendation: string;
  reasons: string[];
  warnings: string[];
  timestamp: string;
  meta?: string;
  sourceLabel?: LocalAdvisorChatSourceLabel;
};

type AdvisorChatApiResponse = {
  answer?: unknown;
  recommendation?: unknown;
  reasons?: unknown;
  warnings?: unknown;
  source?: unknown;
  contextSummary?: unknown;
  error?: unknown;
};

const localPlayerValues2025 = playerValues2025 as ProcessedPlayerValuesFile;
const generatedMasterviewValues2026 =
  generatedMasterview2026 as GeneratedMasterviewFile;

function mapGeneratedMasterviewRowToPlayerPoolRow(
  row: GeneratedMasterviewRow,
  index: number
): ProcessedPlayerValueRow {
  const firstSourceValue = row.sourceValues?.[0];
  const siteValues: ProcessedPlayerSiteValue[] =
    row.sourceValues?.map((sourceValue) => ({
      sourceName: sourceValue.sourceName,
      value:
        sourceValue.normalizedAuctionValue ??
        sourceValue.auctionValue ??
        null,
      rawValue:
        sourceValue.normalizedAuctionValue ??
        sourceValue.auctionValue ??
        null,
    })) ?? [];

  return {
    rowNumber: index + 1,
    sleeperPlayerId: row.sleeperPlayerId ?? null,
    originalPlayerName: row.playerName,
    matchedSleeperName: row.sleeperPlayerId ? row.playerName : null,
    matchedSearchName: row.playerName,
    appliedAlias: null,
    position: row.position ?? null,
    nflTeam: row.nflTeam ?? null,
    siteValues,
    lowValue: row.lowValue ?? null,
    highValue: row.highValue ?? null,
    averageValue: row.averageValue ?? null,
    status: null,
    matchStatus: row.sleeperPlayerId ? 'matched' : 'unmatched',
    matchMethod:
      firstSourceValue?.matchMethod ??
      firstSourceValue?.matchStatus ??
      (row.sleeperPlayerId ? 'generated-masterview' : 'missing-sleeper-id'),
  };
}

function mapGeneratedMasterviewFileToProcessedValuesFile(
  file: GeneratedMasterviewFile
): ProcessedPlayerValuesFile {
  const rows = file.rows.map(mapGeneratedMasterviewRowToPlayerPoolRow);
  const matchedRows = rows.filter((row) => row.matchStatus === 'matched').length;

  return {
    generatedAt: file.generatedAt,
    season: file.season,
    totalRows: rows.length,
    matchedRows,
    unmatchedRows: rows.length - matchedRows,
    rows,
  };
}

const generatedPlayerValues2026 =
  mapGeneratedMasterviewFileToProcessedValuesFile(
    generatedMasterviewValues2026
  );
const auctionValueSourceOptions: AuctionValueSourceOption[] = [
  {
    id: 'generated-2026',
    label: 'FantasyPros 2026 generated values',
    shortLabel: 'FantasyPros 2026',
    path: 'data/auction/generated/masterview-2026.json',
    file: generatedPlayerValues2026,
  },
  {
    id: 'historical-2025',
    label: 'Historical 2025 values fallback',
    shortLabel: 'Historical 2025',
    path: 'data/auction/processed/player-values-2025.json',
    file: localPlayerValues2025,
  },
];
const activeAuctionValueSource =
  auctionValueSourceOptions.find((source) => source.file.rows.length > 0) ??
  auctionValueSourceOptions[1];
const localPlayerValues = activeAuctionValueSource.file;
const localPlayerPoolRows = localPlayerValues.rows;
const playerPoolValueSourceLabel = activeAuctionValueSource.label;
const playerPoolValueSourceShortLabel = activeAuctionValueSource.shortLabel;
const playerPoolValueSourcePath = activeAuctionValueSource.path;
const playerPoolInitialDisplayLimit = 250;
const emptySleeperPurchases: SleeperSnapshotPurchase[] = [];

const playerPoolSortOptions: Array<{ label: string; value: PlayerPoolSortKey }> = [
  { label: 'Average Value', value: 'averageValue' },
  { label: 'High Value', value: 'highValue' },
  { label: 'Position', value: 'position' },
  { label: 'Player Name', value: 'playerName' },
];

const localAdvisorChatQuestions: Array<{
  id: LocalAdvisorChatQuestionId;
  label: string;
}> = [
  { id: 'target-next', label: 'Who should I target next?' },
  { id: 'positions-needed', label: 'What positions do I need most?' },
  { id: 'overspending', label: 'Am I overspending anywhere?' },
  { id: 'bye-risk', label: 'What bye weeks are risky?' },
  { id: 'best-values', label: 'Who are the best values left?' },
];

const preferenceBadgeStyles: Record<PlayerPoolPreferenceTag, string> = {
  target: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  fade: 'border-rose-600/20 bg-rose-600/10 text-rose-600',
  watch: 'border-blue-600/20 bg-blue-600/10 text-blue-600',
};

const preferenceBadgeLabels: Record<PlayerPoolPreferenceTag, string> = {
  target: 'Target',
  fade: 'Fade',
  watch: 'Watch',
};

const rosterGuidanceSeverityStyles: Record<RosterGuidanceSeverity, string> = {
  ok: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  watch: 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  danger: 'border-rose-600/20 bg-rose-600/10 text-rose-600',
};

function formatMoney(amount: number | null) {
  return amount === null ? 'N/A' : `$${amount}`;
}

function formatMoneyPerSlot(amount: number) {
  return `$${amount.toFixed(1)}`;
}

function formatSiteValue(siteValue: ProcessedPlayerSiteValue) {
  if (typeof siteValue.value === 'number' && Number.isFinite(siteValue.value)) {
    return formatMoney(siteValue.value);
  }

  if (siteValue.rawValue !== null && siteValue.rawValue !== undefined) {
    const rawValue = String(siteValue.rawValue).trim();
    return rawValue ? rawValue : 'N/A';
  }

  return 'N/A';
}

function formatTimestamp(value: string | null) {
  if (!value) return 'TBD';
  return `${value.slice(5, 10)} ${value.slice(11, 16)}`;
}

function formatChatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function formatByeWeek(byeWeek: number | null) {
  return byeWeek === null ? 'N/A' : String(byeWeek);
}

function getStatusClass(status: string) {
  return statusStyles[status] ?? 'border-black/10 bg-black/5 text-gray-500 dark:border-white/10 dark:bg-white/10';
}

function getRosterGuidanceSeverityClass(severity: RosterGuidanceSeverity) {
  return rosterGuidanceSeverityStyles[severity];
}

function normalizeFilterValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function normalizePlayerMatchValue(value: string | null | undefined) {
  return normalizeFilterValue(value)
    .replace(/[.'’]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizePositionValue(value: string | null | undefined) {
  return normalizeFilterValue(value).toUpperCase();
}

function getRayKDefStrategyMax(position: string | null | undefined) {
  const normalizedPosition = normalizePositionValue(position);

  if (normalizedPosition === 'K') {
    return riverCityAuctionLeagueSettings.preferredEarlyKickerMax;
  }

  if (normalizedPosition === 'DEF' || normalizedPosition === 'DST') {
    return riverCityAuctionLeagueSettings.preferredEarlyDefenseMax;
  }

  return null;
}

function isRayKDefStrategyPosition(position: string | null | undefined) {
  return getRayKDefStrategyMax(position) !== null;
}

function getPurchaseIdentityKey(purchase: Pick<AuctionWarRoomPurchaseRow, 'playerId' | 'playerName' | 'position' | 'nflTeam'>) {
  const playerId = normalizeFilterValue(purchase.playerId);

  if (playerId) return `id:${playerId}`;

  return [
    'name',
    normalizePlayerMatchValue(purchase.playerName),
    normalizePositionValue(purchase.position),
    normalizePositionValue(purchase.nflTeam),
  ].join(':');
}

function getRayKDefStrategyMessage(playerName: string, position: string | null, price: number) {
  const maxPrice = getRayKDefStrategyMax(position);

  if (maxPrice === null || price > maxPrice) return null;

  return `This fits Ray’s early K/DEF value strategy: ${playerName} at ${formatMoney(price)} is within the ${normalizePositionValue(position)} cap of ${formatMoney(maxPrice)}.`;
}

function sortPlayerPoolStatuses(statuses: string[]) {
  return statuses.sort((firstStatus, secondStatus) => {
    if (firstStatus === 'None') return -1;
    if (secondStatus === 'None') return 1;
    return firstStatus.localeCompare(secondStatus);
  });
}

const targetPlayerNameSet = new Set(targetPlayerNames.map(normalizeFilterValue));
const fadePlayerNameSet = new Set(fadePlayerNames.map(normalizeFilterValue));
const watchlistPlayerNameSet = new Set(watchlistPlayerNames.map(normalizeFilterValue));

function formatPlayerPoolStatus(status?: ProcessedPlayerValueStatus | null) {
  if (status?.taken) return status.taken;

  const firstRawStatus = Object.entries(status?.raw ?? {}).find(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== ''
  );

  return firstRawStatus ? String(firstRawStatus[1]) : 'None';
}

function getPlayerPoolPurchaseMatch(
  player: ProcessedPlayerValueRow,
  purchases: readonly AuctionWarRoomPurchaseRow[]
) {
  const activePurchases = purchases.filter(
    (purchase) => purchase.status === 'active'
  );
  const sleeperPlayerId = normalizeFilterValue(player.sleeperPlayerId);

  if (sleeperPlayerId) {
    const idMatch = activePurchases.find(
      (purchase) => normalizeFilterValue(purchase.playerId) === sleeperPlayerId
    );
    if (idMatch) return idMatch;
  }

  const playerNames = [
    normalizePlayerMatchValue(player.originalPlayerName),
    normalizePlayerMatchValue(player.matchedSleeperName),
  ].filter(Boolean);
  const playerPosition = normalizePositionValue(player.position);
  const playerTeam = normalizePositionValue(player.nflTeam);

  return (
    activePurchases.find((purchase) => {
      const purchaseName = normalizePlayerMatchValue(purchase.playerName);
      if (!purchaseName || !playerNames.includes(purchaseName)) return false;

      const purchasePosition = normalizePositionValue(purchase.position);
      const purchaseTeam = normalizePositionValue(purchase.nflTeam);
      const positionsAreCompatible =
        !playerPosition || !purchasePosition || playerPosition === purchasePosition;
      const teamsAreCompatible =
        !playerTeam || !purchaseTeam || playerTeam === purchaseTeam;

      return positionsAreCompatible && teamsAreCompatible;
    }) ?? null
  );
}

function getPlayerPoolDisplayStatus(
  player: ProcessedPlayerValueRow,
  purchases: readonly AuctionWarRoomPurchaseRow[],
  isUsingSleeperPurchases: boolean
) {
  const purchaseMatch = getPlayerPoolPurchaseMatch(player, purchases);

  if (purchaseMatch?.source === 'manual') {
    return 'Manual Taken';
  }

  if (isUsingSleeperPurchases && purchaseMatch?.source === 'sleeper') {
    return 'Sleeper Taken';
  }

  return formatPlayerPoolStatus(player.status);
}

function isAvailablePlayerPoolStatus(status: string) {
  const normalizedStatus = normalizeFilterValue(status);
  return normalizedStatus === 'none' || normalizedStatus === 'no' || normalizedStatus === 'available';
}

function getSortableNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : -1;
}

function sortPlayerPoolRows(
  players: ProcessedPlayerValueRow[],
  sortKey: PlayerPoolSortKey
) {
  return [...players].sort((firstPlayer, secondPlayer) => {
    if (sortKey === 'averageValue') {
      const valueDifference =
        getSortableNumber(secondPlayer.averageValue) -
        getSortableNumber(firstPlayer.averageValue);
      if (valueDifference !== 0) return valueDifference;
    }

    if (sortKey === 'highValue') {
      const valueDifference =
        getSortableNumber(secondPlayer.highValue) -
        getSortableNumber(firstPlayer.highValue);
      if (valueDifference !== 0) return valueDifference;
    }

    if (sortKey === 'position') {
      const positionDifference = (firstPlayer.position ?? '').localeCompare(
        secondPlayer.position ?? ''
      );
      if (positionDifference !== 0) return positionDifference;
    }

    return firstPlayer.originalPlayerName.localeCompare(
      secondPlayer.originalPlayerName
    );
  });
}

function getPlayerPoolPreferenceTags(player: ProcessedPlayerValueRow) {
  const playerNames = [
    normalizeFilterValue(player.originalPlayerName),
    normalizeFilterValue(player.matchedSleeperName),
  ].filter(Boolean);
  const tags: PlayerPoolPreferenceTag[] = [];

  if (playerNames.some((name) => targetPlayerNameSet.has(name))) {
    tags.push('target');
  }

  if (playerNames.some((name) => fadePlayerNameSet.has(name))) {
    tags.push('fade');
  }

  if (playerNames.some((name) => watchlistPlayerNameSet.has(name))) {
    tags.push('watch');
  }

  return tags;
}

function getBidRecommendationPreference(
  tags: readonly PlayerPoolPreferenceTag[]
): BidRecommendationPreference {
  if (tags.includes('fade')) return 'fade';
  if (tags.includes('target')) return 'target';
  if (tags.includes('watch')) return 'watch';

  return 'none';
}

function findPlayerValueRowForPurchase(
  purchase: AuctionWarRoomPurchaseRow
): ProcessedPlayerValueRow | null {
  const sleeperPlayerId = normalizeFilterValue(purchase.playerId);

  if (sleeperPlayerId) {
    const idMatch = localPlayerPoolRows.find(
      (player) => normalizeFilterValue(player.sleeperPlayerId) === sleeperPlayerId
    );
    if (idMatch) return idMatch;
  }

  const purchaseName = normalizePlayerMatchValue(purchase.playerName);
  const purchasePosition = normalizePositionValue(purchase.position);
  const purchaseTeam = normalizePositionValue(purchase.nflTeam);

  return (
    localPlayerPoolRows.find((player) => {
      const playerNames = [
        normalizePlayerMatchValue(player.originalPlayerName),
        normalizePlayerMatchValue(player.matchedSleeperName),
      ].filter(Boolean);

      if (!purchaseName || !playerNames.includes(purchaseName)) return false;

      const playerPosition = normalizePositionValue(player.position);
      const playerTeam = normalizePositionValue(player.nflTeam);
      const positionsAreCompatible =
        !purchasePosition || !playerPosition || purchasePosition === playerPosition;
      const teamsAreCompatible =
        !purchaseTeam || !playerTeam || purchaseTeam === playerTeam;

      return positionsAreCompatible && teamsAreCompatible;
    }) ?? null
  );
}

function buildBidRecommendationPurchaseSamples(
  purchases: readonly AuctionWarRoomPurchaseRow[]
): BidRecommendationPurchaseSample[] {
  return purchases
    .filter((purchase) => purchase.status === 'active')
    .map((purchase) => {
      const playerValue = findPlayerValueRowForPurchase(purchase);

      return {
        purchasePrice: purchase.purchasePrice,
        projectedValue: purchase.projectedValue,
        averageValue: playerValue?.averageValue ?? null,
        highValue: playerValue?.highValue ?? null,
        lowValue: playerValue?.lowValue ?? null,
        status: purchase.status,
      };
    });
}

function getBidRecommendationNeedLevel(
  player: ProcessedPlayerValueRow,
  starterNeeds: ReturnType<typeof calculateStarterNeeds>,
  benchDepthNeeds: ReturnType<typeof calculateBenchDepthNeeds>
): BidRecommendationNeedLevel {
  const playerPosition = normalizePositionValue(player.position);
  const starterNeed = starterNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );
  const flexNeed = starterNeeds.find(
    (need) => normalizePositionValue(need.label) === 'FLEX'
  );
  const benchNeed = benchDepthNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );

  if (starterNeed && starterNeed.needed > 1) return 'must-fill';
  if (starterNeed && starterNeed.needed > 0) return 'need';
  if (
    flexNeed &&
    flexNeed.needed > 0 &&
    ['RB', 'WR', 'TE'].includes(playerPosition)
  ) {
    return 'need';
  }
  if (benchNeed && benchNeed.needed > 0) return 'depth';
  if (benchNeed && benchNeed.current >= benchNeed.target) return 'surplus';

  return 'neutral';
}

function getSameByeWeekRosterCount(
  byeWeek: number | null,
  rosterPlayers: readonly RosterGuidancePlayer[]
) {
  if (byeWeek === null) return 0;

  return rosterPlayers.filter((player) => player.byeWeek === byeWeek).length;
}

type PlayerBidRecommendationContext = {
  guidanceBudgetRow: {
    remainingBudget: number;
    rosterSpotsRemaining: number;
    maxBid: number;
    averageDollarsPerOpenSlot: number;
  } | null;
  guidanceStarterNeeds: ReturnType<typeof calculateStarterNeeds>;
  guidanceBenchDepthNeeds: ReturnType<typeof calculateBenchDepthNeeds>;
  guidancePositionCounts: Record<string, number>;
  guidanceRosterPlayers: readonly RosterGuidancePlayer[];
  market: {
    inflation: ReturnType<typeof calculateAuctionInflationState>;
  };
};

function getPlayerBidRecommendation(
  player: ProcessedPlayerValueRow,
  preferenceTags: readonly PlayerPoolPreferenceTag[],
  context: PlayerBidRecommendationContext
) {
  const playerPosition = normalizePositionValue(player.position);
  const recommendationNeedLevel = getBidRecommendationNeedLevel(
    player,
    context.guidanceStarterNeeds,
    context.guidanceBenchDepthNeeds
  );
  const recommendationBenchNeed = context.guidanceBenchDepthNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );
  const byeWeek = getByeWeekForNflTeam(player.nflTeam);

  return recommendRayJeffreyMaxBid({
    player: {
      playerName: player.originalPlayerName,
      position: player.position,
      nflTeam: player.nflTeam,
      lowValue: player.lowValue,
      highValue: player.highValue,
      averageValue: player.averageValue,
    },
    teamBudget: {
      remainingBudget: context.guidanceBudgetRow?.remainingBudget ?? null,
      rosterSpotsRemaining:
        context.guidanceBudgetRow?.rosterSpotsRemaining ?? null,
      maxBid: context.guidanceBudgetRow?.maxBid ?? null,
      averageDollarsPerOpenSlot:
        context.guidanceBudgetRow?.averageDollarsPerOpenSlot ?? null,
    },
    rosterGuidance: {
      needLevel: recommendationNeedLevel,
      benchNeed: recommendationBenchNeed?.needed ?? null,
      positionCount: context.guidancePositionCounts[playerPosition] ?? 0,
      targetPositionCount: recommendationBenchNeed?.target ?? null,
    },
    preference: getBidRecommendationPreference(preferenceTags),
    byeWeekRisk: {
      byeWeek,
      sameByeWeekRosterCount: getSameByeWeekRosterCount(
        byeWeek,
        context.guidanceRosterPlayers
      ),
    },
    market: context.market,
  });
}

type CurrentNominationRecommendation = 'BID' | 'WAIT' | 'PASS' | 'DO NOT BID';

function getCurrentNominationRecommendation(
  status: string | null,
  recommendation: ReturnType<typeof getPlayerBidRecommendation> | null
): CurrentNominationRecommendation {
  if (!recommendation) return 'WAIT';
  if (status && !isAvailablePlayerPoolStatus(status)) return 'DO NOT BID';
  if (recommendation.recommendedMaxBid <= 0) return 'DO NOT BID';
  if (recommendation.confidence === 'high') return 'BID';
  if (recommendation.confidence === 'medium') return 'WAIT';
  return 'PASS';
}

function getCurrentNominationRecommendationClass(
  recommendation: CurrentNominationRecommendation
) {
  if (recommendation === 'BID') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (recommendation === 'DO NOT BID') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (recommendation === 'PASS') {
    return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300';
  }

  return 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300';
}

type PurchaseValueResult = 'bargain' | 'fair' | 'overpay';
type BudgetPressureLevel = 'Low' | 'Medium' | 'High';
type MarketHeatLabel = 'Cold' | 'Normal' | 'Hot';
type IntelligencePosition = (typeof rosterGuidancePositionOrder)[number];

// League needs matrix uses simple starter targets only; bench depth stays in Roster Guidance.
const intelligenceStarterTargets = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DEF: 1,
} satisfies Record<IntelligencePosition, number>;

function getIntelligencePosition(
  position: string | null | undefined
): IntelligencePosition | null {
  const normalizedPosition = normalizePositionValue(position);
  const safePosition =
    normalizedPosition === 'DST' || normalizedPosition === 'D/ST'
      ? 'DEF'
      : normalizedPosition;

  return rosterGuidancePositionOrder.includes(
    safePosition as IntelligencePosition
  )
    ? (safePosition as IntelligencePosition)
    : null;
}

function getPositionCountsForTeam(
  teamId: AuctionTeamId,
  purchases: readonly AuctionWarRoomPurchaseRow[]
) {
  const counts = Object.fromEntries(
    rosterGuidancePositionOrder.map((position) => [position, 0])
  ) as Record<IntelligencePosition, number>;
  const addPosition = (position: string | null | undefined) => {
    const safePosition = getIntelligencePosition(position);
    if (safePosition) counts[safePosition] += 1;
  };

  mockAuctionKeepers
    .filter((keeper) => keeper.teamId === teamId)
    .forEach((keeper) => addPosition(keeper.position));

  purchases
    .filter((purchase) => purchase.teamId === teamId && purchase.status === 'active')
    .forEach((purchase) => addPosition(purchase.position));

  return counts;
}

function getPurchaseValueResult(
  purchasePrice: number,
  averageValue: number | null | undefined,
  position?: string | null
): PurchaseValueResult {
  const strategyMax = getRayKDefStrategyMax(position);

  if (typeof averageValue !== 'number' || !Number.isFinite(averageValue) || averageValue <= 0) {
    if (strategyMax !== null && purchasePrice > strategyMax) return 'overpay';
    return 'fair';
  }

  const difference = purchasePrice - averageValue;
  const threshold = Math.max(1, averageValue * 0.08);

  if (strategyMax !== null && purchasePrice <= strategyMax) {
    return difference <= -threshold ? 'bargain' : 'fair';
  }

  if (strategyMax !== null && purchasePrice > strategyMax) {
    return 'overpay';
  }

  if (difference <= -threshold) return 'bargain';
  if (difference >= threshold) return 'overpay';
  return 'fair';
}

function getMarketExpectedValueForPurchase(purchase: AuctionWarRoomPurchaseRow) {
  const playerValue = findPlayerValueRowForPurchase(purchase);
  const baseExpectedValue =
    playerValue?.averageValue ?? purchase.projectedValue ?? purchase.purchasePrice;
  const strategyMax = getRayKDefStrategyMax(purchase.position);

  if (strategyMax !== null && purchase.purchasePrice <= strategyMax) {
    return purchase.purchasePrice;
  }

  return Math.max(0, baseExpectedValue);
}

function getValueResultClass(result: PurchaseValueResult) {
  if (result === 'bargain') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (result === 'overpay') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300';
}

function getMarketHeatLabel(inflationPercent: number | null): MarketHeatLabel {
  if (inflationPercent === null) return 'Normal';
  if (inflationPercent >= 20) return 'Hot';
  if (inflationPercent <= -20) return 'Cold';
  return 'Normal';
}

function getMarketHeatClass(label: MarketHeatLabel) {
  if (label === 'Hot') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (label === 'Cold') {
    return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }

  return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
}

function formatSignedMoney(amount: number) {
  return `${amount >= 0 ? '+' : '-'}${formatMoney(Math.abs(amount))}`;
}

function formatInflationPercent(value: number | null) {
  return value === null ? 'N/A' : `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
}

function getBudgetPressureClass(pressure: BudgetPressureLevel) {
  if (pressure === 'High') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (pressure === 'Medium') {
    return 'border-yellow-600/20 bg-yellow-600/10 text-yellow-700 dark:text-yellow-300';
  }

  return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
}

function getBudgetPressureLevel({
  remainingBudget,
  rosterSpotsRemaining,
  maxBid,
  averageDollarsPerOpenSlot,
  missingStarterSlots,
}: {
  remainingBudget: number;
  rosterSpotsRemaining: number;
  maxBid: number;
  averageDollarsPerOpenSlot: number;
  missingStarterSlots: number;
}): BudgetPressureLevel {
  if (
    remainingBudget <= rosterSpotsRemaining ||
    maxBid <= 5 ||
    averageDollarsPerOpenSlot <= 2 ||
    (rosterSpotsRemaining >= 8 && averageDollarsPerOpenSlot <= 3) ||
    (missingStarterSlots >= 4 && maxBid <= 15)
  ) {
    return 'High';
  }

  if (
    maxBid <= 20 ||
    averageDollarsPerOpenSlot <= 5 ||
    rosterSpotsRemaining >= 10 ||
    missingStarterSlots >= 2
  ) {
    return 'Medium';
  }

  return 'Low';
}

function buildAuctionAdvisorPlayerValues(
  purchases: readonly AuctionWarRoomPurchaseRow[],
  isUsingSleeperPurchases: boolean,
  rosterPlayers: readonly RosterGuidancePlayer[]
): AuctionAdvisorPlayerValue[] {
  return localPlayerPoolRows.map((player) => {
    const preferenceTags = getPlayerPoolPreferenceTags(player);
    const status = getPlayerPoolDisplayStatus(
      player,
      purchases,
      isUsingSleeperPurchases
    );
    const byeWeek = getByeWeekForNflTeam(player.nflTeam);

    return {
      playerName: player.originalPlayerName,
      matchedPlayerName: player.matchedSleeperName,
      position: player.position,
      nflTeam: player.nflTeam,
      sleeperPlayerId: player.sleeperPlayerId,
      lowValue: player.lowValue,
      highValue: player.highValue,
      averageValue: player.averageValue,
      status,
      preference: getBidRecommendationPreference(preferenceTags),
      byeWeek,
      sameByeWeekRosterCount: getSameByeWeekRosterCount(
        byeWeek,
        rosterPlayers
      ),
      isTaken: !isAvailablePlayerPoolStatus(status),
    };
  });
}

function buildAuctionAdvisorPurchases(
  purchases: readonly AuctionWarRoomPurchaseRow[]
): AuctionAdvisorPurchase[] {
  return purchases.map((purchase) => {
    const playerValue = findPlayerValueRowForPurchase(purchase);

    return {
      playerName: purchase.playerName,
      position: purchase.position,
      nflTeam: purchase.nflTeam,
      purchasePrice: purchase.purchasePrice,
      projectedValue: purchase.projectedValue,
      lowValue: playerValue?.lowValue ?? null,
      highValue: playerValue?.highValue ?? null,
      averageValue: playerValue?.averageValue ?? null,
      source: purchase.source,
      status: purchase.status,
    };
  });
}

function buildAuctionAdvisorSleeperPurchases(
  purchases: readonly SleeperSnapshotPurchase[]
): AuctionAdvisorPurchase[] {
  return purchases.map((purchase) => ({
    playerName: purchase.playerName,
    position: purchase.position,
    nflTeam: purchase.nflTeam,
    purchasePrice: purchase.auctionPrice,
    projectedValue: null,
    source: 'sleeper',
    status: 'active',
  }));
}

function PreferenceBadge({ tag }: { tag: PlayerPoolPreferenceTag }) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${preferenceBadgeStyles[tag]}`}>
      {preferenceBadgeLabels[tag]}
    </span>
  );
}

const playerPoolPositionOptions = Array.from(
  new Set(
    localPlayerPoolRows
      .map((player) => player.position)
      .filter((position): position is string => Boolean(position))
  )
).sort();

const playerPoolMatchStatusOptions = Array.from(
  new Set(localPlayerPoolRows.map((player) => player.matchStatus))
).sort();

const playerPoolStatusOptions = sortPlayerPoolStatuses(Array.from(
  new Set(localPlayerPoolRows.map((player) => formatPlayerPoolStatus(player.status)))
));

function getTeam(teamId: AuctionTeamId | null) {
  if (!teamId) return null;
  return mockAuctionTeams.find((team) => team.id === teamId) ?? null;
}

function getTeamByRosterId(rosterId: number | null | undefined) {
  if (rosterId === null || rosterId === undefined) return null;
  return mockAuctionTeams.find((team) => team.rosterId === rosterId) ?? null;
}

function MockBadge() {
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${statusStyles.mock}`}>
      <Lock className="h-3.5 w-3.5" />
      Read Only
    </span>
  );
}

function SectionShell({
  title,
  eyebrow,
  icon: Icon,
  children,
  className = '',
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const headerContent = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600/10 text-orange-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
            {eyebrow}
          </p>
          <h2 className="text-xl font-black uppercase italic tracking-tight">
            {title}
          </h2>
        </div>
      </div>
      <MockBadge />
    </>
  );

  if (collapsible) {
    return (
      <details
        className={`group rounded-2xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-[#121212] ${className}`}
        {...(defaultOpen ? { open: true } : {})}
      >
        <summary className="flex cursor-pointer list-none flex-col gap-3 marker:hidden sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
          {headerContent}
        </summary>
        <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section className={`rounded-2xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-[#121212] ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {headerContent}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getStatusClass(status)}`}>
      {status}
    </span>
  );
}

type ByeWeekWatchRow = {
  id: string;
  playerName: string;
  nflTeam: string | null;
  source: 'Keeper' | 'Purchase';
  byeWeek: number | null;
};

const mockPurchaseRows: AuctionWarRoomPurchaseRow[] = mockAuctionPurchases.map(
  (purchase) => ({
    id: purchase.id,
    teamId: purchase.teamId,
    rosterId: purchase.rosterId,
    playerId: purchase.playerId,
    playerName: purchase.playerName,
    position: purchase.position,
    nflTeam: purchase.nflTeam,
    purchasePrice: purchase.purchasePrice,
    projectedValue: purchase.projectedValue,
    rayMaxBid: purchase.rayMaxBid,
    status: purchase.status,
    source: 'demo',
  })
);

function toSafePurchasePrice(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function buildSleeperPurchaseRows(
  purchases: readonly SleeperSnapshotPurchase[]
): AuctionWarRoomPurchaseRow[] {
  return purchases.flatMap((purchase, index) => {
    const team = getTeamByRosterId(purchase.rosterId);
    if (!team) return [];

    return [
      {
        id: `sleeper:${purchase.draftId ?? 'draft'}:${purchase.pickNo ?? index}:${purchase.playerId ?? normalizePlayerMatchValue(purchase.playerName)}`,
        teamId: team.id,
        rosterId: purchase.rosterId,
        playerId: purchase.playerId,
        playerName: purchase.playerName,
        position: purchase.position,
        nflTeam: purchase.nflTeam,
        purchasePrice: toSafePurchasePrice(purchase.auctionPrice),
        projectedValue: null,
        rayMaxBid: null,
        status: 'active' as const,
        source: 'sleeper' as const,
      },
    ];
  });
}

function buildManualPurchaseRows(
  sales: readonly ManualAuctionSale[]
): AuctionWarRoomPurchaseRow[] {
  return sales.map((sale) => {
    const playerValue = localPlayerPoolRows.find(
      (player) => player.rowNumber === sale.playerRowNumber
    );

    return {
      id: sale.id,
      teamId: sale.teamId,
      rosterId: sale.rosterId,
      playerId: sale.playerId,
      playerName: sale.playerName,
      position: sale.position,
      nflTeam: sale.nflTeam,
      purchasePrice: sale.salePrice,
      projectedValue: playerValue?.averageValue ?? null,
      rayMaxBid: null,
      status: 'active' as const,
      source: 'manual' as const,
    };
  });
}

function mergeManualPurchaseRows({
  basePurchaseRows,
  manualPurchaseRows,
}: {
  basePurchaseRows: readonly AuctionWarRoomPurchaseRow[];
  manualPurchaseRows: readonly AuctionWarRoomPurchaseRow[];
}) {
  if (manualPurchaseRows.length === 0) return [...basePurchaseRows];

  const manualPurchaseKeys = new Set(
    manualPurchaseRows.map(getPurchaseIdentityKey)
  );

  return [
    ...basePurchaseRows.filter(
      (purchase) => !manualPurchaseKeys.has(getPurchaseIdentityKey(purchase))
    ),
    ...manualPurchaseRows,
  ];
}

function getManualEntryPlayerSearchText(player: ProcessedPlayerValueRow) {
  return [
    player.originalPlayerName,
    player.matchedSleeperName,
    player.position,
    player.nflTeam,
  ]
    .filter(Boolean)
    .join(' ');
}

function getManualEntryPlayerMeta(player: ProcessedPlayerValueRow) {
  return [player.position, player.nflTeam, player.matchedSleeperName]
    .filter(Boolean)
    .join(' | ');
}

function scoreManualEntryPlayerSearch(
  player: ProcessedPlayerValueRow,
  normalizedQuery: string,
  queryTokens: readonly string[]
) {
  const originalName = normalizePlayerMatchValue(player.originalPlayerName);
  const matchedName = normalizePlayerMatchValue(player.matchedSleeperName);
  const searchableText = normalizePlayerMatchValue(
    getManualEntryPlayerSearchText(player)
  );

  if (!normalizedQuery) return 0;
  if (originalName === normalizedQuery || matchedName === normalizedQuery) {
    return 120;
  }

  if (
    originalName.startsWith(normalizedQuery) ||
    matchedName.startsWith(normalizedQuery)
  ) {
    return 100;
  }

  if (
    originalName.includes(normalizedQuery) ||
    matchedName.includes(normalizedQuery)
  ) {
    return 80;
  }

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => searchableText.includes(token))
  ) {
    return 60;
  }

  return 0;
}

function getManualEntryPlayerMatches(input: string, limit = 8) {
  const normalizedQuery = normalizePlayerMatchValue(input);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  if (!normalizedQuery) return [];

  return localPlayerPoolRows
    .map((player) => ({
      player,
      score: scoreManualEntryPlayerSearch(
        player,
        normalizedQuery,
        queryTokens
      ),
    }))
    .filter((result) => result.score > 0)
    .sort((firstResult, secondResult) => {
      if (secondResult.score !== firstResult.score) {
        return secondResult.score - firstResult.score;
      }

      return (
        (secondResult.player.averageValue ?? 0) -
          (firstResult.player.averageValue ?? 0) ||
        firstResult.player.originalPlayerName.localeCompare(
          secondResult.player.originalPlayerName
        )
      );
    })
    .slice(0, limit)
    .map((result) => result.player);
}

function getManualSalePriceValue(input: string) {
  const trimmedInput = input.trim();
  if (!trimmedInput) return null;

  const price = Number(trimmedInput);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function buildRayKDefStrategyWarnings(
  purchases: readonly AuctionWarRoomPurchaseRow[]
): RosterGuidanceWarning[] {
  return purchases.flatMap((purchase) => {
    if (purchase.status !== 'active') return [];

    const maxPrice = getRayKDefStrategyMax(purchase.position);
    if (maxPrice === null || purchase.purchasePrice <= maxPrice) return [];

    return [
      {
        id: `k-def-overpay:${purchase.id}`,
        title: `${purchase.playerName} K/DEF price check`,
        message: `${purchase.playerName} cost ${formatMoney(purchase.purchasePrice)}, above Ray’s ${normalizePositionValue(purchase.position)} value cap of ${formatMoney(maxPrice)}.`,
        severity: purchase.purchasePrice >= maxPrice + 4 ? 'danger' : 'watch',
      } satisfies RosterGuidanceWarning,
    ];
  });
}

function filterRayKDefOverspendingWarnings(
  warnings: readonly RosterGuidanceWarning[],
  rosterPlayers: readonly RosterGuidancePlayer[]
) {
  const kDefRosterWarningIds = new Set(
    rosterPlayers
      .filter((player) => isRayKDefStrategyPosition(player.position))
      .map((player) => `overspend:${player.id}`)
  );

  return warnings.filter((warning) => !kDefRosterWarningIds.has(warning.id));
}

function getRayKDefStrategyMessages(
  purchases: readonly AuctionWarRoomPurchaseRow[]
) {
  return purchases
    .filter((purchase) => purchase.status === 'active')
    .flatMap((purchase) => {
      const message = getRayKDefStrategyMessage(
        purchase.playerName,
        purchase.position,
        purchase.purchasePrice
      );

      return message ? [message] : [];
    });
}

const keeperCostByTeam = calculateKeeperCostByTeam(mockAuctionKeepers);

const guidanceTeam =
  mockAuctionTeams.find((team) => team.rosterId === 1) ??
  mockAuctionTeams[0] ??
  null;

function buildBudgetRows(purchases: readonly AuctionWarRoomPurchaseRow[]) {
  const purchaseSpendByTeam = calculatePurchaseSpendByTeam(purchases);
  const purchaseCountByTeam = purchases.reduce<Partial<Record<AuctionTeamId, number>>>(
    (counts, purchase) => {
      if (purchase.status === 'voided') return counts;
      counts[purchase.teamId] = (counts[purchase.teamId] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return mockAuctionTeams.map((team) => {
    const keeperCost = keeperCostByTeam[team.id] ?? 0;
    const purchaseSpend = purchaseSpendByTeam[team.id] ?? 0;
    const teamBudget = riverCityAuctionLeagueSettings.auctionBudgetPerTeam;
    const filledSlots = Math.min(
      team.rosterSlots.total,
      team.keeperIds.length + (purchaseCountByTeam[team.id] ?? 0)
    );
    const rosterSlots = {
      ...team.rosterSlots,
      filled: filledSlots,
      remaining: Math.max(0, team.rosterSlots.total - filledSlots),
      keeperSlotsUsed: team.keeperIds.length,
    };
    const budgetInput = {
      teamBudget,
      keeperCostTotal: keeperCost,
      spentBudget: purchaseSpend,
    };
    const totalSpent = calculateTotalSpent(budgetInput);
    const remainingBudget = calculateRemainingBudget(budgetInput);
    const rosterSpotsRemaining = calculateRosterSpotsRemaining(rosterSlots);
    const maxBid = calculateMaxBid(remainingBudget, rosterSpotsRemaining);
    const averageDollarsPerOpenSlot =
      calculateAverageDollarsPerOpenRosterSpot(
        remainingBudget,
        rosterSpotsRemaining
      );

    return {
      team: {
        ...team,
        teamBudget,
      },
      keeperCost,
      purchaseSpend,
      totalSpent,
      remainingBudget,
      rosterSpotsRemaining,
      maxBid,
      averageDollarsPerOpenSlot,
    };
  });
}

function buildGuidanceRosterPlayers(
  team: (typeof mockAuctionTeams)[number] | null,
  purchases: readonly AuctionWarRoomPurchaseRow[]
): RosterGuidancePlayer[] {
  if (team === null) return [];

  return [
    ...mockAuctionKeepers
      .filter((player) => player.teamId === team.id)
      .map((player) => ({
        id: player.id,
        playerName: player.playerName,
        position: player.position,
        nflTeam: player.nflTeam,
        cost: player.keeperCost,
        projectedValue: null,
        byeWeek: getByeWeekForNflTeam(player.nflTeam),
        source: 'Keeper' as const,
      })),
    ...purchases
      .filter((player) => player.teamId === team.id && player.status === 'active')
      .map((player) => ({
        id: player.id,
        playerName: player.playerName,
        position: player.position,
        nflTeam: player.nflTeam,
        cost: player.purchasePrice,
        projectedValue: player.projectedValue,
        byeWeek: getByeWeekForNflTeam(player.nflTeam),
        source: 'Purchase' as const,
      })),
  ];
}

const guidancePlayerValues: RosterGuidancePlayerValue[] = localPlayerPoolRows.map(
  (player) => ({
    playerName: player.originalPlayerName,
    matchedPlayerName: player.matchedSleeperName,
    position: player.position,
    averageValue: player.averageValue,
    highValue: player.highValue,
  })
);

function buildRosterByeWeekCounts(
  purchases: readonly AuctionWarRoomPurchaseRow[]
) {
  const rosterByeWeekRows: ByeWeekWatchRow[] = [
    ...mockAuctionKeepers.map((player) => ({
      id: player.id,
      playerName: player.playerName,
      nflTeam: player.nflTeam,
      source: 'Keeper' as const,
    })),
    ...purchases
      .filter((player) => player.status === 'active')
      .map((player) => ({
        id: player.id,
        playerName: player.playerName,
        nflTeam: player.nflTeam,
        source: 'Purchase' as const,
      })),
  ].map((player) => ({
    ...player,
    byeWeek: getByeWeekForNflTeam(player.nflTeam),
  }));

  return Array.from(
    rosterByeWeekRows.reduce(
      (countsByWeek, player) => {
        const byeWeekLabel = formatByeWeek(player.byeWeek);
        const currentGroup = countsByWeek.get(byeWeekLabel) ?? {
          byeWeek: player.byeWeek,
          label: byeWeekLabel,
          players: [] as ByeWeekWatchRow[],
        };

        currentGroup.players.push(player);
        countsByWeek.set(byeWeekLabel, currentGroup);
        return countsByWeek;
      },
      new Map<string, { byeWeek: number | null; label: string; players: ByeWeekWatchRow[] }>()
    ).values()
  ).sort((firstWeek, secondWeek) => {
    if (firstWeek.byeWeek === null) return 1;
    if (secondWeek.byeWeek === null) return -1;
    return firstWeek.byeWeek - secondWeek.byeWeek;
  });
}

type LocalAdvisorChatContext = {
  auctionAdvisorSummary: ReturnType<typeof buildAuctionAdvisorSummary>;
  guidanceOpenStarterNeeds: ReturnType<typeof calculateStarterNeeds>;
  guidanceOpenBenchDepthNeeds: ReturnType<typeof calculateBenchDepthNeeds>;
  guidanceWarnings: ReturnType<typeof calculateOverspendingWarnings>;
  rosterByeWeekCounts: ReturnType<typeof buildRosterByeWeekCounts>;
  visiblePlayerPoolRows: readonly ProcessedPlayerValueRow[];
  activePurchaseRows: readonly AuctionWarRoomPurchaseRow[];
  isUsingSleeperPurchases: boolean;
  bidRecommendationContext: PlayerBidRecommendationContext;
  guidanceBudgetRow: {
    maxBid: number;
    remainingBudget: number;
    rosterSpotsRemaining: number;
    averageDollarsPerOpenSlot: number;
  } | null;
  purchaseSourceLabel: string;
  purchaseSourceDetail: string;
  rayKDefStrategyMessages: readonly string[];
};

function getLocalAdvisorChatQuestionLabel(questionId: LocalAdvisorChatQuestionId) {
  return (
    localAdvisorChatQuestions.find((question) => question.id === questionId)
      ?.label ?? 'Ask Local Advisor'
  );
}

function formatAdvisorTarget(
  player: ReturnType<typeof buildAuctionAdvisorSummary>['bestValueOpportunities'][number]
) {
  return `${player.playerName} (${player.position ?? 'N/A'} ${player.nflTeam ?? 'N/A'}) | avg ${formatMoney(player.averageValue)} | max ${formatMoney(player.recommendedMaxBid)} | ${player.reason}`;
}

function buildLocalAdvisorChatAnswer(
  questionId: LocalAdvisorChatQuestionId,
  context: LocalAdvisorChatContext
): Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'> {
  const sourceMeta = `${context.purchaseSourceLabel} | ${context.purchaseSourceDetail}`;
  const topTargets = context.auctionAdvisorSummary.bestValueOpportunities;
  const openNeeds = [
    ...context.guidanceOpenStarterNeeds,
    ...context.guidanceOpenBenchDepthNeeds,
  ];
  const maxBidText = formatMoney(context.guidanceBudgetRow?.maxBid ?? null);

  if (questionId === 'target-next') {
    const bullets = topTargets.slice(0, 3).map(formatAdvisorTarget);

    return {
      summary:
        topTargets.length > 0
          ? `Target ${topTargets[0].playerName} first if the room stays at or below the current local cap.`
          : 'No clean target is standing out from the current local state.',
      recommendation:
        topTargets.length > 0
          ? `Keep the top target under ${formatMoney(topTargets[0].recommendedMaxBid)}.`
          : 'Refresh or review before nominating.',
      reasons:
        bullets.length > 0
          ? [...context.rayKDefStrategyMessages, ...bullets]
          : ['Refresh Sleeper purchases and review the Player Pool filters before bidding.'],
      warnings: context.auctionAdvisorSummary.avoidOverpayWarnings
        .slice(0, 2)
        .map((warning) => `${warning.severity.toUpperCase()} ${warning.area}: ${warning.message}`),
      meta: sourceMeta,
    };
  }

  if (questionId === 'positions-needed') {
    const bullets = openNeeds
      .slice(0, 5)
      .map((need) => `${need.label}: need ${need.needed} (${need.detail})`);

    return {
      summary:
        bullets.length > 0
          ? `The clearest needs are ${openNeeds
              .slice(0, 3)
              .map((need) => need.label)
              .join(', ')}.`
          : 'No urgent roster construction needs are showing from the current roster build.',
      recommendation:
        bullets.length > 0
          ? `Prioritize ${openNeeds[0]?.label ?? 'value'} until that need clears.`
          : 'Stay value-led and avoid forcing a position.',
      reasons:
        bullets.length > 0
          ? [...context.rayKDefStrategyMessages, ...bullets]
          : ['Stay value-led and avoid forcing a position without a price discount.'],
      warnings: context.auctionAdvisorSummary.avoidOverpayWarnings
        .filter((warning) => warning.area === 'roster' || warning.area === 'budget')
        .slice(0, 2)
        .map((warning) => `${warning.severity.toUpperCase()} ${warning.area}: ${warning.message}`),
      meta: `Current max bid ${maxBidText}`,
    };
  }

  if (questionId === 'overspending') {
    const warningBullets = context.auctionAdvisorSummary.avoidOverpayWarnings
      .filter(
        (warning) =>
          warning.area === 'budget' ||
          warning.area === 'overpay' ||
          warning.area === 'draft pace'
      )
      .map((warning) => `${warning.severity.toUpperCase()} ${warning.area}: ${warning.message}`);
    const guidanceBullets = context.guidanceWarnings
      .filter((warning) => warning.id.startsWith('overspend:'))
      .map((warning) => `${warning.severity.toUpperCase()}: ${warning.message}`);
    const bullets = [...warningBullets, ...guidanceBullets].slice(0, 5);

    return {
      summary:
        bullets.length > 0
          ? 'There are spending flags to keep visible before the next bid.'
          : 'No overspending flags are showing from the current local inputs.',
      recommendation:
        bullets.length > 0
          ? 'Slow down on price-chasing until the next target has a clear value case.'
          : `Keep bids under ${maxBidText}.`,
      reasons:
        bullets.length > 0
          ? [
              ...context.rayKDefStrategyMessages,
              'Spending read is based on current purchases, local values, and budget math.',
            ]
          : [
              ...context.rayKDefStrategyMessages,
              'Current local overspend checks did not flag a rostered player.',
            ],
      warnings:
        bullets.length > 0
          ? bullets
          : [`Keep bids under ${maxBidText} and preserve $1 for each open roster slot.`],
      meta: sourceMeta,
    };
  }

  if (questionId === 'bye-risk') {
    const riskyWeeks = context.rosterByeWeekCounts
      .filter((week) => week.byeWeek !== null && week.players.length >= 3)
      .sort((firstWeek, secondWeek) => secondWeek.players.length - firstWeek.players.length);
    const watchWeeks =
      riskyWeeks.length > 0
        ? riskyWeeks
        : context.rosterByeWeekCounts
            .filter((week) => week.byeWeek !== null && week.players.length >= 2)
            .sort((firstWeek, secondWeek) => secondWeek.players.length - firstWeek.players.length);
    const bullets = watchWeeks.slice(0, 5).map(
      (week) =>
        `Week ${week.label}: ${week.players.length} players (${week.players
          .map((player) => player.playerName)
          .join(', ')})`
    );

    return {
      summary:
        riskyWeeks.length > 0
          ? 'Yes. These bye weeks are crowded enough to check before adding another player.'
          : 'No major bye-week cluster is showing, but these are the weeks to watch.',
      recommendation:
        riskyWeeks.length > 0
          ? 'Check same-bye overlap before bidding on another player in these weeks.'
          : 'Use bye week as a tiebreaker, not a hard stop.',
      reasons:
        bullets.length > 0
          ? [...context.rayKDefStrategyMessages, ...bullets]
          : ['No bye-week risk is available from the current roster data yet.'],
      warnings: riskyWeeks.length > 0
        ? ['Adding another player in a crowded bye week can create avoidable lineup pressure.']
        : [],
      meta: sourceMeta,
    };
  }

  const bullets = topTargets.slice(0, 5).map(formatAdvisorTarget);

  return {
    summary:
      topTargets.length > 0
        ? 'These are the best values left from the current local Advisor read.'
        : 'No value targets are available from the current local Advisor read.',
    recommendation:
      topTargets.length > 0
        ? `Start with ${topTargets[0].playerName} at or below ${formatMoney(topTargets[0].recommendedMaxBid)}.`
        : 'Refresh Sleeper purchases or review filters if the board looks stale.',
    reasons:
      bullets.length > 0
        ? [...context.rayKDefStrategyMessages, ...bullets]
        : ['Refresh Sleeper purchases or review filters if the board looks stale.'],
    warnings: context.auctionAdvisorSummary.avoidOverpayWarnings
      .slice(0, 2)
      .map((warning) => `${warning.severity.toUpperCase()} ${warning.area}: ${warning.message}`),
    meta: `Current max bid ${maxBidText}`,
  };
}

function getLocalAdvisorPlayerIntent(input: string): LocalAdvisorPlayerIntent {
  const normalizedInput = normalizePlayerMatchValue(input);

  if (/\bnominate\b/.test(normalizedInput)) return 'nominate';
  if (/\bmax\b/.test(normalizedInput) || /\bcap\b/.test(normalizedInput)) {
    return 'max-bid';
  }
  if (/\bbid\b/.test(normalizedInput)) return 'bid';

  return 'lookup';
}

function getLocalAdvisorPlayerSearchText(input: string) {
  return normalizePlayerMatchValue(input)
    .replace(
      /\b(what|whats|is|my|the|a|an|for|on|should|do|i|we|ray|jeffrey|bid|max|cap|nominate|player|about|tell|me)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function getLocalAdvisorPlayerNames(player: ProcessedPlayerValueRow) {
  return [
    player.originalPlayerName,
    player.matchedSleeperName,
    player.matchedSearchName,
    player.appliedAlias,
  ]
    .map(normalizePlayerMatchValue)
    .filter(Boolean);
}

function getLocalAdvisorPlayerMatchScore(
  player: ProcessedPlayerValueRow,
  searchText: string
) {
  if (!searchText) return 0;

  const searchTokens = searchText.split(' ').filter(Boolean);
  const playerNames = getLocalAdvisorPlayerNames(player);

  return playerNames.reduce((bestScore, playerName) => {
    const playerTokens = playerName.split(' ').filter(Boolean);

    if (playerName === searchText) return Math.max(bestScore, 100);
    if (playerName.startsWith(searchText)) return Math.max(bestScore, 85);
    if (playerName.includes(searchText)) return Math.max(bestScore, 70);
    if (searchTokens.every((token) => playerTokens.includes(token))) {
      return Math.max(bestScore, 60);
    }
    if (searchTokens.every((token) => playerName.includes(token))) {
      return Math.max(bestScore, 45);
    }

    return bestScore;
  }, 0);
}

function findLocalAdvisorPlayerMatch(
  input: string,
  visiblePlayerPoolRows: readonly ProcessedPlayerValueRow[]
) {
  const searchText = getLocalAdvisorPlayerSearchText(input);
  const findBestMatch = (players: readonly ProcessedPlayerValueRow[]) =>
    players
      .map((player) => ({
        player,
        score: getLocalAdvisorPlayerMatchScore(player, searchText),
      }))
      .filter((match) => match.score > 0)
      .sort((firstMatch, secondMatch) => {
        if (secondMatch.score !== firstMatch.score) {
          return secondMatch.score - firstMatch.score;
        }

        return (
          getSortableNumber(secondMatch.player.averageValue) -
          getSortableNumber(firstMatch.player.averageValue)
        );
      })[0]?.player ?? null;

  return findBestMatch(visiblePlayerPoolRows) ?? findBestMatch(localPlayerPoolRows);
}

function getPreferenceLabel(tags: readonly PlayerPoolPreferenceTag[]) {
  return tags.length > 0
    ? tags.map((tag) => preferenceBadgeLabels[tag]).join(', ')
    : 'None';
}

function readApiString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readApiStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Protected Advisor API unavailable.';
}

function buildProtectedApiChatAnswer(
  payload: AdvisorChatApiResponse
): Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'> {
  const summary = readApiString(payload.answer);
  const recommendation = readApiString(payload.recommendation);

  if (!summary || !recommendation) {
    throw new Error('Protected Advisor API returned an incomplete answer.');
  }

  return {
    summary,
    recommendation,
    reasons: readApiStringArray(payload.reasons),
    warnings: readApiStringArray(payload.warnings),
    meta:
      payload.source === 'local-rule-based'
        ? 'Protected local API | local-rule-based'
        : 'Protected local API',
    sourceLabel: 'Protected local API',
  };
}

function buildLocalFallbackChatAnswer(
  answer: Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'>,
  errorMessage: string
): Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'> {
  return {
    ...answer,
    warnings: [`Protected API unavailable: ${errorMessage}`, ...answer.warnings],
    meta: answer.meta ? `Local fallback | ${answer.meta}` : 'Local fallback',
    sourceLabel: 'Local fallback',
  };
}

function buildLocalSessionChatAnswer(
  answer: Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'>
): Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'> {
  return {
    ...answer,
    meta: answer.meta
      ? `Local fallback | Manual session sales active | ${answer.meta}`
      : 'Local fallback | Manual session sales active',
    sourceLabel: 'Local fallback',
  };
}

function buildLocalAdvisorPlayerLookupAnswer(
  input: string,
  context: LocalAdvisorChatContext
): Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'> {
  const player = findLocalAdvisorPlayerMatch(
    input,
    context.visiblePlayerPoolRows
  );
  const sourceMeta = `${context.purchaseSourceLabel} | ${context.purchaseSourceDetail}`;

  if (!player) {
    return {
      summary: `I could not match "${input.trim()}" to a ${playerPoolValueSourceLabel} row.`,
      recommendation: 'Try a more specific player name.',
      reasons: [
        'Try a last name or full player name from the Player Pool.',
        `This local chat only searches ${playerPoolValueSourceLabel} already loaded in the War Room.`,
      ],
      warnings: ['No bid recommendation is available without a player match.'],
      meta: sourceMeta,
    };
  }

  const intent = getLocalAdvisorPlayerIntent(input);
  const preferenceTags = getPlayerPoolPreferenceTags(player);
  const recommendation = getPlayerBidRecommendation(
    player,
    preferenceTags,
    context.bidRecommendationContext
  );
  const status = getPlayerPoolDisplayStatus(
    player,
    context.activePurchaseRows,
    context.isUsingSleeperPurchases
  );
  const purchaseMatch = getPlayerPoolPurchaseMatch(
    player,
    context.activePurchaseRows
  );
  const byeWeek = getByeWeekForNflTeam(player.nflTeam);
  const preferenceLabel = getPreferenceLabel(preferenceTags);
  const valueRange = `${formatMoney(player.lowValue ?? null)}-${formatMoney(player.highValue ?? null)} / avg ${formatMoney(player.averageValue ?? null)}`;
  const warningBullets = [
    ...(!isAvailablePlayerPoolStatus(status)
      ? [`Status is ${status}.`]
      : []),
    ...recommendation.warnings.slice(0, 3),
  ];
  const reasonBullets = recommendation.reasons
    .slice(0, 3)
    .map((reason) => reason);
  const reasons = [
    `Value range: ${valueRange}`,
    `Ray max bid: ${formatMoney(recommendation.recommendedMaxBid)} (${recommendation.confidence} confidence)`,
    `Preference: ${preferenceLabel}`,
    `Status: ${status}`,
    `Bye week: ${formatByeWeek(byeWeek)}`,
    ...(purchaseMatch
      ? [
          getRayKDefStrategyMessage(
            purchaseMatch.playerName,
            purchaseMatch.position,
            purchaseMatch.purchasePrice
          ),
        ].filter((message): message is string => Boolean(message))
      : []),
    ...reasonBullets,
  ];
  const playerLabel = `${player.originalPlayerName} (${player.position ?? 'N/A'} ${player.nflTeam ?? 'N/A'})`;
  const isAvailable = isAvailablePlayerPoolStatus(status);
  const text =
    intent === 'nominate'
      ? isAvailable
        ? `${playerLabel} is nominee-eligible in the local read. Keep the nomination useful only if Ray/Jeffrey are comfortable with the ${formatMoney(recommendation.recommendedMaxBid)} cap.`
        : `${playerLabel} should not be nominated from this local read because the status is ${status}.`
      : intent === 'max-bid'
        ? `${playerLabel} has a local Ray max bid of ${formatMoney(recommendation.recommendedMaxBid)}.`
        : intent === 'bid'
          ? isAvailable
            ? `Bid on ${playerLabel} only up to ${formatMoney(recommendation.recommendedMaxBid)} from the current local math.`
            : `Do not bid on ${playerLabel} from this local read because the status is ${status}.`
          : `Here is the local read on ${playerLabel}.`;

  return {
    summary: text,
    recommendation: isAvailable
      ? `Do not exceed ${formatMoney(recommendation.recommendedMaxBid)}.`
      : `Do not bid unless the ${status} status is wrong.`,
    reasons,
    warnings: warningBullets,
    meta: sourceMeta,
  };
}

const currentHighTeam = getTeam(mockCurrentNomination.currentHighBidTeamId);
const currentNominationValue = mockAuctionPlayerValues.find(
  (player) => player.playerId === mockCurrentNomination.playerId
);

const readinessItems = [
  `${riverCityAuctionLeagueSettings.season} ${riverCityAuctionLeagueSettings.leagueName}`,
  `${riverCityAuctionLeagueSettings.teamCount} teams`,
  `${formatMoney(riverCityAuctionLeagueSettings.auctionBudgetPerTeam)} budget`,
  'Read-only local state',
  'Manual Sleeper refresh only',
  'No writes or polling',
  'No Trade Analyzer imports',
];

const importPrepSources = [
  {
    name: 'Historical auction sheets',
    status: 'Not connected',
    detail: 'Future source for prior season prices and draft-day context.',
  },
  {
    name: 'Keeper declarations',
    status: 'Local Demo Data',
    detail: 'Future source for locked keepers and keeper-cost validation.',
  },
  {
    name: 'Player values',
    status: playerPoolValueSourceShortLabel,
    detail: `Read-only ${playerPoolValueSourcePath} preview for projected values and Sleeper matching.`,
  },
  {
    name: 'Auction purchases',
    status: 'Local Demo Data',
    detail: 'Future source for sold players, purchase prices, and team budget updates.',
  },
];

const importPrepWarnings = [
  'No Excel parsing yet',
  'No Firestore writes',
  'Review before import',
];

export default function AuctionWarRoomClient() {
  const manualSalePlayerInputRef = useRef<HTMLInputElement | null>(null);
  const manualSalePriceInputRef = useRef<HTMLInputElement | null>(null);
  const [sleeperSnapshot, setSleeperSnapshot] =
    useState<SleeperSnapshotResponse | null>(null);
  const [sleeperSnapshotStatus, setSleeperSnapshotStatus] =
    useState<SleeperSnapshotLoadStatus>('idle');
  const [sleeperSnapshotError, setSleeperSnapshotError] =
    useState<string | null>(null);
  const [playerPoolSearch, setPlayerPoolSearch] = useState('');
  const [playerPoolPositionFilter, setPlayerPoolPositionFilter] = useState('all');
  const [playerPoolByeWeekFilter, setPlayerPoolByeWeekFilter] = useState('all');
  const [playerPoolMatchStatusFilter, setPlayerPoolMatchStatusFilter] = useState('all');
  const [playerPoolStatusFilter, setPlayerPoolStatusFilter] = useState('all');
  const [playerPoolPreferenceFilter, setPlayerPoolPreferenceFilter] =
    useState<PlayerPoolPreferenceFilter>('all');
  const [playerPoolSort, setPlayerPoolSort] = useState<PlayerPoolSortKey>('averageValue');
  const [selectedPlayerRowNumber, setSelectedPlayerRowNumber] =
    useState<number | null>(null);
  const [localAdvisorChatMessages, setLocalAdvisorChatMessages] = useState<
    LocalAdvisorChatMessage[]
  >([]);
  const [localAdvisorChatInput, setLocalAdvisorChatInput] = useState('');
  const [localAdvisorChatStatus, setLocalAdvisorChatStatus] =
    useState<AdvisorChatRequestStatus>('idle');
  const [localAdvisorChatError, setLocalAdvisorChatError] =
    useState<string | null>(null);
  const [manualAuctionSales, setManualAuctionSales] = useState<ManualAuctionSale[]>([]);
  const [manualSalePlayerInput, setManualSalePlayerInput] = useState('');
  const [
    manualSaleSelectedPlayerRowNumber,
    setManualSaleSelectedPlayerRowNumber,
  ] = useState<number | null>(null);
  const [manualSalePlayerSearchOpen, setManualSalePlayerSearchOpen] =
    useState(false);
  const [manualSaleHighlightedMatchIndex, setManualSaleHighlightedMatchIndex] =
    useState(0);
  const [manualSalePriceInput, setManualSalePriceInput] = useState('');
  const [manualSaleBuyerTeamId, setManualSaleBuyerTeamId] = useState<string>(
    guidanceTeam?.id ?? mockAuctionTeams[0]?.id ?? ''
  );
  const [manualSaleError, setManualSaleError] = useState<string | null>(null);
  const [manualSaleConfirmation, setManualSaleConfirmation] =
    useState<ManualAuctionSale | null>(null);

  const sleeperPurchases = sleeperSnapshot?.purchases ?? emptySleeperPurchases;
  const isUsingSleeperPurchases =
    sleeperSnapshotStatus === 'ready' && Boolean(sleeperSnapshot);
  const manualPurchaseRows = useMemo(
    () => buildManualPurchaseRows(manualAuctionSales),
    [manualAuctionSales]
  );
  const basePurchaseRows = useMemo(
    () =>
      isUsingSleeperPurchases
        ? buildSleeperPurchaseRows(sleeperPurchases)
        : manualAuctionSales.length > 0
          ? []
          : mockPurchaseRows,
    [isUsingSleeperPurchases, manualAuctionSales.length, sleeperPurchases]
  );
  const activePurchaseRows = useMemo(
    () =>
      mergeManualPurchaseRows({
        basePurchaseRows,
        manualPurchaseRows,
      }),
    [basePurchaseRows, manualPurchaseRows]
  );
  const manualSalePlayerMatches = useMemo(
    () => getManualEntryPlayerMatches(manualSalePlayerInput),
    [manualSalePlayerInput]
  );
  const manualSaleSelectedPlayer = useMemo(
    () =>
      manualSaleSelectedPlayerRowNumber === null
        ? null
        : localPlayerPoolRows.find(
            (player) => player.rowNumber === manualSaleSelectedPlayerRowNumber
          ) ?? null,
    [manualSaleSelectedPlayerRowNumber]
  );
  const manualSalePriceValue = getManualSalePriceValue(manualSalePriceInput);
  const manualSaleBuyerTeam = getTeam(manualSaleBuyerTeamId as AuctionTeamId);
  const isManualSalePriceValid = manualSalePriceValue !== null;
  const canRecordManualSale = Boolean(
    manualSaleSelectedPlayer &&
      isManualSalePriceValid &&
      manualSaleBuyerTeam
  );
  const safeManualSaleHighlightedMatchIndex =
    manualSalePlayerMatches.length === 0
      ? 0
      : Math.min(
          manualSaleHighlightedMatchIndex,
          manualSalePlayerMatches.length - 1
        );
  const manualSaleValidationMessage =
    manualSaleError ??
    (!manualSaleSelectedPlayer
      ? manualSalePlayerInput.trim()
        ? 'Select a player from the matching results.'
        : 'Search for a player to enable Record Sale.'
      : !isManualSalePriceValid
        ? 'Enter a valid non-negative sale price.'
        : !manualSaleBuyerTeam
          ? 'Choose a buying team.'
          : null);
  const manualSalePlayerAlreadyTaken = manualSaleSelectedPlayer
    ? getPlayerPoolPurchaseMatch(manualSaleSelectedPlayer, activePurchaseRows)
    : null;
  const hasManualAuctionSales = manualAuctionSales.length > 0;
  const rayKDefStrategyMessages = getRayKDefStrategyMessages(activePurchaseRows);
  const manualSalePlayerStrategyMessage =
    manualSaleSelectedPlayer && manualSalePriceValue !== null
      ? getRayKDefStrategyMessage(
          manualSaleSelectedPlayer.originalPlayerName,
          manualSaleSelectedPlayer.position ?? null,
          manualSalePriceValue
        )
      : null;
  const bidRecommendationPurchaseSamples = useMemo(
    () => buildBidRecommendationPurchaseSamples(activePurchaseRows),
    [activePurchaseRows]
  );
  const bidRecommendationMarket = useMemo(
    () => ({
      inflation: calculateAuctionInflationState(
        bidRecommendationPurchaseSamples
      ),
    }),
    [bidRecommendationPurchaseSamples]
  );
  const unmappedSleeperPurchaseCount = isUsingSleeperPurchases
    ? sleeperPurchases.filter(
        (purchase) => getTeamByRosterId(purchase.rosterId) === null
      ).length
    : 0;
  const purchaseSourceLabel = hasManualAuctionSales
    ? isUsingSleeperPurchases
      ? 'Manual Entry + Sleeper Snapshot'
      : 'Manual Entry'
    : isUsingSleeperPurchases
    ? 'Sleeper Snapshot'
    : 'Local Demo Data';
  const purchaseSourceDetail = hasManualAuctionSales
    ? isUsingSleeperPurchases
      ? `${manualAuctionSales.length} Manual Entry sales + ${basePurchaseRows.length} Sleeper Snapshot purchases${unmappedSleeperPurchaseCount > 0 ? `, ${unmappedSleeperPurchaseCount} unmapped` : ''}`
      : `${manualAuctionSales.length} Manual Entry sales, Local Demo Data suppressed`
    : isUsingSleeperPurchases
      ? `${activePurchaseRows.length} mapped Sleeper Snapshot purchases${unmappedSleeperPurchaseCount > 0 ? `, ${unmappedSleeperPurchaseCount} unmapped` : ''}`
      : `${activePurchaseRows.length} Local Demo Data purchases`;
  const budgetRows = useMemo(
    () => buildBudgetRows(activePurchaseRows),
    [activePurchaseRows]
  );
  const guidanceBudgetRow =
    guidanceTeam === null
      ? null
      : budgetRows.find((row) => row.team.id === guidanceTeam.id) ?? null;
  const guidanceRosterPlayers = useMemo(
    () => buildGuidanceRosterPlayers(guidanceTeam, activePurchaseRows),
    [activePurchaseRows]
  );
  const guidancePositionCounts = calculatePositionCounts(guidanceRosterPlayers);
  const guidancePositionCountRows = rosterGuidancePositionOrder.map((position) => ({
    position,
    count: guidancePositionCounts[position] ?? 0,
  }));
  const guidanceStarterNeeds = calculateStarterNeeds(guidancePositionCounts);
  const guidanceOpenStarterNeeds = guidanceStarterNeeds.filter(
    (need) => need.needed > 0
  );
  const guidanceBenchDepthNeeds = calculateBenchDepthNeeds(guidancePositionCounts);
  const guidanceOpenBenchDepthNeeds = guidanceBenchDepthNeeds.filter(
    (need) => need.needed > 0
  );
  const overspendingWarnings = filterRayKDefOverspendingWarnings(
    calculateOverspendingWarnings(guidanceRosterPlayers, guidancePlayerValues),
    guidanceRosterPlayers
  );
  const guidanceWarnings = [
    ...overspendingWarnings,
    ...buildRayKDefStrategyWarnings(activePurchaseRows),
    ...calculateByeWeekConcentrationWarnings(guidanceRosterPlayers),
    ...calculateMaxBidPressureWarnings({
      remainingBudget: guidanceBudgetRow?.remainingBudget ?? null,
      rosterSpotsRemaining: guidanceBudgetRow?.rosterSpotsRemaining ?? null,
      maxBid: guidanceBudgetRow?.maxBid ?? null,
      averageDollarsPerOpenSlot:
        guidanceBudgetRow?.averageDollarsPerOpenSlot ?? null,
    }),
  ];
  const bidRecommendationContext = {
    guidanceBudgetRow,
    guidanceStarterNeeds,
    guidanceBenchDepthNeeds,
    guidancePositionCounts,
    guidanceRosterPlayers,
    market: bidRecommendationMarket,
  };
  const rosterByeWeekCounts = useMemo(
    () => buildRosterByeWeekCounts(activePurchaseRows),
    [activePurchaseRows]
  );
  const playerPoolStatusFilterOptions = useMemo(() => {
    const statuses = new Set(playerPoolStatusOptions);
    if (isUsingSleeperPurchases) statuses.add('Sleeper Taken');
    if (hasManualAuctionSales) statuses.add('Manual Taken');
    return sortPlayerPoolStatuses(Array.from(statuses));
  }, [hasManualAuctionSales, isUsingSleeperPurchases]);
  const totalKeeperCost = budgetRows.reduce(
    (sum, row) => sum + row.keeperCost,
    0
  );
  const averageMaxBid =
    budgetRows.length > 0
      ? Math.round(
          budgetRows.reduce((sum, row) => sum + row.maxBid, 0) /
            budgetRows.length
        )
      : 0;
  const dashboardCards = [
    {
      label: 'Season',
      value: String(riverCityAuctionLeagueSettings.season),
      detail: riverCityAuctionLeagueSettings.leagueName,
      icon: Shield,
    },
    {
      label: 'League Budget',
      value: formatMoney(riverCityAuctionLeagueSettings.totalLeagueBudget),
      detail: `${riverCityAuctionLeagueSettings.teamCount} teams x ${formatMoney(riverCityAuctionLeagueSettings.auctionBudgetPerTeam)}`,
      icon: DollarSign,
    },
    {
      label: 'Keeper Cost',
      value: formatMoney(totalKeeperCost),
      detail: `${mockAuctionKeepers.length} locked keepers`,
      icon: ClipboardList,
    },
    {
      label: 'Avg Max Bid',
      value: formatMoney(averageMaxBid),
      detail: purchaseSourceDetail,
      icon: BarChart3,
    },
  ];

  const filteredPlayerPoolRows = useMemo(() => {
    const searchNeedle = normalizeFilterValue(playerPoolSearch);
    const filteredRows = localPlayerPoolRows.filter((player) => {
      const playerName = normalizeFilterValue(player.originalPlayerName);
      const sleeperName = normalizeFilterValue(player.matchedSleeperName);
      const playerStatus = getPlayerPoolDisplayStatus(
        player,
        activePurchaseRows,
        isUsingSleeperPurchases
      );
      const playerPreferenceTags = getPlayerPoolPreferenceTags(player);
      const playerByeWeek = getByeWeekForNflTeam(player.nflTeam);
      const playerMatchesSearch =
        !searchNeedle ||
        playerName.includes(searchNeedle) ||
        sleeperName.includes(searchNeedle);
      const playerMatchesPosition =
        playerPoolPositionFilter === 'all' ||
        player.position === playerPoolPositionFilter;
      const playerMatchesByeWeek =
        playerPoolByeWeekFilter === 'all' ||
        (playerPoolByeWeekFilter === 'unknown' && playerByeWeek === null) ||
        String(playerByeWeek) === playerPoolByeWeekFilter;
      const playerMatchesMatchStatus =
        playerPoolMatchStatusFilter === 'all' ||
        player.matchStatus === playerPoolMatchStatusFilter;
      const playerMatchesStatus =
        playerPoolStatusFilter === 'all' ||
        (playerPoolStatusFilter === 'available' &&
          isAvailablePlayerPoolStatus(playerStatus)) ||
        (playerPoolStatusFilter === 'taken' &&
          !isAvailablePlayerPoolStatus(playerStatus)) ||
        (playerPoolStatusFilter.startsWith('status:') &&
          playerStatus === playerPoolStatusFilter.slice('status:'.length));
      const playerMatchesPreference =
        playerPoolPreferenceFilter === 'all' ||
        playerPreferenceTags.includes(playerPoolPreferenceFilter);

      return (
        playerMatchesSearch &&
        playerMatchesPosition &&
        playerMatchesByeWeek &&
        playerMatchesMatchStatus &&
        playerMatchesStatus &&
        playerMatchesPreference
      );
    });

    return sortPlayerPoolRows(filteredRows, playerPoolSort);
  }, [
    activePurchaseRows,
    isUsingSleeperPurchases,
    playerPoolByeWeekFilter,
    playerPoolMatchStatusFilter,
    playerPoolPositionFilter,
    playerPoolPreferenceFilter,
    playerPoolSearch,
    playerPoolSort,
    playerPoolStatusFilter,
  ]);

  const hasActivePlayerPoolFilters =
    playerPoolSearch.trim() !== '' ||
    playerPoolPositionFilter !== 'all' ||
    playerPoolByeWeekFilter !== 'all' ||
    playerPoolMatchStatusFilter !== 'all' ||
    playerPoolPreferenceFilter !== 'all' ||
    playerPoolStatusFilter !== 'all';
  const visiblePlayerPoolRows = hasActivePlayerPoolFilters
    ? filteredPlayerPoolRows
    : filteredPlayerPoolRows.slice(0, playerPoolInitialDisplayLimit);
  const isPlayerPoolLimited =
    visiblePlayerPoolRows.length < filteredPlayerPoolRows.length;
  const selectedPlayer =
    selectedPlayerRowNumber === null
      ? null
      : localPlayerPoolRows.find(
          (player) => player.rowNumber === selectedPlayerRowNumber
        ) ?? null;
  const selectedPlayerPreferenceTags = selectedPlayer
    ? getPlayerPoolPreferenceTags(selectedPlayer)
    : [];
  const selectedPlayerByeWeek = selectedPlayer
    ? getByeWeekForNflTeam(selectedPlayer.nflTeam)
    : null;
  const selectedPlayerPurchaseMatch = selectedPlayer
    ? getPlayerPoolPurchaseMatch(selectedPlayer, activePurchaseRows)
    : null;
  const selectedPlayerStatus = selectedPlayer
    ? getPlayerPoolDisplayStatus(
        selectedPlayer,
        activePurchaseRows,
        isUsingSleeperPurchases
      )
    : null;
  const selectedPlayerRecommendation = selectedPlayer
    ? getPlayerBidRecommendation(
        selectedPlayer,
        selectedPlayerPreferenceTags,
        bidRecommendationContext
      )
    : null;
  const currentNominationRecommendation = getCurrentNominationRecommendation(
    selectedPlayerStatus,
    selectedPlayerRecommendation
  );
  const currentNominationManualBidValue =
    selectedPlayer &&
    manualSaleSelectedPlayer?.rowNumber === selectedPlayer.rowNumber
      ? manualSalePriceValue
      : null;
  const currentNominationShortReason = selectedPlayerPurchaseMatch
    ? `${selectedPlayerPurchaseMatch.playerName} is already marked sold via ${formatPurchaseSourceLabel(selectedPlayerPurchaseMatch.source)}.`
    : currentNominationManualBidValue !== null &&
        selectedPlayerRecommendation &&
        currentNominationManualBidValue >
          selectedPlayerRecommendation.recommendedMaxBid
      ? `Current input is above Ray max by ${formatMoney(currentNominationManualBidValue - selectedPlayerRecommendation.recommendedMaxBid)}.`
      : selectedPlayerRecommendation?.reasons[0] ??
        selectedPlayerRecommendation?.warnings[0] ??
        'Select a player to see the local bid read.';
  const bestRemainingValueRows = localPlayerPoolRows
    .flatMap((player) => {
      const status = getPlayerPoolDisplayStatus(
        player,
        activePurchaseRows,
        isUsingSleeperPurchases
      );
      if (!isAvailablePlayerPoolStatus(status)) return [];

      const preferenceTags = getPlayerPoolPreferenceTags(player);
      const recommendation = getPlayerBidRecommendation(
        player,
        preferenceTags,
        bidRecommendationContext
      );
      const averageValue =
        typeof player.averageValue === 'number' &&
        Number.isFinite(player.averageValue)
          ? player.averageValue
          : null;
      if (averageValue === null && recommendation.recommendedMaxBid <= 0) {
        return [];
      }

      const valueGap =
        averageValue === null
          ? null
          : recommendation.recommendedMaxBid - averageValue;
      const preferenceBoost =
        preferenceTags.includes('target')
          ? 6
          : preferenceTags.includes('watch')
            ? 3
            : preferenceTags.includes('fade')
              ? -12
              : 0;

      return [
        {
          player,
          preferenceTags,
          recommendation,
          averageValue,
          valueGap,
          score:
            (averageValue ?? 0) +
            (valueGap ?? 0) * 0.5 +
            preferenceBoost,
        },
      ];
    })
    .sort((firstRow, secondRow) => {
      if (secondRow.score !== firstRow.score) {
        return secondRow.score - firstRow.score;
      }

      return firstRow.player.originalPlayerName.localeCompare(
        secondRow.player.originalPlayerName
      );
    })
    .slice(0, 8);
  const marketHeatRows = rosterGuidancePositionOrder.map((position) => {
    const positionPurchases = activePurchaseRows.filter(
      (purchase) =>
        purchase.status === 'active' &&
        getIntelligencePosition(purchase.position) === position
    );
    const expectedTotal = positionPurchases.reduce((sum, purchase) => {
      return sum + getMarketExpectedValueForPurchase(purchase);
    }, 0);
    const actualSpent = positionPurchases.reduce(
      (sum, purchase) => sum + purchase.purchasePrice,
      0
    );
    const inflationPercent =
      expectedTotal > 0
        ? ((actualSpent - expectedTotal) / expectedTotal) * 100
        : null;
    const heatLabel = getMarketHeatLabel(inflationPercent);

    return {
      position,
      expectedTotal,
      actualSpent,
      inflationPercent,
      heatLabel,
    };
  });
  const teamIntelligenceRows = budgetRows.map((row) => {
    const positionCounts = getPositionCountsForTeam(
      row.team.id,
      activePurchaseRows
    );
    const needs = rosterGuidancePositionOrder.map((position) => {
      const target = intelligenceStarterTargets[position];
      const current = positionCounts[position];
      return {
        position,
        current,
        target,
        needed: Math.max(0, target - current),
      };
    });
    const missingStarterSlots = needs.reduce(
      (sum, need) => sum + need.needed,
      0
    );
    const pressure = getBudgetPressureLevel({
      remainingBudget: row.remainingBudget,
      rosterSpotsRemaining: row.rosterSpotsRemaining,
      maxBid: row.maxBid,
      averageDollarsPerOpenSlot: row.averageDollarsPerOpenSlot,
      missingStarterSlots,
    });

    return {
      teamId: row.team.id,
      needs,
      missingStarterSlots,
      pressure,
    };
  });
  const teamIntelligenceById = new Map(
    teamIntelligenceRows.map((row) => [row.teamId, row])
  );
  const draftTimelineRows = activePurchaseRows
    .filter((purchase) => purchase.status === 'active')
    .map((purchase, index) => {
      const playerValue = findPlayerValueRowForPurchase(purchase);
      const averageValue = playerValue?.averageValue ?? null;
      const valueResult = getPurchaseValueResult(
        purchase.purchasePrice,
        averageValue,
        purchase.position
      );
      const strategyMessage = getRayKDefStrategyMessage(
        purchase.playerName,
        purchase.position,
        purchase.purchasePrice
      );
      const manualSale = manualAuctionSales.find(
        (sale) => sale.id === purchase.id
      );

      return {
        id: purchase.id,
        playerName: purchase.playerName,
        position: getIntelligencePosition(purchase.position),
        price: purchase.purchasePrice,
        buyer:
          getTeam(purchase.teamId)?.teamName ??
          getTeamByRosterId(purchase.rosterId)?.teamName ??
          'Unknown',
        source: formatPurchaseSourceLabel(purchase.source),
        time: manualSale
          ? formatChatTimestamp(manualSale.recordedAt)
          : purchase.source === 'sleeper'
            ? 'Sleeper'
            : 'Demo',
        sortOrder: manualSale
          ? Date.parse(manualSale.recordedAt)
          : purchase.source === 'sleeper'
            ? 1_000_000 + index
            : index,
        averageValue,
        valueResult,
        strategyMessage,
      };
    })
    .sort((firstRow, secondRow) => secondRow.sortOrder - firstRow.sortOrder)
    .slice(0, 14);
  const latestDraftSale = draftTimelineRows[0] ?? null;
  const latestSaleMarketHeat =
    latestDraftSale?.position === null || latestDraftSale === null
      ? null
      : marketHeatRows.find(
          (row) => row.position === latestDraftSale.position
        ) ?? null;
  const latestSaleReaction = latestDraftSale
    ? {
        result: latestDraftSale.valueResult,
        marketEffect:
          latestDraftSale.strategyMessage
            ? latestDraftSale.strategyMessage
            : latestSaleMarketHeat?.heatLabel === 'Hot'
            ? `${latestDraftSale.position} is running hot at ${formatInflationPercent(latestSaleMarketHeat.inflationPercent)}.`
            : latestSaleMarketHeat?.heatLabel === 'Cold'
              ? `${latestDraftSale.position} prices are still cold at ${formatInflationPercent(latestSaleMarketHeat.inflationPercent)}.`
              : `${latestDraftSale.position ?? 'Market'} is near normal pricing.`,
        nextAction:
          latestDraftSale.valueResult === 'overpay'
            ? 'Let the room chase; nominate from a different need if possible.'
            : latestDraftSale.valueResult === 'bargain'
              ? 'Check the radar for the next similar value before the room adjusts.'
              : latestDraftSale.strategyMessage
                ? 'K/DEF slot value is fine; keep chasing discounts elsewhere.'
                : 'Keep Ray max bids firm and wait for the next clear gap.',
      }
    : null;
  const resetPlayerPoolFilters = () => {
    setPlayerPoolSearch('');
    setPlayerPoolPositionFilter('all');
    setPlayerPoolByeWeekFilter('all');
    setPlayerPoolMatchStatusFilter('all');
    setPlayerPoolPreferenceFilter('all');
    setPlayerPoolStatusFilter('all');
    setPlayerPoolSort('averageValue');
  };
  const focusManualSalePlayerSearch = () => {
    window.requestAnimationFrame(() => {
      manualSalePlayerInputRef.current?.focus();
    });
  };
  const focusManualSalePriceInput = () => {
    window.requestAnimationFrame(() => {
      manualSalePriceInputRef.current?.focus();
      manualSalePriceInputRef.current?.select();
    });
  };
  const selectManualSalePlayer = (player: ProcessedPlayerValueRow) => {
    setSelectedPlayerRowNumber(player.rowNumber);
    setManualSaleSelectedPlayerRowNumber(player.rowNumber);
    setManualSalePlayerInput(player.originalPlayerName);
    setManualSalePlayerSearchOpen(false);
    setManualSaleHighlightedMatchIndex(0);
    setManualSaleError(null);
    focusManualSalePriceInput();
  };
  const clearManualSalePlayer = () => {
    setManualSaleSelectedPlayerRowNumber(null);
    setManualSalePlayerInput('');
    setManualSalePlayerSearchOpen(false);
    setManualSaleHighlightedMatchIndex(0);
    setManualSaleError(null);
  };
  const clearManualSalePlayerAndFocus = () => {
    clearManualSalePlayer();
    focusManualSalePlayerSearch();
  };
  const handleManualSalePlayerInputChange = (value: string) => {
    setManualSalePlayerInput(value);
    setManualSaleSelectedPlayerRowNumber(null);
    setManualSalePlayerSearchOpen(value.trim().length > 0);
    setManualSaleHighlightedMatchIndex(0);
    setManualSaleError(null);
  };
  const handleManualSalePlayerKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setManualSalePlayerSearchOpen(manualSalePlayerMatches.length > 0);
      setManualSaleHighlightedMatchIndex((currentIndex) =>
        manualSalePlayerMatches.length === 0
          ? 0
          : Math.min(currentIndex + 1, manualSalePlayerMatches.length - 1)
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setManualSalePlayerSearchOpen(manualSalePlayerMatches.length > 0);
      setManualSaleHighlightedMatchIndex((currentIndex) =>
        manualSalePlayerMatches.length === 0
          ? 0
          : Math.max(currentIndex - 1, 0)
      );
      return;
    }

    if (
      event.key === 'Enter' &&
      manualSalePlayerSearchOpen &&
      manualSalePlayerMatches.length > 0
    ) {
      event.preventDefault();
      selectManualSalePlayer(
        manualSalePlayerMatches[safeManualSaleHighlightedMatchIndex]
      );
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (manualSalePlayerSearchOpen) {
        setManualSalePlayerSearchOpen(false);
        return;
      }

      if (manualSalePlayerInput || manualSaleSelectedPlayer) {
        clearManualSalePlayer();
      }
    }
  };
  const recordManualSale = () => {
    const player = manualSaleSelectedPlayer;
    const team = manualSaleBuyerTeam;
    const salePrice = manualSalePriceValue;

    if (!player) {
      setManualSaleError(
        manualSalePlayerInput.trim()
          ? 'Select a player from the matching results before recording the sale.'
          : 'Search for and select a player before recording the sale.'
      );
      return;
    }

    if (salePrice === null) {
      setManualSaleError('Enter a valid non-negative sale price.');
      return;
    }

    if (!team) {
      setManualSaleError('Choose a buying team.');
      return;
    }

    const recordedAt = new Date().toISOString();
    const sale: ManualAuctionSale = {
      id: `manual-sale-${recordedAt}-${player.rowNumber}`,
      playerRowNumber: player.rowNumber,
      playerId: player.sleeperPlayerId ?? null,
      playerName: player.originalPlayerName,
      matchedSleeperName: player.matchedSleeperName ?? null,
      position: player.position ?? null,
      nflTeam: player.nflTeam ?? null,
      salePrice: Math.max(0, Math.round(salePrice)),
      teamId: team.id,
      rosterId: team.rosterId,
      teamName: team.teamName,
      managerName: team.managerName,
      recordedAt,
    };

    setManualAuctionSales((previousSales) => [...previousSales, sale]);
    clearManualSalePlayer();
    setManualSalePriceInput('');
    setManualSaleError(null);
    setManualSaleConfirmation(sale);
    setSelectedPlayerRowNumber(player.rowNumber);
    focusManualSalePlayerSearch();
  };
  const undoLastManualSale = () => {
    const nextSales = manualAuctionSales.slice(0, -1);
    setManualAuctionSales(nextSales);
    setManualSaleConfirmation(nextSales.at(-1) ?? null);
    setManualSaleError(null);
  };
  const refreshSleeperSnapshot = async () => {
    setSleeperSnapshotStatus('loading');
    setSleeperSnapshotError(null);

    try {
      const response = await fetch('/api/auction/sleeper-snapshot?season=2026', {
        cache: 'no-store',
      });
      const payload = (await response.json()) as SleeperSnapshotResponse;
      setSleeperSnapshot(payload);

      if (!response.ok) {
        setSleeperSnapshotStatus('error');
        setSleeperSnapshotError(
          payload.error ?? 'Unable to refresh Sleeper purchases.'
        );
        return;
      }

      setSleeperSnapshotStatus('ready');
    } catch (error) {
      console.error('Sleeper snapshot refresh failed:', error);
      setSleeperSnapshotStatus('error');
      setSleeperSnapshotError('Unable to refresh Sleeper purchases.');
    }
  };

  const sleeperPurchaseCount =
    sleeperSnapshot?.counts?.purchases ?? sleeperPurchases.length;
  const sleeperTotalDollarsSpent = sleeperPurchases.reduce(
    (sum, purchase) => sum + (purchase.auctionPrice ?? 0),
    0
  );
  const sleeperRecentPurchases = [...sleeperPurchases]
    .sort((firstPurchase, secondPurchase) => {
      const firstPickNo = firstPurchase.pickNo ?? -1;
      const secondPickNo = secondPurchase.pickNo ?? -1;
      return secondPickNo - firstPickNo;
    })
    .slice(0, 6);
  const sleeperSnapshotWarnings = [
    ...(sleeperSnapshot?.warnings ?? []),
    ...(isUsingSleeperPurchases && unmappedSleeperPurchaseCount > 0
      ? [`${unmappedSleeperPurchaseCount} Sleeper purchases could not be mapped to active River City rosters.`]
      : []),
    ...(sleeperSnapshotError ? [sleeperSnapshotError] : []),
  ];
  const sleeperSnapshotEmptyMessage =
    sleeperSnapshotStatus === 'loading'
      ? 'Loading Sleeper purchases...'
      : sleeperSnapshotStatus === 'error'
        ? 'Sleeper purchases unavailable.'
        : sleeperSnapshot
          ? 'Sleeper returned no purchases.'
          : 'No Sleeper snapshot loaded.';
  const sleeperSnapshotSourceMessage = isUsingSleeperPurchases
    ? `Budget, roster, bye, and taken-status views are using ${purchaseSourceDetail}.`
    : hasManualAuctionSales
      ? 'Budget, roster, bye, and taken-status views are using Manual Entry sales with Local Demo Data suppressed.'
      : 'Budget, roster, bye, and taken-status views are using Local Demo Data until Manual Entry or a Sleeper Snapshot loads.';
  const auctionAdvisorSummary = buildAuctionAdvisorSummary({
    playerValues: buildAuctionAdvisorPlayerValues(
      activePurchaseRows,
      isUsingSleeperPurchases,
      guidanceRosterPlayers
    ),
    activePurchaseSource: hasManualAuctionSales
      ? 'manual'
      : isUsingSleeperPurchases
        ? 'sleeper'
        : 'demo',
    teamBudget: guidanceBudgetRow
      ? {
          teamName: guidanceBudgetRow.team.teamName,
          teamBudget: guidanceBudgetRow.team.teamBudget,
          keeperCost: guidanceBudgetRow.keeperCost,
          totalSpent: guidanceBudgetRow.totalSpent,
          remainingBudget: guidanceBudgetRow.remainingBudget,
          rosterSpotsRemaining: guidanceBudgetRow.rosterSpotsRemaining,
          maxBid: guidanceBudgetRow.maxBid,
          averageDollarsPerOpenSlot:
            guidanceBudgetRow.averageDollarsPerOpenSlot,
        }
      : null,
    rosterGuidance: {
      starterNeeds: guidanceStarterNeeds,
      benchDepthNeeds: guidanceBenchDepthNeeds,
      warnings: guidanceWarnings,
      positionCounts: guidancePositionCounts,
    },
    preferences: {
      targetPlayerNames,
      fadePlayerNames,
      watchlistPlayerNames,
    },
    byeWeekRisks: {
      maxSameByeWeekRosterCount: Math.max(
        0,
        ...rosterByeWeekCounts.map((week) => week.players.length)
      ),
      warnings: guidanceWarnings.map((warning) => warning.message),
    },
    activePurchases: buildAuctionAdvisorPurchases(activePurchaseRows),
    sleeperSnapshotPurchases: isUsingSleeperPurchases
      ? buildAuctionAdvisorSleeperPurchases(sleeperPurchases)
      : [],
  });
  const localAdvisorChatContext: LocalAdvisorChatContext = {
    auctionAdvisorSummary,
    guidanceOpenStarterNeeds,
    guidanceOpenBenchDepthNeeds,
    guidanceWarnings,
    rosterByeWeekCounts,
    visiblePlayerPoolRows,
    activePurchaseRows,
    isUsingSleeperPurchases,
    bidRecommendationContext,
    guidanceBudgetRow,
    purchaseSourceLabel,
    purchaseSourceDetail,
    rayKDefStrategyMessages,
  };
  const requestProtectedAdvisorChatAnswer = async (
    questionText: string,
    selectedPlayerName?: string
  ) => {
    const response = await fetch('/api/auction/advisor-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        question: questionText,
        ...(selectedPlayerName ? { selectedPlayerName } : {}),
      }),
    });
    let payload: AdvisorChatApiResponse = {};

    try {
      payload = (await response.json()) as AdvisorChatApiResponse;
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(
        readApiString(payload.error) || 'Protected Advisor API request failed.'
      );
    }

    return buildProtectedApiChatAnswer(payload);
  };
  const getAdvisorApiSelectedPlayerName = (questionText: string) => {
    const matchedPlayer = findLocalAdvisorPlayerMatch(
      questionText,
      localAdvisorChatContext.visiblePlayerPoolRows
    );

    if (matchedPlayer) return matchedPlayer.originalPlayerName;

    const searchText = getLocalAdvisorPlayerSearchText(questionText);
    const intent = getLocalAdvisorPlayerIntent(questionText);

    if (!searchText && intent !== 'lookup' && selectedPlayer) {
      return selectedPlayer.originalPlayerName;
    }

    return undefined;
  };
  const appendLocalAdvisorChatMessages = (
    questionText: string,
    answer: Omit<LocalAdvisorChatMessage, 'id' | 'question' | 'timestamp'>,
    messageKey: string
  ) => {
    setLocalAdvisorChatMessages((previousMessages) => {
      const messageIndex = previousMessages.length;

      return [
        ...previousMessages,
        {
          id: `advisor-${messageKey}-${messageIndex}`,
          question: questionText,
          timestamp: new Date().toISOString(),
          ...answer,
          sourceLabel: answer.sourceLabel ?? 'Local fallback',
        },
      ].slice(-8);
    });
  };
  const askAdvisorWithProtectedApi = async ({
    questionText,
    messageKey,
    selectedPlayerName,
    buildFallbackAnswer,
  }: {
    questionText: string;
    messageKey: string;
    selectedPlayerName?: string;
    buildFallbackAnswer: () => Omit<
      LocalAdvisorChatMessage,
      'id' | 'question' | 'timestamp'
    >;
  }) => {
    if (localAdvisorChatStatus === 'loading') return;

    if (hasManualAuctionSales) {
      appendLocalAdvisorChatMessages(
        questionText,
        buildLocalSessionChatAnswer(buildFallbackAnswer()),
        messageKey
      );
      setLocalAdvisorChatError(null);
      setLocalAdvisorChatStatus('idle');
      return;
    }

    setLocalAdvisorChatStatus('loading');
    setLocalAdvisorChatError(null);

    try {
      const apiAnswer = await requestProtectedAdvisorChatAnswer(
        questionText,
        selectedPlayerName
      );
      appendLocalAdvisorChatMessages(questionText, apiAnswer, messageKey);
      setLocalAdvisorChatStatus('idle');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const fallbackAnswer = buildLocalFallbackChatAnswer(
        buildFallbackAnswer(),
        errorMessage
      );

      appendLocalAdvisorChatMessages(questionText, fallbackAnswer, messageKey);
      setLocalAdvisorChatError(
        'Protected local API unavailable. Showing local fallback.'
      );
      setLocalAdvisorChatStatus('error');
    }
  };
  const askLocalAdvisor = async (questionId: LocalAdvisorChatQuestionId) => {
    const questionText = getLocalAdvisorChatQuestionLabel(questionId);

    await askAdvisorWithProtectedApi({
      questionText,
      messageKey: questionId,
      buildFallbackAnswer: () =>
        buildLocalAdvisorChatAnswer(questionId, localAdvisorChatContext),
    });
  };
  const askLocalAdvisorPlayer = async () => {
    const questionText = localAdvisorChatInput.trim();

    if (!questionText) return;

    const selectedPlayerName = getAdvisorApiSelectedPlayerName(questionText);

    setLocalAdvisorChatInput('');
    await askAdvisorWithProtectedApi({
      questionText,
      messageKey: 'player-lookup',
      selectedPlayerName,
      buildFallbackAnswer: () =>
        buildLocalAdvisorPlayerLookupAnswer(
          questionText,
          localAdvisorChatContext
        ),
    });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-4 font-sans text-black selection:bg-orange-600 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/95">
        <div className="mx-auto grid max-w-[1800px] gap-2 px-3 py-2 sm:px-4 lg:grid-cols-[minmax(230px,0.82fr)_minmax(360px,1.45fr)_minmax(290px,0.9fr)] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/commish"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03] text-gray-500 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400"
              aria-label="Back to Commish"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-black uppercase italic tracking-tight sm:text-2xl">
                  Auction War Room
                </h1>
                <MockBadge />
              </div>
              <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {riverCityAuctionLeagueSettings.leagueName} | {riverCityAuctionLeagueSettings.season} | {readinessItems[3]}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center">
            <div className="min-w-0 rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-orange-700 dark:text-orange-300">
              <p className="truncate text-[9px] font-black uppercase tracking-[0.22em]">
                {purchaseSourceLabel}
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest">
                {purchaseSourceDetail}
              </p>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest">
                Values: {playerPoolValueSourceLabel}
              </p>
            </div>
            <label className="relative block min-w-0">
              <span className="sr-only">Quick player search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={playerPoolSearch}
                onChange={(event) => setPlayerPoolSearch(event.target.value)}
                placeholder="Quick search player pool"
                className="h-10 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
              />
            </label>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 lg:justify-end">
            <div className="hidden min-w-0 flex-1 items-center gap-2 xl:flex">
              {dashboardCards.slice(1).map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="min-w-0 rounded-xl border border-black/10 bg-black/[0.03] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                      <p className="truncate text-[8px] font-black uppercase tracking-widest text-gray-400">
                        {card.label}
                      </p>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-black uppercase italic">
                      {card.value}
                    </p>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={focusManualSalePlayerSearch}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700"
            >
              <Gavel className="h-4 w-4" />
              <span className="hidden sm:inline">
                {manualSaleSelectedPlayer
                  ? 'Finish Sale'
                  : manualSaleConfirmation
                    ? 'Next Sale'
                    : 'Record Sale'}
              </span>
            </button>
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-2 py-2 sm:px-3">
        <div className="grid gap-3">
          <div className="grid min-h-0 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,35fr)_minmax(340px,40fr)_minmax(280px,25fr)] lg:items-start">
            <div className="order-2 min-h-0 md:col-span-1 lg:order-1 lg:h-[calc(100vh-7.25rem)]">
              <SectionShell
                title="Player Pool"
                eyebrow="Draft Board"
                icon={DollarSign}
                className="lg:h-full lg:overflow-hidden"
              >
                <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="block sm:col-span-2 xl:col-span-3">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Search
                    </span>
                    <input
                      value={playerPoolSearch}
                      onChange={(event) => setPlayerPoolSearch(event.target.value)}
                      placeholder="Player name"
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Pos
                    </span>
                    <select
                      value={playerPoolPositionFilter}
                      onChange={(event) => setPlayerPoolPositionFilter(event.target.value)}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-2 text-xs font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    >
                      <option value="all">All</option>
                      {playerPoolPositionOptions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Status
                    </span>
                    <select
                      value={playerPoolStatusFilter}
                      onChange={(event) => setPlayerPoolStatusFilter(event.target.value)}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-2 text-xs font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    >
                      <option value="all">All</option>
                      <option value="available">Available</option>
                      <option value="taken">Taken</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Sort
                    </span>
                    <select
                      value={playerPoolSort}
                      onChange={(event) => setPlayerPoolSort(event.target.value as PlayerPoolSortKey)}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-2 text-xs font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    >
                      {playerPoolSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {playerPoolValueSourceLabel} | {visiblePlayerPoolRows.length}/{filteredPlayerPoolRows.length} rows
                  </p>
                  <button
                    type="button"
                    onClick={resetPlayerPoolFilters}
                    className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    Reset
                  </button>
                </div>

                {selectedPlayer && selectedPlayerRecommendation && (
                  <details className="mb-3 rounded-xl border border-orange-600/20 bg-orange-600/5 p-3" open>
                    <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-widest text-orange-600 [&::-webkit-details-marker]:hidden">
                      Selected: {selectedPlayer.originalPlayerName} | Max {formatMoney(selectedPlayerRecommendation.recommendedMaxBid)}
                    </summary>
                    <div className="mt-3 grid gap-3">
                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                        <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
                          {selectedPlayer.position ?? 'N/A'} {selectedPlayer.nflTeam ?? 'N/A'}
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1 dark:bg-white/10">
                          Avg {formatMoney(selectedPlayer.averageValue ?? null)}
                        </span>
                        <StatusPill status={selectedPlayerRecommendation.confidence} />
                      </div>
                      <p className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                        {selectedPlayerRecommendation.reasons[0] ?? 'No recommendation reason available.'}
                      </p>
                      {selectedPlayerRecommendation.warnings.length > 0 && (
                        <p className="text-xs font-bold leading-relaxed text-orange-700 dark:text-orange-300">
                          {selectedPlayerRecommendation.warnings[0]}
                        </p>
                      )}
                    </div>
                  </details>
                )}

                <div className="max-h-[52vh] overflow-auto rounded-xl border border-black/10 dark:border-white/10 lg:max-h-[calc(100vh-23rem)]">
                  <table className="w-full min-w-[760px] text-left">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-black/10 bg-white text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-[#121212]">
                        <th className="px-2 py-1.5">Player</th>
                        <th className="px-2 py-1.5">Pos</th>
                        <th className="px-2 py-1.5">Team</th>
                        <th className="px-2 py-1.5">Bye</th>
                        <th className="px-2 py-1.5">Avg</th>
                        <th className="px-2 py-1.5">Ray Max</th>
                        <th className="px-2 py-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                      {visiblePlayerPoolRows.length > 0 ? (
                        visiblePlayerPoolRows.map((player) => {
                          const preferenceTags = getPlayerPoolPreferenceTags(player);
                          const byeWeek = getByeWeekForNflTeam(player.nflTeam);
                          const purchaseMatch = getPlayerPoolPurchaseMatch(
                            player,
                            activePurchaseRows
                          );
                          const playerStatus = getPlayerPoolDisplayStatus(
                            player,
                            activePurchaseRows,
                            isUsingSleeperPurchases
                          );
                          const bidRecommendation = getPlayerBidRecommendation(
                            player,
                            preferenceTags,
                            bidRecommendationContext
                          );

                          return (
                            <tr
                              key={player.rowNumber}
                              aria-pressed={selectedPlayerRowNumber === player.rowNumber}
                              className={`cursor-pointer text-[11px] transition hover:bg-orange-600/5 ${selectedPlayerRowNumber === player.rowNumber ? 'bg-orange-600/10 ring-1 ring-inset ring-orange-600/25' : ''}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => selectManualSalePlayer(player)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  selectManualSalePlayer(player);
                                }
                              }}
                            >
                              <td className="px-2 py-1">
                                <p className="font-black">{player.originalPlayerName}</p>
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {preferenceTags.map((tag) => (
                                    <PreferenceBadge key={tag} tag={tag} />
                                  ))}
                                </div>
                              </td>
                              <td className="px-2 py-1 font-bold text-gray-500 dark:text-gray-400">{player.position ?? 'N/A'}</td>
                              <td className="px-2 py-1 font-bold text-gray-500 dark:text-gray-400">{player.nflTeam ?? 'N/A'}</td>
                              <td className="px-2 py-1 font-black">{formatByeWeek(byeWeek)}</td>
                              <td className="px-2 py-1 font-black text-orange-600">{formatMoney(player.averageValue ?? null)}</td>
                              <td className="px-2 py-1 font-black">{formatMoney(bidRecommendation.recommendedMaxBid)}</td>
                              <td className="px-2 py-1">
                                <div className="flex flex-col gap-1">
                                  <span className="w-fit rounded-full bg-black/5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest dark:bg-white/10">
                                    {playerStatus}
                                  </span>
                                  {purchaseMatch && (
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                      {getTeam(purchaseMatch.teamId)?.teamName ?? `Roster ${purchaseMatch.rosterId ?? 'N/A'}`} | {formatMoney(purchaseMatch.purchasePrice)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-2 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                          >
                            No matching player rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionShell>
            </div>

            <div className="order-1 grid min-h-0 gap-3 md:col-span-1 lg:order-2 lg:col-span-1 lg:max-h-[calc(100vh-7.25rem)] lg:overflow-auto lg:pr-1">
              <section className="rounded-2xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#121212]">
                <div className="grid gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                      Current Nomination
                    </p>
                    {selectedPlayer ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-lg font-black uppercase italic tracking-tight">
                          {selectedPlayer.originalPlayerName}
                        </p>
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {selectedPlayer.position ?? 'N/A'}
                        </span>
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          {selectedPlayer.nflTeam ?? 'N/A'}
                        </span>
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:bg-white/10 dark:text-gray-300">
                          Bye {formatByeWeek(selectedPlayerByeWeek)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm font-black uppercase italic text-gray-500 dark:text-gray-400">
                        Waiting for next nomination...
                      </p>
                    )}
                    </div>

                  {selectedPlayer && selectedPlayerRecommendation && (
                    <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg
                        </p>
                        <p className="text-sm font-black text-orange-600">
                          {formatMoney(selectedPlayer.averageValue ?? null)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Ray Max
                        </p>
                        <p className="text-sm font-black">
                          {formatMoney(selectedPlayerRecommendation.recommendedMaxBid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Bid Input
                        </p>
                        <p className="text-sm font-black">
                          {formatMoney(currentNominationManualBidValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Current Recommendation
                        </p>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getCurrentNominationRecommendationClass(currentNominationRecommendation)}`}>
                          {currentNominationRecommendation}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                  {selectedPlayer && selectedPlayerRecommendation && (
                    <div className="grid gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:grid-cols-3">
                      <div className="rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black text-gray-400">
                          Value Window
                        </p>
                        <p className="mt-1 text-xs font-black text-gray-700 dark:text-gray-200">
                          {formatMoney(selectedPlayer.lowValue ?? null)}-{formatMoney(selectedPlayer.highValue ?? null)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black text-gray-400">
                          Danger Zone
                        </p>
                        <p className="mt-1 text-xs font-black text-rose-600">
                          Over {formatMoney(selectedPlayerRecommendation.recommendedMaxBid)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black text-gray-400">
                          Short Reason
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-bold normal-case tracking-normal text-gray-700 dark:text-gray-200">
                          {currentNominationShortReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

          <SectionShell
            title="Manual Auction Entry"
            eyebrow="Local Session Draft Tracking"
            icon={Gavel}
          >
            <div className="mb-3 rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-orange-700 dark:text-orange-300">
              <p className="text-[10px] font-black uppercase tracking-widest">
                Local only. Fast entry updates every read-only War Room view.
              </p>
            </div>

            <form
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                recordManualSale();
              }}
            >
              <div className="relative">
                <label
                  htmlFor="manual-auction-player-search"
                  className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400"
                >
                  Player
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={manualSalePlayerInputRef}
                    id="manual-auction-player-search"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={manualSalePlayerSearchOpen}
                    aria-controls="manual-auction-player-options"
                    aria-activedescendant={
                      manualSalePlayerSearchOpen &&
                      manualSalePlayerMatches.length > 0
                        ? `manual-auction-player-option-${manualSalePlayerMatches[safeManualSaleHighlightedMatchIndex].rowNumber}`
                        : undefined
                    }
                    value={manualSalePlayerInput}
                    onChange={(event) =>
                      handleManualSalePlayerInputChange(event.target.value)
                    }
                    onFocus={() =>
                      setManualSalePlayerSearchOpen(
                        manualSalePlayerInput.trim().length > 0 &&
                          !manualSaleSelectedPlayer
                      )
                    }
                    onBlur={() => setManualSalePlayerSearchOpen(false)}
                    onKeyDown={handleManualSalePlayerKeyDown}
                    placeholder="Type player name"
                    className="h-12 w-full rounded-xl border border-black/10 bg-white pl-10 pr-10 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                  />
                  {(manualSalePlayerInput || manualSaleSelectedPlayer) && (
                    <button
                      type="button"
                      onClick={clearManualSalePlayerAndFocus}
                      className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-orange-600/10 hover:text-orange-600"
                      aria-label="Clear selected player"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {manualSalePlayerSearchOpen && manualSalePlayerInput.trim() && (
                  <div
                    id="manual-auction-player-options"
                    role="listbox"
                    className="absolute left-0 right-0 z-50 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-black/10 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
                  >
                    {manualSalePlayerMatches.length > 0 ? (
                      manualSalePlayerMatches.map((player, index) => {
                        const isHighlighted =
                          index === safeManualSaleHighlightedMatchIndex;

                        return (
                          <button
                            key={player.rowNumber}
                            id={`manual-auction-player-option-${player.rowNumber}`}
                            type="button"
                            role="option"
                            aria-selected={isHighlighted}
                            onMouseEnter={() =>
                              setManualSaleHighlightedMatchIndex(index)
                            }
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectManualSalePlayer(player);
                            }}
                            className={`mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition last:mb-0 ${
                              isHighlighted
                                ? 'bg-orange-600/10 text-orange-700 dark:text-orange-300'
                                : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                            }`}
                          >
                            <span>
                              <span className="block text-sm font-black uppercase italic">
                                {player.originalPlayerName}
                              </span>
                              <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {getManualEntryPlayerMeta(player) || 'No position/team'}
                              </span>
                            </span>
                            <span className="text-sm font-black text-orange-600">
                              {formatMoney(player.averageValue ?? null)}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <p className="px-3 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        No player matches. Keep typing or clear the search.
                      </p>
                    )}
                  </div>
                )}

                {manualSaleSelectedPlayer && (
                  <div className="mt-2 rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                    <p className="text-[9px] font-black uppercase tracking-widest">
                      Selected Player
                    </p>
                    <p className="mt-1 text-sm font-black uppercase italic">
                      {manualSaleSelectedPlayer.originalPlayerName} | {manualSaleSelectedPlayer.position ?? 'N/A'} {manualSaleSelectedPlayer.nflTeam ?? 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <label className="block">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Price
                  </span>
                  <input
                    ref={manualSalePriceInputRef}
                    type="number"
                    min="0"
                    step="1"
                    value={manualSalePriceInput}
                    onChange={(event) => {
                      setManualSalePriceInput(event.target.value);
                      setManualSaleError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setManualSalePriceInput('');
                        clearManualSalePlayerAndFocus();
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-lg font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                  />
                </label>

                <label className="block min-w-0">
                  <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Buyer
                  </span>
                  <select
                    value={manualSaleBuyerTeamId}
                    onChange={(event) => {
                      setManualSaleBuyerTeamId(event.target.value);
                      setManualSaleError(null);
                    }}
                    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-xs font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                  >
                    {mockAuctionTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.teamName} | {team.managerName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <button
                  type="submit"
                  disabled={!canRecordManualSale}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-black/[0.06] disabled:text-gray-400 dark:disabled:border-white/10 dark:disabled:bg-white/[0.06]"
                >
                  <Gavel className="h-4 w-4" />
                  Record Sale
                </button>

                <button
                  type="button"
                  onClick={undoLastManualSale}
                  disabled={manualAuctionSales.length === 0}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Undo
                </button>
              </div>
            </form>

            {(manualSaleConfirmation || manualSaleValidationMessage || manualSalePlayerAlreadyTaken || manualSalePlayerStrategyMessage) && (
              <div className="mt-3 grid gap-2">
                {manualSaleConfirmation && (
                  <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em]">
                      Last Recorded Sale
                    </p>
                    <p className="mt-1 text-sm font-black uppercase italic">
                      {manualSaleConfirmation.playerName} to {manualSaleConfirmation.teamName} for {formatMoney(manualSaleConfirmation.salePrice)}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest">
                      {formatChatTimestamp(manualSaleConfirmation.recordedAt)}
                    </p>
                  </div>
                )}
                {manualSaleValidationMessage && (
                  <div className={`rounded-2xl border px-4 py-3 ${
                    manualSaleError
                      ? 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300'
                      : 'border-black/10 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300'
                  }`}>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {manualSaleValidationMessage}
                    </p>
                  </div>
                )}
                {manualSalePlayerAlreadyTaken && (
                  <div className="rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      Already marked taken by {manualSalePlayerAlreadyTaken.source}: {getTeam(manualSalePlayerAlreadyTaken.teamId)?.teamName ?? `Roster ${manualSalePlayerAlreadyTaken.rosterId ?? 'N/A'}`} at {formatMoney(manualSalePlayerAlreadyTaken.purchasePrice)}
                    </p>
                  </div>
                )}
                {manualSalePlayerStrategyMessage && (
                  <div className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-emerald-700 dark:text-emerald-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {manualSalePlayerStrategyMessage}
                    </p>
                  </div>
                )}
              </div>
            )}

          </SectionShell>

          <SectionShell
            title="Auction Advisor"
            eyebrow={`${purchaseSourceLabel} Strategy`}
            icon={BarChart3}
          >
            <div className="grid gap-3">
              <div className="rounded-xl border border-orange-600/20 bg-orange-600/10 p-3 text-orange-700 dark:text-orange-300">
                <p className="text-[9px] font-black uppercase tracking-[0.25em]">
                  Current Read
                </p>
                <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight">
                  {auctionAdvisorSummary.headline}
                </h3>
                <p className="mt-2 text-xs font-bold leading-relaxed">
                  {auctionAdvisorSummary.currentStrategy}
                </p>
              </div>

              {rayKDefStrategyMessages.length > 0 && (
                <div className="grid gap-2">
                  {rayKDefStrategyMessages.map((message) => (
                    <p
                      key={message}
                      className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300"
                    >
                      {message}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Top Roster Needs
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {auctionAdvisorSummary.rosterNeeds.slice(0, 3).map((need) => (
                      <span
                        key={need}
                        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:border-white/10 dark:bg-black/30 dark:text-gray-300"
                      >
                        {need}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Budget Read
                  </p>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                    {auctionAdvisorSummary.budgetWarning}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Top Value Targets
                </p>
                <div className="space-y-2">
                  {auctionAdvisorSummary.bestValueOpportunities.length > 0 ? (
                    auctionAdvisorSummary.bestValueOpportunities.map((player) => (
                      <div
                        key={`${player.playerName}-${player.position}`}
                        className="grid gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-black/30 md:grid-cols-[minmax(0,1.25fr)_auto_auto_minmax(0,1.1fr)] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black uppercase italic">
                            {player.playerName}
                          </p>
                          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {player.position ?? 'N/A'} | {player.nflTeam ?? 'N/A'}
                          </p>
                        </div>
                        <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                          <span>Avg {formatMoney(player.averageValue)}</span>
                          <span className="text-orange-600">
                            Max {formatMoney(player.recommendedMaxBid)}
                          </span>
                        </div>
                        <div>
                          {player.preference !== 'none' ? (
                            <PreferenceBadge tag={player.preference} />
                          ) : (
                            <span className="rounded-full bg-black/5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/10">
                              Value
                            </span>
                          )}
                        </div>
                        <p className="min-w-0 truncate text-[10px] font-bold text-gray-600 dark:text-gray-300">
                          {player.reason}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-400">
                      No clear value opportunities from the current filters and budget state.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            title="Best Remaining Values"
            eyebrow="Unsold Radar"
            icon={DollarSign}
          >
            <div className="space-y-2">
              {bestRemainingValueRows.length > 0 ? (
                bestRemainingValueRows.map((row) => (
                  <div
                    key={row.player.rowNumber}
                    className="grid gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black uppercase italic">
                        {row.player.originalPlayerName}
                      </p>
                      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {row.player.position ?? 'N/A'} | {row.player.nflTeam ?? 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
                      <span>Avg {formatMoney(row.averageValue)}</span>
                      <span className="text-orange-600">
                        Ray {formatMoney(row.recommendation.recommendedMaxBid)}
                      </span>
                    </div>
                    <span className={`w-fit rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                      (row.valueGap ?? 0) >= 0
                        ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                    }`}>
                      Gap {row.valueGap === null ? 'N/A' : formatSignedMoney(Math.round(row.valueGap))}
                    </span>
                    <div className="flex flex-wrap justify-start gap-1 sm:justify-end">
                      {row.preferenceTags.length > 0 ? (
                        row.preferenceTags.map((tag) => (
                          <PreferenceBadge key={tag} tag={tag} />
                        ))
                      ) : (
                        <span className="rounded-full bg-black/5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-gray-400 dark:bg-white/10">
                          Open
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                  No unsold value rows are available from the current board.
                </p>
              )}
            </div>
          </SectionShell>

          <SectionShell
            title="Advisor Chat"
            eyebrow="Local Advisor — no AI yet"
            icon={MessageCircle}
          >
            <div className="mb-3 flex flex-col gap-2 rounded-xl border border-orange-600/20 bg-orange-600/10 p-3 text-orange-700 dark:text-orange-300 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest">
                Local Advisor — no AI yet.
              </p>
              {localAdvisorChatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalAdvisorChatMessages([]);
                    setLocalAdvisorChatError(null);
                    setLocalAdvisorChatStatus('idle');
                  }}
                  className="inline-flex w-fit items-center gap-2 rounded-lg border border-current/30 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition hover:bg-white/30 dark:hover:bg-black/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Chat
                </button>
              )}
            </div>

            {(localAdvisorChatStatus === 'loading' || localAdvisorChatError) && (
              <div className="mb-3 rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                {localAdvisorChatStatus === 'loading'
                  ? 'Asking protected local API...'
                  : localAdvisorChatError}
              </div>
            )}

            <form
              className="mb-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                void askLocalAdvisorPlayer();
              }}
            >
              <input
                type="text"
                value={localAdvisorChatInput}
                onChange={(event) => setLocalAdvisorChatInput(event.target.value)}
                placeholder="Try: Bijan, max bid Bijan, should I bid on Bijan"
                disabled={localAdvisorChatStatus === 'loading'}
                className="min-h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold text-black outline-none transition placeholder:text-gray-400 focus:border-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-white"
              />
              <button
                type="submit"
                disabled={localAdvisorChatStatus === 'loading'}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700"
              >
                {localAdvisorChatStatus === 'loading' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                {localAdvisorChatStatus === 'loading' ? 'Asking' : 'Ask'}
              </button>
            </form>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {localAdvisorChatQuestions.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => void askLocalAdvisor(question.id)}
                  disabled={localAdvisorChatStatus === 'loading'}
                  className="rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                >
                  {question.label}
                </button>
              ))}
            </div>

            <div className="max-h-[34vh] overflow-auto rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
              {localAdvisorChatMessages.length > 0 ? (
                <div className="space-y-3">
                  {localAdvisorChatMessages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-xl border border-orange-600/20 bg-orange-600/10 p-3 text-orange-700 dark:text-orange-300"
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">
                            {message.sourceLabel ?? 'Local fallback'}
                          </p>
                          <p className="mt-2 text-sm font-black uppercase italic tracking-tight">
                            {message.question}
                          </p>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                          {formatChatTimestamp(message.timestamp)}
                        </p>
                      </div>

                      <div className="grid gap-2 lg:grid-cols-[1fr_0.9fr]">
                        <div className="rounded-xl border border-current/20 bg-white/40 p-3 dark:bg-black/20">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-70">
                            Answer Summary
                          </p>
                          <p className="text-sm font-bold leading-relaxed">
                            {message.summary}
                          </p>
                        </div>
                        <div className="rounded-xl border border-current/20 bg-white/40 p-3 dark:bg-black/20">
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-70">
                            Recommendation
                          </p>
                          <p className="text-sm font-black leading-relaxed">
                            {message.recommendation}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-70">
                            Reasons
                          </p>
                          <ul className="space-y-2">
                            {message.reasons.map((reason) => (
                              <li
                                key={reason}
                                className="rounded-xl border border-current/20 bg-white/40 px-3 py-2 text-xs font-bold leading-relaxed dark:bg-black/20"
                              >
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-[9px] font-black uppercase tracking-widest opacity-70">
                            Warnings
                          </p>
                          <ul className="space-y-2">
                            {(message.warnings.length > 0
                              ? message.warnings
                              : ['No local warnings for this answer.']
                            ).map((warning) => (
                              <li
                                key={warning}
                                className="rounded-xl border border-current/20 bg-white/40 px-3 py-2 text-xs font-bold leading-relaxed dark:bg-black/20"
                              >
                                {warning}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {message.meta && (
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest opacity-70">
                          {message.meta}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/30">
                  <p className="text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                    Choose a draft question to get a local read from the current budget, roster, value, preference, bye-week, and purchase-source state.
                  </p>
                </div>
              )}
            </div>
          </SectionShell>

            </div>

            <div className="order-3 grid min-h-0 gap-3 md:col-span-2 lg:col-span-1 lg:max-h-[calc(100vh-7.25rem)] lg:overflow-auto lg:pr-1">
              <SectionShell
                title="Team Budgets"
                eyebrow={purchaseSourceLabel}
                icon={Users}
              >
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {purchaseSourceDetail}
                </p>
                <div className="max-h-[32vh] overflow-auto rounded-xl border border-black/10 dark:border-white/10 lg:max-h-[30vh]">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-black/10 bg-white text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-[#121212]">
                        <th className="px-2 py-2">Owner</th>
                        <th className="px-2 py-2">Spent</th>
                        <th className="px-2 py-2">Remain</th>
                        <th className="px-2 py-2">Players</th>
                        <th className="px-2 py-2">Max Bid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                      {budgetRows.map((row) => {
                        const teamIntelligence = teamIntelligenceById.get(row.team.id);
                        const pressure = teamIntelligence?.pressure ?? 'Low';

                        return (
                          <tr
                            key={row.team.id}
                            className={`text-xs ${guidanceTeam?.id === row.team.id ? 'bg-orange-600/10 ring-1 ring-inset ring-orange-600/25' : ''}`}
                          >
                            <td className="px-2 py-2">
                              <p className="font-black">{row.team.managerName}{guidanceTeam?.id === row.team.id ? ' | Ray/Jeffrey' : ''}</p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {row.team.teamName}
                              </p>
                            </td>
                            <td className="px-2 py-2 font-black">{formatMoney(row.totalSpent)}</td>
                            <td className="px-2 py-2 font-black text-emerald-600">{formatMoney(row.remainingBudget)}</td>
                            <td className="px-2 py-2 font-black">
                              {Math.max(0, row.team.rosterSlots.total - row.rosterSpotsRemaining)}/{row.team.rosterSlots.total}
                            </td>
                            <td className="px-2 py-2">
                              <p className="font-black text-orange-600">{formatMoney(row.maxBid)}</p>
                              <span className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${getBudgetPressureClass(pressure)}`}>
                                {pressure}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionShell>

              <SectionShell
                title="Market Heat"
                eyebrow="Position Inflation"
                icon={BarChart3}
              >
                <div className="space-y-1.5">
                  {marketHeatRows.map((row) => (
                    <div
                      key={row.position}
                      className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <p className="font-black uppercase italic">{row.position}</p>
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          Exp {formatMoney(Math.round(row.expectedTotal))} | Spent {formatMoney(Math.round(row.actualSpent))}
                        </p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest">
                          {formatInflationPercent(row.inflationPercent)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getMarketHeatClass(row.heatLabel)}`}>
                        {row.heatLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionShell>

              <SectionShell
                title="Needs Matrix"
                eyebrow="Starter Fill"
                icon={Grid3X3}
              >
                <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-black/10 bg-black/[0.03] text-[8px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/[0.03]">
                        <th className="px-2 py-2">Team</th>
                        {rosterGuidancePositionOrder.map((position) => (
                          <th key={position} className="px-2 py-2 text-center">
                            {position}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                      {teamIntelligenceRows.map((row) => {
                        const team = getTeam(row.teamId);

                        return (
                          <tr
                            key={row.teamId}
                            className={`text-[10px] ${guidanceTeam?.id === row.teamId ? 'bg-orange-600/10' : ''}`}
                          >
                            <td className="px-2 py-2 font-black">
                              {team?.teamName ?? row.teamId}
                            </td>
                            {row.needs.map((need) => (
                              <td key={need.position} className="px-2 py-2 text-center">
                                <span className={`inline-flex min-w-10 justify-center rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                                  need.needed <= 0
                                    ? 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                                    : 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                                }`}>
                                  {need.current}/{need.target}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionShell>

              <SectionShell
                title="Recent Sales"
                eyebrow="Draft Timeline"
                icon={History}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {draftTimelineRows.length} recent sale{draftTimelineRows.length === 1 ? '' : 's'}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    newest first
                  </p>
                </div>

                {draftTimelineRows.length > 0 ? (
                  <div className="max-h-[24vh] overflow-auto pr-1 lg:max-h-[20vh]">
                    <div className="min-w-[520px] space-y-1.5">
                    {draftTimelineRows.map((sale) => {
                      return (
                        <div
                          key={sale.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,0.8fr)_auto] items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black uppercase italic">
                              {sale.playerName}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {sale.source} | {sale.time}
                            </p>
                          </div>
                          <p className="text-sm font-black text-orange-600">
                            {formatMoney(sale.price)}
                          </p>
                          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {sale.buyer}
                          </p>
                          <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getValueResultClass(sale.valueResult)}`}>
                            {sale.valueResult}
                          </span>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                    No sales are available from the active purchase source.
                  </p>
                )}
              </SectionShell>

              <SectionShell
                title="Sale Reaction"
                eyebrow="Latest Read"
                icon={Gavel}
              >
                {latestDraftSale && latestSaleReaction ? (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black uppercase italic">
                          {latestDraftSale.playerName}
                        </p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {latestDraftSale.buyer} | {formatMoney(latestDraftSale.price)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getValueResultClass(latestSaleReaction.result)}`}>
                        {latestSaleReaction.result}
                      </span>
                    </div>
                    <p className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                      {latestSaleReaction.marketEffect}
                    </p>
                    <p className="rounded-lg border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-xs font-black leading-relaxed text-orange-700 dark:text-orange-300">
                      {latestSaleReaction.nextAction}
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                    Record a sale or load Sleeper to see the latest reaction.
                  </p>
                )}
              </SectionShell>

              <SectionShell
                title="Warnings"
                eyebrow="Advisor Alerts"
                icon={FileWarning}
              >
                <div className="space-y-2">
                  {auctionAdvisorSummary.avoidOverpayWarnings.length > 0 ? (
                    auctionAdvisorSummary.avoidOverpayWarnings.slice(0, 5).map((warning) => (
                      <div
                        key={`${warning.area}-${warning.message}`}
                        className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border px-2.5 py-2 ${getRosterGuidanceSeverityClass(warning.severity)}`}
                      >
                        <span className="rounded-full border border-current px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                          {warning.severity}
                        </span>
                        <span className="rounded-full border border-current px-2 py-0.5 text-[8px] font-black uppercase tracking-widest">
                          {warning.area}
                        </span>
                        <p className="min-w-0 truncate text-[10px] font-bold">
                          {warning.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                      No current advisor warnings.
                    </p>
                  )}
                </div>
              </SectionShell>

              <SectionShell
                title="Actions"
                eyebrow="Next Moves"
                icon={ClipboardList}
              >
                <div className="space-y-2">
                  {auctionAdvisorSummary.nextRecommendedActions.slice(0, 5).map((action, index) => (
                    <div
                      key={action}
                      className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-[10px] font-black text-white">
                        {index + 1}
                      </span>
                      <p className="min-w-0 truncate text-xs font-bold text-gray-600 dark:text-gray-300">
                        {action}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionShell>
            </div>
          </div>

          <div className="grid gap-4">

          <SectionShell
            title="Sleeper Draft Snapshot"
            eyebrow="Manual Read-Only Refresh"
            icon={RefreshCw}
            collapsible
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Season 2026
                </p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                  Read-only Sleeper purchases snapshot. No polling, no writes.
                </p>
              </div>
              <button
                type="button"
                onClick={refreshSleeperSnapshot}
                disabled={sleeperSnapshotStatus === 'loading'}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${sleeperSnapshotStatus === 'loading' ? 'animate-spin' : ''}`}
                />
                Refresh Sleeper Purchases
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {sleeperSnapshotSourceMessage}
              </p>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-5">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Draft Status
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {sleeperSnapshotStatus === 'idle'
                    ? 'Not Loaded'
                    : sleeperSnapshot?.draft?.status ?? sleeperSnapshot?.status ?? sleeperSnapshotStatus}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Draft
                </p>
                <p className="mt-2 text-xs font-black uppercase leading-tight">
                  {sleeperSnapshot?.draft?.draft_id ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Fetched
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {formatTimestamp(sleeperSnapshot?.fetchedAt ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Purchases
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {sleeperSnapshot ? sleeperPurchaseCount : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Spent
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic text-orange-600">
                  {formatMoney(sleeperSnapshot ? sleeperTotalDollarsSpent : null)}
                </p>
              </div>
            </div>

            {sleeperSnapshotWarnings.length > 0 && (
              <div className="mb-5 grid gap-3 md:grid-cols-2">
                {sleeperSnapshotWarnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      {warning}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                    <th className="py-3 pr-4">Pick</th>
                    <th className="py-3 pr-4">Player</th>
                    <th className="py-3 pr-4">Pos</th>
                    <th className="py-3 pr-4">Team</th>
                    <th className="py-3 pr-4">Buyer</th>
                    <th className="py-3 pr-4">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {sleeperRecentPurchases.length > 0 ? (
                    sleeperRecentPurchases.map((purchase) => {
                      const team = getTeamByRosterId(purchase.rosterId);

                      return (
                        <tr key={`${purchase.draftId}-${purchase.pickNo}-${purchase.playerId}`} className="text-sm">
                          <td className="py-3 pr-4 font-black">
                            {purchase.pickNo ?? 'N/A'}
                          </td>
                          <td className="py-3 pr-4 font-black">
                            {purchase.playerName}
                          </td>
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">
                            {purchase.position ?? 'N/A'}
                          </td>
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">
                            {purchase.nflTeam ?? 'N/A'}
                          </td>
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">
                            {team?.teamName ?? (purchase.rosterId ? `Roster ${purchase.rosterId}` : 'N/A')}
                          </td>
                          <td className="py-3 pr-4 font-black text-orange-600">
                            {formatMoney(purchase.auctionPrice)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                      >
                        {sleeperSnapshotEmptyMessage}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell
            title="Roster Guidance"
            eyebrow={
              hasManualAuctionSales
                ? 'Manual Entry Build'
                : isUsingSleeperPurchases
                  ? 'Sleeper Snapshot Build'
                  : 'Local Demo Build'
            }
            icon={ClipboardList}
            collapsible
          >
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Team
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {guidanceTeam?.teamName ?? 'Ray/Jeffrey'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Rostered
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {guidanceRosterPlayers.length}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Max Bid
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic text-orange-600">
                  {formatMoney(guidanceBudgetRow?.maxBid ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Avg/Open
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {guidanceBudgetRow
                    ? formatMoneyPerSlot(guidanceBudgetRow.averageDollarsPerOpenSlot)
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Position Counts
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {guidancePositionCountRows.map((row) => (
                    <div
                      key={row.position}
                      className="rounded-xl border border-black/10 bg-white p-3 text-center dark:border-white/10 dark:bg-black/30"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        {row.position}
                      </p>
                      <p className="mt-1 text-2xl font-black uppercase italic">
                        {row.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Starter Needs
                </p>
                <div className="space-y-3">
                  {(guidanceOpenStarterNeeds.length > 0
                    ? guidanceOpenStarterNeeds
                    : guidanceStarterNeeds.filter((need) => need.severity === 'ok')
                  ).map((need) => (
                    <div
                      key={need.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/30"
                    >
                      <div>
                        <p className="text-sm font-black uppercase italic">
                          {need.label}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {need.detail}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getRosterGuidanceSeverityClass(need.severity)}`}>
                        Need {need.needed}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-4 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Bench Depth
                </p>
                <div className="space-y-3">
                  {(guidanceOpenBenchDepthNeeds.length > 0
                    ? guidanceOpenBenchDepthNeeds
                    : guidanceBenchDepthNeeds.filter((need) => need.severity === 'ok')
                  ).slice(0, 6).map((need) => (
                    <div
                      key={need.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/30"
                    >
                      <div>
                        <p className="text-sm font-black uppercase italic">
                          {need.label}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {need.detail}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getRosterGuidanceSeverityClass(need.severity)}`}>
                        Need {need.needed}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Guidance Warnings
                  </p>
                  <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight">
                    Budget, Value, Bye Mix
                  </h3>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  {playerPoolValueSourceLabel}
                </p>
              </div>

              {guidanceWarnings.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {guidanceWarnings.map((warning) => (
                    <div
                      key={warning.id}
                      className={`rounded-xl border p-4 ${getRosterGuidanceSeverityClass(warning.severity)}`}
                    >
                      <p className="text-sm font-black uppercase italic">
                        {warning.title}
                      </p>
                      <p className="mt-2 text-xs font-bold leading-relaxed">
                        {warning.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`rounded-xl border p-4 ${getRosterGuidanceSeverityClass('ok')}`}>
                  <p className="text-sm font-black uppercase italic">
                    No guidance warnings
                  </p>
                  <p className="mt-2 text-xs font-bold leading-relaxed">
                    Current {purchaseSourceLabel.toLowerCase()} roster has no overspend, bye concentration, or max-bid pressure flags.
                  </p>
                </div>
              )}
            </div>
          </SectionShell>

          <SectionShell
            title="Bye Week Watch"
            eyebrow={purchaseSourceLabel}
            icon={Grid3X3}
            collapsible
          >
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Rostered Players
                </p>
                <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight">
                  {hasManualAuctionSales
                    ? isUsingSleeperPurchases
                      ? 'Manual + Snapshot Rostered Players'
                      : 'Manual Rostered Players'
                    : isUsingSleeperPurchases
                      ? 'Snapshot Rostered Players'
                      : 'Local Demo Rostered Players'}
                </h3>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Keepers + {purchaseSourceLabel}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rosterByeWeekCounts.map((byeWeekGroup) => (
                <div
                  key={byeWeekGroup.label}
                  className="rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Week {byeWeekGroup.label}
                    </p>
                    <span className="rounded-full bg-orange-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
                      {byeWeekGroup.players.length}
                    </span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                    {byeWeekGroup.players.map((player) => player.playerName).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionShell
            title="Current Nomination"
            eyebrow={`Local Demo Nomination ${mockCurrentNomination.nominationNumber}`}
            icon={Gavel}
            collapsible
          >
              <div className="rounded-2xl border border-orange-600/20 bg-orange-600/5 p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">
                      On The Board
                    </p>
                    <h3 className="mt-2 text-3xl font-black uppercase italic tracking-tight">
                      {mockCurrentNomination.playerName}
                    </h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      {mockCurrentNomination.position} | {mockCurrentNomination.nflTeam}
                    </p>
                  </div>
                  <StatusPill status={mockCurrentNomination.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Bid</p>
                    <p className="mt-1 text-2xl font-black">{formatMoney(mockCurrentNomination.currentBid)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">High Team</p>
                    <p className="mt-1 text-sm font-black uppercase leading-tight">{currentHighTeam?.teamName ?? 'None'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Projected</p>
                    <p className="mt-1 text-2xl font-black">{formatMoney(currentNominationValue?.projectedValue ?? null)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Ray Max</p>
                    <p className="mt-1 text-2xl font-black text-orange-600">{formatMoney(currentNominationValue?.rayMaxBid ?? null)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                      <th className="py-3 pr-4">Time</th>
                      <th className="py-3 pr-4">Team</th>
                      <th className="py-3 pr-4">Bid</th>
                      <th className="py-3 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/10">
                    {mockCurrentNomination.bidHistory.map((bid) => {
                      const team = getTeam(bid.teamId);
                      return (
                        <tr key={bid.id} className="text-sm">
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{formatTimestamp(bid.placedAt)}</td>
                          <td className="py-3 pr-4 font-black">{team?.teamName ?? bid.teamId}</td>
                          <td className="py-3 pr-4 font-black">{formatMoney(bid.amount)}</td>
                          <td className="py-3 pr-4"><StatusPill status={bid.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionShell>

          <SectionShell
            title="Keeper Review"
            eyebrow="Local Demo Keepers"
            icon={ClipboardList}
            collapsible
          >
              <div className="space-y-3">
                {mockAuctionKeepers.map((keeper) => {
                  const team = getTeam(keeper.teamId);
                  return (
                    <div
                      key={keeper.id}
                      className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-black uppercase italic tracking-tight">
                            {keeper.playerName}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {team?.teamName ?? keeper.teamId} | {keeper.position} {keeper.nflTeam}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                            Cost {formatMoney(keeper.keeperCost)}
                          </span>
                          <StatusPill status={keeper.status} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionShell>
          </div>

          <SectionShell
            title="Player Pool"
            eyebrow={playerPoolValueSourceLabel}
            icon={DollarSign}
            className="hidden"
          >
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Source</p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {playerPoolValueSourceShortLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Rows</p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {localPlayerValues.totalRows}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Matched</p>
                <p className="mt-2 text-2xl font-black uppercase italic text-emerald-600">
                  {localPlayerValues.matchedRows}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Unmatched</p>
                <p className="mt-2 text-2xl font-black uppercase italic text-rose-600">
                  {localPlayerValues.unmatchedRows}
                </p>
              </div>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Read-only from {playerPoolValueSourcePath}. Taken status uses {purchaseSourceLabel.toLowerCase()} when available. No runtime Excel parsing.
            </p>

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[1.3fr_repeat(6,minmax(0,1fr))]">
              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Search
                </span>
                <input
                  value={playerPoolSearch}
                  onChange={(event) => setPlayerPoolSearch(event.target.value)}
                  placeholder="Player name"
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Position
                </span>
                <select
                  value={playerPoolPositionFilter}
                  onChange={(event) => setPlayerPoolPositionFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  <option value="all">All Positions</option>
                  {playerPoolPositionOptions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Bye
                </span>
                <select
                  value={playerPoolByeWeekFilter}
                  onChange={(event) => setPlayerPoolByeWeekFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  <option value="all">All Byes</option>
                  {byeWeekOptions2025.map((byeWeek) => (
                    <option key={byeWeek} value={String(byeWeek)}>
                      Week {byeWeek}
                    </option>
                  ))}
                  <option value="unknown">N/A</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Match
                </span>
                <select
                  value={playerPoolMatchStatusFilter}
                  onChange={(event) => setPlayerPoolMatchStatusFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  <option value="all">All Matches</option>
                  {playerPoolMatchStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Status
                </span>
                <select
                  value={playerPoolStatusFilter}
                  onChange={(event) => setPlayerPoolStatusFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available/Blank</option>
                  <option value="taken">Taken/Marked</option>
                  {playerPoolStatusFilterOptions
                    .filter((status) => status !== 'None')
                    .map((status) => (
                      <option key={status} value={`status:${status}`}>
                        {status}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Sort
                </span>
                <select
                  value={playerPoolSort}
                  onChange={(event) => setPlayerPoolSort(event.target.value as PlayerPoolSortKey)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  {playerPoolSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Preference
                </span>
                <select
                  value={playerPoolPreferenceFilter}
                  onChange={(event) => setPlayerPoolPreferenceFilter(event.target.value as PlayerPoolPreferenceFilter)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                >
                  <option value="all">All Preferences</option>
                  <option value="target">Target</option>
                  <option value="fade">Fade</option>
                  <option value="watch">Watch</option>
                </select>
              </label>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Showing {visiblePlayerPoolRows.length} of {filteredPlayerPoolRows.length} matching rows
                {isPlayerPoolLimited ? ` | initial view limited to ${playerPoolInitialDisplayLimit}` : ''}
              </p>
              <button
                type="button"
                onClick={resetPlayerPoolFilters}
                className="w-fit rounded-xl border border-black/10 bg-black/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400"
              >
                Reset Filters
              </button>
            </div>

            {selectedPlayer && selectedPlayerRecommendation && (
              <div className="mb-5 rounded-2xl border border-orange-600/20 bg-orange-600/5 p-5">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">
                      Bid Recommendation Detail
                    </p>
                    <h3 className="mt-2 text-3xl font-black uppercase italic tracking-tight">
                      {selectedPlayer.originalPlayerName}
                    </h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      {selectedPlayer.position ?? 'N/A'} | {selectedPlayer.nflTeam ?? 'N/A'} | Bye {formatByeWeek(selectedPlayerByeWeek)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerRowNumber(null)}
                    className="w-fit rounded-xl border border-black/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-gray-400"
                  >
                    Clear Selection
                  </button>
                </div>

                <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Low
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {formatMoney(selectedPlayer.lowValue ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      High
                    </p>
                    <p className="mt-1 text-2xl font-black">
                      {formatMoney(selectedPlayer.highValue ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Average
                    </p>
                    <p className="mt-1 text-2xl font-black text-orange-600">
                      {formatMoney(selectedPlayer.averageValue ?? null)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Recommended Max
                    </p>
                    <p className="mt-1 text-2xl font-black text-orange-600">
                      {formatMoney(selectedPlayerRecommendation.recommendedMaxBid)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      Confidence
                    </p>
                    <div className="mt-2">
                      <StatusPill status={selectedPlayerRecommendation.confidence} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black/30">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                          Site Values
                        </p>
                        <h4 className="mt-1 text-lg font-black uppercase italic tracking-tight">
                          Masterview Sources
                        </h4>
                      </div>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                        {selectedPlayer.siteValues?.length ?? 0} sources
                      </span>
                    </div>
                    {selectedPlayer.siteValues && selectedPlayer.siteValues.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedPlayer.siteValues.map((siteValue, index) => (
                          <div
                            key={`${selectedPlayer.rowNumber}-${siteValue.sourceName}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {siteValue.sourceName}
                            </p>
                            <p className="text-sm font-black">
                              {formatSiteValue(siteValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        No site values available.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black/30">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                      Player Context
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Sleeper Match
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {selectedPlayer.matchedSleeperName ?? 'Unmatched'}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          ID {selectedPlayer.sleeperPlayerId ?? 'N/A'} | {selectedPlayer.matchMethod ?? selectedPlayer.matchStatus}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Preference
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedPlayerPreferenceTags.length > 0 ? (
                            selectedPlayerPreferenceTags.map((tag) => (
                              <PreferenceBadge key={tag} tag={tag} />
                            ))
                          ) : (
                            <span className="font-bold text-gray-500 dark:text-gray-400">
                              None
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Taken/Status
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {selectedPlayerStatus ?? 'None'}
                        </p>
                        {selectedPlayerPurchaseMatch && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {getTeam(selectedPlayerPurchaseMatch.teamId)?.teamName ?? `Roster ${selectedPlayerPurchaseMatch.rosterId ?? 'N/A'}`} | {formatMoney(selectedPlayerPurchaseMatch.purchasePrice)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Recommendation Source
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {purchaseSourceLabel}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {purchaseSourceDetail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black/30">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                      Reasons
                    </p>
                    {selectedPlayerRecommendation.reasons.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedPlayerRecommendation.reasons.map((reason) => (
                          <li
                            key={reason}
                            className="text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300"
                          >
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        No recommendation reasons available.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black/30">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                      Warnings
                    </p>
                    {selectedPlayerRecommendation.warnings.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedPlayerRecommendation.warnings.map((warning) => (
                          <li
                            key={warning}
                            className="text-sm font-bold leading-relaxed text-orange-700 dark:text-orange-300"
                          >
                            {warning}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        No recommendation warnings.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mb-5 rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Bye Week Watch
                  </p>
                  <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight">
                    {hasManualAuctionSales
                      ? isUsingSleeperPurchases
                        ? 'Manual + Snapshot Rostered Players'
                        : 'Manual Rostered Players'
                      : isUsingSleeperPurchases
                        ? 'Snapshot Rostered Players'
                        : 'Local Demo Rostered Players'}
                  </h3>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Keepers + {purchaseSourceLabel}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {rosterByeWeekCounts.map((byeWeekGroup) => (
                  <div
                    key={byeWeekGroup.label}
                    className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                        Week {byeWeekGroup.label}
                      </p>
                      <span className="rounded-full bg-orange-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
                        {byeWeekGroup.players.length}
                      </span>
                    </div>
                    <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                      {byeWeekGroup.players.map((player) => player.playerName).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-h-[640px] overflow-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full min-w-[1500px] text-left">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-black/10 bg-white text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-[#121212]">
                    <th className="py-3 pr-4">Player</th>
                    <th className="py-3 pr-4">Sleeper Match</th>
                    <th className="py-3 pr-4">Preference</th>
                    <th className="py-3 pr-4">Pos</th>
                    <th className="py-3 pr-4">Team</th>
                    <th className="py-3 pr-4">Bye</th>
                    <th className="py-3 pr-4">Low</th>
                    <th className="py-3 pr-4">High</th>
                    <th className="py-3 pr-4">Average</th>
                    <th className="py-3 pr-4">Ray Max</th>
                    <th className="py-3 pr-4">Match</th>
                    <th className="py-3 pr-4">Taken/Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {visiblePlayerPoolRows.length > 0 ? (
                    visiblePlayerPoolRows.map((player) => {
                      const preferenceTags = getPlayerPoolPreferenceTags(player);
                      const byeWeek = getByeWeekForNflTeam(player.nflTeam);
                      const purchaseMatch = getPlayerPoolPurchaseMatch(
                        player,
                        activePurchaseRows
                      );
                      const playerStatus = getPlayerPoolDisplayStatus(
                        player,
                        activePurchaseRows,
                        isUsingSleeperPurchases
                      );
                      const bidRecommendation = getPlayerBidRecommendation(
                        player,
                        preferenceTags,
                        bidRecommendationContext
                      );
                      const topBidReason =
                        bidRecommendation.reasons[0] ??
                        `${bidRecommendation.reasons.length} reasons`;

                      return (
                        <tr
                          key={player.rowNumber}
                          aria-pressed={selectedPlayerRowNumber === player.rowNumber}
                          className={`cursor-pointer text-sm transition hover:bg-orange-600/5 ${selectedPlayerRowNumber === player.rowNumber ? 'bg-orange-600/10' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectManualSalePlayer(player)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              selectManualSalePlayer(player);
                            }
                          }}
                        >
                          <td className="py-3 pr-4 font-black">{player.originalPlayerName}</td>
                          <td className="py-3 pr-4">
                            {player.matchedSleeperName ? (
                              <div>
                                <p className="font-black">{player.matchedSleeperName}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                  ID {player.sleeperPlayerId ?? 'N/A'}
                                </p>
                              </div>
                            ) : (
                              <span className="font-bold text-gray-500 dark:text-gray-400">Unmatched</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {preferenceTags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {preferenceTags.map((tag) => (
                                  <PreferenceBadge key={tag} tag={tag} />
                                ))}
                              </div>
                            ) : (
                              <span className="font-bold text-gray-500 dark:text-gray-400">None</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{player.position ?? 'N/A'}</td>
                          <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{player.nflTeam ?? 'N/A'}</td>
                          <td className="py-3 pr-4 font-black">{formatByeWeek(byeWeek)}</td>
                          <td className="py-3 pr-4 font-black">{formatMoney(player.lowValue ?? null)}</td>
                          <td className="py-3 pr-4 font-black">{formatMoney(player.highValue ?? null)}</td>
                          <td className="py-3 pr-4 font-black text-orange-600">{formatMoney(player.averageValue ?? null)}</td>
                          <td className="py-3 pr-4">
                            <div className="flex min-w-44 flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-lg font-black text-orange-600">
                                  {formatMoney(bidRecommendation.recommendedMaxBid)}
                                </span>
                                <StatusPill status={bidRecommendation.confidence} />
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {topBidReason}
                              </p>
                              {bidRecommendation.warnings.length > 0 && (
                                <span className="w-fit rounded-full border border-orange-600/20 bg-orange-600/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-orange-600">
                                  {bidRecommendation.warnings.length} warning{bidRecommendation.warnings.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4"><StatusPill status={player.matchStatus} /></td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-col gap-1">
                              <span className="w-fit rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                                {playerStatus}
                              </span>
                              {purchaseMatch && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                  {getTeam(purchaseMatch.teamId)?.teamName ?? `Roster ${purchaseMatch.rosterId ?? 'N/A'}`} | {formatMoney(purchaseMatch.purchasePrice)}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={12}
                        className="py-10 text-center text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                      >
                        No player rows match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell
            title="Team Budgets"
            eyebrow={purchaseSourceLabel}
            icon={Users}
            className="hidden"
          >
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Read-only budget math is using {purchaseSourceLabel.toLowerCase()} with keeper costs from the local demo keeper set.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full min-w-[1040px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                    <th className="py-3 pr-4">Team</th>
                    <th className="py-3 pr-4">Manager</th>
                    <th className="py-3 pr-4">Budget</th>
                    <th className="py-3 pr-4">Keeper Cost</th>
                    <th className="py-3 pr-4">Total Spent</th>
                    <th className="py-3 pr-4">Remaining</th>
                    <th className="py-3 pr-4">Open Slots</th>
                    <th className="py-3 pr-4">Max Bid</th>
                    <th className="py-3 pr-4">Avg/Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {budgetRows.map((row) => {
                    const { team } = row;
                    return (
                      <tr key={team.id} className="text-sm">
                        <td className="py-3 pr-4 font-black">{team.teamName}</td>
                        <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{team.managerName}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(team.teamBudget)}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(row.keeperCost)}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(row.totalSpent)}</td>
                        <td className="py-3 pr-4 font-black text-emerald-600">{formatMoney(row.remainingBudget)}</td>
                        <td className="py-3 pr-4 font-black">{row.rosterSpotsRemaining}</td>
                        <td className="py-3 pr-4 font-black text-orange-600">{formatMoney(row.maxBid)}</td>
                        <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">
                          {formatMoneyPerSlot(row.averageDollarsPerOpenSlot)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionShell>

          <SectionShell
            title="Import Prep"
            eyebrow="Future Import Planning"
            icon={FileWarning}
            collapsible
          >
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              {importPrepWarnings.map((warning) => (
                <div
                  key={warning}
                  className="rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    {warning}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {importPrepSources.map((source) => (
                <div
                  key={source.name}
                  className="rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-lg font-black uppercase italic tracking-tight">
                      {source.name}
                    </h3>
                    <span className="w-fit rounded-full border border-black/10 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-400">
                      {source.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                    {source.detail}
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="Auction Log"
            eyebrow="Local Demo Audit Trail"
            icon={History}
            collapsible
          >
            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full min-w-[780px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                    <th className="py-3 pr-4">Time</th>
                    <th className="py-3 pr-4">Action</th>
                    <th className="py-3 pr-4">Actor</th>
                    <th className="py-3 pr-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {mockAuctionAuditLog.map((entry) => (
                    <tr key={entry.id} className="text-sm">
                      <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{formatTimestamp(entry.occurredAt)}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-black">{entry.actorName ?? 'System'}</td>
                      <td className="py-3 pr-4 font-bold text-gray-600 dark:text-gray-300">{entry.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionShell>
        </div>
        </div>
      </main>
    </div>
  );
}
