import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getDuesStatus,
  recordObligation,
  recordSettlement,
  type RecordObligationInput,
} from "../lib/finance/operationalFinanceLedger";
import {
  parseCommissionerDuesPaymentReversalRequest,
  reverseCommissionerDuesPayment,
} from "../lib/finance/operationalFinanceDashboard";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";

const at = "2026-08-26T18:00:00.000Z";
const commissioner: OperationalFinanceActor = { actorId: "commissioner:ray-long", role: "commissioner" };
const member: OperationalFinanceActor = { actorId: "member:brian-stevens", role: "system" };

const dashboardClientSource = readFileSync(
  resolve(process.cwd(), "app/commish/finance/2026/OperationalFinanceDashboardClient.tsx"),
  "utf8"
);
const reversalRouteSource = readFileSync(
  resolve(process.cwd(), "app/api/commish/finance/[season]/dues/[obligationId]/settlements/[settlementId]/reverse/route.ts"),
  "utf8"
);

function dues(ownerId: string, franchiseId: string): RecordObligationInput {
  return {
    obligationId: `operational-finance-obligation:2026:dues:${franchiseId}`,
    season: 2026,
    category: "dues-assessment",
    amountCents: 5_000,
    fundingSource: "dues-funded",
    franchiseId,
    financialOwnerId: ownerId,
    ruleRef: "fixture-dues",
    ruleProvenance: [],
    sourceRef: "fixture:payment-reversal",
  };
}

async function main() {
  assert.match(dashboardClientSource, /type="button"[\s\S]*Reverse Payment/);
  assert.match(dashboardClientSource, /event\.preventDefault\(\)/);
  assert.match(dashboardClientSource, /event\.stopPropagation\(\)/);
  assert.match(dashboardClientSource, /setDashboard\(payload\.dashboard\)/);
  assert.doesNotMatch(dashboardClientSource, /router\.(push|replace|refresh)\(|window\.location/);
  assert.doesNotMatch(reversalRouteSource, /redirect\(/);

  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await repository.runTransaction(async (transaction) => {
    await transaction.putSeason({
      season: 2026,
      schemaVersion: "test",
      rulesVersion: "test",
      status: "open",
      createdAt: at,
      updatedAt: at,
      closedAt: null,
      closedBy: null,
      rulesSnapshotHash: "test",
      financialOwnerMappingVersion: "test",
      sourceLeagueId: "test",
    });
  });
  const brian = dues("brian-stevens", "brian-stevens");
  const doug = dues("doug-fordham", "doug-fordham");
  const carol = dues("carol-test", "carol-test");
  await recordObligation(repository, brian, commissioner, "test:obligation:brian", at);
  await recordObligation(repository, doug, commissioner, "test:obligation:doug", at);
  await recordObligation(repository, carol, commissioner, "test:obligation:carol", at);
  const brianPayment = await recordSettlement(repository, {
    season: 2026,
    obligationId: brian.obligationId,
    direction: "incoming-dues",
    amountCents: 5_000,
    paymentMethod: "venmo",
    actualPaidAt: "2026-08-19T00:00:00.000Z",
    sourceRef: "fixture:payment-reversal",
  }, commissioner, "test:settlement:brian", at);
  const dougPayment = await recordSettlement(repository, {
    season: 2026,
    obligationId: doug.obligationId,
    direction: "incoming-dues",
    amountCents: 5_000,
    paymentMethod: "venmo",
    actualPaidAt: "2026-08-19T00:00:00.000Z",
    sourceRef: "fixture:payment-reversal",
  }, commissioner, "test:settlement:doug", at);
  const carolPayment = await recordSettlement(repository, {
    season: 2026,
    obligationId: carol.obligationId,
    direction: "incoming-dues",
    amountCents: 2_000,
    paymentMethod: "venmo",
    actualPaidAt: "2026-08-19T00:00:00.000Z",
    sourceRef: "fixture:payment-reversal",
  }, commissioner, "test:settlement:carol-partial", at);

  assert.equal((await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === brian.financialOwnerId)?.state, "paid");
  assert.equal((await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === doug.financialOwnerId)?.state, "paid");
  assert.equal((await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === carol.financialOwnerId)?.state, "partially-paid");
  const reversed = await reverseCommissionerDuesPayment(repository, 2026, {
    obligationId: brian.obligationId,
    settlementId: brianPayment.value.settlementId,
    reason: "Payment recorded in error.",
    idempotencyKey: "test:reverse:brian",
  }, commissioner, at);
  assert.equal(reversed.created, true);
  const brianAfter = (await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === brian.financialOwnerId)!;
  const dougAfter = (await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === doug.financialOwnerId)!;
  assert.deepEqual({ assessed: brianAfter.assessedCents, settled: brianAfter.settledCents, remaining: brianAfter.outstandingCents, state: brianAfter.state }, { assessed: 5_000, settled: 0, remaining: 5_000, state: "unpaid" });
  assert.deepEqual({ settled: dougAfter.settledCents, remaining: dougAfter.outstandingCents, state: dougAfter.state }, { settled: 5_000, remaining: 0, state: "paid" });
  await reverseCommissionerDuesPayment(repository, 2026, {
    obligationId: carol.obligationId,
    settlementId: carolPayment.value.settlementId,
    reason: "Partial payment recorded in error.",
    idempotencyKey: "test:reverse:carol-partial",
  }, commissioner, at);
  const carolAfter = (await getDuesStatus(repository, 2026)).find((entry) => entry.financialOwnerId === carol.financialOwnerId)!;
  assert.deepEqual({ settled: carolAfter.settledCents, remaining: carolAfter.outstandingCents, state: carolAfter.state }, { settled: 0, remaining: 5_000, state: "unpaid" });
  const snapshot = await repository.getSnapshot();
  assert.equal(snapshot.settlements.some((entry) => entry.settlementId === brianPayment.value.settlementId), true);
  assert.equal(snapshot.reversals.filter((entry) => entry.targetId === brianPayment.value.settlementId).length, 1);
  assert.equal(snapshot.auditEvents.some((entry) => entry.eventType === "settlement-reversed" && entry.targetType === "reversal"), true);
  await assert.rejects(() => reverseCommissionerDuesPayment(repository, 2026, {
    obligationId: brian.obligationId,
    settlementId: brianPayment.value.settlementId,
    reason: "Second attempt.",
    idempotencyKey: "test:reverse:brian-2",
  }, commissioner, at), /already reversed/);
  await assert.rejects(() => reverseCommissionerDuesPayment(repository, 2026, {
    obligationId: doug.obligationId,
    settlementId: dougPayment.value.settlementId,
    reason: "Unauthorized attempt.",
    idempotencyKey: "test:reverse:doug",
  }, member, at), /Commissioner authorization/);
  assert.throws(() => parseCommissionerDuesPaymentReversalRequest({
    obligationId: brian.obligationId,
    settlementId: brianPayment.value.settlementId,
    reason: "x",
    idempotencyKey: "bad key",
  }), /idempotency/);
  console.log("Operational finance payment reversal checks passed (in-memory only; no production writes).");
}

void main();
