import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRecommendedNow } from "../lib/auction/recommendedNow";
import { reconcileAuctionPurchases } from "../lib/auction/purchaseReconciliation";

const values = [
  { playerId: "qb-a", playerName: "QB A", position: "QB", nflTeam: "BUF", auctionConsensus: 5, auctionLow: 4, auctionHigh: 6, auctionSourceCount: 5 },
  { playerId: "qb-b", playerName: "QB B", position: "QB", nflTeam: "BAL", auctionConsensus: 4, auctionLow: 3, auctionHigh: 5, auctionSourceCount: 5 },
  { playerId: "rb-a", playerName: "RB A", position: "RB", nflTeam: "DET", auctionConsensus: 30, auctionLow: 25, auctionHigh: 35, auctionSourceCount: 5 },
  { playerId: "wr-a", playerName: "WR A", position: "WR", nflTeam: "CIN", auctionConsensus: 28, auctionLow: 23, auctionHigh: 33, auctionSourceCount: 5 },
  { playerId: "te-a", playerName: "TE A", position: "TE", nflTeam: "KC", auctionConsensus: 20, auctionLow: 16, auctionHigh: 24, auctionSourceCount: 5 },
  { playerId: "target-a", playerName: "Target A", position: "QB", nflTeam: "MIA", auctionConsensus: 12, auctionLow: 10, auctionHigh: 15, auctionSourceCount: 5 },
  { playerId: "target-b", playerName: "Target B", position: "RB", nflTeam: "ATL", auctionConsensus: 2, auctionLow: 1, auctionHigh: 3, auctionSourceCount: 5 },
  { playerId: "fade-a", playerName: "Fade A", position: "WR", nflTeam: "NYG", auctionConsensus: 3, auctionLow: 2, auctionHigh: 4, auctionSourceCount: 5 },
];

const adp = values.map((value, index) => ({ playerId: value.playerId, adp: index + 1, sourceCount: 5 }));
const teams = [
  { rosterId: 1, remainingBudget: 120, rosterSlotsRemaining: 10 },
  { rosterId: 2, remainingBudget: 25, rosterSlotsRemaining: 3 },
];

const ownerA = buildRecommendedNow({
  values,
  adp,
  preferences: new Map([
    ["target-a", { tag: "target" as const, preferredEntry: 10, plannedCap: 15 }],
    ["fade-a", { tag: "fade" as const, preferredEntry: null, plannedCap: null }],
  ]),
  purchases: [
    { playerId: "owner-a-rb", playerName: "Owner A RB", position: "RB", price: 10, rosterId: 1, isKeeper: false },
  ],
  teams,
  rayRosterId: 1,
  rayBudget: { teamBudget: 200, keeperCostTotal: 0, spentBudget: 80, rosterSlotsTotal: 16 },
  generatedAt: "2026-08-19T00:00:00.000Z",
}, { diagnostic: true });

const ownerB = buildRecommendedNow({
  values,
  adp,
  preferences: new Map([
    ["target-b", { tag: "target" as const, preferredEntry: 8, plannedCap: 12 }],
    ["fade-a", { tag: "watch" as const, preferredEntry: null, plannedCap: null }],
  ]),
  purchases: [
    ...Array.from({ length: 2 }, (_, index) => ({ playerId: `owner-b-qb-${index}`, playerName: `Owner B QB ${index}`, position: "QB", price: 20, rosterId: 2, isKeeper: false })),
    ...Array.from({ length: 4 }, (_, index) => ({ playerId: `owner-b-rb-${index}`, playerName: `Owner B RB ${index}`, position: "RB", price: 10, rosterId: 2, isKeeper: false })),
    ...Array.from({ length: 4 }, (_, index) => ({ playerId: `owner-b-wr-${index}`, playerName: `Owner B WR ${index}`, position: "WR", price: 10, rosterId: 2, isKeeper: false })),
    { playerId: "owner-b-te-0", playerName: "Owner B TE", position: "TE", price: 10, rosterId: 2, isKeeper: true },
  ],
  teams,
  rayRosterId: 2,
  rayBudget: { teamBudget: 200, keeperCostTotal: 10, spentBudget: 180, rosterSlotsTotal: 16 },
  generatedAt: "2026-08-19T00:00:00.000Z",
}, { diagnostic: true });

const trace = (result: typeof ownerA, playerId: string) => result.diagnostic?.traces.find((row) => row.playerId === playerId);
const aQbTrace = trace(ownerA, "qb-a");
const bQbTrace = trace(ownerB, "qb-a");
assert.ok(aQbTrace && bQbTrace);
assert.ok(aQbTrace.rosterFit > bQbTrace.rosterFit);
assert.notDeepEqual(
  ownerA.recommendations.map((row) => [row.playerId, row.affordability]),
  ownerB.recommendations.map((row) => [row.playerId, row.affordability]),
);
assert.equal(ownerA.diagnostic?.qbGuidance.currentCount, 0);
assert.equal(ownerA.diagnostic?.qbGuidance.starterNeed, true);
assert.equal(ownerA.diagnostic?.qbGuidance.depthNeed, true);
assert.equal(ownerB.diagnostic?.qbGuidance.currentCount, 2);
assert.equal(ownerB.diagnostic?.qbGuidance.starterNeed, false);
assert.equal(ownerB.diagnostic?.qbGuidance.depthNeed, false);
assert.notEqual(ownerA.recommendations.find((row) => row.category === "ROSTER FIT")?.playerId, ownerB.recommendations.find((row) => row.category === "ROSTER FIT")?.playerId);
assert.equal(ownerA.recommendations.find((row) => row.playerId === "target-a")?.targetLow, 10);
assert.equal(ownerB.recommendations.find((row) => row.playerId === "target-b")?.targetLow, 8);
assert.equal(ownerB.recommendations.find((row) => row.playerId === "target-a")?.targetLow ?? null, null);
assert.equal(ownerA.recommendations.some((row) => row.playerId === "fade-a"), false);
assert.equal(ownerB.recommendations.some((row) => row.playerId === "fade-a"), true);
assert.notEqual(ownerA.diagnostic?.roster.remainingBudget, ownerB.diagnostic?.roster.remainingBudget);
assert.notEqual(ownerA.diagnostic?.roster.budgetSafeMax, ownerB.diagnostic?.roster.budgetSafeMax);

const reconciliation = reconcileAuctionPurchases({
  season: 2026,
  sleeperPurchases: [
    { playerId: "owner-a-purchase", playerName: "Owner A Purchase", position: "RB", nflTeam: null, rosterId: 1, ownerUserId: null, ownerName: null, teamName: null, salePrice: 30, pickNumber: 1, isKeeper: false, source: "sleeper-draft" as const },
    { playerId: "owner-b-purchase", playerName: "Owner B Purchase", position: "WR", nflTeam: null, rosterId: 2, ownerUserId: null, ownerName: null, teamName: null, salePrice: 40, pickNumber: 2, isKeeper: false, source: "sleeper-draft" as const },
  ],
  warRoomRosterId: 1,
});
assert.equal(reconciliation.activePurchases.find((row) => row.playerId === "owner-a-purchase")?.rosterId, 1);
assert.equal(reconciliation.activePurchases.find((row) => row.playerId === "owner-b-purchase")?.rosterId, 2);

const route = readFileSync("app/api/auction/recommended-now/route.ts", "utf8");
const serverRoute = readFileSync("lib/auction/recommendedNowServer.ts", "utf8");
assert.match(route, /requireAuctionWarRoomAccess/);
assert.match(serverRoute, /ownerProfileId/);
assert.match(serverRoute, /sleeperRosterId/);
assert.match(serverRoute, /warRoomId/);
assert.doesNotMatch(route, /searchParams\.get\("(?:ownerId|userId|ownerProfileId|franchiseId|rosterId|sleeperRosterId|warRoomId)"\)/);
assert.doesNotMatch(route, /request\.json/);
assert.doesNotMatch(route, /request\.text/);
assert.doesNotMatch(`${route}\n${readFileSync("lib/auction/recommendedNow.ts", "utf8")}`, /email|firebaseUid|authToken|cookie|private notes/i);
assert.doesNotMatch(readFileSync("lib/auction/recommendedNow.ts", "utf8"), /Fits Ray/);

console.log("recommended-now personalization isolation: PASS", JSON.stringify({
  ownerA: ownerA.recommendations.map(({ category, playerName, affordability }) => ({ category, playerName, affordability })),
  ownerB: ownerB.recommendations.map(({ category, playerName, affordability }) => ({ category, playerName, affordability })),
}));
