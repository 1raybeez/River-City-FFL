import { createHash } from "node:crypto";

import type { OperationalFinanceActor } from "@/lib/finance/operationalFinanceLedgerTypes";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";

export const OPERATIONAL_FINANCE_PAYMENT_CONTACTS_COLLECTION =
  "operational_finance_payment_contacts";

export type OperationalFinancePaymentContactMethod = "venmo";
export type OperationalFinancePaymentContactStatus =
  | "active"
  | "unverified"
  | "inactive";

export type OperationalFinancePaymentContact = Readonly<{
  contactId: string;
  ownerId: string;
  method: OperationalFinancePaymentContactMethod;
  handle: string;
  status: OperationalFinancePaymentContactStatus;
  sourceType: "commissioner-provided";
  verifiedAt: string | null;
  verifiedBy: string | null;
  createdAt: string;
  createdBy: OperationalFinanceActor;
  updatedAt: string;
  updatedBy: OperationalFinanceActor;
  revisionNumber: number;
  notes: string | null;
}>;

export type OperationalFinancePaymentContactRevision = Readonly<{
  revisionId: string;
  contactId: string;
  ownerId: string;
  action: "created" | "updated" | "deactivated";
  method: OperationalFinancePaymentContactMethod;
  handle: string;
  status: OperationalFinancePaymentContactStatus;
  sourceType: "commissioner-provided";
  verifiedAt: string | null;
  verifiedBy: string | null;
  recordedAt: string;
  recordedBy: OperationalFinanceActor;
  revisionNumber: number;
  notes: string | null;
}>;

export type OperationalFinancePaymentContactAuditEvent = Readonly<{
  eventId: string;
  ownerId: string;
  eventType:
    | "payment-contact-created"
    | "payment-contact-updated"
    | "payment-contact-deactivated";
  actorId: string;
  actorRole: OperationalFinanceActor["role"];
  createdAt: string;
  revisionId: string;
  idempotencyKey: string;
  metadata: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type OperationalFinancePaymentContactIdempotency = Readonly<{
  idempotencyKey: string;
  ownerId: string;
  operation: "set" | "deactivate";
  requestHash: string;
  revisionId: string;
  createdAt: string;
}>;

export type OperationalFinancePaymentContactSnapshot = Readonly<{
  contacts: readonly OperationalFinancePaymentContact[];
  revisions: readonly OperationalFinancePaymentContactRevision[];
  auditEvents: readonly OperationalFinancePaymentContactAuditEvent[];
  idempotencyRecords: readonly OperationalFinancePaymentContactIdempotency[];
}>;

export interface OperationalFinancePaymentContactTransaction {
  getContact(ownerId: string): Promise<OperationalFinancePaymentContact | null>;
  getIdempotency(
    ownerId: string,
    key: string
  ): Promise<OperationalFinancePaymentContactIdempotency | null>;
  putCurrent(value: OperationalFinancePaymentContact): Promise<void>;
  putRevision(value: OperationalFinancePaymentContactRevision): Promise<void>;
  putAuditEvent(value: OperationalFinancePaymentContactAuditEvent): Promise<void>;
  putIdempotency(value: OperationalFinancePaymentContactIdempotency): Promise<void>;
}

export interface OperationalFinancePaymentContactRepository {
  runTransaction<T>(
    operation: (
      transaction: OperationalFinancePaymentContactTransaction
    ) => Promise<T>
  ): Promise<T>;
  getSnapshot(): Promise<OperationalFinancePaymentContactSnapshot>;
}

export type SetOperationalFinancePaymentContactInput = Readonly<{
  ownerId: string;
  method: "venmo";
  handle: string;
  status?: "active" | "unverified";
  notes?: string | null;
}>;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function requireAuthorizedActor(actor: OperationalFinanceActor) {
  const commissioner = actor.role === "commissioner" && actor.actorId.trim();
  const migration =
    actor.role === "system" &&
    actor.actorId.startsWith("system:payment-contact-migration:");
  if (!commissioner && !migration) {
    throw new Error("Commissioner authorization is required for payment contacts.");
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:._-]{8,240}$/.test(value)) {
    throw new Error("A valid payment-contact idempotency key is required.");
  }
}

export function isCanonicalOperationalFinancialOwner(ownerId: string) {
  return OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.some(
    (entry) => entry.financialOwnerId === ownerId
  );
}

export function normalizeVenmoHandle(value: string) {
  const normalized = value.trim();
  const withoutAt = normalized.startsWith("@") ? normalized.slice(1) : normalized;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,29}$/.test(withoutAt)) {
    throw new Error(
      "Venmo handle must contain 3–30 letters, numbers, underscores, or hyphens."
    );
  }
  return `@${withoutAt}`;
}

function normalizeNotes(value: string | null | undefined) {
  if (value === undefined || value === null || value.trim() === "") return null;
  const notes = value.trim();
  if (notes.length > 300) throw new Error("Contact notes must be 300 characters or fewer.");
  return notes;
}

function requestHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function contactId(ownerId: string) {
  return `operational-finance-payment-contact:${ownerId}:venmo`;
}

function mutationResult(
  created: boolean,
  contact: OperationalFinancePaymentContact,
  revision: OperationalFinancePaymentContactRevision
) {
  return deepFreeze({ created, contact, revision });
}

export async function setOperationalFinancePaymentContact(
  repository: OperationalFinancePaymentContactRepository,
  input: SetOperationalFinancePaymentContactInput,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireAuthorizedActor(actor);
  validateIdempotencyKey(idempotencyKey);
  if (!isCanonicalOperationalFinancialOwner(input.ownerId)) {
    throw new Error("Payment contact owner must be a canonical 2026 financial owner.");
  }
  if (input.method !== "venmo") {
    throw new Error("Venmo is the only approved operational payment-contact method.");
  }
  const handle = normalizeVenmoHandle(input.handle);
  const status = input.status ?? "unverified";
  const notes = normalizeNotes(input.notes);
  const hash = requestHash({ ownerId: input.ownerId, method: input.method, handle, status, notes });

  return repository.runTransaction(async (transaction) => {
    const duplicate = await transaction.getIdempotency(input.ownerId, idempotencyKey);
    if (duplicate) {
      if (duplicate.operation !== "set" || duplicate.requestHash !== hash) {
        throw new Error("Idempotency key was already used for a different payment-contact request.");
      }
      const existing = await transaction.getContact(input.ownerId);
      if (!existing) {
        throw new Error("Payment-contact idempotency evidence is inconsistent.");
      }
      const revision: OperationalFinancePaymentContactRevision = {
        revisionId: duplicate.revisionId,
        contactId: existing.contactId,
        ownerId: existing.ownerId,
        action: existing.revisionNumber === 1 ? "created" : "updated",
        method: existing.method,
        handle: existing.handle,
        status: existing.status,
        sourceType: existing.sourceType,
        verifiedAt: existing.verifiedAt,
        verifiedBy: existing.verifiedBy,
        recordedAt: existing.updatedAt,
        recordedBy: existing.updatedBy,
        revisionNumber: existing.revisionNumber,
        notes: existing.notes,
      };
      return mutationResult(false, existing, revision);
    }

    const previous = await transaction.getContact(input.ownerId);
    const revisionNumber = (previous?.revisionNumber ?? 0) + 1;
    const id = contactId(input.ownerId);
    const contact: OperationalFinancePaymentContact = {
      contactId: id,
      ownerId: input.ownerId,
      method: "venmo",
      handle,
      status,
      sourceType: "commissioner-provided",
      verifiedAt: null,
      verifiedBy: null,
      createdAt: previous?.createdAt ?? recordedAt,
      createdBy: previous?.createdBy ?? { ...actor },
      updatedAt: recordedAt,
      updatedBy: { ...actor },
      revisionNumber,
      notes,
    };
    const action = previous ? "updated" : "created";
    const revisionId = `${id}:revision:${revisionNumber}`;
    const revision: OperationalFinancePaymentContactRevision = {
      revisionId,
      contactId: id,
      ownerId: input.ownerId,
      action,
      method: "venmo",
      handle,
      status,
      sourceType: "commissioner-provided",
      verifiedAt: null,
      verifiedBy: null,
      recordedAt,
      recordedBy: { ...actor },
      revisionNumber,
      notes,
    };
    const eventType = previous
      ? "payment-contact-updated"
      : "payment-contact-created";
    await transaction.putCurrent(contact);
    await transaction.putRevision(revision);
    await transaction.putAuditEvent({
      eventId: `operational-finance-payment-contact-audit:${idempotencyKey}`,
      ownerId: input.ownerId,
      eventType,
      actorId: actor.actorId,
      actorRole: actor.role,
      createdAt: recordedAt,
      revisionId,
      idempotencyKey,
      metadata: { method: "venmo", status, handleStored: true, revisionNumber },
    });
    await transaction.putIdempotency({
      idempotencyKey,
      ownerId: input.ownerId,
      operation: "set",
      requestHash: hash,
      revisionId,
      createdAt: recordedAt,
    });
    return mutationResult(true, contact, revision);
  });
}

export async function deactivateOperationalFinancePaymentContact(
  repository: OperationalFinancePaymentContactRepository,
  ownerId: string,
  actor: OperationalFinanceActor,
  idempotencyKey: string,
  recordedAt: string
) {
  requireAuthorizedActor(actor);
  validateIdempotencyKey(idempotencyKey);
  if (!isCanonicalOperationalFinancialOwner(ownerId)) {
    throw new Error("Payment contact owner must be a canonical 2026 financial owner.");
  }
  const hash = requestHash({ ownerId, action: "deactivate" });
  return repository.runTransaction(async (transaction) => {
    const duplicate = await transaction.getIdempotency(ownerId, idempotencyKey);
    const previous = await transaction.getContact(ownerId);
    if (duplicate) {
      if (duplicate.operation !== "deactivate" || duplicate.requestHash !== hash) {
        throw new Error("Idempotency key was already used for a different payment-contact request.");
      }
      if (!previous || previous.status !== "inactive") {
        throw new Error("Payment-contact idempotency evidence is inconsistent.");
      }
      const revision: OperationalFinancePaymentContactRevision = {
        revisionId: duplicate.revisionId,
        contactId: previous.contactId,
        ownerId,
        action: "deactivated",
        method: previous.method,
        handle: previous.handle,
        status: "inactive",
        sourceType: previous.sourceType,
        verifiedAt: previous.verifiedAt,
        verifiedBy: previous.verifiedBy,
        recordedAt: previous.updatedAt,
        recordedBy: previous.updatedBy,
        revisionNumber: previous.revisionNumber,
        notes: previous.notes,
      };
      return mutationResult(false, previous, revision);
    }
    if (!previous) throw new Error("Payment contact was not found.");
    if (previous.status === "inactive") throw new Error("Payment contact is already inactive.");
    const revisionNumber = previous.revisionNumber + 1;
    const revisionId = `${previous.contactId}:revision:${revisionNumber}`;
    const contact: OperationalFinancePaymentContact = {
      ...previous,
      status: "inactive",
      updatedAt: recordedAt,
      updatedBy: { ...actor },
      revisionNumber,
    };
    const revision: OperationalFinancePaymentContactRevision = {
      revisionId,
      contactId: previous.contactId,
      ownerId,
      action: "deactivated",
      method: previous.method,
      handle: previous.handle,
      status: "inactive",
      sourceType: previous.sourceType,
      verifiedAt: previous.verifiedAt,
      verifiedBy: previous.verifiedBy,
      recordedAt,
      recordedBy: { ...actor },
      revisionNumber,
      notes: previous.notes,
    };
    await transaction.putCurrent(contact);
    await transaction.putRevision(revision);
    await transaction.putAuditEvent({
      eventId: `operational-finance-payment-contact-audit:${idempotencyKey}`,
      ownerId,
      eventType: "payment-contact-deactivated",
      actorId: actor.actorId,
      actorRole: actor.role,
      createdAt: recordedAt,
      revisionId,
      idempotencyKey,
      metadata: { method: "venmo", status: "inactive", handleStored: true, revisionNumber },
    });
    await transaction.putIdempotency({
      idempotencyKey,
      ownerId,
      operation: "deactivate",
      requestHash: hash,
      revisionId,
      createdAt: recordedAt,
    });
    return mutationResult(true, contact, revision);
  });
}
