import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  parseCommissionerAwardSettlementRequest,
  recordCommissionerAwardSettlement,
} from "../lib/finance/operationalFinanceAwardSettlement";
import {
  buildOperationalFinanceCommissionerDashboardPresentation,
  unavailableOperationalFinanceAwardProposalSource,
} from "../lib/finance/operationalFinanceAwardReview";
import {
  apply2026OpeningDuesMigration,
  recordObligation,
} from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "../lib/finance/operationalFinanceRules";

const root = process.cwd();
const read = (value: string) => fs.readFileSync(path.join(root, value), "utf8");
const commissioner: OperationalFinanceActor = { actorId: "commissioner:test", role: "commissioner" };
const system: OperationalFinanceActor = { actorId: "system:test", role: "system" };
const at = "2026-09-20T12:00:00.000Z";

function request(key: string, amountCents?: number) {
  return {
    ...(amountCents === undefined ? {} : { amountCents }),
    paymentMethod: "venmo",
    actualPaidAt: null,
    commissionerNote: null,
    idempotencyKey: key,
  };
}

async function award(repository: InMemoryOperationalFinanceLedgerRepository, suffix: string, amountCents: number) {
  return recordObligation(repository, {
    obligationId: `operational-finance-obligation:2026:weekly-high-score:${suffix}`,
    season: 2026,
    category: "weekly-high-score",
    amountCents,
    fundingSource: "dues-funded",
    franchiseId: "the-shepherd",
    financialOwnerId: "tommy-moore",
    proposalKey: `operational-finance-proposal:2026:weekly-high-score:${suffix}`,
    ruleRef: OPERATIONAL_FINANCE_SEASON_2026.weeklyAward.id,
    ruleProvenance: OPERATIONAL_FINANCE_SEASON_2026.weeklyAward.provenance,
    sourceRef: `fixture:${suffix}`,
  }, commissioner, `award:create:${suffix}`, at);
}

async function main() {
  assert.throws(() => parseCommissionerAwardSettlementRequest(request("award:zero", 0)), /positive/);
  assert.throws(() => parseCommissionerAwardSettlementRequest(request("award:negative", -1)), /positive/);
  assert.throws(() => parseCommissionerAwardSettlementRequest({ ...request("award:paypal", 100), paymentMethod: "paypal" }), /Venmo/);
  assert.throws(() => parseCommissionerAwardSettlementRequest({ ...request("award:owner", 100), ownerId: "ray-long" }), /Unsupported/);
  assert.throws(() => parseCommissionerAwardSettlementRequest({ ...request("award:balance", 100), remainingCents: 100 }), /Unsupported/);

  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, system, at);
  const full = await award(repository, "week-1", 1_000);
  const partial = await award(repository, "week-2", 1_000);
  await assert.rejects(
    () => recordCommissionerAwardSettlement(repository, 2026, full.value.obligationId, request("award:unauthorized"), system, at),
    /Commissioner authorization/
  );
  const duesId = `operational-finance-obligation:2026:dues:prestigio-mundial`;
  await assert.rejects(
    () => recordCommissionerAwardSettlement(repository, 2026, duesId, request("award:dues", 100), commissioner, at),
    /approved award obligation/
  );
  await assert.rejects(
    () => recordCommissionerAwardSettlement(repository, 2026, "missing", request("award:missing", 100), commissioner, at),
    /not found/
  );
  await assert.rejects(
    () => recordCommissionerAwardSettlement(repository, 2026, partial.value.obligationId, request("award:over", 1_001), commissioner, at),
    /remaining balance/
  );

  const obligationBefore = structuredClone(full.value);
  const paid = await recordCommissionerAwardSettlement(
    repository, 2026, full.value.obligationId, request("award:payment:full"), commissioner, at
  );
  assert.equal(paid.created, true);
  assert.equal(paid.settlement.amountCents, 1_000);
  assert.equal(paid.settlement.direction, "outgoing-award");
  const duplicate = await recordCommissionerAwardSettlement(
    repository, 2026, full.value.obligationId, request("award:payment:full"), commissioner, at
  );
  assert.equal(duplicate.created, false);
  await assert.rejects(
    () => recordCommissionerAwardSettlement(repository, 2026, partial.value.obligationId, request("award:payment:full", 500), commissioner, at),
    /different award payment request/
  );
  await recordCommissionerAwardSettlement(
    repository, 2026, partial.value.obligationId, request("award:payment:partial", 400), commissioner, at
  );
  const snapshot = await repository.getSnapshot();
  assert.deepEqual(snapshot.obligations.find((entry) => entry.obligationId === full.value.obligationId), obligationBefore);
  assert.equal(snapshot.settlements.filter((entry) => entry.direction === "outgoing-award").length, 2);
  assert.equal(snapshot.auditEvents.filter((entry) => entry.eventType === "award-settlement-recorded").length, 2);
  const dashboard = buildOperationalFinanceCommissionerDashboardPresentation(
    snapshot, 2026, unavailableOperationalFinanceAwardProposalSource("fixture")
  );
  const fullCard = dashboard.awardReview.approvedAwards.find((entry) => entry.obligationId === full.value.obligationId)!;
  const partialCard = dashboard.awardReview.approvedAwards.find((entry) => entry.obligationId === partial.value.obligationId)!;
  assert.equal(fullCard.paymentStatusLabel, "PAID");
  assert.equal(fullCard.remainingCents, 0);
  assert.equal(partialCard.paymentStatusLabel, "PARTIAL");
  assert.equal(partialCard.remainingCents, 600);

  const route = read("app/api/commish/finance/[season]/awards/[obligationId]/settlements/route.ts");
  assert.match(route, /requireOperationalFinanceCommissioner/);
  assert.match(route, /Cross-origin request denied/);
  assert.match(route, /getOperationalFinanceLedgerRepository/);
  assert.doesNotMatch(route, /api\.venmo|venmo\.com|fetch\([^)]*venmo/i);
  assert.ok(!fs.existsSync(path.join(root, "app/api/finance/2026/awards")));
  const client = read("app/commish/finance/2026/OperationalFinanceAwardPaymentControls.tsx");
  assert.match(client, /does not send money/);
  assert.match(client, /already sent this payment externally/);
  assert.match(client, /Record Venmo Payment/);

  console.log("Operational finance award-settlement checks passed (fixtures/in-memory only). ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
