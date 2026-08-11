import type {
  OperationalFinancePaymentContact,
  OperationalFinancePaymentContactAuditEvent,
  OperationalFinancePaymentContactIdempotency,
  OperationalFinancePaymentContactRepository,
  OperationalFinancePaymentContactRevision,
  OperationalFinancePaymentContactSnapshot,
  OperationalFinancePaymentContactTransaction,
} from "@/lib/finance/operationalFinancePaymentContacts";

type State = {
  contacts: Map<string, OperationalFinancePaymentContact>;
  revisions: Map<string, OperationalFinancePaymentContactRevision>;
  auditEvents: Map<string, OperationalFinancePaymentContactAuditEvent>;
  idempotency: Map<string, OperationalFinancePaymentContactIdempotency>;
};

const clone = <T>(value: T): T => structuredClone(value);
const key = (ownerId: string, value: string) => `${ownerId}:${value}`;

function copyState(state: State): State {
  return {
    contacts: new Map([...state.contacts].map(([id, value]) => [id, clone(value)])),
    revisions: new Map([...state.revisions].map(([id, value]) => [id, clone(value)])),
    auditEvents: new Map([...state.auditEvents].map(([id, value]) => [id, clone(value)])),
    idempotency: new Map([...state.idempotency].map(([id, value]) => [id, clone(value)])),
  };
}

function transactionFor(state: State): OperationalFinancePaymentContactTransaction {
  return {
    async getContact(ownerId) {
      return clone(state.contacts.get(ownerId) ?? null);
    },
    async getIdempotency(ownerId, idempotencyKey) {
      return clone(state.idempotency.get(key(ownerId, idempotencyKey)) ?? null);
    },
    async putCurrent(value) {
      state.contacts.set(value.ownerId, clone(value));
    },
    async putRevision(value) {
      if (state.revisions.has(value.revisionId)) throw new Error("Contact revision already exists.");
      state.revisions.set(value.revisionId, clone(value));
    },
    async putAuditEvent(value) {
      if (state.auditEvents.has(value.eventId)) throw new Error("Contact audit event already exists.");
      state.auditEvents.set(value.eventId, clone(value));
    },
    async putIdempotency(value) {
      const id = key(value.ownerId, value.idempotencyKey);
      if (state.idempotency.has(id)) throw new Error("Contact idempotency record already exists.");
      state.idempotency.set(id, clone(value));
    },
  };
}

export class InMemoryOperationalFinancePaymentContactRepository
  implements OperationalFinancePaymentContactRepository
{
  private state: State = {
    contacts: new Map(),
    revisions: new Map(),
    auditEvents: new Map(),
    idempotency: new Map(),
  };

  async runTransaction<T>(
    operation: (transaction: OperationalFinancePaymentContactTransaction) => Promise<T>
  ) {
    const working = copyState(this.state);
    const result = await operation(transactionFor(working));
    this.state = working;
    return clone(result);
  }

  async getSnapshot(): Promise<OperationalFinancePaymentContactSnapshot> {
    return clone({
      contacts: [...this.state.contacts.values()],
      revisions: [...this.state.revisions.values()],
      auditEvents: [...this.state.auditEvents.values()],
      idempotencyRecords: [...this.state.idempotency.values()],
    });
  }
}
