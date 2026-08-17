import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { apply2026OpeningDuesMigration, recordSettlement } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { createOperationalFinanceExpense } from "../lib/finance/operationalFinanceExpenses";
import { buildPublicOperationalFinancePresentation } from "../lib/finance/publicOperationalFinancePresentation";
import { HISTORICAL_FINANCIAL_SOURCE, HISTORICAL_FINANCIAL_TRANSACTIONS } from "../lib/history/historicalFinancialData";
import { buildFinancialHistory } from "../lib/history/financialHistory";
import { buildFinancialHistoryPresentation } from "../lib/managers/financialHistoryPresentation";
import { franchises, ownerProfiles, ownershipTenures } from "../lib/managers/identityData";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";

const actor: OperationalFinanceActor = { actorId: "commissioner:public-live-regression", role: "commissioner" };
const system: OperationalFinanceActor = { actorId: "system:public-live-regression", role: "system" };
const recordedAt = "2026-08-12T12:00:00.000Z";

async function main() {
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, system, recordedAt);

  const opening = await repository.getSnapshot();
  const stan = opening.obligations.find((entry) => entry.category === "dues-assessment" && entry.financialOwnerId === "stan-schoppe")!;
  await recordSettlement(repository, {
    season: 2026,
    obligationId: stan.obligationId,
    direction: "incoming-dues",
    amountCents: 5_000,
    paymentMethod: "venmo",
    actualPaidAt: null,
    sourceRef: "fixture:public-sixth-dues",
  }, actor, "public-live:dues:stan", recordedAt);

  await createOperationalFinanceExpense(repository, 2026, {
    effectiveDate: "2026-08-11", description: "Fixture ring", evidenceReference: "private-reference",
    category: "championship-ring",
    amountCents: 1_377,
    confirmed: true,
    idempotencyKey: "public-live:ring:1377",
  }, actor, recordedAt);

  const publicPresentation = buildPublicOperationalFinancePresentation(await repository.getSnapshot());

  assert.equal(publicPresentation.duesAssessedCents, 60_000);
  assert.equal(publicPresentation.duesCollectedCents, 30_000);
  assert.equal(publicPresentation.duesOutstandingCents, 30_000);
  assert.equal(publicPresentation.paidCount, 6);
  assert.equal(publicPresentation.notPaidCount, 6);
  const publicStan = publicPresentation.duesRows.find((row) => row.financialOwnerId === "stan-schoppe")!;
  assert.equal(publicStan.status, "PAID");
  assert.equal(publicPresentation.approvedRingExpenseCents, 1_377);
  assert.equal(publicPresentation.projectedChampionCashCents, 22_123);
  assert.equal(publicPresentation.approvedAwards.length, 0);
  assert.equal(publicPresentation.approvedExpenses.length, 1);
  assert.equal(publicPresentation.approvedExpenses[0].label, "Championship Ring");
  assert.equal(publicPresentation.approvedExpenses[0].funding, "Dues funded");

  const serialized = JSON.stringify(publicPresentation);
  assert.doesNotMatch(serialized, /venmo|actualPaidAt|externalReference|commissionerNote|idempotency|audit|contact/i);

  const client = readFileSync("components/league-info/FinancialHistoryClient.tsx", "utf8");
  const formatPublicMoney = (cents: number) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  assert.equal(formatPublicMoney(publicPresentation.approvedRingExpenseCents), "$13.77");
  assert.equal(formatPublicMoney(publicPresentation.projectedChampionCashCents), "$221.23");
  assert.equal(formatPublicMoney(publicPresentation.championshipAllocationCents), "$235");
  assert.match(client, /maximumFractionDigits: 2/);
  assert.match(client, /Championship allocation:/);
  assert.match(client, /Ring cost:/);
  assert.match(client, /Projected champion cash/);
  assert.doesNotMatch(client, /<strong>Champion cash:<\/strong>/);

  const aggregate = buildFinancialHistory({
    source: HISTORICAL_FINANCIAL_SOURCE,
    transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
  });
  const historical = buildFinancialHistoryPresentation({
    aggregate,
    ownerDisplays: ownerProfiles.map((owner) => ({ id: owner.id, name: owner.fullName })),
    franchiseDisplays: franchises.map((franchise) => ({
      id: franchise.id,
      name: franchise.currentTeamName,
      ownerIdsBySeason: Object.fromEntries(aggregate.coverage.seasons.map((season) => [
        season,
        ownershipTenures
          .filter((tenure) => tenure.franchiseId === franchise.id && tenure.startSeason <= season && (tenure.endSeason === undefined || tenure.endSeason >= season))
          .map((tenure) => tenure.ownerId),
      ])),
    })),
  });
  assert.equal(historical.seasons.some((season) => season.season === 2026), false);
  assert.equal(historical.seasons[0]?.season, 2025);
  assert.equal(historical.seasons.at(-1)?.season, 2016);

  const page = readFileSync("app/league-info/payouts/page.tsx", "utf8");
  assert.match(page, /export const dynamic = ["']force-dynamic["']/);
  console.log("Live public current-finance regression passed (in-memory only; production untouched).");
}

void main();
