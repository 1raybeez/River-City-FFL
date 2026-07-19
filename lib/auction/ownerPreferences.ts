import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  AUCTION_OWNER_PREFERENCES_COLLECTION,
  AUCTION_OWNER_PROFILE_ID,
  getAuctionOwnerPreferenceScopeId,
  type AuctionOwnerPlayerPreference,
  type AuctionOwnerPreferenceTag,
} from "@/lib/auction/ownerPreferenceTypes";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";

const validOwnerPreferenceTags = new Set<AuctionOwnerPreferenceTag>([
  "open",
  "target",
  "watch",
  "fade",
]);

function getPreferenceScopeRef(season: number, ownerProfileId: string) {
  return firestore
    .collection(AUCTION_OWNER_PREFERENCES_COLLECTION)
    .doc(getAuctionOwnerPreferenceScopeId(season, ownerProfileId));
}

function getPreferencePlayersCollection(season: number, ownerProfileId: string) {
  return getPreferenceScopeRef(season, ownerProfileId).collection("players");
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOwnerPreferenceDocument(
  sleeperPlayerId: string,
  data: FirebaseFirestore.DocumentData
): AuctionOwnerPlayerPreference | null {
  const season = readNullableNumber(data.season);
  const ownerProfileId = readNullableString(data.ownerProfileId);
  const tag = data.tag;
  const updatedAt = readNullableString(data.updatedAt);
  const updatedBy = readNullableString(data.updatedBy);

  if (
    season === null ||
    !Number.isInteger(season) ||
    !ownerProfileId ||
    !validOwnerPreferenceTags.has(tag) ||
    !updatedAt ||
    !updatedBy
  ) {
    return null;
  }

  return {
    season,
    ownerProfileId,
    sleeperPlayerId,
    tag,
    preferredEntry: readNullableNumber(
      data.preferredEntry ?? data.openingBid
    ),
    plannedCap: readNullableNumber(data.plannedCap ?? data.hardCap),
    note: readNullableString(data.note),
    updatedAt,
    updatedBy,
    schemaVersion: 2,
  };
}

export async function readAuctionOwnerPreferences({
  season = riverCityAuctionLeagueSettings.season,
  ownerProfileId = AUCTION_OWNER_PROFILE_ID,
}: {
  season?: number;
  ownerProfileId?: string;
} = {}) {
  const snapshot = await getPreferencePlayersCollection(
    season,
    ownerProfileId
  ).get();

  return snapshot.docs
    .map((doc) => readOwnerPreferenceDocument(doc.id, doc.data()))
    .filter(
      (preference): preference is AuctionOwnerPlayerPreference =>
        preference !== null
    );
}

export async function upsertAuctionOwnerPreference({
  preference,
  updatedBy,
}: {
  preference: Omit<
    AuctionOwnerPlayerPreference,
    "updatedAt" | "updatedBy" | "schemaVersion"
  >;
  updatedBy: string;
}) {
  const updatedAt = new Date().toISOString();
  const serializedPreference: AuctionOwnerPlayerPreference = {
    season: preference.season,
    ownerProfileId: preference.ownerProfileId,
    sleeperPlayerId: preference.sleeperPlayerId,
    tag: preference.tag,
    preferredEntry: preference.preferredEntry,
    plannedCap: preference.plannedCap,
    note: preference.note,
    updatedAt,
    updatedBy,
    schemaVersion: 2,
  };
  const scopeRef = getPreferenceScopeRef(
    serializedPreference.season,
    serializedPreference.ownerProfileId
  );

  await firestore.runTransaction(async (transaction) => {
    transaction.set(
      scopeRef,
      {
        season: serializedPreference.season,
        ownerProfileId: serializedPreference.ownerProfileId,
        updatedAt,
        updatedBy,
      },
      { merge: true }
    );
    transaction.set(
      scopeRef.collection("players").doc(serializedPreference.sleeperPlayerId),
      serializedPreference
    );
  });

  return serializedPreference;
}

export async function clearAuctionOwnerPreference({
  season,
  ownerProfileId,
  sleeperPlayerId,
  updatedBy,
}: {
  season: number;
  ownerProfileId: string;
  sleeperPlayerId: string;
  updatedBy: string;
}) {
  const updatedAt = new Date().toISOString();
  const scopeRef = getPreferenceScopeRef(season, ownerProfileId);

  await firestore.runTransaction(async (transaction) => {
    transaction.set(
      scopeRef,
      {
        season,
        ownerProfileId,
        updatedAt,
        updatedBy,
      },
      { merge: true }
    );
    transaction.delete(scopeRef.collection("players").doc(sleeperPlayerId));
  });
}
