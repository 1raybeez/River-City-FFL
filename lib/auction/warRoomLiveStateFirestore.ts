import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  AUCTION_WAR_ROOM_COLLECTION,
} from "@/lib/auction/warRoomScope";
import {
  createEmptyWarRoomLiveAuctionState,
  getWarRoomLiveStatePath,
  type WarRoomBudgetState,
  type WarRoomKeeperState,
  type WarRoomLiveAuctionState,
  type WarRoomNominationState,
} from "@/lib/auction/warRoomLiveState";

function getLiveStateRef(warRoomId: string) {
  return firestore
    .collection(AUCTION_WAR_ROOM_COLLECTION)
    .doc(warRoomId)
    .collection("live")
    .doc("2026");
}

function readState(
  warRoomId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  actorOwnerId = "system:read"
): WarRoomLiveAuctionState {
  const state = data ?? {};
  return {
    ...createEmptyWarRoomLiveAuctionState(
      warRoomId,
      typeof state.updatedByOwnerId === "string"
        ? state.updatedByOwnerId
        : actorOwnerId,
      typeof state.updatedAt === "string" ? state.updatedAt : new Date(0).toISOString()
    ),
    keepers: Array.isArray(state.keepers) ? state.keepers : [],
    budget: state.budget ?? {
      teamBudget: 0,
      keeperCostTotal: 0,
      spentBudget: 0,
    },
    purchases: Array.isArray(state.purchases) ? state.purchases : [],
    nomination: state.nomination ?? null,
  };
}

export async function readWarRoomLiveAuctionState(warRoomId: string) {
  const snapshot = await getLiveStateRef(warRoomId).get();
  return snapshot.exists ? readState(warRoomId, snapshot.data()) : null;
}

async function updateState(
  warRoomId: string,
  actorOwnerId: string,
  update: (state: WarRoomLiveAuctionState) => WarRoomLiveAuctionState
): Promise<WarRoomLiveAuctionState> {
  const updatedAt = new Date().toISOString();
  const ref = getLiveStateRef(warRoomId);
  let result: WarRoomLiveAuctionState | null = null;

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = readState(
      warRoomId,
      snapshot.exists ? snapshot.data() : undefined,
      actorOwnerId
    );
    result = {
      ...update(current),
      season: 2026,
      warRoomId,
      updatedByOwnerId: actorOwnerId,
      updatedAt,
      schemaVersion: 1,
    };
    transaction.set(ref, result, { merge: true });
  });

  if (!result) throw new Error("Unable to persist War Room live state.");
  return result;
}

export function assertWarRoomLiveStatePath(warRoomId: string) {
  return getWarRoomLiveStatePath(warRoomId);
}

export function updateWarRoomKeepers({
  warRoomId,
  actorOwnerId,
  keepers,
}: {
  warRoomId: string;
  actorOwnerId: string;
  keepers: readonly WarRoomKeeperState[];
}) {
  return updateState(warRoomId, actorOwnerId, (state) => ({
    ...state,
    keepers: [...keepers],
  }));
}

export function updateWarRoomBudget({
  warRoomId,
  actorOwnerId,
  budget,
}: {
  warRoomId: string;
  actorOwnerId: string;
  budget: WarRoomBudgetState;
}) {
  return updateState(warRoomId, actorOwnerId, (state) => ({
    ...state,
    budget,
  }));
}

export function updateWarRoomNominationMetadata({
  warRoomId,
  actorOwnerId,
  nomination,
}: {
  warRoomId: string;
  actorOwnerId: string;
  nomination: WarRoomNominationState | null;
}) {
  return updateState(warRoomId, actorOwnerId, (state) => ({
    ...state,
    nomination,
  }));
}
