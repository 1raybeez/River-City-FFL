import "server-only";

import playerValues2025 from "@/data/auction/processed/player-values-2025.json";
import {
  buildAuctionAdvisorSummary,
  type AuctionAdvisorPlayerValue,
  type AuctionAdvisorPreference,
  type AuctionAdvisorPurchase,
  type AuctionAdvisorWarning,
} from "@/lib/auction/auctionAdvisor";
import {
  calculateAverageDollarsPerOpenRosterSpot,
  calculateKeeperCostByTeam,
  calculateMaxBid,
  calculatePurchaseSpendByTeam,
  calculateRemainingBudget,
  calculateRosterSpotsRemaining,
  calculateTotalSpent,
} from "@/lib/auction/calculations";
import { getByeWeekForNflTeam } from "@/lib/auction/byeWeeks";
import {
  fadePlayerNames,
  targetPlayerNames,
  watchlistPlayerNames,
} from "@/lib/auction/draftPreferences";
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
import {
  mockAuctionKeepers,
  mockAuctionPurchases,
  mockAuctionTeams,
} from "@/lib/auction/mockAuctionData";
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

type AdvisorContextPurchaseSource = "demo" | "sleeper";

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
  source: AdvisorContextPurchaseSource;
};

export type BuildAuctionAdvisorContextInput = {
  selectedPlayerName?: string | null;
  selectedSleeperPlayerId?: string | null;
  activePurchaseSource?: AdvisorContextPurchaseSource | null;
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

const targetPlayerNameSet = new Set(targetPlayerNames.map(normalizeFilterValue));
const fadePlayerNameSet = new Set(fadePlayerNames.map(normalizeFilterValue));
const watchlistPlayerNameSet = new Set(
  watchlistPlayerNames.map(normalizeFilterValue)
);

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

function getPreferenceTags(player: ProcessedPlayerValueRow) {
  const playerNames = [
    normalizeFilterValue(player.originalPlayerName),
    normalizeFilterValue(player.matchedSleeperName),
  ].filter(Boolean);
  const tags: Array<Exclude<AuctionAdvisorPreference, "none">> = [];

  if (playerNames.some((name) => targetPlayerNameSet.has(name))) {
    tags.push("target");
  }

  if (playerNames.some((name) => fadePlayerNameSet.has(name))) {
    tags.push("fade");
  }

  if (playerNames.some((name) => watchlistPlayerNameSet.has(name))) {
    tags.push("watch");
  }

  return tags;
}

function getPreference(player: ProcessedPlayerValueRow): AuctionAdvisorPreference {
  const tags = getPreferenceTags(player);

  if (tags.includes("fade")) return "fade";
  if (tags.includes("target")) return "target";
  if (tags.includes("watch")) return "watch";

  return "none";
}

function getTeamByRosterId(rosterId: number | null | undefined) {
  if (rosterId === null || rosterId === undefined) return null;
  return mockAuctionTeams.find((team) => team.rosterId === rosterId) ?? null;
}

function getGuidanceTeam() {
  return (
    mockAuctionTeams.find((team) => team.rosterId === 1) ??
    mockAuctionTeams[0] ??
    null
  );
}

function buildMockPurchaseRows(): AdvisorContextPurchaseRow[] {
  return mockAuctionPurchases.flatMap((purchase) => {
    const team = getTeamByRosterId(purchase.rosterId);
    if (!team) return [];

    return [
      {
        id: purchase.id,
        teamId: purchase.teamId,
        rosterId: purchase.rosterId,
        playerId: purchase.playerId,
        playerName: purchase.playerName,
        position: purchase.position,
        nflTeam: purchase.nflTeam,
        purchasePrice: purchase.purchasePrice,
        projectedValue: purchase.projectedValue,
        status: purchase.status,
        source: "demo",
      },
    ];
  });
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
  if (purchaseMatch) return "Local Demo Taken";

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
  purchases: readonly AdvisorContextPurchaseRow[]
): AuctionAdvisorContextBudgetSummary | null {
  const team = getGuidanceTeam();
  if (!team) return null;

  const keeperCostByTeam = calculateKeeperCostByTeam(mockAuctionKeepers);
  const purchaseSpendByTeam = calculatePurchaseSpendByTeam(purchases);
  const purchaseCount = purchases.filter(
    (purchase) => purchase.teamId === team.id && purchase.status === "active"
  ).length;
  const keeperCost = keeperCostByTeam[team.id] ?? 0;
  const purchaseSpend = purchaseSpendByTeam[team.id] ?? 0;
  const teamBudget = riverCityAuctionLeagueSettings.auctionBudgetPerTeam;
  const filledSlots = Math.min(
    team.rosterSlots.total,
    team.keeperIds.length + purchaseCount
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

  return {
    teamId: team.id,
    teamName: team.teamName,
    managerName: team.managerName,
    teamBudget,
    keeperCost,
    purchaseSpend,
    totalSpent,
    remainingBudget,
    rosterSpotsRemaining,
    maxBid,
    averageDollarsPerOpenSlot: calculateAverageDollarsPerOpenRosterSpot(
      remainingBudget,
      rosterSpotsRemaining
    ),
    rosteredPlayerCount: filledSlots,
  };
}

function buildGuidanceRosterPlayers(
  purchases: readonly AdvisorContextPurchaseRow[]
): RosterGuidancePlayer[] {
  const team = getGuidanceTeam();
  if (!team) return [];

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
        source: "Keeper" as const,
      })),
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
  rosterPlayers: readonly RosterGuidancePlayer[]
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
      preference: getPreference(player),
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
    preference: getPreference(selectedPlayer),
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
    preference: getPreference(selectedPlayer),
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

export function buildAuctionAdvisorContext(
  input: BuildAuctionAdvisorContextInput = {}
): AuctionAdvisorContext {
  const requestedPurchaseSource = input.activePurchaseSource ?? "demo";
  const appliedPurchaseSource: AdvisorContextPurchaseSource = "demo";
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
  const purchases = buildMockPurchaseRows();
  const budgetSummary = buildBudgetSummary(purchases);
  const rosterPlayers = buildGuidanceRosterPlayers(purchases);
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
  const advisorSummary = buildAuctionAdvisorSummary({
    playerValues: buildAuctionAdvisorPlayerValues(purchases, rosterPlayers),
    activePurchaseSource: appliedPurchaseSource,
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
    preferences: {
      targetPlayerNames,
      fadePlayerNames,
      watchlistPlayerNames,
    },
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
      requested: requestedPurchaseSource,
      applied: appliedPurchaseSource,
      note:
        requestedPurchaseSource === "sleeper"
          ? "Sleeper Snapshot purchases are not wired into the server context builder yet; Local Demo Data is applied."
          : "Local Demo Data is applied until Manual Entry or a server-owned Sleeper Snapshot source is wired in.",
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
