import type {
  OperationalFinanceArchive,
  OperationalFinanceLedgerSnapshot,
  OperationalFinanceObligation,
  OperationalFinanceSettlement,
} from "@/lib/finance/operationalFinanceLedgerTypes";
import { reconcileOperationalFinance } from "@/lib/finance/operationalFinanceReconciliation";

export type OperationalFinanceExportFormat = "json" | "archive" | "obligations" | "settlements" | "dues-status" | "expenses" | "contributions" | "adjustments" | "report";

type ExportContext = Readonly<{
  snapshot: OperationalFinanceLedgerSnapshot;
  reconciliation: ReturnType<typeof reconcileOperationalFinance>;
}>;

function activeSnapshot(snapshot: OperationalFinanceLedgerSnapshot) {
  const reversedObligations = new Set(snapshot.reversals.filter((entry) => entry.targetType === "obligation").map((entry) => entry.targetId));
  const reversedSettlements = new Set(snapshot.reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId));
  return {
    obligations: snapshot.obligations.filter((entry) => entry.season === 2026 && !reversedObligations.has(entry.obligationId)),
    settlements: snapshot.settlements.filter((entry) => entry.season === 2026 && !reversedSettlements.has(entry.settlementId)),
    reversals: snapshot.reversals.filter((entry) => entry.season === 2026),
  };
}

export function buildOperationalFinanceExportContext(snapshot: OperationalFinanceLedgerSnapshot): ExportContext {
  return { snapshot, reconciliation: reconcileOperationalFinance(snapshot, { seasonState: snapshot.seasons.find((entry) => entry.season === 2026)?.status === "closed" ? "complete" : "regular-season" }) };
}

function cleanObligation(entry: OperationalFinanceObligation) {
  const withoutKey = Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "idempotencyKey"));
  if (!withoutKey.expenseEvidence) return withoutKey;
  return { ...withoutKey, expenseEvidence: { ...withoutKey.expenseEvidence, commissionerNote: null } };
}

function cleanSettlement(entry: OperationalFinanceSettlement) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !["externalReference", "commissionerNote", "idempotencyKey"].includes(key)));
}

function cleanReversal(entry: OperationalFinanceLedgerSnapshot["reversals"][number]) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "idempotencyKey"));
}

export function buildOperationalFinanceExportJson(context: ExportContext) {
  const season = context.snapshot.seasons.find((entry) => entry.season === 2026);
  if (!season) throw new Error("The 2026 operational finance ledger was not found.");
  const active = activeSnapshot(context.snapshot);
  const r = context.reconciliation;
  const reconciliation = {
    status: r.status,
    duesPoolCents: r.duesPoolCents,
    duesAssessedCents: r.duesAssessedCents,
    duesCollectedCents: r.duesCollectedCents,
    duesOutstandingCents: r.duesOutstandingCents,
    expectedPrizeBudgetCents: r.expectedPrizeBudgetCents,
    approvedAwardCents: r.approvedAwardCents,
    paidAwardCents: r.paidAwardCents,
    outstandingAwardCents: r.outstandingAwardCents,
    approvedDuesFundedExpenseCents: r.approvedDuesFundedExpenseCents,
    paidDuesFundedExpenseCents: r.paidDuesFundedExpenseCents,
    separatelyFundedExpenseCents: r.separatelyFundedExpenseCents,
    paidSeparatelyFundedExpenseCents: r.paidSeparatelyFundedExpenseCents,
    separatelyFundedContributionCents: r.separatelyFundedContributionCents,
    approvedRingExpenseCents: r.approvedRingExpenseCents,
    projectedChampionCashCents: r.projectedChampionCashCents,
    approvedChampionCashCents: r.approvedChampionCashCents,
    currentlyAllocatedCents: r.currentlyAllocatedCents,
    currentlyUnallocatedCents: r.currentlyUnallocatedCents,
    cashOnHandCents: r.cashOnHandCents,
    reconciliationAdjustmentCents: r.reconciliationAdjustmentCents,
    readyToClose: r.readyToClose,
    checks: r.checks,
  };
  return Object.freeze({
    exportSchemaVersion: "operational-finance-export:1",
    generatedAt: new Date().toISOString(),
    exportStatus: season.status === "closed" ? "closed / archived" : "operational / provisional",
    seasonMetadata: {
      season: season.season,
      schemaVersion: season.schemaVersion,
      rulesVersion: season.rulesVersion,
      sourceLeagueId: season.sourceLeagueId,
      status: season.status,
      createdAt: season.createdAt,
      updatedAt: season.updatedAt,
      closedAt: season.closedAt,
      closedBy: season.closedBy,
      archiveId: season.archiveId ?? null,
      archiveHash: season.archiveHash ?? null,
      archiveRevision: season.archiveRevision ?? null,
      rulesSnapshotHash: season.rulesSnapshotHash,
      financialOwnerMappingVersion: season.financialOwnerMappingVersion,
    },
    reconciliation,
    obligations: active.obligations.sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map(cleanObligation),
    settlements: active.settlements.sort((a, b) => a.settlementId.localeCompare(b.settlementId)).map(cleanSettlement),
    reversals: active.reversals.sort((a, b) => a.reversalId.localeCompare(b.reversalId)).map(cleanReversal),
    expenses: [...context.reconciliation.expenses].sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map((expense) => ({ obligationId: expense.obligationId, category: expense.category, fundingSource: expense.fundingSource, amountCents: expense.amountCents, paidCents: expense.paidCents, outstandingCents: expense.outstandingCents, contributedCents: expense.contributedCents, effectiveDate: expense.effectiveDate, description: expense.description, evidenceReference: expense.evidenceReference })),
    adjustments: [...context.reconciliation.adjustments].sort((a, b) => a.adjustmentId.localeCompare(b.adjustmentId)),
    contributions: active.settlements.filter((entry) => entry.direction === "incoming-separate-contribution").sort((a, b) => a.settlementId.localeCompare(b.settlementId)).map(cleanSettlement),
  });
}

export function buildOperationalFinanceArchiveExport(archive: OperationalFinanceArchive, exportedAt: string) {
  return Object.freeze({
    exportSchemaVersion: "operational-finance-archive-export:1",
    exportStatus: "closed / immutable archive",
    manifest: {
      season: archive.season,
      archiveId: archive.archiveId,
      archiveRevision: archive.archiveRevision ?? 1,
      schemaVersion: archive.schemaVersion,
      archiveHash: archive.archiveHash,
      exportedAt,
      closedAt: archive.closedAt,
      closedBy: archive.closedBy,
      sourceLeagueId: archive.sourceLeagueId,
      provenance: "Server-generated from the authoritative closed operational finance archive.",
    },
    archive,
  });
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows: readonly (readonly unknown[])[]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function dollars(cents: number) { return (cents / 100).toFixed(2); }

export function canonicalOperationalFinanceExportJson(value: unknown) {
  const stable = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(stable);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input as Record<string, unknown>).filter(([, child]) => child !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)]));
    return input;
  };
  return JSON.stringify(stable(value));
}

export function buildOperationalFinanceCsv(context: ExportContext, format: Exclude<OperationalFinanceExportFormat, "json" | "report">) {
  const active = activeSnapshot(context.snapshot);
  if (format === "obligations") return csv([["obligation_id", "season", "category", "amount_cents", "amount_usd", "funding_source", "franchise_id", "financial_owner_id", "rule_ref", "source_ref"], ...active.obligations.sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map((entry) => [entry.obligationId, entry.season, entry.category, entry.amountCents, dollars(entry.amountCents), entry.fundingSource, entry.franchiseId, entry.financialOwnerId, entry.ruleRef, entry.sourceRef])]);
  if (format === "settlements") return csv([["settlement_id", "obligation_id", "direction", "amount_cents", "amount_usd", "payment_method"], ...active.settlements.sort((a, b) => a.settlementId.localeCompare(b.settlementId)).map((entry) => [entry.settlementId, entry.obligationId, entry.direction, entry.amountCents, dollars(entry.amountCents), entry.paymentMethod])]);
  if (format === "dues-status") {
    const rows = active.obligations.filter((entry) => entry.category === "dues-assessment").sort((a, b) => String(a.franchiseId).localeCompare(String(b.franchiseId))).map((entry) => {
      const settled = active.settlements.filter((item) => item.obligationId === entry.obligationId && item.direction === "incoming-dues").reduce((sum, item) => sum + item.amountCents, 0);
      return [entry.franchiseId, entry.financialOwnerId, entry.amountCents, dollars(entry.amountCents), settled, dollars(settled), entry.amountCents - settled, dollars(entry.amountCents - settled), settled >= entry.amountCents ? "PAID" : "NOT PAID"];
    });
    return csv([["franchise_id", "financial_owner_id", "assessed_cents", "assessed_usd", "settled_cents", "settled_usd", "outstanding_cents", "outstanding_usd", "status"], ...rows]);
  }
  if (format === "expenses") return csv([["expense_id", "category", "effective_date", "description", "evidence_reference", "amount_cents", "amount_usd", "funding_source", "paid_cents", "paid_usd", "contributed_cents", "contributed_usd"], ...[...context.reconciliation.expenses].sort((a, b) => a.obligationId.localeCompare(b.obligationId)).map((entry) => [entry.obligationId, entry.category, entry.effectiveDate, entry.description, entry.evidenceReference, entry.amountCents, dollars(entry.amountCents), entry.fundingSource, entry.paidCents, dollars(entry.paidCents), entry.contributedCents, dollars(entry.contributedCents)])]);
  if (format === "contributions") return csv([["contribution_id", "expense_obligation_id", "amount_cents", "amount_usd", "payment_method"], ...active.settlements.filter((entry) => entry.direction === "incoming-separate-contribution").sort((a, b) => a.settlementId.localeCompare(b.settlementId)).map((entry) => [entry.settlementId, entry.obligationId, entry.amountCents, dollars(entry.amountCents), entry.paymentMethod])]);
  return csv([["adjustment_id", "category", "amount_cents", "amount_usd", "reason", "effective_date", "created_at", "created_by"], ...[...context.reconciliation.adjustments].sort((a, b) => a.adjustmentId.localeCompare(b.adjustmentId)).map((entry) => [entry.adjustmentId, entry.category, entry.amountCents, dollars(entry.amountCents), entry.reason, entry.effectiveDate, entry.createdAt, entry.createdBy])]);
}

export function buildOperationalFinanceReport(context: ExportContext) {
  const r = context.reconciliation;
  const season = context.snapshot.seasons.find((entry) => entry.season === 2026);
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return [
    "River City FFL Operational Finance Reconciliation",
    `Season: 2026`,
    `Export status: ${season?.status === "closed" ? "Closed / archived" : "Operational / provisional"}`,
    `Close status: ${season?.status === "closed" ? "Closed" : "Open"}`,
    "",
    `Dues assessed: ${money(r.duesAssessedCents)}`,
    `Dues collected: ${money(r.duesCollectedCents)}`,
    `Dues outstanding: ${money(r.duesOutstandingCents)}`,
    `Awards approved: ${money(r.approvedAwardCents)}`,
    `Awards paid: ${money(r.paidAwardCents)}`,
    `Awards outstanding: ${money(r.outstandingAwardCents)}`,
    `Dues-funded expenses: ${money(r.approvedDuesFundedExpenseCents)}`,
    `Separately funded expenses: ${money(r.separatelyFundedExpenseCents)}`,
    `Separate contributions: ${money(r.separatelyFundedContributionCents)}`,
    `Championship allocation: ${money(r.championshipAllocationCents)}`,
    `Approved ring expense: ${r.approvedRingExpenseCents === null ? "Pending" : money(r.approvedRingExpenseCents)}`,
    `Projected champion cash: ${r.projectedChampionCashCents === null ? "Pending" : money(r.projectedChampionCashCents)}`,
    `Reconciliation status: ${r.status}`,
    `Close ready: ${r.readyToClose ? "Yes" : "No"}`,
    "",
    "Blockers / checks:",
    ...r.checks.filter((check) => check.state !== "PASS").map((check) => `- ${check.state}: ${check.label} — ${check.detail}`),
  ].join("\n") + "\n";
}
