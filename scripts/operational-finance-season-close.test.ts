import assert from "node:assert/strict";

import { apply2026OpeningDuesMigration, recordReconciliationAdjustment } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import { closeOperationalFinanceSeason, reopenOperationalFinanceSeasonForCorrection, reviewOperationalFinanceSeasonClose } from "../lib/finance/operationalFinanceArchive";
import { operationalFinanceArchiveToHistoricalTransactions, closedOperationalFinanceArchivesToHistoricalTransactions } from "../lib/history/operationalFinanceHistoricalAdapter";
import { buildFinancialHistory } from "../lib/history/financialHistory";
import { HISTORICAL_FINANCIAL_SOURCE, HISTORICAL_FINANCIAL_TRANSACTIONS } from "../lib/history/historicalFinancialData";
import type { OperationalFinanceLedgerRepository, OperationalFinanceLedgerTransaction, OperationalFinanceObligation, OperationalFinanceSettlement } from "../lib/finance/operationalFinanceLedgerTypes";

const at = "2026-12-31T23:59:00.000Z";
const actor = { actorId: "commissioner:close-test", role: "commissioner" as const };
const system = { actorId: "system:close-test", role: "system" as const };

function award(template: OperationalFinanceObligation, index: number, category: OperationalFinanceObligation["category"], amountCents: number): OperationalFinanceObligation {
  return { ...template, obligationId: `fixture-award-${index}`, category, amountCents, fundingSource: "dues-funded", proposalKey: `fixture-proposal-${index}`, financialOwnerId: "ray-long", franchiseId: "prestigio-mundial" };
}

async function readyRepository() {
  const repo = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repo, system, at);
  const opening = await repo.getSnapshot();
  const template = opening.obligations[0];
  const awards = [
    ...Array.from({ length: 14 }, (_, index) => award(template, index, "weekly-high-score", 1_000)),
    ...Array.from({ length: 3 }, (_, index) => award(template, 14 + index, "division-winner", 2_500)),
    award(template, 17, "third-place", 5_000),
    award(template, 18, "runner-up", 10_000),
    award(template, 19, "champion", 21_900),
  ];
  const ring: OperationalFinanceObligation = {
    ...template,
    obligationId: "fixture-ring",
    category: "championship-ring",
    amountCents: 1_600,
    financialOwnerId: null,
    franchiseId: null,
    expenseEvidence: { actualCostCents: 1_600, defaultFundingCapCents: 8_000, approvedFundingCapCents: 8_000, overCapCents: 0, overrideApproved: false, commissionerNote: "private note omitted" },
  };
  const alreadyPaid = new Set(opening.settlements.map((settlement) => settlement.obligationId));
  const dues = opening.obligations.filter((obligation) => !alreadyPaid.has(obligation.obligationId)).map((obligation, index) => ({ ...opening.settlements[0], settlementId: `fixture-dues-${index}`, obligationId: obligation.obligationId, amountCents: 5_000, direction: "incoming-dues" as const }));
  const awardSettlements = awards.map((obligation, index) => ({ ...opening.settlements[0], settlementId: `fixture-award-payment-${index}`, obligationId: obligation.obligationId, amountCents: obligation.amountCents, direction: "outgoing-award" as const }));
  const ringPayment: OperationalFinanceSettlement = { ...opening.settlements[0], settlementId: "fixture-ring-payment", obligationId: ring.obligationId, amountCents: 1_600, direction: "outgoing-expense", paymentMethod: "card", externalReference: "@private-venmo-handle", commissionerNote: "private payment note" };
  await repo.runTransaction(async (transaction) => {
    for (const obligation of [...awards, ring]) await transaction.putObligation(obligation);
    for (const settlement of [...dues, ...awardSettlements, ringPayment]) await transaction.putSettlement(settlement);
  });
  return repo;
}

const completeContext = { seasonState: "complete" as const, proposalSet: null, unresolvedAwardCorrection: false };

async function main() {
  const open = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(open, system, at);
  await assert.rejects(() => closeOperationalFinanceSeason(open, { ...completeContext, seasonState: "preseason" }, actor, "close:preseason", at, true), /blocked|not ready/i);
  assert.equal((await open.getSnapshot()).seasons[0].status, "open");

  const first = await readyRepository();
  const review = reviewOperationalFinanceSeasonClose(await first.getSnapshot(), completeContext);
  assert.equal(review.readyToClose, true);
  const closed = await closeOperationalFinanceSeason(first, completeContext, actor, "close:fixture:1", at, true);
  assert.equal(closed.created, true);
  const snapshot = await first.getSnapshot();
  assert.equal(snapshot.seasons[0].status, "closed");
  assert.equal(snapshot.seasons[0].archiveHash, closed.archive.archiveHash);
  assert.equal(snapshot.auditEvents.some((event) => event.eventType === "season-closed"), true);
  assert.equal(JSON.stringify(closed.archive).includes("@private-venmo-handle"), false);
  assert.equal(JSON.stringify(closed.archive).includes("private payment note"), false);
  const retry = await closeOperationalFinanceSeason(first, completeContext, actor, "close:fixture:1", at, true);
  assert.equal(retry.created, false);
  await assert.rejects(() => closeOperationalFinanceSeason(first, completeContext, actor, "close:fixture:2", at, true), /closed|immutable/i);
  assert.equal(closed.archive.archiveRevision, 1);
  await assert.rejects(
    () => reopenOperationalFinanceSeasonForCorrection(first, system, "not allowed", "reopen:bad", at),
    /commissioner/i
  );
  await assert.rejects(
    () => recordReconciliationAdjustment(first, { season: 2026, category: "cash_variance", amountCents: 100, reason: "closed correction", effectiveDate: "2026-12-31", sourceRef: "fixture" }, actor, "adjust:closed", at),
    /closed season is immutable/i
  );
  const reopened = await reopenOperationalFinanceSeasonForCorrection(first, actor, "Correct approved close evidence", "reopen:fixture:1", at);
  assert.equal(reopened.created, true);
  assert.equal((await first.getSnapshot()).seasons[0].status, "reconciling");
  const corrected = await closeOperationalFinanceSeason(first, completeContext, actor, "close:fixture:2", at, true);
  assert.equal(corrected.archive.archiveRevision, 2);
  assert.equal(corrected.archive.supersedesArchiveId, closed.archive.archiveId);
  assert.equal((await first.getAllArchives(2026)).length, 2);
  assert.equal((await first.getAllArchives(2026))[0].archiveId, closed.archive.archiveId);

  const second = await readyRepository();
  const closedAgain = await closeOperationalFinanceSeason(second, completeContext, actor, "close:fixture:1", at, true);
  assert.equal(closedAgain.archive.archiveHash, closed.archive.archiveHash);
  assert.equal(JSON.stringify(closedAgain.archive), JSON.stringify(closed.archive));

  const transactions = operationalFinanceArchiveToHistoricalTransactions(closed.archive);
  assert.equal(transactions.filter((entry) => entry.category === "champion")[0].recordedWinningsAmount, 219);
  assert.equal(transactions.filter((entry) => entry.category === "championship-ring-expense")[0].amount, 16);
  assert.equal(transactions.reduce((sum, entry) => sum + entry.duesPaidAmount, 0), 600);
  assert.equal(transactions.reduce((sum, entry) => sum + entry.recordedWinningsAmount, 0), 584);
  assert.equal(transactions.reduce((sum, entry) => sum + entry.cashPaidAmount, 0), 584);
  assert.equal(closedOperationalFinanceArchivesToHistoricalTransactions([]).length, 0);
  const historical = buildFinancialHistory({
    source: HISTORICAL_FINANCIAL_SOURCE,
    transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
    operationalArchives: [closed.archive, corrected.archive],
  });
  assert.deepEqual(historical.coverage.seasons.slice(-2), [2025, 2026]);
  assert.equal(historical.coverage.latestSeason, 2026);
  assert.equal(historical.coverage.season2026, "closed-operational-archive");
  assert.equal(historical.transactions.filter((entry) => entry.season === 2026).length, transactions.length);

  const failingBase = await readyRepository();
  const failing: OperationalFinanceLedgerRepository = {
    getSnapshot: () => failingBase.getSnapshot(),
    getArchive: (season) => failingBase.getArchive(season),
    getAllArchives: (season) => failingBase.getAllArchives(season),
    runTransaction: <T>(operation: (transaction: OperationalFinanceLedgerTransaction) => Promise<T>) => failingBase.runTransaction((transaction) => operation({ ...transaction, putArchive: async () => { throw new Error("archive storage unavailable"); } })),
  };
  await assert.rejects(() => closeOperationalFinanceSeason(failing, completeContext, actor, "close:failure", at, true), /archive storage unavailable/i);
  assert.equal((await failingBase.getSnapshot()).seasons[0].status, "open");
  console.log("Operational finance season-close checks passed (fixtures/in-memory only; production untouched).");
}

void main();
