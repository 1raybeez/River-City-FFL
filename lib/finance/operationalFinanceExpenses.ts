import {
  recordApprovedExpense,
  recordSettlement,
} from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceActor,
  OperationalFinanceLedgerRepository,
  OperationalFinanceLedgerSnapshot,
  OperationalFinancePaymentMethod,
} from "@/lib/finance/operationalFinanceLedgerTypes";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";

const EXPENSE_METHODS = new Set<OperationalFinancePaymentMethod>([
  "venmo",
  "card",
  "cash",
  "other",
]);

function requireCommissioner(actor: OperationalFinanceActor) {
  if (actor.role !== "commissioner" || !actor.actorId.trim()) {
    throw new Error("Commissioner authorization is required for expense mutations.");
  }
}

function idempotency(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9:._-]{8,240}$/.test(value)) {
    throw new Error(`A valid ${label} idempotency key is required.`);
  }
  return value;
}

function cents(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer number of cents.`);
  }
  return Number(value);
}

function optionalNote(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Commissioner note must be text.");
  const normalized = value.trim();
  if (normalized.length > 500) throw new Error("Commissioner note must be 500 characters or fewer.");
  return normalized || null;
}

function optionalTimestamp(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Payment date must be an ISO timestamp or null.");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Payment date is invalid.");
  return parsed.toISOString();
}

export function getApprovedOperationalRingInput(
  snapshot: OperationalFinanceLedgerSnapshot
) {
  const reversed = new Set(
    snapshot.reversals
      .filter((entry) => entry.targetType === "obligation")
      .map((entry) => entry.targetId)
  );
  const rings = snapshot.obligations.filter(
    (entry) =>
      entry.season === 2026 &&
      entry.category === "championship-ring" &&
      !reversed.has(entry.obligationId)
  );
  if (rings.length !== 1) return null;
  const ring = rings[0];
  return {
    approvedRingCostCents: ring.amountCents,
    approvedRingCapOverrideCents: ring.expenseEvidence?.overrideApproved
      ? ring.expenseEvidence.approvedFundingCapCents ?? undefined
      : undefined,
  };
}

export async function createOperationalFinanceExpense(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  raw: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
) {
  requireCommissioner(actor);
  if (season !== 2026) throw new Error("Expense creation currently supports 2026 only.");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("An expense request object is required.");
  }
  const input = raw as Record<string, unknown>;
  const allowed = new Set([
    "category",
    "amountCents",
    "approvedRingCapOverrideCents",
    "commissionerNote",
    "confirmed",
    "idempotencyKey",
  ]);
  const unsupported = Object.keys(input).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported expense field: ${unsupported}.`);
  if (input.category !== "championship-ring" && input.category !== "auctioneer-food") {
    throw new Error("Expense category must be championship-ring or auctioneer-food.");
  }
  if (input.confirmed !== true) {
    throw new Error("Explicit commissioner expense confirmation is required.");
  }
  const amountCents = cents(input.amountCents, "Expense amount");
  const override = input.approvedRingCapOverrideCents;
  let approvedRingCapOverrideCents: number | undefined;
  if (override !== undefined && override !== null) {
    approvedRingCapOverrideCents = cents(override, "Ring funding override");
    if (input.category !== "championship-ring") {
      throw new Error("Ring funding override is valid only for the championship ring.");
    }
    if (approvedRingCapOverrideCents < amountCents) {
      throw new Error("Ring funding override must cover the actual ring cost.");
    }
  }
  if (
    input.category === "championship-ring" &&
    amountCents <= OPERATIONAL_FINANCE_SEASON_2026.ringPolicy.defaultCapCents &&
    approvedRingCapOverrideCents !== undefined
  ) {
    throw new Error("A ring funding override is valid only above the default cap.");
  }
  if (
    input.category === "championship-ring" &&
    amountCents > OPERATIONAL_FINANCE_SEASON_2026.ringPolicy.defaultCapCents &&
    approvedRingCapOverrideCents !== undefined &&
    approvedRingCapOverrideCents !== amountCents
  ) {
    throw new Error("The explicit ring funding override must equal the actual ring cost.");
  }
  const key = idempotency(input.idempotencyKey, "expense");
  const snapshot = await repository.getSnapshot();
  const obligationId = `operational-finance-obligation:2026:${
    input.category === "championship-ring"
      ? "championship-ring-expense"
      : "auctioneer-food"
  }`;
  const existing = snapshot.obligations.find((entry) => entry.obligationId === obligationId);
  const existingIdempotency = snapshot.idempotencyRecords.find(
    (entry) => entry.idempotencyKey === key
  );
  if (existing && !existingIdempotency) {
    throw new Error("An approved expense already exists. Correction requires reversal/replacement.");
  }
  return recordApprovedExpense(
    repository,
    {
      season: 2026,
      category: input.category,
      amountCents,
      approvedRingCapOverrideCents,
      commissionerNote: optionalNote(input.commissionerNote),
      sourceRef: `commissioner-dashboard:2026:${input.category}`,
    },
    actor,
    key,
    recordedAt
  );
}

export async function recordOperationalFinanceExpenseSettlement(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  obligationId: string,
  raw: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
) {
  requireCommissioner(actor);
  if (season !== 2026) throw new Error("Expense payment currently supports 2026 only.");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("An expense payment request object is required.");
  }
  const input = raw as Record<string, unknown>;
  const allowed = new Set([
    "amountCents",
    "paymentMethod",
    "actualPaidAt",
    "commissionerNote",
    "confirmed",
    "idempotencyKey",
  ]);
  const unsupported = Object.keys(input).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported expense payment field: ${unsupported}.`);
  if (input.confirmed !== true) throw new Error("Explicit expense payment confirmation is required.");
  if (typeof input.paymentMethod !== "string" || !EXPENSE_METHODS.has(input.paymentMethod as OperationalFinancePaymentMethod)) {
    throw new Error("Expense payment method must be venmo, card, cash, or other.");
  }
  const key = idempotency(input.idempotencyKey, "expense payment");
  const snapshot = await repository.getSnapshot();
  const obligation = snapshot.obligations.find(
    (entry) => entry.obligationId === obligationId && entry.season === season
  );
  if (!obligation || !["championship-ring", "auctioneer-food"].includes(obligation.category)) {
    throw new Error("Approved expense obligation was not found.");
  }
  if (snapshot.reversals.some((entry) => entry.targetType === "obligation" && entry.targetId === obligationId)) {
    throw new Error("A reversed expense cannot receive payment.");
  }
  const reversedSettlements = new Set(snapshot.reversals.filter((entry) => entry.targetType === "settlement").map((entry) => entry.targetId));
  const alreadyPaid = snapshot.settlements
    .filter((entry) => entry.obligationId === obligationId && entry.direction === "outgoing-expense" && !reversedSettlements.has(entry.settlementId))
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const remaining = obligation.amountCents - alreadyPaid;
  const amountCents = input.amountCents === undefined || input.amountCents === null
    ? remaining
    : cents(input.amountCents, "Expense payment amount");
  if (remaining <= 0) throw new Error("This expense is already fully paid.");
  if (amountCents > remaining) throw new Error("Expense payment cannot exceed the remaining balance.");
  const mutation = await recordSettlement(
    repository,
    {
      season: 2026,
      obligationId,
      direction: "outgoing-expense",
      amountCents,
      paymentMethod: input.paymentMethod as OperationalFinancePaymentMethod,
      actualPaidAt: optionalTimestamp(input.actualPaidAt),
      commissionerNote: optionalNote(input.commissionerNote),
      sourceRef: "commissioner-dashboard:2026:expense-payment",
    },
    actor,
    key,
    recordedAt
  );
  return mutation;
}

export async function recordOperationalFinanceContribution(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  raw: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
) {
  requireCommissioner(actor);
  if (season !== 2026) throw new Error("Contribution recording currently supports 2026 only.");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("A contribution request object is required.");
  }
  const input = raw as Record<string, unknown>;
  const allowed = new Set([
    "expenseObligationId",
    "contributorOwnerId",
    "amountCents",
    "paymentMethod",
    "actualPaidAt",
    "commissionerNote",
    "confirmed",
    "idempotencyKey",
  ]);
  const unsupported = Object.keys(input).find((key) => !allowed.has(key));
  if (unsupported) throw new Error(`Unsupported contribution field: ${unsupported}.`);
  if (input.confirmed !== true) throw new Error("Explicit contribution confirmation is required.");
  if (typeof input.expenseObligationId !== "string") throw new Error("Expense obligation ID is required.");
  if (typeof input.paymentMethod !== "string" || !EXPENSE_METHODS.has(input.paymentMethod as OperationalFinancePaymentMethod)) {
    throw new Error("Contribution method must be venmo, card, cash, or other.");
  }
  const snapshot = await repository.getSnapshot();
  const expense = snapshot.obligations.find(
    (entry) => entry.obligationId === input.expenseObligationId && entry.category === "auctioneer-food" && entry.fundingSource === "separately-funded"
  );
  if (!expense) throw new Error("Separately funded auctioneer-food expense was not found.");
  if (snapshot.reversals.some((entry) => entry.targetType === "obligation" && entry.targetId === expense.obligationId)) {
    throw new Error("A reversed expense cannot receive contributions.");
  }
  let contributorOwnerId: string | null = null;
  let contributorFranchiseId: string | null = null;
  if (input.contributorOwnerId !== undefined && input.contributorOwnerId !== null && input.contributorOwnerId !== "") {
    if (typeof input.contributorOwnerId !== "string") throw new Error("Contributor owner ID must be text.");
    const mapping = OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.find(
      (entry) => entry.financialOwnerId === input.contributorOwnerId
    );
    if (!mapping) throw new Error("Contributor must be a canonical 2026 financial owner.");
    contributorOwnerId = mapping.financialOwnerId;
    contributorFranchiseId = mapping.franchiseId;
  }
  return recordSettlement(
    repository,
    {
      season: 2026,
      obligationId: expense.obligationId,
      direction: "incoming-separate-contribution",
      amountCents: cents(input.amountCents, "Contribution amount"),
      paymentMethod: input.paymentMethod as OperationalFinancePaymentMethod,
      actualPaidAt: optionalTimestamp(input.actualPaidAt),
      commissionerNote: optionalNote(input.commissionerNote),
      contributorOwnerId,
      contributorFranchiseId,
      sourceRef: "commissioner-dashboard:2026:separate-contribution",
    },
    actor,
    idempotency(input.idempotencyKey, "contribution"),
    recordedAt
  );
}
