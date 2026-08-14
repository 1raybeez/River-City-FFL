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

  const [ownerProfiles, warRooms, purchases] = await Promise.all([
    firestore.collection("auction_owner_profiles").get(),
    firestore.collection("auction_war_rooms").get(),
    firestore
      .collection("auction_draft_runs")
      .doc("2026")
      .collection("purchase_decisions")
      .get(),
  ]);
  const existingWarRoomIds = new Set(warRooms.docs.map((doc) => doc.id));
  const records: WarRoomMigrationRecord[] = [];

  for (const profile of ownerProfiles.docs) {
    const settings = await profile.ref.collection("settings").doc("2026").get();
    if (!settings.exists) continue;
    const legacyScope = classifyLegacyWarRoomScope(profile.id);
    records.push(
      classifyWarRoomMigrationRecord({
        sourcePath: `auction_owner_profiles/${profile.id}/settings/2026`,
        sourceType: "owner-profile",
        ownerProfileId: profile.id,
        targetAlreadyExists: legacyScope
          ? existingWarRoomIds.has(legacyScope.targetWarRoomId)
          : false,
      })
    );
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
          purchaseDocuments: purchases.size,
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
