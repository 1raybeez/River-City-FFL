import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import {
  AUCTION_PURCHASE_DECISION_ROOT_COLLECTION,
  AUCTION_PURCHASE_DECISION_SUBCOLLECTION,
  type AuctionPurchaseDecisionSnapshot,
} from "@/lib/auction/purchaseDecisionTypes";

function getPurchaseDecisionCollection(season: number) {
  return firestore
    .collection(AUCTION_PURCHASE_DECISION_ROOT_COLLECTION)
    .doc(String(season))
    .collection(AUCTION_PURCHASE_DECISION_SUBCOLLECTION);
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPurchaseDecisionDocument(
  purchaseId: string,
  data: FirebaseFirestore.DocumentData
): AuctionPurchaseDecisionSnapshot | null {
  const season = readNullableNumber(data.season);
  const playerName = readNullableString(data.playerName);
  const source = readNullableString(data.source);
  const status = readNullableString(data.status) ?? "active";
  const salePrice = readNullableNumber(data.salePrice);
  const capturedAt = readNullableString(data.capturedAt);
  const capturedBy = readNullableString(data.capturedBy);

  if (
    season === null ||
    !Number.isInteger(season) ||
    !playerName ||
    (source !== "manual-local" && source !== "sleeper-draft") ||
    (status !== "active" && status !== "undone") ||
    salePrice === null ||
    !capturedAt ||
    !capturedBy
  ) {
    return null;
  }

  return {
    purchaseId,
    season,
    sleeperPlayerId: readNullableString(data.sleeperPlayerId),
    playerName,
    position: readNullableString(data.position),
    nflTeam: readNullableString(data.nflTeam),
    buyerOwnerProfileId: readNullableString(data.buyerOwnerProfileId),
    buyerTeamId: readNullableString(data.buyerTeamId),
    buyerRosterId: readNullableNumber(data.buyerRosterId),
    source,
    status,
    salePrice,
    purchaseOrder: readNullableNumber(data.purchaseOrder),
    purchasedAt: readNullableString(data.purchasedAt),
    tagAtPurchase: readNullableString(data.tagAtPurchase),
    preferredEntryAtPurchase: readNullableNumber(data.preferredEntryAtPurchase),
    plannedCapAtPurchase: readNullableNumber(data.plannedCapAtPurchase),
    liveOverrideAtPurchase: readNullableNumber(data.liveOverrideAtPurchase),
    marketValueAtPurchase: readNullableNumber(data.marketValueAtPurchase),
    recommendedMaxAtPurchase: readNullableNumber(data.recommendedMaxAtPurchase),
    currentAiCeilingAtPurchase: readNullableNumber(data.currentAiCeilingAtPurchase),
    legalMaxAtPurchase: readNullableNumber(data.legalMaxAtPurchase),
    predictedSaleAtPurchase: readNullableNumber(data.predictedSaleAtPurchase),
    adpAtPurchase: readNullableNumber(data.adpAtPurchase),
    demandTierAtPurchase: readNullableString(data.demandTierAtPurchase),
    inflationAtPurchase: readNullableNumber(data.inflationAtPurchase),
    roomIntelligenceSummary: readNullableString(data.roomIntelligenceSummary),
    competitionSummary: readNullableString(data.competitionSummary),
    plannedCapVariance: readNullableNumber(data.plannedCapVariance),
    marketVariance: readNullableNumber(data.marketVariance),
    recommendedMaxVariance: readNullableNumber(data.recommendedMaxVariance),
    aiCeilingVariance: readNullableNumber(data.aiCeilingVariance),
    capturedAt,
    capturedBy,
    undoneAt: readNullableString(data.undoneAt),
    undoneBy: readNullableString(data.undoneBy),
  };
}

export async function readAuctionPurchaseDecisionSnapshots({
  season = riverCityAuctionLeagueSettings.season,
}: {
  season?: number;
} = {}) {
  const snapshot = await getPurchaseDecisionCollection(season).get();

  return snapshot.docs
    .map((doc) => readPurchaseDecisionDocument(doc.id, doc.data()))
    .filter(
      (decision): decision is AuctionPurchaseDecisionSnapshot =>
        decision !== null
    );
}

export async function upsertAuctionPurchaseDecisionSnapshot({
  snapshot,
  capturedBy,
}: {
  snapshot: Omit<
    AuctionPurchaseDecisionSnapshot,
    "capturedAt" | "capturedBy" | "undoneAt" | "undoneBy"
  >;
  capturedBy: string;
}) {
  const capturedAt = new Date().toISOString();
  const serializedSnapshot: AuctionPurchaseDecisionSnapshot = {
    ...snapshot,
    capturedAt,
    capturedBy,
    undoneAt: null,
    undoneBy: null,
  };

  await getPurchaseDecisionCollection(serializedSnapshot.season)
    .doc(serializedSnapshot.purchaseId)
    .set(serializedSnapshot, { merge: true });

  return serializedSnapshot;
}

export async function markAuctionPurchaseDecisionUndone({
  season,
  purchaseId,
  undoneBy,
}: {
  season: number;
  purchaseId: string;
  undoneBy: string;
}) {
  const undoneAt = new Date().toISOString();

  await getPurchaseDecisionCollection(season).doc(purchaseId).set(
    {
      status: "undone",
      undoneAt,
      undoneBy,
    },
    { merge: true }
  );

  return { purchaseId, status: "undone" as const, undoneAt, undoneBy };
}
