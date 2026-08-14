import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import {
  parseAuctionLiveDraftStrategy,
  type AuctionLiveDraftStrategyInput,
} from "@/lib/auction/liveDraftStrategy";
import {
  type AuctionDraftGoal,
  type AuctionKickerDefenseStrategy,
  type AuctionKeeperFocus,
  type AuctionNominationStyle,
  type AuctionOwnerProfileSettings,
  type AuctionPositionPriority,
  type AuctionRiskTolerance,
  type AuctionRookiePreference,
  type AuctionRosterConstruction,
} from "@/lib/auction/ownerProfileSettingsTypes";
import { AUCTION_WAR_ROOM_COLLECTION } from "@/lib/auction/warRoomScope";

export const AUCTION_OWNER_PROFILES_COLLECTION = "auction_owner_profiles";
export const AUCTION_OWNER_PROFILE_SETTINGS_COLLECTION = "settings";
export const AUCTION_OWNER_PROFILE_SETTINGS_SCHEMA_VERSION = 1;

const rosterConstructionValues = new Set<AuctionRosterConstruction>([
  "balanced",
  "stars-and-scrubs",
  "value-heavy",
  "hero-rb",
  "zero-rb",
  "custom",
]);
const riskToleranceValues = new Set<AuctionRiskTolerance>([
  "conservative",
  "balanced",
  "aggressive",
]);
const keeperFocusValues = new Set<AuctionKeeperFocus>([
  "low",
  "medium",
  "high",
]);
const rookiePreferenceValues = new Set<AuctionRookiePreference>([
  "low",
  "medium",
  "high",
]);
const positionPriorityValues = new Set<AuctionPositionPriority>([
  "QB",
  "RB",
  "WR",
  "TE",
]);
const nominationStyleValues = new Set<AuctionNominationStyle>([
  "targets",
  "decoys",
  "mixed",
  "ai",
]);
const kickerDefenseStrategyValues = new Set<AuctionKickerDefenseStrategy>([
  "minimum",
  "elite-small-premium",
  "flexible",
]);
const draftGoalValues = new Set<AuctionDraftGoal>([
  "win-now",
  "balanced",
  "keeper-build",
  "learning",
]);

function getSettingsRef(season: number, ownerProfileId: string) {
  return firestore
    .collection(AUCTION_OWNER_PROFILES_COLLECTION)
    .doc(ownerProfileId)
    .collection(AUCTION_OWNER_PROFILE_SETTINGS_COLLECTION)
    .doc(String(season));
}

function getWarRoomSettingsRef(season: number, warRoomId: string) {
  return firestore
    .collection(AUCTION_WAR_ROOM_COLLECTION)
    .doc(warRoomId)
    .collection("settings")
    .doc(String(season));
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function readEnum<T extends string>(
  value: unknown,
  allowedValues: ReadonlySet<T>,
  fallback: T
) {
  return typeof value === "string" && allowedValues.has(value as T)
    ? (value as T)
    : fallback;
}

function readPositionPriorities(value: unknown): AuctionPositionPriority[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const position =
          typeof item === "string" ? item.trim().toUpperCase() : "";
        return positionPriorityValues.has(position as AuctionPositionPriority)
          ? [position as AuctionPositionPriority]
          : [];
      })
    )
  ).slice(0, 2);
}

function readSettingsDocument(
  data: FirebaseFirestore.DocumentData
): AuctionOwnerProfileSettings | null {
  const season = data.season;
  const ownerProfileId = readString(data.ownerProfileId);
  const updatedAt = readString(data.updatedAt);
  const updatedBy = readString(data.updatedBy);

  if (
    typeof season !== "number" ||
    !Number.isInteger(season) ||
    !ownerProfileId ||
    !updatedAt ||
    !updatedBy
  ) {
    return null;
  }

  const onboardingCompleted = readBoolean(data.onboardingCompleted);

  return {
    season,
    ownerProfileId,
    warRoomId: readString(data.warRoomId) ?? undefined,
    sleeperTeamName: readString(data.sleeperTeamName),
    rosterConstruction: readEnum(
      data.rosterConstruction,
      rosterConstructionValues,
      "balanced"
    ),
    riskTolerance: readEnum(data.riskTolerance, riskToleranceValues, "balanced"),
    keeperFocus: readEnum(data.keeperFocus, keeperFocusValues, "medium"),
    rookiePreference: readEnum(
      data.rookiePreference,
      rookiePreferenceValues,
      "medium"
    ),
    positionPriorities: readPositionPriorities(data.positionPriorities),
    nominationStyle: readEnum(
      data.nominationStyle,
      nominationStyleValues,
      "ai"
    ),
    kickerDefenseStrategy: readEnum(
      data.kickerDefenseStrategy,
      kickerDefenseStrategyValues,
      "minimum"
    ),
    draftGoal: readEnum(data.draftGoal, draftGoalValues, "balanced"),
    additionalNotes: readString(data.additionalNotes),
    liveDraftStrategy: parseAuctionLiveDraftStrategy(data.liveDraftStrategy),
    onboardingCompleted,
    onboardingCompletedAt: onboardingCompleted
      ? readString(data.onboardingCompletedAt)
      : null,
    updatedAt,
    updatedBy,
    schemaVersion: AUCTION_OWNER_PROFILE_SETTINGS_SCHEMA_VERSION,
  };
}

export async function readAuctionOwnerProfileSettings({
  season = riverCityAuctionLeagueSettings.season,
  ownerProfileId,
  warRoomId,
}: {
  season?: number;
  ownerProfileId: string;
  warRoomId?: string;
}) {
  const snapshot = await (warRoomId
    ? getWarRoomSettingsRef(season, warRoomId).get()
    : getSettingsRef(season, ownerProfileId).get());
  if (!snapshot.exists && warRoomId) {
    const legacySnapshot = await getSettingsRef(season, ownerProfileId).get();
    if (legacySnapshot.exists) return readSettingsDocument(legacySnapshot.data() ?? {});
  }
  if (!snapshot.exists) return null;

  return readSettingsDocument(snapshot.data() ?? {});
}

export async function upsertAuctionOwnerProfileSettings({
  settings,
  updatedBy,
  warRoomId,
}: {
  settings: Omit<
    AuctionOwnerProfileSettings,
    "updatedAt" | "updatedBy" | "schemaVersion" | "liveDraftStrategy"
  >;
  updatedBy: string;
  warRoomId?: string;
}) {
  const updatedAt = new Date().toISOString();
  const existingSettings = await readAuctionOwnerProfileSettings({
    season: settings.season,
    ownerProfileId: settings.ownerProfileId,
    ...(warRoomId ? { warRoomId } : {}),
    warRoomId,
  });
  const serializedSettings: Omit<
    AuctionOwnerProfileSettings,
    "liveDraftStrategy"
  > = {
    season: settings.season,
    ownerProfileId: settings.ownerProfileId,
    sleeperTeamName: settings.sleeperTeamName,
    rosterConstruction: settings.rosterConstruction,
    riskTolerance: settings.riskTolerance,
    keeperFocus: settings.keeperFocus,
    rookiePreference: settings.rookiePreference,
    positionPriorities: settings.positionPriorities.slice(0, 2),
    nominationStyle: settings.nominationStyle,
    kickerDefenseStrategy: settings.kickerDefenseStrategy,
    draftGoal: settings.draftGoal,
    additionalNotes: settings.additionalNotes,
    onboardingCompleted: settings.onboardingCompleted,
    onboardingCompletedAt: settings.onboardingCompletedAt,
    updatedAt,
    updatedBy,
    schemaVersion: AUCTION_OWNER_PROFILE_SETTINGS_SCHEMA_VERSION,
  };

  const settingsRef = warRoomId
    ? getWarRoomSettingsRef(serializedSettings.season, warRoomId)
    : getSettingsRef(serializedSettings.season, serializedSettings.ownerProfileId);
  await settingsRef.set(serializedSettings, { merge: true });

  return {
    ...serializedSettings,
    liveDraftStrategy: existingSettings?.liveDraftStrategy ?? null,
  } satisfies AuctionOwnerProfileSettings;
}

export async function updateAuctionOwnerLiveDraftStrategy({
  season = riverCityAuctionLeagueSettings.season,
  ownerProfileId,
  strategy,
  updatedBy,
  warRoomId,
}: {
  season?: number;
  ownerProfileId: string;
  strategy: AuctionLiveDraftStrategyInput | null;
  updatedBy: string;
  warRoomId?: string;
}) {
  const updatedAt = new Date().toISOString();
  const liveDraftStrategy = strategy
    ? {
        ...strategy,
        updatedAt,
        updatedBy,
      }
    : null;

  const settingsRef = warRoomId
    ? getWarRoomSettingsRef(season, warRoomId)
    : getSettingsRef(season, ownerProfileId);
  await settingsRef.set(
    {
      season,
      ownerProfileId,
      ...(warRoomId ? { warRoomId } : {}),
      liveDraftStrategy,
      updatedAt,
      updatedBy,
      schemaVersion: AUCTION_OWNER_PROFILE_SETTINGS_SCHEMA_VERSION,
    },
    { merge: true }
  );

  return liveDraftStrategy;
}

export async function updateAuctionOwnerProfileSettingsTeamName({
  season = riverCityAuctionLeagueSettings.season,
  ownerProfileId,
  sleeperTeamName,
  updatedBy,
  warRoomId,
}: {
  season?: number;
  ownerProfileId: string;
  sleeperTeamName: string;
  updatedBy: string;
  warRoomId?: string;
}) {
  const updatedAt = new Date().toISOString();

  const settingsRef = warRoomId
    ? getWarRoomSettingsRef(season, warRoomId)
    : getSettingsRef(season, ownerProfileId);
  await settingsRef.set(
    {
      season,
      ownerProfileId,
      ...(warRoomId ? { warRoomId } : {}),
      sleeperTeamName,
      updatedAt,
      updatedBy,
      schemaVersion: AUCTION_OWNER_PROFILE_SETTINGS_SCHEMA_VERSION,
    },
    { merge: true }
  );
}
