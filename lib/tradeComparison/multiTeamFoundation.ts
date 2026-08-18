import {
  adjustedKeeperSurplus,
  adjustedTalent,
  FAAB_WEIGHT,
  KEEPER_SURPLUS_WEIGHT,
  rosterTax,
} from "./fairness/packageValue";
import type { FairnessPlayer } from "./fairness/types";
import {
  MULTI_TEAM_MAX_PARTICIPANTS,
  MULTI_TEAM_MIN_PARTICIPANTS,
  type MultiTeamModelAsset,
  type MultiTeamModelPackageInput,
  type MultiTeamModelParticipantResult,
  type MultiTeamModelSummary,
  type MultiTeamMarketEntry,
  type MultiTeamSignalLeader,
  type MultiTeamPackageMarketContext,
  type MultiTeamParticipantInput,
  type MultiTeamParticipantResult,
  type MultiTeamRoutedAsset,
  type MultiTeamRoutingResult,
  type MultiTeamServerContext,
  type MultiTeamTradeRequest,
  type MultiTeamValidationError,
} from "./multiTeamTypes";
import { RIVER_CITY_HISTORICAL_CALIBRATION, scoreHistoricalGap } from "./fairness/historicalCalibration";
import type { TradeComparisonPlayer, TradeComparisonPositionCounts } from "./types";

function invalid(code: MultiTeamValidationError["code"], message: string): MultiTeamValidationError {
  return { code, message };
}

function emptyCounts(): TradeComparisonPositionCounts {
  return { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0, UNKNOWN: 0 };
}

function countPositions(players: readonly TradeComparisonPlayer[]) {
  const counts = emptyCounts();
  for (const player of players) counts[player.position ?? "UNKNOWN"] += 1;
  return counts;
}

function packageMarket(
  assets: readonly MultiTeamRoutedAsset[],
  marketByPlayer: ReadonlyMap<string, MultiTeamMarketEntry>,
): MultiTeamPackageMarketContext {
  const rows = assets.map((asset) => marketByPlayer.get(asset.player.playerId) ?? null);
  const auction = rows.map((row) => row?.value).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const adp = rows.map((row) => row?.averageAdp).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const orderedAdp = [...adp].sort((first, second) => first - second);
  const middle = Math.floor(orderedAdp.length / 2);
  return {
    totalAuctionConsensus: auction.length ? auction.reduce((sum, value) => sum + value, 0) : null,
    auctionCoverage: assets.length === 0 || auction.length === 0 ? "UNAVAILABLE" : auction.length === assets.length ? "COMPLETE" : "PARTIAL",
    medianAdp: orderedAdp.length === 0 ? null : orderedAdp.length % 2 ? orderedAdp[middle] : (orderedAdp[middle - 1] + orderedAdp[middle]) / 2,
    bestAdp: orderedAdp[0] ?? null,
    adpCoverage: assets.length === 0 || adp.length === 0 ? "UNAVAILABLE" : adp.length === assets.length ? "COMPLETE" : "PARTIAL",
  };
}

function participantRosterAfter(
  roster: MultiTeamServerContext["rosters"][number] | undefined,
  sends: readonly MultiTeamRoutedAsset[],
  receives: readonly MultiTeamRoutedAsset[],
) {
  const sentIds = new Set(sends.map((asset) => asset.player.playerId));
  return [...(roster?.players ?? []).filter((player) => !sentIds.has(player.playerId)), ...receives.map((asset) => asset.player)];
}

export function validateMultiTeamTradeRequest(
  request: unknown,
  context: MultiTeamServerContext,
  maximumParticipants = MULTI_TEAM_MAX_PARTICIPANTS,
): MultiTeamValidationError[] {
  const errors: MultiTeamValidationError[] = [];
  if (!request || typeof request !== "object" || Array.isArray(request)) return [invalid("INVALID_REQUEST", "Trade request must be an object.")];
  const value = request as Record<string, unknown>;
  if (value.mode !== "LEAGUE_TRADE" && value.mode !== "SANDBOX") errors.push(invalid("INVALID_MODE", "Choose League Trade or Trade Sandbox."));
  if (!Number.isInteger(value.season)) errors.push(invalid("INVALID_SEASON", "Trade season must be an integer."));
  const participants = Array.isArray(value.participants) ? value.participants : [];
  if (participants.length < MULTI_TEAM_MIN_PARTICIPANTS || participants.length > maximumParticipants) errors.push(invalid("INVALID_PARTICIPANT_COUNT", `Choose between ${MULTI_TEAM_MIN_PARTICIPANTS} and ${maximumParticipants} franchises.`));
  const participantInputs = participants as unknown as MultiTeamParticipantInput[];
  const participantIds = new Set<string>();
  const franchiseIds = new Set<string>();
  const playerIds = new Set<string>();
  const selectedFranchises = new Set(participantInputs.map((participant) => participant?.franchiseId));
  for (const participant of participantInputs) {
    if (!participant || typeof participant !== "object" || typeof participant.participantId !== "string" || typeof participant.franchiseId !== "string" || !Array.isArray(participant.outgoing)) {
      errors.push(invalid("INVALID_REQUEST", "Each participant requires an ID, franchise, and outgoing package."));
      continue;
    }
    if (participantIds.has(participant.participantId)) errors.push(invalid("DUPLICATE_PARTICIPANT", "Participant IDs must be unique."));
    participantIds.add(participant.participantId);
    if (franchiseIds.has(participant.franchiseId)) errors.push(invalid("DUPLICATE_FRANCHISE", "A franchise may participate only once."));
    franchiseIds.add(participant.franchiseId);
    const roster = context.rosters.find((candidate) => candidate.franchiseId === participant.franchiseId);
    if (!roster) errors.push(invalid("UNKNOWN_FRANCHISE", "Every participant must use a canonical River City franchise."));
    if (participant.outgoing.length === 0) errors.push(invalid("EMPTY_PACKAGE", "Every participant must send at least one asset."));
    for (const asset of participant.outgoing as unknown[]) {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
        errors.push(invalid("INVALID_REQUEST", "Each outgoing asset must be an object."));
        continue;
      }
      const assetRecord = asset as Record<string, unknown>;
      if (Object.keys(assetRecord).some((key) => !["playerId", "destinationFranchiseId"].includes(key))) errors.push(invalid("CLIENT_VALUATION_FORBIDDEN", "Client valuation and cost fields are not accepted."));
      if (typeof assetRecord.playerId !== "string" || typeof assetRecord.destinationFranchiseId !== "string") {
        errors.push(invalid("INVALID_REQUEST", "Each asset requires a player and destination franchise."));
        continue;
      }
      const playerId = assetRecord.playerId;
      if (playerIds.has(playerId)) errors.push(invalid("DUPLICATE_PLAYER", "A player cannot be routed more than once."));
      playerIds.add(playerId);
      if (!context.playerDirectory.has(playerId)) errors.push(invalid("UNKNOWN_PLAYER", "Every asset must use a server-known player identity."));
      if (!selectedFranchises.has(assetRecord.destinationFranchiseId)) errors.push(invalid("DESTINATION_NOT_PARTICIPANT", "Every destination must be a participating franchise."));
      if (assetRecord.destinationFranchiseId === participant.franchiseId) errors.push(invalid("INVALID_DESTINATION", "An asset destination must differ from its source franchise."));
      if (value.mode === "LEAGUE_TRADE" && roster?.available && !roster.players.some((player) => player.playerId === playerId)) errors.push(invalid("PLAYER_NOT_ROSTERED", "League Trade assets must be currently rostered by their source franchise."));
    }
  }
  if (participantInputs.some((participant) => participant?.outgoing?.some((asset) => !selectedFranchises.has(asset.destinationFranchiseId)))) errors.push(invalid("DESTINATION_NOT_PARTICIPANT", "Every destination must be a participating franchise."));
  return errors;
}

export function buildMultiTeamRouting(
  request: MultiTeamTradeRequest,
  context: MultiTeamServerContext,
): MultiTeamRoutingResult {
  const errors = validateMultiTeamTradeRequest(request, context);
  if (errors.length) return { status: "INVALID", errors, mode: request.mode, participants: [] };
  const participants = request.participants.map((participant) => ({ ...participant, outgoing: participant.outgoing.map((asset) => ({ ...asset })) }));
  const sendsByParticipant = new Map<string, MultiTeamRoutedAsset[]>();
  for (const participant of participants) sendsByParticipant.set(participant.franchiseId, participant.outgoing.map((asset) => ({ player: context.playerDirectory.get(asset.playerId)!, sourceFranchiseId: participant.franchiseId, destinationFranchiseId: asset.destinationFranchiseId })));
  const results: MultiTeamParticipantResult[] = participants.map((participant) => {
    const sends = sendsByParticipant.get(participant.franchiseId) ?? [];
    const receives = participants.flatMap((source) => sendsByParticipant.get(source.franchiseId) ?? []).filter((asset) => asset.destinationFranchiseId === participant.franchiseId);
    const roster = context.rosters.find((candidate) => candidate.franchiseId === participant.franchiseId);
    const after = participantRosterAfter(roster, sends, receives);
    return {
      participantId: participant.participantId,
      franchiseId: participant.franchiseId,
      sends,
      receives,
      rosterContext: request.mode === "LEAGUE_TRADE" ? "CURRENT_FACT" : "HYPOTHETICAL_RESULT",
      positionalBefore: countPositions(roster?.players ?? []),
      positionalAfter: countPositions(after),
      market: { sent: packageMarket(sends, context.marketByPlayer), received: packageMarket(receives, context.marketByPlayer) },
      reasoning: [],
    };
  });
  return { status: "READY", errors: [], mode: request.mode, participants: results };
}

function toFairnessPlayer(asset: MultiTeamModelAsset): FairnessPlayer | null {
  if (asset.modelValue === null || !Number.isFinite(asset.modelValue) || asset.acquisitionCost === null || !Number.isFinite(asset.acquisitionCost) || asset.acquisitionCostStatus !== "KNOWN" || asset.acquisitionCostProvenance !== "CURRENT_RIVER_CITY_COST_BASIS") return null;
  return { playerId: asset.playerId, value: asset.modelValue, keeperCost: asset.acquisitionCost, keeperCostStatus: asset.acquisitionCost === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE" };
}

export function buildMultiTeamModelSummary(packages: readonly MultiTeamModelPackageInput[]): MultiTeamModelSummary {
  const calibrationApplicability = packages.length === 2 ? "TWO_TEAM_CALIBRATED" : "MULTI_TEAM_UNCALIBRATED";
  if (packages.length < MULTI_TEAM_MIN_PARTICIPANTS) return { status: "UNAVAILABLE", participantResults: [], globalGap: null, modelSpread: null, highestNetParticipantId: null, largestModelEdgeParticipantId: null, calibrationApplicability, historicalFairnessScore: null, historicalFairnessBand: null, limitations: ["At least two model packages are required."] };
  const converted = packages.map((pkg) => ({ pkg, sent: pkg.playersSent.map(toFairnessPlayer), received: pkg.playersReceived.map(toFairnessPlayer) }));
  if (converted.some((pkg) => pkg.sent.some((player) => !player) || pkg.received.some((player) => !player))) return { status: "UNAVAILABLE", participantResults: [], globalGap: null, modelSpread: null, highestNetParticipantId: null, largestModelEdgeParticipantId: null, calibrationApplicability, historicalFairnessScore: null, historicalFairnessBand: null, limitations: ["Multi-team fairness requires server-authoritative model values and acquisition costs for every asset."] };
  const results: MultiTeamModelParticipantResult[] = converted.map(({ pkg, sent, received }) => {
    const playersSent = sent as FairnessPlayer[];
    const playersReceived = received as FairnessPlayer[];
    const talentSent = adjustedTalent(playersSent);
    const talentReceived = adjustedTalent(playersReceived);
    const surplusSent = playersSent.reduce((sum, player) => sum + adjustedKeeperSurplus(player), 0);
    const surplusReceived = playersReceived.reduce((sum, player) => sum + adjustedKeeperSurplus(player), 0);
    const deltaTalent = talentReceived - talentSent;
    const deltaSurplus = surplusReceived - surplusSent;
    const deltaFaab = (pkg.faabReceived ?? 0) - (pkg.faabSent ?? 0);
    const tax = rosterTax(playersSent, playersReceived);
    return { participantId: pkg.participantId, talentSent, talentReceived, surplusSent, surplusReceived, deltaTalent, deltaSurplus, deltaFaab, rosterTax: tax, netValue: deltaTalent + deltaSurplus * KEEPER_SURPLUS_WEIGHT + deltaFaab * FAAB_WEIGHT - tax };
  });
  const values = results.map((result) => result.netValue);
  const maximum = Math.max(...values);
  const minimum = Math.min(...values);
  const spread = Math.abs(maximum - minimum);
  const historical = calibrationApplicability === "TWO_TEAM_CALIBRATED" ? scoreHistoricalGap(spread, RIVER_CITY_HISTORICAL_CALIBRATION) : null;
  const highest = results.find((result) => result.netValue === maximum)?.participantId ?? null;
  return { status: "READY", participantResults: results, globalGap: spread, modelSpread: spread, highestNetParticipantId: highest, largestModelEdgeParticipantId: highest, calibrationApplicability, historicalFairnessScore: historical?.score ?? null, historicalFairnessBand: historical?.band ?? null, limitations: calibrationApplicability === "MULTI_TEAM_UNCALIBRATED" ? ["Multi-team model spread is not a historically calibrated fairness score."] : [] };
}

export type MultiTeamSignalLeaderInput = {
  participantId: string;
  deltaTalent: number;
  deltaSurplus: number;
  auctionTotal: number | null;
  auctionCoverage: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  medianAdp: number | null;
  adpCoverage: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
};

function signalLeader(
  signal: MultiTeamSignalLeader["signal"],
  rows: readonly MultiTeamSignalLeaderInput[],
  value: (row: MultiTeamSignalLeaderInput) => number | null,
  available: (row: MultiTeamSignalLeaderInput) => boolean,
  lowerIsHigher = false,
): MultiTeamSignalLeader {
  const usable = rows.filter(available);
  if (usable.length < 2) return { signal, status: "UNAVAILABLE", leadingParticipantId: null };
  const ordered = [...usable].sort((first, second) => {
    const left = value(first) ?? 0;
    const right = value(second) ?? 0;
    return lowerIsHigher ? left - right : right - left;
  });
  const first = value(ordered[0]);
  const second = value(ordered[1]);
  if (first === null || second === null) return { signal, status: "UNAVAILABLE", leadingParticipantId: null };
  if (Math.abs(first - second) <= 0.01) return { signal, status: "TIE", leadingParticipantId: null };
  return { signal, status: "LEADING_PARTICIPANT", leadingParticipantId: ordered[0].participantId };
}

export function buildMultiTeamSignalLeaders(rows: readonly MultiTeamSignalLeaderInput[]): MultiTeamSignalLeader[] {
  return [
    signalLeader("MODEL_TALENT", rows, (row) => row.deltaTalent, () => true),
    signalLeader("ACQUISITION_SURPLUS", rows, (row) => row.deltaSurplus, () => true),
    signalLeader("AUCTION_CONSENSUS", rows, (row) => row.auctionTotal, (row) => row.auctionCoverage === "COMPLETE"),
    signalLeader("ADP", rows, (row) => row.medianAdp === null ? null : -row.medianAdp, (row) => row.adpCoverage === "COMPLETE"),
  ];
}
