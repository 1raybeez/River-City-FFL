import type { CurrentSeasonPlayerValue } from "./currentValue";
import { buildLineupImpact, type LineupImpactResult } from "./lineupImpact";
import type { TradeComparisonPlayer } from "./types";
import { buildDepthQuality, type DepthQualityMap } from "./depthQuality";

export type ShadowRecommendation = "ACCEPT" | "LEAN_ACCEPT" | "HOLD" | "LEAN_DECLINE" | "DECLINE" | "INSUFFICIENT_DATA";
export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type LineupDirection = "STRONG_IMPROVEMENT" | "IMPROVEMENT" | "NEUTRAL" | "DECLINE" | "STRONG_DECLINE" | "UNKNOWN";
export type PositionalState = "NEED" | "THIN" | "ADEQUATE" | "SURPLUS";
export type KeeperAssessment = "STRONG_POSITIVE" | "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "STRONG_NEGATIVE" | "UNKNOWN";
export type FairnessRelationship = "SUPPORTS" | "NEUTRAL" | "CONFLICTS" | "UNAVAILABLE";
export type LeagueTradeOwnershipStatus = "VALID" | "INVALID_OWNERSHIP" | "MULTIPLE_COUNTERPARTIES" | "MISSING_OWNER" | "UNKNOWN_PLAYER";
export type LineupEvidenceDirection = "IMPROVES" | "DECLINES" | "SAME" | "UNKNOWN";
export type RecommendationSeasonMode = "PRESEASON" | "EARLY_SEASON" | "MID_SEASON" | "LATE_SEASON";
export type PreseasonContextRelevance = "MEANINGFUL_SUPPORT" | "TIEBREAKER_ONLY" | "HISTORICAL_CONTEXT" | "DISPLAY_ONLY";
export type EvidencePolarity = "POSITIVE" | "NEGATIVE" | "NEUTRAL";

const REASON_POLARITY: Record<string, EvidencePolarity> = {
  STARTING_LINEUP_IMPROVES: "POSITIVE", STARTING_LINEUP_DECLINES: "NEGATIVE", FILLS_POSITIONAL_NEED: "POSITIVE", CREATES_POSITIONAL_HOLE: "NEGATIVE", MARKET_VALUE_GAIN: "POSITIVE", MARKET_VALUE_LOSS: "NEGATIVE", DEPTH_IMPROVES: "POSITIVE", DEPTH_DECLINES: "NEGATIVE", KEEPER_VALUE_GAIN: "POSITIVE", KEEPER_VALUE_LOSS: "NEGATIVE", EXPERT_MARKET_AGREE: "POSITIVE", EXPERT_MARKET_CONFLICT: "NEGATIVE", STARTER_EVIDENCE_CONFLICT: "NEUTRAL", LOW_ROS_CONFIDENCE: "NEUTRAL", STALE_MARKET_DATA: "NEUTRAL", INCOMPLETE_KEEPER_DATA: "NEUTRAL", FAIRNESS_SUPPORTS: "NEUTRAL",
};

export function reasonPolarity(reasonCode: string): EvidencePolarity { return REASON_POLARITY[reasonCode] ?? "NEUTRAL"; }

export type ExpertRosEvidence = {
  playerId: string;
  playerName: string;
  consensusOverallRank: number | null;
  consensusPositionalRank: number | null;
  sourceCount: number;
  staleSourceCount?: number;
  generatedAt?: string | null;
  freshness: "FRESH" | "AGING" | "STALE" | "UNKNOWN";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  sourceRanks: Array<{ source: string; overallRank: number | null; positionalRank: number | null }>;
};

export type TradeMarketEvidence = {
  playerId: string;
  fantasyCalcValue: number;
  overallRank: number | null;
  positionalRank: number | null;
  trend30Day: number | null;
  generatedAt: string;
  freshness: "FRESH" | "AGING" | "STALE" | "UNKNOWN";
};

export type KeeperEvidence = {
  playerId: string;
  playerName: string;
  projectedCost: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
};

export type FairnessEvidence = {
  score: number | null;
  verdict: string | null;
  leadingSide: "A" | "B" | null;
  available: boolean;
};

export type RecommendationInput = {
  franchiseId: string;
  franchiseName: string;
  rosterBefore: readonly TradeComparisonPlayer[];
  outgoing: readonly TradeComparisonPlayer[];
  incoming: readonly TradeComparisonPlayer[];
  currentValues: ReadonlyMap<string, CurrentSeasonPlayerValue>;
  expertRos: ReadonlyMap<string, ExpertRosEvidence>;
  tradeMarket: ReadonlyMap<string, TradeMarketEvidence>;
  keeper: ReadonlyMap<string, KeeperEvidence>;
  starterSlots: readonly string[];
  fairness?: FairnessEvidence | null;
  now?: string;
  seasonMode?: RecommendationSeasonMode;
  preseasonContext?: { auctionConsensus: number | null; adp: number | null };
};

export type LeagueTradeOwnershipInput = {
  sendingFranchiseId: string;
  receivingFranchiseId: string;
  outgoing: readonly TradeComparisonPlayer[];
  incoming: readonly TradeComparisonPlayer[];
  currentRosters: ReadonlyMap<string, readonly TradeComparisonPlayer[]>;
};

export type LeagueTradeOwnershipResult = {
  status: LeagueTradeOwnershipStatus;
  invalidPlayerIds: string[];
  ownerByPlayerId: Record<string, string | null>;
  message: string | null;
};

export type RecommendationResult = {
  franchiseId: string;
  franchiseName: string;
  recommendation: ShadowRecommendation;
  confidence: RecommendationConfidence;
  summary: string;
  primaryReasons: string[];
  counterweights: string[];
  supportingReasons: string[];
  transactionChanges: Array<{ playerId: string; playerName: string; direction: "OUTGOING" | "INCOMING"; wasStarterBefore: boolean; isStarterAfter: boolean }>;
  starterChanges: Array<{ slot: string; before: string | null; after: string | null; evidenceDirection: LineupEvidenceDirection }>;
  lineupImpact: LineupImpactResult & { direction: LineupDirection; coreCompleteness: "CORE_COMPLETE" | "CORE_PARTIAL"; fullCompleteness: "FULL_COMPLETE" | "FULL_PARTIAL"; startersEntering: string[]; startersLeaving: string[]; changes: Array<{ slot: string; before: string | null; after: string | null; evidenceDirection: LineupEvidenceDirection }> };
  positionalImpact: { before: Record<string, PositionalState>; after: Record<string, PositionalState>; improvements: string[]; regressions: string[] };
  expertRos: { outgoing: ExpertRosEvidence[]; incoming: ExpertRosEvidence[]; packageAssessment: "INCOMING_STRONGER" | "OUTGOING_STRONGER" | "MIXED" | "NOT_COMPARABLE"; confidence: RecommendationConfidence };
  tradeMarket: { outgoingValue: number | null; incomingValue: number | null; difference: number | null; direction: "GAIN" | "LOSS" | "NEUTRAL" | "UNAVAILABLE"; trends: Array<{ playerId: string; trend30Day: number | null; freshness: string }> };
  keeperImpact: { outgoing: KeeperEvidence[]; incoming: KeeperEvidence[]; assessment: KeeperAssessment };
  fairness: { score: number | null; verdict: string | null; relationshipToRecommendation: FairnessRelationship };
  reasonCodes: string[];
  dataQuality: { expertRos: RecommendationConfidence; tradeMarket: RecommendationConfidence; lineup: RecommendationConfidence; keeper: RecommendationConfidence; fairness: RecommendationConfidence };
  warnings: string[];
  seasonMode: RecommendationSeasonMode;
  preseasonContext: { auctionConsensus: number | null; adp: number | null; relevance: PreseasonContextRelevance };
  whyILikeIt: string[];
  whatGivesMePause: string[];
  bottomLine: string;
  depthQuality: { before: DepthQualityMap; after: DepthQualityMap; changes: string[] };
};

function ids(players: readonly TradeComparisonPlayer[]) { return new Set(players.map((player) => player.playerId)); }
function playerLabel(player: TradeComparisonPlayer) { return player.name ?? player.playerId; }

function preseasonRelevance(mode: RecommendationSeasonMode): PreseasonContextRelevance {
  if (mode === "PRESEASON") return "MEANINGFUL_SUPPORT";
  if (mode === "EARLY_SEASON") return "TIEBREAKER_ONLY";
  if (mode === "MID_SEASON") return "HISTORICAL_CONTEXT";
  return "DISPLAY_ONLY";
}

export function validateLeagueTradeOwnership(input: LeagueTradeOwnershipInput): LeagueTradeOwnershipResult {
  const ownerByPlayerId: Record<string, string | null> = {};
  for (const [franchiseId, players] of input.currentRosters) {
    for (const player of players) ownerByPlayerId[player.playerId] = ownerByPlayerId[player.playerId] && ownerByPlayerId[player.playerId] !== franchiseId ? null : franchiseId;
  }
  const outgoingIds = input.outgoing.map((player) => player.playerId);
  const incomingIds = input.incoming.map((player) => player.playerId);
  const unknown = [...outgoingIds, ...incomingIds].filter((playerId) => !(playerId in ownerByPlayerId));
  if (unknown.length) return { status: "UNKNOWN_PLAYER", invalidPlayerIds: [...new Set(unknown)], ownerByPlayerId, message: "Every League Trade asset must be present in the authoritative roster map." };
  const owners = [...new Set([...outgoingIds, ...incomingIds].map((playerId) => ownerByPlayerId[playerId]))];
  if (owners.some((owner) => owner === null)) return { status: "MISSING_OWNER", invalidPlayerIds: [...new Set([...outgoingIds, ...incomingIds].filter((playerId) => ownerByPlayerId[playerId] === null))], ownerByPlayerId, message: "A player has no unique current owner." };
  const outgoingInvalid = outgoingIds.filter((playerId) => ownerByPlayerId[playerId] !== input.sendingFranchiseId);
  const incomingInvalid = incomingIds.filter((playerId) => ownerByPlayerId[playerId] !== input.receivingFranchiseId);
  const thirdParty = [...new Set([...outgoingIds, ...incomingIds].map((playerId) => ownerByPlayerId[playerId]).filter((owner): owner is string => Boolean(owner) && owner !== input.sendingFranchiseId && owner !== input.receivingFranchiseId))];
  if (thirdParty.length) return { status: "MULTIPLE_COUNTERPARTIES", invalidPlayerIds: [...new Set([...outgoingInvalid, ...incomingInvalid])], ownerByPlayerId, message: "A two-team League Trade contains an asset owned by a third franchise." };
  if (outgoingInvalid.length || incomingInvalid.length) return { status: "INVALID_OWNERSHIP", invalidPlayerIds: [...new Set([...outgoingInvalid, ...incomingInvalid])], ownerByPlayerId, message: "Each outgoing and incoming asset must belong to the corresponding current franchise." };
  return { status: "VALID", invalidPlayerIds: [], ownerByPlayerId, message: null };
}

function compareOrdinalRanks(before: readonly (number | null)[], after: readonly (number | null)[]): -1 | 0 | 1 | null {
  if (before.length === 0 || after.length === 0 || before.some((rank) => rank === null) || after.some((rank) => rank === null)) return null;
  const left = [...before].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const right = [...after].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const width = Math.max(left.length, right.length);
  for (let index = 0; index < width; index += 1) {
    const a = left[index] ?? Infinity;
    const b = right[index] ?? Infinity;
    if (a !== b) return b < a ? 1 : -1;
  }
  return 0;
}

function slotDirection(before: LineupImpactResult["before"]["slots"][number] | undefined, after: LineupImpactResult["after"]["slots"][number] | undefined): LineupEvidenceDirection {
  if (!before || !after) return "UNKNOWN";
  if (!before.playerId && !after.playerId) return "UNKNOWN";
  if (before.playerId === after.playerId) return "SAME";
  if (before.rank !== null && after.rank !== null) return after.rank < before.rank ? "IMPROVES" : after.rank > before.rank ? "DECLINES" : "SAME";
  if (before.value !== null && after.value !== null) return after.value > before.value ? "IMPROVES" : after.value < before.value ? "DECLINES" : "SAME";
  return "UNKNOWN";
}

function optimizedUnitDirection(lineup: LineupImpactResult): LineupDirection {
  if (lineup.startingUnitAdded.length === 0 && lineup.startingUnitRemoved.length === 0) return "NEUTRAL";
  if (lineup.starterValueDelta !== null) return lineup.starterValueDelta > 0 ? "IMPROVEMENT" : lineup.starterValueDelta < 0 ? "DECLINE" : "NEUTRAL";
  const added = lineup.after.slots.filter((slot) => slot.playerId && lineup.startingUnitAdded.some((player) => player.playerId === slot.playerId));
  const removed = lineup.before.slots.filter((slot) => slot.playerId && lineup.startingUnitRemoved.some((player) => player.playerId === slot.playerId));
  const addedRanks = added.map((slot) => slot.rank).filter((rank): rank is number => rank !== null);
  const removedRanks = removed.map((slot) => slot.rank).filter((rank): rank is number => rank !== null);
  if (!addedRanks.length || !removedRanks.length) return "UNKNOWN";
  const addedBest = Math.min(...addedRanks);
  const removedBest = Math.min(...removedRanks);
  return addedBest < removedBest ? "IMPROVEMENT" : addedBest > removedBest ? "DECLINE" : "NEUTRAL";
}

function depthDirection(before: DepthQualityMap, after: DepthQualityMap): LineupEvidenceDirection {
  const order: Record<string, number> = { THIN: 0, REPLACEMENT_DEPTH: 1, VIABLE_DEPTH: 2, HIGH_VALUE_DEPTH: 3, STARTER: 4 };
  const changes = Object.keys(after).map((position) => (order[after[position]] ?? 0) - (order[before[position]] ?? 0));
  const positive = changes.filter((change) => change > 0).length;
  const negative = changes.filter((change) => change < 0).length;
  return positive && !negative ? "IMPROVES" : negative && !positive ? "DECLINES" : "UNKNOWN";
}

function positionState(players: readonly TradeComparisonPlayer[], allocation: LineupImpactResult["after"], starterSlots: readonly string[], values: ReadonlyMap<string, CurrentSeasonPlayerValue>): Record<string, PositionalState> {
  const positions = ["QB", "RB", "WR", "TE", "K", "DEF"];
  return Object.fromEntries(positions.map((position) => {
    const required = starterSlots.filter((slot) => slot === position).length;
    const viable = players.filter((player) => player.position === position && (values.get(player.playerId)?.overallRank !== null || values.get(player.playerId)?.currentValueScore !== null));
    const starters = allocation.slots.filter((slot) => slot.playerId && players.find((player) => player.playerId === slot.playerId)?.position === position).length;
    const depth = Math.max(0, viable.length - starters);
    const state: PositionalState = starters < required ? "NEED" : depth === 0 ? "THIN" : depth >= 2 ? "SURPLUS" : "ADEQUATE";
    return [position, state];
  }));
}

function packageRosAssessment(outgoing: readonly ExpertRosEvidence[], incoming: readonly ExpertRosEvidence[]) {
  const outgoingRanks = outgoing.map((row) => row.consensusOverallRank).filter((rank): rank is number => rank !== null);
  const incomingRanks = incoming.map((row) => row.consensusOverallRank).filter((rank): rank is number => rank !== null);
  if (!outgoingRanks.length || !incomingRanks.length) return "NOT_COMPARABLE" as const;
  const result = outgoingRanks.length === incomingRanks.length
    ? compareOrdinalRanks(outgoingRanks, incomingRanks)
    : (incomingRanks.reduce((sum, rank) => sum + rank, 0) / incomingRanks.length) < (outgoingRanks.reduce((sum, rank) => sum + rank, 0) / outgoingRanks.length) ? 1 : (incomingRanks.reduce((sum, rank) => sum + rank, 0) / incomingRanks.length) > (outgoingRanks.reduce((sum, rank) => sum + rank, 0) / outgoingRanks.length) ? -1 : 0;
  return result === 1 ? "INCOMING_STRONGER" as const : result === -1 ? "OUTGOING_STRONGER" as const : "MIXED" as const;
}

function confidenceFor(input: RecommendationInput, lineup: LineupImpactResult, allPlayers: readonly TradeComparisonPlayer[]): RecommendationConfidence {
  const expert = allPlayers.map((player) => input.expertRos.get(player.playerId));
  const market = allPlayers.map((player) => input.tradeMarket.get(player.playerId));
  const keeper = allPlayers.map((player) => input.keeper.get(player.playerId));
  const expertFresh = expert.every((row) => row && row.freshness === "FRESH");
  const expertTwo = expert.every((row) => row && row.sourceCount >= 2);
  const marketComplete = market.every(Boolean) && market.every((row) => row?.freshness === "FRESH");
  const keeperComplete = keeper.every((row) => row && row.projectedCost !== null && row.confidence !== "UNAVAILABLE");
  if (lineup.status === "UNAVAILABLE") return "INSUFFICIENT";
  if (lineup.status === "COMPLETE" && expertFresh && expertTwo && marketComplete && keeperComplete) return "HIGH";
  if (expertFresh && expert.every(Boolean)) return marketComplete && lineup.status === "COMPLETE" ? "MEDIUM" : "LOW";
  if (expert.some((row) => row && row.sourceCount >= 1)) return "LOW";
  return "INSUFFICIENT";
}

function marketAssessment(outgoing: readonly TradeMarketEvidence[], incoming: readonly TradeMarketEvidence[]) {
  const outgoingValue = outgoing.length && outgoing.every((row) => Number.isFinite(row.fantasyCalcValue)) ? outgoing.reduce((sum, row) => sum + row.fantasyCalcValue, 0) : null;
  const incomingValue = incoming.length && incoming.every((row) => Number.isFinite(row.fantasyCalcValue)) ? incoming.reduce((sum, row) => sum + row.fantasyCalcValue, 0) : null;
  const difference = outgoingValue !== null && incomingValue !== null ? incomingValue - outgoingValue : null;
  return { outgoingValue, incomingValue, difference, direction: difference === null ? "UNAVAILABLE" as const : difference > 0 ? "GAIN" as const : difference < 0 ? "LOSS" as const : "NEUTRAL" as const };
}

function keeperAssessment(outgoing: readonly KeeperEvidence[], incoming: readonly KeeperEvidence[]): KeeperAssessment {
  if (!outgoing.length || !incoming.length || outgoing.some((row) => row.projectedCost === null) || incoming.some((row) => row.projectedCost === null)) return "UNKNOWN";
  const sent = outgoing.reduce((sum, row) => sum + (row.projectedCost ?? 0), 0);
  const received = incoming.reduce((sum, row) => sum + (row.projectedCost ?? 0), 0);
  return received < sent ? "POSITIVE" : received > sent ? "NEGATIVE" : "NEUTRAL";
}

function fairnessRelationship(fairness: FairnessEvidence | null | undefined, recommendation: ShadowRecommendation): FairnessRelationship {
  if (!fairness?.available) return "UNAVAILABLE";
  if (recommendation === "HOLD" || recommendation === "INSUFFICIENT_DATA") return "NEUTRAL";
  const fairnessFavorsIncoming = fairness.leadingSide === "A";
  const recommendationAccepts = recommendation === "ACCEPT" || recommendation === "LEAN_ACCEPT";
  return fairnessFavorsIncoming === recommendationAccepts ? "SUPPORTS" : "CONFLICTS";
}

export function evaluateShadowRecommendation(input: RecommendationInput): RecommendationResult {
  const now = input.now ?? new Date().toISOString();
  const sentIds = ids(input.outgoing);
  const afterRoster = [...input.rosterBefore.filter((player) => !sentIds.has(player.playerId)), ...input.incoming];
  const lineup = buildLineupImpact({ beforePlayers: input.rosterBefore, afterPlayers: afterRoster, currentValues: input.currentValues, starterSlots: input.starterSlots });
  const starterChanges = input.starterSlots.map((slot, index) => ({ slot, before: lineup.before.slots[index]?.playerName ?? null, after: lineup.after.slots[index]?.playerName ?? null, evidenceDirection: slotDirection(lineup.before.slots[index], lineup.after.slots[index]) }));
  const direction = optimizedUnitDirection(lineup);
  const beforeIds = new Set(lineup.before.slots.flatMap((slot) => slot.playerId ? [slot.playerId] : []));
  const afterIds = new Set(lineup.after.slots.flatMap((slot) => slot.playerId ? [slot.playerId] : []));
  const coreSlots = input.starterSlots.map((slot, index) => ({ slot, row: starterChanges[index] })).filter(({ slot }) => !["K", "DEF"].includes(slot));
  const coreCompleteness = coreSlots.every(({ row }) => row.evidenceDirection !== "UNKNOWN") ? "CORE_COMPLETE" as const : "CORE_PARTIAL" as const;
  const fullCompleteness = starterChanges.every((row) => row.evidenceDirection !== "UNKNOWN") ? "FULL_COMPLETE" as const : "FULL_PARTIAL" as const;
  const startersEntering = [...afterIds].filter((playerId) => !beforeIds.has(playerId));
  const startersLeaving = [...beforeIds].filter((playerId) => !afterIds.has(playerId));
  const allPlayers = [...input.outgoing, ...input.incoming];
  const outgoingRos = input.outgoing.map((player) => input.expertRos.get(player.playerId)).filter((row): row is ExpertRosEvidence => Boolean(row));
  const incomingRos = input.incoming.map((player) => input.expertRos.get(player.playerId)).filter((row): row is ExpertRosEvidence => Boolean(row));
  const outgoingMarket = input.outgoing.map((player) => input.tradeMarket.get(player.playerId)).filter((row): row is TradeMarketEvidence => Boolean(row));
  const incomingMarket = input.incoming.map((player) => input.tradeMarket.get(player.playerId)).filter((row): row is TradeMarketEvidence => Boolean(row));
  const market = marketAssessment(outgoingMarket, incomingMarket);
  const outgoingKeeper = input.outgoing.map((player) => input.keeper.get(player.playerId)).filter((row): row is KeeperEvidence => Boolean(row));
  const incomingKeeper = input.incoming.map((player) => input.keeper.get(player.playerId)).filter((row): row is KeeperEvidence => Boolean(row));
  const keeper = keeperAssessment(outgoingKeeper, incomingKeeper);
  const beforePositions = positionState(input.rosterBefore, lineup.before, input.starterSlots, input.currentValues);
  const afterPositions = positionState(afterRoster, lineup.after, input.starterSlots, input.currentValues);
  const depthBefore = buildDepthQuality({ players: input.rosterBefore, allocation: lineup.before, values: input.currentValues, ros: input.expertRos });
  const depthAfter = buildDepthQuality({ players: afterRoster, allocation: lineup.after, values: input.currentValues, ros: input.expertRos });
  const depthChanges = Object.keys(depthAfter).filter((position) => depthBefore[position] !== depthAfter[position]).map((position) => `${position} depth changes from ${depthBefore[position]} to ${depthAfter[position]}.`);
  const improvements = Object.keys(afterPositions).filter((position) => ["NEED", "THIN"].includes(beforePositions[position]) && ["ADEQUATE", "SURPLUS"].includes(afterPositions[position]));
  const regressions = Object.keys(afterPositions).filter((position) => ["ADEQUATE", "SURPLUS"].includes(beforePositions[position]) && ["NEED", "THIN"].includes(afterPositions[position]));
  const confidence = confidenceFor(input, lineup, allPlayers);
  const seasonMode = input.seasonMode ?? "EARLY_SEASON";
  const preseasonContext = { auctionConsensus: input.preseasonContext?.auctionConsensus ?? null, adp: input.preseasonContext?.adp ?? null, relevance: preseasonRelevance(seasonMode) };
  const rosAssessment = packageRosAssessment(outgoingRos, incomingRos);
  const depthDelta = depthDirection(depthBefore, depthAfter);
  const primaryReasons: string[] = [];
  const counterweights: string[] = [];
  const supportingReasons: string[] = [];
  const reasonCodes: string[] = [];
  if (direction === "IMPROVEMENT" || direction === "STRONG_IMPROVEMENT") { primaryReasons.push("The optimized starting lineup improves on ordinal starter quality."); reasonCodes.push("STARTING_LINEUP_IMPROVES"); }
  if (direction === "DECLINE" || direction === "STRONG_DECLINE") { counterweights.push("The optimized starting lineup declines on ordinal starter quality."); reasonCodes.push("STARTING_LINEUP_DECLINES"); }
  if (lineup.slotOnlyMoves.length) supportingReasons.push("Some starters changed legal slots, but remained in the same optimized starting unit.");
  improvements.forEach((position) => { primaryReasons.push(`${position} changes from ${beforePositions[position]} to ${afterPositions[position]}.`); reasonCodes.push("FILLS_POSITIONAL_NEED"); });
  regressions.forEach((position) => { counterweights.push(`${position} changes from ${beforePositions[position]} to ${afterPositions[position]}.`); reasonCodes.push("CREATES_POSITIONAL_HOLE"); });
  if (market.direction === "GAIN") { primaryReasons.push("Incoming package carries more FantasyCalc redraft market value."); reasonCodes.push("MARKET_VALUE_GAIN"); }
  if (market.direction === "LOSS") { counterweights.push("Incoming package carries less FantasyCalc redraft market value."); reasonCodes.push("MARKET_VALUE_LOSS"); }
  if (rosAssessment === "MIXED" || rosAssessment === "NOT_COMPARABLE") counterweights.push("Expert ROS package comparison is mixed or not directly comparable by ordinal ranks.");
  if (rosAssessment === "INCOMING_STRONGER") reasonCodes.push("EXPERT_MARKET_AGREE");
  if (rosAssessment === "OUTGOING_STRONGER") reasonCodes.push("EXPERT_MARKET_CONFLICT");
  if (keeper === "POSITIVE") reasonCodes.push("KEEPER_VALUE_GAIN");
  if (keeper === "NEGATIVE") reasonCodes.push("KEEPER_VALUE_LOSS");
  if (confidence === "LOW") reasonCodes.push("LOW_ROS_CONFIDENCE");
  if (outgoingRos.some((row) => row.freshness !== "FRESH") || incomingRos.some((row) => row.freshness !== "FRESH")) reasonCodes.push("STALE_MARKET_DATA");
  if (outgoingKeeper.length < input.outgoing.length || incomingKeeper.length < input.incoming.length) reasonCodes.push("INCOMPLETE_KEEPER_DATA");
  const primaryPositive = [direction === "IMPROVEMENT" || direction === "STRONG_IMPROVEMENT", rosAssessment === "INCOMING_STRONGER", improvements.length > 0].filter(Boolean).length;
  const primaryNegative = [direction === "DECLINE" || direction === "STRONG_DECLINE", rosAssessment === "OUTGOING_STRONGER", regressions.length > 0].filter(Boolean).length;
  const secondaryPositive = [market.direction === "GAIN", depthDelta === "IMPROVES", keeper === "POSITIVE"].filter(Boolean).length;
  const secondaryNegative = [market.direction === "LOSS", depthDelta === "DECLINES", keeper === "NEGATIVE"].filter(Boolean).length;
  const recommendation: ShadowRecommendation = confidence === "INSUFFICIENT" ? "INSUFFICIENT_DATA" : primaryPositive > 0 && primaryNegative === 0 && !(secondaryNegative >= 2) ? (secondaryNegative > 0 || confidence === "LOW" ? "LEAN_ACCEPT" : "ACCEPT") : primaryNegative > 0 && primaryPositive === 0 && !(secondaryPositive >= 2) ? (secondaryPositive > 0 || confidence === "LOW" ? "LEAN_DECLINE" : "DECLINE") : primaryPositive === 0 && primaryNegative === 0 && secondaryPositive >= 2 ? "LEAN_ACCEPT" : primaryPositive === 0 && primaryNegative === 0 && secondaryNegative >= 2 ? "LEAN_DECLINE" : "HOLD";
  const fairness = { score: input.fairness?.score ?? null, verdict: input.fairness?.verdict ?? null, available: input.fairness?.available ?? false, relationshipToRecommendation: fairnessRelationship(input.fairness, recommendation) };
  if (fairness.relationshipToRecommendation === "SUPPORTS") reasonCodes.push("FAIRNESS_SUPPORTS");
  if (fairness.relationshipToRecommendation === "CONFLICTS") reasonCodes.push("FAIRNESS_CONFLICTS");
  if (keeper === "POSITIVE") primaryReasons.push("Keeper economics improve for this franchise.");
  if (keeper === "NEGATIVE") counterweights.push("Keeper economics decline for this franchise.");
  if (depthDelta === "IMPROVES") { primaryReasons.push("Roster depth improves at one or more positions."); reasonCodes.push("DEPTH_IMPROVES"); }
  if (depthDelta === "DECLINES") { counterweights.push("Roster depth declines at one or more positions."); reasonCodes.push("DEPTH_DECLINES"); }
  const whyILikeIt = [...primaryReasons];
  const whatGivesMePause = [...counterweights];
  const missingCoreEvidence = lineup.status === "UNAVAILABLE" && outgoingRos.length === 0 && incomingRos.length === 0 && outgoingMarket.length === 0 && incomingMarket.length === 0;
  const bottomLine = recommendation === "INSUFFICIENT_DATA" ? "There is not enough primary current-season evidence for a directional recommendation." : recommendation === "ACCEPT" || recommendation === "LEAN_ACCEPT" ? `I would ${recommendation === "ACCEPT" ? "accept" : "lean toward accepting"} because the primary roster evidence supports the move${confidence === "LOW" ? ", although missing asset coverage lowers confidence" : ""}.` : recommendation === "DECLINE" || recommendation === "LEAN_DECLINE" ? `I would ${recommendation === "DECLINE" ? "decline" : "lean toward declining"} because the primary roster evidence does not improve the team enough${confidence === "LOW" ? ", although missing asset coverage lowers confidence" : ""}.` : missingCoreEvidence ? "This is a hold because core evidence is incomplete; missing current evidence must be resolved before using this result directionally." : primaryReasons.length > 0 && counterweights.length > 0 ? "This is a close or conflicting result; hold because current evidence is mixed." : "This is a neutral result; hold because current evidence does not create a clear edge.";
  return {
    franchiseId: input.franchiseId,
    franchiseName: input.franchiseName,
    recommendation,
    confidence,
    summary: recommendation === "INSUFFICIENT_DATA" ? "Primary roster evidence is incomplete; do not advise from this result." : `${input.franchiseName} receives ${input.incoming.map(playerLabel).join(" + ")} for ${input.outgoing.map(playerLabel).join(" + ")}: ${recommendation}.`,
    primaryReasons,
    counterweights,
    supportingReasons,
    transactionChanges: [...input.outgoing.map((player) => ({ playerId: player.playerId, playerName: playerLabel(player), direction: "OUTGOING" as const, wasStarterBefore: beforeIds.has(player.playerId), isStarterAfter: afterIds.has(player.playerId) })), ...input.incoming.map((player) => ({ playerId: player.playerId, playerName: playerLabel(player), direction: "INCOMING" as const, wasStarterBefore: beforeIds.has(player.playerId), isStarterAfter: afterIds.has(player.playerId) }))],
    starterChanges,
    lineupImpact: { ...lineup, direction, coreCompleteness, fullCompleteness, startersEntering, startersLeaving, changes: starterChanges },
    positionalImpact: { before: beforePositions, after: afterPositions, improvements, regressions },
    expertRos: { outgoing: outgoingRos, incoming: incomingRos, packageAssessment: rosAssessment, confidence: confidence === "HIGH" ? "HIGH" : outgoingRos.length && incomingRos.length ? "MEDIUM" : "LOW" },
    tradeMarket: { ...market, trends: [...outgoingMarket, ...incomingMarket].map((row) => ({ playerId: row.playerId, trend30Day: row.trend30Day, freshness: row.freshness })) },
    keeperImpact: { outgoing: outgoingKeeper, incoming: incomingKeeper, assessment: keeper },
    fairness,
    reasonCodes: [...new Set(reasonCodes)],
    dataQuality: { expertRos: confidence, tradeMarket: outgoingMarket.length === input.outgoing.length && incomingMarket.length === input.incoming.length ? "HIGH" : "LOW", lineup: lineup.status === "COMPLETE" ? "HIGH" : lineup.status === "PARTIAL" ? "MEDIUM" : "INSUFFICIENT", keeper: outgoingKeeper.length === input.outgoing.length && incomingKeeper.length === input.incoming.length ? "HIGH" : "LOW", fairness: input.fairness?.available ? "HIGH" : "INSUFFICIENT" },
    warnings: [...(input.outgoing.some((player) => !input.rosterBefore.some((rostered) => rostered.playerId === player.playerId)) ? ["One or more outgoing players are not on the supplied franchise roster; this is a package diagnostic, not a validated league trade."] : []), ...(input.incoming.some((player) => input.rosterBefore.some((rostered) => rostered.playerId === player.playerId)) ? ["One or more incoming players are already on the supplied franchise roster."] : []), ...(fairness.available ? [] : ["Historical fairness was unavailable because acquisition provenance was not supplied."]), ...(now ? [] : [])],
    seasonMode,
    preseasonContext,
    whyILikeIt,
    whatGivesMePause,
    bottomLine,
    depthQuality: { before: depthBefore, after: depthAfter, changes: depthChanges },
  };
}
