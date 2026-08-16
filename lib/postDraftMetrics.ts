import type { AuctionOwnerPlayerPreference } from "@/lib/auction/ownerPreferenceTypes";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import type { CanonicalPowerRankings } from "@/lib/powerRankings";

export const POST_DRAFT_METRICS_SCHEMA_VERSION = "post-draft-metrics-v1";
export const POST_DRAFT_METRICS_SEASON = 2026;

type DraftStatus = "complete" | string;

export type PostDraftRosterInput = {
  rosterId: number;
  ownerUserId: string | null;
  teamName: string | null;
  playerIds: readonly string[];
  starterIds?: readonly string[];
};

export type PostDraftPlayerInput = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  publishedValue: number | null;
  adp: number | null;
};

export type PostDraftAcquisitionInput = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number;
  purchasePrice: number | null;
  isKeeper: boolean;
  pickNumber: number | null;
  keeperCost: number | null;
};

export type PostDraftStrategyInput = {
  warRoomId: string;
  franchiseId: string;
  preferences: readonly AuctionOwnerPlayerPreference[];
  settingsAvailable?: boolean;
};

export type PostDraftRosterRequirements = {
  rosterPositions: readonly string[];
  requiredStarterSlots: Record<string, number>;
  flexSlots: number;
  flexEligiblePositions: readonly string[];
  rosterSlotCapacity: number;
  source: "Sleeper league.roster_positions";
};

export type PostDraftMetricsInput = {
  season: number;
  draftId: string | null;
  draftStatus: DraftStatus;
  draftPickCount: number;
  rosters: readonly PostDraftRosterInput[];
  acquisitions: readonly PostDraftAcquisitionInput[];
  players: ReadonlyMap<string, PostDraftPlayerInput>;
  powerRankings: CanonicalPowerRankings;
  rosterRequirements: PostDraftRosterRequirements | null;
  generatedAt?: string;
};

export type PostDraftCoverage = {
  status: "complete" | "partial";
  warnings: string[];
  rosterValueCount: number;
  valueDifferentialCount: number;
  adpCount: number;
  positionCount: number;
};

export type PostDraftPositionMetric = {
  totalSpend: number;
  playerCount: number;
  shareOfTotalSpend: number;
};

export type PostDraftPlayerMetric = {
  playerId: string;
  playerName: string;
  position: string | null;
  purchasePrice: number;
  publishedValue: number;
  valueDifferential: number;
  adp: number | null;
};

export type PostDraftPublicMetrics = {
  totalSpend: number;
  remainingBudget: number;
  positionSpend: Record<string, PostDraftPositionMetric>;
  positionCounts: Record<string, number>;
  rosterSize: number;
  starterCount: number;
  benchDepthCount: number;
  rosterValue: number | null;
  valueDifferential: {
    total: number | null;
    average: number | null;
    comparablePlayerCount: number;
  };
  bestBuy: PostDraftPlayerMetric | null;
  biggestReach: PostDraftPlayerMetric | null;
  keeperCount: number;
  totalKeeperCost: number;
  keeperPublishedValue: number | null;
  keeperValueDifferential: number | null;
  nonKeeperAuctionSpend: number;
  adpContext: {
    acquiredPlayerCount: number;
    playersWithAdp: number;
    averageAcquisitionAdp: number | null;
  };
  powerRanking: {
    rank: number | null;
    rosterValue: number | null;
    averageSOS: number | null;
    rawScore: number | null;
    normalizedIndex: number | null;
    coverage: "complete" | "partial" | null;
    status: "Preseason Outlook" | null;
  };
  requiredStarterSlots: Record<string, number>;
  coveredStarterSlots: number;
  uncoveredStarterSlots: number;
  starterCoverageByPosition: Record<string, { required: number; covered: number; uncovered: number }>;
  depthByPosition: Record<string, number>;
  totalDepth: number;
  depthCoverageStatus: "complete" | "partial" | "unavailable";
  rosterSlotCapacity: number | null;
  rosterCompleteness: {
    filledSlots: number;
    capacity: number | null;
    ratio: number | null;
    status: "complete" | "partial" | "unavailable";
  };
};

export type PostDraftPublicRecord = {
  season: number;
  franchiseId: string;
  rosterId: number;
  teamName: string;
  generatedAt: string;
  source: {
    draftId: string | null;
    draftStatus: DraftStatus;
    metricsSchemaVersion: typeof POST_DRAFT_METRICS_SCHEMA_VERSION;
  };
  metrics: PostDraftPublicMetrics;
  coverage: PostDraftCoverage;
};

export type PostDraftPublicResult = {
  status: "ready" | "not-ready";
  season: number;
  generatedAt: string;
  sourceDraftId: string | null;
  sourceDraftStatus: DraftStatus;
  metricsSchemaVersion: typeof POST_DRAFT_METRICS_SCHEMA_VERSION;
  records: PostDraftPublicRecord[];
  warnings: string[];
};

export type PostDraftPrivateMetrics = {
  warRoomId: string;
  targetCount: number;
  acquiredTargetCount: number;
  targetHitRate: number | null;
  acquiredTargets: Array<{ playerId: string; playerName: string }>;
  missedTargets: Array<{ playerId: string; playerName: string }>;
  capDiscipline: {
    cappedPurchases: number;
    underOrAtCapCount: number;
    overCapCount: number;
    totalDollarsOverCap: number;
    averageCapVariance: number | null;
    purchaseCapScores: number[];
    capPurchases: Array<{
      playerId: string;
      playerName: string;
      plannedCap: number;
      purchasePrice: number;
      variance: number;
      purchaseCapScore: number;
    }>;
    unavailableCount: number;
  };
  preferredEntryDiscipline: {
    availableCount: number;
    comparableCount: number;
    averagePurchaseVsEntryVariance: number | null;
    unavailableCount: number;
  };
  strategyCoverage: "complete" | "partial";
};

export type PostDraftPrivateRecord = PostDraftPublicRecord & {
  privateMetrics: PostDraftPrivateMetrics;
};

export type PostDraftPrivateResult = {
  status: "ready" | "not-ready";
  records: PostDraftPrivateRecord[];
  warnings: string[];
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizePosition(position: string | null) {
  const normalized = position?.trim().toUpperCase() ?? "";
  if (normalized === "DST" || normalized === "D/ST" || normalized === "DEFENSE") {
    return "DEF";
  }
  return normalized || "OTHER";
}

function publicPlayerMetric(
  acquisition: PostDraftAcquisitionInput,
  player: PostDraftPlayerInput
): PostDraftPlayerMetric | null {
  if (acquisition.purchasePrice === null || player.publishedValue === null) return null;

  return {
    playerId: acquisition.playerId,
    playerName: acquisition.playerName,
    position: acquisition.position,
    purchasePrice: acquisition.purchasePrice,
    publishedValue: player.publishedValue,
    valueDifferential: round(player.publishedValue - acquisition.purchasePrice),
    adp: player.adp,
  };
}

function getPowerRanking(
  powerRankings: CanonicalPowerRankings,
  rosterId: number,
  franchiseId: string
): CanonicalPowerRankings["teams"][number] | null {
  return powerRankings.teams.find(
    (team) => team.rosterId === rosterId && team.franchiseId === franchiseId
  ) ?? null;
}

function calculateRosterStructure(
  roster: PostDraftRosterInput,
  players: ReadonlyMap<string, PostDraftPlayerInput>,
  requirements: PostDraftRosterRequirements | null
) {
  if (!requirements) {
    return {
      requiredStarterSlots: {},
      coveredStarterSlots: 0,
      uncoveredStarterSlots: 0,
      starterCoverageByPosition: {},
      depthByPosition: {},
      totalDepth: 0,
      depthCoverageStatus: "unavailable" as const,
      rosterSlotCapacity: null,
      rosterCompleteness: {
        filledSlots: roster.playerIds.length,
        capacity: null,
        ratio: null,
        status: "unavailable" as const,
      },
      warnings: ["Sleeper roster-position configuration is unavailable."],
    };
  }

  const playerPositions = new Map<string, string | null>(
    roster.playerIds.map((playerId) => [
      playerId,
      players.get(playerId)?.position ? normalizePosition(players.get(playerId)!.position) : null,
    ])
  );
  const unassigned = new Set(roster.playerIds);
  const starterCoverageByPosition: Record<string, { required: number; covered: number; uncovered: number }> = {};
  const requiredStarterSlots = { ...requirements.requiredStarterSlots, FLEX: requirements.flexSlots };

  Object.entries(requirements.requiredStarterSlots).forEach(([position, required]) => {
    const eligible = [...unassigned].filter((playerId) => playerPositions.get(playerId) === position);
    const covered = Math.min(eligible.length, required);
    eligible.slice(0, covered).forEach((playerId) => unassigned.delete(playerId));
    starterCoverageByPosition[position] = {
      required,
      covered,
      uncovered: required - covered,
    };
  });

  const flexEligible = [...unassigned].filter((playerId) => {
    const position = playerPositions.get(playerId);
    return position !== null && position !== undefined && requirements.flexEligiblePositions.includes(position);
  });
  const flexCovered = Math.min(flexEligible.length, requirements.flexSlots);
  flexEligible.slice(0, flexCovered).forEach((playerId) => unassigned.delete(playerId));
  if (requirements.flexSlots > 0) {
    starterCoverageByPosition.FLEX = {
      required: requirements.flexSlots,
      covered: flexCovered,
      uncovered: requirements.flexSlots - flexCovered,
    };
  }

  const depthByPosition: Record<string, number> = {};
  let unmappedDepthCount = 0;
  unassigned.forEach((playerId) => {
    const position = playerPositions.get(playerId);
    if (!position) {
      unmappedDepthCount += 1;
      return;
    }
    depthByPosition[position] = (depthByPosition[position] ?? 0) + 1;
  });
  const coveredStarterSlots = Object.values(starterCoverageByPosition).reduce((sum, slot) => sum + slot.covered, 0);
  const requiredSlotCount = Object.values(starterCoverageByPosition).reduce((sum, slot) => sum + slot.required, 0);
  const rosterSlotCapacity = requirements.rosterSlotCapacity;
  const filledSlots = Math.min(roster.playerIds.length, rosterSlotCapacity);
  return {
    requiredStarterSlots,
    coveredStarterSlots,
    uncoveredStarterSlots: requiredSlotCount - coveredStarterSlots,
    starterCoverageByPosition,
    depthByPosition,
    totalDepth: [...unassigned].length,
    depthCoverageStatus: unmappedDepthCount > 0 ? "partial" as const : "complete" as const,
    rosterSlotCapacity,
    rosterCompleteness: {
      filledSlots,
      capacity: rosterSlotCapacity,
      ratio: round(filledSlots / rosterSlotCapacity),
      status: roster.playerIds.length === rosterSlotCapacity ? "complete" as const : "partial" as const,
    },
    warnings: [
      ...(unmappedDepthCount > 0 ? [`${unmappedDepthCount} unassigned roster players have no position mapping.`] : []),
      ...(roster.playerIds.length > rosterSlotCapacity ? ["Roster contains more players than the configured slot capacity."] : []),
    ],
  };
}

function buildPublicMetrics(
  roster: PostDraftRosterInput,
  franchiseId: string,
  acquisitions: readonly PostDraftAcquisitionInput[],
  players: ReadonlyMap<string, PostDraftPlayerInput>,
  powerRankings: CanonicalPowerRankings,
  requirements: PostDraftRosterRequirements | null
): { metrics: PostDraftPublicMetrics; coverage: PostDraftCoverage } {
  const rosterAcquisitions = acquisitions.filter(
    (acquisition) => acquisition.rosterId === roster.rosterId
  );
  const totalSpend = round(
    rosterAcquisitions.reduce(
      (sum, acquisition) => sum + (acquisition.purchasePrice ?? 0),
      0
    )
  );
  const nonKeeperAuctionSpend = round(
    rosterAcquisitions
      .filter((acquisition) => !acquisition.isKeeper)
      .reduce((sum, acquisition) => sum + (acquisition.purchasePrice ?? 0), 0)
  );
  const positionSpend: Record<string, PostDraftPositionMetric> = {};
  const positionCounts: Record<string, number> = {};
  const warnings: string[] = [];
  let positionCount = 0;
  let rosterValue = 0;
  let rosterValueCount = 0;
  const comparablePlayers: PostDraftPlayerMetric[] = [];
  const adpValues: number[] = [];

  roster.playerIds.forEach((playerId) => {
    const player = players.get(playerId);
    const position = normalizePosition(player?.position ?? null);
    positionCounts[position] = (positionCounts[position] ?? 0) + 1;
    positionCount += player?.position ? 1 : 0;
    if (player?.publishedValue === null || player?.publishedValue === undefined) {
      warnings.push(`Published value unavailable for roster player ${playerId}.`);
    } else {
      rosterValue += player.publishedValue;
      rosterValueCount += 1;
    }
  });

  rosterAcquisitions.forEach((acquisition) => {
    const position = normalizePosition(acquisition.position);
    const current = positionSpend[position] ?? {
      totalSpend: 0,
      playerCount: 0,
      shareOfTotalSpend: 0,
    };
    current.totalSpend = round(current.totalSpend + (acquisition.purchasePrice ?? 0));
    current.playerCount += 1;
    positionSpend[position] = current;

    const player = players.get(acquisition.playerId);
    const playerMetric = player ? publicPlayerMetric(acquisition, player) : null;
    if (playerMetric) comparablePlayers.push(playerMetric);
    if (player?.adp !== null && player?.adp !== undefined) adpValues.push(player.adp);
  });

  Object.values(positionSpend).forEach((metric) => {
    metric.shareOfTotalSpend = totalSpend > 0
      ? round(metric.totalSpend / totalSpend)
      : 0;
  });
  comparablePlayers.sort(
    (first, second) => second.valueDifferential - first.valueDifferential || first.playerId.localeCompare(second.playerId)
  );
  const keeperRows = rosterAcquisitions.filter((acquisition) => acquisition.isKeeper);
  const keeperValueRows = keeperRows.flatMap((keeper) => {
    const value = players.get(keeper.playerId)?.publishedValue;
    return value === null || value === undefined ? [] : [{ value, cost: keeper.purchasePrice ?? keeper.keeperCost ?? 0 }];
  });
  const powerRanking = getPowerRanking(powerRankings, roster.rosterId, franchiseId);
  const rosterStructure = calculateRosterStructure(roster, players, requirements);
  if (!powerRanking) warnings.push("Canonical Power Rankings record unavailable.");
  if (rosterValueCount !== roster.playerIds.length) warnings.push("Roster value coverage is partial.");
  if (positionCount !== roster.playerIds.length) warnings.push("Roster position coverage is partial.");
  warnings.push(...rosterStructure.warnings);
  const coverage: PostDraftCoverage = {
    status: warnings.length > 0 ? "partial" : "complete",
    warnings: Array.from(new Set(warnings)),
    rosterValueCount,
    valueDifferentialCount: comparablePlayers.length,
    adpCount: adpValues.length,
    positionCount,
  };
  const totalValueDifferential = comparablePlayers.reduce((sum, player) => sum + player.valueDifferential, 0);
  const keeperPublishedValue = keeperValueRows.length === keeperRows.length && keeperRows.length > 0
    ? round(keeperValueRows.reduce((sum, row) => sum + row.value, 0))
    : keeperRows.length === 0 ? 0 : null;
  const keeperValueDifferential = keeperPublishedValue === null
    ? null
    : round(keeperPublishedValue - keeperRows.reduce(
      (sum, row) => sum + (row.purchasePrice ?? row.keeperCost ?? 0),
      0
    ));

  return {
    metrics: {
      totalSpend,
      remainingBudget: round(riverCityAuctionLeagueSettings.auctionBudgetPerTeam - totalSpend),
      positionSpend,
      positionCounts,
      rosterSize: roster.playerIds.length,
      starterCount: roster.starterIds?.length ?? 0,
      benchDepthCount: Math.max(roster.playerIds.length - (roster.starterIds?.length ?? 0), 0),
      rosterValue: rosterValueCount === 0 ? null : round(rosterValue),
      valueDifferential: {
        total: comparablePlayers.length === 0 ? null : round(totalValueDifferential),
        average: comparablePlayers.length === 0 ? null : round(totalValueDifferential / comparablePlayers.length),
        comparablePlayerCount: comparablePlayers.length,
      },
      bestBuy: comparablePlayers[0] ?? null,
      biggestReach: comparablePlayers[comparablePlayers.length - 1] ?? null,
      keeperCount: keeperRows.length,
      totalKeeperCost: round(keeperRows.reduce((sum, keeper) => sum + (keeper.purchasePrice ?? keeper.keeperCost ?? 0), 0)),
      keeperPublishedValue,
      keeperValueDifferential,
      nonKeeperAuctionSpend,
      adpContext: {
        acquiredPlayerCount: rosterAcquisitions.length,
        playersWithAdp: adpValues.length,
        averageAcquisitionAdp: adpValues.length === 0 ? null : round(adpValues.reduce((sum, adp) => sum + adp, 0) / adpValues.length),
      },
      powerRanking: {
        rank: powerRanking?.rank ?? null,
        rosterValue: powerRanking?.rosterValue ?? null,
        averageSOS: powerRanking?.averageSOS ?? null,
        rawScore: powerRanking?.powerScore ?? null,
        normalizedIndex: powerRanking?.normalizedIndex ?? null,
        coverage: powerRanking?.coverage ?? null,
        status: powerRanking?.status ?? null,
      },
      requiredStarterSlots: rosterStructure.requiredStarterSlots,
      coveredStarterSlots: rosterStructure.coveredStarterSlots,
      uncoveredStarterSlots: rosterStructure.uncoveredStarterSlots,
      starterCoverageByPosition: rosterStructure.starterCoverageByPosition,
      depthByPosition: rosterStructure.depthByPosition,
      totalDepth: rosterStructure.totalDepth,
      depthCoverageStatus: rosterStructure.depthCoverageStatus,
      rosterSlotCapacity: rosterStructure.rosterSlotCapacity,
      rosterCompleteness: rosterStructure.rosterCompleteness,
    },
    coverage,
  };
}

function gateWarnings(input: PostDraftMetricsInput) {
  const warnings: string[] = [];
  if (input.draftStatus !== "complete") warnings.push("Sleeper draft is not complete.");
  if (input.rosters.length === 0) warnings.push("Final roster ownership is unavailable.");
  if (input.rosters.some((roster) => !roster.ownerUserId)) {
    warnings.push("Final roster ownership is incomplete.");
  }
  if (input.draftPickCount === 0 || input.acquisitions.length === 0) {
    warnings.push("Final auction picks are unavailable.");
  }
  if (input.acquisitions.some((acquisition) => acquisition.purchasePrice === null)) {
    warnings.push("One or more auction purchase prices are unresolved.");
  }
  if (input.acquisitions.some((acquisition) => acquisition.isKeeper && acquisition.keeperCost === null && acquisition.purchasePrice === null)) {
    warnings.push("One or more keeper prices are unresolved.");
  }
  return Array.from(new Set(warnings));
}

function readSleeperRosterRequirements(value: unknown): PostDraftRosterRequirements | null {
  if (!Array.isArray(value)) return null;
  const rosterPositions = value
    .filter((position): position is string => typeof position === "string")
    .map((position) => normalizePosition(position));
  if (rosterPositions.length === 0) return null;
  const requiredStarterSlots: Record<string, number> = {};
  rosterPositions
    .filter((position) => position !== "BN" && position !== "FLEX")
    .forEach((position) => {
      requiredStarterSlots[position] = (requiredStarterSlots[position] ?? 0) + 1;
    });
  return {
    rosterPositions,
    requiredStarterSlots,
    flexSlots: rosterPositions.filter((position) => position === "FLEX").length,
    flexEligiblePositions: ["RB", "WR", "TE"],
    rosterSlotCapacity: rosterPositions.length,
    source: "Sleeper league.roster_positions",
  };
}

export function calculatePostDraftMetrics(input: PostDraftMetricsInput): PostDraftPublicResult {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const warnings = gateWarnings(input);
  if (warnings.length > 0) {
    return {
      status: "not-ready",
      season: input.season,
      generatedAt,
      sourceDraftId: input.draftId,
      sourceDraftStatus: input.draftStatus,
      metricsSchemaVersion: POST_DRAFT_METRICS_SCHEMA_VERSION,
      records: [],
      warnings,
    };
  }

  const seenFranchises = new Set<string>();
  const records = input.rosters.flatMap<PostDraftPublicRecord>((roster) => {
    const ranking = input.powerRankings.teams.find((team) => team.rosterId === roster.rosterId);
    if (!ranking || seenFranchises.has(ranking.franchiseId)) return [];
    seenFranchises.add(ranking.franchiseId);
    const built = buildPublicMetrics(roster, ranking.franchiseId, input.acquisitions, input.players, input.powerRankings, input.rosterRequirements);
    return [{
      season: input.season,
      franchiseId: ranking.franchiseId,
      rosterId: roster.rosterId,
      teamName: ranking.teamName || roster.teamName || "Unknown Team",
      generatedAt,
      source: {
        draftId: input.draftId,
        draftStatus: input.draftStatus,
        metricsSchemaVersion: POST_DRAFT_METRICS_SCHEMA_VERSION,
      },
      metrics: built.metrics,
      coverage: built.coverage,
    }];
  });

  if (records.length === 0) warnings.push("Canonical franchise records are unavailable.");
  return {
    status: "ready",
    season: input.season,
    generatedAt,
    sourceDraftId: input.draftId,
    sourceDraftStatus: input.draftStatus,
    metricsSchemaVersion: POST_DRAFT_METRICS_SCHEMA_VERSION,
    records,
    warnings: Array.from(new Set(warnings)),
  };
}

export function calculatePrivatePostDraftMetrics(
  publicResult: PostDraftPublicResult,
  input: PostDraftMetricsInput,
  strategy: PostDraftStrategyInput
): PostDraftPrivateResult {
  if (publicResult.status === "not-ready") {
    return { status: "not-ready", records: [], warnings: publicResult.warnings };
  }
  const roster = input.rosters.find((candidate) =>
    input.powerRankings.teams.some((team) => team.rosterId === candidate.rosterId && team.franchiseId === strategy.franchiseId)
  );
  const publicRecord = publicResult.records.find((record) => record.franchiseId === strategy.franchiseId);
  if (!roster || !publicRecord) {
    return { status: "not-ready", records: [], warnings: ["Private franchise metrics are unavailable for the requested scope."] };
  }
  const acquisitions = input.acquisitions.filter((acquisition) => acquisition.rosterId === roster.rosterId);
  const acquiredIds = new Set(acquisitions.map((acquisition) => acquisition.playerId));
  const preferenceByPlayerId = new Map<string, (typeof strategy.preferences)[number]>();
  strategy.preferences.forEach((preference) => {
    const existing = preferenceByPlayerId.get(preference.sleeperPlayerId);
    if (!existing || preference.updatedAt >= existing.updatedAt) {
      preferenceByPlayerId.set(preference.sleeperPlayerId, preference);
    }
  });
  const uniquePreferences = Array.from(preferenceByPlayerId.values());
  const targets = uniquePreferences.filter((preference) => preference.tag === "target");
  const acquiredTargets = targets.filter((target) => acquiredIds.has(target.sleeperPlayerId)).map((target) => ({
    playerId: target.sleeperPlayerId,
    playerName: input.players.get(target.sleeperPlayerId)?.playerName ?? target.sleeperPlayerId,
  }));
  const missedTargets = targets.filter((target) => !acquiredIds.has(target.sleeperPlayerId)).map((target) => ({
    playerId: target.sleeperPlayerId,
    playerName: input.players.get(target.sleeperPlayerId)?.playerName ?? target.sleeperPlayerId,
  }));
  const capRows = acquisitions.flatMap((acquisition) => {
    const plannedCap = preferenceByPlayerId.get(acquisition.playerId)?.plannedCap;
    if (
      plannedCap === null ||
      plannedCap === undefined ||
      !Number.isFinite(plannedCap) ||
      plannedCap <= 0 ||
      acquisition.purchasePrice === null ||
      !Number.isFinite(acquisition.purchasePrice)
    ) return [];
    const variance = round(acquisition.purchasePrice - plannedCap);
    const purchaseCapScore = variance <= 0
      ? 100
      : Math.max(0, round(100 * (1 - variance / Math.max(plannedCap, 1))));
    return [{
      playerId: acquisition.playerId,
      playerName: acquisition.playerName,
      plannedCap,
      purchasePrice: acquisition.purchasePrice,
      variance,
      purchaseCapScore,
    }];
  });
  const entryRows = acquisitions.flatMap((acquisition) => {
    const preferredEntry = preferenceByPlayerId.get(acquisition.playerId)?.preferredEntry;
    if (preferredEntry === null || preferredEntry === undefined || acquisition.purchasePrice === null) return [];
    return [round(acquisition.purchasePrice - preferredEntry)];
  });
  const capOverages = capRows.filter((row) => row.variance > 0);
  const privateMetrics: PostDraftPrivateMetrics = {
    warRoomId: strategy.warRoomId,
    targetCount: targets.length,
    acquiredTargetCount: acquiredTargets.length,
    targetHitRate: targets.length === 0 ? null : round(acquiredTargets.length / targets.length),
    acquiredTargets,
    missedTargets,
    capDiscipline: {
      cappedPurchases: capRows.length,
      underOrAtCapCount: capRows.filter((row) => row.variance <= 0).length,
      overCapCount: capOverages.length,
      totalDollarsOverCap: round(capOverages.reduce((sum, row) => sum + row.variance, 0)),
      averageCapVariance: capRows.length === 0 ? null : round(capRows.reduce((sum, row) => sum + row.variance, 0) / capRows.length),
      purchaseCapScores: capRows.map((row) => row.purchaseCapScore),
      capPurchases: capRows,
      unavailableCount: acquisitions.length - capRows.length,
    },
    preferredEntryDiscipline: {
      availableCount: entryRows.length,
      comparableCount: entryRows.length,
      averagePurchaseVsEntryVariance: entryRows.length === 0 ? null : round(entryRows.reduce((sum, value) => sum + value, 0) / entryRows.length),
      unavailableCount: acquisitions.length - entryRows.length,
    },
    strategyCoverage: capRows.length === acquisitions.length && entryRows.length === acquisitions.length && strategy.settingsAvailable !== false ? "complete" : "partial",
  };
  return {
    status: "ready",
    records: [{ ...publicRecord, privateMetrics }],
    warnings: [],
  };
}

export async function loadPostDraftMetricsInput(season: number): Promise<PostDraftMetricsInput> {
  const [sleeper, rankings, playerStatsSnapshot, adp] = await Promise.all([
    import("@/lib/sleeper"),
    import("@/lib/powerRankings"),
    import("@/lib/firebaseAdmin").then(({ firestore }) => firestore.collection("player_stats").get()),
    import("@/lib/auction/adpRefreshService").then(({ readPublishedAdpConsensusFromFirestore }) => readPublishedAdpConsensusFromFirestore(season)),
  ]);
  const snapshot = await sleeper.getSleeperAuctionDraftSnapshot(season);
  const [rosters, users, sleeperPlayers, leagueInfo] = await Promise.all([
    sleeper.getLeagueRosters(snapshot.leagueId ?? undefined),
    sleeper.getLeagueUsers(snapshot.leagueId ?? undefined),
    fetch("https://api.sleeper.app/v1/players/nfl", { next: { revalidate: 3600 } }).then((response) => response.ok ? response.json() : {}),
    sleeper.getLeagueInfo(snapshot.leagueId ?? undefined),
  ]);
  const usersById = new Map(users.map((user: any) => [String(user.user_id), user]));
  const playerStats = new Map(playerStatsSnapshot.docs.map((document) => [document.id, document.data()]));
  const adpById = new Map((adp?.rows ?? []).map((row) => [row.playerId, row.consensusOverallAdp]));
  const players = new Map<string, PostDraftPlayerInput>(Object.entries(sleeperPlayers as Record<string, any>).map(([playerId, player]) => {
    const stats = playerStats.get(playerId);
    return [playerId, {
      playerId,
      playerName: player.full_name ?? playerId,
      position: player.position ?? null,
      nflTeam: player.team ?? null,
      publishedValue: typeof stats?.totalValueScore === "number" ? stats.totalValueScore : null,
      adp: adpById.get(playerId) ?? null,
    }];
  }));
  const normalizedAuction = (await import("@/lib/auction/sleeperAuctionSync")).normalizeSleeperAuctionSyncSnapshot({
    leagueId: snapshot.leagueId,
    season,
    fetchedAt: snapshot.generatedAt,
    draftId: snapshot.draft?.draft_id ?? null,
    picks: snapshot.picks.map((pick) => ({
      draftId: pick.draftId,
      playerId: pick.playerId,
      playerName: pick.playerName,
      position: pick.position,
      nflTeam: pick.nflTeam,
      pickedByUserId: pick.pickedByUserId,
      rosterId: pick.rosterId,
      round: pick.round,
      draftSlot: pick.draftSlot,
      pickNo: pick.pickNo,
      isKeeper: pick.isKeeper,
      auctionPrice: pick.auctionPrice,
      needsAuctionPriceReview: pick.needsAuctionPriceReview,
    })),
    rosters,
    users,
    playersById: sleeperPlayers,
    warnings: snapshot.warnings,
  });
  const acquisitions = [
    ...normalizedAuction.completedPurchases.map((purchase) => ({
      playerId: purchase.playerId,
      playerName: purchase.playerName,
      position: purchase.position,
      nflTeam: purchase.nflTeam,
      rosterId: purchase.rosterId,
      purchasePrice: purchase.salePrice,
      isKeeper: false,
      pickNumber: purchase.pickNumber,
      keeperCost: null,
    })),
    ...normalizedAuction.keepers.map((keeper) => ({
      playerId: keeper.playerId,
      playerName: keeper.playerName,
      position: keeper.position,
      nflTeam: keeper.nflTeam,
      rosterId: keeper.rosterId,
      purchasePrice: keeper.keeperPrice,
      isKeeper: true,
      pickNumber: keeper.keeperRound,
      keeperCost: keeper.keeperPrice,
    })),
  ].filter((pick): pick is PostDraftAcquisitionInput => pick.rosterId !== null && pick.playerId !== null);
  /*
   * The normalized sync layer is the existing read-only reconciliation point
   * for draft-pick keepers and final-roster keepers. It is intentionally used
   * here instead of creating another keeper interpretation.
   */
  const input: PostDraftMetricsInput = {
    season,
    draftId: snapshot.draft?.draft_id ?? null,
    draftStatus: snapshot.draft?.status ?? "unknown",
    draftPickCount: snapshot.picks.length,
    rosters: rosters.map((roster: any) => ({
      rosterId: Number(roster.roster_id),
      ownerUserId: roster.owner_id ? String(roster.owner_id) : null,
      teamName: usersById.get(String(roster.owner_id))?.metadata?.team_name ?? null,
      playerIds: Array.isArray(roster.players) ? roster.players.map(String) : [],
      starterIds: Array.isArray(roster.starters) ? roster.starters.map(String) : [],
    })),
    acquisitions,
    players,
    powerRankings: await rankings.getCanonicalPowerRankings(),
    rosterRequirements: readSleeperRosterRequirements((leagueInfo as { roster_positions?: unknown }).roster_positions),
    generatedAt: new Date().toISOString(),
  };
  return input;
}

export async function getPostDraftMetrics({ season = POST_DRAFT_METRICS_SEASON } = {}): Promise<PostDraftPublicResult> {
  return calculatePostDraftMetrics(await loadPostDraftMetricsInput(season));
}

export async function getAuthorizedPrivatePostDraftMetrics({
  season = POST_DRAFT_METRICS_SEASON,
  franchiseId,
}: {
  season?: number;
  franchiseId: string;
}): Promise<PostDraftPrivateResult> {
  const [{ requireAuctionWarRoomAccess }, { assertAuthorizedWarRoomRequest }, { readAuctionOwnerPreferences }, { readAuctionOwnerProfileSettings }] = await Promise.all([
    import("@/lib/auth/auctionAccess"),
    import("@/lib/auction/warRoomScope"),
    import("@/lib/auction/ownerPreferences"),
    import("@/lib/auction/ownerProfileSettings"),
  ]);
  const session = await requireAuctionWarRoomAccess();
  const access = session.access;
  assertAuthorizedWarRoomRequest(access, { franchiseId });
  const input = await loadPostDraftMetricsInput(season);
  const publicResult = calculatePostDraftMetrics(input);
  const preferences = await readAuctionOwnerPreferences({
    season,
    ownerProfileId: access.canonicalOwnerId ?? access.ownerProfileId ?? "",
    warRoomId: access.warRoomId ?? undefined,
  });
  const settings = await readAuctionOwnerProfileSettings({
    season,
    ownerProfileId: access.canonicalOwnerId ?? access.ownerProfileId ?? "",
    warRoomId: access.warRoomId ?? undefined,
  });
  return calculatePrivatePostDraftMetrics(publicResult, input, {
    warRoomId: access.warRoomId ?? `2026:${franchiseId}`,
    franchiseId,
    preferences,
    settingsAvailable: Boolean(settings),
  });
}
