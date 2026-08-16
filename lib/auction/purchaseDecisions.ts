import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { AUCTION_WAR_ROOM_COLLECTION } from "@/lib/auction/warRoomScope";
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

export class AuctionPurchaseIntegrityError extends Error {
  constructor(
    public readonly code:
      | "invalid-buyer"
      | "invalid-player"
      | "duplicate-player"
      | "invalid-price"
      | "insufficient-budget"
      | "roster-full"
      | "stale-state",
    message: string
  ) {
    super(message);
    this.name = "AuctionPurchaseIntegrityError";
  }
}

export async function recordAuctionPurchaseAtomically({
  snapshot,
  capturedBy,
  buyerTeamId,
  buyerRosterId,
  buyerOwnerProfileId,
  buyerWarRoomId,
}: {
  snapshot: Omit<
    AuctionPurchaseDecisionSnapshot,
    "capturedAt" | "capturedBy" | "undoneAt" | "undoneBy"
  >;
  capturedBy: string;
  buyerTeamId: string;
  buyerRosterId: number;
  buyerOwnerProfileId: string;
  buyerWarRoomId: string;
}) {
  const team = canonicalAuctionTeams.find(
    (candidate) =>
      candidate.id === buyerTeamId && candidate.rosterId === buyerRosterId
  );
  if (!team || team.warRoomId !== buyerWarRoomId) {
    throw new AuctionPurchaseIntegrityError(
      "invalid-buyer",
      "The selected buyer is not a valid canonical 2026 franchise and roster."
    );
  }

  const price = snapshot.salePrice;
  if (!Number.isFinite(price) || !Number.isInteger(price) || price < 1) {
    throw new AuctionPurchaseIntegrityError(
      "invalid-price",
      "Purchase price must be a whole-dollar amount of at least $1."
    );
  }
  if (!snapshot.sleeperPlayerId || !/^[A-Za-z0-9_-]+$/.test(snapshot.sleeperPlayerId)) {
    throw new AuctionPurchaseIntegrityError(
      "invalid-player",
      "A valid Sleeper player ID is required."
    );
  }

  const collection = getPurchaseDecisionCollection(snapshot.season);
  const purchaseRef = collection.doc(snapshot.purchaseId);
  const keeperRef = firestore
    .collection(AUCTION_WAR_ROOM_COLLECTION)
    .doc(team.warRoomId)
    .collection("live")
    .doc(String(snapshot.season));
  const playerLockRef = firestore
    .collection(AUCTION_PURCHASE_DECISION_ROOT_COLLECTION)
    .doc(String(snapshot.season))
    .collection("player_locks")
    .doc(snapshot.sleeperPlayerId);
  let result: AuctionPurchaseDecisionSnapshot | null = null;
  let idempotent = false;

  await firestore.runTransaction(async (transaction) => {
    const [purchaseSnapshot, keeperSnapshot, playerLockSnapshot] = await Promise.all([
      transaction.get(collection),
      transaction.get(keeperRef),
      transaction.get(playerLockRef),
    ]);
    const existing = purchaseSnapshot.docs
      .map((doc) => readPurchaseDecisionDocument(doc.id, doc.data()))
      .filter((value): value is AuctionPurchaseDecisionSnapshot => value !== null);
    const existingById = existing.find((item) => item.purchaseId === snapshot.purchaseId);
    if (existingById) {
      if (
        existingById.sleeperPlayerId !== snapshot.sleeperPlayerId ||
        existingById.buyerRosterId !== buyerRosterId ||
        existingById.salePrice !== price
      ) {
        throw new AuctionPurchaseIntegrityError(
          "stale-state",
          "This sale ID belongs to a different purchase and cannot be reused."
        );
      }
      result = existingById;
      idempotent = true;
      return;
    }

    const playerLockPurchaseId =
      typeof playerLockSnapshot.data()?.purchaseId === "string"
        ? playerLockSnapshot.data()?.purchaseId
        : null;
    const lockedPurchase = playerLockPurchaseId
      ? existing.find((item) => item.purchaseId === playerLockPurchaseId)
      : null;
    if (lockedPurchase?.status === "active") {
      throw new AuctionPurchaseIntegrityError(
        "duplicate-player",
        `${snapshot.playerName} is already recorded as purchased or drafted.`
      );
    }

    const duplicate = existing.find(
      (item) =>
        item.status === "active" &&
        item.sleeperPlayerId === snapshot.sleeperPlayerId
    );
    if (duplicate) {
      throw new AuctionPurchaseIntegrityError(
        "duplicate-player",
        `${snapshot.playerName} is already recorded as purchased or drafted.`
      );
    }

    const keeperData = keeperSnapshot.exists ? keeperSnapshot.data() : null;
    const keeperCost = Array.isArray(keeperData?.keepers)
      ? keeperData.keepers.reduce(
          (total: number, keeper: { keeperCost?: unknown }) =>
            total + (typeof keeper.keeperCost === "number" && Number.isFinite(keeper.keeperCost) && keeper.keeperCost > 0 ? keeper.keeperCost : 0),
          0
        )
      : 0;
    const spentBudget = existing
      .filter((item) => item.status === "active" && item.buyerRosterId === buyerRosterId)
      .reduce((total, item) => total + item.salePrice, 0);
    const filledRosterSlots =
      (Array.isArray(keeperData?.keepers) ? keeperData.keepers.length : 0) +
      existing.filter(
        (item) => item.status === "active" && item.buyerRosterId === buyerRosterId
      ).length;
    const remainingBudget =
      riverCityAuctionLeagueSettings.auctionBudgetPerTeam - keeperCost - spentBudget;
    if (price > remainingBudget) {
      throw new AuctionPurchaseIntegrityError(
        "insufficient-budget",
        `Purchase exceeds the buyer's authoritative remaining budget of $${Math.max(0, remainingBudget)}.`
      );
    }
    if (filledRosterSlots >= team.rosterSlots.total) {
      throw new AuctionPurchaseIntegrityError(
        "roster-full",
        "The selected franchise has no roster slot remaining."
      );
    }

    const capturedAt = new Date().toISOString();
    const serializedSnapshot: AuctionPurchaseDecisionSnapshot = {
      ...snapshot,
      buyerOwnerProfileId,
      buyerTeamId: team.id,
      buyerRosterId: team.rosterId,
      capturedAt,
      capturedBy,
      // Private strategy inputs are deliberately not persisted in this shared record.
      tagAtPurchase: null,
      preferredEntryAtPurchase: null,
      plannedCapAtPurchase: null,
      liveOverrideAtPurchase: null,
      roomIntelligenceSummary: null,
      competitionSummary: null,
      undoneAt: null,
      undoneBy: null,
    };
    if (playerLockSnapshot.exists) {
      transaction.set(playerLockRef, {
        season: snapshot.season,
        playerId: snapshot.sleeperPlayerId,
        purchaseId: snapshot.purchaseId,
        buyerRosterId,
        updatedAt: capturedAt,
      });
    } else {
      transaction.create(playerLockRef, {
        season: snapshot.season,
        playerId: snapshot.sleeperPlayerId,
        purchaseId: snapshot.purchaseId,
        buyerRosterId,
        createdAt: capturedAt,
      });
    }
    transaction.create(purchaseRef, serializedSnapshot);
    result = serializedSnapshot;
  });

  if (!result) throw new Error("Unable to persist purchase decision.");
  return { snapshot: result, idempotent };
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
