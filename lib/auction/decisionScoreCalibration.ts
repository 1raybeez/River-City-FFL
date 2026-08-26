export type CalibrationPlayer = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  auctionConsensus: number;
  auctionSourceCount: number;
  auctionConfidenceScore: number | null;
  auctionLow: number | null;
  auctionHigh: number | null;
  adp: number | null;
  adpSourceCount: number;
};

export type CalibrationModelName =
  | "MODEL A"
  | "MODEL B"
  | "MODEL C"
  | "MODEL D"
  | "MODEL E"
  | "CONTROL AUCTION"
  | "CONTROL ADP"
  | "CURRENT BEST-OVERALL APPROXIMATION";

export type CalibrationWeights = {
  auction: number;
  adp: number;
  quality: number;
};

export type CalibrationComponents = {
  auction: number;
  adp: number | null;
  quality: number;
};

export type CalibrationRow = CalibrationPlayer & {
  components: CalibrationComponents;
  score: number;
  rank: number;
};

export const CALIBRATION_MODELS: Readonly<Record<CalibrationModelName, CalibrationWeights | null>> = {
  "MODEL A": { auction: 50, adp: 35, quality: 15 },
  "MODEL B": { auction: 55, adp: 30, quality: 15 },
  "MODEL C": { auction: 60, adp: 30, quality: 10 },
  "MODEL D": { auction: 65, adp: 25, quality: 10 },
  "MODEL E": { auction: 70, adp: 20, quality: 10 },
  "CONTROL AUCTION": null,
  "CONTROL ADP": null,
  // Equivalent to the production market-related 25:15 ratio after normalization.
  "CURRENT BEST-OVERALL APPROXIMATION": { auction: 62.5, adp: 37.5, quality: 0 },
};

export const QUALITY_WEIGHT_VARIANTS = {
  "QUALITY 0%": { auction: 66.7, adp: 33.3, quality: 0 },
  "QUALITY 5%": { auction: 63.3, adp: 31.7, quality: 5 },
  "QUALITY 10%": { auction: 60, adp: 30, quality: 10 },
  "QUALITY 15%": { auction: 56.7, adp: 28.3, quality: 15 },
} as const satisfies Record<string, CalibrationWeights>;

export type RayModifierSystem = {
  rosterMaximum: number;
  scarcityMaximum: number;
  budgetMaximum: number;
  totalMaximum: number;
  budgetMode: "MODIFIER" | "GATE";
};

export const RAY_MODIFIER_SYSTEMS = {
  "SYSTEM A": { rosterMaximum: 5, scarcityMaximum: 3, budgetMaximum: 2, totalMaximum: 10, budgetMode: "MODIFIER" },
  "SYSTEM B": { rosterMaximum: 5, scarcityMaximum: 2, budgetMaximum: 0, totalMaximum: 7, budgetMode: "GATE" },
  "SYSTEM C": { rosterMaximum: 7, scarcityMaximum: 3, budgetMaximum: 0, totalMaximum: 10, budgetMode: "GATE" },
} as const satisfies Record<string, RayModifierSystem>;

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function percentileRank(value: number, values: readonly number[]) {
  if (values.length <= 1) return 1;
  return values.filter((candidate) => candidate < value).length / (values.length - 1);
}

function inversePercentileRank(value: number, values: readonly number[]) {
  return 1 - percentileRank(value, values);
}

function coverageScore(sourceCount: number, expectedSources = 5) {
  return clamp((Math.max(0, sourceCount) / expectedSources) * 100);
}

/**
 * The generated masterview confidence is evidence quality, not player quality.
 * It already incorporates source/match confidence and spread-related penalties.
 * This transparent calibration quality score combines that value with coverage
 * and ADP coverage without allowing missing ADP to become a silent zero.
 */
export function calculateQualityScore(player: CalibrationPlayer) {
  const auctionCoverage = coverageScore(player.auctionSourceCount);
  const auctionConfidence = player.auctionConfidenceScore ?? auctionCoverage;
  const auctionEvidence = (auctionCoverage + clamp(auctionConfidence)) / 2;
  if (player.adp === null) return round(auctionEvidence);

  const adpEvidence = coverageScore(player.adpSourceCount);
  return round((auctionEvidence + adpEvidence) / 2);
}

export function normalizeCalibrationPlayers(players: readonly CalibrationPlayer[]) {
  const auctionValues = players.map((player) => player.auctionConsensus);
  const adpValues = players
    .map((player) => player.adp)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return players.map((player) => ({
    player,
    components: {
      auction: round(percentileRank(player.auctionConsensus, auctionValues) * 100),
      adp: player.adp === null ? null : round(inversePercentileRank(player.adp, adpValues) * 100),
      quality: calculateQualityScore(player),
    },
  }));
}

export function scoreWithWeights(
  components: CalibrationComponents,
  weights: CalibrationWeights,
  missingAdpTreatment: "PROPORTIONAL" | "NEUTRAL" = "PROPORTIONAL"
) {
  const usable: Array<[number, number]> = [[components.auction, weights.auction], [components.quality, weights.quality]];
  if (components.adp !== null) {
    usable.push([components.adp, weights.adp]);
  } else if (missingAdpTreatment === "NEUTRAL") {
    usable.push([50, weights.adp]);
  }
  const totalWeight = usable.reduce((sum, [, weight]) => sum + weight, 0);
  return round(usable.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight);
}

export function scoreCalibrationModel(
  players: readonly CalibrationPlayer[],
  model: CalibrationModelName,
  missingAdpTreatment: "PROPORTIONAL" | "NEUTRAL" = "PROPORTIONAL"
): CalibrationRow[] {
  const normalized = normalizeCalibrationPlayers(players);
  const weights = CALIBRATION_MODELS[model];
  const rows = normalized.map(({ player, components }) => {
    let score: number;
    if (model === "CONTROL AUCTION") score = components.auction;
    else if (model === "CONTROL ADP") score = components.adp ?? 0;
    else score = scoreWithWeights(components, weights!, missingAdpTreatment);
    return { ...player, components, score: clamp(score) };
  });

  return rows
    .sort((first, second) => second.score - first.score || second.auctionConsensus - first.auctionConsensus || first.playerName.localeCompare(second.playerName))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function rankByPlayerId(rows: readonly CalibrationRow[]) {
  return new Map(rows.map((row) => [row.playerId, row.rank]));
}

export function spearmanRankCorrelation(first: readonly CalibrationRow[], second: readonly CalibrationRow[]) {
  const secondRanks = rankByPlayerId(second);
  const paired = first.filter((row) => secondRanks.has(row.playerId));
  if (paired.length <= 1) return 1;
  const n = paired.length;
  const squaredDifference = paired.reduce((sum, row) => {
    const difference = row.rank - secondRanks.get(row.playerId)!;
    return sum + difference * difference;
  }, 0);
  return round(1 - (6 * squaredDifference) / (n * (n * n - 1)), 3);
}

export function topSet(rows: readonly CalibrationRow[], limit: number) {
  return new Set(rows.slice(0, limit).map((row) => row.playerId));
}

export function movementAgainstAnchor(
  candidate: readonly CalibrationRow[],
  anchor: readonly CalibrationRow[]
) {
  const anchorRanks = rankByPlayerId(anchor);
  return candidate
    .filter((row) => anchorRanks.has(row.playerId))
    .map((row) => ({ ...row, rankChange: anchorRanks.get(row.playerId)! - row.rank }))
    .sort((first, second) => second.rankChange - first.rankChange || first.playerName.localeCompare(second.playerName));
}

export function disagreementGroup(row: CalibrationRow) {
  if (row.components.adp === null) return "AUCTION ONLY";
  const difference = row.components.auction - row.components.adp;
  if (difference >= 25) return "AUCTION LOVES MORE THAN ADP";
  if (difference <= -25) return "ADP LOVES MORE THAN AUCTION";
  if (row.components.auction >= 70 && row.components.adp >= 70) return "BOTH STRONGLY AGREE";
  if (row.components.auction <= 40 && row.components.adp <= 40) return "BOTH WEAK";
  return "MIXED";
}

export type SimulatedModifierScenario = {
  name: string;
  rosterFit: number;
  scarcity: number;
  budgetFit: number;
};

export function applySimulatedModifiers(baseScore: number, scenario: SimulatedModifierScenario) {
  return clamp(round(baseScore + scenario.rosterFit + scenario.scarcity + scenario.budgetFit));
}

export function calculateLiveOpportunity(consensus: number, currentBid: number) {
  const absoluteDifference = round(consensus - currentBid);
  const percentageDifference = consensus === 0 ? null : round((absoluteDifference / consensus) * 100);
  return { absoluteDifference, percentageDifference };
}

export const SHADOW_LIVE_OPPORTUNITY_BANDS = [
  { name: "SMASH VALUE", minimumPercentage: 25, minimumDollars: 5 },
  { name: "STRONG VALUE", minimumPercentage: 15, minimumDollars: 4 },
  { name: "VALUE", minimumPercentage: 7.5, minimumDollars: 2 },
  { name: "FAIR", minimumPercentage: 0, minimumDollars: 0 },
  { name: "STRETCH", minimumPercentage: 7.5, minimumDollars: 2 },
  { name: "OVERPAY", minimumPercentage: 15, minimumDollars: 4 },
  { name: "HEAVY OVERPAY", minimumPercentage: 25, minimumDollars: 5 },
] as const;

export type ShadowLiveOpportunityBand = typeof SHADOW_LIVE_OPPORTUNITY_BANDS[number]["name"];

export function classifyShadowLiveOpportunity(consensus: number, currentBid: number): ShadowLiveOpportunityBand {
  const { absoluteDifference, percentageDifference } = calculateLiveOpportunity(consensus, currentBid);
  if (percentageDifference === null) return "FAIR";
  const dollars = Math.abs(absoluteDifference);
  const percentage = Math.abs(percentageDifference);
  if (absoluteDifference >= 0) {
    if (percentage >= 25 && dollars >= 5) return "SMASH VALUE";
    if (percentage >= 15 && dollars >= 4) return "STRONG VALUE";
    if (percentage >= 7.5 && dollars >= 2) return "VALUE";
    return "FAIR";
  }
  if (percentage >= 25 && dollars >= 5) return "HEAVY OVERPAY";
  if (percentage >= 15 && dollars >= 4) return "OVERPAY";
  if (percentage >= 7.5 && dollars >= 2) return "STRETCH";
  return "FAIR";
}

export function scoreQualityVariant(
  players: readonly CalibrationPlayer[],
  variant: keyof typeof QUALITY_WEIGHT_VARIANTS,
  missingAdpTreatment: "PROPORTIONAL" | "NEUTRAL" = "PROPORTIONAL"
) {
  return normalizeCalibrationPlayers(players)
    .map(({ player, components }) => ({
      ...player,
      components,
      score: scoreWithWeights(components, QUALITY_WEIGHT_VARIANTS[variant], missingAdpTreatment),
    }))
    .sort((first, second) => second.score - first.score || second.auctionConsensus - first.auctionConsensus || first.playerName.localeCompare(second.playerName))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export type RayModifierInput = {
  marketScore: number;
  rosterFit: number;
  scarcity: number;
  budgetFit: number;
  affordability: "AFFORDABLE" | "STRETCH" | "NOT_REALISTIC";
};

export function applyRayModifierSystem(input: RayModifierInput, system: RayModifierSystem) {
  if (input.affordability === "NOT_REALISTIC") return null;
  const roster = clamp(input.rosterFit, -system.rosterMaximum, system.rosterMaximum);
  const scarcity = clamp(input.scarcity, -system.scarcityMaximum, system.scarcityMaximum);
  const budget = system.budgetMode === "MODIFIER"
    ? clamp(input.budgetFit, -system.budgetMaximum, system.budgetMaximum)
    : 0;
  const total = clamp(roster + scarcity + budget, -system.totalMaximum, system.totalMaximum);
  return { roster, scarcity, budget, total, score: clamp(round(input.marketScore + total)) };
}
