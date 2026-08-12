import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createOperationalFinanceExpense,
  getApprovedOperationalRingInput,
  recordOperationalFinanceContribution,
  recordOperationalFinanceExpenseSettlement,
} from "../lib/finance/operationalFinanceExpenses";
import { apply2026OpeningDuesMigration, recordSettlement } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { calculateChampionPayout } from "../lib/finance/operationalFinanceRules";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";

const actor: OperationalFinanceActor = { actorId: "commissioner:expense-test", role: "commissioner" };
const system: OperationalFinanceActor = { actorId: "system:expense-test", role: "system" };
const at = "2026-08-11T16:00:00.000Z";

async function repository() {
  const result = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(result, system, at);
  return result;
}

async function main() {
  assert.equal(calculateChampionPayout(1_600).championCashCents, 21_900);
  assert.equal(calculateChampionPayout(4_000).championCashCents, 19_500);
  assert.equal(calculateChampionPayout(8_000).championCashCents, 15_500);
  assert.equal(calculateChampionPayout(8_600, 8_600).championCashCents, 14_900);

  const noConfirmation = await repository();
  await assert.rejects(() => createOperationalFinanceExpense(noConfirmation, 2026, {
    category: "championship-ring", amountCents: 1_600, confirmed: false, idempotencyKey: "expense:ring:no-confirm",
  }, actor, at), /confirmation/);
  assert.equal((await noConfirmation.getSnapshot()).obligations.filter((entry) => entry.category === "championship-ring").length, 0);

  const overCap = await repository();
  await assert.rejects(() => createOperationalFinanceExpense(overCap, 2026, {
    category: "championship-ring", amountCents: 8_600, confirmed: true, idempotencyKey: "expense:ring:over-cap",
  }, actor, at), /exceeds the approved dues-funded cap/);

  const ringRepo = await repository();
  const ringResult = await createOperationalFinanceExpense(ringRepo, 2026, {
    category: "championship-ring", amountCents: 8_600, approvedRingCapOverrideCents: 8_600,
    commissionerNote: "Fixture only.", confirmed: true, idempotencyKey: "expense:ring:approved-override",
  }, actor, at);
  assert.equal(ringResult.value.category, "championship-ring");
  assert.equal(ringResult.value.fundingSource, "dues-funded");
  assert.equal(ringResult.value.expenseEvidence?.overrideApproved, true);
  assert.deepEqual(getApprovedOperationalRingInput(await ringRepo.getSnapshot()), {
    approvedRingCostCents: 8_600, approvedRingCapOverrideCents: 8_600,
  });
  let snapshot = await ringRepo.getSnapshot();
  assert.equal(snapshot.settlements.filter((entry) => entry.direction === "outgoing-expense").length, 0);
  assert.ok(snapshot.auditEvents.some((entry) => entry.eventType === "expense-obligation-created" && entry.metadata.ringCapOverrideApproved === true));
  const retry = await createOperationalFinanceExpense(ringRepo, 2026, {
    category: "championship-ring", amountCents: 8_600, approvedRingCapOverrideCents: 8_600,
    commissionerNote: "Fixture only.", confirmed: true, idempotencyKey: "expense:ring:approved-override",
  }, actor, at);
  assert.equal(retry.created, false);
  await assert.rejects(() => createOperationalFinanceExpense(ringRepo, 2026, {
    category: "championship-ring", amountCents: 4_000, confirmed: true, idempotencyKey: "expense:ring:silent-edit",
  }, actor, at), /reversal\/replacement/);

  await recordOperationalFinanceExpenseSettlement(ringRepo, 2026, ringResult.value.obligationId, {
    amountCents: 8_600, paymentMethod: "card", actualPaidAt: null, commissionerNote: null,
    confirmed: true, idempotencyKey: "expense:ring:card-payment",
  }, actor, at);
  snapshot = await ringRepo.getSnapshot();
  assert.ok(snapshot.settlements.some((entry) => entry.direction === "outgoing-expense" && entry.paymentMethod === "card"));
  assert.ok(snapshot.auditEvents.some((entry) => entry.eventType === "expense-settlement-recorded"));
  const dues = snapshot.obligations.find((entry) => entry.category === "dues-assessment")!;
  await assert.rejects(() => recordSettlement(ringRepo, {
    season: 2026, obligationId: dues.obligationId, direction: "incoming-dues", amountCents: 100,
    paymentMethod: "card", actualPaidAt: null, sourceRef: "test",
  }, actor, "expense:dues:card-rejected", at), /Venmo is the only/);

  const foodRepo = await repository();
  const food = await createOperationalFinanceExpense(foodRepo, 2026, {
    category: "auctioneer-food", amountCents: 6_000, confirmed: true,
    idempotencyKey: "expense:food:approved",
  }, actor, at);
  assert.equal(food.value.fundingSource, "separately-funded");
  await recordOperationalFinanceContribution(foodRepo, 2026, {
    expenseObligationId: food.value.obligationId, contributorOwnerId: "ray-long", amountCents: 2_000,
    paymentMethod: "venmo", actualPaidAt: null, confirmed: true, idempotencyKey: "expense:food:ray-contribution",
  }, actor, at);
  snapshot = await foodRepo.getSnapshot();
  const contribution = snapshot.settlements.find((entry) => entry.direction === "incoming-separate-contribution")!;
  assert.equal(contribution.contributorOwnerId, "ray-long");
  assert.equal(contribution.contributorFranchiseId, "prestigio-mundial");
  assert.ok(snapshot.auditEvents.some((entry) => entry.eventType === "separate-contribution-recorded"));
  assert.equal(snapshot.obligations.filter((entry) => entry.category === "auctioneer-food").length, 1);

  const client = fs.readFileSync("app/commish/finance/2026/OperationalFinanceExpenseReconciliationSection.tsx", "utf8");
  assert.doesNotMatch(client, /firebase\/firestore|Net Earnings/);
  assert.match(client, /This reduces the champion cash payout/);
  assert.match(client, /Corrections require reversal\/replacement/);
  console.log("Operational finance expense workflow checks passed.");
}

void main();
