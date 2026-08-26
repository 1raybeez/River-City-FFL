import {
  buildOperationalFinanceDashboardPresentation,
  type OperationalFinanceDashboardPresentation,
} from "@/lib/finance/operationalFinanceDashboardPresentation";
import { deriveDuesStatus, recordSettlement, reverseSettlement } from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceActor,
  OperationalFinanceLedgerRepository,
  OperationalFinanceSettlement,
} from "@/lib/finance/operationalFinanceLedgerTypes";

export type CommissionerDuesPaymentRequest = Readonly<{
  obligationId: string;
  amountCents: number;
  actualPaidAt: string | null;
  commissionerNote: string | null;
  idempotencyKey: string;
}>;

export type CommissionerDuesPaymentResult = Readonly<{
  created: boolean;
  settlement: OperationalFinanceSettlement;
  dashboard: OperationalFinanceDashboardPresentation;
}>;

export type CommissionerDuesPaymentReversalRequest = Readonly<{
  obligationId: string;
  settlementId: string;
  reason: string;
  idempotencyKey: string;
}>;

export type CommissionerDuesPaymentReversalResult = Readonly<{
  created: boolean;
  reversalId: string;
  dashboard: OperationalFinanceDashboardPresentation;
}>;

const ALLOWED_PAYMENT_FIELDS = new Set([
  "obligationId",
  "amountCents",
  "actualPaidAt",
  "commissionerNote",
  "idempotencyKey",
]);

const ALLOWED_PAYMENT_REVERSAL_FIELDS = new Set([
  "obligationId",
  "settlementId",
  "reason",
  "idempotencyKey",
]);

function readOptionalText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized || null;
}

export function parseCommissionerDuesPaymentRequest(
  input: unknown
): CommissionerDuesPaymentRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A payment request object is required.");
  }
  const record = input as Record<string, unknown>;
  const unsupported = Object.keys(record).filter(
    (key) => !ALLOWED_PAYMENT_FIELDS.has(key)
  );
  if (unsupported.length > 0) {
    throw new Error(`Unsupported payment field: ${unsupported[0]}.`);
  }
  if (typeof record.obligationId !== "string" || !record.obligationId.trim()) {
    throw new Error("Obligation ID is required.");
  }
  if (!Number.isSafeInteger(record.amountCents) || Number(record.amountCents) <= 0) {
    throw new Error("Payment amount must be a positive integer number of cents.");
  }
  if (
    typeof record.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9:._-]{8,240}$/.test(record.idempotencyKey)
  ) {
    throw new Error("A valid payment idempotency key is required.");
  }

  let actualPaidAt: string | null = null;
  if (record.actualPaidAt !== undefined && record.actualPaidAt !== null && record.actualPaidAt !== "") {
    if (typeof record.actualPaidAt !== "string") {
      throw new Error("Actual payment date must be an ISO timestamp or null.");
    }
    const timestamp = new Date(record.actualPaidAt);
    if (Number.isNaN(timestamp.getTime())) {
      throw new Error("Actual payment date must be a valid ISO timestamp.");
    }
    actualPaidAt = timestamp.toISOString();
  }

  return {
    obligationId: record.obligationId.trim(),
    amountCents: Number(record.amountCents),
    actualPaidAt,
    commissionerNote: readOptionalText(
      record.commissionerNote,
      "Commissioner note",
      500
    ),
    idempotencyKey: record.idempotencyKey,
  };
}

export function assertCommissionerFinanceActor(actor: OperationalFinanceActor) {
  if (actor.role !== "commissioner" || !actor.actorId.trim()) {
    throw new Error("Commissioner authorization is required.");
  }
}

export function parseCommissionerDuesPaymentReversalRequest(
  input: unknown
): CommissionerDuesPaymentReversalRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("A payment reversal request object is required.");
  }
  const record = input as Record<string, unknown>;
  const unsupported = Object.keys(record).filter(
    (key) => !ALLOWED_PAYMENT_REVERSAL_FIELDS.has(key)
  );
  if (unsupported.length > 0) {
    throw new Error(`Unsupported payment reversal field: ${unsupported[0]}.`);
  }
  for (const field of ["obligationId", "settlementId", "reason", "idempotencyKey"] as const) {
    if (typeof record[field] !== "string" || !record[field].trim()) {
      throw new Error(`${field} is required.`);
    }
  }
  const reason = (record.reason as string).trim();
  if (reason.length > 500) throw new Error("Reversal reason must be 500 characters or fewer.");
  if (!/^[a-zA-Z0-9:._-]{8,240}$/.test(record.idempotencyKey as string)) {
    throw new Error("A valid payment reversal idempotency key is required.");
  }
  return {
    obligationId: (record.obligationId as string).trim(),
    settlementId: (record.settlementId as string).trim(),
    reason,
    idempotencyKey: record.idempotencyKey as string,
  };
}

export async function loadOperationalFinanceDashboard(
  repository: OperationalFinanceLedgerRepository,
  season: number
) {
  return buildOperationalFinanceDashboardPresentation(
    await repository.getSnapshot(),
    season
  );
}

export async function recordCommissionerDuesPayment(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  rawRequest: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
): Promise<CommissionerDuesPaymentResult> {
  assertCommissionerFinanceActor(actor);
  if (season !== 2026) {
    throw new Error("Dues payment recording currently supports 2026 only.");
  }
  const request = parseCommissionerDuesPaymentRequest(rawRequest);
  const snapshot = await repository.getSnapshot();
  const obligation = snapshot.obligations.find(
    (entry) => entry.obligationId === request.obligationId && entry.season === season
  );
  if (!obligation) throw new Error("Dues obligation was not found.");
  if (obligation.category !== "dues-assessment") {
    throw new Error("Only an active dues assessment may receive this payment.");
  }
  if (
    snapshot.reversals.some(
      (entry) =>
        entry.season === season &&
        entry.targetType === "obligation" &&
        entry.targetId === obligation.obligationId
    )
  ) {
    throw new Error("A reversed dues assessment cannot receive payment.");
  }
  const isIdempotentRetry = snapshot.idempotencyRecords.some(
    (entry) =>
      entry.season === season &&
      entry.idempotencyKey === request.idempotencyKey &&
      entry.operation === "settlement-created"
  );
  if (!isIdempotentRetry) {
    const status = deriveDuesStatus(
      snapshot.obligations.filter((entry) => entry.season === season),
      snapshot.settlements.filter((entry) => entry.season === season),
      snapshot.reversals.filter((entry) => entry.season === season)
    ).find((entry) => entry.obligationId === obligation.obligationId);
    if (!status) throw new Error("Active dues status could not be derived.");
    if (request.amountCents > status.outstandingCents) {
      throw new Error("Payment amount cannot exceed the remaining dues balance.");
    }
  }

  const mutation = await recordSettlement(
    repository,
    {
      season: 2026,
      obligationId: obligation.obligationId,
      direction: "incoming-dues",
      amountCents: request.amountCents,
      paymentMethod: "venmo",
      actualPaidAt: request.actualPaidAt,
      commissionerNote: request.commissionerNote,
      sourceRef: "commissioner-dashboard:2026:dues-payment",
    },
    actor,
    request.idempotencyKey,
    recordedAt
  );

  return {
    created: mutation.created,
    settlement: mutation.value,
    dashboard: await loadOperationalFinanceDashboard(repository, season),
  };
}

export async function reverseCommissionerDuesPayment(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  rawRequest: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
): Promise<CommissionerDuesPaymentReversalResult> {
  assertCommissionerFinanceActor(actor);
  if (season !== 2026) {
    throw new Error("Dues payment reversals currently support 2026 only.");
  }
  const request = parseCommissionerDuesPaymentReversalRequest(rawRequest);
  const snapshot = await repository.getSnapshot();
  const obligation = snapshot.obligations.find(
    (entry) => entry.obligationId === request.obligationId && entry.season === season
  );
  if (!obligation || obligation.category !== "dues-assessment") {
    throw new Error("Dues obligation was not found.");
  }
  const settlement = snapshot.settlements.find(
    (entry) =>
      entry.settlementId === request.settlementId &&
      entry.season === season &&
      entry.obligationId === obligation.obligationId &&
      entry.direction === "incoming-dues"
  );
  if (!settlement) throw new Error("Dues payment was not found for this obligation.");

  const mutation = await reverseSettlement(
    repository,
    season,
    settlement.settlementId,
    request.reason,
    actor,
    request.idempotencyKey,
    recordedAt
  );
  return {
    created: mutation.created,
    reversalId: mutation.value.reversalId,
    dashboard: await loadOperationalFinanceDashboard(repository, season),
  };
}
