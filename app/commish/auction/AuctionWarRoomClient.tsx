'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import historicalMasterview2018 from '@/data/auction/processed/masterview-2018.json';
import historicalMasterview2019 from '@/data/auction/processed/masterview-2019.json';
import historicalMasterview2020 from '@/data/auction/processed/masterview-2020.json';
import historicalMasterview2021 from '@/data/auction/processed/masterview-2021.json';
import historicalMasterview2022 from '@/data/auction/processed/masterview-2022.json';
import historicalMasterview2023 from '@/data/auction/processed/masterview-2023.json';
import historicalMasterview2024 from '@/data/auction/processed/masterview-2024.json';
import historicalMasterview2025 from '@/data/auction/processed/masterview-2025.json';
import historicalSleeperAuction2021 from '@/data/auction/historical-results/sleeper-auction-2021.json';
import historicalSleeperAuction2022 from '@/data/auction/historical-results/sleeper-auction-2022.json';
import historicalSleeperAuction2023 from '@/data/auction/historical-results/sleeper-auction-2023.json';
import historicalSleeperAuction2024 from '@/data/auction/historical-results/sleeper-auction-2024.json';
import historicalSleeperAuction2025 from '@/data/auction/historical-results/sleeper-auction-2025.json';
import playerValues2025 from '@/data/auction/processed/player-values-2025.json';
import generatedMasterview2026 from '@/data/auction/generated/masterview-2026.json';
import generatedAdpConsensus2026 from '@/data/auction/adp/generated/adp-consensus-2026.json';
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
import { activeManagers } from '@/lib/managers/activeManagers';
import {
  mockAuctionTeams,
} from '@/lib/auction/mockAuctionData';
import { riverCityAuctionLeagueSettings } from '@/lib/auction/leagueSettings';
import {
  calculateAverageDollarsPerOpenRosterSpot,
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
  type AuctionOwnerPlayerPreference,
  type AuctionOwnerPreferenceTag,
} from '@/lib/auction/ownerPreferenceTypes';
import type { AuctionOwnerProfileSettings } from '@/lib/auction/ownerProfileSettingsTypes';
import type { AuctionAccessResult } from '@/lib/auction/ownerProfiles';
import type { AuctionPurchaseDecisionSnapshot } from '@/lib/auction/purchaseDecisionTypes';
import {
  calculateAuctionInflationState,
  recommendRayJeffreyMaxBid,
  type BidRecommendationNeedLevel,
  type BidRecommendationPreference,
  type BidRecommendationPurchaseSample,
} from '@/lib/auction/bidRecommendations';
import {
  calculateDraftIntelligence,
  type DraftIntelligenceRecommendation,
} from '@/lib/auction/draftIntelligence';
import { calculateCompetitionContext } from '@/lib/auction/competitionContext';
import {
  buildDraftCoachResponse,
  type DraftCoachDecision,
  type DraftCoachInput,
  type DraftCoachResult,
} from '@/lib/auction/draftCoach';
import {
  calculateHistoricalPricing,
  type HistoricalPricingDocument,
} from '@/lib/auction/historicalPricing';
import {
  calculateHistoricalInflation,
  type HistoricalInflationLiveContext,
  type HistoricalInflationMasterviewDocument,
  type HistoricalInflationPosition,
  type HistoricalInflationSleeperDocument,
  type HistoricalInflationTrend,
} from '@/lib/auction/historicalInflation';
import {
  calculateHistoricalPriceComparison,
  type HistoricalPriceComparisonMasterviewDocument,
  type HistoricalPriceComparisonMatchType,
  type HistoricalPriceComparisonPricingStyle,
  type HistoricalPriceComparisonResult as HistoricalComparisonResultLabel,
  type HistoricalPriceComparisonSleeperDocument,
  type HistoricalPriceComparisonTrend,
} from '@/lib/auction/historicalPriceComparison';
import {
  calculateOwnerTendencies,
  type OwnerTendencyConfidence,
  type OwnerTendencySleeperDocument,
  type OwnerTendencyTimingLabel,
} from '@/lib/auction/ownerTendencies';
import { calculateRoomIntelligence } from '@/lib/auction/roomIntelligence';
import {
  mergeSleeperAuctionPurchaseLayers,
  type SleeperAuctionLayerSource,
} from '@/lib/auction/sleeperAuctionSync';
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

type AuctionWorkspaceId = 'draft' | 'strategy' | 'league-intel' | 'history';

const auctionWorkspaceTabs: Array<{ id: AuctionWorkspaceId; label: string }> = [
  { id: 'draft', label: 'Draft' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'league-intel', label: 'League Intel' },
  { id: 'history', label: 'History' },
];

const draftCoachStarterQuestions = [
  'Should I bid?',
  'Can I overpay a little?',
  'Am I being too conservative?',
  'Am I spending too fast?',
  'How much should I reserve?',
  'Who should I target next?',
];
const riverCityMinimumRosterPrice = 1;

const riverCityHistoricalPricingDocuments = [
  historicalMasterview2018,
  historicalMasterview2019,
  historicalMasterview2020,
  historicalMasterview2021,
  historicalMasterview2022,
  historicalMasterview2023,
  historicalMasterview2024,
  historicalMasterview2025,
] as readonly HistoricalPricingDocument[];

const riverCityPriceComparisonMasterviewDocuments = [
  historicalMasterview2021,
  historicalMasterview2022,
  historicalMasterview2023,
  historicalMasterview2024,
  historicalMasterview2025,
] as readonly HistoricalPriceComparisonMasterviewDocument[];

const riverCityHistoricalInflationMasterviewDocuments = [
  historicalMasterview2021,
  historicalMasterview2022,
  historicalMasterview2023,
  historicalMasterview2024,
  historicalMasterview2025,
] as readonly HistoricalInflationMasterviewDocument[];

const riverCitySleeperAuctionDocuments = [
  historicalSleeperAuction2021,
  historicalSleeperAuction2022,
  historicalSleeperAuction2023,
  historicalSleeperAuction2024,
  historicalSleeperAuction2025,
] as readonly HistoricalPriceComparisonSleeperDocument[];

const riverCityHistoricalInflationSleeperDocuments = [
  historicalSleeperAuction2021,
  historicalSleeperAuction2022,
  historicalSleeperAuction2023,
  historicalSleeperAuction2024,
  historicalSleeperAuction2025,
] as readonly HistoricalInflationSleeperDocument[];

const riverCityOwnerTendencyDocuments = [
  historicalSleeperAuction2021,
  historicalSleeperAuction2022,
  historicalSleeperAuction2023,
  historicalSleeperAuction2024,
  historicalSleeperAuction2025,
] as readonly OwnerTendencySleeperDocument[];

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
  sourceCount?: number | null;
  confidenceScore?: number | null;
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

type GeneratedAdpConsensusRow = {
  season: number;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  sourceCount: number;
  consensusOverallAdp: number;
  medianOverallAdp: number;
  consensusPositionAdp: number | null;
  minOverallAdp: number;
  maxOverallAdp: number;
  adpSpread: number;
  demandScore: number;
  demandTier: string;
  waitRisk: string;
  confidence: string;
  warnings?: string[];
};

type GeneratedAdpConsensusFile = {
  generatedAt: string;
  season: number;
  sourceFiles: string[];
  rowCount: number;
  sourceValueCount: number;
  skippedSourceValueCount: number;
  rows: GeneratedAdpConsensusRow[];
  activeRunId?: string | null;
  includedSourceKeys?: string[];
};

type AuctionValueSourceOption = {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  file: ProcessedPlayerValuesFile;
};

export type AuctionWarRoomInitialValueSource = {
  file: GeneratedMasterviewFile | null;
  label: string;
  shortLabel: string;
  path: string;
  warning?: string | null;
  activeRunId?: string | null;
};

export type AuctionWarRoomInitialAdpSource = {
  file: GeneratedAdpConsensusFile | null;
  label: string;
  shortLabel: string;
  warning?: string | null;
  activeRunId?: string | null;
};

export type AuctionWarRoomInitialOwnerPreference =
  AuctionOwnerPlayerPreference;
export type AuctionWarRoomInitialOwnerSettings =
  AuctionOwnerProfileSettings;
export type AuctionWarRoomInitialPurchaseDecision =
  AuctionPurchaseDecisionSnapshot;

type PlayerPoolSortKey =
  | 'averageValue'
  | 'highValue'
  | 'adp'
  | 'demandPressure'
  | 'plannedCap'
  | 'preferredEntry'
  | 'position'
  | 'playerName';
type PlayerPoolPreferenceFilter = 'all' | 'target' | 'fade' | 'watch';
type PlayerPoolPreferenceTag = Exclude<PlayerPoolPreferenceFilter, 'all'>;
type MyBoardFilter = 'targets' | 'watch' | 'available' | 'drafted' | 'fades';
type DraftUtilitySection = 'budgets' | 'heat' | 'trends' | 'sales';
type HistoryAuditFilter = 'all' | 'purchases' | 'keepers' | 'manual' | 'warnings';
type SleeperSnapshotLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type AdvisorChatRequestStatus = 'idle' | 'loading' | 'error';

type SleeperSnapshotKeeper = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  keeperPrice: number | null;
  keeperRound: number | null;
  source: 'sleeper-keeper';
  priceStatus: 'confirmed' | 'missing';
};

type SleeperSnapshotCompletedPurchase = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  salePrice: number | null;
  pickNumber: number | null;
  isKeeper: boolean;
  source: 'sleeper-draft';
};

type SleeperSnapshotTeam = {
  rosterId: number;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
};

type SleeperSnapshotResponse = {
  source?: 'sleeper';
  season: number;
  leagueId?: string | null;
  draftId?: string | null;
  syncStatus?: 'complete' | 'partial';
  status?: string;
  draft?: {
    draft_id?: string | null;
    status?: string | null;
    type?: string | null;
  } | null;
  keepers?: SleeperSnapshotKeeper[];
  completedPurchases?: SleeperSnapshotCompletedPurchase[];
  purchases?: SleeperSnapshotCompletedPurchase[];
  teams?: SleeperSnapshotTeam[];
  counts?: {
    purchases: number;
    picks: number;
    pricedPurchases: number;
    missingAuctionPrices: number;
    keepers: number;
    completedPurchases?: number;
    missingKeeperPrices?: number;
    warnings?: number;
  };
  diagnostics?: {
    draftsFound: number;
    selectedDraftId: string | null;
    selectedDraftType: string | null;
    selectedDraftStatus: string | null;
    rawPickCount: number;
    keeperPickCount: number;
    rosterKeeperCount: number;
    normalizedKeeperCount: number;
    completedPurchaseCount: number;
    keeperSourcesUsed: string[];
  };
  warnings?: string[];
  fetchedAt?: string;
  error?: string;
};

type PurchaseSource = SleeperAuctionLayerSource;

type AuctionWarRoomPurchaseRow = {
  id: string;
  teamId: AuctionTeamId;
  rosterId: number | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  purchasePrice: number;
  priceStatus?: 'confirmed' | 'missing';
  isKeeper?: boolean;
  pickNumber?: number | null;
  keeperRound?: number | null;
  recordedAt?: string | null;
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
  if (source === 'manual-local') return 'Manual Local';
  if (source === 'sleeper-keeper') return 'Sleeper Keeper';
  if (source === 'sleeper-draft') return 'Sleeper Draft';
  return 'Live War Room State';
}

function formatHistorySourceLabel(source: PurchaseSource | 'sync-warning') {
  if (source === 'manual-local') return 'MANUAL FALLBACK';
  if (source === 'sleeper-keeper') return 'SLEEPER KEEPER';
  if (source === 'sleeper-draft') return 'SLEEPER PURCHASE';
  return 'SYNC WARNING';
}

function getHistoryAuditStatusClass(status: string) {
  if (status === 'WARNING' || status === 'PRICE MISSING') {
    return 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300';
  }

  if (status === 'OVERPAY') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (status === 'BARGAIN' || status === 'CONFIRMED') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
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
  intelSummary?: unknown;
  buddyMessage?: unknown;
  riskGuidance?: unknown;
  budgetPace?: unknown;
  spendGuidance?: unknown;
  reasons?: unknown;
  warnings?: unknown;
  source?: unknown;
  contextSummary?: unknown;
  error?: unknown;
};

type DraftCoachChatMessage = DraftCoachResult & {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  sourceLabel: 'Protected local coach' | 'Local coach fallback';
};

const localPlayerValues2025 = playerValues2025 as ProcessedPlayerValuesFile;
const generatedMasterviewValues2026 =
  generatedMasterview2026 as GeneratedMasterviewFile;
const localAdpConsensus2026 =
  generatedAdpConsensus2026 as GeneratedAdpConsensusFile;

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
    sourceCount: row.sourceCount ?? null,
    confidenceScore: row.confidenceScore ?? null,
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
const defaultActiveAuctionValueSource =
  auctionValueSourceOptions.find((source) => source.file.rows.length > 0) ??
  auctionValueSourceOptions[1];
let activeAuctionValueSource = defaultActiveAuctionValueSource;
let localPlayerValues = activeAuctionValueSource.file;
let localPlayerPoolRows = localPlayerValues.rows;
let playerPoolValueSourceLabel = activeAuctionValueSource.label;
let playerPoolValueSourceShortLabel = activeAuctionValueSource.shortLabel;
let playerPoolValueSourcePath = activeAuctionValueSource.path;
let playerPoolValueSourceWarning: string | null = null;
let runtimeAuctionValueSourceFingerprint = 'local-default';

function refreshAuctionValueSourceDerivedState() {
  localPlayerValues = activeAuctionValueSource.file;
  localPlayerPoolRows = localPlayerValues.rows;
  playerPoolValueSourceLabel = activeAuctionValueSource.label;
  playerPoolValueSourceShortLabel = activeAuctionValueSource.shortLabel;
  playerPoolValueSourcePath = activeAuctionValueSource.path;
  playerPoolPositionOptions = Array.from(
    new Set(
      localPlayerPoolRows
        .map((player) => player.position)
        .filter((position): position is string => Boolean(position))
    )
  ).sort();
  playerPoolMatchStatusOptions = Array.from(
    new Set(localPlayerPoolRows.map((player) => player.matchStatus))
  ).sort();
  playerPoolStatusOptions = sortPlayerPoolStatuses(Array.from(
    new Set(localPlayerPoolRows.map((player) => formatPlayerPoolStatus(player.status)))
  ));
  guidancePlayerValues = localPlayerPoolRows.map((player) => ({
    playerName: player.originalPlayerName,
    matchedPlayerName: player.matchedSleeperName,
    position: player.position,
    averageValue: player.averageValue,
    highValue: player.highValue,
  }));
}

function applyRuntimeAuctionValueSource(
  initialValueSource?: AuctionWarRoomInitialValueSource
) {
  const nextFingerprint =
    initialValueSource?.file && initialValueSource.file.rows.length > 0
      ? `${initialValueSource.activeRunId ?? 'published'}-${initialValueSource.file.generatedAt}-${initialValueSource.file.rowCount}`
      : 'local-default';

  if (runtimeAuctionValueSourceFingerprint === nextFingerprint) {
    playerPoolValueSourceWarning = initialValueSource?.warning ?? null;
    return;
  }

  activeAuctionValueSource =
    initialValueSource?.file && initialValueSource.file.rows.length > 0
      ? {
          id: 'published-2026',
          label: initialValueSource.label,
          shortLabel: initialValueSource.shortLabel,
          path: initialValueSource.path,
          file: mapGeneratedMasterviewFileToProcessedValuesFile(
            initialValueSource.file
          ),
        }
      : defaultActiveAuctionValueSource;
  playerPoolValueSourceWarning = initialValueSource?.warning ?? null;
  runtimeAuctionValueSourceFingerprint = nextFingerprint;
  refreshAuctionValueSourceDerivedState();
}

let activeAdpConsensus = localAdpConsensus2026;
let adpSourceLabel = 'Local 2026 ADP consensus';
let adpSourceWarning: string | null = null;
let runtimeAdpSourceFingerprint = 'local-adp-default';
let adpByPlayerId = new Map<string, GeneratedAdpConsensusRow>();
let adpByNamePosition = new Map<string, GeneratedAdpConsensusRow>();

function normalizeAdpLookupName(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\.?$/i, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ') ?? '';
}

function refreshAdpLookupState() {
  adpByPlayerId = new Map();
  adpByNamePosition = new Map();

  for (const row of activeAdpConsensus.rows ?? []) {
    if (row.playerId) adpByPlayerId.set(row.playerId, row);
    adpByNamePosition.set(
      `${normalizeAdpLookupName(row.playerName)}|${row.position}`,
      row
    );
  }
}

function applyRuntimeAdpSource(initialAdpSource?: AuctionWarRoomInitialAdpSource) {
  const nextFingerprint =
    initialAdpSource?.file && initialAdpSource.file.rows.length > 0
      ? `${initialAdpSource.activeRunId ?? 'published-adp'}-${initialAdpSource.file.generatedAt}-${initialAdpSource.file.rowCount}`
      : 'local-adp-default';

  if (runtimeAdpSourceFingerprint === nextFingerprint) {
    adpSourceWarning = initialAdpSource?.warning ?? null;
    return;
  }

  activeAdpConsensus =
    initialAdpSource?.file && initialAdpSource.file.rows.length > 0
      ? initialAdpSource.file
      : localAdpConsensus2026;
  adpSourceLabel = initialAdpSource?.file
    ? initialAdpSource.label
    : 'Local 2026 ADP consensus';
  adpSourceWarning = initialAdpSource?.warning ?? null;
  runtimeAdpSourceFingerprint = nextFingerprint;
  refreshAdpLookupState();
}

refreshAdpLookupState();
const playerPoolInitialDisplayLimit = 250;
const emptySleeperKeepers: SleeperSnapshotKeeper[] = [];
const emptySleeperPurchases: SleeperSnapshotCompletedPurchase[] = [];
const sleeperAutoRefreshIntervalMs = 180_000;
let sharedSleeperAutoSnapshotRequest: Promise<SleeperSnapshotResponse> | null = null;

async function fetchSleeperSnapshotPayload() {
  const response = await fetch('/api/auction/sleeper-snapshot?season=2026', {
    cache: 'no-store',
  });
  const payload = (await response.json()) as SleeperSnapshotResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to refresh Sleeper snapshot.');
  }

  return payload;
}

function fetchSharedSleeperAutoSnapshotPayload() {
  if (!sharedSleeperAutoSnapshotRequest) {
    sharedSleeperAutoSnapshotRequest = fetchSleeperSnapshotPayload().finally(() => {
      sharedSleeperAutoSnapshotRequest = null;
    });
  }

  return sharedSleeperAutoSnapshotRequest;
}

const playerPoolSortOptions: Array<{ label: string; value: PlayerPoolSortKey }> = [
  { label: 'Average Value', value: 'averageValue' },
  { label: 'High Value', value: 'highValue' },
  { label: 'ADP', value: 'adp' },
  { label: 'Demand Pressure', value: 'demandPressure' },
  { label: 'Planned Cap', value: 'plannedCap' },
  { label: 'Preferred Entry', value: 'preferredEntry' },
  { label: 'Position', value: 'position' },
  { label: 'Player Name', value: 'playerName' },
];

const myBoardFilterOptions: Array<{ label: string; value: MyBoardFilter }> = [
  { label: 'Available', value: 'available' },
  { label: 'Targets', value: 'targets' },
  { label: 'Watch', value: 'watch' },
  { label: 'Drafted', value: 'drafted' },
  { label: 'Fades', value: 'fades' },
];

const draftPlanTagOptions: Array<{
  label: string;
  value: AuctionOwnerPreferenceTag;
}> = [
  { label: 'Open', value: 'open' },
  { label: 'Target', value: 'target' },
  { label: 'Watch', value: 'watch' },
  { label: 'Fade', value: 'fade' },
];

const ownerSettingsLabelMap = {
  rosterConstruction: {
    balanced: 'Balanced',
    'stars-and-scrubs': 'Stars and Scrubs',
    'value-heavy': 'Value Heavy',
    'hero-rb': 'Hero RB',
    'zero-rb': 'Zero RB',
    custom: 'Custom / Unsure',
  },
  riskTolerance: {
    conservative: 'Conservative',
    balanced: 'Balanced',
    aggressive: 'Aggressive',
  },
  keeperFocus: {
    low: 'Keeper Focus: Low',
    medium: 'Keeper Focus: Medium',
    high: 'Keeper Focus: High',
  },
  rookiePreference: {
    low: 'Rookies: Low',
    medium: 'Rookies: Medium',
    high: 'Rookies: High',
  },
  nominationStyle: {
    targets: 'Nominate Targets',
    decoys: 'Nominate Decoys',
    mixed: 'Mixed Nominations',
    ai: 'AI Nominations',
  },
  kickerDefenseStrategy: {
    minimum: 'K/DEF: Minimum',
    'elite-small-premium': 'K/DEF: Small Premium',
    flexible: 'K/DEF: Flexible',
  },
  draftGoal: {
    'win-now': 'Win Now',
    balanced: 'Balanced Goal',
    'keeper-build': 'Keeper Build',
    learning: 'Learning Mode',
  },
} as const;

const draftUtilitySections: Array<{
  label: string;
  value: DraftUtilitySection;
  icon: string;
}> = [
  { label: 'Budgets', value: 'budgets', icon: '💰' },
  { label: 'Heat', value: 'heat', icon: '🔥' },
  { label: 'Trends', value: 'trends', icon: '📈' },
  { label: 'Recent Sales', value: 'sales', icon: '🕒' },
];

const historyAuditFilterOptions: Array<{ label: string; value: HistoryAuditFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Purchases', value: 'purchases' },
  { label: 'Keepers', value: 'keepers' },
  { label: 'Manual', value: 'manual' },
  { label: 'Warnings', value: 'warnings' },
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

type DraftPlanPreferenceMap = Map<string, AuctionOwnerPlayerPreference>;

function buildDraftPlanPreferenceMap(
  preferences: readonly AuctionOwnerPlayerPreference[]
): DraftPlanPreferenceMap {
  return new Map(
    preferences.flatMap((preference) => {
      const playerId = normalizeFilterValue(preference.sleeperPlayerId);
      return playerId ? [[playerId, preference] as const] : [];
    })
  );
}

function getPlayerDraftPlanKey(player: ProcessedPlayerValueRow) {
  return normalizeFilterValue(player.sleeperPlayerId);
}

function getDraftPlanPreferenceForPlayer(
  player: ProcessedPlayerValueRow,
  preferencesByPlayerId: DraftPlanPreferenceMap
) {
  const playerId = getPlayerDraftPlanKey(player);
  return playerId ? preferencesByPlayerId.get(playerId) ?? null : null;
}

function getEffectivePlayerPoolPreferenceTags(
  player: ProcessedPlayerValueRow,
  preferencesByPlayerId: DraftPlanPreferenceMap
) {
  const savedPreference = getDraftPlanPreferenceForPlayer(
    player,
    preferencesByPlayerId
  );

  if (savedPreference) {
    return savedPreference.tag === 'open'
      ? []
      : [savedPreference.tag as PlayerPoolPreferenceTag];
  }

  return getPlayerPoolPreferenceTags(player);
}

function getDraftPlanEditorTag(
  player: ProcessedPlayerValueRow,
  preferencesByPlayerId: DraftPlanPreferenceMap
) {
  const savedPreference = getDraftPlanPreferenceForPlayer(
    player,
    preferencesByPlayerId
  );
  if (savedPreference) return savedPreference.tag;

  return getPlayerPoolPreferenceTags(player)[0] ?? 'open';
}

function hasDraftPlanDetails(preference: AuctionOwnerPlayerPreference | null) {
  return Boolean(
    preference &&
      (preference.preferredEntry !== null ||
        preference.plannedCap !== null ||
        preference.note)
  );
}

const rosterGuidanceSeverityStyles: Record<RosterGuidanceSeverity, string> = {
  ok: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-600',
  watch: 'border-orange-600/20 bg-orange-600/10 text-orange-600',
  danger: 'border-rose-600/20 bg-rose-600/10 text-rose-600',
};

function formatMoney(amount: number | null) {
  return amount === null ? 'N/A' : `$${amount}`;
}

function formatDraftBoardTitle(teamName: string | null | undefined) {
  const trimmedTeamName = teamName?.trim();
  return trimmedTeamName ? `${trimmedTeamName} Draft Board` : 'My Draft Board';
}

function getOwnerRoleLabel(access: AuctionAccessResult) {
  return access.role === 'pilot-owner' ? 'Pilot' : 'Commissioner';
}

function getOwnerSettingsSummary(
  settings: AuctionOwnerProfileSettings | null | undefined
) {
  if (!settings?.onboardingCompleted) return null;

  const positionPriorities =
    settings.positionPriorities.length > 0
      ? `${settings.positionPriorities.join('/')} Priority`
      : 'No Position Priority';

  return [
    ownerSettingsLabelMap.rosterConstruction[settings.rosterConstruction],
    ownerSettingsLabelMap.riskTolerance[settings.riskTolerance],
    ownerSettingsLabelMap.keeperFocus[settings.keeperFocus],
    positionPriorities,
  ].join(' · ');
}

function getPurchaseVariance(
  salePrice: number,
  referencePrice: number | null | undefined
) {
  return typeof referencePrice === 'number' && Number.isFinite(referencePrice)
    ? salePrice - referencePrice
    : null;
}

function formatNullableSignedMoney(amount: number | null) {
  if (amount === null) return 'N/A';
  if (amount > 0) return `+${formatMoney(amount)}`;
  if (amount < 0) return `-${formatMoney(Math.abs(amount))}`;
  return '$0';
}

function formatWarRoomTerminology(text: string) {
  return text
    .replace(/\bmy hard cap\b/gi, 'planned cap')
    .replace(/\bhard caps\b/gi, 'planned caps')
    .replace(/\bhard cap\b/gi, 'planned cap')
    .replace(/\bopening bid\b/gi, 'preferred entry');
}

function formatPurchaseDecisionSnapshotLine(
  snapshot: AuctionPurchaseDecisionSnapshot | null | undefined
) {
  if (!snapshot || snapshot.status === 'undone') return null;

  return [
    `Plan ${formatMoney(snapshot.plannedCapAtPurchase)}`,
    `AI ${formatMoney(snapshot.currentAiCeilingAtPurchase)}`,
    `Paid ${formatMoney(snapshot.salePrice)}`,
    `${formatNullableSignedMoney(snapshot.plannedCapVariance)} vs plan`,
    `${formatNullableSignedMoney(snapshot.aiCeilingVariance)} vs AI`,
  ].join(' · ');
}

function formatHistoricalMoney(amount: number | null) {
  if (amount === null) return 'N/A';

  const roundedAmount = Math.round(amount * 10) / 10;
  return Number.isInteger(roundedAmount)
    ? `$${roundedAmount}`
    : `$${roundedAmount.toFixed(1)}`;
}

function formatHistoricalDifference(amount: number | null) {
  if (amount === null) return 'N/A';
  if (amount > 0) return `+${formatHistoricalMoney(amount)}`;
  if (amount < 0) return `-${formatHistoricalMoney(Math.abs(amount))}`;
  return '$0';
}

function sumHistoricalMoneyValues(values: readonly (number | null)[]) {
  const safeValues = values.filter((value): value is number => value !== null);
  return safeValues.length === values.length
    ? safeValues.reduce((sum, value) => sum + value, 0)
    : null;
}

function formatHistoricalPercent(amount: number | null) {
  if (amount === null) return 'N/A';

  const percent = Math.round(amount * 1000) / 10;
  const formattedPercent = Number.isInteger(percent)
    ? String(percent)
    : percent.toFixed(1);

  if (percent > 0) return `+${formattedPercent}%`;
  return `${formattedPercent}%`;
}

function formatHistoricalComparisonResult(
  result: HistoricalComparisonResultLabel
) {
  if (result === 'overpay') return 'OVERPAY';
  if (result === 'bargain') return 'BARGAIN';
  if (result === 'fair') return 'FAIR';
  return 'UNKNOWN';
}

function getHistoricalComparisonResultClass(
  result: HistoricalComparisonResultLabel
) {
  if (result === 'overpay') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (result === 'bargain') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (result === 'fair') {
    return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }

  return 'border-black/10 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300';
}

function formatHistoricalComparisonStyle(
  style: HistoricalPriceComparisonPricingStyle
) {
  if (style === 'usually-overpays') return 'Usually Overpays';
  if (style === 'usually-discounts') return 'Usually Discounts';
  if (style === 'usually-fair') return 'Usually Fair';
  if (style === 'mixed') return 'Mixed';
  return 'Insufficient';
}

function formatHistoricalComparisonTrend(
  trend: HistoricalPriceComparisonTrend
) {
  if (trend === 'rising') return 'Rising';
  if (trend === 'falling') return 'Falling';
  if (trend === 'stable') return 'Stable';
  return 'Insufficient';
}

function formatHistoricalComparisonMatchType(
  matchType: HistoricalPriceComparisonMatchType
) {
  if (matchType === 'sleeper-id') return 'Sleeper ID Match';
  if (matchType === 'name-position') return 'Name + Position Match';
  return 'No Confident Match';
}

function formatHistoricalRate(value: number | null) {
  if (value === null) return 'N/A';

  const percent = Math.round(value * 1000) / 10;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function formatCompetitionShare(value: number | null) {
  if (value === null) return 'N/A';

  return `${Math.round(value * 100)}%`;
}

function formatHistoricalInflationTrend(trend: HistoricalInflationTrend) {
  if (trend === 'rising') return 'Rising';
  if (trend === 'falling') return 'Falling';
  if (trend === 'stable') return 'Stable';
  if (trend === 'mixed') return 'Mixed';
  return 'Insufficient';
}

function formatHistoricalLiveContext(context: HistoricalInflationLiveContext) {
  if (context === 'hotter-than-normal') return 'HOTTER THAN NORMAL';
  if (context === 'colder-than-normal') return 'COLDER THAN NORMAL';
  if (context === 'near-normal') return 'NEAR NORMAL';
  return 'INSUFFICIENT LIVE SAMPLE';
}

function getHistoricalLiveContextClass(context: HistoricalInflationLiveContext) {
  if (context === 'hotter-than-normal') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (context === 'colder-than-normal') {
    return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }

  if (context === 'near-normal') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300';
}

function getOwnerTendencyConfidenceClass(confidence: OwnerTendencyConfidence) {
  if (confidence === 'High') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (confidence === 'Medium') {
    return 'border-yellow-600/20 bg-yellow-600/10 text-yellow-700 dark:text-yellow-300';
  }

  return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
}

function formatOwnerTimingLabel(label: OwnerTendencyTimingLabel) {
  if (label === 'early') return 'Early';
  if (label === 'middle') return 'Middle';
  if (label === 'late') return 'Late';
  if (label === 'mixed') return 'Mixed';
  return 'Insufficient';
}

function formatOwnerPurchaseOrder(value: number | null) {
  return value === null ? 'N/A' : `#${Math.round(value)}`;
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

  if (purchaseMatch?.source === 'manual-local') {
    return 'Manual Taken';
  }

  if (
    isUsingSleeperPurchases &&
    (purchaseMatch?.source === 'sleeper-keeper' ||
      purchaseMatch?.source === 'sleeper-draft')
  ) {
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

function getAdpForPlayer(player: ProcessedPlayerValueRow | null | undefined) {
  if (!player) return null;
  if (player.sleeperPlayerId) {
    const byId = adpByPlayerId.get(player.sleeperPlayerId);
    if (byId) return byId;
  }

  return (
    adpByNamePosition.get(
      `${normalizeAdpLookupName(player.matchedSleeperName ?? player.originalPlayerName)}|${player.position ?? ''}`
    ) ?? null
  );
}

function getAdpSortableValue(player: ProcessedPlayerValueRow) {
  const adp = getAdpForPlayer(player);
  return typeof adp?.consensusOverallAdp === 'number'
    ? -adp.consensusOverallAdp
    : Number.NEGATIVE_INFINITY;
}

function formatAdp(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(value % 1 === 0 ? 0 : 1)
    : 'N/A';
}

function sortPlayerPoolRows(
  players: ProcessedPlayerValueRow[],
  sortKey: PlayerPoolSortKey,
  preferencesByPlayerId?: DraftPlanPreferenceMap
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

    if (sortKey === 'adp') {
      const valueDifference =
        getAdpSortableValue(secondPlayer) - getAdpSortableValue(firstPlayer);
      if (valueDifference !== 0) return valueDifference;
    }

    if (sortKey === 'demandPressure') {
      const valueDifference =
        getSortableNumber(getAdpForPlayer(secondPlayer)?.demandScore) -
        getSortableNumber(getAdpForPlayer(firstPlayer)?.demandScore);
      if (valueDifference !== 0) return valueDifference;
    }

    if (sortKey === 'plannedCap') {
      const valueDifference =
        getSortableNumber(
          preferencesByPlayerId
            ? getDraftPlanPreferenceForPlayer(secondPlayer, preferencesByPlayerId)
                ?.plannedCap
            : null
        ) -
        getSortableNumber(
          preferencesByPlayerId
            ? getDraftPlanPreferenceForPlayer(firstPlayer, preferencesByPlayerId)
                ?.plannedCap
            : null
        );
      if (valueDifference !== 0) return valueDifference;
    }

    if (sortKey === 'preferredEntry') {
      const valueDifference =
        getSortableNumber(
          preferencesByPlayerId
            ? getDraftPlanPreferenceForPlayer(secondPlayer, preferencesByPlayerId)
                ?.preferredEntry
            : null
        ) -
        getSortableNumber(
          preferencesByPlayerId
            ? getDraftPlanPreferenceForPlayer(firstPlayer, preferencesByPlayerId)
                ?.preferredEntry
            : null
        );
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
    budgetIsIncomplete: boolean;
    missingKeeperPriceCount: number;
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

type CurrentNominationRecommendation =
  | 'BID'
  | 'LAST BID'
  | 'WAIT'
  | 'PASS'
  | 'DO NOT BID';

function getCurrentNominationRecommendation(
  status: string | null,
  recommendation: ReturnType<typeof getPlayerBidRecommendation> | null,
  currentBidValue: number | null,
  rayMaxBid: number | null
): CurrentNominationRecommendation {
  if (!recommendation) return 'WAIT';
  if (status && !isAvailablePlayerPoolStatus(status)) return 'DO NOT BID';
  if (currentBidValue !== null && rayMaxBid !== null) {
    if (currentBidValue < rayMaxBid) return 'BID';
    if (currentBidValue === rayMaxBid) return 'LAST BID';
    return 'PASS';
  }
  if (recommendation.recommendedMaxBid <= 0) return 'DO NOT BID';
  if (recommendation.confidence === 'high') return 'BID';
  if (recommendation.confidence === 'medium') return 'WAIT';
  return 'PASS';
}

function applyActionableCeilingToRecommendation({
  recommendation,
  currentBidValue,
  actionableCeiling,
}: {
  recommendation: CurrentNominationRecommendation;
  currentBidValue: number | null;
  actionableCeiling: number | null;
}): CurrentNominationRecommendation {
  if (currentBidValue === null || actionableCeiling === null) {
    return recommendation;
  }

  if (currentBidValue > actionableCeiling) return 'PASS';
  if (
    currentBidValue === actionableCeiling &&
    recommendation !== 'PASS' &&
    recommendation !== 'DO NOT BID'
  ) {
    return 'LAST BID';
  }

  return recommendation;
}

type CurrentAiCeilingResult = {
  ceiling: number | null;
  reasons: string[];
  warnings: string[];
  detail: string;
};

function deriveCurrentAiCeiling({
  baselineRecommendedMax,
  plannedCap,
  legalMax,
  position,
  preferenceTags,
  kDefStrategyMax,
  marketValue,
  predictedWinningBid,
  confidenceScore,
  currentBid,
  roomRunStatus,
  roomScarcityLabel,
  competitionThreatCount,
  adpDemandScore,
  adpWaitRisk,
}: {
  baselineRecommendedMax: number | null;
  plannedCap: number | null;
  legalMax: number | null;
  position: string | null | undefined;
  preferenceTags: readonly PlayerPoolPreferenceTag[];
  kDefStrategyMax: number | null;
  marketValue: number | null;
  predictedWinningBid: number | null;
  confidenceScore: number | null;
  currentBid: number | null;
  roomRunStatus: string | null | undefined;
  roomScarcityLabel: string | null | undefined;
  competitionThreatCount: number | null;
  adpDemandScore: number | null;
  adpWaitRisk: string | null | undefined;
}): CurrentAiCeilingResult {
  const baseValues = [
    baselineRecommendedMax,
    predictedWinningBid,
    marketValue,
  ].filter((value): value is number => value !== null && Number.isFinite(value));
  const baseCeiling =
    baseValues.length > 0 ? Math.max(...baseValues.map(Math.round)) : null;

  if (baseCeiling === null) {
    return {
      ceiling: legalMax,
      reasons:
        legalMax === null
          ? []
          : [`No AI ceiling signal is available; Legal Max remains ${formatMoney(legalMax)}.`],
      warnings: [],
      detail: 'No player-specific AI ceiling signal is available.',
    };
  }

  const normalizedPosition = normalizePositionValue(position);
  const reasons: string[] = [`Draft Intelligence base ceiling is ${formatMoney(baseCeiling)}.`];
  const warnings: string[] = [];
  let lift = 0;

  if (preferenceTags.includes('target')) {
    lift += 1;
    reasons.push('Target tag supports a small ceiling lift.');
  }

  if (roomRunStatus === 'active') {
    lift += 1;
    reasons.push('Room Intelligence shows an active position run.');
  } else if (roomRunStatus === 'extreme') {
    lift += 2;
    reasons.push('Room Intelligence shows an extreme position run.');
  }

  if (roomScarcityLabel === 'thin') {
    lift += 1;
    reasons.push('Room Intelligence shows thin position scarcity.');
  } else if (roomScarcityLabel === 'critical') {
    lift += 2;
    reasons.push('Room Intelligence shows critical position scarcity.');
  }

  if ((competitionThreatCount ?? 0) >= 3) {
    lift += 2;
    reasons.push('Live competition shows multiple owners can need and afford this player.');
  } else if ((competitionThreatCount ?? 0) > 0) {
    lift += 1;
    reasons.push('Live competition shows at least one owner can need and afford this player.');
  }

  if ((adpDemandScore ?? 0) >= 80) {
    lift += 2;
    reasons.push('ADP demand is elevated.');
  } else if ((adpDemandScore ?? 0) >= 60) {
    lift += 1;
    reasons.push('ADP demand supports a small lift.');
  }

  if (adpWaitRisk === 'HIGH' || adpWaitRisk === 'ELEVATED') {
    lift += 1;
    reasons.push('ADP wait risk supports a small lift.');
  }

  if ((confidenceScore ?? 100) < 60) {
    lift = Math.max(0, lift - 1);
    warnings.push('AI ceiling lift was limited by lower confidence.');
  }

  const strategicLiftLimit = preferenceTags.includes('target') ? 5 : 3;
  const liveLift = Math.min(lift, strategicLiftLimit);
  let ceiling = baseCeiling + liveLift;

  if (plannedCap !== null && plannedCap > ceiling && preferenceTags.includes('target')) {
    ceiling = Math.min(plannedCap, baseCeiling + strategicLiftLimit);
    reasons.push('Saved Planned Cap supports the upper end of the AI range.');
  }

  if (preferenceTags.includes('fade')) {
    const fadeLimit = Math.min(
      baseCeiling,
      plannedCap ?? baseCeiling,
      marketValue ?? baseCeiling
    );
    ceiling = Math.min(ceiling, fadeLimit);
    warnings.push('Fade tag keeps the AI ceiling at value-only territory.');
  }

  if (kDefStrategyMax !== null) {
    ceiling = Math.min(ceiling, kDefStrategyMax);
    reasons.push(
      `${normalizedPosition} strategy cap keeps the AI ceiling at ${formatMoney(kDefStrategyMax)}.`
    );
  }

  if (legalMax !== null && ceiling > legalMax) {
    ceiling = legalMax;
    warnings.push('Legal Max is below the live AI ceiling and remains the final guardrail.');
  }

  if (currentBid !== null && currentBid > ceiling) {
    warnings.push('Current bid is above the Current AI Ceiling.');
  }

  return {
    ceiling,
    reasons,
    warnings,
    detail:
      liveLift > 0
        ? `Base ${formatMoney(baseCeiling)} plus ${formatMoney(liveLift)} live context lift.`
        : `Base ${formatMoney(baseCeiling)} with no live lift.`,
  };
}

function getCurrentNominationRecommendationClass(
  recommendation: CurrentNominationRecommendation
) {
  if (recommendation === 'BID') {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (recommendation === 'DO NOT BID' || recommendation === 'PASS') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (recommendation === 'WAIT') {
    return 'border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }

  return 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300';
}

function getCurrentNominationRecommendationLabel(
  recommendation: CurrentNominationRecommendation
) {
  if (recommendation === 'BID') return 'BID NOW';
  if (recommendation === 'PASS') return 'LET HIM GO';
  return recommendation;
}

function getCurrentNominationConfidenceClass(confidenceScore: number) {
  if (confidenceScore >= 80) {
    return 'text-emerald-700 dark:text-emerald-300';
  }

  if (confidenceScore >= 50) {
    return 'text-yellow-700 dark:text-yellow-300';
  }

  return 'text-rose-700 dark:text-rose-300';
}

function formatCurrentNominationValueGap(valueGap: number | null) {
  if (valueGap === null) return '—';
  if (valueGap > 0) return `+${formatMoney(valueGap)}`;
  if (valueGap < 0) return `-${formatMoney(Math.abs(valueGap))}`;
  return '$0';
}

function formatMissingKeeperPriceCount(count: number) {
  return `${count} keeper price${count === 1 ? '' : 's'} missing`;
}

function formatRemainingRosterSpotCount(count: number) {
  return `${count} remaining roster spot${count === 1 ? '' : 's'}`;
}

function getCurrentNominationValueGapClass(valueGap: number | null) {
  if (valueGap === null) return 'text-gray-500 dark:text-gray-400';
  if (valueGap > 0) return 'text-emerald-700 dark:text-emerald-300';
  if (valueGap < 0) return 'text-rose-700 dark:text-rose-300';
  return 'text-yellow-700 dark:text-yellow-300';
}

function getBidCeilingState(currentBid: number | null, ownerMaxBid: number | null) {
  if (currentBid === null || ownerMaxBid === null) return 'none';
  if (currentBid > ownerMaxBid) return 'over';
  if (currentBid === ownerMaxBid) return 'equal';
  return 'under';
}

function getHudMoneyClass(bidCeilingState: ReturnType<typeof getBidCeilingState>) {
  if (bidCeilingState === 'over') {
    return 'border-rose-600/25 bg-rose-600/10 text-rose-700 shadow-sm shadow-rose-600/10 dark:text-rose-300';
  }

  if (bidCeilingState === 'equal') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-sm shadow-amber-500/10 dark:text-amber-300';
  }

  return 'border-black/5 bg-black/[0.025] text-gray-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100';
}

function getMyBoardCategoryClass({
  isDrafted,
  isSelected,
  preferenceTags,
}: {
  isDrafted: boolean;
  isSelected: boolean;
  preferenceTags: readonly PlayerPoolPreferenceTag[];
}) {
  if (isDrafted) {
    return isSelected
      ? 'bg-zinc-500/15 text-zinc-500 ring-1 ring-inset ring-zinc-500/30'
      : 'bg-zinc-500/[0.04] text-zinc-500 opacity-60';
  }

  if (isSelected) return 'bg-orange-600/10 ring-1 ring-inset ring-orange-600/30';
  if (preferenceTags.includes('target')) return 'hover:bg-emerald-600/10';
  if (preferenceTags.includes('watch')) return 'hover:bg-blue-600/10';
  if (preferenceTags.includes('fade')) return 'hover:bg-rose-600/10';
  return 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]';
}

function getMyBoardStatusLabel({
  isDrafted,
  playerStatus,
  preferenceTags,
}: {
  isDrafted: boolean;
  playerStatus: string;
  preferenceTags: readonly PlayerPoolPreferenceTag[];
}) {
  if (isDrafted) return 'DRAFTED';
  if (preferenceTags.includes('target')) return 'TARGET';
  if (preferenceTags.includes('watch')) return 'WATCH';
  if (preferenceTags.includes('fade')) return 'FADE';
  if (isAvailablePlayerPoolStatus(playerStatus)) return 'OPEN';
  return playerStatus.toUpperCase();
}

function getMyBoardStatusClass(statusLabel: string) {
  if (statusLabel === 'TARGET') {
    return 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }

  if (statusLabel === 'WATCH') {
    return 'bg-blue-600/10 text-blue-700 dark:text-blue-300';
  }

  if (statusLabel === 'FADE') {
    return 'bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (statusLabel === 'DRAFTED') {
    return 'bg-zinc-500/10 text-zinc-500';
  }

  return 'bg-black/5 text-gray-600 dark:bg-white/10 dark:text-gray-300';
}

function getDraftIntelligenceContextualRecommendation(
  recommendation: CurrentNominationRecommendation
): DraftIntelligenceRecommendation {
  if (recommendation === 'DO NOT BID') return 'PASS';
  if (recommendation === 'LAST BID') return 'WAIT';
  return recommendation;
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
  const countedPlayerKeys = new Set<string>();

  purchases
    .filter((purchase) => purchase.teamId === teamId && purchase.status === 'active')
    .forEach((purchase) => {
      const identityKey = getAuctionWarRoomPurchaseIdentityKey(purchase);
      if (countedPlayerKeys.has(identityKey)) return;

      countedPlayerKeys.add(identityKey);
      addPosition(purchase.position);
    });

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

function getByeWeekSeverity(playerCount: number) {
  if (playerCount >= 4) return 'crowded';
  if (playerCount >= 2) return 'watch';
  return 'clear';
}

function getByeWeekSeverityClass(severity: ReturnType<typeof getByeWeekSeverity>) {
  if (severity === 'crowded') {
    return 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  }

  if (severity === 'watch') {
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
  rosterPlayers: readonly RosterGuidancePlayer[],
  getPreferenceTags: (
    player: ProcessedPlayerValueRow
  ) => PlayerPoolPreferenceTag[] = getPlayerPoolPreferenceTags
): AuctionAdvisorPlayerValue[] {
  return localPlayerPoolRows.map((player) => {
    const preferenceTags = getPreferenceTags(player);
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
    const advisorSource =
      purchase.source === 'manual-local' ? 'manual' : 'sleeper';

    return {
      playerName: purchase.playerName,
      position: purchase.position,
      nflTeam: purchase.nflTeam,
      purchasePrice: purchase.purchasePrice,
      projectedValue: purchase.projectedValue,
      lowValue: playerValue?.lowValue ?? null,
      highValue: playerValue?.highValue ?? null,
      averageValue: playerValue?.averageValue ?? null,
      source: advisorSource,
      status: purchase.status,
    };
  });
}

function buildAuctionAdvisorSleeperPurchases(
  purchases: readonly SleeperSnapshotCompletedPurchase[]
): AuctionAdvisorPurchase[] {
  return purchases.map((purchase) => ({
    playerName: purchase.playerName,
    position: purchase.position,
    nflTeam: purchase.nflTeam,
    purchasePrice: purchase.salePrice,
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

function DraftPlanChips({
  preference,
  preferenceTags,
  aiCeiling,
}: {
  preference: AuctionOwnerPlayerPreference | null;
  preferenceTags: readonly PlayerPoolPreferenceTag[];
  aiCeiling?: number | null;
}) {
  const hasSavedPlanAmount =
    preference?.preferredEntry !== null &&
    preference?.preferredEntry !== undefined
      ? true
      : preference?.plannedCap !== null && preference?.plannedCap !== undefined;

  if (preferenceTags.length === 0 && !hasSavedPlanAmount && aiCeiling == null) {
    return null;
  }

  return (
    <>
      {preferenceTags.map((tag) => (
        <PreferenceBadge key={tag} tag={tag} />
      ))}
      {preference?.preferredEntry !== null && preference?.preferredEntry !== undefined ? (
        <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
          ENTRY {formatMoney(preference.preferredEntry)}
        </span>
      ) : null}
      {preference?.plannedCap !== null && preference?.plannedCap !== undefined ? (
        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
          PLAN {formatMoney(preference.plannedCap)}
        </span>
      ) : null}
      {aiCeiling !== null && aiCeiling !== undefined ? (
        <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
          AI {formatMoney(aiCeiling)}
        </span>
      ) : null}
    </>
  );
}

let playerPoolPositionOptions = Array.from(
  new Set(
    localPlayerPoolRows
      .map((player) => player.position)
      .filter((position): position is string => Boolean(position))
  )
).sort();

let playerPoolMatchStatusOptions = Array.from(
  new Set(localPlayerPoolRows.map((player) => player.matchStatus))
).sort();

let playerPoolStatusOptions = sortPlayerPoolStatuses(Array.from(
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
  position: string | null;
  nflTeam: string | null;
  source: 'Keeper' | 'Purchase';
  byeWeek: number | null;
};

function getAuctionWarRoomPurchaseIdentityKey(
  purchase: Pick<
    AuctionWarRoomPurchaseRow,
    'playerId' | 'playerName' | 'position' | 'nflTeam'
  >
) {
  const playerId = normalizeFilterValue(purchase.playerId);
  if (playerId) return `id:${playerId}`;

  return [
    'name',
    normalizePlayerMatchValue(purchase.playerName),
    normalizePositionValue(purchase.position),
    normalizePositionValue(purchase.nflTeam),
  ].join(':');
}

function toSafePurchasePrice(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function buildSleeperKeeperRows(
  keepers: readonly SleeperSnapshotKeeper[]
): AuctionWarRoomPurchaseRow[] {
  return keepers.flatMap((keeper, index) => {
    const team = getTeamByRosterId(keeper.rosterId);
    if (!team) return [];

    return [
      {
        id: `sleeper-keeper:${keeper.playerId ?? (normalizePlayerMatchValue(keeper.playerName) || String(index))}`,
        teamId: team.id,
        rosterId: keeper.rosterId,
        playerId: keeper.playerId,
        playerName: keeper.playerName,
        position: keeper.position,
        nflTeam: keeper.nflTeam,
        purchasePrice: toSafePurchasePrice(keeper.keeperPrice),
        priceStatus: keeper.priceStatus,
        isKeeper: true,
        keeperRound: keeper.keeperRound,
        projectedValue: null,
        rayMaxBid: null,
        status: 'active' as const,
        source: 'sleeper-keeper' as const,
      },
    ];
  });
}

function buildSleeperPurchaseRows(
  purchases: readonly SleeperSnapshotCompletedPurchase[]
): AuctionWarRoomPurchaseRow[] {
  return purchases.flatMap((purchase, index) => {
    const team = getTeamByRosterId(purchase.rosterId);
    if (!team) return [];

    return [
      {
        id: `sleeper-draft:${purchase.pickNumber ?? index}:${purchase.playerId ?? normalizePlayerMatchValue(purchase.playerName)}`,
        teamId: team.id,
        rosterId: purchase.rosterId,
        playerId: purchase.playerId,
        playerName: purchase.playerName,
        position: purchase.position,
        nflTeam: purchase.nflTeam,
        purchasePrice: toSafePurchasePrice(purchase.salePrice),
        priceStatus: purchase.salePrice === null ? 'missing' : 'confirmed',
        isKeeper: purchase.isKeeper,
        pickNumber: purchase.pickNumber,
        projectedValue: null,
        rayMaxBid: null,
        status: 'active' as const,
        source: 'sleeper-draft' as const,
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
      priceStatus: 'confirmed' as const,
      recordedAt: sale.recordedAt,
      projectedValue: playerValue?.averageValue ?? null,
      rayMaxBid: null,
      status: 'active' as const,
      source: 'manual-local' as const,
    };
  });
}

function mergeActivePurchaseRows({
  sleeperKeeperRows,
  sleeperDraftRows,
  manualPurchaseRows,
}: {
  sleeperKeeperRows: readonly AuctionWarRoomPurchaseRow[];
  sleeperDraftRows: readonly AuctionWarRoomPurchaseRow[];
  manualPurchaseRows: readonly AuctionWarRoomPurchaseRow[];
}) {
  return mergeSleeperAuctionPurchaseLayers({
    sleeperKeeperRows,
    sleeperDraftRows,
    manualRows: manualPurchaseRows,
  });
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

function parseDraftPlanDollarInput(input: string, label: string) {
  const trimmedInput = input.trim();
  if (!trimmedInput) return { amount: null, error: null };

  if (!/^\d+$/.test(trimmedInput)) {
    return {
      amount: null,
      error: `${label} must be a whole dollar amount.`,
    };
  }

  const amount = Number(trimmedInput);
  if (!Number.isInteger(amount) || amount < 1) {
    return {
      amount: null,
      error: `${label} must be at least $1.`,
    };
  }

  return { amount, error: null };
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

const defaultGuidanceTeam =
  mockAuctionTeams.find((team) => team.rosterId === 1) ??
  mockAuctionTeams[0] ??
  null;

function buildBudgetRows(purchases: readonly AuctionWarRoomPurchaseRow[]) {
  const keeperRows = purchases.filter(
    (purchase) => purchase.status === 'active' && purchase.source === 'sleeper-keeper'
  );
  const openMarketPurchaseRows = purchases.filter(
    (purchase) => purchase.status === 'active' && purchase.source !== 'sleeper-keeper'
  );
  const purchaseSpendByTeam = calculatePurchaseSpendByTeam(openMarketPurchaseRows);
  const purchaseCountedPlayerKeys: Partial<Record<AuctionTeamId, Set<string>>> = {};
  const purchaseCountByTeam = openMarketPurchaseRows.reduce<Partial<Record<AuctionTeamId, number>>>(
    (counts, purchase) => {
      if (purchase.status === 'voided') return counts;
      const teamPurchaseKeys = purchaseCountedPlayerKeys[purchase.teamId] ?? new Set<string>();
      const identityKey = getAuctionWarRoomPurchaseIdentityKey(purchase);
      if (teamPurchaseKeys.has(identityKey)) return counts;

      teamPurchaseKeys.add(identityKey);
      purchaseCountedPlayerKeys[purchase.teamId] = teamPurchaseKeys;
      counts[purchase.teamId] = (counts[purchase.teamId] ?? 0) + 1;
      return counts;
    },
    {}
  );

  return mockAuctionTeams.map((team) => {
    const sleeperKeeperRows = keeperRows.filter(
      (purchase) => purchase.teamId === team.id
    );
    const missingKeeperPriceCount = sleeperKeeperRows.filter(
      (purchase) => purchase.priceStatus === 'missing'
    ).length;
    const keeperCost = sleeperKeeperRows.reduce(
      (sum, purchase) =>
        purchase.priceStatus === 'missing'
          ? sum
          : sum + purchase.purchasePrice,
      0
    );
    const keeperCount = sleeperKeeperRows.length;
    const purchaseSpend = purchaseSpendByTeam[team.id] ?? 0;
    const teamBudget = riverCityAuctionLeagueSettings.auctionBudgetPerTeam;
    const filledSlots = Math.min(
      team.rosterSlots.total,
      keeperCount + (purchaseCountByTeam[team.id] ?? 0)
    );
    const rosterSlots = {
      ...team.rosterSlots,
      filled: filledSlots,
      remaining: Math.max(0, team.rosterSlots.total - filledSlots),
      keeperSlotsUsed: keeperCount,
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
      missingKeeperPriceCount,
      budgetIsIncomplete: missingKeeperPriceCount > 0,
    };
  });
}

function buildGuidanceRosterPlayers(
  team: (typeof mockAuctionTeams)[number] | null,
  purchases: readonly AuctionWarRoomPurchaseRow[]
): RosterGuidancePlayer[] {
  if (team === null) return [];
  const seenPlayerKeys = new Set<string>();

  return purchases
    .filter(
      (player) => player.teamId === team.id && player.status === 'active'
    )
    .flatMap((player) => {
      const identityKey = getAuctionWarRoomPurchaseIdentityKey(player);
      if (seenPlayerKeys.has(identityKey)) return [];

      seenPlayerKeys.add(identityKey);
      return [
        {
          id: player.id,
          playerName: player.playerName,
          position: player.position,
          nflTeam: player.nflTeam,
          cost: player.purchasePrice,
          projectedValue: player.projectedValue,
          byeWeek: getByeWeekForNflTeam(player.nflTeam),
          source:
            player.source === 'sleeper-keeper'
              ? ('Keeper' as const)
              : ('Purchase' as const),
        },
      ];
    });
}

let guidancePlayerValues: RosterGuidancePlayerValue[] = localPlayerPoolRows.map(
  (player) => ({
    playerName: player.originalPlayerName,
    matchedPlayerName: player.matchedSleeperName,
    position: player.position,
    averageValue: player.averageValue,
    highValue: player.highValue,
  })
);

function buildRosterByeWeekCounts(
  rosterPlayers: readonly RosterGuidancePlayer[]
) {
  const rosterByeWeekRows: ByeWeekWatchRow[] = rosterPlayers.map((player) => ({
    id: player.id,
    playerName: player.playerName,
    position: player.position,
    nflTeam: player.nflTeam,
    source: player.source === 'Keeper' ? 'Keeper' : 'Purchase',
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
  getPreferenceTags: (
    player: ProcessedPlayerValueRow
  ) => PlayerPoolPreferenceTag[];
  activePurchaseRows: readonly AuctionWarRoomPurchaseRow[];
  isUsingSleeperPurchases: boolean;
  bidRecommendationContext: PlayerBidRecommendationContext;
  guidanceBudgetRow: {
    maxBid: number;
    remainingBudget: number;
    rosterSpotsRemaining: number;
    averageDollarsPerOpenSlot: number;
    budgetIsIncomplete: boolean;
    missingKeeperPriceCount: number;
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
  return `${player.playerName} (${player.position ?? 'N/A'} ${player.nflTeam ?? 'N/A'}) | avg ${formatMoney(player.averageValue)} | rec ${formatMoney(player.recommendedMaxBid)} | ${player.reason}`;
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
  const legalMaxBidText =
    !context.guidanceBudgetRow
      ? 'N/A'
      : context.guidanceBudgetRow.budgetIsIncomplete
        ? 'INCOMPLETE'
        : formatMoney(context.guidanceBudgetRow.maxBid);
  const legalMaxMeta =
    context.guidanceBudgetRow?.budgetIsIncomplete
      ? `Legal max incomplete: ${formatMissingKeeperPriceCount(context.guidanceBudgetRow.missingKeeperPriceCount)}.`
      : `Legal max bid ${legalMaxBidText}.`;

  if (questionId === 'target-next') {
    const bullets = topTargets.slice(0, 3).map(formatAdvisorTarget);

    return {
      summary:
        topTargets.length > 0
          ? `Target ${topTargets[0].playerName} first if the room stays at or below the recommended ceiling.`
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
      meta: legalMaxMeta,
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
          : `Keep each bid under its recommended ceiling. ${legalMaxMeta}`,
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
          : [`Keep each bid under its recommended ceiling. ${legalMaxMeta}`],
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
    meta: legalMaxMeta,
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

function isDraftCoachDecision(value: unknown): value is DraftCoachDecision {
  return (
    value === 'BID' ||
    value === 'LAST BID' ||
    value === 'PASS' ||
    value === 'WAIT' ||
    value === 'BUY NOW'
  );
}

function readDraftCoachBudgetPace(
  value: unknown,
  fallback: DraftCoachResult['budgetPace']
): DraftCoachResult['budgetPace'] {
  if (!value || typeof value !== 'object') return fallback;

  const budgetPace = value as Partial<DraftCoachResult['budgetPace']>;
  const status = budgetPace.status;

  if (
    status !== 'too-conservative' &&
    status !== 'on-pace' &&
    status !== 'aggressive' &&
    status !== 'endgame-pressure'
  ) {
    return fallback;
  }

  return {
    status,
    label: readApiString(budgetPace.label) || fallback.label,
    message: readApiString(budgetPace.message) || fallback.message,
  };
}

function readDraftCoachSpendGuidance(
  value: unknown,
  fallback: DraftCoachResult['spendGuidance']
): DraftCoachResult['spendGuidance'] {
  if (!value || typeof value !== 'object') return fallback;

  const spendGuidance = value as Partial<DraftCoachResult['spendGuidance']>;

  return {
    ...(typeof spendGuidance.suggestedNextBid === 'number' &&
    Number.isFinite(spendGuidance.suggestedNextBid)
      ? { suggestedNextBid: spendGuidance.suggestedNextBid }
      : {}),
    ...(typeof spendGuidance.justifiedOverpayAmount === 'number' &&
    Number.isFinite(spendGuidance.justifiedOverpayAmount)
      ? { justifiedOverpayAmount: spendGuidance.justifiedOverpayAmount }
      : {}),
    mustReserve:
      typeof spendGuidance.mustReserve === 'number' &&
      Number.isFinite(spendGuidance.mustReserve)
        ? spendGuidance.mustReserve
        : fallback.mustReserve,
  };
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

function buildDraftCoachChatAnswer(
  payload: AdvisorChatApiResponse,
  fallback: DraftCoachResult
): Omit<DraftCoachChatMessage, 'id' | 'question' | 'timestamp'> {
  const decision = isDraftCoachDecision(payload.recommendation)
    ? payload.recommendation
    : fallback.decision;

  return {
    decision,
    headline: readApiString(payload.answer) || fallback.headline,
    answer: readApiString(payload.answer) || fallback.buddyMessage,
    intelSummary:
      readApiStringArray(payload.intelSummary).length > 0
        ? readApiStringArray(payload.intelSummary)
        : fallback.intelSummary,
    buddyMessage: readApiString(payload.buddyMessage) || fallback.buddyMessage,
    riskGuidance: readApiString(payload.riskGuidance) || fallback.riskGuidance,
    budgetPace: readDraftCoachBudgetPace(payload.budgetPace, fallback.budgetPace),
    spendGuidance: readDraftCoachSpendGuidance(
      payload.spendGuidance,
      fallback.spendGuidance
    ),
    reasons:
      readApiStringArray(payload.reasons).length > 0
        ? readApiStringArray(payload.reasons)
        : fallback.reasons,
    warnings:
      readApiStringArray(payload.warnings).length > 0
        ? readApiStringArray(payload.warnings)
        : fallback.warnings,
    sourceLabel:
      payload.source === 'local-hybrid-coach'
        ? 'Protected local coach'
        : 'Local coach fallback',
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
  const preferenceTags = context.getPreferenceTags(player);
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
    `Recommended ceiling: ${formatMoney(recommendation.recommendedMaxBid)} (${recommendation.confidence} confidence)`,
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
        ? `${playerLabel} is nominee-eligible in the local read. Keep the nomination useful only if Ray/Jeffrey are comfortable with the ${formatMoney(recommendation.recommendedMaxBid)} recommended ceiling.`
        : `${playerLabel} should not be nominated from this local read because the status is ${status}.`
      : intent === 'max-bid'
        ? `${playerLabel} has a local recommended ceiling of ${formatMoney(recommendation.recommendedMaxBid)}.`
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

const importPrepSources = [
  {
    name: 'Historical auction sheets',
    status: 'Not connected',
    detail: 'Future source for prior season prices and draft-day context.',
  },
  {
    name: 'Keeper declarations',
    status: 'Future source',
    detail: 'Future source for locked keepers and keeper-cost validation.',
  },
  {
    name: 'Player values',
    status: playerPoolValueSourceShortLabel,
    detail: `Read-only ${playerPoolValueSourcePath} preview for projected values and Sleeper matching.`,
  },
  {
    name: 'Auction purchases',
    status: 'Future source',
    detail: 'Future source for sold players, purchase prices, and team budget updates.',
  },
];

const importPrepWarnings = [
  'No Excel parsing yet',
  'No Firestore writes',
  'Review before import',
];

export default function AuctionWarRoomClient({
  access,
  initialValueSource,
  initialAdpSource,
  initialOwnerPreferences,
  initialOwnerSettings,
  initialPurchaseDecisions,
}: {
  access: AuctionAccessResult;
  initialValueSource?: AuctionWarRoomInitialValueSource;
  initialAdpSource?: AuctionWarRoomInitialAdpSource;
  initialOwnerPreferences?: AuctionWarRoomInitialOwnerPreference[];
  initialOwnerSettings?: AuctionWarRoomInitialOwnerSettings | null;
  initialPurchaseDecisions?: AuctionWarRoomInitialPurchaseDecision[];
}) {
  applyRuntimeAuctionValueSource(initialValueSource);
  applyRuntimeAdpSource(initialAdpSource);

  const masterPlayerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const manualSalePriceInputRef = useRef<HTMLInputElement | null>(null);
  const myBoardResultsScrollRef = useRef<HTMLDivElement | null>(null);
  const draftPlanSyncedPlayerIdRef = useRef<string | null>(null);
  const syncedSleeperTeamNameRef = useRef<string | null>(null);
  const sleeperRefreshInFlightRef = useRef(false);
  const sleeperSnapshotRef = useRef<SleeperSnapshotResponse | null>(null);
  const sleeperComponentMountedRef = useRef(false);
  const [activeWorkspace, setActiveWorkspace] = useState<AuctionWorkspaceId>('draft');
  const [
    historicalInflationPositionOverride,
    setHistoricalInflationPositionOverride,
  ] = useState<HistoricalInflationPosition | null>(null);
  const [ownerTendencyOwnerIdOverride, setOwnerTendencyOwnerIdOverride] =
    useState<string | null>(null);
  const [sleeperSnapshot, setSleeperSnapshot] =
    useState<SleeperSnapshotResponse | null>(null);
  const [sleeperSnapshotStatus, setSleeperSnapshotStatus] =
    useState<SleeperSnapshotLoadStatus>('idle');
  const [sleeperSnapshotError, setSleeperSnapshotError] =
    useState<string | null>(null);
  const [sleeperLastAttemptedRefreshAt, setSleeperLastAttemptedRefreshAt] =
    useState<string | null>(null);
  const [sleeperLastSuccessfulRefreshAt, setSleeperLastSuccessfulRefreshAt] =
    useState<string | null>(null);
  const [isSleeperUsingFallback, setIsSleeperUsingFallback] = useState(false);
  const [playerPoolSearch, setPlayerPoolSearch] = useState('');
  const [playerPoolPositionFilter, setPlayerPoolPositionFilter] = useState('all');
  const [playerPoolByeWeekFilter, setPlayerPoolByeWeekFilter] = useState('all');
  const [playerPoolMatchStatusFilter, setPlayerPoolMatchStatusFilter] = useState('all');
  const [playerPoolStatusFilter, setPlayerPoolStatusFilter] = useState('all');
  const [playerPoolPreferenceFilter, setPlayerPoolPreferenceFilter] =
    useState<PlayerPoolPreferenceFilter>('all');
  const [myBoardFilter, setMyBoardFilter] = useState<MyBoardFilter>('available');
  const [playerPoolSort, setPlayerPoolSort] = useState<PlayerPoolSortKey>('averageValue');
  const [historyAuditSearch, setHistoryAuditSearch] = useState('');
  const [historyAuditFilter, setHistoryAuditFilter] =
    useState<HistoryAuditFilter>('all');
  const [selectedPlayerRowNumber, setSelectedPlayerRowNumber] =
    useState<number | null>(null);
  const [draftPlanPreferencesByPlayerId, setDraftPlanPreferencesByPlayerId] =
    useState<DraftPlanPreferenceMap>(() =>
      buildDraftPlanPreferenceMap(initialOwnerPreferences ?? [])
    );
  const [draftPlanTagInput, setDraftPlanTagInput] =
    useState<AuctionOwnerPreferenceTag>('open');
  const [draftPlanPreferredEntryInput, setDraftPlanPreferredEntryInput] =
    useState('');
  const [draftPlanPlannedCapInput, setDraftPlanPlannedCapInput] = useState('');
  const [draftPlanLiveOverrideInput, setDraftPlanLiveOverrideInput] =
    useState('');
  const [
    draftPlanLiveOverrideAboveAiConfirmed,
    setDraftPlanLiveOverrideAboveAiConfirmed,
  ] = useState(false);
  const [draftPlanNoteInput, setDraftPlanNoteInput] = useState('');
  const [draftPlanSaveStatus, setDraftPlanSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [draftPlanError, setDraftPlanError] = useState<string | null>(null);
  const [
    purchaseDecisionSnapshotsByPurchaseId,
    setPurchaseDecisionSnapshotsByPurchaseId,
  ] = useState<Map<string, AuctionWarRoomInitialPurchaseDecision>>(() => {
    const snapshots = new Map<string, AuctionWarRoomInitialPurchaseDecision>();
    for (const snapshot of initialPurchaseDecisions ?? []) {
      snapshots.set(snapshot.purchaseId, snapshot);
    }
    return snapshots;
  });
  const [draftUtilityOpenSection, setDraftUtilityOpenSection] =
    useState<DraftUtilitySection | null>(null);
  const [localAdvisorChatMessages, setLocalAdvisorChatMessages] = useState<
    LocalAdvisorChatMessage[]
  >([]);
  const [localAdvisorChatInput, setLocalAdvisorChatInput] = useState('');
  const [localAdvisorChatStatus, setLocalAdvisorChatStatus] =
    useState<AdvisorChatRequestStatus>('idle');
  const [localAdvisorChatError, setLocalAdvisorChatError] =
    useState<string | null>(null);
  const [draftCoachChatMessages, setDraftCoachChatMessages] = useState<
    DraftCoachChatMessage[]
  >([]);
  const [draftCoachChatInput, setDraftCoachChatInput] = useState('');
  const [draftCoachChatStatus, setDraftCoachChatStatus] =
    useState<AdvisorChatRequestStatus>('idle');
  const [draftCoachChatError, setDraftCoachChatError] =
    useState<string | null>(null);
  const [isDraftCoachOpen, setIsDraftCoachOpen] = useState(false);
  const [manualAuctionSales, setManualAuctionSales] = useState<ManualAuctionSale[]>([]);
  const guidanceTeam =
    getTeamByRosterId(access.sleeperRosterId) ?? defaultGuidanceTeam;
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

  useEffect(() => {
    if (!isDraftCoachOpen) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDraftCoachOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDraftCoachOpen]);

  const sleeperKeepers = sleeperSnapshot?.keepers ?? emptySleeperKeepers;
  const sleeperPurchases =
    sleeperSnapshot?.completedPurchases ??
    sleeperSnapshot?.purchases ??
    emptySleeperPurchases;
  const liveSleeperTeamName =
    access.sleeperRosterId == null
      ? null
      : sleeperSnapshot?.teams
          ?.find((team) => team.rosterId === access.sleeperRosterId)
          ?.teamName?.trim() || null;
  const ownerBoardTeamName =
    liveSleeperTeamName ??
    access.sleeperTeamName ??
    access.ownerProfileLabel ??
    initialOwnerSettings?.sleeperTeamName ??
    access.ownerDisplayName;
  const draftBoardTitle = formatDraftBoardTitle(ownerBoardTeamName);
  const ownerIdentityLabel = access.ownerDisplayName ?? access.ownerProfileLabel;
  const ownerSettingsSummary = getOwnerSettingsSummary(initialOwnerSettings);

  useEffect(() => {
    if (
      !initialOwnerSettings?.onboardingCompleted ||
      !liveSleeperTeamName ||
      liveSleeperTeamName === initialOwnerSettings.sleeperTeamName ||
      syncedSleeperTeamNameRef.current === liveSleeperTeamName
    ) {
      return;
    }

    syncedSleeperTeamNameRef.current = liveSleeperTeamName;
    void fetch('/api/auction/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sleeperTeamName: liveSleeperTeamName }),
    }).catch(() => {
      syncedSleeperTeamNameRef.current = null;
    });
  }, [initialOwnerSettings, liveSleeperTeamName]);

  const isUsingSleeperPurchases = Boolean(sleeperSnapshot);
  const manualPurchaseRows = useMemo(
    () => buildManualPurchaseRows(manualAuctionSales),
    [manualAuctionSales]
  );
  const sleeperKeeperRows = useMemo(
    () => buildSleeperKeeperRows(sleeperKeepers),
    [sleeperKeepers]
  );
  const sleeperDraftRows = useMemo(
    () => buildSleeperPurchaseRows(sleeperPurchases),
    [sleeperPurchases]
  );
  const mergedActivePurchaseRows = useMemo(
    () =>
      isUsingSleeperPurchases
        ? mergeActivePurchaseRows({
            sleeperKeeperRows,
            sleeperDraftRows,
            manualPurchaseRows,
          })
        : {
            rows: manualPurchaseRows,
            warnings: [],
            suppressedManualRowIds: [],
          },
    [
      isUsingSleeperPurchases,
      manualPurchaseRows,
      sleeperDraftRows,
      sleeperKeeperRows,
    ]
  );
  const activePurchaseRows = mergedActivePurchaseRows.rows;
  const openMarketPurchaseRows = useMemo(
    () =>
      activePurchaseRows.filter(
        (purchase) => purchase.source !== 'sleeper-keeper'
      ),
    [activePurchaseRows]
  );
  const keeperPurchaseRows = useMemo(
    () =>
      activePurchaseRows.filter(
        (purchase) => purchase.source === 'sleeper-keeper'
      ),
    [activePurchaseRows]
  );
  const sleeperMergeWarnings = mergedActivePurchaseRows.warnings;
  const suppressedManualSaleIds = mergedActivePurchaseRows.suppressedManualRowIds;
  const manualSalePlayerMatches = useMemo(
    () => getManualEntryPlayerMatches(playerPoolSearch),
    [playerPoolSearch]
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
  const manualSalePlayerAlreadyTaken = manualSaleSelectedPlayer
    ? getPlayerPoolPurchaseMatch(manualSaleSelectedPlayer, activePurchaseRows)
    : null;
  const canRecordManualSale = Boolean(
    access.canRecordSales &&
      manualSaleSelectedPlayer &&
      isManualSalePriceValid &&
      manualSaleBuyerTeam &&
      !manualSalePlayerAlreadyTaken
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
    (!access.canRecordSales
      ? 'Manual sale controls are commissioner-only.'
      : !manualSaleSelectedPlayer
      ? 'Use the master search or My Board to select a player before finishing a sale.'
      : !isManualSalePriceValid
        ? 'Enter a valid non-negative sale price.'
        : !manualSaleBuyerTeam
          ? 'Choose a buying team.'
          : manualSalePlayerAlreadyTaken
            ? `${manualSaleSelectedPlayer.originalPlayerName} is already marked taken by ${formatPurchaseSourceLabel(manualSalePlayerAlreadyTaken.source)}.`
          : null);
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
    () => buildBidRecommendationPurchaseSamples(openMarketPurchaseRows),
    [openMarketPurchaseRows]
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
    ? [...sleeperKeepers, ...sleeperPurchases].filter(
        (purchase) => getTeamByRosterId(purchase.rosterId) === null
      ).length
    : 0;
  const purchaseSourceLabel = hasManualAuctionSales
    ? isUsingSleeperPurchases
      ? 'Live War Room State'
      : 'Manual Fallback'
    : isUsingSleeperPurchases
      ? sleeperSnapshot?.syncStatus === 'partial'
        ? 'Sleeper Partial'
        : 'Sleeper Snapshot'
      : 'Live War Room State';
  const purchaseSourceDetail = hasManualAuctionSales
    ? isUsingSleeperPurchases
      ? `${manualAuctionSales.length - suppressedManualSaleIds.length} unsynced Manual Local sale${manualAuctionSales.length - suppressedManualSaleIds.length === 1 ? '' : 's'} + ${sleeperKeepers.length} Sleeper keeper${sleeperKeepers.length === 1 ? '' : 's'} + ${sleeperPurchases.length} Sleeper completed purchase${sleeperPurchases.length === 1 ? '' : 's'}${suppressedManualSaleIds.length > 0 ? `, ${suppressedManualSaleIds.length} confirmed by Sleeper` : ''}${unmappedSleeperPurchaseCount > 0 ? `, ${unmappedSleeperPurchaseCount} unmapped` : ''}`
      : `${manualAuctionSales.length} Manual Local sale${manualAuctionSales.length === 1 ? '' : 's'}; Sleeper snapshot not loaded`
    : isUsingSleeperPurchases
      ? `${sleeperKeepers.length} Sleeper keeper${sleeperKeepers.length === 1 ? '' : 's'} + ${sleeperPurchases.length} Sleeper completed purchase${sleeperPurchases.length === 1 ? '' : 's'}${unmappedSleeperPurchaseCount > 0 ? `, ${unmappedSleeperPurchaseCount} unmapped` : ''}`
      : 'No live Sleeper snapshot or manual sales loaded';
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
    [activePurchaseRows, guidanceTeam]
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
  const guidanceRosterPlayersByPosition = rosterGuidancePositionOrder.map(
    (position) => ({
      position,
      players: guidanceRosterPlayers.filter(
        (player) => getIntelligencePosition(player.position) === position
      ),
    })
  );
  const topRosterNeedRows = [
    ...guidanceOpenStarterNeeds,
    ...guidanceOpenBenchDepthNeeds,
  ].slice(0, 3);
  const starterFillRows = rosterGuidancePositionOrder.map((position) => {
    const current = guidancePositionCounts[position] ?? 0;
    const target = intelligenceStarterTargets[position];

    return {
      position,
      current,
      target,
      fillRatio: target > 0 ? current / target : 0,
    };
  });
  const strongestFilledPosition =
    starterFillRows
      .filter((row) => row.current > 0)
      .sort(
        (firstRow, secondRow) =>
          secondRow.fillRatio - firstRow.fillRatio ||
          secondRow.current - firstRow.current
      )[0] ?? null;
  const weakestFilledPosition =
    starterFillRows
      .filter((row) => row.current < row.target)
      .sort(
        (firstRow, secondRow) =>
          firstRow.fillRatio - secondRow.fillRatio ||
          firstRow.current - secondRow.current
      )[0] ?? null;
  const overspendingWarnings = filterRayKDefOverspendingWarnings(
    calculateOverspendingWarnings(guidanceRosterPlayers, guidancePlayerValues),
    guidanceRosterPlayers
  );
  const guidanceWarnings = [
    ...overspendingWarnings,
    ...buildRayKDefStrategyWarnings(activePurchaseRows),
    ...calculateByeWeekConcentrationWarnings(guidanceRosterPlayers),
    ...calculateMaxBidPressureWarnings({
      remainingBudget: guidanceBudgetRow?.budgetIsIncomplete
        ? null
        : guidanceBudgetRow?.remainingBudget ?? null,
      rosterSpotsRemaining: guidanceBudgetRow?.budgetIsIncomplete
        ? null
        : guidanceBudgetRow?.rosterSpotsRemaining ?? null,
      maxBid: guidanceBudgetRow?.budgetIsIncomplete
        ? null
        : guidanceBudgetRow?.maxBid ?? null,
      averageDollarsPerOpenSlot: guidanceBudgetRow?.budgetIsIncomplete
        ? null
        : guidanceBudgetRow?.averageDollarsPerOpenSlot ?? null,
    }),
  ];
  const bidRecommendationContext = useMemo(
    () => ({
      guidanceBudgetRow,
      guidanceStarterNeeds,
      guidanceBenchDepthNeeds,
      guidancePositionCounts,
      guidanceRosterPlayers,
      market: bidRecommendationMarket,
    }),
    [
      guidanceBenchDepthNeeds,
      guidanceBudgetRow,
      guidancePositionCounts,
      guidanceRosterPlayers,
      guidanceStarterNeeds,
      bidRecommendationMarket,
    ]
  );
  const rosterByeWeekCounts = useMemo(
    () => buildRosterByeWeekCounts(guidanceRosterPlayers),
    [guidanceRosterPlayers]
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
      detail: `${keeperPurchaseRows.length} live keeper${keeperPurchaseRows.length === 1 ? '' : 's'}`,
      icon: ClipboardList,
    },
    {
      label: 'Avg Legal Max',
      value: formatMoney(averageMaxBid),
      detail: purchaseSourceDetail,
      icon: BarChart3,
    },
  ];
  const getSavedDraftPlanPreference = useCallback(
    (player: ProcessedPlayerValueRow) =>
      getDraftPlanPreferenceForPlayer(player, draftPlanPreferencesByPlayerId),
    [draftPlanPreferencesByPlayerId]
  );
  const getEffectivePreferenceTags = useCallback(
    (player: ProcessedPlayerValueRow) =>
      getEffectivePlayerPoolPreferenceTags(
        player,
        draftPlanPreferencesByPlayerId
      ),
    [draftPlanPreferencesByPlayerId]
  );
  const availableTargetCount = localPlayerPoolRows.filter((player) => {
    const playerStatus = getPlayerPoolDisplayStatus(
      player,
      activePurchaseRows,
      isUsingSleeperPurchases
    );

    return (
      isAvailablePlayerPoolStatus(playerStatus) &&
      getEffectivePreferenceTags(player).includes('target')
    );
  }).length;
  const activeMyBoardFilter =
    myBoardFilter === 'targets' && availableTargetCount === 0
      ? 'available'
      : myBoardFilter;

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
      const playerPreferenceTags = getEffectivePreferenceTags(player);
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

    return sortPlayerPoolRows(
      filteredRows,
      playerPoolSort,
      draftPlanPreferencesByPlayerId
    );
  }, [
    activePurchaseRows,
    draftPlanPreferencesByPlayerId,
    getEffectivePreferenceTags,
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
  const myBoardFilteredPlayerRows = useMemo(() => {
    const searchNeedle = normalizeFilterValue(playerPoolSearch);
    const filteredRows = localPlayerPoolRows.filter((player) => {
      const playerName = normalizeFilterValue(player.originalPlayerName);
      const sleeperName = normalizeFilterValue(player.matchedSleeperName);
      const playerStatus = getPlayerPoolDisplayStatus(
        player,
        activePurchaseRows,
        isUsingSleeperPurchases
      );
      const playerPreferenceTags = getEffectivePreferenceTags(player);
      const playerMatchesSearch =
        !searchNeedle ||
        playerName.includes(searchNeedle) ||
        sleeperName.includes(searchNeedle);
      const playerMatchesPosition =
        playerPoolPositionFilter === 'all' ||
        player.position === playerPoolPositionFilter;
      const playerMatchesStatus =
        playerPoolStatusFilter === 'all' ||
        (playerPoolStatusFilter === 'available' &&
          isAvailablePlayerPoolStatus(playerStatus)) ||
        (playerPoolStatusFilter === 'taken' &&
          !isAvailablePlayerPoolStatus(playerStatus)) ||
        (playerPoolStatusFilter.startsWith('status:') &&
          playerStatus === playerPoolStatusFilter.slice('status:'.length));
      const playerIsAvailable = isAvailablePlayerPoolStatus(playerStatus);
      const playerMatchesBoard =
        activeMyBoardFilter === 'targets'
          ? playerIsAvailable && playerPreferenceTags.includes('target')
          : activeMyBoardFilter === 'watch'
            ? playerIsAvailable && playerPreferenceTags.includes('watch')
            : activeMyBoardFilter === 'fades'
              ? playerPreferenceTags.includes('fade')
              : activeMyBoardFilter === 'drafted'
                ? !playerIsAvailable
                : playerIsAvailable && playerPreferenceTags.length === 0;

      return (
        playerMatchesSearch &&
        playerMatchesPosition &&
        playerMatchesStatus &&
        playerMatchesBoard
      );
    });

    return sortPlayerPoolRows(
      filteredRows,
      playerPoolSort,
      draftPlanPreferencesByPlayerId
    );
  }, [
    activePurchaseRows,
    activeMyBoardFilter,
    draftPlanPreferencesByPlayerId,
    getEffectivePreferenceTags,
    isUsingSleeperPurchases,
    playerPoolPositionFilter,
    playerPoolSearch,
    playerPoolSort,
    playerPoolStatusFilter,
  ]);
  const hasActiveMyBoardFilters =
    playerPoolSearch.trim() !== '' ||
    playerPoolPositionFilter !== 'all' ||
    playerPoolStatusFilter !== 'all' ||
    activeMyBoardFilter !== 'available';
  const visibleMyBoardRows = hasActiveMyBoardFilters
    ? myBoardFilteredPlayerRows
    : myBoardFilteredPlayerRows.slice(0, playerPoolInitialDisplayLimit);
  useEffect(() => {
    myBoardResultsScrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [
    activeMyBoardFilter,
    playerPoolPositionFilter,
    playerPoolSearch,
    playerPoolSort,
    playerPoolStatusFilter,
  ]);
  const nextTargetRows = localPlayerPoolRows
    .flatMap((player) => {
      const playerStatus = getPlayerPoolDisplayStatus(
        player,
        activePurchaseRows,
        isUsingSleeperPurchases
      );
      const preferenceTags = getEffectivePreferenceTags(player);

      if (
        !isAvailablePlayerPoolStatus(playerStatus) ||
        !preferenceTags.includes('target')
      ) {
        return [];
      }

      const recommendation = getPlayerBidRecommendation(
        player,
        preferenceTags,
        bidRecommendationContext
      );

      return [
        {
          player,
          recommendation,
          preferenceTags,
        },
      ];
    })
    .sort((firstRow, secondRow) => {
      const maxDifference =
        secondRow.recommendation.recommendedMaxBid -
        firstRow.recommendation.recommendedMaxBid;
      if (maxDifference !== 0) return maxDifference;

      return (
        (secondRow.player.averageValue ?? 0) -
          (firstRow.player.averageValue ?? 0) ||
        firstRow.player.originalPlayerName.localeCompare(
          secondRow.player.originalPlayerName
        )
      );
    })
    .slice(0, 5);
  const selectedPlayer =
    selectedPlayerRowNumber === null
      ? null
      : localPlayerPoolRows.find(
          (player) => player.rowNumber === selectedPlayerRowNumber
        ) ?? null;
  const selectedPlayerAdp = getAdpForPlayer(selectedPlayer);
  const selectedPlayerDraftPlan = selectedPlayer
    ? getSavedDraftPlanPreference(selectedPlayer)
    : null;
  const selectedPlayerPreferenceTags = selectedPlayer
    ? getEffectivePreferenceTags(selectedPlayer)
    : [];
  const selectedPlayerDraftPlanEditorTag = selectedPlayer
    ? getDraftPlanEditorTag(selectedPlayer, draftPlanPreferencesByPlayerId)
    : 'open';
  const selectedPlayerHasDraftPlan =
    selectedPlayerPreferenceTags.length > 0 ||
    hasDraftPlanDetails(selectedPlayerDraftPlan);
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
  useEffect(() => {
    const selectedDraftPlanPlayerId = selectedPlayer?.sleeperPlayerId ?? null;
    const didSelectDifferentPlayer =
      draftPlanSyncedPlayerIdRef.current !== selectedDraftPlanPlayerId;
    draftPlanSyncedPlayerIdRef.current = selectedDraftPlanPlayerId;

    setDraftPlanTagInput(selectedPlayerDraftPlanEditorTag);
    setDraftPlanPreferredEntryInput(
      selectedPlayerDraftPlan?.preferredEntry === null ||
        selectedPlayerDraftPlan?.preferredEntry === undefined
        ? ''
        : String(selectedPlayerDraftPlan.preferredEntry)
    );
    setDraftPlanPlannedCapInput(
      selectedPlayerDraftPlan?.plannedCap === null ||
        selectedPlayerDraftPlan?.plannedCap === undefined
        ? ''
        : String(selectedPlayerDraftPlan.plannedCap)
    );
    setDraftPlanLiveOverrideInput('');
    setDraftPlanLiveOverrideAboveAiConfirmed(false);
    setDraftPlanNoteInput(selectedPlayerDraftPlan?.note ?? '');
    if (didSelectDifferentPlayer) {
      setDraftPlanSaveStatus('idle');
      setDraftPlanError(null);
    }
  }, [
    selectedPlayer?.sleeperPlayerId,
    selectedPlayerDraftPlan?.plannedCap,
    selectedPlayerDraftPlan?.note,
    selectedPlayerDraftPlan?.preferredEntry,
    selectedPlayerDraftPlan?.tag,
    selectedPlayerDraftPlanEditorTag,
  ]);
  const currentNominationManualBidValue =
    selectedPlayer &&
    manualSaleSelectedPlayer?.rowNumber === selectedPlayer.rowNumber
      ? manualSalePriceValue
      : null;
  const selectedPlayerKDefStrategyMax = selectedPlayer
    ? getRayKDefStrategyMax(selectedPlayer.position)
    : null;
  const currentNominationBaselineMaxBid =
    selectedPlayerKDefStrategyMax ??
    selectedPlayerRecommendation?.recommendedMaxBid ??
    null;
  const currentNominationContextualRecommendation = getCurrentNominationRecommendation(
    selectedPlayerStatus,
    selectedPlayerRecommendation,
    null,
    currentNominationBaselineMaxBid
  );
  const currentNominationLegalMaxBid =
    guidanceBudgetRow && !guidanceBudgetRow.budgetIsIncomplete
      ? guidanceBudgetRow.maxBid
      : null;
  const currentNominationReserveSpotsAfterWinning =
    guidanceBudgetRow === null
      ? null
      : Math.max(0, guidanceBudgetRow.rosterSpotsRemaining - 1);
  const currentNominationReserveAfterWinning =
    guidanceBudgetRow && !guidanceBudgetRow.budgetIsIncomplete
      ? (currentNominationReserveSpotsAfterWinning ?? 0) *
        riverCityMinimumRosterPrice
      : null;
  const currentNominationLegalMaxLabel =
    guidanceBudgetRow?.budgetIsIncomplete
      ? 'INCOMPLETE'
      : formatMoney(currentNominationLegalMaxBid);
  const currentNominationLegalMaxDetail =
    guidanceBudgetRow?.budgetIsIncomplete
      ? `Legal max incomplete: ${formatMissingKeeperPriceCount(guidanceBudgetRow.missingKeeperPriceCount)}.`
      : currentNominationReserveAfterWinning !== null &&
          currentNominationReserveSpotsAfterWinning !== null
        ? `Legal max reserves ${formatMoney(currentNominationReserveAfterWinning)} for ${formatRemainingRosterSpotCount(currentNominationReserveSpotsAfterWinning)}.`
        : 'Legal max uses remaining budget after required roster reserve.';
  const selectedPlayerSavedPlannedCap = selectedPlayerDraftPlan?.plannedCap ?? null;
  const currentNominationLiveOverrideResult = parseDraftPlanDollarInput(
    draftPlanLiveOverrideInput,
    'Live Override'
  );
  const currentNominationLiveOverrideValue =
    currentNominationLiveOverrideResult.error === null
      ? currentNominationLiveOverrideResult.amount
      : null;
  const selectedPlayerIntelligencePosition = getIntelligencePosition(
    selectedPlayer?.position
  );
  const currentNominationPositionPurchases = selectedPlayerIntelligencePosition
    ? openMarketPurchaseRows.filter(
        (purchase) =>
          purchase.status === 'active' &&
          getIntelligencePosition(purchase.position) ===
            selectedPlayerIntelligencePosition
      )
    : [];
  const currentNominationPositionExpectedTotal =
    currentNominationPositionPurchases.reduce(
      (sum, purchase) => sum + getMarketExpectedValueForPurchase(purchase),
      0
    );
  const currentNominationPositionActualSpent =
    currentNominationPositionPurchases.reduce(
      (sum, purchase) => sum + purchase.purchasePrice,
      0
    );
  const currentNominationPositionInflationRate =
    currentNominationPositionExpectedTotal > 0
      ? (currentNominationPositionActualSpent -
          currentNominationPositionExpectedTotal) /
        currentNominationPositionExpectedTotal
      : null;
  const currentNominationRemainingPositionPlayers =
    selectedPlayerIntelligencePosition === null
      ? null
      : localPlayerPoolRows.filter((player) => {
          if (getIntelligencePosition(player.position) !== selectedPlayerIntelligencePosition) {
            return false;
          }

          const status = getPlayerPoolDisplayStatus(
            player,
            activePurchaseRows,
            isUsingSleeperPurchases
          );
          return isAvailablePlayerPoolStatus(status) && (player.averageValue ?? 0) > 0;
        }).length;
  const selectedPlayerSourceCount =
    selectedPlayer?.sourceCount ??
    selectedPlayer?.siteValues?.filter(
      (siteValue) =>
        typeof siteValue.value === 'number' && Number.isFinite(siteValue.value)
    ).length ??
    null;
  const currentNominationDraftIntelligence =
    selectedPlayer && selectedPlayerRecommendation
      ? calculateDraftIntelligence({
          consensusAverage: selectedPlayer.averageValue ?? null,
          consensusLow: selectedPlayer.lowValue ?? null,
          consensusHigh: selectedPlayer.highValue ?? null,
          sourceCount: selectedPlayerSourceCount,
          existingConfidenceScore: selectedPlayer.confidenceScore ?? null,
          position: selectedPlayer.position ?? null,
          positionInflationRate: currentNominationPositionInflationRate,
          recentComparableSales: currentNominationPositionPurchases.map(
            (purchase) => ({
              purchasePrice: purchase.purchasePrice,
              expectedValue: getMarketExpectedValueForPurchase(purchase),
            })
          ),
          remainingPlayersAtPosition: currentNominationRemainingPositionPlayers,
          teamBudgetState: guidanceBudgetRow
            ? guidanceBudgetRow.budgetIsIncomplete
              ? null
              : {
                  remainingBudget: guidanceBudgetRow.remainingBudget,
                  rosterSpotsRemaining: guidanceBudgetRow.rosterSpotsRemaining,
                  maxBid: guidanceBudgetRow.maxBid,
                }
            : null,
          rosterNeedLevel: getBidRecommendationNeedLevel(
            selectedPlayer,
            guidanceStarterNeeds,
            guidanceBenchDepthNeeds
          ),
          preference: getBidRecommendationPreference(selectedPlayerPreferenceTags),
          existingRecommendedMaxBid: selectedPlayerRecommendation.recommendedMaxBid,
          currentBid: currentNominationManualBidValue,
          preferredEarlyKickerMax:
            riverCityAuctionLeagueSettings.preferredEarlyKickerMax,
          preferredEarlyDefenseMax:
            riverCityAuctionLeagueSettings.preferredEarlyDefenseMax,
          contextualRecommendation: getDraftIntelligenceContextualRecommendation(
            currentNominationContextualRecommendation
          ),
          demand: selectedPlayerAdp
            ? {
                demandTier: selectedPlayerAdp.demandTier,
                demandScore: selectedPlayerAdp.demandScore,
                overallAdp: selectedPlayerAdp.consensusOverallAdp,
                positionAdp: selectedPlayerAdp.consensusPositionAdp,
                waitRisk: selectedPlayerAdp.waitRisk,
                confidence: selectedPlayerAdp.confidence,
              }
            : null,
        })
      : null;
  const currentNominationSoldReason = selectedPlayerPurchaseMatch
    ? `${selectedPlayerPurchaseMatch.playerName} is already marked sold via ${formatPurchaseSourceLabel(selectedPlayerPurchaseMatch.source)}.`
    : null;
  const selectedPlayerHistoricalMarketValue =
    currentNominationDraftIntelligence?.marketValue ??
    selectedPlayer?.averageValue ??
    null;
  const selectedPlayerHistoricalOwnerMaxBid =
    currentNominationDraftIntelligence?.ownerMaxBid ??
    currentNominationBaselineMaxBid;
  const selectedPlayerHistoricalPricing = calculateHistoricalPricing({
    selectedPlayer: selectedPlayer
      ? {
          originalPlayerName: selectedPlayer.originalPlayerName,
          matchedSleeperName: selectedPlayer.matchedSleeperName,
          sleeperPlayerId: selectedPlayer.sleeperPlayerId,
          position: selectedPlayer.position,
        }
      : null,
    currentMarketValue: selectedPlayerHistoricalMarketValue,
    historicalDocuments: riverCityHistoricalPricingDocuments,
  });
  const selectedPlayerHistoricalPriceComparison =
    calculateHistoricalPriceComparison({
      selectedPlayer: selectedPlayer
        ? {
            originalPlayerName: selectedPlayer.originalPlayerName,
            matchedSleeperName: selectedPlayer.matchedSleeperName,
            sleeperPlayerId: selectedPlayer.sleeperPlayerId,
            position: selectedPlayer.position,
          }
        : null,
      currentMarketValue: selectedPlayerHistoricalMarketValue,
      currentOwnerMaxBid: selectedPlayerHistoricalOwnerMaxBid,
      masterviewDocuments: riverCityPriceComparisonMasterviewDocuments,
      sleeperAuctionDocuments: riverCitySleeperAuctionDocuments,
    });
  const currentNominationRoomIntelligence =
    selectedPlayer && currentNominationDraftIntelligence
      ? calculateRoomIntelligence({
          purchases: activePurchaseRows,
          owners: budgetRows.map((row) => ({
            teamId: row.team.id,
            rosterId: row.team.rosterId,
            teamName: row.team.teamName,
            managerName: row.team.managerName,
            remainingBudget: row.remainingBudget,
            legalMaxBid: row.maxBid,
            rosterSpotsRemaining: row.rosterSpotsRemaining,
            positionCounts: getPositionCountsForTeam(
              row.team.id,
              activePurchaseRows
            ),
            rosterTargets: intelligenceStarterTargets,
          })),
          selectedPlayer: {
            playerName: selectedPlayer.originalPlayerName,
            position: selectedPlayer.position ?? null,
            marketValue: currentNominationDraftIntelligence.marketValue,
            predictedWinningBid:
              currentNominationDraftIntelligence.predictedWinningBid,
            ownerMaxBid: currentNominationDraftIntelligence.ownerMaxBid,
            currentBid: currentNominationManualBidValue,
          },
          remainingPlayers: localPlayerPoolRows.map((player) => {
            const status = getPlayerPoolDisplayStatus(
              player,
              activePurchaseRows,
              isUsingSleeperPurchases
            );

            return {
              playerName: player.originalPlayerName,
              playerId: player.sleeperPlayerId ?? null,
              position: player.position ?? null,
              averageValue: player.averageValue ?? null,
              isAvailable: isAvailablePlayerPoolStatus(status),
            };
          }),
          marketContext: {
            position: selectedPlayer.position ?? null,
            inflationPercent:
              currentNominationPositionInflationRate === null
                ? null
                : currentNominationPositionInflationRate * 100,
            heatLabel: getMarketHeatLabel(
              currentNominationPositionInflationRate === null
                ? null
                : currentNominationPositionInflationRate * 100
            ),
          },
        })
      : null;
  const bestRemainingValueRows = localPlayerPoolRows
    .flatMap((player) => {
      const status = getPlayerPoolDisplayStatus(
        player,
        activePurchaseRows,
        isUsingSleeperPurchases
      );
      if (!isAvailablePlayerPoolStatus(status)) return [];

      const preferenceTags = getEffectivePreferenceTags(player);
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
    const positionPurchases = openMarketPurchaseRows.filter(
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
  const currentNominationMarketHeat = selectedPlayerIntelligencePosition
    ? marketHeatRows.find((row) => row.position === selectedPlayerIntelligencePosition) ??
      null
    : null;
  const historicalInflationIntel = calculateHistoricalInflation({
    masterviewDocuments: riverCityHistoricalInflationMasterviewDocuments,
    sleeperAuctionDocuments: riverCityHistoricalInflationSleeperDocuments,
    currentLivePurchases: openMarketPurchaseRows.map((purchase) => ({
      position: purchase.position,
      purchasePrice: purchase.purchasePrice,
      expectedValue: getMarketExpectedValueForPurchase(purchase),
      status: purchase.status,
    })),
    currentMarketHeat: marketHeatRows,
  });
  const historicalInflationDefaultPosition = (
    selectedPlayerIntelligencePosition ?? 'RB'
  ) as HistoricalInflationPosition;
  const selectedHistoricalInflationPosition =
    historicalInflationPositionOverride ?? historicalInflationDefaultPosition;
  const selectedHistoricalInflationSummary =
    historicalInflationIntel.positions.find(
      (positionSummary) =>
        positionSummary.position === selectedHistoricalInflationPosition
    ) ??
    historicalInflationIntel.positions.find(
      (positionSummary) => positionSummary.position === 'RB'
    ) ??
    historicalInflationIntel.positions[0];
  const rayActiveManager = activeManagers.find(
    (manager) => manager.shortName === 'Ray'
  );
  const ownerTendencyIntel = calculateOwnerTendencies({
    sleeperAuctionDocuments: riverCityOwnerTendencyDocuments,
    currentManagers: activeManagers,
    preferredOwnerId: rayActiveManager?.sleeperId ?? null,
  });
  const selectedOwnerTendencyOwnerId =
    ownerTendencyOwnerIdOverride ?? ownerTendencyIntel.defaultOwnerId;
  const selectedOwnerTendencyProfile =
    ownerTendencyIntel.profiles.find(
      (profile) => profile.ownerId === selectedOwnerTendencyOwnerId
    ) ??
    ownerTendencyIntel.profiles[0] ??
    null;
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
    const pressure = row.budgetIsIncomplete
      ? 'High'
      : getBudgetPressureLevel({
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
  const currentNominationCompetitionContext =
    selectedPlayer && currentNominationDraftIntelligence
      ? calculateCompetitionContext({
          selectedPlayer: {
            playerName: selectedPlayer.originalPlayerName,
            position: selectedPlayer.position ?? null,
            predictedWinningBid:
              currentNominationDraftIntelligence.predictedWinningBid,
            ownerMaxBid: currentNominationDraftIntelligence.ownerMaxBid,
            currentBid: currentNominationManualBidValue,
          },
          teams: budgetRows.map((row) => {
            const positionCounts = getPositionCountsForTeam(
              row.team.id,
              activePurchaseRows
            );
            const selectedPositionCount = selectedPlayerIntelligencePosition
              ? positionCounts[selectedPlayerIntelligencePosition]
              : 0;
            const selectedPositionStarterTarget =
              selectedPlayerIntelligencePosition
                ? intelligenceStarterTargets[selectedPlayerIntelligencePosition]
                : 0;
            const selectedPositionStarterNeeded = Math.max(
              0,
              selectedPositionStarterTarget - selectedPositionCount
            );

            return {
              teamId: row.team.id,
              ownerId: row.team.managerId,
              ownerName: row.team.managerName,
              teamName: row.team.teamName,
              remainingBudget: row.remainingBudget,
              legalMaxBid: row.maxBid,
              selectedPositionCount,
              selectedPositionStarterTarget,
              needLevel:
                selectedPositionStarterNeeded > 0
                  ? selectedPositionCount === 0
                    ? 'urgent'
                    : 'starter'
                  : 'surplus',
            };
          }),
          ownerProfiles: ownerTendencyIntel.profiles.map((profile) => ({
            ownerId: profile.ownerId,
            ownerName: profile.ownerName,
            currentManagerName: profile.currentManagerName,
            currentTeamName: profile.currentTeamName,
            averageTopPurchase: profile.averageTopPurchase,
            positionSpending: profile.positionSpending.map((positionSpend) => ({
              position: positionSpend.position,
              percentOfOpenMarketSpend:
                positionSpend.percentOfOpenMarketSpend,
              averageFirstPurchaseOrder:
                positionSpend.averageFirstPurchaseOrder,
              timingLabel: positionSpend.timingLabel,
            })),
            purchaseTiming: {
              timingLabel: profile.purchaseTiming.timingLabel,
            },
            confidence: profile.confidence,
          })),
          excludedOwnerIds: [
            guidanceTeam?.managerId ?? '',
            rayActiveManager?.sleeperId ?? '',
          ].filter(Boolean),
          excludedTeamIds: [guidanceTeam?.id ?? ''].filter(Boolean),
          draftStagePercent:
            budgetRows.length > 0
              ? activePurchaseRows.filter(
                  (purchase) => purchase.status === 'active'
                ).length /
                budgetRows.reduce(
                  (sum, row) => sum + row.team.rosterSlots.total,
                  0
                )
              : null,
        })
      : null;
  const currentNominationCurrentAiCeiling = deriveCurrentAiCeiling({
    baselineRecommendedMax:
      currentNominationDraftIntelligence?.ownerMaxBid ??
      currentNominationBaselineMaxBid,
    plannedCap: selectedPlayerSavedPlannedCap,
    legalMax: currentNominationLegalMaxBid,
    position: selectedPlayer?.position,
    preferenceTags: selectedPlayerPreferenceTags,
    kDefStrategyMax: selectedPlayerKDefStrategyMax,
    marketValue:
      currentNominationDraftIntelligence?.marketValue ??
      selectedPlayer?.averageValue ??
      null,
    predictedWinningBid:
      currentNominationDraftIntelligence?.predictedWinningBid ?? null,
    confidenceScore:
      currentNominationDraftIntelligence?.confidenceScore ??
      selectedPlayer?.confidenceScore ??
      null,
    currentBid: currentNominationManualBidValue,
    roomRunStatus: currentNominationRoomIntelligence?.positionRun.status,
    roomScarcityLabel: currentNominationRoomIntelligence?.scarcity.label,
    competitionThreatCount:
      currentNominationCompetitionContext?.ownersBothNeedAndAfford ?? null,
    adpDemandScore: selectedPlayerAdp?.demandScore ?? null,
    adpWaitRisk: selectedPlayerAdp?.waitRisk?.toUpperCase() ?? null,
  });
  const currentNominationLiveOverrideExceedsAi =
    currentNominationLiveOverrideValue !== null &&
    currentNominationCurrentAiCeiling.ceiling !== null &&
    currentNominationLiveOverrideValue > currentNominationCurrentAiCeiling.ceiling;
  const currentNominationLiveOverrideAccepted =
    currentNominationLiveOverrideValue !== null &&
    (!currentNominationLiveOverrideExceedsAi ||
      draftPlanLiveOverrideAboveAiConfirmed);
  const currentNominationAcceptedLiveOverrideValue =
    currentNominationLiveOverrideAccepted ? currentNominationLiveOverrideValue : null;
  const currentNominationActionableCeiling =
    currentNominationAcceptedLiveOverrideValue !== null
      ? currentNominationLegalMaxBid !== null
        ? Math.min(
            currentNominationAcceptedLiveOverrideValue,
            currentNominationLegalMaxBid
          )
        : currentNominationAcceptedLiveOverrideValue
      : currentNominationCurrentAiCeiling.ceiling;
  const currentNominationActionableCeilingLabel = formatMoney(
    currentNominationActionableCeiling
  );
  const currentNominationActionableCeilingDetail =
    currentNominationAcceptedLiveOverrideValue !== null
      ? `Live Override ${formatMoney(currentNominationAcceptedLiveOverrideValue)}${currentNominationLegalMaxBid !== null ? ` | Legal Max ${formatMoney(currentNominationLegalMaxBid)}` : ''}`
      : currentNominationCurrentAiCeiling.detail;
  const currentNominationBaseRecommendation =
    currentNominationManualBidValue !== null
      ? currentNominationDraftIntelligence?.recommendation ??
        currentNominationContextualRecommendation
      : currentNominationContextualRecommendation;
  const currentNominationRecommendation = applyActionableCeilingToRecommendation({
    recommendation: currentNominationBaseRecommendation,
    currentBidValue: currentNominationManualBidValue,
    actionableCeiling: currentNominationActionableCeiling,
  });
  const currentNominationPlanWarnings = [
    selectedPlayerSavedPlannedCap !== null &&
    currentNominationLegalMaxBid !== null &&
    currentNominationLegalMaxBid < selectedPlayerSavedPlannedCap
      ? 'Current Legal Max is below your saved Planned Cap.'
      : null,
    currentNominationManualBidValue !== null &&
    selectedPlayerSavedPlannedCap !== null &&
    currentNominationManualBidValue > selectedPlayerSavedPlannedCap &&
    currentNominationActionableCeiling !== null &&
    currentNominationManualBidValue <= currentNominationActionableCeiling
      ? 'Current bid is above Planned Cap, but live context still supports the AI ceiling.'
      : null,
    currentNominationLiveOverrideResult.error,
    currentNominationLiveOverrideExceedsAi &&
    !draftPlanLiveOverrideAboveAiConfirmed
      ? 'Confirm Live Override to bid above the Current AI Ceiling.'
      : null,
    currentNominationAcceptedLiveOverrideValue !== null &&
    currentNominationLegalMaxBid !== null &&
    currentNominationAcceptedLiveOverrideValue > currentNominationLegalMaxBid
      ? 'Live Override is above Legal Max, so Legal Max remains the final ceiling.'
      : null,
  ].filter((warning): warning is string => Boolean(warning));
  const currentNominationReasons = [
    currentNominationSoldReason,
    ...(currentNominationDraftIntelligence?.reasons ?? []),
    ...currentNominationCurrentAiCeiling.reasons,
  ].filter((reason): reason is string => Boolean(reason));
  const currentNominationWarnings = [
    ...currentNominationPlanWarnings,
    ...currentNominationCurrentAiCeiling.warnings,
    ...(currentNominationDraftIntelligence?.warnings ?? []),
  ];
  const draftCoachBudgetTerminologyReasons = [
    currentNominationDraftIntelligence
      ? `Recommended Max is ${formatMoney(currentNominationDraftIntelligence.ownerMaxBid)}.`
      : null,
    currentNominationCurrentAiCeiling.ceiling !== null
      ? `Current AI Ceiling is ${formatMoney(currentNominationCurrentAiCeiling.ceiling)}.`
      : null,
    selectedPlayerSavedPlannedCap !== null
      ? `Saved Planned Cap is ${formatMoney(selectedPlayerSavedPlannedCap)}.`
      : null,
    guidanceBudgetRow?.budgetIsIncomplete
      ? `Legal Max is incomplete because ${formatMissingKeeperPriceCount(guidanceBudgetRow.missingKeeperPriceCount)}.`
      : currentNominationLegalMaxBid !== null
        ? `Legal Max is ${formatMoney(currentNominationLegalMaxBid)}.`
        : null,
    currentNominationReserveAfterWinning !== null &&
    currentNominationReserveSpotsAfterWinning !== null
      ? [
          `You must reserve at least ${formatMoney(currentNominationReserveAfterWinning)}`,
          `for the other ${currentNominationReserveSpotsAfterWinning} open`,
          `roster spot${currentNominationReserveSpotsAfterWinning === 1 ? '' : 's'}.`,
        ].join(' ')
      : null,
  ].filter((reason): reason is string => Boolean(reason));
  const currentNominationValueGap =
    currentNominationDraftIntelligence &&
    currentNominationManualBidValue !== null
      ? currentNominationDraftIntelligence.ownerMaxBid -
        currentNominationManualBidValue
      : null;
  const currentNominationBidCeilingState = getBidCeilingState(
    currentNominationManualBidValue,
    currentNominationActionableCeiling
  );
  const draftTimelineRows = openMarketPurchaseRows
    .filter(
      (purchase) =>
        purchase.status === 'active' && purchase.priceStatus !== 'missing'
    )
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
        historySource: formatHistorySourceLabel(purchase.source),
        time: manualSale
          ? formatChatTimestamp(manualSale.recordedAt)
          : purchase.source === 'sleeper-draft'
            ? purchase.pickNumber
              ? `Pick #${purchase.pickNumber}`
              : 'Sleeper'
            : 'Live',
        sortPriority:
          purchase.source === 'sleeper-draft'
            ? 3
            : purchase.source === 'manual-local'
              ? 2
              : 1,
        sortOrder: manualSale
          ? Date.parse(manualSale.recordedAt)
          : purchase.source === 'sleeper-draft'
            ? 1_000_000 + (purchase.pickNumber ?? index)
            : index,
        averageValue,
        valueResult,
        strategyMessage,
      };
    })
    .sort((firstRow, secondRow) => {
      if (secondRow.sortPriority !== firstRow.sortPriority) {
        return secondRow.sortPriority - firstRow.sortPriority;
      }

      return secondRow.sortOrder - firstRow.sortOrder;
    })
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
                : 'Keep recommended ceilings firm and wait for the next clear gap.',
      }
    : null;
  const latestUndoableManualSale =
    [...manualAuctionSales]
      .reverse()
      .find((sale) => !suppressedManualSaleIds.includes(sale.id)) ?? null;
  const saveDraftPlanPreference = async ({
    clear = false,
    plannedCapOverride = null,
  }: {
    clear?: boolean;
    plannedCapOverride?: number | null;
  } = {}) => {
    if (!selectedPlayer) {
      setDraftPlanError('Select a player before saving a draft plan.');
      setDraftPlanSaveStatus('error');
      return;
    }

    const sleeperPlayerId = selectedPlayer.sleeperPlayerId?.trim();
    if (!sleeperPlayerId) {
      setDraftPlanError('Sleeper player ID is required before saving a plan.');
      setDraftPlanSaveStatus('error');
      return;
    }

    const preferredEntryResult = clear
      ? { amount: null, error: null }
      : parseDraftPlanDollarInput(
          draftPlanPreferredEntryInput,
          'Preferred Entry'
        );
    const plannedCapResult = clear
      ? { amount: null, error: null }
      : plannedCapOverride !== null
        ? { amount: plannedCapOverride, error: null }
        : parseDraftPlanDollarInput(draftPlanPlannedCapInput, 'Planned Cap');

    if (plannedCapOverride !== null && plannedCapOverride < 1) {
      setDraftPlanError('Planned Cap must be at least $1.');
      setDraftPlanSaveStatus('error');
      return;
    }

    const validationError =
      preferredEntryResult.error ??
      plannedCapResult.error ??
      (preferredEntryResult.amount !== null &&
      plannedCapResult.amount !== null &&
      preferredEntryResult.amount > plannedCapResult.amount
        ? 'Preferred Entry cannot exceed Planned Cap.'
        : null) ??
      (preferredEntryResult.amount !== null &&
      currentNominationLegalMaxBid !== null &&
      preferredEntryResult.amount > currentNominationLegalMaxBid
        ? 'Preferred Entry cannot exceed the current Legal Max.'
        : null);

    if (validationError) {
      setDraftPlanError(validationError);
      setDraftPlanSaveStatus('error');
      return;
    }

    setDraftPlanSaveStatus('saving');
    setDraftPlanError(null);

    try {
      const response = await fetch('/api/auction/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season: riverCityAuctionLeagueSettings.season,
          sleeperPlayerId,
          tag: clear ? 'open' : draftPlanTagInput,
          preferredEntry: preferredEntryResult.amount,
          plannedCap: plannedCapResult.amount,
          note: clear ? null : draftPlanNoteInput.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        preference?: AuctionOwnerPlayerPreference;
        error?: string;
      };
      const savedPreference = payload.preference;

      if (!response.ok || !savedPreference) {
        throw new Error(payload.error ?? 'Unable to save draft plan.');
      }

      setDraftPlanPreferencesByPlayerId((currentPreferences) => {
        const nextPreferences = new Map(currentPreferences);
        nextPreferences.set(
          normalizeFilterValue(savedPreference.sleeperPlayerId),
          savedPreference
        );
        return nextPreferences;
      });
      if (plannedCapOverride !== null) {
        setDraftPlanPlannedCapInput(String(plannedCapOverride));
        setDraftPlanLiveOverrideInput('');
        setDraftPlanLiveOverrideAboveAiConfirmed(false);
      }
      setDraftPlanSaveStatus('saved');
    } catch (error) {
      setDraftPlanError(
        error instanceof Error ? error.message : 'Unable to save draft plan.'
      );
      setDraftPlanSaveStatus('error');
    }
  };
  const resetPlayerPoolFilters = () => {
    setPlayerPoolSearch('');
    setPlayerPoolPositionFilter('all');
    setPlayerPoolByeWeekFilter('all');
    setPlayerPoolMatchStatusFilter('all');
    setPlayerPoolPreferenceFilter('all');
    setMyBoardFilter('available');
    setPlayerPoolStatusFilter('all');
    setPlayerPoolSort('averageValue');
  };
  const focusManualSalePlayerSearch = () => {
    window.requestAnimationFrame(() => {
      masterPlayerSearchInputRef.current?.focus();
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
    setPlayerPoolSearch(player.originalPlayerName);
    setManualSalePlayerSearchOpen(false);
    setManualSaleHighlightedMatchIndex(0);
    setManualSaleError(null);
    focusManualSalePriceInput();
  };
  const clearManualSalePlayer = () => {
    setSelectedPlayerRowNumber(null);
    setManualSaleSelectedPlayerRowNumber(null);
    setPlayerPoolSearch('');
    setManualSalePlayerSearchOpen(false);
    setManualSaleHighlightedMatchIndex(0);
    setManualSaleError(null);
  };
  const clearManualSalePlayerAndFocus = () => {
    clearManualSalePlayer();
    focusManualSalePlayerSearch();
  };
  const handleManualSalePlayerInputChange = (value: string) => {
    setPlayerPoolSearch(value);
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

      if (playerPoolSearch || manualSaleSelectedPlayer || selectedPlayer) {
        clearManualSalePlayer();
      }
    }
  };

  const persistPurchaseDecisionSnapshot = useCallback((
    snapshot: AuctionWarRoomInitialPurchaseDecision
  ) => {
    setPurchaseDecisionSnapshotsByPurchaseId((currentSnapshots) => {
      const nextSnapshots = new Map(currentSnapshots);
      nextSnapshots.set(snapshot.purchaseId, snapshot);
      return nextSnapshots;
    });

    void fetch('/api/auction/purchase-decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }).catch((error) => {
      console.error('Purchase decision snapshot save failed:', error);
    });
  }, []);

  const buildPurchaseDecisionSnapshot = useCallback(({
    purchaseId,
    player,
    salePrice,
    team,
    source,
    purchaseOrder,
    purchasedAt,
  }: {
    purchaseId: string;
    player: ProcessedPlayerValueRow | null;
    salePrice: number;
    team: (typeof mockAuctionTeams)[number] | null;
    source: 'manual-local' | 'sleeper-draft';
    purchaseOrder: number | null;
    purchasedAt: string | null;
  }): AuctionWarRoomInitialPurchaseDecision => {
    const preference = player ? getSavedDraftPlanPreference(player) : null;
    const preferenceTags = player ? getEffectivePreferenceTags(player) : [];
    const recommendation = player
      ? getPlayerBidRecommendation(player, preferenceTags, bidRecommendationContext)
      : null;
    const adp = player ? getAdpForPlayer(player) : null;
    const isCurrentNomination =
      player !== null && selectedPlayer?.rowNumber === player.rowNumber;
    const marketValue =
      isCurrentNomination
        ? currentNominationDraftIntelligence?.marketValue ??
          player?.averageValue ??
          null
        : player?.averageValue ?? null;
    const recommendedMax =
      isCurrentNomination
        ? currentNominationDraftIntelligence?.ownerMaxBid ??
          recommendation?.recommendedMaxBid ??
          null
        : recommendation?.recommendedMaxBid ?? null;
    const currentAiCeiling =
      isCurrentNomination ? currentNominationCurrentAiCeiling.ceiling : null;
    const liveOverride =
      isCurrentNomination ? currentNominationAcceptedLiveOverrideValue : null;
    const predictedSale =
      isCurrentNomination
        ? currentNominationDraftIntelligence?.predictedWinningBid ?? null
        : null;
    const legalMax = isCurrentNomination ? currentNominationLegalMaxBid : null;
    const plannedCap = preference?.plannedCap ?? null;

    return {
      purchaseId,
      season: riverCityAuctionLeagueSettings.season,
      sleeperPlayerId: player?.sleeperPlayerId ?? null,
      playerName: player?.originalPlayerName ?? '',
      position: player?.position ?? null,
      nflTeam: player?.nflTeam ?? null,
      buyerOwnerProfileId: team?.managerId ?? null,
      buyerTeamId: team?.id ?? null,
      buyerRosterId: team?.rosterId ?? null,
      source,
      status: 'active',
      salePrice,
      purchaseOrder,
      purchasedAt,
      tagAtPurchase: preference?.tag ?? null,
      preferredEntryAtPurchase: preference?.preferredEntry ?? null,
      plannedCapAtPurchase: plannedCap,
      liveOverrideAtPurchase: liveOverride,
      marketValueAtPurchase: marketValue,
      recommendedMaxAtPurchase: recommendedMax,
      currentAiCeilingAtPurchase: currentAiCeiling,
      legalMaxAtPurchase: legalMax,
      predictedSaleAtPurchase: predictedSale,
      adpAtPurchase: adp?.consensusOverallAdp ?? null,
      demandTierAtPurchase: adp?.demandTier ?? null,
      inflationAtPurchase:
        isCurrentNomination && currentNominationPositionInflationRate !== null
          ? currentNominationPositionInflationRate * 100
          : null,
      roomIntelligenceSummary:
        isCurrentNomination
          ? currentNominationRoomIntelligence?.positionRun.summary ?? null
          : null,
      competitionSummary:
        isCurrentNomination
          ? currentNominationCompetitionContext?.summary ?? null
          : null,
      plannedCapVariance: getPurchaseVariance(salePrice, plannedCap),
      marketVariance: getPurchaseVariance(salePrice, marketValue),
      recommendedMaxVariance: getPurchaseVariance(salePrice, recommendedMax),
      aiCeilingVariance: getPurchaseVariance(salePrice, currentAiCeiling),
      capturedAt: new Date().toISOString(),
      capturedBy: access.email ?? 'war-room',
      undoneAt: null,
      undoneBy: null,
    };
  }, [
    access.email,
    bidRecommendationContext,
    currentNominationAcceptedLiveOverrideValue,
    currentNominationCompetitionContext?.summary,
    currentNominationCurrentAiCeiling.ceiling,
    currentNominationDraftIntelligence?.marketValue,
    currentNominationDraftIntelligence?.ownerMaxBid,
    currentNominationDraftIntelligence?.predictedWinningBid,
    currentNominationLegalMaxBid,
    currentNominationPositionInflationRate,
    currentNominationRoomIntelligence?.positionRun.summary,
    getEffectivePreferenceTags,
    getSavedDraftPlanPreference,
    selectedPlayer?.rowNumber,
  ]);

  const recordManualSale = () => {
    const player = manualSaleSelectedPlayer;
    const team = manualSaleBuyerTeam;
    const salePrice = manualSalePriceValue;

    if (!access.canRecordSales) {
      setManualSaleError('Manual sale controls are commissioner-only.');
      return;
    }

    if (!player) {
      setManualSaleError('Use the master search or My Board before finishing a sale.');
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

    const takenMatch = getPlayerPoolPurchaseMatch(player, activePurchaseRows);
    if (takenMatch) {
      setManualSaleError(
        `${player.originalPlayerName} is already marked taken by ${formatPurchaseSourceLabel(takenMatch.source)}.`
      );
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
    persistPurchaseDecisionSnapshot(
      buildPurchaseDecisionSnapshot({
        purchaseId: sale.id,
        player,
        salePrice: sale.salePrice,
        team,
        source: 'manual-local',
        purchaseOrder: null,
        purchasedAt: sale.recordedAt,
      })
    );
    clearManualSalePlayer();
    setManualSalePriceInput('');
    setManualSaleError(null);
    setManualSaleConfirmation(sale);
    setSelectedPlayerRowNumber(player.rowNumber);
    focusManualSalePlayerSearch();
  };
  const undoLastManualSale = () => {
    if (latestUndoableManualSale === null) return;

    const nextSales = manualAuctionSales.filter(
      (sale) => sale.id !== latestUndoableManualSale.id
    );
    const nextUndoableConfirmation =
      [...nextSales]
        .reverse()
        .find((sale) => !suppressedManualSaleIds.includes(sale.id)) ?? null;
    setManualAuctionSales(nextSales);
    setPurchaseDecisionSnapshotsByPurchaseId((currentSnapshots) => {
      const nextSnapshots = new Map(currentSnapshots);
      const snapshot = nextSnapshots.get(latestUndoableManualSale.id);
      if (snapshot) {
        nextSnapshots.set(latestUndoableManualSale.id, {
          ...snapshot,
          status: 'undone',
          undoneAt: new Date().toISOString(),
          undoneBy: access.email ?? 'war-room',
        });
      }
      return nextSnapshots;
    });
    void fetch('/api/auction/purchase-decisions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        season: riverCityAuctionLeagueSettings.season,
        purchaseId: latestUndoableManualSale.id,
      }),
    }).catch((error) => {
      console.error('Purchase decision snapshot undo failed:', error);
    });
    setManualSaleConfirmation(nextUndoableConfirmation);
    setManualSaleError(null);
  };
  useEffect(() => {
    if (!access.canRecordSales || !isUsingSleeperPurchases) return;

    const snapshotsToCapture = sleeperDraftRows.flatMap((purchase) => {
      if (
        purchase.status !== 'active' ||
        purchase.source !== 'sleeper-draft' ||
        purchase.priceStatus !== 'confirmed' ||
        purchaseDecisionSnapshotsByPurchaseId.has(purchase.id)
      ) {
        return [];
      }

      const player = findPlayerValueRowForPurchase(purchase);
      if (!player) return [];

      const preference = getSavedDraftPlanPreference(player);
      const isCurrentNomination =
        selectedPlayer?.rowNumber === player.rowNumber;
      if (!preference && !isCurrentNomination) return [];

      return [
        buildPurchaseDecisionSnapshot({
          purchaseId: purchase.id,
          player,
          salePrice: purchase.purchasePrice,
          team: getTeam(purchase.teamId) ?? getTeamByRosterId(purchase.rosterId),
          source: 'sleeper-draft',
          purchaseOrder: purchase.pickNumber ?? null,
          purchasedAt: sleeperLastSuccessfulRefreshAt ?? sleeperSnapshot?.fetchedAt ?? null,
        }),
      ];
    });

    if (snapshotsToCapture.length === 0) return;

    snapshotsToCapture.forEach(persistPurchaseDecisionSnapshot);
  }, [
    access.canRecordSales,
    isUsingSleeperPurchases,
    sleeperDraftRows,
    purchaseDecisionSnapshotsByPurchaseId,
    selectedPlayer?.rowNumber,
    sleeperLastSuccessfulRefreshAt,
    sleeperSnapshot?.fetchedAt,
    buildPurchaseDecisionSnapshot,
    getSavedDraftPlanPreference,
    persistPurchaseDecisionSnapshot,
  ]);
  const refreshSleeperSnapshot = useCallback(async ({
    useSharedAutoRequest = false,
  }: { useSharedAutoRequest?: boolean } = {}) => {
    if (sleeperRefreshInFlightRef.current) return;

    sleeperRefreshInFlightRef.current = true;
    const attemptedAt = new Date().toISOString();
    setSleeperLastAttemptedRefreshAt(attemptedAt);
    setSleeperSnapshotStatus('loading');
    setSleeperSnapshotError(null);

    try {
      const payload = useSharedAutoRequest
        ? await fetchSharedSleeperAutoSnapshotPayload()
        : await fetchSleeperSnapshotPayload();

      if (!sleeperComponentMountedRef.current) return;

      setSleeperSnapshot(payload);
      sleeperSnapshotRef.current = payload;
      setSleeperSnapshotStatus('ready');
      setSleeperSnapshotError(null);
      setIsSleeperUsingFallback(false);
      setSleeperLastSuccessfulRefreshAt(payload.fetchedAt ?? attemptedAt);
    } catch (error) {
      console.error('Sleeper snapshot refresh failed:', error);
      if (!sleeperComponentMountedRef.current) return;
      const hasFallbackSnapshot = sleeperSnapshotRef.current !== null;
      setSleeperSnapshotStatus(hasFallbackSnapshot ? 'ready' : 'error');
      setIsSleeperUsingFallback(hasFallbackSnapshot);
      setSleeperSnapshotError(
        hasFallbackSnapshot
          ? 'Sleeper refresh failed. Using the last successful snapshot.'
          : 'Sleeper refresh failed. No successful snapshot is available yet.'
      );
    } finally {
      sleeperRefreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    sleeperComponentMountedRef.current = true;
    const refreshIfMounted = () => {
      if (!isMounted) return;
      void refreshSleeperSnapshot({ useSharedAutoRequest: true });
    };
    refreshIfMounted();

    const intervalId = window.setInterval(
      refreshIfMounted,
      sleeperAutoRefreshIntervalMs
    );

    return () => {
      isMounted = false;
      sleeperComponentMountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [refreshSleeperSnapshot]);

  const sleeperKeeperCount =
    sleeperSnapshot?.counts?.keepers ?? sleeperKeepers.length;
  const sleeperPurchaseCount =
    sleeperSnapshot?.counts?.completedPurchases ??
    sleeperSnapshot?.counts?.purchases ??
    sleeperPurchases.length;
  const sleeperMissingKeeperPriceCount =
    sleeperSnapshot?.counts?.missingKeeperPrices ??
    sleeperKeepers.filter((keeper) => keeper.priceStatus === 'missing').length;
  const sleeperSnapshotWarnings = [
    ...(sleeperSnapshot?.warnings ?? []),
    ...sleeperMergeWarnings,
    ...(isUsingSleeperPurchases && unmappedSleeperPurchaseCount > 0
      ? [`${unmappedSleeperPurchaseCount} Sleeper rows could not be mapped to active River City rosters.`]
      : []),
    ...(sleeperSnapshotError ? [sleeperSnapshotError] : []),
  ];
  const sleeperPricedKeeperCount = Math.max(
    0,
    sleeperKeeperCount - sleeperMissingKeeperPriceCount
  );
  const sleeperRawPickCount =
    sleeperSnapshot?.diagnostics?.rawPickCount ??
    sleeperSnapshot?.counts?.picks ??
    null;
  const sleeperRosterKeeperCount =
    sleeperSnapshot?.diagnostics?.rosterKeeperCount ?? null;
  const sleeperKeeperSourcesUsed =
    sleeperSnapshot?.diagnostics?.keeperSourcesUsed ?? [];
  const sleeperSelectedDraftId =
    sleeperSnapshot?.diagnostics?.selectedDraftId ??
    sleeperSnapshot?.draftId ??
    sleeperSnapshot?.draft?.draft_id ??
    null;
  const sleeperSelectedDraftType =
    sleeperSnapshot?.diagnostics?.selectedDraftType ??
    sleeperSnapshot?.draft?.type ??
    null;
  const sleeperSelectedDraftStatus =
    sleeperSnapshot?.diagnostics?.selectedDraftStatus ??
    sleeperSnapshot?.draft?.status ??
    sleeperSnapshot?.status ??
    null;
  const historyTeamCoverageRows = budgetRows.map((row) => {
    const teamKeepers = keeperPurchaseRows.filter(
      (purchase) =>
        purchase.status === 'active' && purchase.teamId === row.team.id
    );
    const teamCompletedPurchases = openMarketPurchaseRows.filter(
      (purchase) =>
        purchase.status === 'active' &&
        purchase.priceStatus !== 'missing' &&
        purchase.teamId === row.team.id
    );

    return {
      team: row.team,
      keeperCount: teamKeepers.length,
      completedPurchaseCount: teamCompletedPurchases.length,
      budgetStatus: row.budgetIsIncomplete ? 'INCOMPLETE' : 'COMPLETE',
    };
  });
  const keeperReviewTeamRows = budgetRows
    .map((row) => ({
      team: row.team,
      budgetIsIncomplete: row.budgetIsIncomplete,
      keepers: keeperPurchaseRows
        .filter(
          (purchase) =>
            purchase.status === 'active' && purchase.teamId === row.team.id
        )
        .sort((firstKeeper, secondKeeper) =>
          firstKeeper.playerName.localeCompare(secondKeeper.playerName)
        ),
    }))
    .filter((row) => row.keepers.length > 0);
  const teamsWithIncompleteBudgets = budgetRows.filter(
    (row) => row.budgetIsIncomplete
  ).length;
  const historyPurchaseAuditRows = openMarketPurchaseRows
    .filter(
      (purchase) =>
        purchase.status === 'active' && purchase.priceStatus !== 'missing'
    )
    .map((purchase, index) => {
      const manualSale = manualAuctionSales.find(
        (sale) => sale.id === purchase.id
      );
      const team = getTeam(purchase.teamId) ?? getTeamByRosterId(purchase.rosterId);
      const averageValue = findPlayerValueRowForPurchase(purchase)?.averageValue ?? null;
      const valueResult = getPurchaseValueResult(
        purchase.purchasePrice,
        averageValue,
        purchase.position
      );
      const orderLabel = manualSale
        ? formatTimestamp(manualSale.recordedAt)
        : purchase.source === 'sleeper-draft'
          ? purchase.pickNumber
            ? `Pick #${purchase.pickNumber}`
            : 'Sleeper pick'
          : 'Live purchase';
      const ownerTeam = team
        ? `${team.managerName} | ${team.teamName}`
        : `Roster ${purchase.rosterId ?? 'N/A'}`;
      const decisionSnapshotLabel = formatPurchaseDecisionSnapshotLine(
        purchaseDecisionSnapshotsByPurchaseId.get(purchase.id)
      );

      return {
        id: `purchase-${purchase.id}`,
        orderLabel,
        eventType: 'Purchase',
        playerName: purchase.playerName,
        detailLabel: `${purchase.position ?? 'N/A'} | ${purchase.nflTeam ?? 'N/A'}`,
        ownerTeam,
        amountLabel: formatMoney(purchase.purchasePrice),
        decisionSnapshotLabel,
        sourceLabel: formatHistorySourceLabel(purchase.source),
        status: valueResult.toUpperCase(),
        source: purchase.source,
        filterKind: purchase.source === 'manual-local' ? 'manual' : 'purchases',
        sortPriority:
          purchase.source === 'sleeper-draft'
            ? 30
            : purchase.source === 'manual-local'
              ? 20
              : 10,
        sortOrder: manualSale
          ? Date.parse(manualSale.recordedAt)
          : purchase.pickNumber ?? index,
        searchText: normalizePlayerMatchValue(
          `${purchase.playerName} ${ownerTeam} ${team?.managerName ?? ''} ${team?.teamName ?? ''} ${decisionSnapshotLabel ?? ''}`
        ),
      };
    });
  const historyKeeperAuditRows = keeperPurchaseRows
    .filter((purchase) => purchase.status === 'active')
    .map((purchase, index) => {
      const team = getTeam(purchase.teamId) ?? getTeamByRosterId(purchase.rosterId);
      const ownerTeam = team
        ? `${team.managerName} | ${team.teamName}`
        : `Roster ${purchase.rosterId ?? 'N/A'}`;

      return {
        id: `keeper-${purchase.id}`,
        orderLabel: purchase.keeperRound
          ? `Keeper R${purchase.keeperRound}`
          : 'Keeper assignment',
        eventType: 'Keeper',
        playerName: purchase.playerName,
        detailLabel: `${purchase.position ?? 'N/A'} | ${purchase.nflTeam ?? 'N/A'}`,
        ownerTeam,
        amountLabel:
          purchase.priceStatus === 'missing'
            ? 'Price missing'
            : formatMoney(purchase.purchasePrice),
        decisionSnapshotLabel: null,
        sourceLabel: formatHistorySourceLabel(purchase.source),
        status:
          purchase.priceStatus === 'missing' ? 'PRICE MISSING' : 'CONFIRMED',
        source: purchase.source,
        filterKind: 'keepers',
        sortPriority: 5,
        sortOrder: keeperPurchaseRows.length - index,
        searchText: normalizePlayerMatchValue(
          `${purchase.playerName} ${ownerTeam} ${team?.managerName ?? ''} ${team?.teamName ?? ''}`
        ),
      };
    });
  const historyWarningAuditRows = sleeperSnapshotWarnings.map((warning, index) => ({
    id: `warning-${index}-${warning}`,
    orderLabel: sleeperLastAttemptedRefreshAt
      ? formatTimestamp(sleeperLastAttemptedRefreshAt)
      : 'Sync warning',
    eventType: 'Warning',
    playerName: warning,
    detailLabel: 'Sync diagnostic',
    ownerTeam: 'Sleeper Sync',
    amountLabel: 'N/A',
    decisionSnapshotLabel: null,
    sourceLabel: formatHistorySourceLabel('sync-warning'),
    status: 'WARNING',
    source: 'sync-warning' as const,
    filterKind: 'warnings',
    sortPriority: 40,
    sortOrder: sleeperSnapshotWarnings.length - index,
    searchText: normalizePlayerMatchValue(`sync sleeper warning ${warning}`),
  }));
  const historyAuditRows = [
    ...historyWarningAuditRows,
    ...historyPurchaseAuditRows,
    ...historyKeeperAuditRows,
  ].sort((firstRow, secondRow) => {
    if (secondRow.sortPriority !== firstRow.sortPriority) {
      return secondRow.sortPriority - firstRow.sortPriority;
    }

    return secondRow.sortOrder - firstRow.sortOrder;
  });
  const normalizedHistoryAuditSearch =
    normalizePlayerMatchValue(historyAuditSearch);
  const visibleHistoryAuditRows = historyAuditRows.filter((row) => {
    const filterMatches =
      historyAuditFilter === 'all' ||
      row.filterKind === historyAuditFilter ||
      (historyAuditFilter === 'purchases' && row.filterKind === 'manual');
    const searchMatches =
      !normalizedHistoryAuditSearch ||
      row.searchText.includes(normalizedHistoryAuditSearch);

    return filterMatches && searchMatches;
  });
  const currentSessionNominationLatestUpdateAt =
    selectedPlayer &&
    manualSaleConfirmation?.playerRowNumber === selectedPlayer.rowNumber
      ? manualSaleConfirmation.recordedAt
      : sleeperLastSuccessfulRefreshAt ?? sleeperSnapshot?.fetchedAt ?? null;
  const sleeperHasDetectedRows = sleeperKeeperCount + sleeperPurchaseCount > 0;
  const sleeperSyncStatusLabel =
    sleeperSnapshotStatus === 'loading'
      ? 'SYNCING SLEEPER...'
      : isSleeperUsingFallback
        ? 'SLEEPER STALE'
        : sleeperSnapshot?.syncStatus === 'partial'
          ? 'SLEEPER PARTIAL'
          : isUsingSleeperPurchases && !sleeperHasDetectedRows
            ? 'SLEEPER EMPTY'
          : isUsingSleeperPurchases
            ? 'SLEEPER SYNCED'
            : sleeperSnapshotStatus === 'error'
              ? 'SLEEPER ERROR'
              : 'SLEEPER NOT LOADED';
  const sleeperSyncWarningDetail =
    sleeperMissingKeeperPriceCount > 0
      ? `${sleeperMissingKeeperPriceCount} keeper price missing`
      : sleeperSnapshotWarnings.length > 0
        ? `${sleeperSnapshotWarnings.length} warnings`
        : '';
  const sleeperSyncDetail = isSleeperUsingFallback
    ? `Refresh failed · Using ${formatTimestamp(sleeperLastSuccessfulRefreshAt)} snapshot`
    : isUsingSleeperPurchases
      ? sleeperHasDetectedRows
        ? `${sleeperKeeperCount} keepers · ${sleeperPurchaseCount} purchases · Updated ${formatTimestamp(sleeperLastSuccessfulRefreshAt ?? sleeperSnapshot?.fetchedAt ?? null)}${sleeperSyncWarningDetail ? ` · ${sleeperSyncWarningDetail}` : ''}`
        : `No Sleeper keepers or purchases detected in the selected draft.`
      : sleeperSnapshotStatus === 'loading'
        ? `Loading live keepers and draft picks · Attempted ${formatTimestamp(sleeperLastAttemptedRefreshAt)}`
        : sleeperSnapshotError ?? 'Waiting for Sleeper sync or Manual Entry.';
  const sleeperSnapshotEmptyMessage =
    sleeperSnapshotStatus === 'loading'
      ? 'Loading Sleeper keepers and purchases...'
      : sleeperSnapshotStatus === 'error'
        ? 'Sleeper snapshot unavailable.'
        : sleeperSnapshot
          ? 'No Sleeper keepers or purchases detected in the selected draft.'
          : 'No Sleeper snapshot loaded.';
  const sleeperSnapshotSourceMessage = isUsingSleeperPurchases
    ? `Budget, roster, bye, and taken-status views are using ${purchaseSourceDetail}.`
    : hasManualAuctionSales
      ? 'Budget, roster, bye, and taken-status views are using Manual Local sales until a Sleeper snapshot is loaded.'
      : 'Budget, roster, bye, and taken-status views are waiting for Manual Entry or a Sleeper Snapshot.';
  const strategyCompletedOpenMarketPurchaseCount = openMarketPurchaseRows.filter(
    (purchase) => purchase.status === 'active'
  ).length;
  const strategyBudgetStatus =
    guidanceBudgetRow?.budgetIsIncomplete
      ? 'incomplete'
      : guidanceBudgetRow
        ? 'complete'
        : 'unavailable';
  const strategyBudgetRead =
    strategyBudgetStatus === 'incomplete'
      ? `Budget incomplete: ${formatMissingKeeperPriceCount(guidanceBudgetRow?.missingKeeperPriceCount ?? 0)}. Legal max is hidden until keeper prices are confirmed.`
      : guidanceBudgetRow
        ? `Budget complete: ${formatMoney(guidanceBudgetRow.remainingBudget)} remaining, legal max ${formatMoney(guidanceBudgetRow.maxBid)}.`
        : 'Budget state is not available yet.';
  const strategyOpenRosterReserve =
    guidanceBudgetRow
      ? Math.max(0, guidanceBudgetRow.rosterSpotsRemaining - 1) *
        riverCityMinimumRosterPrice
      : null;
  const strategyMarketPositionRead =
    marketHeatRows
      .filter((row) => row.inflationPercent !== null)
      .sort(
        (firstRow, secondRow) =>
          Math.abs(secondRow.inflationPercent ?? 0) -
          Math.abs(firstRow.inflationPercent ?? 0)
      )[0] ?? null;
  const strategyMarketRead =
    strategyMarketPositionRead === null
      ? 'No completed open-market purchase sample yet.'
      : `${strategyMarketPositionRead.position} is ${formatInflationPercent(strategyMarketPositionRead.inflationPercent)} versus expected from live open-market purchases.`;
  const advisorTeamBudget =
    guidanceBudgetRow && !guidanceBudgetRow.budgetIsIncomplete
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
      : null;
  const auctionAdvisorSummary = buildAuctionAdvisorSummary({
    playerValues: buildAuctionAdvisorPlayerValues(
      activePurchaseRows,
      isUsingSleeperPurchases,
      guidanceRosterPlayers,
      getEffectivePreferenceTags
    ),
    activePurchaseSource: hasManualAuctionSales
      ? 'manual'
      : isUsingSleeperPurchases
        ? 'sleeper'
        : 'manual',
    teamBudget: advisorTeamBudget,
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
    activePurchases: buildAuctionAdvisorPurchases(openMarketPurchaseRows),
    sleeperSnapshotPurchases: isUsingSleeperPurchases
      ? buildAuctionAdvisorSleeperPurchases(sleeperPurchases)
      : [],
  });
  const strategyWarnings = [
    ...(guidanceBudgetRow?.budgetIsIncomplete
      ? [
          {
            key: 'budget-incomplete',
            severity: 'danger' as const,
            area: 'budget',
            message: `Budget incomplete: ${formatMissingKeeperPriceCount(guidanceBudgetRow.missingKeeperPriceCount)}.`,
          },
        ]
      : []),
    ...auctionAdvisorSummary.avoidOverpayWarnings
      .filter((warning) => warning.severity !== 'ok')
      .map((warning) => ({
        key: `${warning.area}-${warning.message}`,
        severity: warning.severity,
        area: warning.area,
        message: formatWarRoomTerminology(
          warning.message.replace(/\bmax-bid cap\b/gi, 'legal max')
        ),
      })),
    ...guidanceWarnings.map((warning) => ({
      key: warning.id,
      severity: warning.severity,
      area: 'roster',
      message: warning.message,
    })),
  ].slice(0, 3);
  const strategyNextActions = [
    topRosterNeedRows[0]
      ? `Prioritize ${topRosterNeedRows[0].label} while that roster need remains open.`
      : null,
    strategyMarketPositionRead
      ? `${strategyMarketPositionRead.position} is ${formatInflationPercent(strategyMarketPositionRead.inflationPercent)} versus expected; use that market read before nominating.`
      : null,
    strategyOpenRosterReserve !== null && guidanceBudgetRow
      ? `Reserve ${formatMoney(strategyOpenRosterReserve)} for ${Math.max(0, guidanceBudgetRow.rosterSpotsRemaining - 1)} remaining roster spots.`
      : null,
    bestRemainingValueRows[0]
      ? `${bestRemainingValueRows[0].player.originalPlayerName} is your highest-priority available target at REC ${formatMoney(bestRemainingValueRows[0].recommendation.recommendedMaxBid)}.`
      : null,
    !isUsingSleeperPurchases
      ? 'Refresh Sleeper before the next nomination if a recent sale is missing.'
      : null,
  ]
    .filter((action): action is string => Boolean(action))
    .slice(0, 5);
  const localAdvisorChatContext: LocalAdvisorChatContext = {
    auctionAdvisorSummary,
    guidanceOpenStarterNeeds,
    guidanceOpenBenchDepthNeeds,
    guidanceWarnings,
    rosterByeWeekCounts,
    visiblePlayerPoolRows,
    getPreferenceTags: getEffectivePreferenceTags,
    activePurchaseRows,
    isUsingSleeperPurchases,
    bidRecommendationContext,
    guidanceBudgetRow,
    purchaseSourceLabel,
    purchaseSourceDetail,
    rayKDefStrategyMessages,
  };
  const draftCoachContext: DraftCoachInput = {
    question: null,
    selectedPlayer: selectedPlayer
      ? {
          playerName: selectedPlayer.originalPlayerName,
          position: selectedPlayer.position ?? null,
          nflTeam: selectedPlayer.nflTeam ?? null,
          preference: getBidRecommendationPreference(selectedPlayerPreferenceTags),
          rosterNeedLevel: getBidRecommendationNeedLevel(
            selectedPlayer,
            guidanceStarterNeeds,
            guidanceBenchDepthNeeds
          ),
          status: selectedPlayerStatus,
        }
      : null,
    currentBid: currentNominationManualBidValue,
    marketValue:
      currentNominationDraftIntelligence?.marketValue ??
      selectedPlayer?.averageValue ??
      null,
    predictedWinningBid:
      currentNominationDraftIntelligence?.predictedWinningBid ?? null,
    ownerMaxBid:
      currentNominationDraftIntelligence?.ownerMaxBid ??
      currentNominationBaselineMaxBid,
    confidence: currentNominationDraftIntelligence?.confidence ?? null,
    confidenceScore:
      currentNominationDraftIntelligence?.confidenceScore ??
      selectedPlayer?.confidenceScore ??
      null,
    recommendation:
      currentNominationRecommendation === 'DO NOT BID'
        ? 'DO NOT BID'
        : currentNominationRecommendation,
    intelligenceReasons: [
      ...draftCoachBudgetTerminologyReasons,
      ...currentNominationReasons,
    ],
    intelligenceWarnings: currentNominationWarnings,
    roomReasons: currentNominationRoomIntelligence?.reasons ?? [],
    roomWarnings: currentNominationRoomIntelligence?.warnings ?? [],
    historicalPricing:
      selectedPlayerHistoricalPricing.kind === 'none'
        ? {
            kind: 'none',
            mostRecentValue: null,
            recentAverage: null,
            currentVsRecentAverage: null,
            careerAverage: null,
            historyContextLabel: null,
          }
        : {
            kind: selectedPlayerHistoricalPricing.kind,
            mostRecentValue: selectedPlayerHistoricalPricing.mostRecentValue,
            recentAverage: selectedPlayerHistoricalPricing.recentAverage,
            currentVsRecentAverage:
              selectedPlayerHistoricalPricing.currentVsRecentAverage,
            careerAverage: selectedPlayerHistoricalPricing.average,
            historyContextLabel:
              selectedPlayerHistoricalPricing.historyContextLabel,
          },
    competitionContext: currentNominationCompetitionContext
      ? {
          summary: currentNominationCompetitionContext.summary,
          ownersAbleToAfford:
            currentNominationCompetitionContext.ownersAbleToAfford,
          ownersNeedingPosition:
            currentNominationCompetitionContext.ownersNeedingPosition,
          ownersBothNeedAndAfford:
            currentNominationCompetitionContext.ownersBothNeedAndAfford,
          highestThreat: currentNominationCompetitionContext.highestThreat
            ? {
                ownerName:
                  currentNominationCompetitionContext.highestThreat.ownerName,
                teamName:
                  currentNominationCompetitionContext.highestThreat.teamName,
                threatLevel:
                  currentNominationCompetitionContext.highestThreat.threatLevel,
                reasons:
                  currentNominationCompetitionContext.highestThreat.reasons,
              }
            : null,
          warnings: currentNominationCompetitionContext.warnings,
        }
      : null,
    budget: guidanceBudgetRow
      ? {
          remainingBudget: guidanceBudgetRow.budgetIsIncomplete
            ? null
            : guidanceBudgetRow.remainingBudget,
          spentAmount: guidanceBudgetRow.budgetIsIncomplete
            ? null
            : guidanceBudgetRow.totalSpent,
          legalMaxBid: guidanceBudgetRow.budgetIsIncomplete
            ? null
            : guidanceBudgetRow.maxBid,
          openRosterSpots: guidanceBudgetRow.rosterSpotsRemaining,
          dollarsPerOpenSlot: guidanceBudgetRow.budgetIsIncomplete
            ? null
            : guidanceBudgetRow.averageDollarsPerOpenSlot,
        }
      : null,
    roster: {
      remainingStarterNeeds: guidanceOpenStarterNeeds.map((need) => need.label),
      openStarterNeedCount: guidanceOpenStarterNeeds.reduce(
        (sum, need) => sum + need.needed,
        0
      ),
      openRosterSpots: guidanceBudgetRow?.rosterSpotsRemaining ?? null,
      completedStarterNeedCount: guidanceStarterNeeds.reduce(
        (sum, need) => sum + Math.min(need.current, need.target),
        0
      ),
    },
    positionContext: {
      heatLabel: currentNominationMarketHeat?.heatLabel ?? null,
      heatPercent: currentNominationMarketHeat?.inflationPercent ?? null,
      remainingMeaningfulPlayersAtPosition:
        currentNominationRemainingPositionPlayers,
      runStatus: currentNominationRoomIntelligence?.positionRun.status ?? null,
    },
    kDefStrategy: {
      preferredEarlyKickerMax:
        riverCityAuctionLeagueSettings.preferredEarlyKickerMax,
      preferredEarlyDefenseMax:
        riverCityAuctionLeagueSettings.preferredEarlyDefenseMax,
      configuredMax: selectedPlayerKDefStrategyMax,
    },
    draftProgress: {
      totalPurchases: activePurchaseRows.filter(
        (purchase) => purchase.status === 'active'
      ).length,
      rayPurchases: guidanceRosterPlayers.filter(
        (player) => player.source === 'Purchase'
      ).length,
      leagueDollarsSpent: activePurchaseRows.reduce(
        (sum, purchase) =>
          purchase.status === 'active' ? sum + purchase.purchasePrice : sum,
        0
      ),
      totalRosterSlots: budgetRows.reduce(
        (sum, row) => sum + row.team.rosterSlots.total,
        0
      ),
    },
    ownerSettings: initialOwnerSettings?.onboardingCompleted
      ? {
          rosterConstruction: initialOwnerSettings.rosterConstruction,
          riskTolerance: initialOwnerSettings.riskTolerance,
          keeperFocus: initialOwnerSettings.keeperFocus,
          rookiePreference: initialOwnerSettings.rookiePreference,
          positionPriorities: initialOwnerSettings.positionPriorities,
          nominationStyle: initialOwnerSettings.nominationStyle,
          kickerDefenseStrategy: initialOwnerSettings.kickerDefenseStrategy,
          draftGoal: initialOwnerSettings.draftGoal,
          additionalNotes: initialOwnerSettings.additionalNotes,
        }
      : null,
  };
  const draftCoachPreview = buildDraftCoachResponse(draftCoachContext);
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
  const appendDraftCoachChatMessage = (
    questionText: string,
    answer: Omit<DraftCoachChatMessage, 'id' | 'question' | 'timestamp'>,
    messageKey: string
  ) => {
    setDraftCoachChatMessages((previousMessages) => {
      const messageIndex = previousMessages.length;

      return [
        ...previousMessages,
        {
          id: `draft-coach-${messageKey}-${messageIndex}`,
          question: questionText,
          timestamp: new Date().toISOString(),
          ...answer,
        },
      ].slice(-8);
    });
  };
  const requestProtectedDraftCoachAnswer = async (
    questionText: string,
    context: DraftCoachInput
  ) => {
    const fallbackResult = buildDraftCoachResponse(context);
    const response = await fetch('/api/auction/advisor-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        mode: 'draft-coach',
        question: questionText,
        draftCoachContext: context,
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
        readApiString(payload.error) || 'Protected draft coach request failed.'
      );
    }

    return buildDraftCoachChatAnswer(payload, fallbackResult);
  };
  const askDraftCoach = async (questionText: string, messageKey: string) => {
    const trimmedQuestion = questionText.trim();

    if (!trimmedQuestion || draftCoachChatStatus === 'loading') return;

    const context = {
      ...draftCoachContext,
      question: trimmedQuestion,
    };

    setDraftCoachChatStatus('loading');
    setDraftCoachChatError(null);

    try {
      const apiAnswer = await requestProtectedDraftCoachAnswer(
        trimmedQuestion,
        context
      );
      appendDraftCoachChatMessage(trimmedQuestion, apiAnswer, messageKey);
      setDraftCoachChatStatus('idle');
    } catch {
      const fallbackResult = buildDraftCoachResponse(context);

      appendDraftCoachChatMessage(
        trimmedQuestion,
        {
          ...fallbackResult,
          answer: fallbackResult.buddyMessage,
          sourceLabel: 'Local coach fallback',
        },
        messageKey
      );
      setDraftCoachChatError(
        'Protected local coach unavailable. Showing local fallback.'
      );
      setDraftCoachChatStatus('error');
    }
  };
  const askDraftCoachFromInput = async () => {
    const questionText = draftCoachChatInput.trim();

    if (!questionText) return;

    setDraftCoachChatInput('');
    await askDraftCoach(questionText, 'custom');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-4 font-sans text-black selection:bg-orange-600 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/95">
        <div className="mx-auto grid max-w-[1800px] gap-2 px-3 py-2 sm:px-4 xl:grid-cols-[minmax(230px,0.82fr)_minmax(360px,1.45fr)_minmax(290px,0.9fr)] xl:items-center">
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
                  {draftBoardTitle}
                </h1>
                <span className="inline-flex w-fit rounded-full border border-orange-600/20 bg-orange-600/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                  {getOwnerRoleLabel(access)}
                </span>
                {!access.canRecordSales ? <MockBadge /> : null}
              </div>
              <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {ownerIdentityLabel ? `${ownerIdentityLabel} | ` : ''}
                {riverCityAuctionLeagueSettings.leagueName} | {riverCityAuctionLeagueSettings.season}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center">
	            <div className="min-w-0 rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-orange-700 dark:text-orange-300">
	              <p className="truncate text-[9px] font-black uppercase tracking-[0.22em]">
	                {purchaseSourceLabel}
	              </p>
	              <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest">
	                <span className="min-w-0 max-w-full truncate">
	                  {purchaseSourceDetail}
	                </span>
	                <span className="min-w-0 max-w-full truncate">
	                  Values: {playerPoolValueSourceLabel}
	                </span>
	                <span className="min-w-0 max-w-full truncate">
	                  ADP: {adpSourceLabel}
	                </span>
	              </div>
              {playerPoolValueSourceWarning ? (
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300">
                  {playerPoolValueSourceWarning}
                </p>
              ) : null}
              {adpSourceWarning ? (
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300">
                  {adpSourceWarning}
                </p>
              ) : null}
            </div>
            <label className="relative block min-w-0">
              <span className="sr-only">Quick player search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={masterPlayerSearchInputRef}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={manualSalePlayerSearchOpen}
                aria-controls="master-player-search-options"
                aria-activedescendant={
                  manualSalePlayerSearchOpen &&
                  manualSalePlayerMatches.length > 0
                    ? `master-player-search-option-${manualSalePlayerMatches[safeManualSaleHighlightedMatchIndex].rowNumber}`
                    : undefined
                }
                value={playerPoolSearch}
                onChange={(event) =>
                  handleManualSalePlayerInputChange(event.target.value)
                }
                onFocus={() =>
                  setManualSalePlayerSearchOpen(playerPoolSearch.trim().length > 0)
                }
                onBlur={() => setManualSalePlayerSearchOpen(false)}
                onKeyDown={handleManualSalePlayerKeyDown}
                placeholder="Search and select player"
                className="h-10 w-full rounded-xl border border-black/10 bg-white pl-10 pr-10 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
              />
              {playerPoolSearch && (
                <button
                  type="button"
                  onClick={clearManualSalePlayerAndFocus}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-orange-600/10 hover:text-orange-600"
                  aria-label="Clear master player search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {manualSalePlayerSearchOpen && playerPoolSearch.trim() && (
                <div
                  id="master-player-search-options"
                  role="listbox"
                  className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-auto rounded-xl border border-black/10 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#121212]"
                >
                  {manualSalePlayerMatches.length > 0 ? (
                    manualSalePlayerMatches.map((player, index) => {
                      const isHighlighted =
                        index === safeManualSaleHighlightedMatchIndex;
                      const playerStatus = getPlayerPoolDisplayStatus(
                        player,
                        activePurchaseRows,
                        isUsingSleeperPurchases
                      );

                      return (
                        <button
                          key={player.rowNumber}
                          id={`master-player-search-option-${player.rowNumber}`}
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
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black uppercase italic">
                              {player.originalPlayerName}
                            </span>
                            <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {getManualEntryPlayerMeta(player) || 'No position/team'} | {playerStatus}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-black text-orange-600">
                            {formatMoney(player.averageValue ?? null)}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-4 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      No player matches.
                    </p>
                  )}
                </div>
              )}
            </label>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 xl:justify-end">
            <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 2xl:flex">
              {dashboardCards.slice(1).map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="min-w-[7.25rem] max-w-[9rem] rounded-xl border border-black/10 bg-black/[0.03] px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]"
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
            <div className="w-[10.75rem] shrink-0 rounded-xl border border-blue-600/20 bg-blue-600/10 px-2.5 py-1.5 text-blue-700 dark:text-blue-300 sm:w-[11.5rem]">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[8px] font-black uppercase tracking-widest">
                  {sleeperSyncStatusLabel}
                </p>
                <button
                  type="button"
                  onClick={() => refreshSleeperSnapshot()}
                  disabled={sleeperSnapshotStatus === 'loading'}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Refresh Sleeper"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${sleeperSnapshotStatus === 'loading' ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
              <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest">
                {sleeperSyncDetail}
              </p>
            </div>
            {access.canRecordSales && (
              <button
                type="button"
                onClick={() => {
                  if (manualSaleSelectedPlayer) {
                    focusManualSalePriceInput();
                    return;
                  }

                  focusManualSalePlayerSearch();
                }}
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
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-2 py-2 sm:px-3">
        <div className="grid gap-3">
          <div
            className="flex gap-2 overflow-x-auto rounded-2xl border border-black/10 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#121212]"
            role="tablist"
            aria-label="Auction War Room workspace"
          >
            {auctionWorkspaceTabs.map((tab) => {
              const isActive = activeWorkspace === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveWorkspace(tab.id)}
                  className={`min-h-10 shrink-0 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest transition ${
                    isActive
                      ? 'bg-orange-600 text-white'
                      : 'text-gray-500 hover:bg-orange-600/10 hover:text-orange-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {(activeWorkspace === 'draft' ||
            activeWorkspace === 'strategy' ||
            activeWorkspace === 'history') && (
	          <div
		            className={
		              activeWorkspace === 'draft'
		                ? 'grid min-h-0 gap-3 xl:grid-cols-[minmax(620px,1.25fr)_minmax(520px,1fr)] xl:items-start 2xl:grid-cols-[minmax(620px,1.2fr)_minmax(520px,1fr)_minmax(280px,0.45fr)]'
		                : 'grid min-h-0 gap-3 lg:grid-cols-2 lg:items-start'
		            }
		          >
		            {activeWorkspace === 'draft' && (
		            <div className="order-1 min-h-0 min-w-0">
              <SectionShell
                title={draftBoardTitle}
                eyebrow="Player Selection"
                icon={DollarSign}
                className="min-h-0 lg:flex lg:flex-col"
              >
                <div className="mb-3 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                      NEXT TARGETS
                    </p>
                    <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                      Auto Queue
                    </span>
                  </div>
                  {nextTargetRows.length > 0 ? (
                    <div className="grid gap-1.5">
                      {nextTargetRows.map((row, index) => {
                        const draftPlanPreference = getSavedDraftPlanPreference(
                          row.player
                        );

                        return (
                          <button
                            key={row.player.rowNumber}
                            type="button"
                            onClick={() => selectManualSalePlayer(row.player)}
                            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition hover:bg-emerald-600/10 ${
                              selectedPlayerRowNumber === row.player.rowNumber
                                ? 'bg-emerald-600/10 ring-1 ring-inset ring-emerald-600/25'
                                : 'bg-white/70 dark:bg-black/20'
                            }`}
                          >
                            <span className="text-sm font-black text-emerald-600">
                              {index === 0 ? '⭐' : index + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-black uppercase italic">
                                {row.player.originalPlayerName}
                              </span>
                              <span className="block truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {row.player.position ?? 'N/A'} | {row.player.nflTeam ?? 'N/A'}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-1">
                                <DraftPlanChips
                                  preference={draftPlanPreference}
                                  preferenceTags={row.preferenceTags}
                                />
                              </span>
                            </span>
                            <span className="text-right text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                              REC {formatMoney(row.recommendation.recommendedMaxBid)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      No available target-tagged players.
                    </p>
                  )}
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {myBoardFilterOptions.map((option) => {
                    const isActive = activeMyBoardFilter === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMyBoardFilter(option.value)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition ${
                          isActive
                            ? 'border-orange-600/30 bg-orange-600 text-white'
                            : 'border-black/10 bg-black/[0.03] text-gray-600 hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mb-3 grid gap-2 sm:grid-cols-3">
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
                    {playerPoolValueSourceLabel} | {myBoardFilterOptions.find((option) => option.value === activeMyBoardFilter)?.label ?? 'Available'} | {visibleMyBoardRows.length}/{myBoardFilteredPlayerRows.length} rows
                  </p>
                  <button
                    type="button"
                    onClick={resetPlayerPoolFilters}
                    className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03]"
                  >
                    Reset
                  </button>
                </div>

	                <div
	                  ref={myBoardResultsScrollRef}
	                  tabIndex={0}
	                  aria-label="My Draft Board player results"
	                  className="min-h-[360px] max-h-[70vh] overflow-x-hidden overflow-y-auto rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-600 dark:border-white/10 sm:min-h-[380px] lg:min-h-[320px] lg:max-h-[min(52vh,620px)]"
	                >
	                  <div className="grid gap-2 p-2 md:hidden">
	                    {visibleMyBoardRows.length > 0 ? (
	                      visibleMyBoardRows.map((player) => {
	                        const preferenceTags = getEffectivePreferenceTags(player);
	                        const draftPlanPreference =
	                          getSavedDraftPlanPreference(player);
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
	                        const isDrafted = !isAvailablePlayerPoolStatus(playerStatus);
	                        const bidRecommendation = getPlayerBidRecommendation(
	                          player,
	                          preferenceTags,
	                          bidRecommendationContext
	                        );
	                        const playerAdp = getAdpForPlayer(player);
	                        const isSelected =
	                          selectedPlayerRowNumber === player.rowNumber;
	                        const displayStatusLabel = getMyBoardStatusLabel({
	                          isDrafted,
	                          playerStatus,
	                          preferenceTags,
	                        });

	                        return (
	                          <button
	                            key={player.rowNumber}
	                            type="button"
	                            aria-pressed={isSelected}
	                            onClick={() => selectManualSalePlayer(player)}
	                            className={`rounded-xl px-3 py-3 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-600 ${getMyBoardCategoryClass({
	                              isDrafted,
	                              isSelected,
	                              preferenceTags,
	                            })}`}
	                          >
	                            <div className="flex items-start justify-between gap-3">
	                              <div className="min-w-0">
	                                <p className={`truncate text-sm font-black uppercase italic ${isDrafted ? 'line-through' : ''}`}>
	                                  {player.originalPlayerName}
	                                </p>
	                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
	                                  {player.position ?? 'N/A'} · {player.nflTeam ?? 'N/A'} · Bye {formatByeWeek(byeWeek)}
	                                </p>
	                              </div>
	                              <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getMyBoardStatusClass(displayStatusLabel)}`}>
	                                {displayStatusLabel}
	                              </span>
	                            </div>

	                            <div className="mt-2 flex flex-wrap gap-1">
	                              <DraftPlanChips
	                                preference={draftPlanPreference}
	                                preferenceTags={preferenceTags}
	                              />
	                              {playerAdp ? (
	                                <span className="rounded-full bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
	                                  ADP {formatAdp(playerAdp.consensusOverallAdp)} · {playerAdp.demandTier}
	                                </span>
	                              ) : null}
	                            </div>

	                            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest">
	                              <div>
	                                <p className="text-gray-400">Market</p>
	                                <p className="mt-0.5 text-sm text-orange-600">{formatMoney(player.averageValue ?? null)}</p>
	                              </div>
	                              <div className="text-right">
	                                <p className="text-gray-400">Rec Max</p>
	                                <p className="mt-0.5 text-sm">{formatMoney(bidRecommendation.recommendedMaxBid)}</p>
	                              </div>
	                            </div>

	                            {purchaseMatch && (
	                              <p className="mt-2 truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
	                                {getTeam(purchaseMatch.teamId)?.teamName ?? `Roster ${purchaseMatch.rosterId ?? 'N/A'}`} · {formatMoney(purchaseMatch.purchasePrice)}
	                              </p>
	                            )}
	                          </button>
	                        );
	                      })
	                    ) : (
	                      <div className="px-2 py-8 text-center text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
	                        <div className="flex flex-col items-center gap-3">
	                          <span>No players match these filters.</span>
	                          <button
	                            type="button"
	                            onClick={resetPlayerPoolFilters}
	                            className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03]"
	                          >
	                            Reset Filters
	                          </button>
	                        </div>
	                      </div>
	                    )}
	                  </div>

	                  <table className="hidden w-full table-fixed text-left md:table">
	                    <colgroup>
	                      <col className="w-[38%]" />
	                      <col className="w-[7%]" />
	                      <col className="w-[8%]" />
	                      <col className="w-[7%]" />
	                      <col className="w-[11%]" />
	                      <col className="w-[13%]" />
	                      <col className="w-[16%]" />
	                    </colgroup>
	                    <thead className="sticky top-0 z-20 bg-white dark:bg-[#121212]">
	                      <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
	                        <th className="px-2 py-1.5">Player</th>
	                        <th className="px-2 py-1.5">Pos</th>
	                        <th className="px-2 py-1.5">Team</th>
	                        <th className="px-2 py-1.5">Bye</th>
	                        <th className="px-2 py-1.5 text-right">Market</th>
	                        <th className="px-2 py-1.5 text-right">Rec Max</th>
	                        <th className="px-2 py-1.5">Status</th>
	                      </tr>
	                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                      {visibleMyBoardRows.length > 0 ? (
                        visibleMyBoardRows.map((player) => {
                          const preferenceTags = getEffectivePreferenceTags(player);
                          const draftPlanPreference =
                            getSavedDraftPlanPreference(player);
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
                          const isDrafted = !isAvailablePlayerPoolStatus(playerStatus);
                          const bidRecommendation = getPlayerBidRecommendation(
                            player,
                            preferenceTags,
                            bidRecommendationContext
                          );
	                          const playerAdp = getAdpForPlayer(player);
	                          const isSelected =
	                            selectedPlayerRowNumber === player.rowNumber;
	                          const displayStatusLabel = getMyBoardStatusLabel({
	                            isDrafted,
	                            playerStatus,
	                            preferenceTags,
	                          });

	                          return (
                            <tr
                              key={player.rowNumber}
                              aria-pressed={isSelected}
                              className={`cursor-pointer text-[11px] transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-600 ${getMyBoardCategoryClass({
                                isDrafted,
                                isSelected,
                                preferenceTags,
                              })}`}
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
	                                <div className="flex min-w-0 items-center gap-1.5">
	                                  <span className={preferenceTags.includes('target') ? 'text-emerald-600' : 'text-gray-300 dark:text-gray-600'}>
	                                    {preferenceTags.includes('target') ? '⭐' : '•'}
	                                  </span>
	                                  <p className={`truncate font-black ${isDrafted ? 'line-through' : ''}`}>
	                                    {player.originalPlayerName}
	                                  </p>
	                                </div>
	                                <div className="mt-0.5 flex flex-wrap gap-1">
	                                  <DraftPlanChips
	                                    preference={draftPlanPreference}
	                                    preferenceTags={preferenceTags}
	                                  />
	                                  {playerAdp ? (
	                                    <span className="rounded-full bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
	                                      ADP {formatAdp(playerAdp.consensusOverallAdp)} · {playerAdp.demandTier}
                                    </span>
                                  ) : null}
	                                </div>
	                              </td>
	                              <td className="px-2 py-1 font-bold text-gray-500 dark:text-gray-400">{player.position ?? 'N/A'}</td>
	                              <td className="px-2 py-1 font-bold text-gray-500 dark:text-gray-400">{player.nflTeam ?? 'N/A'}</td>
	                              <td className="px-2 py-1 font-black">{formatByeWeek(byeWeek)}</td>
	                              <td className="whitespace-nowrap px-2 py-1 text-right font-black text-orange-600">{formatMoney(player.averageValue ?? null)}</td>
	                              <td className="whitespace-nowrap px-2 py-1 text-right font-black">{formatMoney(bidRecommendation.recommendedMaxBid)}</td>
	                              <td className="px-2 py-1">
	                                <div className="flex flex-col gap-1">
	                                  <span className={`w-fit rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${getMyBoardStatusClass(displayStatusLabel)}`}>
	                                    {displayStatusLabel}
	                                  </span>
	                                  {purchaseMatch && (
	                                    <span className="truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
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
                            <div className="flex flex-col items-center gap-3">
                              <span>No players match these filters.</span>
                              <button
                                type="button"
                                onClick={resetPlayerPoolFilters}
                                className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:border-orange-600 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03]"
                              >
                                Reset Filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionShell>
            </div>
            )}

            {(activeWorkspace === 'draft' || activeWorkspace === 'strategy') && (
            <div
		              className={
		                activeWorkspace === 'draft'
		                  ? 'order-2 grid min-h-0 min-w-0 gap-3'
		                  : 'grid min-h-0 gap-3'
		              }
            >
              {activeWorkspace === 'draft' && (
              <>
	              <section className={`${selectedPlayer ? 'rounded-3xl p-4' : 'rounded-2xl p-3'} bg-white shadow-lg shadow-black/5 dark:bg-[#121212]`}>
	                <div className={`grid ${selectedPlayer ? 'gap-4' : 'gap-1'}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                        DRAFT HUD
                      </p>
                      {selectedPlayer ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xl font-black uppercase italic tracking-tight">
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
	                        <p className="mt-1 text-xs font-black uppercase italic tracking-widest text-gray-500 dark:text-gray-400">
	                          Waiting for next nomination
	                        </p>
	                      )}
                    </div>
                  </div>

                  {selectedPlayer &&
                    selectedPlayerRecommendation &&
                    currentNominationDraftIntelligence && (
                      <div className="grid gap-3">
                        <div
                          key={currentNominationRecommendation}
                          className={`rounded-3xl border px-5 py-5 text-center ${getCurrentNominationRecommendationClass(currentNominationRecommendation)}`}
                          style={{ animation: 'draftRecommendationShift 360ms ease-out' }}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-70">
                            Recommendation
                          </p>
                          <p className="mt-2 text-4xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
                            {getCurrentNominationRecommendationLabel(currentNominationRecommendation)}
                          </p>
                        </div>

	                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={`rounded-2xl border px-4 py-4 ${getHudMoneyClass(currentNominationBidCeilingState)}`}>
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-60">
                              Current Bid
                            </p>
                            <p className="mt-2 text-3xl font-black uppercase italic leading-none">
                              {currentNominationManualBidValue === null
                                ? 'No Bid'
                                : formatMoney(currentNominationManualBidValue)}
                            </p>
                          </div>

                          <div className={`rounded-2xl border px-4 py-4 ${getHudMoneyClass(currentNominationBidCeilingState)}`}>
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-60">
                              Current AI Ceiling
                            </p>
                            <p className="mt-2 text-4xl font-black uppercase italic leading-none">
                              {formatMoney(currentNominationCurrentAiCeiling.ceiling)}
                            </p>
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest opacity-70">
                              {currentNominationActionableCeilingLabel} actionable
                            </p>
                          </div>

                          <div className="rounded-2xl bg-black/[0.025] px-4 py-4 text-gray-800 dark:bg-white/[0.04] dark:text-gray-100">
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                              Predicted Sale
                            </p>
                            <p className="mt-2 text-3xl font-black uppercase italic leading-none">
                              {formatMoney(currentNominationDraftIntelligence.predictedWinningBid)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-black/[0.025] px-4 py-4 text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                              Legal Max
                            </p>
                            <p className="mt-2 text-2xl font-black uppercase italic leading-none">
                              {currentNominationLegalMaxLabel}
                            </p>
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {currentNominationLegalMaxDetail}
                            </p>
                          </div>
                        </div>

                        <details className="group rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400 [&::-webkit-details-marker]:hidden">
                            <span>▼ More Draft Intel</span>
                            <span className="text-orange-600 group-open:rotate-180">⌄</span>
                          </summary>

                          <div className="mt-3 grid gap-3 border-t border-black/10 pt-3 dark:border-white/10">
                            <div className="rounded-xl bg-white px-3 py-3 dark:bg-black/20">
                              <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                Market Demand
                              </p>
                              {selectedPlayerAdp ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                  <span className="text-sm text-orange-600">
                                    {selectedPlayerAdp.demandTier}
                                  </span>
                                  <span>ADP {formatAdp(selectedPlayerAdp.consensusOverallAdp)}</span>
                                  <span>
                                    {selectedPlayerAdp.position}
                                    {formatAdp(selectedPlayerAdp.consensusPositionAdp)}
                                  </span>
                                  <span>WAIT RISK: {selectedPlayerAdp.waitRisk}</span>
                                  <span>
                                    {selectedPlayerAdp.sourceCount} SOURCES · {selectedPlayerAdp.confidence} CONFIDENCE
                                  </span>
                                </div>
                              ) : (
                                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                  UNKNOWN
                                </p>
                              )}
                            </div>

	                            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Confidence
                                </p>
                                <p className={`mt-1 text-sm font-black ${getCurrentNominationConfidenceClass(currentNominationDraftIntelligence.confidenceScore)}`}>
                                  {currentNominationDraftIntelligence.confidence.toUpperCase()} · {currentNominationDraftIntelligence.confidenceScore}%
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Value Gap
                                </p>
                                <p className={`mt-1 text-sm font-black ${getCurrentNominationValueGapClass(currentNominationValueGap)}`}>
                                  {formatCurrentNominationValueGap(currentNominationValueGap)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Market
                                </p>
                                <p className="mt-1 text-sm font-black text-orange-600">
                                  {formatMoney(currentNominationDraftIntelligence.marketValue)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Historical Context
                                </p>
                                <p className="mt-1 truncate text-sm font-black">
                                  {selectedPlayerHistoricalPricing.kind === 'none'
                                    ? 'No River City history'
                                    : selectedPlayerHistoricalPricing.historyContextLabel}
                                </p>
                              </div>
                            </div>

	                            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Remaining Budget
                                </p>
                                <p className="mt-1 text-sm font-black">
                                  {guidanceBudgetRow?.budgetIsIncomplete
                                    ? 'INCOMPLETE'
                                    : formatMoney(guidanceBudgetRow?.remainingBudget ?? null)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Open Spots
                                </p>
                                <p className="mt-1 text-sm font-black">
                                  {guidanceBudgetRow?.rosterSpotsRemaining ?? 'N/A'}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Reserve After Purchase
                                </p>
                                <p className="mt-1 text-sm font-black">
                                  {guidanceBudgetRow === null
                                    ? 'N/A'
                                    : currentNominationReserveAfterWinning === null
                                      ? 'INCOMPLETE'
                                      : formatMoney(currentNominationReserveAfterWinning)}
                                </p>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Legal Max Calculation
                                </p>
                                <p className="mt-1 text-sm font-black text-orange-600">
                                  {currentNominationLegalMaxLabel}
                                </p>
                                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                  {currentNominationLegalMaxDetail}
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-xl bg-white p-3 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Why
                                </p>
                                <ul className="mt-2 space-y-1 text-xs font-bold text-gray-700 dark:text-gray-200">
                                  {currentNominationReasons.length > 0 ? (
                                    currentNominationReasons.slice(0, 3).map((reason) => (
                                      <li key={reason} className="flex items-start gap-1">
                                        <span className="text-emerald-600 dark:text-emerald-300">✓</span>
                                        <span>{reason}</span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="flex items-start gap-1">
                                      <span className="text-gray-400">✓</span>
                                      <span>No draft intelligence reasons available.</span>
                                    </li>
                                  )}
                                </ul>
                              </div>

                              <div className="rounded-xl bg-white p-3 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Warnings
                                </p>
                                {currentNominationWarnings.length > 0 ? (
                                  <div className="mt-2 space-y-1">
                                    {currentNominationWarnings.slice(0, 2).map((warning) => (
                                      <p
                                        key={warning}
                                        className="rounded-lg bg-rose-600/10 px-2.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300"
                                      >
                                        {warning}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    No warning active.
                                  </p>
                                )}
                              </div>
                            </div>

                            {currentNominationCompetitionContext && (
                              <div className="rounded-xl bg-white p-3 dark:bg-black/20">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                    Live Competition
                                  </p>
                                  <span className="rounded-full bg-black/5 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-gray-600 dark:bg-white/10 dark:text-gray-300">
                                    {currentNominationCompetitionContext.summary}
                                  </span>
                                </div>

                                <div className="mt-2 grid gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:grid-cols-3">
                                  <span>
                                    Afford: {currentNominationCompetitionContext.ownersAbleToAfford}
                                  </span>
                                  <span>
                                    Need: {currentNominationCompetitionContext.ownersNeedingPosition}
                                  </span>
                                  <span>
                                    Both: {currentNominationCompetitionContext.ownersBothNeedAndAfford}
                                  </span>
                                </div>

                                {currentNominationCompetitionContext.ownersBothNeedAndAfford === 0 ? (
                                  <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    No strong live bidding threats identified.
                                  </p>
                                ) : (
                                  <div className="mt-2 grid gap-2 lg:grid-cols-3">
                                    {currentNominationCompetitionContext.threats.slice(0, 3).map((threat) => (
                                      <div
                                        key={threat.ownerId}
                                        className="rounded-lg bg-black/[0.025] p-2 dark:bg-white/[0.04]"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-black">
                                              {threat.ownerName}
                                            </p>
                                            <p className="truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                              {threat.teamName}
                                            </p>
                                          </div>
                                          <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${statusStyles[threat.threatLevel]}`}>
                                            {threat.threatLevel}
                                          </span>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                          <span>Budget {formatMoney(threat.remainingBudget)}</span>
                                          <span>Legal {formatMoney(threat.legalMaxBid)}</span>
                                          <span>Need {threat.needLevel}</span>
                                          <span>Hist {formatCompetitionShare(threat.historicalPositionSpendShare)}</span>
                                        </div>
                                        <ul className="mt-2 space-y-1 text-xs font-bold text-gray-700 dark:text-gray-200">
                                          {threat.reasons.slice(0, 2).map((reason) => (
                                            <li key={reason}>{reason}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {currentNominationCompetitionContext.warnings.length > 0 && (
                                  <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                                    {currentNominationCompetitionContext.warnings[0]}
                                  </p>
                                )}
                              </div>
                            )}

                            {currentNominationRoomIntelligence && (
                              <div className="rounded-xl bg-white p-3 dark:bg-black/20">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                                  Room Intelligence
                                </p>
                                <div className="mt-2 grid gap-2 text-xs font-black text-gray-700 dark:text-gray-200 sm:grid-cols-4">
                                  <span>
                                    Run: {currentNominationRoomIntelligence.positionRun.position} {currentNominationRoomIntelligence.positionRun.status.toUpperCase()}
                                  </span>
                                  <span>
                                    Need: {currentNominationRoomIntelligence.ownersNeedingPosition.length} owners need {currentNominationRoomIntelligence.positionRun.position}
                                  </span>
                                  <span>
                                    Afford: {currentNominationRoomIntelligence.affordability.canAffordPredictedBidCount} can afford likely {formatMoney(currentNominationDraftIntelligence.predictedWinningBid)}
                                  </span>
                                  <span>
                                    Scarcity: {currentNominationRoomIntelligence.scarcity.summary}
                                  </span>
                                </div>
                                <div className="mt-2 grid gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                                  {currentNominationRoomIntelligence.reasons.slice(0, 3).map((reason) => (
                                    <span key={reason}>{reason}</span>
                                  ))}
                                  {currentNominationRoomIntelligence.warnings.slice(0, 2).map((warning) => (
                                    <span key={warning} className="text-rose-700 dark:text-rose-300">
                                      {warning}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                </div>
              </section>

              {selectedPlayer && (
                <section className="rounded-2xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#121212]">
                  <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveDraftPlanPreference();
                    }}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400">
                          My Draft Plan
                        </p>
                        <p className="mt-1 truncate text-lg font-black uppercase italic">
                          {selectedPlayer.originalPlayerName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                          {access.ownerProfileLabel ?? 'Authorized Owner'}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${
                          selectedPlayerHasDraftPlan
                            ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-400'
                        }`}>
                          {selectedPlayerHasDraftPlan ? 'Plan Saved' : 'Open'}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-4">
                      {draftPlanTagOptions.map((option) => {
                        const isActive = draftPlanTagInput === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setDraftPlanTagInput(option.value);
                              setDraftPlanSaveStatus('idle');
                              setDraftPlanError(null);
                            }}
                            className={`h-9 rounded-xl border text-[9px] font-black uppercase tracking-widest transition ${
                              isActive
                                ? 'border-orange-600/30 bg-orange-600 text-white'
                                : 'border-black/10 bg-black/[0.03] text-gray-600 hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <label className="block min-w-0">
                        <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Preferred Entry
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draftPlanPreferredEntryInput}
                          onChange={(event) => {
                            setDraftPlanPreferredEntryInput(event.target.value);
                            setDraftPlanSaveStatus('idle');
                            setDraftPlanError(null);
                          }}
                          placeholder="Blank"
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                        />
                      </label>

                      <label className="block min-w-0">
                        <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Planned Cap
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draftPlanPlannedCapInput}
                          onChange={(event) => {
                            setDraftPlanPlannedCapInput(event.target.value);
                            setDraftPlanSaveStatus('idle');
                            setDraftPlanError(null);
                          }}
                          placeholder="Blank"
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                        />
                      </label>

                      <label className="block min-w-0">
                        <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Live Override
                        </span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          inputMode="numeric"
                          value={draftPlanLiveOverrideInput}
                          onChange={(event) => {
                            setDraftPlanLiveOverrideInput(event.target.value);
                            setDraftPlanLiveOverrideAboveAiConfirmed(false);
                            setDraftPlanSaveStatus('idle');
                            setDraftPlanError(null);
                          }}
                          placeholder="Session"
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                        />
                      </label>
                    </div>

                    {(currentNominationLiveOverrideExceedsAi ||
                      currentNominationAcceptedLiveOverrideValue !== null) && (
                      <div className="grid gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={
                              !currentNominationLiveOverrideExceedsAi ||
                              draftPlanLiveOverrideAboveAiConfirmed
                            }
                            onChange={(event) =>
                              setDraftPlanLiveOverrideAboveAiConfirmed(
                                event.target.checked
                              )
                            }
                            disabled={!currentNominationLiveOverrideExceedsAi}
                            className="mt-0.5 h-4 w-4 rounded border-black/20"
                          />
                          <span>
                            {currentNominationLiveOverrideExceedsAi
                              ? 'Confirm Live Override above Current AI Ceiling.'
                              : 'Live Override is within Current AI Ceiling.'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentNominationAcceptedLiveOverrideValue !== null) {
                              void saveDraftPlanPreference({
                                plannedCapOverride:
                                  currentNominationAcceptedLiveOverrideValue,
                              });
                            }
                          }}
                          disabled={
                            draftPlanSaveStatus === 'saving' ||
                            currentNominationAcceptedLiveOverrideValue === null ||
                            !selectedPlayer.sleeperPlayerId
                          }
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-500/30 bg-white/60 px-3 text-[9px] font-black uppercase tracking-widest text-amber-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black/20 dark:text-amber-200"
                        >
                          Update Planned Cap
                        </button>
                      </div>
                    )}

                    <label className="block min-w-0">
                      <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Note
                      </span>
                      <textarea
                        value={draftPlanNoteInput}
                        maxLength={240}
                        rows={2}
                        onChange={(event) => {
                          setDraftPlanNoteInput(event.target.value);
                          setDraftPlanSaveStatus('idle');
                          setDraftPlanError(null);
                        }}
                        placeholder="Optional note"
                        className="min-h-16 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                      />
                    </label>

                    <div className="grid gap-2 text-[10px] font-black uppercase tracking-widest sm:grid-cols-3">
                      <div className="rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.04]">
                        <p className="text-gray-400">Market</p>
                        <p className="mt-1 text-sm text-orange-600">
                          {formatMoney(selectedPlayer.averageValue ?? null)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.04]">
                        <p className="text-gray-400">Recommended Max</p>
                        <p className="mt-1 text-sm">
                          {formatMoney(
                            currentNominationDraftIntelligence?.ownerMaxBid ??
                              selectedPlayerRecommendation?.recommendedMaxBid ??
                              null
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-blue-600/20 bg-blue-600/10 px-3 py-2 text-blue-700 dark:text-blue-300">
                        <p className="text-gray-500 dark:text-blue-300/80">Current AI Ceiling</p>
                        <p className="mt-1 text-sm">
                          {formatMoney(currentNominationCurrentAiCeiling.ceiling)}
                        </p>
                        <p className="mt-1 text-[8px] font-bold leading-snug">
                          {currentNominationCurrentAiCeiling.detail}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.04]">
                        <p className="text-gray-400">Planned Cap</p>
                        <p className="mt-1 text-sm">
                          {draftPlanPlannedCapInput.trim()
                            ? `$${draftPlanPlannedCapInput.trim()}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.04]">
                        <p className="text-gray-400">Preferred Entry</p>
                        <p className="mt-1 text-sm">
                          {draftPlanPreferredEntryInput.trim()
                            ? `$${draftPlanPreferredEntryInput.trim()}`
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/[0.025] px-3 py-2 dark:bg-white/[0.04]">
                        <p className="text-gray-400">Legal Max</p>
                        <p className="mt-1 text-sm">{currentNominationLegalMaxLabel}</p>
                      </div>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300">
                        <p className="text-gray-500 dark:text-amber-300/80">
                          Actionable Ceiling
                        </p>
                        <p className="mt-1 text-sm">
                          {currentNominationActionableCeilingLabel}
                        </p>
                        <p className="mt-1 text-[8px] font-bold leading-snug">
                          {currentNominationActionableCeilingDetail}
                        </p>
                      </div>
                    </div>

                    {(draftPlanError ||
                      draftPlanSaveStatus === 'saved' ||
                      currentNominationPlanWarnings.length > 0) && (
                      <div className="grid gap-1.5 text-[10px] font-black uppercase tracking-widest">
                        {draftPlanError ? (
                          <p className="rounded-lg border border-rose-600/20 bg-rose-600/10 px-3 py-2 text-rose-700 dark:text-rose-300">
                            {draftPlanError}
                          </p>
                        ) : null}
                        {draftPlanSaveStatus === 'saved' ? (
                          <p className="rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                            Draft plan saved.
                          </p>
                        ) : null}
                        {currentNominationPlanWarnings.map((warning) => (
                          <p
                            key={warning}
                            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-300"
                          >
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="submit"
                        disabled={
                          draftPlanSaveStatus === 'saving' ||
                          !selectedPlayer.sleeperPlayerId
                        }
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-orange-600/30 bg-orange-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-black/[0.06] disabled:text-gray-400 dark:disabled:border-white/10 dark:disabled:bg-white/[0.06]"
                      >
                        {draftPlanSaveStatus === 'saving' ? 'Saving' : 'Save Plan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveDraftPlanPreference({ clear: true })}
                        disabled={
                          draftPlanSaveStatus === 'saving' ||
                          !selectedPlayer.sleeperPlayerId
                        }
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03] px-4 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                      >
                        Clear Plan
                      </button>
                    </div>
                  </form>
                </section>
              )}

              {access.canRecordSales && (
              <section className="rounded-2xl border border-black/10 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-[#121212]">
	                <form
	                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem]"
	                  onSubmit={(event) => {
                    event.preventDefault();
                    recordManualSale();
                  }}
                >
                  <div className="min-w-0 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                      Selected Player
                    </p>
                    <p className="mt-1 truncate text-sm font-black uppercase italic leading-tight sm:text-base">
                      {manualSaleSelectedPlayer
                        ? `${manualSaleSelectedPlayer.originalPlayerName} | ${manualSaleSelectedPlayer.position ?? 'N/A'} ${manualSaleSelectedPlayer.nflTeam ?? 'N/A'}`
                        : 'Use master search or My Board'}
                    </p>
                  </div>

                  <label className="block min-w-0">
                    <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                      Sale Price
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
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-2 text-center text-sm font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    />
                  </label>

	                  <label className="block min-w-0 sm:col-span-2">
                    <span className="mb-1 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                      Buyer
                    </span>
                    <select
                      value={manualSaleBuyerTeamId}
                      onChange={(event) => {
                        setManualSaleBuyerTeamId(event.target.value);
                        setManualSaleError(null);
                      }}
                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-black outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30"
                    >
                      {mockAuctionTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.teamName} | {team.managerName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="submit"
                    disabled={!canRecordManualSale}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-black/[0.06] disabled:text-gray-400 dark:disabled:border-white/10 dark:disabled:bg-white/[0.06]"
                  >
                    <Gavel className="h-4 w-4" />
                    Finish Sale
                  </button>

                  <button
                    type="button"
                    onClick={undoLastManualSale}
                    disabled={latestUndoableManualSale === null}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Undo
                  </button>
                </form>

                {(manualSaleConfirmation || manualSaleValidationMessage || manualSalePlayerAlreadyTaken || manualSalePlayerStrategyMessage) && (
                  <div className="mt-2 grid gap-1.5 text-[10px] font-black uppercase tracking-widest">
                    {manualSaleConfirmation && (
                      <p className="rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                        Last sale: {manualSaleConfirmation.playerName} to {manualSaleConfirmation.teamName} for {formatMoney(manualSaleConfirmation.salePrice)} | {formatChatTimestamp(manualSaleConfirmation.recordedAt)}
                      </p>
                    )}
                    {manualSaleValidationMessage && (
                      <p className={`rounded-lg border px-3 py-2 ${
                        manualSaleError
                          ? 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300'
                          : 'border-black/10 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300'
                      }`}>
                        {manualSaleValidationMessage}
                      </p>
                    )}
                    {manualSalePlayerAlreadyTaken && (
                      <p className="rounded-lg border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-orange-700 dark:text-orange-300">
                        Already marked taken by {formatPurchaseSourceLabel(manualSalePlayerAlreadyTaken.source)}: {getTeam(manualSalePlayerAlreadyTaken.teamId)?.teamName ?? `Roster ${manualSalePlayerAlreadyTaken.rosterId ?? 'N/A'}`} at {formatMoney(manualSalePlayerAlreadyTaken.purchasePrice)}
                      </p>
                    )}
                    {manualSalePlayerStrategyMessage && (
                      <p className="rounded-lg border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                        {manualSalePlayerStrategyMessage}
                      </p>
                    )}
                  </div>
                )}
              </section>
              )}
              </>
              )}

              {activeWorkspace === 'strategy' && (
              <>
              {ownerSettingsSummary && (
                <section className="rounded-2xl border border-orange-600/20 bg-orange-600/10 p-4 text-orange-800 shadow-lg dark:text-orange-200">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.25em]">
                        Draft Settings
                      </p>
                      <p className="mt-1 text-sm font-black uppercase italic leading-tight">
                        {ownerSettingsSummary}
                      </p>
                    </div>
                    {access.role === 'pilot-owner' && (
                      <Link
                        href="/commish/auction/onboarding?edit=1"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-orange-600/30 bg-white/60 px-4 text-[10px] font-black uppercase tracking-widest text-orange-800 transition hover:bg-white dark:bg-black/20 dark:text-orange-200"
                      >
                        Edit Draft Settings
                      </Link>
                    )}
                  </div>
                </section>
              )}

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
                  {formatWarRoomTerminology(auctionAdvisorSummary.headline)}
                </h3>
                <p className="mt-2 text-xs font-bold leading-relaxed">
                  {formatWarRoomTerminology(auctionAdvisorSummary.currentStrategy)}
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

              <div className="grid gap-2 md:grid-cols-5">
                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Highest Need
                  </p>
                  <p className="mt-2 text-xs font-black uppercase leading-tight">
                    {topRosterNeedRows[0]?.label ?? 'Value'}
                  </p>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Budget Status
                  </p>
                  <p className="mt-2 text-xs font-black uppercase leading-tight text-gray-600 dark:text-gray-300">
                    {strategyBudgetStatus}
                  </p>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Legal Max
                  </p>
                  <p className="mt-2 text-xs font-black uppercase leading-tight text-orange-600">
                    {guidanceBudgetRow?.budgetIsIncomplete
                      ? 'INCOMPLETE'
                      : formatMoney(guidanceBudgetRow?.maxBid ?? null)}
                  </p>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Market Read
                  </p>
                  <p className="mt-2 text-xs font-bold leading-tight text-gray-600 dark:text-gray-300">
                    {strategyMarketRead}
                  </p>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Open-Market Sales
                  </p>
                  <p className="mt-2 text-xs font-black uppercase leading-tight">
                    {strategyCompletedOpenMarketPurchaseCount}
                  </p>
                </div>
              </div>

              <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                {strategyBudgetRead}
              </p>

              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Top Value Targets
                </p>
                <div className="space-y-2">
                  {auctionAdvisorSummary.bestValueOpportunities.length > 0 ? (
                    auctionAdvisorSummary.bestValueOpportunities.map((player) => {
                      const valueGap =
                        player.averageValue === null ||
                        player.recommendedMaxBid === null
                          ? null
                          : player.recommendedMaxBid - player.averageValue;

                      return (
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
                            <span>Market {formatMoney(player.averageValue)}</span>
                            <span className="text-orange-600">
                              REC {formatMoney(player.recommendedMaxBid)}
                            </span>
                            <span>
                              Gap {valueGap === null ? 'N/A' : formatSignedMoney(Math.round(valueGap))}
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
                            {formatWarRoomTerminology(player.reason)}
                          </p>
                        </div>
                      );
                    })
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
                      <span>Market {formatMoney(row.averageValue)}</span>
                      <span className="text-orange-600">
                        REC {formatMoney(row.recommendation.recommendedMaxBid)}
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
                placeholder="Try: Bijan, recommended max Bijan, should I bid on Bijan"
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
              </>
              )}

            </div>
            )}

            {(activeWorkspace === 'draft' ||
              activeWorkspace === 'strategy' ||
              activeWorkspace === 'history') && (
            <div
		              className={
		                activeWorkspace === 'draft'
		                  ? 'order-3 grid min-h-0 min-w-0 gap-3 xl:col-span-2 2xl:col-span-1'
		                  : 'grid min-h-0 gap-3'
		              }
            >
              {activeWorkspace === 'draft' && (
              <>
              <SectionShell
                title="ROOM"
                eyebrow="Utility Rail"
                icon={Users}
              >
                <div className="grid gap-2">
                  <div className="grid grid-cols-4 gap-2">
                    {draftUtilitySections.map((section) => {
                      const isOpen = draftUtilityOpenSection === section.value;

                      return (
                        <button
                          key={section.value}
                          type="button"
                          aria-label={section.label}
                          onClick={() =>
                            setDraftUtilityOpenSection(isOpen ? null : section.value)
                          }
	                          className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition xl:aspect-auto xl:min-h-12 ${
                            isOpen
                              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                              : 'bg-black/[0.035] hover:bg-orange-600/10 dark:bg-white/[0.05]'
                          }`}
                        >
                          <span aria-hidden="true">{section.icon}</span>
                        </button>
                      );
                    })}
                  </div>

                  {draftUtilityOpenSection === null && (
                    <p className="rounded-xl bg-black/[0.03] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
                      Quick tools are collapsed by default.
                    </p>
                  )}

                  {draftUtilityOpenSection === 'budgets' && (
                    <div className="grid gap-2 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]" style={{ animation: 'draftDrawerIn 220ms ease-out' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        💰 Budgets
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {purchaseSourceDetail}
                      </p>
                      <div className="max-h-[54vh] overflow-auto rounded-xl border border-black/10 dark:border-white/10">
                        <table className="w-full min-w-[520px] text-left">
                          <thead>
                            <tr className="sticky top-0 z-10 border-b border-black/10 bg-white text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-[#121212]">
                              <th className="px-2 py-2">Owner</th>
                              <th className="px-2 py-2">Spent</th>
                              <th className="px-2 py-2">Remain</th>
                              <th className="px-2 py-2">Players</th>
                              <th className="px-2 py-2">Legal Max</th>
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
                                    {row.budgetIsIncomplete && (
                                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                                        Budget incomplete: {row.missingKeeperPriceCount} keeper price missing
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 font-black">{formatMoney(row.totalSpent)}</td>
                                  <td className="px-2 py-2 font-black text-emerald-600">
                                    {row.budgetIsIncomplete ? 'Incomplete' : formatMoney(row.remainingBudget)}
                                  </td>
                                  <td className="px-2 py-2 font-black">
                                    {Math.max(0, row.team.rosterSlots.total - row.rosterSpotsRemaining)}/{row.team.rosterSlots.total}
                                  </td>
                                  <td className="px-2 py-2">
                                    <p className="font-black text-orange-600">
                                      {row.budgetIsIncomplete ? 'Incomplete' : formatMoney(row.maxBid)}
                                    </p>
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
                    </div>
                  )}

                  {draftUtilityOpenSection === 'heat' && (
                    <div className="space-y-1.5 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]" style={{ animation: 'draftDrawerIn 220ms ease-out' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        🔥 Heat
                      </p>
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
                  )}

                  {draftUtilityOpenSection === 'trends' && (
                    <div className="grid gap-2 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]" style={{ animation: 'draftDrawerIn 220ms ease-out' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        📈 Trends
                      </p>
                      {latestSaleReaction && latestDraftSale ? (
                        <div className="grid gap-2">
                          <p className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase italic dark:bg-black/20">
                            {latestDraftSale.playerName} {formatMoney(latestDraftSale.price)}
                          </p>
                          <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:bg-black/20 dark:text-gray-300">
                            {latestSaleReaction.marketEffect}
                          </p>
                          <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:bg-black/20 dark:text-gray-300">
                            {latestSaleReaction.nextAction}
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:bg-black/20 dark:text-gray-400">
                          No recent sale trend is available.
                        </p>
                      )}
                    </div>
                  )}

                  {draftUtilityOpenSection === 'sales' && (
                    <div className="grid gap-2 rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]" style={{ animation: 'draftDrawerIn 220ms ease-out' }}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        🕒 Recent Sales | {draftTimelineRows.length} sale{draftTimelineRows.length === 1 ? '' : 's'}
                      </p>
                      {draftTimelineRows.length > 0 ? (
                        <div className="max-h-[54vh] overflow-auto pr-1">
                          <div className="space-y-1.5">
                            {draftTimelineRows.map((sale) => (
                              <div
                                key={sale.id}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2.5 py-2 text-xs dark:border-white/10 dark:bg-white/[0.03]"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-black uppercase italic">
                                    {sale.playerName}
                                  </p>
                                  <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    {sale.buyer} | {sale.source} | {sale.time}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-orange-600">
                                    {formatMoney(sale.price)}
                                  </p>
                                  <span className={`mt-1 inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getValueResultClass(sale.valueResult)}`}>
                                    {sale.valueResult}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                          No completed auction purchases yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </SectionShell>
              </>
              )}

              {activeWorkspace === 'strategy' && (
              <>
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
              </>
              )}

              {activeWorkspace === 'history' && (
              <>
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
                              {sale.position ?? 'N/A'} | {sale.historySource} | {sale.time}
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
                    No completed auction purchases yet.
                  </p>
                )}
              </SectionShell>
              {access.canRecordSales && (
                <SectionShell
                  title="Undo Controls"
                  eyebrow="Manual Sales"
                  icon={ArrowLeft}
                >
                  {latestUndoableManualSale ? (
                    <div className="grid gap-3">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Most Recent Undoable Manual Sale
                        </p>
                        <p className="mt-2 text-sm font-black uppercase italic">
                          {latestUndoableManualSale.playerName}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {latestUndoableManualSale.teamName} | {formatMoney(latestUndoableManualSale.salePrice)} | {formatChatTimestamp(latestUndoableManualSale.recordedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={undoLastManualSale}
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Undo Manual Sale
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                      No manual sales available to undo.
                    </p>
                  )}
                </SectionShell>
              )}
              </>
              )}

              {activeWorkspace === 'strategy' && (
              <>
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
                    No completed auction purchase yet.
                  </p>
                )}
              </SectionShell>

              <SectionShell
                title="Warnings"
                eyebrow="Advisor Alerts"
                icon={FileWarning}
              >
                <div className="space-y-2">
                  {strategyWarnings.length > 0 ? (
                    strategyWarnings.map((warning) => (
                      <div
                        key={warning.key}
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
                  {strategyNextActions.length > 0 ? (
                    strategyNextActions.map((action, index) => (
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
                    ))
                  ) : (
                    <p className="rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                      No live action is available until a roster, budget, or market input loads.
                    </p>
                  )}
                </div>
              </SectionShell>
              </>
              )}
            </div>
            )}
          </div>
            )}

          {(activeWorkspace === 'strategy' || activeWorkspace === 'history') && (
          <div className="grid gap-4">

          {activeWorkspace === 'history' && (
          <SectionShell
            title="Sleeper Draft Snapshot"
            eyebrow="Automatic Read-Only Sync"
            icon={RefreshCw}
            collapsible
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Season 2026
                </p>
                <p className="mt-2 text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                  Read-only Sleeper keepers and purchases snapshot. Auto-refreshes every 3 minutes; no writes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => refreshSleeperSnapshot()}
                disabled={sleeperSnapshotStatus === 'loading'}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-orange-600/30 bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${sleeperSnapshotStatus === 'loading' ? 'animate-spin' : ''}`}
                />
                Refresh Sleeper
              </button>
            </div>

            <div className="mb-5 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-4 py-3 text-orange-700 dark:text-orange-300">
              <p className="text-[10px] font-black uppercase tracking-widest">
                {sleeperSnapshotSourceMessage}
              </p>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Sync Status
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {sleeperSyncStatusLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Last Refresh
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {formatTimestamp(sleeperLastSuccessfulRefreshAt ?? sleeperSnapshot?.fetchedAt ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Draft ID
                </p>
                <p className="mt-2 text-xs font-black uppercase leading-tight">
                  {sleeperSelectedDraftId ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Draft Type/Status
                </p>
                <p className="mt-2 text-sm font-black uppercase leading-tight">
                  {sleeperSelectedDraftType ?? 'N/A'} / {sleeperSelectedDraftStatus ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Keepers
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {sleeperSnapshot ? sleeperKeeperCount : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Priced Keepers
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {sleeperSnapshot ? sleeperPricedKeeperCount : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Missing Prices
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic text-orange-600">
                  {sleeperSnapshot ? sleeperMissingKeeperPriceCount : 'N/A'}
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
                  Raw Picks
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {sleeperRawPickCount ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Roster Keepers
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {sleeperRosterKeeperCount ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Sources
                </p>
                <p className="mt-2 text-xs font-black uppercase leading-tight">
                  {sleeperKeeperSourcesUsed.length > 0
                    ? sleeperKeeperSourcesUsed.join(', ')
                    : 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Warnings
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic text-orange-600">
                  {sleeperSnapshotWarnings.length}
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
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                    <th className="py-3 pr-4">Owner/Team</th>
                    <th className="py-3 pr-4">Keepers Assigned</th>
                    <th className="py-3 pr-4">Completed Purchases</th>
                    <th className="py-3 pr-4">Budget Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {historyTeamCoverageRows.length > 0 ? (
                    historyTeamCoverageRows.map((row) => (
                      <tr key={row.team.id} className="text-sm">
                        <td className="py-3 pr-4">
                          <p className="font-black">{row.team.managerName}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {row.team.teamName}
                          </p>
                        </td>
                        <td className="py-3 pr-4 font-black">
                          {row.keeperCount}
                        </td>
                        <td className="py-3 pr-4 font-black">
                          {row.completedPurchaseCount}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                            row.budgetStatus === 'INCOMPLETE'
                              ? 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                              : 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {row.budgetStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
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
          )}

          {activeWorkspace === 'strategy' && (
          <>
          <SectionShell
            title="Roster Guidance"
            eyebrow={
              hasManualAuctionSales
                ? isUsingSleeperPurchases
                  ? 'Live War Room State'
                  : 'Manual Fallback'
                : isUsingSleeperPurchases
                  ? 'Sleeper Snapshot Build'
                  : 'No Live Roster Rows'
            }
            icon={ClipboardList}
            collapsible
          >
            <div className="mb-5 grid gap-3 md:grid-cols-6">
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
                  Remaining
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {guidanceBudgetRow?.budgetIsIncomplete
                    ? 'Incomplete'
                    : formatMoney(guidanceBudgetRow?.remainingBudget ?? null)}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Open Spots
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {guidanceBudgetRow?.rosterSpotsRemaining ?? 'N/A'}
                </p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Legal Max
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic text-orange-600">
                  {guidanceBudgetRow?.budgetIsIncomplete
                    ? 'Incomplete'
                    : formatMoney(guidanceBudgetRow?.maxBid ?? null)}
                </p>
                {guidanceBudgetRow?.budgetIsIncomplete && (
                  <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                  {guidanceBudgetRow.missingKeeperPriceCount} keeper price missing
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Avg/Open
                </p>
                <p className="mt-2 text-2xl font-black uppercase italic">
                  {guidanceBudgetRow?.budgetIsIncomplete
                    ? 'Incomplete'
                    : guidanceBudgetRow
                    ? formatMoneyPerSlot(guidanceBudgetRow.averageDollarsPerOpenSlot)
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mb-5 grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Rostered Players By Position
                </p>
                {guidanceRosterPlayers.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {guidanceRosterPlayersByPosition
                      .filter((group) => group.players.length > 0)
                      .map((group) => (
                        <div
                          key={group.position}
                          className="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/30"
                        >
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            {group.position}
                          </p>
                          <div className="mt-2 space-y-1.5">
                            {group.players.map((player) => (
                              <div key={player.id} className="text-xs">
                                <p className="truncate font-black uppercase italic">
                                  {player.playerName}
                                </p>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                  {player.source} | {formatMoney(player.cost)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-400">
                    No rostered players available from live War Room state.
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Strongest Filled
                  </p>
                  <p className="mt-2 text-lg font-black uppercase italic">
                    {strongestFilledPosition
                      ? `${strongestFilledPosition.position} ${strongestFilledPosition.current}/${strongestFilledPosition.target}`
                      : 'N/A'}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Weakest Filled
                  </p>
                  <p className="mt-2 text-lg font-black uppercase italic">
                    {weakestFilledPosition
                      ? `${weakestFilledPosition.position} ${weakestFilledPosition.current}/${weakestFilledPosition.target}`
                      : 'No starter gaps'}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Top Needs
                  </p>
                  <p className="mt-2 text-xs font-black uppercase leading-relaxed">
                    {topRosterNeedRows.length > 0
                      ? topRosterNeedRows.map((need) => need.label).join(', ')
                      : 'No open needs'}
                  </p>
                </div>
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
                      ? 'Live War Room Rostered Players'
                      : 'Manual Fallback Rostered Players'
                    : isUsingSleeperPurchases
                      ? 'Snapshot Rostered Players'
                      : 'No Live Rostered Players'}
                </h3>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Ray/Jeffrey roster only
              </p>
            </div>
            {rosterByeWeekCounts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {rosterByeWeekCounts.map((byeWeekGroup) => {
                  const byeSeverity = getByeWeekSeverity(byeWeekGroup.players.length);

                  return (
                    <div
                      key={byeWeekGroup.label}
                      className="rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                          Week {byeWeekGroup.label}
                        </p>
                        <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getByeWeekSeverityClass(byeSeverity)}`}>
                          {byeSeverity}
                        </span>
                      </div>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        {byeWeekGroup.players.length} player{byeWeekGroup.players.length === 1 ? '' : 's'}
                      </p>
                      <div className="space-y-1">
                        {byeWeekGroup.players.map((player) => (
                          <p
                            key={player.id}
                            className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400"
                          >
                            {player.playerName} ({player.position ?? 'N/A'})
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                No rostered players available for bye-week analysis.
              </p>
            )}
          </SectionShell>
          </>
          )}

          {activeWorkspace === 'history' && (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionShell
            title="Current Session Nomination"
            eyebrow="Live Selection"
            icon={Gavel}
            collapsible
          >
              {selectedPlayer ? (
              <div className="rounded-2xl border border-orange-600/20 bg-orange-600/5 p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-600">
                      Current Session Nomination
                    </p>
                    <h3 className="mt-2 text-3xl font-black uppercase italic tracking-tight">
                      {selectedPlayer.originalPlayerName}
                    </h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      {selectedPlayer.position ?? 'N/A'} | {selectedPlayer.nflTeam ?? 'N/A'}
                    </p>
                  </div>
                  <StatusPill status={selectedPlayerStatus ?? 'selected'} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Bid Entered</p>
                    <p className="mt-1 text-2xl font-black">
                      {currentNominationManualBidValue === null
                        ? 'No bid entered'
                        : formatMoney(currentNominationManualBidValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Recommendation</p>
                    <p className="mt-1 text-2xl font-black">
                      {getCurrentNominationRecommendationLabel(currentNominationRecommendation)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Recommended Max</p>
                    <p className="mt-1 text-2xl font-black text-orange-600">
                      {formatMoney(
                        currentNominationDraftIntelligence?.ownerMaxBid ??
                          currentNominationBaselineMaxBid
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Predicted Sale</p>
                    <p className="mt-1 text-2xl font-black">
                      {formatMoney(currentNominationDraftIntelligence?.predictedWinningBid ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Legal Max</p>
                    <p className="mt-1 text-2xl font-black">
                      {currentNominationLegalMaxLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Selected Buyer</p>
                    <p className="mt-1 text-sm font-black uppercase leading-tight">
                      {manualSaleBuyerTeam
                        ? `${manualSaleBuyerTeam.teamName} | ${manualSaleBuyerTeam.managerName}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Latest Update</p>
                    <p className="mt-1 text-sm font-black uppercase leading-tight">
                      {formatTimestamp(currentSessionNominationLatestUpdateAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Source</p>
                    <p className="mt-1 text-sm font-black uppercase leading-tight">
                      Current War Room State
                    </p>
                  </div>
                </div>
              </div>
              ) : (
                <p className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                  No current nomination selected.
                </p>
              )}
            </SectionShell>

          <SectionShell
            title="Keeper Review"
            eyebrow="Sleeper Keepers"
            icon={ClipboardList}
            collapsible
          >
              <div className="mb-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Keepers</p>
                  <p className="mt-1 text-2xl font-black">{keeperPurchaseRows.length}</p>
                </div>
                <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Priced</p>
                  <p className="mt-1 text-2xl font-black">{keeperPurchaseRows.filter((keeper) => keeper.priceStatus !== 'missing').length}</p>
                </div>
                <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Missing Price</p>
                  <p className="mt-1 text-2xl font-black text-orange-600">{keeperPurchaseRows.filter((keeper) => keeper.priceStatus === 'missing').length}</p>
                </div>
                <div className="rounded-xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Teams Incomplete</p>
                  <p className="mt-1 text-2xl font-black">{teamsWithIncompleteBudgets}</p>
                </div>
              </div>

              {keeperReviewTeamRows.length > 0 ? (
                <div className="space-y-3">
                  {keeperReviewTeamRows.map((teamRow) => (
                    <div
                      key={teamRow.team.id}
                      className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-black uppercase italic tracking-tight">
                            {teamRow.team.managerName}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {teamRow.team.teamName}
                          </p>
                        </div>
                        <span className={`w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                          teamRow.budgetIsIncomplete
                            ? 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                            : 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                        }`}>
                          {teamRow.budgetIsIncomplete ? 'INCOMPLETE' : 'COMPLETE'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {teamRow.keepers.map((keeper) => (
                          <div
                            key={keeper.id}
                            className="grid gap-2 rounded-xl bg-white px-3 py-2 text-xs dark:bg-black/20 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-black uppercase italic">
                                {keeper.playerName}
                              </p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                {keeper.position ?? 'N/A'} | {keeper.nflTeam ?? 'N/A'} | {teamRow.team.teamName}
                              </p>
                            </div>
                            <span className="w-fit rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                              {keeper.priceStatus === 'missing'
                                ? 'Price missing'
                                : formatMoney(keeper.purchasePrice)}
                            </span>
                            <span className={`w-fit rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                              keeper.priceStatus === 'missing'
                                ? 'border-orange-600/20 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                                : 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300'
                            }`}>
                              {keeper.priceStatus === 'missing'
                                ? 'Price missing'
                                : 'Priced'}
                            </span>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:col-span-3">
                              Owner/team: {teamRow.team.managerName} | {teamRow.team.teamName} | Source: {formatHistorySourceLabel(keeper.source)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-black/10 bg-black/[0.03] p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                  No Sleeper keepers detected.
                </p>
              )}
            </SectionShell>
          </div>
          )}

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
                        ? 'Live War Room Rostered Players'
                        : 'Manual Fallback Rostered Players'
                      : isUsingSleeperPurchases
                        ? 'Snapshot Rostered Players'
                        : 'No Live Rostered Players'}
                  </h3>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Ray/Jeffrey roster only
                </p>
              </div>
              {rosterByeWeekCounts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {rosterByeWeekCounts.map((byeWeekGroup) => {
                    const byeSeverity = getByeWeekSeverity(byeWeekGroup.players.length);

                    return (
                      <div
                        key={byeWeekGroup.label}
                        className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-black/30"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            Week {byeWeekGroup.label}
                          </p>
                          <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${getByeWeekSeverityClass(byeSeverity)}`}>
                            {byeSeverity}
                          </span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                          {byeWeekGroup.players.map((player) => `${player.playerName} (${player.position ?? 'N/A'})`).join(', ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-black/30 dark:text-gray-400">
                  No rostered players available for bye-week analysis.
                </p>
              )}
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
                    <th className="py-3 pr-4">Recommended Max</th>
                    <th className="py-3 pr-4">Match</th>
                    <th className="py-3 pr-4">Taken/Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {visiblePlayerPoolRows.length > 0 ? (
                    visiblePlayerPoolRows.map((player) => {
                      const preferenceTags = getEffectivePreferenceTags(player);
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
              Read-only budget math is using {purchaseSourceLabel.toLowerCase()} with live keeper, purchase, and manual-local rows.
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
                    <th className="py-3 pr-4">Legal Max</th>
                    <th className="py-3 pr-4">Avg/Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {budgetRows.map((row) => {
                    const { team } = row;
                    return (
                      <tr key={team.id} className="text-sm">
                        <td className="py-3 pr-4 font-black">
                          {team.teamName}
                          {row.budgetIsIncomplete && (
                            <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                              Budget incomplete: {row.missingKeeperPriceCount} keeper price missing
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">{team.managerName}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(team.teamBudget)}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(row.keeperCost)}</td>
                        <td className="py-3 pr-4 font-black">{formatMoney(row.totalSpent)}</td>
                        <td className="py-3 pr-4 font-black text-emerald-600">
                          {row.budgetIsIncomplete ? 'Incomplete' : formatMoney(row.remainingBudget)}
                        </td>
                        <td className="py-3 pr-4 font-black">{row.rosterSpotsRemaining}</td>
                        <td className="py-3 pr-4 font-black text-orange-600">
                          {row.budgetIsIncomplete ? 'Incomplete' : formatMoney(row.maxBid)}
                        </td>
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

          {activeWorkspace === 'strategy' && !isUsingSleeperPurchases && (
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
          )}

          {activeWorkspace === 'history' && (
          <SectionShell
            title="Auction Log"
            eyebrow="Live Audit Trail"
            icon={History}
            collapsible
          >
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={historyAuditSearch}
                  onChange={(event) => setHistoryAuditSearch(event.target.value)}
                  placeholder="Search player, owner, or team"
                  className="h-11 w-full rounded-xl border border-black/10 bg-black/[0.03] pl-10 pr-3 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-white/[0.03]"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {historyAuditFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHistoryAuditFilter(option.value)}
                    className={`rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition ${
                      historyAuditFilter === option.value
                        ? 'border-orange-600 bg-orange-600 text-white'
                        : 'border-black/10 bg-black/[0.03] text-gray-500 hover:border-orange-600/40 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-black/10 text-[9px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10">
                    <th className="py-3 pr-4">Time/Order</th>
                    <th className="py-3 pr-4">Event</th>
                    <th className="py-3 pr-4">Player</th>
                    <th className="py-3 pr-4">Owner/Team</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Source</th>
                    <th className="py-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/10">
                  {visibleHistoryAuditRows.length > 0 ? (
                    visibleHistoryAuditRows.map((entry) => (
                      <tr key={entry.id} className="text-sm">
                        <td className="py-3 pr-4 font-bold text-gray-500 dark:text-gray-400">
                          {entry.orderLabel}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-black/5 px-3 py-1 text-[9px] font-black uppercase tracking-widest dark:bg-white/10">
                            {entry.eventType}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-black">{entry.playerName}</p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                            {entry.detailLabel}
                          </p>
                        </td>
                        <td className="py-3 pr-4 font-bold text-gray-600 dark:text-gray-300">
                          {entry.ownerTeam}
                        </td>
                        <td className="py-3 pr-4 font-black text-orange-600">
                          <p>{entry.amountLabel}</p>
                          {entry.decisionSnapshotLabel ? (
                            <p className="mt-1 max-w-60 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {entry.decisionSnapshotLabel}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full border border-black/10 bg-black/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                            {entry.sourceLabel}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${getHistoryAuditStatusClass(entry.status)}`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
                      >
                        No live auction history rows match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionShell>
          )}
        </div>
          )}

          {activeWorkspace === 'league-intel' && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SectionShell
                title="River City Historical Prices"
                eyebrow="League Intel"
                icon={History}
                className="xl:col-span-2"
              >
                {!selectedPlayer ? (
                  <p className="text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                    Select a player in Draft to view River City pricing history.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black uppercase italic tracking-tight">
                          {selectedPlayerHistoricalPriceComparison.playerName}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {selectedPlayerHistoricalPriceComparison.position ?? 'N/A'} | {selectedPlayerHistoricalPriceComparison.summary.seasonsCompared} actual season{selectedPlayerHistoricalPriceComparison.summary.seasonsCompared === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <span className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                          {formatHistoricalComparisonMatchType(selectedPlayerHistoricalPriceComparison.matchType)}
                        </span>
                        <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                          Masterview Expected Value
                        </span>
                        <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
                          Actual Sleeper Sale Price
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Current 2026 Market
                        </p>
                        <p className="mt-1 text-sm font-black text-orange-600">
                          {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.currentMarketValue)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Recommended Max
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.currentOwnerMaxBid)}
                        </p>
                      </div>
                    </div>

                    {selectedPlayerHistoricalPriceComparison.seasons.length === 0 ? (
                      <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                        {selectedPlayerHistoricalPriceComparison.valueSheetOnlySeasons.length > 0
                          ? 'Expected value exists, but no actual Sleeper sale was found.'
                          : 'No Sleeper auction sale history is available for this player.'}
                      </p>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                          <table className="w-full min-w-[760px] text-left">
                            <thead>
                              <tr className="border-b border-black/10 bg-black/[0.03] text-[8px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/[0.03]">
                                <th className="px-2 py-2">Season</th>
                                <th className="px-2 py-2">Expected</th>
                                <th className="px-2 py-2">Actual</th>
                                <th className="px-2 py-2">+/-</th>
                                <th className="px-2 py-2">Buyer</th>
                                <th className="px-2 py-2">Result</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5 dark:divide-white/10">
                              {selectedPlayerHistoricalPriceComparison.seasons.map((seasonComparison) => (
                                <tr key={seasonComparison.season} className="text-xs">
                                  <td className="px-2 py-2 font-black">
                                    {seasonComparison.season}
                                  </td>
                                  <td className="px-2 py-2 font-bold">
                                    {formatHistoricalMoney(seasonComparison.expectedValue)}
                                  </td>
                                  <td className="px-2 py-2 font-black">
                                    {formatHistoricalMoney(seasonComparison.actualSalePrice)}
                                  </td>
                                  <td className="px-2 py-2 font-black">
                                    {formatHistoricalDifference(seasonComparison.difference)}
                                    <span className="ml-1 text-[9px] font-bold text-gray-400">
                                      {formatHistoricalPercent(seasonComparison.differencePercent)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 font-bold text-gray-600 dark:text-gray-300">
                                    {seasonComparison.buyerName ?? 'N/A'}
                                    {seasonComparison.teamName && (
                                      <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-400">
                                        {seasonComparison.teamName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2">
                                    <div className="flex flex-wrap gap-1">
                                      <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getHistoricalComparisonResultClass(seasonComparison.result)}`}>
                                        {formatHistoricalComparisonResult(seasonComparison.result)}
                                      </span>
                                      {seasonComparison.isKeeper && (
                                        <span className="rounded-full border border-orange-600/20 bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                                          Keeper
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Average Expected
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.averageExpectedValue)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Average Actual
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.averageActualPrice)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Average Difference
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalDifference(selectedPlayerHistoricalPriceComparison.summary.averageDifference)}
                            </p>
                            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                              {formatHistoricalPercent(selectedPlayerHistoricalPriceComparison.summary.averageDifferencePercent)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Recent Actual Avg
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.recentAverageActual)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Most Recent Actual
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.mostRecentActualPrice)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Actual Range
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.lowestActualPrice)}-{formatHistoricalMoney(selectedPlayerHistoricalPriceComparison.summary.highestActualPrice)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Pricing Style
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalComparisonStyle(selectedPlayerHistoricalPriceComparison.summary.riverCityPricingStyle)}
                            </p>
                          </div>
                          <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                            <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                              Trend
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {formatHistoricalComparisonTrend(selectedPlayerHistoricalPriceComparison.summary.trend)}
                            </p>
                          </div>
                        </div>

                        <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                          {selectedPlayerHistoricalPriceComparison.verdict}
                        </p>
                      </>
                    )}

                    {selectedPlayerHistoricalPriceComparison.valueSheetOnlySeasons.length > 0 && (
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Value Sheet Only
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedPlayerHistoricalPriceComparison.valueSheetOnlySeasons.map((seasonValue) => (
                            <span key={seasonValue.season} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                              {seasonValue.season}: {formatHistoricalMoney(seasonValue.expectedValue)}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          No Sleeper sale result is available for these seasons.
                        </p>
                      </div>
                    )}

                    {selectedPlayerHistoricalPriceComparison.warnings.length > 0 && (
                      <div className="rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
                        {selectedPlayerHistoricalPriceComparison.warnings.slice(0, 3).map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                        {selectedPlayerHistoricalPriceComparison.warnings.length > 3 && (
                          <p>
                            +{selectedPlayerHistoricalPriceComparison.warnings.length - 3} more validation note{selectedPlayerHistoricalPriceComparison.warnings.length - 3 === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </SectionShell>

              <SectionShell
                title="Owner Tendencies"
                eyebrow="League Intel"
                icon={Users}
                className="xl:col-span-2"
              >
                {selectedOwnerTendencyProfile ? (
                  <div className="grid gap-3">
                    <select
                      value={selectedOwnerTendencyProfile.ownerId}
                      onChange={(event) =>
                        setOwnerTendencyOwnerIdOverride(event.target.value)
                      }
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-gray-700 outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-gray-200"
                    >
                      {ownerTendencyIntel.profiles.map((profile) => (
                        <option key={profile.ownerId} value={profile.ownerId}>
                          {profile.ownerName}
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black uppercase italic tracking-tight">
                          {selectedOwnerTendencyProfile.ownerName}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {selectedOwnerTendencyProfile.seasons.join(', ')} | {selectedOwnerTendencyProfile.seasonCount} season{selectedOwnerTendencyProfile.seasonCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest ${getOwnerTendencyConfidenceClass(selectedOwnerTendencyProfile.confidence)}`}>
                          {selectedOwnerTendencyProfile.confidence} confidence
                        </span>
                        <span className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[8px] font-black uppercase tracking-widest text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
                          {selectedOwnerTendencyProfile.rosterStyle.rosterStyleLabel}
                        </span>
                      </div>
                    </div>

                    {selectedOwnerTendencyProfile.seasonCount === 1 && (
                      <p className="rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
                        Limited history — tendencies should be treated cautiously.
                      </p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Open Spend
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedOwnerTendencyProfile.averageOpenMarketSpend)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Keeper Cost
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedOwnerTendencyProfile.averageKeeperSpend)}
                        </p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          {selectedOwnerTendencyProfile.keeperCount} keepers · {formatHistoricalMoney(selectedOwnerTendencyProfile.totalKeeperSpend)} total
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Total Spend
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedOwnerTendencyProfile.averageTotalSpend)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Left
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedOwnerTendencyProfile.averageMoneyLeft)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Top Buy
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalMoney(selectedOwnerTendencyProfile.averageTopPurchase)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Highest
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {selectedOwnerTendencyProfile.highestPurchase
                            ? `${selectedOwnerTendencyProfile.highestPurchase.playerName} ${formatHistoricalMoney(selectedOwnerTendencyProfile.highestPurchase.salePrice)}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${
                      selectedOwnerTendencyProfile.budgetReconciliationDifference !== null &&
                      Math.abs(selectedOwnerTendencyProfile.budgetReconciliationDifference) > 0.25
                        ? 'border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-300'
                        : 'border-black/10 bg-black/[0.03] text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400'
                    }`}>
                      Average budget: {formatHistoricalMoney(selectedOwnerTendencyProfile.averageOpenMarketSpend)} open + {formatHistoricalMoney(selectedOwnerTendencyProfile.averageKeeperSpend)} keepers + {formatHistoricalMoney(selectedOwnerTendencyProfile.averageMoneyLeft)} left = {formatHistoricalMoney(sumHistoricalMoneyValues([
                        selectedOwnerTendencyProfile.averageTotalSpend,
                        selectedOwnerTendencyProfile.averageMoneyLeft,
                      ]))}
                      {selectedOwnerTendencyProfile.budgetReconciliationDifference !== null &&
                        Math.abs(selectedOwnerTendencyProfile.budgetReconciliationDifference) > 0.25 && (
                          <span> · Difference {formatHistoricalDifference(selectedOwnerTendencyProfile.budgetReconciliationDifference)}</span>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                      <table className="w-full min-w-[560px] text-left">
                        <thead>
                          <tr className="border-b border-black/10 bg-black/[0.03] text-[8px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/[0.03]">
                            <th className="px-2 py-2">Pos</th>
                            <th className="px-2 py-2">$</th>
                            <th className="px-2 py-2">Share</th>
                            <th className="px-2 py-2">Avg</th>
                            <th className="px-2 py-2">Timing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/10">
                          {selectedOwnerTendencyProfile.positionSpending.map((positionSpend) => (
                            <tr key={positionSpend.position} className="text-xs">
                              <td className="px-2 py-2 font-black uppercase italic">
                                {positionSpend.position}
                              </td>
                              <td className="px-2 py-2 font-black">
                                {formatHistoricalMoney(positionSpend.totalDollarsSpent)}
                              </td>
                              <td className="px-2 py-2 font-bold">
                                {formatHistoricalRate(positionSpend.percentOfOpenMarketSpend)}
                              </td>
                              <td className="px-2 py-2 font-bold">
                                {formatHistoricalMoney(positionSpend.averagePurchasePrice)}
                              </td>
                              <td className="px-2 py-2 font-bold">
                                {formatOwnerTimingLabel(positionSpend.timingLabel)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          First Purchase
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {selectedOwnerTendencyProfile.purchaseTiming.mostCommonFirstPurchasePosition ?? 'N/A'} | {formatOwnerPurchaseOrder(selectedOwnerTendencyProfile.purchaseTiming.averageFirstPurchaseOrder)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          QB Timing
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatOwnerPurchaseOrder(selectedOwnerTendencyProfile.purchaseTiming.averageFirstByPosition.QB)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          TE Timing
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatOwnerPurchaseOrder(selectedOwnerTendencyProfile.purchaseTiming.averageFirstByPosition.TE)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Top-3 Spend
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalRate(selectedOwnerTendencyProfile.rosterStyle.averageTop3SpendShare)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        First Three Purchases
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedOwnerTendencyProfile.firstPurchases.slice(-3).map((seasonPattern) => (
                          <span key={seasonPattern.season} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-600 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
                            {seasonPattern.season}: {seasonPattern.firstThreePurchases.map((purchase) => purchase.position).join(', ') || 'N/A'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Tendencies
                        </p>
                        <div className="mt-2 grid gap-1.5">
                          {(selectedOwnerTendencyProfile.tendencies.length > 0
                            ? selectedOwnerTendencyProfile.tendencies
                            : ['No reliable tendency above threshold.']
                          ).slice(0, 5).map((tendency) => (
                            <p key={tendency} className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                              {tendency}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Recent Changes
                        </p>
                        <div className="mt-2 grid gap-1.5">
                          {selectedOwnerTendencyProfile.recentVsCareer.meaningfulShifts.slice(0, 3).map((shift) => (
                            <p key={shift} className="text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                              {shift}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {selectedOwnerTendencyProfile.nflTeamPreferences.length > 0 && (
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          NFL Team Patterns
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedOwnerTendencyProfile.nflTeamPreferences.map((preference) => (
                            <span key={preference.nflTeam} className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">
                              {preference.nflTeam}: {preference.purchaseCount} buys
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedOwnerTendencyProfile.cautions.length > 0 && (
                      <div className="rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
                        {selectedOwnerTendencyProfile.cautions.slice(0, 3).map((caution) => (
                          <p key={caution}>{caution}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                    No reliable Sleeper auction history is available for this owner.
                  </p>
                )}
              </SectionShell>

              <SectionShell
                title="Historical Inflation"
                eyebrow="League Intel"
                icon={BarChart3}
                className="xl:col-span-2"
              >
                <div className="grid gap-3">
                  <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
                    <table className="w-full min-w-[620px] text-left">
                      <thead>
                        <tr className="border-b border-black/10 bg-black/[0.03] text-[8px] font-black uppercase tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/[0.03]">
                          <th className="px-2 py-2">Position</th>
                          <th className="px-2 py-2">Historical</th>
                          <th className="px-2 py-2">Recent</th>
                          <th className="px-2 py-2">2026 Live</th>
                          <th className="px-2 py-2">Context</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/10">
                        {historicalInflationIntel.positions.map((positionSummary) => (
                          <tr key={positionSummary.position} className="text-xs">
                            <td className="px-2 py-2 font-black uppercase italic">
                              {positionSummary.position}
                            </td>
                            <td className="px-2 py-2 font-black">
                              {formatInflationPercent(positionSummary.averageInflationPercentage)}
                            </td>
                            <td className="px-2 py-2 font-bold">
                              {formatInflationPercent(positionSummary.recent2SeasonInflationPercentage)}
                            </td>
                            <td className="px-2 py-2 font-bold">
                              {formatInflationPercent(positionSummary.liveContext.currentLiveInflation)}
                            </td>
                            <td className="px-2 py-2">
                              <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${getHistoricalLiveContextClass(positionSummary.liveContext.context)}`}>
                                {formatHistoricalLiveContext(positionSummary.liveContext.context)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rosterGuidancePositionOrder.map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() =>
                          setHistoricalInflationPositionOverride(
                            position as HistoricalInflationPosition
                          )
                        }
                        className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest transition ${
                          selectedHistoricalInflationPosition === position
                            ? 'border-orange-600/30 bg-orange-600/10 text-orange-700 dark:text-orange-300'
                            : 'border-black/10 bg-black/[0.03] text-gray-500 hover:border-orange-600/25 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400'
                        }`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>

                  {selectedHistoricalInflationSummary ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Matched Purchases
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {selectedHistoricalInflationSummary.matchedPurchaseCount}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Overpay Rate
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalRate(selectedHistoricalInflationSummary.overpayRate)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Bargain Rate
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalRate(selectedHistoricalInflationSummary.bargainRate)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Avg Difference
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalDifference(selectedHistoricalInflationSummary.averageDollarDifference)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Trend
                        </p>
                        <p className="mt-1 text-sm font-black">
                          {formatHistoricalInflationTrend(selectedHistoricalInflationSummary.trend)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03] lg:col-span-3">
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Position Read
                        </p>
                        <p className="mt-1 text-xs font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                          {selectedHistoricalInflationSummary.matchedPurchaseCount < 3
                            ? 'Insufficient open-market history.'
                            : selectedHistoricalInflationSummary.verdict}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
                      Insufficient open-market history.
                    </p>
                  )}

                  <p className="rounded-xl border border-orange-600/20 bg-orange-600/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
                    Keeper purchases are excluded from open-market inflation averages.
                  </p>
                </div>
              </SectionShell>

              <SectionShell
                title="River City League DNA"
                eyebrow="Draft Trends"
                icon={History}
                className="xl:col-span-2"
              >
                <div className="grid gap-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Overall Inflation
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {formatInflationPercent(historicalInflationIntel.leagueSummary.overallWeightedInflation)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Coverage
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {historicalInflationIntel.leagueSummary.seasonsAvailable} seasons | {historicalInflationIntel.leagueSummary.totalOpenMarketPurchases} matched
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Most Inflated
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {historicalInflationIntel.leagueSummary.mostHistoricallyInflatedPosition ?? 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Most Discounted
                      </p>
                      <p className="mt-1 text-sm font-black">
                        {historicalInflationIntel.leagueSummary.mostHistoricallyDiscountedPosition ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    {historicalInflationIntel.draftTrends.map((fact) => (
                      <p
                        key={fact}
                        className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-xs font-bold leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300"
                      >
                        {fact}
                      </p>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-rose-600/20 bg-rose-600/10 px-3 py-2 text-rose-700 dark:text-rose-300">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-70">
                        Biggest Historical Overpay
                      </p>
                      {historicalInflationIntel.leagueSummary.biggestHistoricalOverpay ? (
                        <p className="mt-1 text-xs font-black">
                          {historicalInflationIntel.leagueSummary.biggestHistoricalOverpay.playerName} {historicalInflationIntel.leagueSummary.biggestHistoricalOverpay.season} | {formatHistoricalMoney(historicalInflationIntel.leagueSummary.biggestHistoricalOverpay.expectedValue)} to {formatHistoricalMoney(historicalInflationIntel.leagueSummary.biggestHistoricalOverpay.actualSalePrice)} ({formatHistoricalDifference(historicalInflationIntel.leagueSummary.biggestHistoricalOverpay.difference)})
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-black">N/A</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/10 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-70">
                        Biggest Historical Bargain
                      </p>
                      {historicalInflationIntel.leagueSummary.biggestHistoricalBargain ? (
                        <p className="mt-1 text-xs font-black">
                          {historicalInflationIntel.leagueSummary.biggestHistoricalBargain.playerName} {historicalInflationIntel.leagueSummary.biggestHistoricalBargain.season} | {formatHistoricalMoney(historicalInflationIntel.leagueSummary.biggestHistoricalBargain.expectedValue)} to {formatHistoricalMoney(historicalInflationIntel.leagueSummary.biggestHistoricalBargain.actualSalePrice)} ({formatHistoricalDifference(historicalInflationIntel.leagueSummary.biggestHistoricalBargain.difference)})
                        </p>
                      ) : (
                        <p className="mt-1 text-xs font-black">N/A</p>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Avg highest sale {formatHistoricalMoney(historicalInflationIntel.leagueSummary.averageHighestPurchasePerSeason)} | Avg top 3 {formatHistoricalMoney(historicalInflationIntel.leagueSummary.averageTop3PurchasesPerSeason)} | Avg drafted price {formatHistoricalMoney(historicalInflationIntel.leagueSummary.averageMoneySpentPerDraftedPlayer)}
                  </p>
                </div>
              </SectionShell>
            </div>
          )}
        </div>
      </main>
      <style>{`
        @keyframes draftRecommendationShift {
          from { opacity: 0.72; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes draftDrawerIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes coachSlideOverIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setIsDraftCoachOpen(true)}
        className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-2xl text-white shadow-2xl shadow-orange-600/30 transition hover:bg-orange-700"
        aria-label="Open AI Draft Coach"
      >
        🤖
      </button>

      {isDraftCoachOpen && (
        <div className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-sm">
          <aside
            className="absolute bottom-0 right-0 top-0 flex w-full max-w-xl flex-col bg-white p-4 shadow-2xl dark:bg-[#121212]"
            style={{ animation: 'coachSlideOverIn 240ms ease-out' }}
            aria-label="AI Draft Coach"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Hybrid Local Coach
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase italic tracking-tight">
                  AI Draft Coach
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsDraftCoachOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/[0.04] text-gray-500 transition hover:bg-orange-600/10 hover:text-orange-600 dark:bg-white/[0.06] dark:text-gray-300"
                aria-label="Close AI Draft Coach"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3 overflow-hidden">
              <div className="rounded-2xl bg-orange-600/10 p-3 text-orange-700 dark:text-orange-300">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-70">
                      Coach Summary
                    </p>
                    <p className="mt-1 truncate text-lg font-black uppercase italic">
                      {draftCoachPreview.headline}
                    </p>
                  </div>
                  <span className="rounded-full border border-current/25 px-2.5 py-1 text-[8px] font-black uppercase tracking-widest">
                    {draftCoachPreview.decision}
                  </span>
                </div>
                <p className="text-sm font-black leading-relaxed">
                  {draftCoachPreview.buddyMessage}
                </p>
                <p className="mt-2 text-xs font-bold leading-relaxed opacity-80">
                  {draftCoachPreview.riskGuidance}
                </p>
                {draftCoachBudgetTerminologyReasons.length > 0 && (
                  <div className="mt-3 grid gap-1 text-[10px] font-black uppercase tracking-widest opacity-80">
                    {draftCoachBudgetTerminologyReasons.slice(0, 3).map((reason) => (
                      <p key={reason}>{reason}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    Conversation
                  </p>
                  {draftCoachChatMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftCoachChatMessages([]);
                        setDraftCoachChatError(null);
                        setDraftCoachChatStatus('idle');
                      }}
                      className="inline-flex w-fit items-center gap-2 rounded-lg px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 transition hover:bg-orange-600/10 hover:text-orange-600 dark:text-gray-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </button>
                  )}
                </div>

                {(draftCoachChatStatus === 'loading' || draftCoachChatError) && (
                  <div className="mb-3 rounded-xl bg-white p-3 text-xs font-bold text-gray-600 dark:bg-black/20 dark:text-gray-300">
                    {draftCoachChatStatus === 'loading'
                      ? 'Asking protected local coach...'
                      : draftCoachChatError}
                  </div>
                )}

                <div className="max-h-[34vh] overflow-auto pr-1">
                  {draftCoachChatMessages.length > 0 ? (
                    <div className="space-y-2">
                      {draftCoachChatMessages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-xl bg-white p-3 text-sm dark:bg-black/20"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <p className="font-black uppercase italic">
                              {message.question}
                            </p>
                            <span className="rounded-full bg-orange-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">
                              {message.decision}
                            </span>
                          </div>
                          <p className="font-bold leading-relaxed text-gray-700 dark:text-gray-200">
                            {message.buddyMessage}
                          </p>
                          <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500 dark:text-gray-400">
                            {message.riskGuidance}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-white p-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:bg-black/20 dark:text-gray-400">
                      No coach questions yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-black/[0.025] p-3 dark:bg-white/[0.04]">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Suggested Questions
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {draftCoachStarterQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void askDraftCoach(question, question)}
                      disabled={draftCoachChatStatus === 'loading'}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:bg-orange-600/10 hover:text-orange-600 disabled:opacity-60 dark:bg-black/20 dark:text-gray-300"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void askDraftCoachFromInput();
                  }}
                >
                  <input
                    type="text"
                    value={draftCoachChatInput}
                    onChange={(event) => setDraftCoachChatInput(event.target.value)}
                    placeholder="Ask the coach"
                    disabled={draftCoachChatStatus === 'loading'}
                    className="min-h-10 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold text-black outline-none transition placeholder:text-gray-400 focus:border-orange-600 dark:border-white/10 dark:bg-black/30 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={draftCoachChatStatus === 'loading'}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-700 disabled:opacity-60"
                  >
                    {draftCoachChatStatus === 'loading' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    Ask
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
