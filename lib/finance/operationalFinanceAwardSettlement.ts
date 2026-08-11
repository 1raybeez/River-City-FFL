import { recordSettlement } from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceActor,
  OperationalFinanceLedgerRepository,
} from "@/lib/finance/operationalFinanceLedgerTypes";

const AWARD_CATEGORIES = new Set([
  "weekly-high-score",
  "division-winner",
  "third-place",
  "runner-up",
  "champion",
]);

export type CommissionerAwardSettlementRequest = Readonly<{
  amountCents: number | null;
  paymentMethod: "venmo";
  actualPaidAt: string | null;
  commissionerNote: string | null;
  idempotencyKey: string;
}>;

const ALLOWED_FIELDS = new Set([
  "amountCents",
  "paymentMethod",
  "actualPaidAt",
  "commissionerNote",
  "idempotencyKey",
]);

function optionalText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized || null;
}

export function parseCommissionerAwardSettlementRequest(
  input: unknown
): CommissionerAwardSettlementRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("An award payment request object is required.");
  }
  const record = input as Record<string, unknown>;
  const unsupported = Object.keys(record).find((key) => !ALLOWED_FIELDS.has(key));
  if (unsupported) throw new Error(`Unsupported award payment field: ${unsupported}.`);
  if (record.paymentMethod !== "venmo") {
    throw new Error("Venmo is the only approved operational payment method.");
  }
  let amountCents: number | null = null;
  if (record.amountCents !== undefined && record.amountCents !== null) {
    if (!Number.isSafeInteger(record.amountCents) || Number(record.amountCents) <= 0) {
      throw new Error("Award payment amount must be a positive integer number of cents.");
    }
    amountCents = Number(record.amountCents);
  }
  if (
    typeof record.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9:._-]{8,240}$/.test(record.idempotencyKey)
  ) {
    throw new Error("A valid award-payment idempotency key is required.");
  }
  let actualPaidAt: string | null = null;
  if (record.actualPaidAt !== undefined && record.actualPaidAt !== null && record.actualPaidAt !== "") {
    if (typeof record.actualPaidAt !== "string") {
      throw new Error("Actual payment date must be an ISO timestamp or null.");
    }
    const parsed = new Date(record.actualPaidAt);
    if (Number.isNaN(parsed.getTime())) throw new Error("Actual payment date is invalid.");
    actualPaidAt = parsed.toISOString();
  }
  return {
    amountCents,
    paymentMethod: "venmo",
    actualPaidAt,
    commissionerNote: optionalText(record.commissionerNote, "Commissioner note", 500),
    idempotencyKey: record.idempotencyKey,
  };
}

function requireCommissioner(actor: OperationalFinanceActor) {
  if (actor.role !== "commissioner" || !actor.actorId.trim()) {
    throw new Error("Commissioner authorization is required for award payment.");
  }
}

export async function recordCommissionerAwardSettlement(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  obligationId: string,
  rawRequest: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string
) {
  requireCommissioner(actor);
  if (season !== 2026) throw new Error("Award payment recording currently supports 2026 only.");
  if (!obligationId.trim()) throw new Error("Award obligation ID is required.");
  const request = parseCommissionerAwardSettlementRequest(rawRequest);
  const snapshot = await repository.getSnapshot();
  const obligation = snapshot.obligations.find(
    (entry) => entry.season === season && entry.obligationId === obligationId
  );
  if (!obligation) throw new Error("Approved award obligation was not found.");
  if (!AWARD_CATEGORIES.has(obligation.category) || !obligation.proposalKey) {
    throw new Error("Only an approved award obligation may receive an award payment.");
  }
  if (
    snapshot.reversals.some(
      (entry) => entry.targetType === "obligation" && entry.targetId === obligationId
    )
  ) {
    throw new Error("A reversed award obligation cannot receive payment.");
  }

  const idempotency = snapshot.idempotencyRecords.find(
    (entry) => entry.idempotencyKey === request.idempotencyKey
  );
  if (idempotency) {
    if (idempotency.operation !== "award-settlement-recorded") {
      throw new Error("Idempotency key was already used for a different operation.");
    }
    const existing = snapshot.settlements.find(
      (entry) => entry.settlementId === idempotency.targetId
    );
    if (
      !existing ||
      existing.obligationId !== obligationId ||
      existing.direction !== "outgoing-award" ||
      (request.amountCents !== null && existing.amountCents !== request.amountCents) ||
      existing.paymentMethod !== request.paymentMethod ||
      existing.actualPaidAt !== request.actualPaidAt ||
      existing.commissionerNote !== request.commissionerNote
    ) {
      throw new Error("Idempotency key was already used for a different award payment request.");
    }
    return { created: false, settlement: existing } as const;
  }

  const reversedSettlements = new Set(
    snapshot.reversals
      .filter((entry) => entry.targetType === "settlement")
      .map((entry) => entry.targetId)
  );
  const settledCents = snapshot.settlements
    .filter(
      (entry) =>
        entry.obligationId === obligationId &&
        entry.direction === "outgoing-award" &&
        !reversedSettlements.has(entry.settlementId)
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const remainingCents = obligation.amountCents - settledCents;
  if (remainingCents <= 0) throw new Error("This award is already fully paid.");
  const amountCents = request.amountCents ?? remainingCents;
  if (amountCents > remainingCents) {
    throw new Error("Award payment cannot exceed the remaining balance.");
  }

  const result = await recordSettlement(
    repository,
    {
      season: 2026,
      obligationId,
      direction: "outgoing-award",
      amountCents,
      paymentMethod: "venmo",
      actualPaidAt: request.actualPaidAt,
      commissionerNote: request.commissionerNote,
      sourceRef: "commissioner-dashboard:2026:award-payment",
    },
    actor,
    request.idempotencyKey,
    recordedAt
  );
  return { created: result.created, settlement: result.value } as const;
}
