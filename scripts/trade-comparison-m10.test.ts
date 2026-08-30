import assert from "node:assert/strict";
import { buildMultiTeamModelSummary, buildMultiTeamRouting, buildMultiTeamSignalLeaders, validateMultiTeamTradeRequest } from "../lib/tradeComparison/multiTeamFoundation";
import type { CurrentFranchiseRoster, TradeComparisonPlayer } from "../lib/tradeComparison/types";

const player = (playerId: string, position: TradeComparisonPlayer["position"]): TradeComparisonPlayer => ({ playerId, name: playerId, position, nflTeam: "BUF" });
const catalog = new Map(["x", "y", "z", "free"].map((id) => [id, player(id, id === "x" ? "QB" : "WR")]));
const rosters: CurrentFranchiseRoster[] = ["a", "b", "c", "d"].map((franchiseId, index) => ({ franchiseId, franchiseName: franchiseId.toUpperCase(), rosterId: index + 1, available: true, availableFaab: franchiseId === "a" ? 35 : 20, players: [player(franchiseId === "a" ? "x" : franchiseId === "b" ? "y" : franchiseId === "c" ? "z" : "free", franchiseId === "a" ? "QB" : "WR")] }));
const marketByPlayer = new Map([...catalog.keys()].map((playerId, index) => [playerId, { playerId, value: 10 + index, season: 2026, sourceLabel: "Published auction consensus", averageAdp: 10 + index }]));
const context = { rosters, playerDirectory: catalog, marketByPlayer };
const threeTeam = { version: "m10" as const, mode: "LEAGUE_TRADE" as const, season: 2026, participants: [{ participantId: "one", franchiseId: "a", outgoing: [{ playerId: "x", destinationFranchiseId: "b" }] }, { participantId: "two", franchiseId: "b", outgoing: [{ playerId: "y", destinationFranchiseId: "c" }] }, { participantId: "three", franchiseId: "c", outgoing: [{ playerId: "z", destinationFranchiseId: "a" }] }] };
assert.deepEqual(validateMultiTeamTradeRequest(threeTeam, context), []);
const routed = buildMultiTeamRouting(threeTeam, context);
assert.equal(routed.status, "READY");
assert.equal(routed.participants.find((participant) => participant.franchiseId === "a")?.receives[0]?.player.playerId, "z");
assert.equal(routed.participants.find((participant) => participant.franchiseId === "b")?.receives[0]?.player.playerId, "x");
assert.equal(routed.participants.find((participant) => participant.franchiseId === "c")?.receives[0]?.player.playerId, "y");
assert.equal(routed.participants[0]?.market.sent.auctionCoverage, "COMPLETE");
assert.equal(routed.participants[0]?.market.received.adpCoverage, "COMPLETE");
assert.equal(routed.participants.every((participant) => participant.reasoning), true);
assert.equal(routed.participants.find((participant) => participant.franchiseId === "a")?.positionalBefore.QB, 1);
assert.equal(routed.participants.find((participant) => participant.franchiseId === "a")?.positionalAfter.WR, 1);
const fourTeam = { ...threeTeam, participants: [...threeTeam.participants, { participantId: "four", franchiseId: "d", outgoing: [{ playerId: "free", destinationFranchiseId: "a" }] }] };
assert.deepEqual(validateMultiTeamTradeRequest(fourTeam, context), []);
assert.ok(validateMultiTeamTradeRequest({ ...threeTeam, participants: [{ ...threeTeam.participants[0], franchiseId: "a" }, { ...threeTeam.participants[1], franchiseId: "a" }, threeTeam.participants[2]] }, context).some((error) => error.code === "DUPLICATE_FRANCHISE"));
assert.ok(validateMultiTeamTradeRequest({ ...threeTeam, participants: [{ ...threeTeam.participants[0], outgoing: [{ playerId: "x", destinationFranchiseId: "b" }] }, { ...threeTeam.participants[1], outgoing: [{ playerId: "x", destinationFranchiseId: "c" }] }, threeTeam.participants[2]] }, context).some((error) => error.code === "DUPLICATE_PLAYER"));
assert.ok(validateMultiTeamTradeRequest({ ...threeTeam, participants: [{ ...threeTeam.participants[0], outgoing: [{ playerId: "x", destinationFranchiseId: "a" }] }, threeTeam.participants[1], threeTeam.participants[2]] }, context).some((error) => error.code === "INVALID_DESTINATION"));
assert.ok(validateMultiTeamTradeRequest({ ...threeTeam, participants: [{ ...threeTeam.participants[0], outgoing: [{ playerId: "y", destinationFranchiseId: "b" }] }, threeTeam.participants[1], threeTeam.participants[2]] }, context).some((error) => error.code === "PLAYER_NOT_ROSTERED"));
const sandbox = { ...threeTeam, mode: "SANDBOX" as const, participants: [{ ...threeTeam.participants[0], outgoing: [{ playerId: "free", destinationFranchiseId: "b" }] }, threeTeam.participants[1], threeTeam.participants[2]] };
assert.deepEqual(validateMultiTeamTradeRequest(sandbox, context), []);
const sandboxRouting = buildMultiTeamRouting(sandbox, context);
assert.equal(sandboxRouting.status, "READY");
assert.deepEqual(sandboxRouting.participants.map((participant) => participant.positionalBefore), [{}, {}, {}]);
const twoTeamSandbox = {
  ...sandbox,
  participants: sandbox.participants.slice(0, 2).map((participant, index) => ({
    ...participant,
    outgoing: participant.outgoing.map((asset) => ({ ...asset, destinationFranchiseId: index === 0 ? "b" : "a" })),
  })),
};
const twoTeamSandboxRouting = buildMultiTeamRouting(twoTeamSandbox, context);
assert.equal(twoTeamSandboxRouting.sandboxMarketFairness?.status, "READY");
assert.ok(Math.abs((twoTeamSandboxRouting.sandboxMarketFairness?.fairnessScore ?? 0) - 91.66666666666667) < 0.000001);
assert.equal(twoTeamSandboxRouting.sandboxMarketFairness?.evidence, "LOW");
const sandboxWithFaab = { ...twoTeamSandbox, participants: twoTeamSandbox.participants.map((participant, index) => ({ ...participant, faab: { amount: index === 0 ? 5 : 0, destinationFranchiseId: index === 0 ? "b" : "" } })) };
const sandboxWithFaabRouting = buildMultiTeamRouting(sandboxWithFaab, context);
assert.equal(sandboxWithFaabRouting.status, "READY");
assert.equal(sandboxWithFaabRouting.participants.find((participant) => participant.franchiseId === "a")?.faabSent?.amount, 5);
assert.equal(sandboxWithFaabRouting.participants.find((participant) => participant.franchiseId === "b")?.faabReceived[0]?.amount, 5);
assert.equal(sandboxWithFaabRouting.participants.find((participant) => participant.franchiseId === "a")?.faabSent?.receiverFranchiseId, "b");
assert.equal(sandboxWithFaabRouting.participants.find((participant) => participant.franchiseId === "b")?.faabReceived[0]?.senderFranchiseId, "a");
assert.equal(sandboxWithFaabRouting.sandboxMarketFairness?.fairnessScore, twoTeamSandboxRouting.sandboxMarketFairness?.fairnessScore);
const leagueWithFaab = { ...twoTeamSandbox, mode: "LEAGUE_TRADE" as const, participants: twoTeamSandbox.participants.map((participant, index) => ({ ...participant, franchiseId: index === 0 ? "a" : "b", outgoing: [{ playerId: index === 0 ? "x" : "y", destinationFranchiseId: index === 0 ? "b" : "a" }], faab: { amount: index === 0 ? 35 : 0, destinationFranchiseId: index === 0 ? "b" : "" } })) };
assert.deepEqual(validateMultiTeamTradeRequest(leagueWithFaab, context), []);
assert.equal(buildMultiTeamRouting(leagueWithFaab, context).participants.find((participant) => participant.franchiseId === "a")?.faabSent?.amount, 35);
assert.ok(validateMultiTeamTradeRequest({ ...leagueWithFaab, participants: leagueWithFaab.participants.map((participant) => participant.franchiseId === "a" ? { ...participant, faab: { amount: 36, destinationFranchiseId: "b" } } : participant) }, context).some((error) => error.code === "FAAB_BALANCE_EXCEEDED"));
assert.ok(validateMultiTeamTradeRequest({ ...sandboxWithFaab, participants: sandboxWithFaab.participants.map((participant) => participant.franchiseId === "a" ? { ...participant, faab: { amount: -1, destinationFranchiseId: "b" } } : participant) }, context).some((error) => error.code === "INVALID_FAAB"));
assert.ok(validateMultiTeamTradeRequest({ ...sandboxWithFaab, participants: sandboxWithFaab.participants.map((participant) => participant.franchiseId === "a" ? { ...participant, faab: { amount: 1.5, destinationFranchiseId: "b" } } : participant) }, context).some((error) => error.code === "INVALID_FAAB"));
assert.ok(validateMultiTeamTradeRequest({ ...sandboxWithFaab, participants: sandboxWithFaab.participants.map((participant) => participant.franchiseId === "a" ? { ...participant, faab: { amount: 5, destinationFranchiseId: "a" } } : participant) }, context).some((error) => error.code === "INVALID_DESTINATION"));
assert.ok(validateMultiTeamTradeRequest({ ...sandboxWithFaab, participants: sandboxWithFaab.participants.map((participant) => participant.franchiseId === "a" ? { ...participant, faab: { amount: 5, destinationFranchiseId: "c" } } : participant) }, context).some((error) => error.code === "DESTINATION_NOT_PARTICIPANT"));
const alternateSandbox = {
  ...sandbox,
  participants: sandbox.participants.map((participant, index) => ({
    ...participant,
    franchiseId: ["d", "a", "b"][index],
    outgoing: participant.outgoing.map((asset) => ({
      ...asset,
      destinationFranchiseId: ["a", "b", "d"][index],
    })),
  })),
};
const alternateContext = { ...context, rosters: [...context.rosters, ...["e", "f"].map((franchiseId, index) => ({ franchiseId, franchiseName: franchiseId.toUpperCase(), rosterId: index + 10, available: true, players: [] }))] };
const alternateSandboxRouting = buildMultiTeamRouting(alternateSandbox, alternateContext);
assert.equal(alternateSandboxRouting.status, "READY");
assert.deepEqual(
  sandboxRouting.participants.map((participant) => ({ sent: participant.market.sent, received: participant.market.received })),
  alternateSandboxRouting.participants.map((participant) => ({ sent: participant.market.sent, received: participant.market.received })),
);
assert.deepEqual(
  sandboxRouting.participants.map((participant) => participant.sends.map((asset) => asset.player.playerId)),
  alternateSandboxRouting.participants.map((participant) => participant.sends.map((asset) => asset.player.playerId)),
);
assert.ok(validateMultiTeamTradeRequest({ ...sandbox, participants: [{ ...sandbox.participants[0], outgoing: [{ playerId: "free", destinationFranchiseId: "b", value: 99 }] }, sandbox.participants[1], sandbox.participants[2]] }, context).some((error) => error.code === "CLIENT_VALUATION_FORBIDDEN"));
const model = buildMultiTeamModelSummary([
  { participantId: "one", playersSent: [{ playerId: "x", modelValue: 50, acquisitionCost: 10, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }], playersReceived: [{ playerId: "z", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }] },
  { participantId: "two", playersSent: [{ playerId: "y", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }], playersReceived: [{ playerId: "x", modelValue: 50, acquisitionCost: 10, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }] },
  { participantId: "three", playersSent: [{ playerId: "z", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }], playersReceived: [{ playerId: "y", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }] },
]);
assert.equal(model.status, "READY");
assert.equal(model.participantResults.length, 3);
assert.equal(model.globalGap !== null, true);
assert.equal(model.calibrationApplicability, "MULTI_TEAM_UNCALIBRATED");
assert.equal(model.historicalFairnessScore, null);
assert.equal(model.largestModelEdgeParticipantId, model.highestNetParticipantId);
assert.equal(buildMultiTeamModelSummary([
  { participantId: "one", playersSent: [{ playerId: "x", modelValue: 50, acquisitionCost: 10, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }], playersReceived: [{ playerId: "z", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }] },
  { participantId: "two", playersSent: [{ playerId: "y", modelValue: 30, acquisitionCost: 8, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }], playersReceived: [{ playerId: "x", modelValue: 50, acquisitionCost: 10, acquisitionCostStatus: "KNOWN", acquisitionCostProvenance: "CURRENT_RIVER_CITY_COST_BASIS" }] },
]).historicalFairnessScore !== null, true);
assert.equal(buildMultiTeamModelSummary([{ participantId: "sandbox", playersSent: [{ playerId: "free", modelValue: 20, acquisitionCost: null, acquisitionCostStatus: "MISSING", acquisitionCostProvenance: "UNAVAILABLE" }], playersReceived: [] }, { participantId: "other", playersSent: [], playersReceived: [] }]).status, "UNAVAILABLE");
const leaders = buildMultiTeamSignalLeaders([
  { participantId: "one", deltaTalent: 10, deltaSurplus: 2, auctionTotal: 30, auctionCoverage: "COMPLETE", medianAdp: 12, adpCoverage: "COMPLETE" },
  { participantId: "two", deltaTalent: 4, deltaSurplus: 6, auctionTotal: 20, auctionCoverage: "COMPLETE", medianAdp: 20, adpCoverage: "COMPLETE" },
  { participantId: "three", deltaTalent: -2, deltaSurplus: 1, auctionTotal: null, auctionCoverage: "PARTIAL", medianAdp: null, adpCoverage: "UNAVAILABLE" },
]);
assert.equal(leaders.find((signal) => signal.signal === "MODEL_TALENT")?.leadingParticipantId, "one");
assert.equal(leaders.find((signal) => signal.signal === "ACQUISITION_SURPLUS")?.leadingParticipantId, "two");
assert.equal(leaders.find((signal) => signal.signal === "AUCTION_CONSENSUS")?.leadingParticipantId, "one");
assert.equal(leaders.find((signal) => signal.signal === "ADP")?.leadingParticipantId, "one");
assert.doesNotMatch(JSON.stringify(routed), /target|cap|strategy|note|budget|finance|email|uid|WarRoom/i);
console.log("Trade Comparison M10 multi-team and Sandbox foundation checks passed.");
