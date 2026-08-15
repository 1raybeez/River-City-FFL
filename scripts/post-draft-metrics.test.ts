import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculatePostDraftMetrics,
  calculatePrivatePostDraftMetrics,
  type PostDraftMetricsInput,
  type PostDraftPlayerInput,
} from "../lib/postDraftMetrics";
import type { CanonicalPowerRankings } from "../lib/powerRankings";

const serviceSource = readFileSync("lib/postDraftMetrics.ts", "utf8");
assert.match(serviceSource, /getCanonicalPowerRankings/);
assert.match(serviceSource, /normalizeSleeperAuctionSyncSnapshot/);
assert.match(serviceSource, /riverCityAuctionLeagueSettings\.auctionBudgetPerTeam/);
assert.doesNotMatch(serviceSource, /winProbability|playoffOdds|championshipOdds|draftGrade|trashTalk|narrative/);

const powerRankings: CanonicalPowerRankings = {
  season: 2026,
  generatedAt: "2026-09-01T00:00:00.000Z",
  label: "Roster Strength Index",
  coverage: {
    status: "complete",
    rosterCount: 12,
    playerCount: 12,
    valuedPlayerCount: 12,
    missingValuePlayerCount: 0,
    sosPlayerCount: 12,
    missingSosPlayerCount: 0,
    unmappedFranchiseCount: 0,
    message: null,
  },
  sources: {
    rosters: "Sleeper",
    ownership: "Sleeper",
    playerValues: "Firestore player_stats",
  },
  teams: Array.from({ length: 12 }, (_, index) => ({
    franchiseId: index === 0
      ? "prestigio-mundial"
      : index === 1
        ? "shake-n-bakers"
        : `franchise-${index + 1}`,
    rosterId: index + 1,
    teamName: index === 0
      ? "Prestigio Mundial"
      : index === 1
        ? "The Shake-N-Bakers"
        : `Team ${index + 1}`,
    avatar: null,
    rank: index + 1,
    rosterValue: 100 - index,
    averageSOS: 50,
    powerScore: 180 - index,
    normalizedIndex: 100 / 12,
    coverage: "complete",
    status: "Preseason Outlook",
  })),
};

const players = new Map<string, PostDraftPlayerInput>([
  ["p1", { playerId: "p1", playerName: "Keeper One", position: "RB", nflTeam: "ATL", publishedValue: 100, adp: 12 }],
  ["p2", { playerId: "p2", playerName: "Reach Two", position: "WR", nflTeam: "BUF", publishedValue: 20, adp: 60 }],
  ["p3", { playerId: "p3", playerName: "Value Three", position: "TE", nflTeam: "KC", publishedValue: 40, adp: 30 }],
]);

const input: PostDraftMetricsInput = {
  season: 2026,
  draftId: "draft-2026",
  draftStatus: "complete",
  draftPickCount: 13,
  rosters: [
    { rosterId: 1, ownerUserId: "ray", teamName: "Prestigio Mundial", playerIds: ["p1", "p2"], starterIds: ["p1"] },
    { rosterId: 2, ownerUserId: "jordan", teamName: "The Shake-N-Bakers", playerIds: ["p3"], starterIds: ["p3"] },
    ...Array.from({ length: 10 }, (_, index) => ({
      rosterId: index + 3,
      ownerUserId: `owner-${index + 3}`,
      teamName: `Team ${index + 3}`,
      playerIds: [],
      starterIds: [],
    })),
  ],
  acquisitions: [
    { playerId: "p1", playerName: "Keeper One", position: "RB", nflTeam: "ATL", rosterId: 1, purchasePrice: 20, isKeeper: true, pickNumber: 1, keeperCost: 20 },
    { playerId: "p2", playerName: "Reach Two", position: "WR", nflTeam: "BUF", rosterId: 1, purchasePrice: 30, isKeeper: false, pickNumber: 2, keeperCost: null },
    { playerId: "p3", playerName: "Value Three", position: "TE", nflTeam: "KC", rosterId: 2, purchasePrice: 25, isKeeper: false, pickNumber: 3, keeperCost: null },
  ],
  players,
  powerRankings,
  rosterRequirements: {
    rosterPositions: ["QB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN", "BN", "BN", "BN"],
    requiredStarterSlots: { QB: 1, RB: 1, WR: 2, TE: 1, K: 1, DEF: 1 },
    flexSlots: 1,
    flexEligiblePositions: ["RB", "WR", "TE"],
    rosterSlotCapacity: 16,
    source: "Sleeper league.roster_positions",
  },
  generatedAt: "2026-09-01T00:00:00.000Z",
};

const incomplete = calculatePostDraftMetrics({ ...input, draftStatus: "drafting" });
assert.equal(incomplete.status, "not-ready");
assert.match(incomplete.warnings.join(" "), /not complete/);

const result = calculatePostDraftMetrics(input);
assert.equal(result.status, "ready");
assert.equal(result.records.length, 12);
assert.equal(result.records.filter((record) => record.franchiseId === "prestigio-mundial").length, 1);
assert.equal(result.records.filter((record) => record.franchiseId === "shake-n-bakers").length, 1);

const prestigio = result.records.find((record) => record.franchiseId === "prestigio-mundial");
assert.ok(prestigio);
assert.equal(prestigio.metrics.totalSpend, 50);
assert.equal(prestigio.metrics.remainingBudget, 150);
assert.deepEqual(prestigio.metrics.positionSpend.RB, { totalSpend: 20, playerCount: 1, shareOfTotalSpend: 0.4 });
assert.deepEqual(prestigio.metrics.positionSpend.WR, { totalSpend: 30, playerCount: 1, shareOfTotalSpend: 0.6 });
assert.deepEqual(prestigio.metrics.positionCounts, { RB: 1, WR: 1 });
assert.equal(prestigio.metrics.keeperCount, 1);
assert.equal(prestigio.metrics.totalKeeperCost, 20);
assert.equal(prestigio.metrics.rosterValue, 120);
assert.equal(prestigio.metrics.bestBuy?.playerId, "p1");
assert.equal(prestigio.metrics.biggestReach?.playerId, "p2");
assert.equal(prestigio.metrics.powerRanking.rank, 1);
assert.equal(prestigio.metrics.powerRanking.rawScore, 180);
assert.deepEqual(prestigio.metrics.requiredStarterSlots, { QB: 1, RB: 1, WR: 2, TE: 1, K: 1, DEF: 1, FLEX: 1 });
assert.equal(prestigio.metrics.coveredStarterSlots, 2);
assert.equal(prestigio.metrics.uncoveredStarterSlots, 6);
assert.equal(prestigio.metrics.totalDepth, 0);
assert.equal(prestigio.metrics.rosterCompleteness.capacity, 16);
assert.equal(prestigio.metrics.rosterCompleteness.filledSlots, 2);
assert.equal(prestigio.metrics.depthCoverageStatus, "complete");

const structurePlayers = new Map([
  ...players,
  ["p4", { playerId: "p4", playerName: "Quarterback", position: "QB", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p5", { playerId: "p5", playerName: "Wide Two", position: "WR", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p6", { playerId: "p6", playerName: "Tight End", position: "TE", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p7", { playerId: "p7", playerName: "Kicker", position: "K", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p8", { playerId: "p8", playerName: "Defense", position: "DEF", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p9", { playerId: "p9", playerName: "Flex Back", position: "RB", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p10", { playerId: "p10", playerName: "Wide Three", position: "WR", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
  ["p11", { playerId: "p11", playerName: "Bench Back", position: "RB", nflTeam: "ATL", publishedValue: 10, adp: 10 }],
]);
const fullStructureInput = {
  ...input,
  players: structurePlayers,
  rosters: input.rosters.map((roster) => roster.rosterId === 1
    ? { ...roster, playerIds: ["p4", "p1", "p2", "p5", "p6", "p7", "p8", "p9", "p10", "p11"] }
    : roster),
};
const fullStructure = calculatePostDraftMetrics(fullStructureInput).records[0].metrics;
assert.equal(fullStructure.coveredStarterSlots, 8);
assert.equal(fullStructure.uncoveredStarterSlots, 0);
assert.deepEqual(fullStructure.starterCoverageByPosition.FLEX, { required: 1, covered: 1, uncovered: 0 });
assert.deepEqual(fullStructure.depthByPosition, { WR: 1, RB: 1 });
assert.equal(fullStructure.totalDepth, 2);
assert.equal(fullStructure.rosterCompleteness.filledSlots, 10);
const shallowStructure = calculatePostDraftMetrics({
  ...fullStructureInput,
  rosters: fullStructureInput.rosters.map((roster) => roster.rosterId === 1
    ? { ...roster, playerIds: roster.playerIds.filter((playerId) => playerId !== "p11") }
    : roster),
}).records[0].metrics;
assert.equal(shallowStructure.coveredStarterSlots, 8);
assert.equal(shallowStructure.totalDepth, 1);
const missingQb = calculatePostDraftMetrics({
  ...fullStructureInput,
  rosters: fullStructureInput.rosters.map((roster) => roster.rosterId === 1
    ? { ...roster, playerIds: roster.playerIds.filter((playerId) => playerId !== "p4") }
    : roster),
}).records[0].metrics;
assert.equal(missingQb.coveredStarterSlots, 7);
assert.equal(missingQb.uncoveredStarterSlots, 1);

const privateResult = calculatePrivatePostDraftMetrics(result, input, {
  warRoomId: "2026:prestigio-mundial",
  franchiseId: "prestigio-mundial",
  preferences: [
    {
      season: 2026,
      ownerProfileId: "ray-jeffrey",
      warRoomId: "2026:prestigio-mundial",
      sleeperPlayerId: "p1",
      tag: "target",
      preferredEntry: 18,
      plannedCap: 25,
      note: "private",
      updatedAt: "2026-08-01T00:00:00.000Z",
      updatedBy: "owner",
      schemaVersion: 2,
    },
    {
      season: 2026,
      ownerProfileId: "ray-jeffrey",
      warRoomId: "2026:prestigio-mundial",
      sleeperPlayerId: "p3",
      tag: "target",
      preferredEntry: 20,
      plannedCap: 20,
      note: "private",
      updatedAt: "2026-08-01T00:00:00.000Z",
      updatedBy: "owner",
      schemaVersion: 2,
    },
  ],
});
assert.equal(privateResult.status, "ready");
assert.equal(privateResult.records[0].privateMetrics.targetHitRate, 0.5);
assert.deepEqual(privateResult.records[0].privateMetrics.acquiredTargets.map((target) => target.playerId), ["p1"]);
assert.deepEqual(privateResult.records[0].privateMetrics.missedTargets.map((target) => target.playerId), ["p3"]);
assert.equal(privateResult.records[0].privateMetrics.capDiscipline.overCapCount, 0);
assert.equal(privateResult.records[0].privateMetrics.capDiscipline.underOrAtCapCount, 1);
assert.equal(privateResult.records[0].privateMetrics.capDiscipline.unavailableCount, 1);
assert.equal(privateResult.records[0].privateMetrics.preferredEntryDiscipline.unavailableCount, 1);
assert.equal("privateMetrics" in prestigio, false);
assert.equal(JSON.stringify(prestigio).includes("plannedCap"), false);
assert.equal(JSON.stringify(prestigio).includes("private"), false);
assert.equal("grade" in prestigio, false);

const missingValue = calculatePostDraftMetrics({
  ...input,
  players: new Map([...players, ["p2", { ...players.get("p2")!, publishedValue: null }]]),
});
assert.equal(missingValue.records[0].coverage.status, "partial");
assert.match(missingValue.records[0].coverage.warnings.join(" "), /partial|unavailable/);
assert.equal(missingValue.records[0].metrics.bestBuy?.playerId, "p1");

console.log("Post-draft deterministic metrics checks passed.");
