import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  assertCommissionerFinanceActor,
  loadOperationalFinanceDashboard,
  parseCommissionerDuesPaymentRequest,
  recordCommissionerDuesPayment,
} from "../lib/finance/operationalFinanceDashboard";
import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");
const recordedAt = "2026-08-11T13:54:43.235Z";
const systemActor: OperationalFinanceActor = {
  actorId: "system:test-opening-migration",
  role: "system",
};
const commissioner: OperationalFinanceActor = {
  actorId: "commissioner:test@example.com",
  role: "commissioner",
};

async function rejects(operation: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(operation, pattern);
}

async function main() {
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, systemActor, recordedAt);

  const initial = await loadOperationalFinanceDashboard(repository, 2026);
  assert.equal(initial.heading, "2026 Finance");
  assert.equal(initial.operationalStatusLabel, "Operational / Provisional");
  assert.equal(initial.deadlineLabel, "Due before the 2026 draft");
  assert.equal(initial.summary.duesAssessedCents, 60_000);
  assert.equal(initial.summary.duesCollectedCents, 25_000);
  assert.equal(initial.summary.duesOutstandingCents, 35_000);
  assert.equal(initial.summary.paidCount, 5);
  assert.equal(initial.summary.unpaidCount, 7);
  assert.equal(initial.summary.partialCount, 0);
  assert.equal(initial.summary.approvedAwardsCents, 0);
  assert.equal(initial.summary.paidAwardsCents, 0);
  assert.equal(initial.summary.approvedExpensesCents, 0);
  assert.equal(initial.summary.reconciled, false);
  assert.equal(initial.layout, "responsive-cards");
  assert.equal(initial.duesRows.length, 12);

  assert.deepEqual(
    initial.duesRows
      .filter((entry) => entry.state === "paid")
      .map((entry) => entry.financialOwnerName)
      .sort(),
    ["David Besedich", "JD Dowling", "Rashad Gresham", "Ray Long", "Wade Cameron"].sort()
  );
  const prestigio = initial.duesRows.filter(
    (entry) => entry.franchiseId === "prestigio-mundial"
  );
  assert.equal(prestigio.length, 1);
  assert.equal(prestigio[0].financialOwnerName, "Ray Long");
  assert.deepEqual(prestigio[0].coOwnerContext, ["Jeffrey Hudgins"]);
  assert.ok(!initial.duesRows.some((entry) => entry.financialOwnerId === "jeffrey-hudgins"));
  const shake = initial.duesRows.filter(
    (entry) => entry.franchiseId === "shake-n-bakers"
  );
  assert.equal(shake.length, 1);
  assert.equal(shake[0].financialOwnerName, "Jordan Maslyn");
  assert.deepEqual(shake[0].coOwnerContext, ["Landon Elliott"]);
  assert.ok(!initial.duesRows.some((entry) => entry.financialOwnerId === "landon-elliott"));
  assert.ok(
    initial.duesRows
      .filter((entry) => entry.state === "paid")
      .every((entry) =>
        entry.settlements.every(
          (settlement) =>
            settlement.paymentMethodLabel === "Venmo" &&
            settlement.actualPaidAt === null &&
            settlement.actualPaidAtLabel === "Unknown / Not recorded"
        )
      )
  );
  assert.ok(initial.recentActivity.length <= 15);
  assert.ok(initial.recentActivity.every((entry) => entry.eventLabel && entry.reason));
  assert.ok(initial.recentActivity.some((entry) => entry.eventLabel === "Opening migration recorded"));

  assert.throws(
    () => assertCommissionerFinanceActor(systemActor),
    /Commissioner authorization/
  );
  await rejects(
    () =>
      recordCommissionerDuesPayment(
        repository,
        2026,
        {
          obligationId: prestigio[0].obligationId,
          amountCents: 100,
          actualPaidAt: null,
          commissionerNote: null,
          idempotencyKey: "dashboard:unauthorized",
        },
        systemActor,
        recordedAt
      ),
    /Commissioner authorization/
  );

  const aaron = initial.duesRows.find((entry) => entry.financialOwnerId === "aaron-hawkins")!;
  const fullRequest = {
    obligationId: aaron.obligationId,
    amountCents: aaron.outstandingCents,
    actualPaidAt: null,
    commissionerNote: "Received via Venmo.",
    idempotencyKey: "dashboard:dues:aaron-full",
  };
  const full = await recordCommissionerDuesPayment(
    repository,
    2026,
    fullRequest,
    commissioner,
    "2026-08-12T12:00:00.000Z"
  );
  assert.equal(full.created, true);
  assert.equal(full.settlement.paymentMethod, "venmo");
  assert.equal(full.settlement.direction, "incoming-dues");
  assert.equal(
    full.dashboard.duesRows.find((entry) => entry.obligationId === aaron.obligationId)?.state,
    "paid"
  );
  assert.equal(full.dashboard.summary.duesCollectedCents, 30_000);
  assert.equal(full.dashboard.summary.duesOutstandingCents, 30_000);
  assert.equal(full.dashboard.summary.paidCount, 6);
  assert.ok(
    full.dashboard.recentActivity.some(
      (entry) => entry.eventLabel === "Dues payment recorded" && entry.targetLabel === "Aaron Hawkins"
    )
  );

  const duplicate = await recordCommissionerDuesPayment(
    repository,
    2026,
    fullRequest,
    commissioner,
    "2026-08-12T12:01:00.000Z"
  );
  assert.equal(duplicate.created, false);
  assert.equal(
    (await repository.getSnapshot()).settlements.filter(
      (entry) => entry.obligationId === aaron.obligationId
    ).length,
    1
  );
  await rejects(
    () =>
      recordCommissionerDuesPayment(
        repository,
        2026,
        { ...fullRequest, amountCents: 1_000 },
        commissioner,
        "2026-08-12T12:02:00.000Z"
      ),
    /different settlement request/
  );

  const stan = initial.duesRows.find((entry) => entry.financialOwnerId === "stan-schoppe")!;
  const partial = await recordCommissionerDuesPayment(
    repository,
    2026,
    {
      obligationId: stan.obligationId,
      amountCents: 2_000,
      actualPaidAt: "2026-08-10T00:00:00.000Z",
      commissionerNote: null,
      idempotencyKey: "dashboard:dues:stan-partial",
    },
    commissioner,
    "2026-08-12T13:00:00.000Z"
  );
  const partialRow = partial.dashboard.duesRows.find(
    (entry) => entry.obligationId === stan.obligationId
  )!;
  assert.equal(partialRow.state, "partially-paid");
  assert.equal(partialRow.statusLabel, "PARTIAL");
  assert.equal(partialRow.settledCents, 2_000);
  assert.equal(partialRow.outstandingCents, 3_000);
  assert.equal(partialRow.settlements[0].actualPaidAtLabel, "Aug 10, 2026");

  const tommy = initial.duesRows.find((entry) => entry.financialOwnerId === "tommy-moore")!;
  await rejects(
    () =>
      recordCommissionerDuesPayment(
        repository,
        2026,
        {
          obligationId: tommy.obligationId,
          amountCents: 5_001,
          actualPaidAt: null,
          commissionerNote: null,
          idempotencyKey: "dashboard:dues:tommy-over",
        },
        commissioner,
        recordedAt
      ),
    /cannot exceed/
  );
  assert.throws(
    () =>
      parseCommissionerDuesPaymentRequest({
        obligationId: tommy.obligationId,
        amountCents: 0,
        idempotencyKey: "dashboard:zero",
      }),
    /positive integer/
  );
  assert.throws(
    () =>
      parseCommissionerDuesPaymentRequest({
        obligationId: tommy.obligationId,
        amountCents: -100,
        idempotencyKey: "dashboard:negative",
      }),
    /positive integer/
  );
  assert.throws(
    () =>
      parseCommissionerDuesPaymentRequest({
        obligationId: tommy.obligationId,
        amountCents: 5_000,
        idempotencyKey: "dashboard:override",
        ownerId: "ray-long",
      }),
    /Unsupported payment field: ownerId/
  );
  assert.throws(
    () =>
      parseCommissionerDuesPaymentRequest({
        obligationId: tommy.obligationId,
        amountCents: 5_000,
        idempotencyKey: "dashboard:method",
        paymentMethod: "paypal",
      }),
    /Unsupported payment field: paymentMethod/
  );

  const reloaded = await loadOperationalFinanceDashboard(repository, 2026);
  assert.deepEqual(reloaded.summary, partial.dashboard.summary);
  assert.equal((await repository.getSnapshot()).auditEvents.length, 21);

  const route = read(
    "app/api/commish/finance/[season]/dues/[obligationId]/settlements/route.ts"
  );
  assert.match(route, /requireOperationalFinanceCommissioner/);
  assert.match(route, /Commissioner access required/);
  assert.match(route, /Cross-origin request denied/);
  assert.match(route, /x-forwarded-host/);
  assert.match(route, /VERCEL_URL/);
  assert.match(route, /getOperationalFinanceLedgerRepository/);
  assert.doesNotMatch(route, /firebase\/firestore|@\/lib\/firebase(?:"|')/);

  const auth = read("lib/finance/operationalFinanceDashboardAuth.ts");
  assert.match(auth, /requireAuctionAccess\("maintenance"\)/);
  assert.match(auth, /session\.access\.role !== "commissioner"/);
  const layout = read("app/commish/finance/layout.tsx");
  assert.match(layout, /requireOperationalFinanceCommissioner/);
  assert.match(
    layout,
    /redirect\("\/commish\/login\?returnTo=%2Fcommish%2Ffinance%2F2026"\)/
  );

  const client = read(
    "app/commish/finance/2026/OperationalFinanceDashboardClient.tsx"
  );
  assert.doesNotMatch(client, /firebase\/firestore|@\/lib\/firebase/);
  assert.match(client, /Record Venmo Payment/);
  assert.match(client, /crypto\.randomUUID/);
  assert.match(client, /disabled=\{pending \|\| !draft\.confirmed\}/);
  assert.match(client, /overflow-x-hidden/);
  assert.match(client, /sm:grid-cols-3/);
  assert.match(client, /lg:grid-cols-2/);
  assert.doesNotMatch(client, /<table/);
  assert.doesNotMatch(client, /paypal|zelle|cash app|sleeper safe/i);

  const presentation = read(
    "lib/finance/operationalFinanceDashboardPresentation.ts"
  );
  assert.doesNotMatch(presentation, /migrationRecordedAt|duesPaidAt/);
  assert.match(presentation, /actualPaidAtLabel/);
  assert.match(presentation, /snapshot\.auditEvents/);
  assert.ok(!fs.existsSync(path.join(root, "app/finance/2026/page.tsx")));
  assert.ok(!fs.existsSync(path.join(root, "app/league-info/finance/2026/page.tsx")));
  assert.ok(!fs.existsSync(path.join(root, "app/api/commish/finance/awards")));
  assert.ok(!fs.existsSync(path.join(root, "app/api/commish/finance/expenses")));

  console.log("Operational finance dashboard checks passed (in-memory only; production untouched).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
