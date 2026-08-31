import assert from "node:assert/strict";
import { buildAcquisitionSnapshot } from "../lib/tradeComparison/fairness/acquisitionSnapshot";
import { buildTwoTeamFairnessActivation } from "../lib/tradeComparison/fairness/activation";
import type { NormalizedSleeperAuctionPick, Transaction } from "../lib/sleeper";
import type { MultiTeamMarketEntry, MultiTeamParticipantResult } from "../lib/tradeComparison/multiTeamTypes";

const pick = (playerId: string, rosterId: number, amount: number, isKeeper = false): NormalizedSleeperAuctionPick => ({
  draftId: "draft-2026",
  playerId,
  playerName: playerId,
  firstName: null,
  lastName: null,
  position: "RB",
  nflTeam: "BUF",
  pickedByUserId: null,
  rosterId,
  round: 1,
  draftSlot: 1,
  pickNo: 1,
  isKeeper,
  auctionPrice: amount,
  rawAuctionAmount: String(amount),
  hasAuctionPrice: true,
  needsAuctionPriceReview: false,
});

const transaction = (overrides: Partial<Transaction>): Transaction => ({
  transaction_id: "transaction",
  type: "waiver",
  status: "complete",
  roster_ids: [1],
  ...overrides,
});

const market = new Map<string, MultiTeamMarketEntry>([
  ...["keeper", "auction", "traded", "waiver-zero", "waiver-paid", "other"].map((playerId) => [playerId, {
    playerId,
    value: 25,
    season: 2026,
    sourceLabel: "Published auction consensus",
    sourceCount: 5,
    averageAdp: 20,
    adpSourceCount: 5,
  } satisfies MultiTeamMarketEntry] as const),
]);

const snapshot = buildAcquisitionSnapshot({
  season: 2026,
  teams: [{ franchiseId: "team-a", rosterId: 1 }, { franchiseId: "team-b", rosterId: 2 }],
  rosters: [
    { roster_id: 1, players: ["keeper", "auction", "waiver-zero", "waiver-paid"] },
    { roster_id: 2, players: ["other", "traded"] },
  ],
  picks: [pick("keeper", 1, 10, true), pick("auction", 1, 20), pick("traded", 1, 3), pick("other", 2, 15)],
  transactions: [
    transaction({ transaction_id: "zero", adds: { "waiver-zero": 1 }, settings: { waiver_bid: 0 } }),
    transaction({ transaction_id: "paid", adds: { "waiver-paid": 1 }, settings: { waiver_bid: 7 } }),
    transaction({ transaction_id: "trade", type: "trade", roster_ids: [1, 2], adds: { traded: 2 }, drops: { traded: 1 } }),
  ],
  auctionValues: market,
  generatedAt: "2026-08-30T00:00:00.000Z",
});

assert.equal(snapshot.size, 6);
assert.equal(snapshot.get("2026:team-a:keeper")?.currentAcquisitionType, "KEEPER");
assert.equal(snapshot.get("2026:team-a:keeper")?.fairnessEligibility, "ELIGIBLE");
assert.equal(snapshot.get("2026:team-a:auction")?.currentAcquisitionCost, 20);
assert.equal(snapshot.get("2026:team-a:waiver-zero")?.fairnessEligibility, "INELIGIBLE");
assert.equal(snapshot.get("2026:team-a:waiver-zero")?.currentAcquisitionCost, null);
assert.equal(snapshot.get("2026:team-a:waiver-zero")?.transactionEvidence?.waiverBid, 0);
assert.equal(snapshot.get("2026:team-a:waiver-paid")?.transactionEvidence?.waiverBid, 7);
assert.equal(snapshot.get("2026:team-b:traded")?.currentAcquisitionType, "POST_DRAFT_TRADE");
assert.equal(snapshot.get("2026:team-b:traded")?.originalFranchiseId, "team-a");
assert.equal(snapshot.get("2026:team-b:traded")?.originalAcquisitionCost, 3);
assert.equal(snapshot.get("2026:team-b:traded")?.currentAcquisitionCost, null);
assert.equal(snapshot.get("2026:team-b:traded")?.fairnessEligibility, "INELIGIBLE");
assert.equal(snapshot.get("2026:team-b:traded")?.highestSeasonAcquisitionPrice, 3);
assert.equal(snapshot.get("2026:team-b:traded")?.projectedNextSeasonKeeperCost, 13);

function participant(participantId: string, franchiseId: string, sends: string[], receives: string[]): MultiTeamParticipantResult {
  const player = (playerId: string) => ({ playerId, name: playerId, position: "RB" as const, nflTeam: "BUF", injuryStatus: null, avatar: null, byeWeek: null });
  return {
    participantId,
    franchiseId,
    sends: sends.map((playerId) => ({ player: player(playerId), sourceFranchiseId: franchiseId, destinationFranchiseId: franchiseId === "team-a" ? "team-b" : "team-a" })),
    receives: receives.map((playerId) => ({ player: player(playerId), sourceFranchiseId: franchiseId === "team-a" ? "team-b" : "team-a", destinationFranchiseId: franchiseId })),
    rosterContext: "CURRENT_FACT",
    positionalBefore: {},
    positionalAfter: {},
    market: { sent: { totalAuctionConsensus: null, auctionCoverage: "UNAVAILABLE", medianAdp: null, bestAdp: null, adpCoverage: "UNAVAILABLE" }, received: { totalAuctionConsensus: null, auctionCoverage: "UNAVAILABLE", medianAdp: null, bestAdp: null, adpCoverage: "UNAVAILABLE" } },
    reasoning: [],
    faabSent: null,
    faabReceived: [],
  };
}

const eligible = buildTwoTeamFairnessActivation({
  participants: [participant("a", "team-a", ["keeper"], ["other"]), participant("b", "team-b", ["other"], ["keeper"])],
  acquisitionSnapshot: snapshot,
  marketByPlayer: market,
  draftStatus: "complete",
});
assert.equal(eligible.status, "READY");
assert.equal(eligible.result?.status, "READY");
assert.equal(eligible.result?.sideA?.deltaFaab, 0);

const blocked = buildTwoTeamFairnessActivation({
  participants: [participant("a", "team-a", ["keeper"], ["traded"]), participant("b", "team-b", ["traded"], ["keeper"])],
  acquisitionSnapshot: snapshot,
  marketByPlayer: market,
  draftStatus: "complete",
});
assert.equal(blocked.status, "UNAVAILABLE");
assert.equal(blocked.reason, "POST_DRAFT_ACQUISITION_POLICY_UNDEFINED");
assert.deepEqual(blocked.affectedPlayerNames, ["traded"]);

const multiTeam = buildTwoTeamFairnessActivation({
  participants: [participant("a", "team-a", ["keeper"], []), participant("b", "team-b", ["other"], []), participant("c", "team-c", ["auction"], [])],
  acquisitionSnapshot: snapshot,
  marketByPlayer: market,
  draftStatus: "complete",
});
assert.equal(multiTeam.status, "NOT_APPLICABLE");

console.log("Trade fairness activation tests passed.");
