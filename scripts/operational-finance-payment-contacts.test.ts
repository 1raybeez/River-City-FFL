import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  deactivateOperationalFinancePaymentContact,
  normalizeVenmoHandle,
  setOperationalFinancePaymentContact,
} from "../lib/finance/operationalFinancePaymentContacts";
import { InMemoryOperationalFinancePaymentContactRepository } from "../lib/finance/operationalFinancePaymentContactsMemory";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";

const root = process.cwd();
const read = (value: string) => fs.readFileSync(path.join(root, value), "utf8");
const commissioner: OperationalFinanceActor = {
  actorId: "commissioner:test@example.com",
  role: "commissioner",
};
const fakeHandle = "@test-user";

async function main() {
  const repository = new InMemoryOperationalFinancePaymentContactRepository();
  assert.equal(normalizeVenmoHandle("test-user"), fakeHandle);
  assert.throws(() => normalizeVenmoHandle("bad handle!"), /Venmo handle/);
  await assert.rejects(
    () => setOperationalFinancePaymentContact(repository, {
      ownerId: "jeffrey-hudgins", method: "venmo", handle: fakeHandle,
    }, commissioner, "contact:helper:jeffrey", "2026-08-11T12:00:00.000Z"),
    /canonical 2026 financial owner/
  );
  await assert.rejects(
    () => setOperationalFinancePaymentContact(repository, {
      ownerId: "landon-elliott", method: "venmo", handle: fakeHandle,
    }, commissioner, "contact:helper:landon", "2026-08-11T12:00:00.000Z"),
    /canonical 2026 financial owner/
  );
  await assert.rejects(
    () => setOperationalFinancePaymentContact(repository, {
      ownerId: "stan-schoppe", method: "paypal" as "venmo", handle: fakeHandle,
    }, commissioner, "contact:method:bad", "2026-08-11T12:00:00.000Z"),
    /Venmo is the only/
  );
  await assert.rejects(
    () => setOperationalFinancePaymentContact(repository, {
      ownerId: "stan-schoppe", method: "venmo", handle: fakeHandle,
    }, { actorId: "system:test", role: "system" }, "contact:auth:bad", "2026-08-11T12:00:00.000Z"),
    /Commissioner authorization/
  );

  const created = await setOperationalFinancePaymentContact(repository, {
    ownerId: "stan-schoppe", method: "venmo", handle: fakeHandle,
  }, commissioner, "contact:stan:create", "2026-08-11T12:00:00.000Z");
  assert.equal(created.created, true);
  assert.equal(created.contact.ownerId, "stan-schoppe");
  assert.equal(created.contact.status, "unverified");
  assert.equal(created.contact.verifiedAt, null);
  const duplicate = await setOperationalFinancePaymentContact(repository, {
    ownerId: "stan-schoppe", method: "venmo", handle: fakeHandle,
  }, commissioner, "contact:stan:create", "2026-08-11T12:01:00.000Z");
  assert.equal(duplicate.created, false);
  await assert.rejects(
    () => setOperationalFinancePaymentContact(repository, {
      ownerId: "stan-schoppe", method: "venmo", handle: "@different-test",
    }, commissioner, "contact:stan:create", "2026-08-11T12:02:00.000Z"),
    /Idempotency key/
  );

  const updated = await setOperationalFinancePaymentContact(repository, {
    ownerId: "stan-schoppe", method: "venmo", handle: "@updated-test",
  }, commissioner, "contact:stan:update", "2026-08-11T12:03:00.000Z");
  assert.equal(updated.contact.revisionNumber, 2);
  const duplicateUpdate = await setOperationalFinancePaymentContact(repository, {
    ownerId: "stan-schoppe", method: "venmo", handle: "@updated-test",
  }, commissioner, "contact:stan:update", "2026-08-11T12:03:30.000Z");
  assert.equal(duplicateUpdate.created, false);
  const deactivated = await deactivateOperationalFinancePaymentContact(
    repository, "stan-schoppe", commissioner, "contact:stan:deactivate", "2026-08-11T12:04:00.000Z"
  );
  assert.equal(deactivated.contact.status, "inactive");
  const duplicateDeactivate = await deactivateOperationalFinancePaymentContact(
    repository, "stan-schoppe", commissioner, "contact:stan:deactivate", "2026-08-11T12:04:30.000Z"
  );
  assert.equal(duplicateDeactivate.created, false);
  const snapshot = await repository.getSnapshot();
  assert.equal(snapshot.contacts.length, 1);
  assert.equal(snapshot.revisions.length, 3);
  assert.deepEqual(snapshot.auditEvents.map((entry) => entry.eventType), [
    "payment-contact-created", "payment-contact-updated", "payment-contact-deactivated",
  ]);
  assert.ok(snapshot.auditEvents.every((entry) => !JSON.stringify(entry).includes(fakeHandle)));
  assert.ok(snapshot.auditEvents.every((entry) => !JSON.stringify(entry).includes("updated-test")));

  const rules = read("firestore.rules");
  assert.match(rules, /operational_finance_payment_contacts[\s\S]*?allow read, write: if false/);
  const firestoreRepository = read("lib/finance/operationalFinancePaymentContactsFirestore.ts");
  assert.match(firestoreRepository, /@\/lib\/firebaseAdmin/);
  assert.doesNotMatch(firestoreRepository, /firebase\/firestore|\.delete\s*\(/);
  const route = read("app/api/commish/finance/[season]/payment-contacts/[ownerId]/route.ts");
  assert.match(route, /requireOperationalFinanceCommissioner/);
  assert.match(route, /Cross-origin request denied/);
  assert.doesNotMatch(route, /firebase\/firestore|@\/lib\/firebase(?:"|')/);
  const publicSources = [
    "app/page.tsx",
    "lib/managers/identityData.ts",
    "app/league-info/payouts/page.tsx",
  ].filter((value) => fs.existsSync(path.join(root, value))).map(read).join("\n");
  assert.doesNotMatch(publicSources, /operational_finance_payment_contacts|@test-user|updated-test/);
  const managerPresentation = read("lib/managers/ownerProfilePresentation.ts");
  assert.doesNotMatch(managerPresentation, /operationalFinancePaymentContact|venmo/i);
  const tool = read("scripts/set-operational-finance-payment-contact.ts");
  assert.match(tool, /requiresApplyFlag/);
  assert.match(tool, /DRY RUN ONLY/);
  assert.doesNotMatch(tool, /stan.*@|@.*stan/i);

  console.log("Operational finance private payment-contact checks passed (fake/in-memory only). ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
