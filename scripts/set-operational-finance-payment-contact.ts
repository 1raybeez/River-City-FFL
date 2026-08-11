import {
  isCanonicalOperationalFinancialOwner,
  normalizeVenmoHandle,
  setOperationalFinancePaymentContact,
} from "../lib/finance/operationalFinancePaymentContacts";

const EXPECTED_PROJECT_ID = "river-city-ffl";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function mask(handle: string) {
  return `[private Venmo handle: ${handle.length} characters]`;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const ownerId = argument("--owner") ?? "";
  const method = argument("--method") ?? "";
  const suppliedHandle = argument("--handle") ?? "";
  if (!isCanonicalOperationalFinancialOwner(ownerId)) {
    throw new Error("--owner must identify a canonical 2026 financial owner.");
  }
  if (method !== "venmo") throw new Error("--method must be venmo.");
  const handle = normalizeVenmoHandle(suppliedHandle);

  const [{ FirestoreOperationalFinancePaymentContactRepository }, adminModule] =
    await Promise.all([
      import("../lib/finance/operationalFinancePaymentContactsFirestore"),
      import("../lib/firebaseAdmin"),
    ]);
  const diagnostics = adminModule.getFirebaseAdminDiagnostics();
  if (diagnostics.projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
      `Refusing payment-contact operation: expected Firebase project ${EXPECTED_PROJECT_ID}, received ${diagnostics.projectId ?? "unknown"}.`
    );
  }
  const repository = new FirestoreOperationalFinancePaymentContactRepository(
    adminModule.firestore
  );
  const existing = (await repository.getSnapshot()).contacts.find(
    (entry) => entry.ownerId === ownerId
  );
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        requiresApplyFlag: true,
        projectId: diagnostics.projectId,
        ownerId,
        method: "venmo",
        suppliedHandle: mask(handle),
        existingContact: existing
          ? { status: existing.status, revisionNumber: existing.revisionNumber, handle: mask(existing.handle) }
          : null,
        requestedStatus: "unverified",
        deletes: 0,
      },
      null,
      2
    )
  );
  if (!apply) {
    console.log("DRY RUN ONLY — private contact store was read; no Firestore writes were performed.");
    return;
  }
  const result = await setOperationalFinancePaymentContact(
    repository,
    {
      ownerId,
      method: "venmo",
      handle,
      status: "unverified",
      notes: null,
    },
    {
      actorId: `system:payment-contact-migration:${ownerId}`,
      role: "system",
    },
    `payment-contact-migration:${ownerId}:venmo:v1`,
    new Date().toISOString()
  );
  console.log(
    JSON.stringify(
      {
        applied: result.created,
        ownerId,
        method: result.contact.method,
        status: result.contact.status,
        handle: mask(result.contact.handle),
        revisionNumber: result.contact.revisionNumber,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Payment-contact operation failed.");
  process.exitCode = 1;
});
