import { readFile } from "node:fs/promises";
import {
  AUCTION_AUTHORIZATION_SCHEMA_VERSION,
  buildAuthorizationMappingPlan,
  maskAuthorizationEmail,
  normalizeAuthorizationEmail,
  verifyAuthorizationSnapshot,
  type AuthorizationMappingInput,
  type ExistingAuthorizationMapping,
} from "../lib/auth/canonicalAuctionAuthorizationMaintenance";

const EXPECTED_PROJECT_ID = "river-city-ffl";
const AUCTION_AUTHORIZED_OWNER_EMAILS_COLLECTION =
  "auction_authorized_owner_emails";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function loadInput() {
  const filePath = argument("--input") ?? process.env.AUCTION_AUTHORIZATION_INPUT_FILE;
  if (!filePath) {
    throw new Error("Provide a private mapping file with --input or AUCTION_AUTHORIZATION_INPUT_FILE.");
  }
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as
    | AuthorizationMappingInput[]
    | { mappings?: AuthorizationMappingInput[] };
  const mappings = Array.isArray(parsed) ? parsed : parsed.mappings;
  if (!Array.isArray(mappings)) throw new Error("Mapping input must be an array or { mappings: [...] }.");
  return mappings;
}

function readExisting(snapshot: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) {
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      documentId: document.id,
      normalizedEmail:
        typeof data.normalizedEmail === "string"
          ? normalizeAuthorizationEmail(data.normalizedEmail)
          : normalizeAuthorizationEmail(document.id),
      canonicalOwnerId:
        typeof data.canonicalOwnerId === "string" ? data.canonicalOwnerId : "",
    } satisfies ExistingAuthorizationMapping;
  });
}

function printPlan(plan: ReturnType<typeof buildAuthorizationMappingPlan>) {
  console.log(
    JSON.stringify(
      {
        mappings: plan.entries.map((entry) => ({
          email: maskAuthorizationEmail(entry.input.email),
          canonicalOwnerId: entry.authorization?.canonicalOwnerId ?? entry.input.canonicalOwnerId,
          franchiseId: entry.authorization?.authorizedFranchiseId ?? null,
          teamName: entry.authorization?.teamName ?? null,
          warRoomId: entry.authorization?.warRoomId ?? null,
          action: entry.action,
          reason: entry.reason ?? null,
        })),
        loginCount: plan.entries.length,
        uniqueWarRoomCount: plan.uniqueWarRoomIds.length,
        sharedWarRooms: plan.uniqueWarRoomIds.filter(
          (warRoomId) => !plan.soloWarRoomIds.includes(warRoomId)
        ),
        soloWarRoomCount: plan.soloWarRoomIds.length,
        conflicts: plan.conflicts,
        proposedWrites: plan.proposedWrites,
        deletes: 0,
      },
      null,
      2
    )
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const mappings = await loadInput();
  const [{ firestore, getFirebaseAdminDiagnostics }, adminFirestore] = await Promise.all([
    import("../lib/firebaseAdmin"),
    import("firebase-admin/firestore"),
  ]);
  const diagnostics = getFirebaseAdminDiagnostics();
  if (diagnostics.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Refusing authorization operation: expected Firebase project ${EXPECTED_PROJECT_ID}, received ${diagnostics.projectId ?? "unknown"}.`
    );
  }

  const collection = firestore.collection(AUCTION_AUTHORIZED_OWNER_EMAILS_COLLECTION);
  const existingSnapshot = await collection.get();
  const existing = readExisting(existingSnapshot);
  const plan = buildAuthorizationMappingPlan(mappings, existing);
  printPlan(plan);
  if (plan.conflicts > 0) throw new Error("Authorization dry run contains conflicts; no writes permitted.");

  if (!apply) {
    console.log("DRY RUN ONLY — no Firestore writes were performed.");
    return;
  }

  const beforeWriteSnapshot = await collection.get();
  const beforeWrite = readExisting(beforeWriteSnapshot);
  const beforeWritePlan = buildAuthorizationMappingPlan(mappings, beforeWrite);
  if (beforeWritePlan.conflicts > 0) {
    throw new Error("Authorization state changed before apply; no writes permitted.");
  }

  for (const entry of beforeWritePlan.entries) {
    if (entry.action !== "CREATE") continue;
    await collection.doc(entry.normalizedEmail).set({
      normalizedEmail: entry.normalizedEmail,
      canonicalOwnerId: entry.input.canonicalOwnerId,
      enabled: true,
      schemaVersion: AUCTION_AUTHORIZATION_SCHEMA_VERSION,
      updatedAt: adminFirestore.FieldValue.serverTimestamp(),
    });
  }

  const afterWrite = readExisting(await collection.get());
  verifyAuthorizationSnapshot(afterWrite, mappings);
  console.log(JSON.stringify({ applied: beforeWritePlan.proposedWrites, deletes: 0 }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Authorization mapping operation failed.");
  process.exitCode = 1;
});
