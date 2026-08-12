import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { buildOperationalFinanceCsv, buildOperationalFinanceExportContext, buildOperationalFinanceExportJson, buildOperationalFinanceReport, canonicalOperationalFinanceExportJson } from "../lib/finance/operationalFinanceExport";

async function main() {
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, { actorId: "system:export-test", role: "system" }, "2026-08-12T12:00:00.000Z");
  const context = buildOperationalFinanceExportContext(await repository.getSnapshot());
  const json = buildOperationalFinanceExportJson(context);
  assert.equal(json.exportStatus, "operational / provisional");
  assert.equal(json.seasonMetadata.season, 2026);
  assert.equal(json.reconciliation.duesAssessedCents, 60_000);
  assert.equal(json.reconciliation.duesCollectedCents, 25_000);
  assert.equal(json.reconciliation.duesOutstandingCents, 35_000);
  assert.equal(json.obligations.length, 12);
  assert.equal(json.settlements.length, 5);
  assert.equal(JSON.stringify(json).includes("venmo-handle"), false);
  assert.equal(JSON.stringify(json).includes("commissionerNote"), false);
  assert.equal(JSON.stringify(json).includes("idempotencyKey"), false);
  assert.equal(canonicalOperationalFinanceExportJson({ b: 2, a: 1 }), canonicalOperationalFinanceExportJson({ a: 1, b: 2 }));
  assert.equal(canonicalOperationalFinanceExportJson(json), canonicalOperationalFinanceExportJson(JSON.parse(canonicalOperationalFinanceExportJson(json))));

  const dues = buildOperationalFinanceCsv(context, "dues-status");
  assert.match(dues, /franchise_id,financial_owner_id/);
  assert.match(dues, /PAID/);
  assert.match(dues, /prestigio-mundial/);
  assert.equal(dues.split("\r\n").length, 14);
  const obligations = buildOperationalFinanceCsv(context, "obligations");
  assert.match(obligations, /5000,50\.00/);
  const settlements = buildOperationalFinanceCsv(context, "settlements");
  assert.match(settlements, /incoming-dues/);
  const expenses = buildOperationalFinanceCsv(context, "expenses");
  assert.match(expenses, /expense_id,category/);
  const contributions = buildOperationalFinanceCsv(context, "contributions");
  assert.match(contributions, /contribution_id/);

  const report = buildOperationalFinanceReport(context);
  assert.match(report, /Dues assessed: \$600\.00/);
  assert.match(report, /Dues collected: \$250\.00/);
  assert.match(report, /Dues outstanding: \$350\.00/);
  assert.match(report, /Close status: Open/);
  assert.doesNotMatch(report, /Net Earnings/i);

  const route = readFileSync("app/api/commish/finance/[season]/exports/route.ts", "utf8");
  const ui = readFileSync("app/commish/finance/2026/OperationalFinanceExportSection.tsx", "utf8");
  assert.match(route, /requireOperationalFinanceCommissioner/);
  assert.match(route, /getOperationalFinanceLedgerRepository/);
  assert.match(route, /Cross-origin request denied/);
  assert.doesNotMatch(route, /firebase\/firestore|@\/lib\/firebase/);
  assert.match(ui, /Download Finance JSON/);
  assert.match(ui, /Download Reconciliation Report/);
  assert.match(ui, /grid-cols-1/);
  console.log("Operational finance export checks passed (fixtures/in-memory only; production untouched).");
}
void main();
