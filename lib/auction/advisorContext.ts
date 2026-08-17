import "server-only";

import playerValues2025 from "@/data/auction/processed/player-values-2025.json";
import {
  buildAuctionAdvisorSummary,
  type AuctionAdvisorPlayerValue,
  type AuctionAdvisorPreference,
  type AuctionAdvisorPurchase,
  type AuctionAdvisorWarning,
} from "@/lib/auction/auctionAdvisor";
import { getByeWeekForNflTeam } from "@/lib/auction/byeWeeks";
import {
  getAuctionFallbackPreferenceTags,
} from "@/lib/auction/preferenceFallbacks";
import { getAuctionPreferenceFallbacksForProfile } from "@/lib/auction/preferenceFallbackData";
import {
  calculateAuctionInflationState,
  recommendRayJeffreyMaxBid,
  type BidRecommendationNeedLevel,
  type BidRecommendationPurchaseSample,
  type BidRecommendationResult,
} from "@/lib/auction/bidRecommendations";
import {
  calculateBenchDepthNeeds,
  calculateByeWeekConcentrationWarnings,
  calculateMaxBidPressureWarnings,
  calculateOverspendingWarnings,
  calculatePositionCounts,
  calculateStarterNeeds,
  type RosterGuidancePlayer,
  type RosterGuidancePlayerValue,
  type RosterGuidanceWarning,
} from "@/lib/auction/rosterGuidance";
import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";
import { getCanonicalAuctionTeamByRosterId } from "@/lib/auction/canonicalTeamCatalog";
import { readAuthorizedWarRoomPurchaseSnapshots } from "@/lib/auction/warRoomPurchaseView";
import { readWarRoomLiveAuctionState } from "@/lib/auction/warRoomLiveStateFirestore";
import type { WarRoomLiveAuctionState } from "@/lib/auction/warRoomLiveState";
import { deriveWarRoomBudgetState } from "@/lib/auction/warRoomLiveState";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import type { AuctionTeamId } from "@/lib/auction/types";

type ProcessedPlayerValueStatus = {
  taken?: string | null;
  raw?: Record<string, string | number | null>;
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

type AdvisorContextPurchaseSource = "live" | "unavailable";

type AdvisorContextPurchaseRow = {
  id: string;
  teamId: AuctionTeamId;
  rosterId: number | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  purchasePrice: number;
  projectedValue: number | null;
  status: "active" | "voided";
  source: "live";
};

export type BuildAuctionAdvisorContextInput = {
  access: AuctionAccessResult;
  ownerProfileId?: string | null;
  selectedPlayerName?: string | null;
  selectedSleeperPlayerId?: string | null;
  topValueTargetLimit?: number | null;
  warningLimit?: number | null;
};

export type AuctionAdvisorContextBudgetSummary = {
  teamId: AuctionTeamId;
  teamName: string;
  managerName: string;
  teamBudget: number;
  keeperCost: number;
  purchaseSpend: number;
  totalSpent: number;
  remainingBudget: number;
  rosterSpotsRemaining: number;
  maxBid: number;
  averageDollarsPerOpenSlot: number;
  rosteredPlayerCount: number;
};

export type AuctionAdvisorContextRosterNeed = {
  label: string;
  current: number;
  target: number;
  needed: number;
  detail: string;
  severity: "ok" | "watch" | "danger";
};

export type AuctionAdvisorContextValueTarget = {
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  averageValue: number | null;
  highValue: number | null;
  recommendedMaxBid: number | null;
  preference: AuctionAdvisorPreference;
  reason: string;
};

export type AuctionAdvisorContextSelectedPlayer = {
  playerName: string;
  matchedSleeperName: string | null;
  sleeperPlayerId: string | null;
  position: string | null;
  nflTeam: string | null;
  byeWeek: number | null;
  lowValue: number | null;
  highValue: number | null;
  averageValue: number | null;
  status: string;
  preference: AuctionAdvisorPreference;
  recommendation: BidRecommendationResult;
};

export type AuctionAdvisorContext = {
  generatedAt: string;
  playerValuesSeason: number;
  playerValuesGeneratedAt: string;
  activePurchaseSource: {
    requested: AdvisorContextPurchaseSource;
    applied: AdvisorContextPurchaseSource;
    note: string;
  };
  dataAvailability: {
    purchaseContextAvailable: boolean;
    budgetContextAvailable: boolean;
    rosterContextAvailable: boolean;
    keeperContextAvailable: boolean;
    message: string | null;
  };
  rayJeffreyBudget: AuctionAdvisorContextBudgetSummary | null;
  rosterNeeds: {
    starter: AuctionAdvisorContextRosterNeed[];
    benchDepth: AuctionAdvisorContextRosterNeed[];
  };
  topValueTargets: AuctionAdvisorContextValueTarget[];
  currentWarnings: AuctionAdvisorWarning[];
  selectedPlayer: AuctionAdvisorContextSelectedPlayer | null;
  dataLimits: {
    topValueTargetLimit: number;
    warningLimit: number;
    fullPlayerPoolIncluded: false;
    fullPreferenceListsIncluded: false;
  };
};

const localPlayerValues2025 = playerValues2025 as ProcessedPlayerValuesFile;
const localPlayerPoolRows = localPlayerValues2025.rows;
const DEFAULT_VALUE_TARGET_LIMIT = 5;
const DEFAULT_WARNING_LIMIT = 5;
const MAX_VALUE_TARGET_LIMIT = 10;
const MAX_WARNING_LIMIT = 10;

function normalizeFilterValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePlayerMatchValue(value: string | null | undefined) {
  return normalizeFilterValue(value)
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, " ");
}

function normalizePositionValue(value: string | null | undefined) {
  return normalizeFilterValue(value).toUpperCase();
}

function getSafeLimit(
  value: number | null | undefined,
  fallback: number,
  maximum: number
) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), maximum)
    : fallback;
}

function formatPlayerPoolStatus(status?: ProcessedPlayerValueStatus | null) {
  if (status?.taken) return status.taken;

  const firstRawStatus = Object.entries(status?.raw ?? {}).find(
    ([, value]) => value !== null && value !== undefined && String(value).trim() !== ""
  );

  return firstRawStatus ? String(firstRawStatus[1]) : "None";
}

function isAvailableStatus(status: string) {
  const normalizedStatus = normalizeFilterValue(status);
  return (
    normalizedStatus === "none" ||
    normalizedStatus === "no" ||
    normalizedStatus === "available"
  );
}

function getSortableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
}

function getPreferenceTags(
  player: ProcessedPlayerValueRow,
  ownerProfileId: string | null | undefined
) {
  return getAuctionFallbackPreferenceTags({
    fallbacks: getAuctionPreferenceFallbacksForProfile(ownerProfileId),
    playerNames: [player.originalPlayerName, player.matchedSleeperName],
  });
}

function getPreference(
  player: ProcessedPlayerValueRow,
  ownerProfileId: string | null | undefined
): AuctionAdvisorPreference {
  const tags = getPreferenceTags(player, ownerProfileId);

  if (tags.includes("fade")) return "fade";
  if (tags.includes("target")) return "target";
  if (tags.includes("watch")) return "watch";

  return "none";
}

function buildLivePurchaseRows(
  purchases: Awaited<ReturnType<typeof readAuthorizedWarRoomPurchaseSnapshots>>
): AdvisorContextPurchaseRow[] {
  return purchases.map((purchase) => ({
    id: purchase.purchaseId,
    teamId: (purchase.buyerTeamId ?? "") as AuctionTeamId,
    rosterId: purchase.buyerRosterId,
    playerId: purchase.sleeperPlayerId,
    playerName: purchase.playerName,
    position: purchase.position,
    nflTeam: purchase.nflTeam,
    purchasePrice: purchase.salePrice,
    projectedValue: purchase.marketValueAtPurchase,
    status: purchase.status === "active" ? "active" : "voided",
    source: "live",
  }));
}

function getPurchaseMatch(
  player: ProcessedPlayerValueRow,
  purchases: readonly AdvisorContextPurchaseRow[]
) {
  const activePurchases = purchases.filter(
    (purchase) => purchase.status === "active"
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

function getDisplayStatus(
  player: ProcessedPlayerValueRow,
  purchases: readonly AdvisorContextPurchaseRow[]
) {
  const purchaseMatch = getPurchaseMatch(player, purchases);
  if (purchaseMatch) return "Live Purchase Recorded";

  return formatPlayerPoolStatus(player.status);
}

function findPlayerValueRowForPurchase(purchase: AdvisorContextPurchaseRow) {
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
  purchases: readonly AdvisorContextPurchaseRow[]
): BidRecommendationPurchaseSample[] {
  return purchases
    .filter((purchase) => purchase.status === "active")
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

function buildBudgetSummary(
  state: WarRoomLiveAuctionState,
  purchases: readonly AdvisorContextPurchaseRow[],
  team: ReturnType<typeof getCanonicalAuctionTeamByRosterId>
): AuctionAdvisorContextBudgetSummary | null {
  if (!team) return null;
  const derived = deriveWarRoomBudgetState({
    teamBudget: riverCityAuctionLeagueSettings.auctionBudgetPerTeam,
    rosterSlots: team.rosterSlots.total,
    keepers: state.keepers,
    purchases: purchases.map((purchase) => ({
      purchaseId: purchase.id,
      playerId: purchase.playerId,
      playerName: purchase.playerName,
      salePrice: purchase.purchasePrice,
      status: purchase.status === "active" ? "active" : "undone",
    })),
  });
  const filledSlots = state.keepers.length + purchases.filter(
    (purchase) => purchase.status === "active"
  ).length;

  return {
    teamId: team.id,
    teamName: team.teamName,
    managerName: team.ownerLabel,
    teamBudget: derived.teamBudget,
    keeperCost: derived.keeperCostTotal,
    purchaseSpend: derived.spentBudget,
    totalSpent: derived.totalSpent,
    remainingBudget: derived.remainingBudget,
    rosterSpotsRemaining: derived.rosterSpotsRemaining,
    maxBid: derived.maxBid,
    averageDollarsPerOpenSlot: derived.averageDollarsPerOpenSlot,
    rosteredPlayerCount: filledSlots,
  };
}

function buildGuidanceRosterPlayers(
  state: WarRoomLiveAuctionState,
  purchases: readonly AdvisorContextPurchaseRow[],
  team: ReturnType<typeof getCanonicalAuctionTeamByRosterId>
): RosterGuidancePlayer[] {
  if (!team) return [];

  return [
    ...state.keepers
      .filter((player) => player.playerId)
      .map((player) => {
        const value = localPlayerPoolRows.find(
          (candidate) =>
            normalizeFilterValue(candidate.sleeperPlayerId) ===
              normalizeFilterValue(player.playerId) ||
            normalizePlayerMatchValue(candidate.originalPlayerName) ===
              normalizePlayerMatchValue(player.playerName)
        );

        return {
          id: player.playerId,
          playerName: player.playerName,
          position: value?.position ?? null,
          nflTeam: value?.nflTeam ?? null,
          cost: player.keeperCost,
          projectedValue: value?.averageValue ?? null,
          byeWeek: getByeWeekForNflTeam(value?.nflTeam),
          source: "Keeper" as const,
        };
      }),
    ...purchases
      .filter((player) => player.teamId === team.id && player.status === "active")
      .map((player) => ({
        id: player.id,
        playerName: player.playerName,
        position: player.position,
        nflTeam: player.nflTeam,
        cost: player.purchasePrice,
        projectedValue: player.projectedValue,
        byeWeek: getByeWeekForNflTeam(player.nflTeam),
        source: "Purchase" as const,
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

function buildAuctionAdvisorPlayerValues(
  purchases: readonly AdvisorContextPurchaseRow[],
  rosterPlayers: readonly RosterGuidancePlayer[],
  ownerProfileId: string | null | undefined
): AuctionAdvisorPlayerValue[] {
  return localPlayerPoolRows.map((player) => {
    const status = getDisplayStatus(player, purchases);
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
      preference: getPreference(player, ownerProfileId),
      byeWeek,
      sameByeWeekRosterCount:
        byeWeek === null
          ? 0
          : rosterPlayers.filter((rosterPlayer) => rosterPlayer.byeWeek === byeWeek)
              .length,
      isTaken: !isAvailableStatus(status),
    };
  });
}

function buildAuctionAdvisorPurchases(
  purchases: readonly AdvisorContextPurchaseRow[]
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

function getNeedLevel(
  player: ProcessedPlayerValueRow,
  starterNeeds: ReturnType<typeof calculateStarterNeeds>,
  benchDepthNeeds: ReturnType<typeof calculateBenchDepthNeeds>
): BidRecommendationNeedLevel {
  const playerPosition = normalizePositionValue(player.position);
  const starterNeed = starterNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );
  const flexNeed = starterNeeds.find(
    (need) => normalizePositionValue(need.label) === "FLEX"
  );
  const benchNeed = benchDepthNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );

  if (starterNeed && starterNeed.needed > 1) return "must-fill";
  if (starterNeed && starterNeed.needed > 0) return "need";
  if (
    flexNeed &&
    flexNeed.needed > 0 &&
    ["RB", "WR", "TE"].includes(playerPosition)
  ) {
    return "need";
  }
  if (benchNeed && benchNeed.needed > 0) return "depth";
  if (benchNeed && benchNeed.current >= benchNeed.target) return "surplus";

  return "neutral";
}

function buildSelectedPlayerContext(
  input: BuildAuctionAdvisorContextInput,
  purchases: readonly AdvisorContextPurchaseRow[],
  budgetSummary: AuctionAdvisorContextBudgetSummary | null,
  starterNeeds: ReturnType<typeof calculateStarterNeeds>,
  benchDepthNeeds: ReturnType<typeof calculateBenchDepthNeeds>,
  positionCounts: Record<string, number>,
  rosterPlayers: readonly RosterGuidancePlayer[],
  market: { inflation: ReturnType<typeof calculateAuctionInflationState> }
): AuctionAdvisorContextSelectedPlayer | null {
  const selectedPlayer = findSelectedPlayer(input);
  if (!selectedPlayer) return null;

  const status = getDisplayStatus(selectedPlayer, purchases);
  const byeWeek = getByeWeekForNflTeam(selectedPlayer.nflTeam);
  const playerPosition = normalizePositionValue(selectedPlayer.position);
  const benchNeed = benchDepthNeeds.find(
    (need) => normalizePositionValue(need.label) === playerPosition
  );
  const recommendation = recommendRayJeffreyMaxBid({
    player: {
      playerName: selectedPlayer.originalPlayerName,
      position: selectedPlayer.position,
      nflTeam: selectedPlayer.nflTeam,
      lowValue: selectedPlayer.lowValue,
      highValue: selectedPlayer.highValue,
      averageValue: selectedPlayer.averageValue,
    },
    teamBudget: {
      remainingBudget: budgetSummary?.remainingBudget ?? null,
      rosterSpotsRemaining: budgetSummary?.rosterSpotsRemaining ?? null,
      maxBid: budgetSummary?.maxBid ?? null,
      averageDollarsPerOpenSlot:
        budgetSummary?.averageDollarsPerOpenSlot ?? null,
    },
    rosterGuidance: {
      needLevel: getNeedLevel(selectedPlayer, starterNeeds, benchDepthNeeds),
      benchNeed: benchNeed?.needed ?? null,
      positionCount: positionCounts[playerPosition] ?? 0,
      targetPositionCount: benchNeed?.target ?? null,
    },
    preference: getPreference(selectedPlayer, input.ownerProfileId),
    byeWeekRisk: {
      byeWeek,
      sameByeWeekRosterCount:
        byeWeek === null
          ? 0
          : rosterPlayers.filter((player) => player.byeWeek === byeWeek).length,
    },
    market,
  });

  return {
    playerName: selectedPlayer.originalPlayerName,
    matchedSleeperName: selectedPlayer.matchedSleeperName ?? null,
    sleeperPlayerId: selectedPlayer.sleeperPlayerId ?? null,
    position: selectedPlayer.position ?? null,
    nflTeam: selectedPlayer.nflTeam ?? null,
    byeWeek,
    lowValue: selectedPlayer.lowValue ?? null,
    highValue: selectedPlayer.highValue ?? null,
    averageValue: selectedPlayer.averageValue ?? null,
    status,
    preference: getPreference(selectedPlayer, input.ownerProfileId),
    recommendation,
  };
}

function findSelectedPlayer(input: BuildAuctionAdvisorContextInput) {
  const sleeperPlayerId = normalizeFilterValue(input.selectedSleeperPlayerId);

  if (sleeperPlayerId) {
    const idMatch = localPlayerPoolRows.find(
      (player) => normalizeFilterValue(player.sleeperPlayerId) === sleeperPlayerId
    );
    if (idMatch) return idMatch;
  }

  const selectedName = normalizePlayerMatchValue(input.selectedPlayerName);
  if (!selectedName) return null;

  return (
    localPlayerPoolRows
      .map((player) => ({
        player,
        score: getPlayerMatchScore(player, selectedName),
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
      })[0]?.player ?? null
  );
}

function getPlayerMatchScore(player: ProcessedPlayerValueRow, selectedName: string) {
  const names = [
    player.originalPlayerName,
    player.matchedSleeperName,
    player.matchedSearchName,
    player.appliedAlias,
  ]
    .map(normalizePlayerMatchValue)
    .filter(Boolean);
  const selectedTokens = selectedName.split(" ").filter(Boolean);

  return names.reduce((bestScore, name) => {
    const nameTokens = name.split(" ").filter(Boolean);

    if (name === selectedName) return Math.max(bestScore, 100);
    if (name.startsWith(selectedName)) return Math.max(bestScore, 85);
    if (name.includes(selectedName)) return Math.max(bestScore, 70);
    if (selectedTokens.every((token) => nameTokens.includes(token))) {
      return Math.max(bestScore, 60);
    }
    if (selectedTokens.every((token) => name.includes(token))) {
      return Math.max(bestScore, 45);
    }

    return bestScore;
  }, 0);
}

function mapRosterNeed(
  need: ReturnType<typeof calculateStarterNeeds>[number]
): AuctionAdvisorContextRosterNeed {
  return {
    label: need.label,
    current: need.current,
    target: need.target,
    needed: need.needed,
    detail: need.detail,
    severity: need.severity,
  };
}

function mapGuidanceWarning(warning: RosterGuidanceWarning): AuctionAdvisorWarning {
  const normalizedText = `${warning.title} ${warning.message}`.toLowerCase();
  const area = normalizedText.includes("bye")
    ? "bye week"
    : normalizedText.includes("budget") ||
        normalizedText.includes("bid") ||
        normalizedText.includes("slot")
      ? "budget"
      : normalizedText.includes("over") ||
          normalizedText.includes("cost") ||
          normalizedText.includes("value")
        ? "overpay"
        : "roster";

  return {
    area,
    severity: warning.severity,
    message: warning.message,
  };
}

export async function buildAuctionAdvisorContext(
  input: BuildAuctionAdvisorContextInput
): Promise<AuctionAdvisorContext> {
  const { access } = input;
  const team = getCanonicalAuctionTeamByRosterId(access.sleeperRosterId);
  const [liveState, livePurchases] = await Promise.all([
    access.warRoomId
      ? readWarRoomLiveAuctionState(access.warRoomId).catch(() => null)
      : Promise.resolve(null),
    access.warRoomId && access.sleeperRosterId
      ? readAuthorizedWarRoomPurchaseSnapshots({ access }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const purchaseContextAvailable = livePurchases !== null;
  const keeperContextAvailable = liveState !== null;
  const rosterContextAvailable = keeperContextAvailable && purchaseContextAvailable;
  const budgetContextAvailable = Boolean(
    team && rosterContextAvailable
  );
  const purchases = livePurchases ? buildLivePurchaseRows(livePurchases) : [];
  const state = liveState;
  const appliedPurchaseSource: AdvisorContextPurchaseSource = purchaseContextAvailable
    ? "live"
    : "unavailable";
  const topValueTargetLimit = getSafeLimit(
    input.topValueTargetLimit,
    DEFAULT_VALUE_TARGET_LIMIT,
    MAX_VALUE_TARGET_LIMIT
  );
  const warningLimit = getSafeLimit(
    input.warningLimit,
    DEFAULT_WARNING_LIMIT,
    MAX_WARNING_LIMIT
  );
  const budgetSummary =
    state && budgetContextAvailable
      ? buildBudgetSummary(state, purchases, team)
      : null;
  const rosterPlayers =
    state && rosterContextAvailable
      ? buildGuidanceRosterPlayers(state, purchases, team)
      : [];
  const positionCounts = calculatePositionCounts(rosterPlayers);
  const starterNeeds = calculateStarterNeeds(positionCounts);
  const benchDepthNeeds = calculateBenchDepthNeeds(positionCounts);
  const guidanceWarnings = [
    ...calculateOverspendingWarnings(rosterPlayers, guidancePlayerValues),
    ...calculateByeWeekConcentrationWarnings(rosterPlayers),
    ...calculateMaxBidPressureWarnings({
      remainingBudget: budgetSummary?.remainingBudget ?? null,
      rosterSpotsRemaining: budgetSummary?.rosterSpotsRemaining ?? null,
      maxBid: budgetSummary?.maxBid ?? null,
      averageDollarsPerOpenSlot:
        budgetSummary?.averageDollarsPerOpenSlot ?? null,
    }),
  ];
  const bidRecommendationPurchaseSamples =
    buildBidRecommendationPurchaseSamples(purchases);
  const market = {
    inflation: calculateAuctionInflationState(bidRecommendationPurchaseSamples),
  };
  const preferenceFallbacks = getAuctionPreferenceFallbacksForProfile(
    input.ownerProfileId
  );
  const advisorSummary = buildAuctionAdvisorSummary({
    playerValues: buildAuctionAdvisorPlayerValues(
      purchases,
      rosterPlayers,
      input.ownerProfileId
    ),
    activePurchaseSource:
      appliedPurchaseSource === "unavailable" ? "unknown" : appliedPurchaseSource,
    teamBudget: budgetSummary
      ? {
          teamName: budgetSummary.teamName,
          teamBudget: budgetSummary.teamBudget,
          keeperCost: budgetSummary.keeperCost,
          totalSpent: budgetSummary.totalSpent,
          remainingBudget: budgetSummary.remainingBudget,
          rosterSpotsRemaining: budgetSummary.rosterSpotsRemaining,
          maxBid: budgetSummary.maxBid,
          averageDollarsPerOpenSlot:
            budgetSummary.averageDollarsPerOpenSlot,
        }
      : null,
    rosterGuidance: {
      starterNeeds,
      benchDepthNeeds,
      warnings: guidanceWarnings,
      positionCounts,
    },
    preferences: preferenceFallbacks,
    byeWeekRisks: {
      maxSameByeWeekRosterCount: Math.max(
        0,
        ...rosterPlayers
          .map((player) => player.byeWeek)
          .filter((byeWeek): byeWeek is number => byeWeek !== null)
          .map(
            (byeWeek) =>
              rosterPlayers.filter((player) => player.byeWeek === byeWeek)
                .length
          )
      ),
      warnings: guidanceWarnings.map((warning) => warning.message),
    },
    activePurchases: buildAuctionAdvisorPurchases(purchases),
    sleeperSnapshotPurchases: [],
  });

  return {
    generatedAt: new Date().toISOString(),
    playerValuesSeason: localPlayerValues2025.season,
    playerValuesGeneratedAt: localPlayerValues2025.generatedAt,
    activePurchaseSource: {
      requested: appliedPurchaseSource,
      applied: appliedPurchaseSource,
      note: purchaseContextAvailable
        ? "Live purchase decisions and War Room state are applied."
        : "Live purchase context is currently unavailable; no demo values were substituted.",
    },
    dataAvailability: {
      purchaseContextAvailable,
      budgetContextAvailable,
      rosterContextAvailable,
      keeperContextAvailable,
      message:
        purchaseContextAvailable && budgetContextAvailable && rosterContextAvailable
          ? null
          : "Live War Room context is currently unavailable or incomplete.",
    },
    rayJeffreyBudget: budgetSummary,
    rosterNeeds: {
      starter: starterNeeds
        .filter((need) => need.needed > 0)
        .map(mapRosterNeed),
      benchDepth: benchDepthNeeds
        .filter((need) => need.needed > 0)
        .map(mapRosterNeed),
    },
    topValueTargets: advisorSummary.bestValueOpportunities
      .slice(0, topValueTargetLimit)
      .map((target) => ({ ...target })),
    currentWarnings: [
      ...advisorSummary.avoidOverpayWarnings,
      ...guidanceWarnings.map(mapGuidanceWarning),
    ].slice(0, warningLimit),
    selectedPlayer: buildSelectedPlayerContext(
      input,
      purchases,
      budgetSummary,
      starterNeeds,
      benchDepthNeeds,
      positionCounts,
      rosterPlayers,
      market
    ),
    dataLimits: {
      topValueTargetLimit,
      warningLimit,
      fullPlayerPoolIncluded: false,
      fullPreferenceListsIncluded: false,
    },
  };
}
