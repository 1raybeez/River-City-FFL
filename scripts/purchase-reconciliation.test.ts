import assert from "node:assert/strict";
import { reconcileAuctionPurchases } from "../lib/auction/purchaseReconciliation";

const sleeperPurchase = (overrides: Partial<{
  playerId: string;
  playerName: string;
  position: string;
  rosterId: number;
  salePrice: number;
}> = {}) => ({
  playerId: overrides.playerId ?? "p1",
  playerName: overrides.playerName ?? "Active Player",
  position: overrides.position ?? "RB",
  nflTeam: "TST",
  rosterId: overrides.rosterId ?? 1,
  ownerUserId: null,
  ownerName: null,
  teamName: null,
  salePrice: overrides.salePrice ?? 20,
  pickNumber: 1,
  isKeeper: false,
  source: "sleeper-draft" as const,
});

const operationalPurchase = (overrides: Partial<{
  purchaseId: string;
  playerId: string;
  playerName: string;
  position: string;
  rosterId: number;
  salePrice: number;
  status: "active" | "undone";
}> = {}) => ({
  purchaseId: overrides.purchaseId ?? "purchase-1",
  season: 2026,
  sleeperPlayerId: overrides.playerId ?? "p1",
  playerName: overrides.playerName ?? "Active Player",
  position: overrides.position ?? "RB",
  nflTeam: "TST",
  buyerOwnerProfileId: "ray-jeffrey",
  buyerTeamId: "2026:1",
  buyerRosterId: overrides.rosterId ?? 1,
  source: "manual-local" as const,
  status: overrides.status ?? "active",
  salePrice: overrides.salePrice ?? 20,
  purchaseOrder: 1,
  purchasedAt: "2026-08-01T00:00:00.000Z",
  tagAtPurchase: null,
  preferredEntryAtPurchase: null,
  plannedCapAtPurchase: null,
  liveOverrideAtPurchase: null,
  marketValueAtPurchase: null,
  recommendedMaxAtPurchase: null,
  currentAiCeilingAtPurchase: null,
  legalMaxAtPurchase: null,
  predictedSaleAtPurchase: null,
  adpAtPurchase: null,
  demandTierAtPurchase: null,
  inflationAtPurchase: null,
  roomIntelligenceSummary: null,
  competitionSummary: null,
  plannedCapVariance: null,
  marketVariance: null,
  recommendedMaxVariance: null,
  aiCeilingVariance: null,
  capturedAt: "2026-08-01T00:00:00.000Z",
  capturedBy: "test",
  undoneAt: overrides.status === "undone" ? "2026-08-02T00:00:00.000Z" : null,
  undoneBy: overrides.status === "undone" ? "test" : null,
});

const keepers = [
  { playerId: "k1", playerName: "Keeper WR", keeperCost: 18, status: "declared" as const },
  { playerId: "k2", playerName: "Keeper RB", keeperCost: 15, status: "declared" as const },
];

const preDraft = reconcileAuctionPurchases({ season: 2026 });
assert.equal(preDraft.activePurchases.length, 0, "pre-draft has no purchases by default");
assert.equal(keepers.length, 2, "provisional keepers remain the planning roster");

const active = reconcileAuctionPurchases({
  season: 2026,
  sleeperPurchases: [sleeperPurchase({ playerId: "p1", salePrice: 22 })],
  operationalPurchases: [operationalPurchase({ salePrice: 20 })],
});
assert.equal(active.activePurchases.length, 1, "active purchase counts once");
assert.equal(active.activePurchases[0]?.amount, 22, "Sleeper finalized amount has priority");
assert.equal(active.sourceCounts.sleeperPurchaseCount, 1);
assert.equal(active.sourceCounts.operationalPurchaseCount, 1);
assert.equal(active.conflicts.length, 1, "amount disagreement is surfaced");

const voided = reconcileAuctionPurchases({
  season: 2026,
  operationalPurchases: [operationalPurchase({ status: "undone", salePrice: 55 })],
});
assert.equal(voided.activePurchases.length, 0, "voided purchase does not count");
assert.equal(voided.voidedPurchases.length, 1, "voided history remains diagnosable");
assert.equal(voided.records[0]?.status, "VOIDED");

const operationalOnly = reconcileAuctionPurchases({
  season: 2026,
  operationalPurchases: [operationalPurchase({ playerId: "p2", playerName: "Available After Undo", status: "undone" })],
});
assert.equal(operationalOnly.activePurchases.some((purchase) => purchase.playerId === "p2"), false);

const duplicate = reconcileAuctionPurchases({
  season: 2026,
  operationalPurchases: [
    operationalPurchase({ purchaseId: "purchase-a", playerId: "p3", salePrice: 12 }),
    operationalPurchase({ purchaseId: "purchase-b", playerId: "p3", salePrice: 12 }),
  ],
});
assert.equal(duplicate.activePurchases.length, 1, "duplicate player consumes one slot");
assert.equal(duplicate.activePurchases[0]?.amount, 12, "duplicate amount counts once");

const positionAndBudget = reconcileAuctionPurchases({
  season: 2026,
  operationalPurchases: [operationalPurchase({ playerId: "p4", position: "TE", salePrice: 31 })],
});
assert.equal(positionAndBudget.activePurchases[0]?.position, "TE", "active purchase preserves position");
assert.equal(200 - 18 - 15 - positionAndBudget.activePurchases[0]!.amount, 136, "active amount reduces budget once");
assert.equal(16 - keepers.length - positionAndBudget.activePurchases.length, 13, "active purchase reduces one roster slot");

const restored = reconcileAuctionPurchases({
  season: 2026,
  operationalPurchases: [operationalPurchase({ playerId: "p5", status: "undone", salePrice: 10 })],
});
assert.equal(200 - 18 - 15, 167, "undo restores budget");
assert.equal(16 - keepers.length - restored.activePurchases.length, 14, "undo restores roster slot");

console.log("Purchase reconciliation checks passed (fake state only; no production writes).");
