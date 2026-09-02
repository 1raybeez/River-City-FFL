import "server-only";

import { buildMultiTeamRouting, validateMultiTeamTradeRequest } from "./multiTeamFoundation";
import { buildTwoTeamFairnessActivation } from "./fairness/activation";
import { loadTradeComparisonContext } from "./serverAdapter";
import { getCanonicalAuctionTeamByRosterId } from "@/lib/auction/canonicalTeamCatalog";
import { evaluateShadowRecommendation, type ExpertRosEvidence, type FairnessEvidence, type KeeperEvidence, type RecommendationResult, type TradeMarketEvidence } from "./recommendationEngine";
import type { MultiTeamServerContext, MultiTeamTradeRequest } from "./multiTeamTypes";
import type { TradeComparisonPlayer } from "./types";

export type ServerRecommendationDiagnosticStatus = "READY" | "INVALID" | "NOT_APPLICABLE";

export type ServerRecommendationDiagnostic = {
  status: ServerRecommendationDiagnosticStatus;
  reasonCode: string | null;
  mode: MultiTeamTradeRequest["mode"];
  participants: Array<{ participantId: string; franchiseId: string; outgoingPlayerIds: string[]; incomingPlayerIds: string[] }>;
  ownershipValidation: "VALID" | "INVALID";
  routedAssets: Array<{ playerId: string; sourceFranchiseId: string; destinationFranchiseId: string }>;
  currentValueCoverage: { available: number; total: number };
  lineupCompleteness: Array<{ franchiseId: string; status: string; coreCompleteness: string; fullCompleteness: string }>;
  keeperCoverage: { available: number; total: number };
  fairness: { status: "AVAILABLE" | "UNAVAILABLE" | "NOT_APPLICABLE"; reason: string | null; score: number | null; verdict: string | null };
  teamRecommendations: RecommendationResult[];
  missingEvidence: string[];
  faabEvidence?: Array<{ franchiseId: string; faabSent: number; faabReceived: number; netFaab: number; sentTo: string | null; receivedFrom: string[] }>;
  faabIsolation?: { faabPresent: boolean; excludedFromFantasyCalc: boolean; excludedFromExpertRos: boolean; excludedFromLineup: boolean; excludedFromDepth: boolean; excludedFromFairnessNumericValue: boolean; noPlayerAcquisitionPrice: boolean; noDollarConversion: boolean; recommendationWithFaab: string[]; recommendationWithoutFaab: string[]; directionUnchanged: boolean };
  tradedPlayerEvidence: Array<{ playerId: string; canonicalName: string; sleeperName: string | null; position: string | null; currentRosterId: number | null; canonicalFranchiseId: string | null; expertRos: (ExpertRosEvidence & { matchedPlayerId: string | null }) | null; fantasyCalc: { value: number; overallRank: number | null; positionalRank: number | null; trend30Day: number | null; generatedAt: string; matchedName: string | null; matchedPlayerId: string | null } | null; keeper: (KeeperEvidence & { matchedPlayerId: string | null }) | null }>;
  contextCoverage: {
    sleeperLeague: boolean;
    rosters: boolean;
    ownership: boolean;
    expertRos: { available: boolean; playerCount: number; runtime: "LOCAL_ONLY_RUNTIME_DEPENDENCY" };
    fantasyCalcRedraft: { available: boolean; playerCount: number; format: "REDRAFT"; isDynasty: false; teams: 12; ppr: 0.5; quarterbacks: 1 };
    acquisitionSnapshot: boolean;
    keeperHistory: boolean;
    fairnessEngine: boolean;
    seasonMode: string;
  };
};

type ServerContext = Awaited<ReturnType<typeof loadTradeComparisonContext>>;

function emptyCoverage(mode: MultiTeamTradeRequest["mode"]): ServerRecommendationDiagnostic["contextCoverage"] {
  return { sleeperLeague: false, rosters: false, ownership: false, expertRos: { available: false, playerCount: 0, runtime: "LOCAL_ONLY_RUNTIME_DEPENDENCY" }, fantasyCalcRedraft: { available: false, playerCount: 0, format: "REDRAFT", isDynasty: false, teams: 12, ppr: 0.5, quarterbacks: 1 }, acquisitionSnapshot: false, keeperHistory: false, fairnessEngine: false, seasonMode: mode === "SANDBOX" ? "SANDBOX_ISOLATED" : "UNAVAILABLE" };
}

function contextCoverage(context: ServerContext): ServerRecommendationDiagnostic["contextCoverage"] {
  const rosCount = context.expertRosByPlayer?.size ?? 0;
  const fantasyCalcCount = context.fantasyCalcByPlayer?.size ?? 0;
  const acquisitionAvailable = Boolean(context.acquisitionSnapshot && context.acquisitionSnapshot.size > 0);
  return { sleeperLeague: true, rosters: context.rosters.length > 0, ownership: context.rosters.some((roster) => roster.players.length > 0), expertRos: { available: rosCount > 0, playerCount: rosCount, runtime: "LOCAL_ONLY_RUNTIME_DEPENDENCY" }, fantasyCalcRedraft: { available: fantasyCalcCount > 0, playerCount: fantasyCalcCount, format: "REDRAFT", isDynasty: false, teams: 12, ppr: 0.5, quarterbacks: 1 }, acquisitionSnapshot: acquisitionAvailable, keeperHistory: acquisitionAvailable, fairnessEngine: acquisitionAvailable, seasonMode: context.seasonMode ?? "UNAVAILABLE" };
}

export type ServerDiagnosticPreset = { key: "P1D" | "FAIRNESS_AVAILABLE" | "FAIRNESS_UNAVAILABLE" | "POSITIVE_FAAB"; label: string; request: MultiTeamTradeRequest | null; note: string };

function participant(franchiseId: string, outgoing: Array<{ playerId: string; destinationFranchiseId: string }>, faab?: { amount: number; destinationFranchiseId: string }) {
  return { participantId: franchiseId, franchiseId, outgoing, ...(faab ? { faab } : {}) };
}

function requestFor(a: string, aOut: string[], b: string, bOut: string[], faab?: { sender: string; receiver: string }) : MultiTeamTradeRequest {
  return { version: "m10", mode: "LEAGUE_TRADE", season: 2026, participants: [participant(a, aOut.map((playerId) => ({ playerId, destinationFranchiseId: b })), faab?.sender === a ? { amount: 1, destinationFranchiseId: faab.receiver } : undefined), participant(b, bOut.map((playerId) => ({ playerId, destinationFranchiseId: a })), faab?.sender === b ? { amount: 1, destinationFranchiseId: faab.receiver } : undefined)] };
}

export function buildServerDiagnosticPresets(context: ServerContext): ServerDiagnosticPreset[] {
  const rosters = context.rosters.filter((roster) => roster.available && roster.players.length > 0);
  const ownerOf = (playerId: string) => { const roster = rosters.find((candidate) => candidate.players.some((player) => player.playerId === playerId)); return getCanonicalAuctionTeamByRosterId(roster?.rosterId)?.franchiseId ?? null; };
  const p1dA = ownerOf("12545");
  const p1dB = ownerOf("7523");
  const p1dTyson = rosters.find((roster) => roster.franchiseId === p1dA)?.players.find((player) => player.name === "Jordyn Tyson")?.playerId ?? null;
  const p1d: MultiTeamTradeRequest | null = p1dA && p1dB && p1dTyson ? { version: "m10", mode: "LEAGUE_TRADE", season: 2026, participants: [participant(p1dA, [{ playerId: "12545", destinationFranchiseId: p1dB }, { playerId: p1dTyson, destinationFranchiseId: p1dB }]), participant(p1dB, [{ playerId: "7523", destinationFranchiseId: p1dA }, { playerId: "7526", destinationFranchiseId: p1dA }])] } : null;
  const eligible = rosters.flatMap((roster) => roster.players.filter((player) => context.acquisitionSnapshot?.get(`2026:${roster.franchiseId}:${player.playerId}`)?.fairnessEligibility === "ELIGIBLE").map((player) => ({ roster, player })));
  const fairnessA = eligible[0];
  const fairnessB = eligible.find((entry) => entry.roster.franchiseId !== fairnessA?.roster.franchiseId);
  const fairnessRequest = fairnessA && fairnessB ? requestFor(fairnessA.roster.franchiseId, [fairnessA.player.playerId], fairnessB.roster.franchiseId, [fairnessB.player.playerId]) : null;
  const goffOwner = ownerOf("3163");
  const other = rosters.find((roster) => roster.franchiseId !== goffOwner && roster.players[0]);
  const unavailableRequest = goffOwner && other ? requestFor(goffOwner, ["3163"], other.franchiseId, [other.players[0].playerId]) : null;
  const faabSender = rosters.find((roster) => (roster.availableFaab ?? 0) >= 1);
  const faabReceiver = rosters.find((roster) => roster.franchiseId !== faabSender?.franchiseId && roster.players[0]);
  const faabRequest = faabSender && faabReceiver ? requestFor(faabSender.franchiseId, [faabSender.players[0].playerId], faabReceiver.franchiseId, [faabReceiver.players[0].playerId], { sender: faabSender.franchiseId, receiver: faabReceiver.franchiseId }) : null;
  return [
    { key: "P1D", label: "P1D · Shough + Tyson → Lawrence + Waddle", request: p1d, note: p1d ? "Exact player IDs; each participant is resolved from current Sleeper roster ownership through the canonical River City roster resolver." : "One or more target players is not currently mapped to a canonical River City roster." },
    { key: "FAIRNESS_AVAILABLE", label: "Preset 2 · Fairness available", request: fairnessRequest, note: fairnessRequest ? "Selected from current authoritative acquisition records." : "No current authoritative eligible two-team pair was found." },
    { key: "FAIRNESS_UNAVAILABLE", label: "Preset 3 · Goff / fairness unavailable", request: unavailableRequest, note: unavailableRequest ? "Jared Goff case; unavailable fairness remains non-negative evidence." : "Goff or a legal counterpart is not currently available." },
    { key: "POSITIVE_FAAB", label: "Preset 4 · Positive FAAB", request: faabRequest, note: faabRequest ? "Uses a current legal roster pair and sends exactly $1 FAAB." : "No current sender has at least $1 available FAAB." },
  ];
}

function marketEvidence(context: MultiTeamServerContext): ReadonlyMap<string, TradeMarketEvidence> {
  return new Map([...context.marketByPlayer].flatMap(([playerId, row]) => typeof row.value === "number" && Number.isFinite(row.value)
    ? [[playerId, { playerId, fantasyCalcValue: row.value, overallRank: row.overallRank ?? null, positionalRank: row.positionalRank ?? null, trend30Day: row.trend30Day ?? null, generatedAt: row.generatedAt ?? "", freshness: "FRESH" as const } satisfies TradeMarketEvidence]]
    : []));
}

function keeperEvidence(context: Awaited<ReturnType<typeof loadTradeComparisonContext>>, franchiseId: string, player: TradeComparisonPlayer): KeeperEvidence | null {
  const supplied = context.keeperByPlayer?.get(player.playerId);
  if (supplied) return supplied;
  const record = context.acquisitionSnapshot?.get(`2026:${franchiseId}:${player.playerId}`);
  if (!record) return null;
  return { playerId: player.playerId, playerName: player.name ?? player.playerId, projectedCost: record.projectedNextSeasonKeeperCost, confidence: record.keeperCostStatus === "KNOWN" ? "HIGH" : "UNAVAILABLE" };
}

function fairnessForTeam(activation: ReturnType<typeof buildTwoTeamFairnessActivation>, index: number): FairnessEvidence | null {
  if (activation.status !== "READY" || !activation.result) return activation.status === "NOT_APPLICABLE" ? null : { available: false, score: null, verdict: null, leadingSide: null };
  const leadingSide = activation.result.leadingSide === null ? null : activation.result.leadingSide === (index === 0 ? "A" : "B") ? "A" : "B";
  return { available: true, score: activation.result.fairnessScore, verdict: activation.result.historicalPercentileBand, leadingSide };
}

export async function buildServerTradeRecommendation(request: MultiTeamTradeRequest, suppliedContext?: Awaited<ReturnType<typeof loadTradeComparisonContext>>): Promise<ServerRecommendationDiagnostic> {
  if (request.mode !== "LEAGUE_TRADE") return { status: "NOT_APPLICABLE", reasonCode: "SANDBOX_RECOMMENDATION_DISABLED", mode: request.mode, participants: [], ownershipValidation: "VALID", routedAssets: [], currentValueCoverage: { available: 0, total: 0 }, lineupCompleteness: [], keeperCoverage: { available: 0, total: 0 }, fairness: { status: "NOT_APPLICABLE", reason: "SANDBOX_RECOMMENDATION_DISABLED", score: null, verdict: null }, teamRecommendations: [], missingEvidence: [], tradedPlayerEvidence: [], contextCoverage: emptyCoverage(request.mode) };
  if (request.participants.length !== 2) return { status: "NOT_APPLICABLE", reasonCode: "MULTI_TEAM_RECOMMENDATION_UNCALIBRATED", mode: request.mode, participants: request.participants.map((participant) => ({ participantId: participant.participantId, franchiseId: participant.franchiseId, outgoingPlayerIds: participant.outgoing.map((asset) => asset.playerId), incomingPlayerIds: [] })), ownershipValidation: "VALID", routedAssets: [], currentValueCoverage: { available: 0, total: 0 }, lineupCompleteness: [], keeperCoverage: { available: 0, total: 0 }, fairness: { status: "NOT_APPLICABLE", reason: "TWO_TEAM_ONLY", score: null, verdict: null }, teamRecommendations: [], missingEvidence: [], tradedPlayerEvidence: [], contextCoverage: emptyCoverage(request.mode) };
  const context = suppliedContext ?? await loadTradeComparisonContext({ includeAcquisitionSnapshot: true });
  const routingContext: MultiTeamServerContext = { rosters: context.rosters, playerDirectory: context.multiTeamPlayerDirectory, marketByPlayer: context.marketByPlayer, currentValueByPlayer: context.currentValueByPlayer, starterSlots: context.starterSlots, expertRosByPlayer: context.expertRosByPlayer, keeperByPlayer: context.keeperByPlayer, acquisitionSnapshot: context.acquisitionSnapshot, draftStatus: context.draftStatus, seasonMode: context.seasonMode, week: context.week, fantasyCalcByPlayer: context.fantasyCalcByPlayer };
  const validation = validateMultiTeamTradeRequest(request, routingContext);
  if (validation.length) return { status: "INVALID", reasonCode: validation[0].code, mode: request.mode, participants: request.participants.map((participant) => ({ participantId: participant.participantId, franchiseId: participant.franchiseId, outgoingPlayerIds: participant.outgoing.map((asset) => asset.playerId), incomingPlayerIds: [] })), ownershipValidation: validation.some((error) => error.code === "PLAYER_NOT_ROSTERED") ? "INVALID" : "VALID", routedAssets: [], currentValueCoverage: { available: 0, total: 0 }, lineupCompleteness: [], keeperCoverage: { available: 0, total: 0 }, fairness: { status: "UNAVAILABLE", reason: "TRADE_VALIDATION_FAILED", score: null, verdict: null }, teamRecommendations: [], missingEvidence: validation.map((error) => error.message), tradedPlayerEvidence: [], contextCoverage: contextCoverage(context) };
  const routing = buildMultiTeamRouting(request, routingContext);
  const activation = context.acquisitionSnapshot ? buildTwoTeamFairnessActivation({ participants: routing.participants, acquisitionSnapshot: context.acquisitionSnapshot, marketByPlayer: context.marketByPlayer, draftStatus: context.draftStatus }) : { status: "UNAVAILABLE" as const, result: null, reason: "ACQUISITION_SNAPSHOT_UNAVAILABLE", affectedPlayerNames: [] };
  const market = marketEvidence(routingContext);
  const expert = context.expertRosByPlayer ?? new Map<string, ExpertRosEvidence>();
  const results = routing.participants.map((participant, index) => {
    const roster = context.rosters.find((candidate) => candidate.franchiseId === participant.franchiseId);
    const outgoing = participant.sends.map((asset) => asset.player);
    const incoming = participant.receives.map((asset) => asset.player);
    const traded = [...outgoing, ...incoming];
    const keepers = new Map(traded.flatMap((player) => { const evidence = keeperEvidence(context, participant.franchiseId, player); return evidence ? [[player.playerId, evidence] as const] : []; }));
    return evaluateShadowRecommendation({ franchiseId: participant.franchiseId, franchiseName: roster?.franchiseName ?? participant.franchiseId, rosterBefore: roster?.players ?? [], outgoing, incoming, currentValues: context.currentValueByPlayer ?? new Map(), expertRos: expert, tradeMarket: market, keeper: keepers, starterSlots: context.starterSlots ?? [], fairness: fairnessForTeam(activation, index), seasonMode: context.seasonMode, preseasonContext: { auctionConsensus: null, adp: null } });
  });
  const tradedIds = new Set(routing.participants.flatMap((participant) => [...participant.sends, ...participant.receives].map((asset) => asset.player.playerId)));
  const currentAvailable = [...tradedIds].filter((playerId) => context.currentValueByPlayer?.get(playerId)?.currentValueScore !== null || context.currentValueByPlayer?.get(playerId)?.overallRank !== null).length;
  const keeperAvailable = [...tradedIds].filter((playerId) => context.acquisitionSnapshot && [...context.rosters].some((roster) => context.acquisitionSnapshot?.get(`2026:${roster.franchiseId}:${playerId}`)?.keeperCostStatus === "KNOWN")).length;
  const tradedPlayerEvidence = [...tradedIds].map((playerId) => { const player = context.multiTeamPlayerDirectory.get(playerId); const marketRow = context.fantasyCalcByPlayer?.get(playerId); const owner = routing.participants.find((participant) => participant.sends.some((asset) => asset.player.playerId === playerId))?.franchiseId ?? routing.participants[0].franchiseId; const roster = context.rosters.find((candidate) => candidate.franchiseId === owner); const rosRow = expert.get(playerId); const keeper = keeperEvidence(context, owner, player ?? { playerId, name: playerId, position: null, nflTeam: null }); return { playerId, canonicalName: player?.name ?? playerId, sleeperName: player?.name ?? null, position: player?.position ?? null, currentRosterId: roster?.rosterId ?? null, canonicalFranchiseId: owner, expertRos: rosRow ? { ...rosRow, matchedPlayerId: rosRow.playerId } : null, fantasyCalc: marketRow ? { value: marketRow.rawSourceValue, overallRank: marketRow.fantasycalcOverallRank, positionalRank: marketRow.fantasycalcPositionRank, trend30Day: marketRow.fantasycalcTrend30Day, generatedAt: marketRow.generatedAt, matchedName: marketRow.fantasycalcName ?? null, matchedPlayerId: marketRow.fantasycalcSleeperId ?? marketRow.playerId } : null, keeper: keeper ? { ...keeper, matchedPlayerId: keeper.playerId } : null }; });
  const faabEvidence = routing.participants.map((participant) => ({ franchiseId: participant.franchiseId, faabSent: participant.faabSent?.amount ?? 0, faabReceived: participant.faabReceived.reduce((sum, transfer) => sum + transfer.amount, 0), netFaab: participant.faabReceived.reduce((sum, transfer) => sum + transfer.amount, 0) - (participant.faabSent?.amount ?? 0), sentTo: participant.faabSent?.receiverFranchiseId ?? null, receivedFrom: participant.faabReceived.map((transfer) => transfer.senderFranchiseId) }));
  const faabPresent = faabEvidence.some((participant) => participant.faabSent > 0 || participant.faabReceived > 0);
  const withoutFaab = faabPresent ? await buildServerTradeRecommendation({ ...request, participants: request.participants.map((participant) => ({ ...participant, faab: null })) }, context) : null;
  const recommendationWithFaab = results.map((result) => result.recommendation);
  const recommendationWithoutFaab = withoutFaab?.teamRecommendations.map((result) => result.recommendation) ?? recommendationWithFaab;
  return { status: "READY", reasonCode: null, mode: request.mode, participants: results.map((result) => ({ participantId: result.franchiseId, franchiseId: result.franchiseId, outgoingPlayerIds: result.transactionChanges.filter((change) => change.direction === "OUTGOING").map((change) => change.playerId), incomingPlayerIds: result.transactionChanges.filter((change) => change.direction === "INCOMING").map((change) => change.playerId) })), ownershipValidation: "VALID", routedAssets: routing.participants.flatMap((participant) => participant.sends.map((asset) => ({ playerId: asset.player.playerId, sourceFranchiseId: asset.sourceFranchiseId, destinationFranchiseId: asset.destinationFranchiseId }))), currentValueCoverage: { available: currentAvailable, total: tradedIds.size }, lineupCompleteness: results.map((result) => ({ franchiseId: result.franchiseId, status: result.lineupImpact.status, coreCompleteness: result.lineupImpact.coreCompleteness, fullCompleteness: result.lineupImpact.fullCompleteness })), keeperCoverage: { available: keeperAvailable, total: tradedIds.size }, fairness: { status: activation.status === "READY" ? "AVAILABLE" : "UNAVAILABLE", reason: activation.reason, score: activation.result?.fairnessScore ?? null, verdict: activation.result?.historicalPercentileBand ?? null }, teamRecommendations: results, missingEvidence: [...tradedIds].flatMap((playerId) => [!expert.has(playerId) ? `Expert ROS unavailable for ${playerId}.` : null, !market.has(playerId) ? `FantasyCalc market unavailable for ${playerId}.` : null].filter((item): item is string => Boolean(item))), tradedPlayerEvidence, faabEvidence, faabIsolation: { faabPresent, excludedFromFantasyCalc: true, excludedFromExpertRos: true, excludedFromLineup: true, excludedFromDepth: true, excludedFromFairnessNumericValue: true, noPlayerAcquisitionPrice: true, noDollarConversion: true, recommendationWithFaab, recommendationWithoutFaab, directionUnchanged: recommendationWithFaab.every((recommendation, index) => recommendation === recommendationWithoutFaab[index]) }, contextCoverage: contextCoverage(context) };
}
