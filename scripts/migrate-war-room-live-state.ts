import {
  classifyWarRoomMigrationRecord,
  type WarRoomMigrationRecord,
} from "../lib/auction/warRoomMigrationClassifier";
import { classifyLegacyWarRoomScope } from "../lib/auction/warRoomScope";

const EXPECTED_PROJECT_ID = "river-city-ffl";

async function main() {
  if (process.argv.includes("--apply")) {
    throw new Error(
      "Migration apply is intentionally disabled until a reviewed record-level migration plan is approved."
    );
  }

  const { firestore, getFirebaseAdminDiagnostics } = await import("../lib/firebaseAdmin");
  const diagnostics = getFirebaseAdminDiagnostics();
  if (diagnostics.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Refusing migration inspection: expected Firebase project ${EXPECTED_PROJECT_ID}, received ${diagnostics.projectId ?? "unknown"}.`
    );
  }

  const [ownerProfiles, warRooms, purchases, legacySettingsDocs, legacyPreferencePlayers, warRoomLiveDocs, warRoomSettingsDocs, warRoomPreferencePlayers] = await Promise.all([
    firestore.collection("auction_owner_profiles").get(),
    firestore.collection("auction_war_rooms").get(),
    firestore
      .collection("auction_draft_runs")
      .doc("2026")
      .collection("purchase_decisions")
      .get(),
    firestore.collectionGroup("settings").get(),
    firestore.collectionGroup("players").get(),
    firestore.collectionGroup("live").get(),
    firestore.collectionGroup("settings").get(),
    firestore.collectionGroup("players").get(),
  ]);
  const existingWarRoomIds = new Set(warRooms.docs.map((doc) => doc.id));
  const records: WarRoomMigrationRecord[] = [];
  const legacyPrivateState = {
    settingsDocuments: 0,
    preferenceScopes: 0,
    preferencePlayerDocuments: 0,
    settingsFieldPresence: {} as Record<string, number>,
    preferenceFieldPresence: {} as Record<string, number>,
    byOwnerProfile: {} as Record<string, { settings: number; preferencePlayers: number }>,
  };

  const addLegacyCount = (ownerProfileId: string, key: "settings" | "preferencePlayers", amount: number) => {
    legacyPrivateState.byOwnerProfile[ownerProfileId] ??= {
      settings: 0,
      preferencePlayers: 0,
    };
    legacyPrivateState.byOwnerProfile[ownerProfileId][key] += amount;
  };

  const legacySettingsPaths = legacySettingsDocs.docs.filter((doc) =>
    doc.ref.path.startsWith("auction_owner_profiles/")
  );
  const legacyPreferencePlayerDocs = legacyPreferencePlayers.docs.filter((doc) =>
    doc.ref.path.startsWith("auction_owner_preferences/")
  );
  const currentWarRoomLiveDocs = warRoomLiveDocs.docs.filter((doc) =>
    doc.ref.path.startsWith("auction_war_rooms/")
  );
  const currentWarRoomSettingsDocs = warRoomSettingsDocs.docs.filter((doc) =>
    doc.ref.path.startsWith("auction_war_rooms/")
  );
  const currentWarRoomPreferencePlayers = warRoomPreferencePlayers.docs.filter((doc) =>
    doc.ref.path.startsWith("auction_war_rooms/")
  );
  const legacyProfiles = new Set<string>();
  for (const settings of legacySettingsPaths) {
    const ownerProfileId = settings.ref.path.split("/")[1];
    if (!ownerProfileId || settings.ref.path.split("/")[3] !== "2026") continue;
    legacyProfiles.add(ownerProfileId);
    {
      legacyPrivateState.settingsDocuments += 1;
      addLegacyCount(ownerProfileId, "settings", 1);
      for (const field of Object.keys(settings.data())) {
        legacyPrivateState.settingsFieldPresence[field] =
          (legacyPrivateState.settingsFieldPresence[field] ?? 0) + 1;
      }
    }
    const legacyScope = classifyLegacyWarRoomScope(ownerProfileId);
    records.push(classifyWarRoomMigrationRecord({
      sourcePath: settings.ref.path,
      sourceType: "owner-profile",
      ownerProfileId,
      targetAlreadyExists: legacyScope
        ? existingWarRoomIds.has(legacyScope.targetWarRoomId)
        : false,
    }));
  }
  for (const player of legacyPreferencePlayerDocs) {
    const scopeId = player.ref.path.split("/")[1];
    const ownerProfileId = scopeId?.startsWith("2026_")
      ? scopeId.slice("2026_".length)
      : null;
    if (!ownerProfileId) continue;
    legacyProfiles.add(ownerProfileId);
    legacyPrivateState.preferencePlayerDocuments += 1;
    addLegacyCount(ownerProfileId, "preferencePlayers", 1);
    for (const field of Object.keys(player.data())) {
      legacyPrivateState.preferenceFieldPresence[field] =
        (legacyPrivateState.preferenceFieldPresence[field] ?? 0) + 1;
    }
  }
  for (const ownerProfileId of legacyProfiles) {
    const preferenceCount = legacyPrivateState.byOwnerProfile[ownerProfileId]?.preferencePlayers ?? 0;
    if (preferenceCount === 0) continue;
    legacyPrivateState.preferenceScopes += 1;
    const legacyScope = classifyLegacyWarRoomScope(ownerProfileId);
    records.push(classifyWarRoomMigrationRecord({
      sourcePath: `auction_owner_preferences/2026_${ownerProfileId}/players`,
      sourceType: "owner-profile",
      ownerProfileId,
      targetAlreadyExists: legacyScope
        ? existingWarRoomIds.has(legacyScope.targetWarRoomId)
        : false,
    }));
  }

  for (const warRoom of warRooms.docs) {
    records.push(
      classifyWarRoomMigrationRecord({
        sourcePath: `auction_war_rooms/${warRoom.id}`,
        sourceType: "war-room",
        warRoomId: warRoom.id,
      })
    );
  }

  if (purchases.size > 0) {
    records.push(
      classifyWarRoomMigrationRecord({
        sourcePath: "auction_draft_runs/2026/purchase_decisions",
        sourceType: "purchase",
      })
    );
  }

  const counts = records.reduce<Record<string, number>>((result, record) => {
    result[record.action] = (result[record.action] ?? 0) + 1;
    return result;
  }, {});
  console.log(
    JSON.stringify(
      {
        projectId: diagnostics.projectId,
        inspected: {
          ownerProfileSettings: ownerProfiles.size,
          warRoomDocuments: warRooms.size,
          warRoomLiveDocuments: currentWarRoomLiveDocs.length,
          warRoomSettingsDocuments: currentWarRoomSettingsDocs.length,
          warRoomPreferencePlayerDocuments: currentWarRoomPreferencePlayers.length,
          warRoomPaths: {
            live: currentWarRoomLiveDocs.map((doc) => doc.ref.path),
            settings: currentWarRoomSettingsDocs.map((doc) => doc.ref.path),
            preferencePlayers: currentWarRoomPreferencePlayers.map((doc) => doc.ref.path),
          },
          warRoomSettingsShape: currentWarRoomSettingsDocs.map((doc) => ({
            path: doc.ref.path,
            fields: Object.keys(doc.data()).sort(),
          })),
          purchaseDocuments: purchases.size,
          legacyPrivateState,
        },
        classifications: counts,
        proposedWrites: counts["MIGRATE TO WAR ROOM"] ?? 0,
        deletes: 0,
      },
      null,
      2
    )
  );
  console.log("DRY RUN ONLY — no War Room migration writes were performed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "War Room migration inspection failed.");
  process.exitCode = 1;
});
