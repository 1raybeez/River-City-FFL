import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getCanonicalAuctionTeamByRosterId } from "../lib/auction/canonicalTeamCatalog";
import { validateMultiTeamTradeRequest } from "../lib/tradeComparison/multiTeamFoundation";

const adapter = readFileSync("lib/tradeComparison/serverRecommendationAdapter.ts", "utf8");
const prestigo = getCanonicalAuctionTeamByRosterId(1);
const etn = getCanonicalAuctionTeamByRosterId(4);
assert.equal(prestigo?.franchiseId, "prestigio-mundial");
assert.equal(etn?.franchiseId, "the-shepherd");
assert.notEqual(etn?.franchiseId, "etn-deez-nutz");
assert.match(adapter, /p1dTyson/);
assert.match(adapter, /Jordyn Tyson/);

const player = (playerId: string, name: string) => ({ playerId, name, position: "QB" as const, nflTeam: "NFL" });
const context = {
  rosters: [
    { franchiseId: prestigo!.franchiseId, franchiseName: prestigo!.teamName, rosterId: 1, available: true, players: [player("12545", "Tyler Shough"), player("13281", "Jordyn Tyson")] },
    { franchiseId: etn!.franchiseId, franchiseName: "ETN’ Deez Nutz", rosterId: 4, available: true, players: [player("7523", "Trevor Lawrence"), player("7526", "Jaylen Waddle")] },
  ],
  playerDirectory: new Map([["12545", player("12545", "Tyler Shough")], ["13281", player("13281", "Jordyn Tyson")], ["7523", player("7523", "Trevor Lawrence")], ["7526", player("7526", "Jaylen Waddle")]]),
  marketByPlayer: new Map(),
};
const request = { version: "m10", mode: "LEAGUE_TRADE", season: 2026, participants: [{ participantId: "prestigio-mundial", franchiseId: "prestigio-mundial", outgoing: [{ playerId: "12545", destinationFranchiseId: "the-shepherd" }, { playerId: "13281", destinationFranchiseId: "the-shepherd" }] }, { participantId: "the-shepherd", franchiseId: "the-shepherd", outgoing: [{ playerId: "7523", destinationFranchiseId: "prestigio-mundial" }, { playerId: "7526", destinationFranchiseId: "prestigio-mundial" }] }] };
assert.deepEqual(validateMultiTeamTradeRequest(request, context), []);
assert.ok(validateMultiTeamTradeRequest({ ...request, participants: request.participants.map((participant) => ({ ...participant, franchiseId: participant.franchiseId === "the-shepherd" ? "ETN’ Deez Nutz" : participant.franchiseId })) }, context).some((error) => error.code === "UNKNOWN_FRANCHISE"));
assert.match(adapter, /getCanonicalAuctionTeamByRosterId\(roster\?\.rosterId\)/);
assert.doesNotMatch(adapter, /etn-deez-nutz/);
console.log("Recommendation diagnostic franchise routing checks passed.");
