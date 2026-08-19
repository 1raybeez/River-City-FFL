import {
  calculateMaxBid,
  calculateRosterSpotsRemaining,
  calculateRemainingBudget,
} from "@/lib/auction/calculations";
import {
  calculatePositionCounts,
  calculateStarterNeeds,
  defaultBenchDepthTargets,
  defaultStarterPlan,
} from "@/lib/auction/rosterGuidance";

export const RECOMMENDATION_ENGINE_VERSION = "wr-m12-v1";
export const BEST_VALUE_ELIGIBILITY_POLICY_VERSION = "best-value-eligibility-v1";

export type RecommendedNowCategory =
  | "BEST OVERALL"
  | "BEST VALUE"
  | "ROSTER FIT"
  | "SCARCITY PLAY"
  | "UPSIDE PLAY"
  | "BUDGET PLAY";

export type RecommendedNowAffordability =
  | "AFFORDABLE"
  | "STRETCH"
  | "NOT_REALISTIC";

export type RecommendedNowPlayer = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  headshotUrl: string;
  auctionConsensus: number | null;
  auctionLow: number | null;
  auctionHigh: number | null;
  auctionSourceCount: number;
  adp: number | null;
  adpSourceCount: number;
  affordability: RecommendedNowAffordability;
  targetLow: number | null;
  targetHigh: number | null;
  stretchMax: number | null;
  category: RecommendedNowCategory;
  why: string;
  score: number;
};

export type RecommendedNowResult = {
  status: "ready" | "partial" | "unavailable";
  version: string;
  generatedAt: string;
  recommendations: RecommendedNowPlayer[];
  unavailableCategories: RecommendedNowCategory[];
  warnings: string[];
  sources: {
    auction: string;
    adp: string;
    availability: string;
    roster: string;
    budget: string;
  };
  policies?: {
    bestValueEligibility: string;
  };
  diagnostic?: RecommendedNowDiagnostic;
};

type RecommendedNowDiagnosticTrace = {
  playerId: string;
  playerName: string;
  category: RecommendedNowCategory;
  auctionValuePercentile: number;
  adpDemandPercentile: number | null;
  scarcity: number;
  rosterFit: number;
  affordability: RecommendedNowAffordability;
  bestValueEligible: boolean;
  bestValueEligibilityReasons: string[];
  privatePreference: number;
  leaguePressure: number;
  weightedContributions: {
    auctionValue: number;
    adpDemand: number | null;
    scarcity: number;
    rosterFit: number;
    affordability: number;
    privatePreference: number;
    leaguePressure: number;
  };
  finalScore: number;
  categoryScore: number;
};

export type RecommendedNowDiagnostic = {
  temporary: true;
  roster: {
    counts: Record<string, number>;
    totalCount: number;
    rosterSlotsRemaining: number;
    remainingBudget: number;
    budgetSafeMax: number;
    keeperCount: number;
    completedPurchaseCount: number;
  };
  qbGuidance: {
    starterRequirement: number;
    totalDepthTarget: number;
    currentCount: number;
    starterNeed: boolean;
    depthNeed: boolean;
  };
  availablePool: {
    total: number;
    counts: Record<string, number>;
  };
  scarcity: Record<string, {
    topAuctionConsensus: number | null;
    threshold65: number | null;
    countAtOrAboveThreshold: number;
    normalizedScarcity: number | null;
  }>;
  reconciliation?: {
    activePurchaseCount: number;
    voidedPurchaseCount: number;
    sleeperPurchaseCount: number;
    operationalPurchaseCount: number;
    warRoomPurchaseCount: number;
    deduplicatedPurchaseCount: number;
    conflicts: string[];
    rayPurchases: Array<{
      playerId: string | null;
      playerName: string;
      status: "ACTIVE" | "VOIDED";
      source: string;
      amount: number;
    }>;
  };
  traces: RecommendedNowDiagnosticTrace[];
};

export type RecommendedNowValueRow = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  auctionConsensus: number | null;
  auctionLow: number | null;
  auctionHigh: number | null;
  auctionSourceCount: number;
};

export type RecommendedNowAdpRow = {
  playerId: string;
  adp: number | null;
  sourceCount: number;
};

export type RecommendedNowPreference = {
  tag: "open" | "target" | "watch" | "fade";
  preferredEntry: number | null;
  plannedCap: number | null;
};

export type RecommendedNowPurchase = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  price: number;
  rosterId: number | null;
  isKeeper: boolean;
};

export type RecommendedNowTeamState = {
  rosterId: number;
  remainingBudget: number;
  rosterSlotsRemaining: number;
};

export type RecommendedNowInput = {
  values: readonly RecommendedNowValueRow[];
  adp: readonly RecommendedNowAdpRow[];
  preferences: ReadonlyMap<string, RecommendedNowPreference>;
  purchases: readonly RecommendedNowPurchase[];
  teams: readonly RecommendedNowTeamState[];
  rayRosterId: number;
  rayBudget: {
    teamBudget: number;
    keeperCostTotal: number;
    spentBudget: number;
    rosterSlotsTotal: number;
  };
  headshotUrl?: (playerId: string) => string;
  generatedAt?: string;
};

type Candidate = {
  value: RecommendedNowValueRow;
  adp: RecommendedNowAdpRow | null;
  preference: RecommendedNowPreference | null;
  valuePercentile: number;
  demandPercentile: number | null;
  scarcity: number;
  rosterFit: number;
  affordability: RecommendedNowAffordability;
  affordabilityScore: number;
  budgetSafeMax: number;
  valueEdge: number | null;
  leaguePressure: number;
  score: number;
  bestValueEligible: boolean;
  bestValueEligibilityReasons: string[];
};

const categoryOrder: readonly RecommendedNowCategory[] = [
  "BEST OVERALL",
  "BEST VALUE",
  "ROSTER FIT",
  "SCARCITY PLAY",
  "UPSIDE PLAY",
  "BUDGET PLAY",
];

function clamp(value: number, low = 0, high = 1) {
  return Math.min(Math.max(value, low), high);
}

function percentileRank(value: number, values: readonly number[]) {
  if (values.length <= 1) return 1;
  const lowerCount = values.filter((candidate) => candidate < value).length;
  return lowerCount / (values.length - 1);
}

function inverseRank(value: number, values: readonly number[]) {
  if (values.length <= 1) return 1;
  const lowerCount = values.filter((candidate) => candidate < value).length;
  return 1 - lowerCount / (values.length - 1);
}

function normalizePosition(position: string | null) {
  const normalized = position?.trim().toUpperCase() ?? "";
  return normalized === "DST" || normalized === "D/ST" ? "DEF" : normalized;
}

function safeValue(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function preferenceScore(preference: RecommendedNowPreference | null) {
  if (preference?.tag === "target") return 1;
  if (preference?.tag === "watch") return 0.4;
  return 0;
}

export function getBestValueEligibility({
  auctionConsensus,
  auctionSourceCount,
  adp,
  adpSourceCount,
  preferenceTag,
}: {
  auctionConsensus: number;
  auctionSourceCount: number;
  adp: number | null;
  adpSourceCount: number;
  preferenceTag: RecommendedNowPreference["tag"] | null;
}) {
  const reasons = [
    ...(auctionConsensus >= 10 ? ["AUCTION_RELEVANCE"] : []),
    ...(adp !== null && adp <= 200 ? ["ADP_RELEVANCE"] : []),
    ...(auctionSourceCount >= 4 && adpSourceCount >= 4
      ? ["STRONG_SOURCE_COVERAGE"]
      : []),
    ...(preferenceTag === "target" ? ["PRIVATE_TARGET"] : []),
    ...(preferenceTag === "watch" ? ["PRIVATE_WATCH"] : []),
  ];
  return { eligible: reasons.length > 0, reasons };
}

function calculateAffordability(
  value: RecommendedNowValueRow,
  budgetSafeMax: number
) {
  const average = safeValue(value.auctionConsensus);
  const low = safeValue(value.auctionLow);
  if (average === null || budgetSafeMax <= 0) {
    return { label: "NOT_REALISTIC" as const, score: 0 };
  }
  if (average <= budgetSafeMax) {
    return { label: "AFFORDABLE" as const, score: 1 };
  }
  if (low !== null && low <= budgetSafeMax) {
    return { label: "STRETCH" as const, score: 0.5 };
  }
  return { label: "NOT_REALISTIC" as const, score: 0 };
}

function weightedScore(components: Array<[number | null, number]>) {
  const usable = components.filter(([value]) => value !== null) as Array<
    [number, number]
  >;
  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  return usable.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
}

function buildWhy(category: RecommendedNowCategory, candidate: Candidate) {
  const position = candidate.value.position ?? "position-eligible";
  if (candidate.preference?.tag === "target") {
    return `Private target with ${candidate.affordability.toLowerCase()} consensus value.`;
  }
  if (category === "BEST VALUE") {
    return `Strong ${position} value relative to consensus demand.`;
  }
  if (category === "ROSTER FIT") {
    return `Fits your remaining ${position} roster construction and is ${candidate.affordability.toLowerCase()}.`;
  }
  if (category === "SCARCITY PLAY") {
    return `Limited ${position} value depth remains above the current value tier.`;
  }
  if (category === "BUDGET PLAY") {
    return `${candidate.affordability === "AFFORDABLE" ? "Affordable" : "Stretch"} consensus value within the budget-safe max.`;
  }
  return `High available consensus value with ${candidate.affordability.toLowerCase()} budget fit.`;
}

export function buildRecommendedNow(
  input: RecommendedNowInput,
  options: { diagnostic?: boolean } = {}
): RecommendedNowResult {
  const now = input.generatedAt ?? new Date().toISOString();
  const warnings: string[] = [];
  const adpById = new Map(input.adp.map((row) => [row.playerId, row]));
  const purchasedIds = new Set(
    input.purchases.map((purchase) => purchase.playerId).filter((id): id is string => Boolean(id))
  );
  const availableValues = input.values.filter(
    (value) => Boolean(value.playerId) && !purchasedIds.has(value.playerId) && value.auctionConsensus !== null
  );

  if (availableValues.length === 0) {
    return {
      status: "unavailable",
      version: RECOMMENDATION_ENGINE_VERSION,
      generatedAt: now,
      recommendations: [],
      unavailableCategories: categoryOrder.filter((category) => category !== "UPSIDE PLAY"),
      warnings: ["No available players have a usable auction consensus."],
      sources: {
        auction: "Published River City five-source auction consensus",
        adp: "Published River City five-source ADP consensus",
        availability: "Sleeper completed purchases/keepers plus authorized War Room purchases",
        roster: "Scoped War Room keeper and purchase state",
        budget: "River City auction budget and minimum-roster max-bid calculation",
      },
      policies: { bestValueEligibility: BEST_VALUE_ELIGIBILITY_POLICY_VERSION },
    };
  }

  const rayPurchases = input.purchases.filter((purchase) => purchase.rosterId === input.rayRosterId);
  const rayPlayers = rayPurchases.map((purchase) => ({
    id: purchase.playerId ?? purchase.playerName,
    playerName: purchase.playerName,
    position: purchase.position,
    nflTeam: null,
    cost: purchase.price,
    source: purchase.isKeeper ? "Keeper" as const : "Purchase" as const,
  }));
  const rayPositionCounts = calculatePositionCounts(rayPlayers);
  const starterNeeds = calculateStarterNeeds(rayPositionCounts, defaultStarterPlan);
  const benchNeeds = defaultBenchDepthTargets;
  const remainingBudget = calculateRemainingBudget(input.rayBudget);
  const filled = input.rayBudget.rosterSlotsTotal -
    calculateRosterSpotsRemaining({ total: input.rayBudget.rosterSlotsTotal, filled: rayPurchases.length });
  const rosterSlotsRemaining = calculateRosterSpotsRemaining({
    total: input.rayBudget.rosterSlotsTotal,
    filled,
  });
  const budgetSafeMax = calculateMaxBid(remainingBudget, rosterSlotsRemaining);

  const valuesByPosition = new Map<string, number[]>();
  availableValues.forEach((value) => {
    const preference = input.preferences.get(value.playerId);
    if (preference?.tag === "fade") return;
    const position = normalizePosition(value.position);
    const list = valuesByPosition.get(position) ?? [];
    if (value.auctionConsensus !== null) list.push(value.auctionConsensus);
    valuesByPosition.set(position, list);
  });
  const overallValues = availableValues.map((value) => value.auctionConsensus as number);
  const adpValues = input.adp
    .map((row) => row.adp)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  const allCandidates: Candidate[] = availableValues.map((value) => {
    const adp = adpById.get(value.playerId) ?? null;
    const preference = input.preferences.get(value.playerId) ?? null;
    const position = normalizePosition(value.position);
    const positionValues = valuesByPosition.get(position) ?? [];
    const valuePercentile = percentileRank(value.auctionConsensus as number, overallValues);
    const demandPercentile = adp?.adp === null || adp?.adp === undefined
      ? null
      : inverseRank(adp.adp, adpValues);
    const tierCutoff = Math.max(...positionValues) * 0.65;
    const aboveTier = positionValues.filter((candidateValue) => candidateValue >= tierCutoff).length;
    const scarcity = clamp(1 - Math.max(aboveTier - 1, 0) / 5);
    const starterNeed = starterNeeds.find((need) => need.label === position)?.needed ?? 0;
    const benchNeed = Math.max((benchNeeds[position as keyof typeof benchNeeds] ?? 0) - (rayPositionCounts[position] ?? 0), 0);
    const rosterFit = clamp((starterNeed * 0.7 + Math.min(benchNeed, 2) * 0.3) / 2);
    const affordability = calculateAffordability(value, budgetSafeMax);
    const teamsAbleToBid = input.teams.filter((team) => {
      const teamMaxBid = calculateMaxBid(team.remainingBudget, team.rosterSlotsRemaining);
      return team.rosterId !== input.rayRosterId && teamMaxBid >= (value.auctionConsensus ?? 0);
    }).length;
    const leaguePressure = input.teams.length <= 1
      ? 0
      : teamsAbleToBid / Math.max(input.teams.length - 1, 1);
    const valueEdge = demandPercentile === null ? null : clamp(0.5 + (valuePercentile - demandPercentile) / 2);
  const score = weightedScore([
      [valuePercentile, 25],
      [demandPercentile, 15],
      [scarcity, 15],
      [rosterFit, 20],
      [affordability.score, 15],
      [preferenceScore(preference), 5],
      [leaguePressure, 5],
    ]);
    return {
      value,
      adp,
      preference,
      valuePercentile,
      demandPercentile,
      scarcity,
      rosterFit,
      affordability: affordability.label,
      affordabilityScore: affordability.score,
      budgetSafeMax,
      valueEdge,
      leaguePressure,
      score,
      bestValueEligible: getBestValueEligibility({
        auctionConsensus: value.auctionConsensus as number,
        auctionSourceCount: value.auctionSourceCount,
        adp: adp?.adp ?? null,
        adpSourceCount: adp?.sourceCount ?? 0,
        preferenceTag: preference?.tag ?? null,
      }).eligible,
      bestValueEligibilityReasons: getBestValueEligibility({
        auctionConsensus: value.auctionConsensus as number,
        auctionSourceCount: value.auctionSourceCount,
        adp: adp?.adp ?? null,
        adpSourceCount: adp?.sourceCount ?? 0,
        preferenceTag: preference?.tag ?? null,
      }).reasons,
    };
  });
  const candidates = allCandidates.filter((candidate) => candidate.preference?.tag !== "fade");

  if (adpValues.length === 0) warnings.push("ADP consensus is unavailable; scores use auction, roster, scarcity, budget, and preference signals.");
  const recommendations: RecommendedNowPlayer[] = [];
  const used = new Set<string>();
  const select = (
    category: RecommendedNowCategory,
    scorer: (candidate: Candidate) => number,
    eligibility: (candidate: Candidate) => boolean = () => true
  ) => {
    const candidate = [...candidates]
      .filter((item) => !used.has(item.value.playerId) && item.affordability !== "NOT_REALISTIC" && eligibility(item))
      .sort((first, second) => scorer(second) - scorer(first) || second.score - first.score || first.value.playerName.localeCompare(second.value.playerName))[0];
    if (!candidate) return;
    used.add(candidate.value.playerId);
    const preference = candidate.preference;
    recommendations.push({
      playerId: candidate.value.playerId,
      playerName: candidate.value.playerName,
      position: candidate.value.position,
      nflTeam: candidate.value.nflTeam,
      headshotUrl: (input.headshotUrl ?? ((id) => `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`))(candidate.value.playerId),
      auctionConsensus: candidate.value.auctionConsensus,
      auctionLow: candidate.value.auctionLow,
      auctionHigh: candidate.value.auctionHigh,
      auctionSourceCount: candidate.value.auctionSourceCount,
      adp: candidate.adp?.adp ?? null,
      adpSourceCount: candidate.adp?.sourceCount ?? 0,
      affordability: candidate.affordability,
      targetLow: preference?.preferredEntry ?? null,
      targetHigh: preference?.plannedCap ?? null,
      stretchMax: candidate.budgetSafeMax,
      category,
      why: buildWhy(category, candidate),
      score: Math.round(scorer(candidate) * 1000) / 10,
    });
  };

  const categoryScorers: Record<RecommendedNowCategory, (candidate: Candidate) => number> = {
    "BEST OVERALL": (candidate) => candidate.score,
    "BEST VALUE": (candidate) => weightedScore([
    [candidate.valueEdge, 70],
    [candidate.valuePercentile, 20],
    [candidate.affordabilityScore, 10],
    ]),
    "ROSTER FIT": (candidate) => weightedScore([
    [candidate.rosterFit, 70],
    [candidate.score, 20],
    [candidate.affordabilityScore, 10],
    ]),
    "SCARCITY PLAY": (candidate) => weightedScore([
    [candidate.scarcity, 60],
    [candidate.valuePercentile, 25],
    [candidate.affordabilityScore, 15],
    ]),
    "BUDGET PLAY": (candidate) => weightedScore([
    [candidate.affordabilityScore, 60],
    [candidate.valueEdge, 25],
    [candidate.preference ? preferenceScore(candidate.preference) : 0, 15],
    ]),
    "UPSIDE PLAY": () => 0,
  };
  select("BEST OVERALL", categoryScorers["BEST OVERALL"]);
  select("BEST VALUE", categoryScorers["BEST VALUE"], (candidate) => candidate.bestValueEligible);
  select("ROSTER FIT", categoryScorers["ROSTER FIT"]);
  select("SCARCITY PLAY", categoryScorers["SCARCITY PLAY"]);
  select("BUDGET PLAY", categoryScorers["BUDGET PLAY"]);

  const unavailableCategories: RecommendedNowCategory[] = ["UPSIDE PLAY"];
  warnings.push("UPSIDE PLAY is unavailable because no approved upside input exists in the current War Room data.");
  if (recommendations.length < 5) warnings.push("Fewer than five defensible distinct recommendations were available.");
  const result: RecommendedNowResult = {
    status: warnings.length > 0 ? "partial" : "ready",
    version: RECOMMENDATION_ENGINE_VERSION,
    generatedAt: now,
    recommendations,
    unavailableCategories,
    warnings,
    sources: {
      auction: "Published River City five-source auction consensus",
      adp: "Published River City five-source ADP consensus",
      availability: "Sleeper completed purchases/keepers plus authorized War Room purchases",
      roster: "Scoped War Room keeper and purchase state",
      budget: "River City auction budget and minimum-roster max-bid calculation",
    },
    policies: { bestValueEligibility: BEST_VALUE_ELIGIBILITY_POLICY_VERSION },
  };
  if (options.diagnostic) {
    const diagnosticPositions = ["QB", "RB", "WR", "TE", "K", "DEF"];
    const counts = Object.fromEntries(
      diagnosticPositions.map((position) => [position, rayPositionCounts[position] ?? 0])
    );
    const availableCounts = Object.fromEntries(
      diagnosticPositions.map((position) => [
        position,
        candidates.filter((candidate) => normalizePosition(candidate.value.position) === position).length,
      ])
    );
    const scarcity = Object.fromEntries(
      ["QB", "RB", "WR", "TE"].map((position) => {
        const valuesForPosition = valuesByPosition.get(position) ?? [];
        const topAuctionConsensus = valuesForPosition.length ? Math.max(...valuesForPosition) : null;
        const threshold65 = topAuctionConsensus === null ? null : topAuctionConsensus * 0.65;
        const countAtOrAboveThreshold = threshold65 === null
          ? 0
          : valuesForPosition.filter((value) => value >= threshold65).length;
        const normalizedScarcity = threshold65 === null
          ? null
          : clamp(1 - Math.max(countAtOrAboveThreshold - 1, 0) / 5);
        return [position, { topAuctionConsensus, threshold65, countAtOrAboveThreshold, normalizedScarcity }];
      })
    );
    const traces = recommendations.flatMap((recommendation) => {
      const candidate = candidates.find((item) => item.value.playerId === recommendation.playerId);
      if (!candidate) return [];
      const privatePreference = preferenceScore(candidate.preference);
      const categoryScore = categoryScorers[recommendation.category](candidate);
      return [{
        playerId: recommendation.playerId,
        playerName: recommendation.playerName,
        category: recommendation.category,
        auctionValuePercentile: candidate.valuePercentile,
        adpDemandPercentile: candidate.demandPercentile,
        scarcity: candidate.scarcity,
        rosterFit: candidate.rosterFit,
        affordability: candidate.affordability,
        bestValueEligible: candidate.bestValueEligible,
        bestValueEligibilityReasons: candidate.bestValueEligibilityReasons,
        privatePreference,
        leaguePressure: candidate.leaguePressure,
        weightedContributions: {
          auctionValue: candidate.valuePercentile * 0.25,
          adpDemand: candidate.demandPercentile === null ? null : candidate.demandPercentile * 0.15,
          scarcity: candidate.scarcity * 0.15,
          rosterFit: candidate.rosterFit * 0.20,
          affordability: candidate.affordabilityScore * 0.15,
          privatePreference: privatePreference * 0.05,
          leaguePressure: candidate.leaguePressure * 0.05,
        },
        finalScore: candidate.score,
        categoryScore,
      }];
    });
    result.diagnostic = {
      temporary: true,
      roster: {
        counts,
        totalCount: rayPurchases.length,
        rosterSlotsRemaining,
        remainingBudget,
        budgetSafeMax,
        keeperCount: rayPurchases.filter((purchase) => purchase.isKeeper).length,
        completedPurchaseCount: rayPurchases.filter((purchase) => !purchase.isKeeper).length,
      },
      qbGuidance: {
        starterRequirement: defaultStarterPlan.coreStarters.QB,
        totalDepthTarget: defaultBenchDepthTargets.QB,
        currentCount: rayPositionCounts.QB ?? 0,
        starterNeed: (starterNeeds.find((need) => need.label === "QB")?.needed ?? 0) > 0,
        depthNeed: Math.max(defaultBenchDepthTargets.QB - (rayPositionCounts.QB ?? 0), 0) > 0,
      },
      availablePool: { total: candidates.length, counts: availableCounts },
      scarcity,
      traces,
    };
  }
  return result;
}
