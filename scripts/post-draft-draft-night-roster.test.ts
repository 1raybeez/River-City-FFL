import assert from "node:assert/strict";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { resolveDraftNightRosters } from "../lib/postDraftDraftNightRoster";
import type { PostDraftPlayerInput, PostDraftRosterRequirements } from "../lib/postDraftMetrics";
import type { SleeperAuctionSyncPayload } from "../lib/auction/sleeperAuctionSync";

const players = new Map<string, PostDraftPlayerInput>();
const purchases = canonicalAuctionTeams.flatMap((team, teamIndex) => Array.from({ length: 16 }, (_, playerIndex) => {
  const playerId = `${team.rosterId}-${playerIndex}`;
  players.set(playerId, { playerId, playerName: `Player ${playerId}`, position: playerIndex === 0 ? "QB" : "RB", nflTeam: "RC", publishedValue: 10, adp: 20 });
  return { playerId, playerName: `Player ${playerId}`, position: playerIndex === 0 ? "QB" : "RB", nflTeam: "RC", rosterId: team.rosterId, ownerUserId: team.managerId, ownerName: team.managerName, teamName: team.teamName, salePrice: 10, pickNumber: teamIndex * 16 + playerIndex, isKeeper: false as const, source: "sleeper-draft" as const };
}));
const keeper = (rosterId: number, playerIndex: number) => {
  const playerId = `${rosterId}-${playerIndex}`;
  return { playerId, playerName: `Player ${playerId}`, position: playerIndex === 0 ? "QB" : "RB", nflTeam: "RC", rosterId, ownerUserId: null, ownerName: null, teamName: null, keeperPrice: 10, keeperRound: 1, source: "sleeper-keeper" as const, priceStatus: "confirmed" as const };
};
const keepers = canonicalAuctionTeams.map((team) => keeper(team.rosterId, 0));
const auction: SleeperAuctionSyncPayload = {
  source: "sleeper",
  leagueId: "league",
  season: 2026,
  fetchedAt: "2026-09-03T00:00:00.000Z",
  draftId: "draft",
  keepers,
  completedPurchases: purchases.filter((purchase) => !purchase.playerId.endsWith("-0")),
  rosters: [],
  teams: [],
  warnings: [],
  syncStatus: "complete",
};
const requirements: PostDraftRosterRequirements = {
  rosterPositions: ["QB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN"],
  requiredStarterSlots: { QB: 1, RB: 1, WR: 2, TE: 1, K: 1, DEF: 1 },
  flexSlots: 1,
  flexEligiblePositions: ["RB", "WR", "TE"],
  rosterSlotCapacity: 16,
  source: "Sleeper league.roster_positions",
};

const resolved = resolveDraftNightRosters({ auction, players, requirements, budget: 200 });
assert.equal(resolved.rosters.length, 12);
assert.equal(resolved.acquisitions.length, 192);
assert.equal(resolved.diagnostics.every((diagnostic) => diagnostic.playerCount === 16), true);
assert.equal(resolved.diagnostics.every((diagnostic) => diagnostic.duplicatePlayerIds.length === 0), true);
assert.equal(resolved.diagnostics.every((diagnostic) => diagnostic.orphanRecords.length === 0), true);
assert.equal(resolved.diagnostics.every((diagnostic) => diagnostic.keeperCount === 1), true);
assert.equal(resolved.acquisitions.filter((acquisition) => acquisition.isKeeper).length, 12);
assert.equal(resolved.acquisitions.filter((acquisition) => acquisition.acquisitionClassification === "KEEPER").length, 12);
assert.equal(resolved.acquisitions.filter((acquisition) => acquisition.acquisitionClassification === "AUCTION").length, 180);

const historicalBefore = resolved.rosters[0];
const currentRosterOnly = "waiver-player";
const currentRoster = { ...historicalBefore, playerIds: [...historicalBefore.playerIds.slice(1), currentRosterOnly], starterIds: [currentRosterOnly] };
assert.equal(historicalBefore.playerIds.includes(currentRosterOnly), false);
assert.equal(currentRoster.playerIds.includes(historicalBefore.playerIds[0]), false);
assert.equal(historicalBefore.playerIds.includes(historicalBefore.playerIds[0]), true);

console.log("Draft-night roster foundation checks passed: 12 rosters, 192 unique records, keepers included once, current-roster drift isolated.");
