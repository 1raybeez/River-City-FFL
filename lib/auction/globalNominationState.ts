import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  GLOBAL_NOMINATION_DOCUMENT,
  GLOBAL_NOMINATION_ROOT_COLLECTION,
  type GlobalNominationRecord,
  type GlobalNominationReadResult,
} from "@/lib/auction/globalNominationTypes";

function getNominationRef(season: number) {
  return firestore
    .collection(GLOBAL_NOMINATION_ROOT_COLLECTION)
    .doc(String(season))
    .collection("state")
    .doc(GLOBAL_NOMINATION_DOCUMENT);
}

function readRecord(
  season: number,
  data: FirebaseFirestore.DocumentData | undefined
): GlobalNominationRecord | null {
  if (!data || data.season !== season) return null;
  const state = data.state === "active" || data.state === "cleared" ? data.state : null;
  const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : null;
  const updatedByOwnerId = typeof data.updatedByOwnerId === "string" ? data.updatedByOwnerId : null;
  const version = typeof data.version === "number" && Number.isInteger(data.version) ? data.version : null;
  if (!state || !updatedAt || !updatedByOwnerId || version === null) return null;

  return {
    season,
    state,
    playerId: typeof data.playerId === "string" ? data.playerId : null,
    playerName: typeof data.playerName === "string" ? data.playerName : null,
    position: typeof data.position === "string" ? data.position : null,
    nflTeam: typeof data.nflTeam === "string" ? data.nflTeam : null,
    nominatedByFranchiseId:
      typeof data.nominatedByFranchiseId === "string" ? data.nominatedByFranchiseId : null,
    nominatedByRosterId:
      typeof data.nominatedByRosterId === "number" ? data.nominatedByRosterId : null,
    openingBid: typeof data.openingBid === "number" ? data.openingBid : null,
    currentBid: typeof data.currentBid === "number" ? data.currentBid : null,
    updatedAt,
    updatedByOwnerId,
    version,
  };
}

export async function readGlobalNomination(season = 2026): Promise<GlobalNominationReadResult> {
  try {
    const snapshot = await getNominationRef(season).get();
    const record = snapshot.exists ? readRecord(season, snapshot.data()) : null;
    return {
      status: "available",
      nomination: record?.state === "active" ? record : null,
    };
  } catch (error) {
    return {
      status: "unavailable",
      nomination: null,
      error: error instanceof Error ? error.message : "Unable to read current nomination.",
    };
  }
}

export async function setGlobalNomination({
  season = 2026,
  actorOwnerId,
  franchiseId,
  rosterId,
  playerId,
  playerName,
  position,
  nflTeam,
  openingBid,
}: {
  season?: number;
  actorOwnerId: string;
  franchiseId: string;
  rosterId: number | null;
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  openingBid: number | null;
}): Promise<GlobalNominationRecord> {
  const ref = getNominationRef(season);
  let result: GlobalNominationRecord | null = null;
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? readRecord(season, snapshot.data()) : null;
    result = {
      season,
      state: "active",
      playerId,
      playerName,
      position,
      nflTeam,
      nominatedByFranchiseId: franchiseId,
      nominatedByRosterId: rosterId,
      openingBid,
      currentBid: openingBid,
      updatedAt: new Date().toISOString(),
      updatedByOwnerId: actorOwnerId,
      version: (previous?.version ?? 0) + 1,
    };
    transaction.set(ref, result);
  });
  if (!result) throw new Error("Unable to persist current nomination.");
  return result;
}

export async function clearGlobalNomination({
  season = 2026,
  actorOwnerId,
}: {
  season?: number;
  actorOwnerId: string;
}): Promise<GlobalNominationRecord> {
  const ref = getNominationRef(season);
  let result: GlobalNominationRecord | null = null;
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists ? readRecord(season, snapshot.data()) : null;
    result = {
      season,
      state: "cleared",
      playerId: null,
      playerName: null,
      position: null,
      nflTeam: null,
      nominatedByFranchiseId: null,
      nominatedByRosterId: null,
      openingBid: null,
      currentBid: null,
      updatedAt: new Date().toISOString(),
      updatedByOwnerId: actorOwnerId,
      version: (previous?.version ?? 0) + 1,
    };
    transaction.set(ref, result);
  });
  if (!result) throw new Error("Unable to clear current nomination.");
  return result;
}
