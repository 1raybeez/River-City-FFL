import type { Firestore, Transaction } from "firebase-admin/firestore";

import { firestore } from "@/lib/firebaseAdmin";
import {
  OPERATIONAL_FINANCE_PAYMENT_CONTACTS_COLLECTION,
  type OperationalFinancePaymentContact,
  type OperationalFinancePaymentContactAuditEvent,
  type OperationalFinancePaymentContactIdempotency,
  type OperationalFinancePaymentContactRepository,
  type OperationalFinancePaymentContactRevision,
  type OperationalFinancePaymentContactSnapshot,
  type OperationalFinancePaymentContactTransaction,
} from "@/lib/finance/operationalFinancePaymentContacts";

type PrivateContactRecord =
  | OperationalFinancePaymentContact
  | OperationalFinancePaymentContactRevision
  | OperationalFinancePaymentContactAuditEvent
  | OperationalFinancePaymentContactIdempotency;

const SUBCOLLECTIONS = {
  revisions: "revisions",
  auditEvents: "audit_events",
  idempotency: "idempotency",
} as const;

const clone = <T>(value: T): T => structuredClone(value);

function adapterFor(database: Firestore, transaction: Transaction) {
  const root = database.collection(OPERATIONAL_FINANCE_PAYMENT_CONTACTS_COLLECTION);
  const current = new Map<string, OperationalFinancePaymentContact>();
  const additions = new Map<string, Map<string, PrivateContactRecord>>();
  const collectionAdditions = (ownerId: string) => {
    const existing = additions.get(ownerId);
    if (existing) return existing;
    const created = new Map<string, PrivateContactRecord>();
    additions.set(ownerId, created);
    return created;
  };
  const queue = (ownerId: string, path: string, value: PrivateContactRecord) => {
    const records = collectionAdditions(ownerId);
    if (records.has(path)) throw new Error(`Private payment-contact record ${path} is already queued.`);
    records.set(path, clone(value));
  };

  const adapter: OperationalFinancePaymentContactTransaction = {
    async getContact(ownerId) {
      const queued = current.get(ownerId);
      if (queued) return clone(queued);
      const snapshot = await transaction.get(root.doc(ownerId));
      return snapshot.exists
        ? clone(snapshot.data() as OperationalFinancePaymentContact)
        : null;
    },
    async getIdempotency(ownerId, key) {
      const path = `${SUBCOLLECTIONS.idempotency}/${key}`;
      const queued = additions.get(ownerId)?.get(path);
      if (queued) return clone(queued as OperationalFinancePaymentContactIdempotency);
      const snapshot = await transaction.get(
        root.doc(ownerId).collection(SUBCOLLECTIONS.idempotency).doc(key)
      );
      return snapshot.exists
        ? clone(snapshot.data() as OperationalFinancePaymentContactIdempotency)
        : null;
    },
    async putCurrent(value) {
      current.set(value.ownerId, clone(value));
    },
    async putRevision(value) {
      queue(value.ownerId, `${SUBCOLLECTIONS.revisions}/${value.revisionId}`, value);
    },
    async putAuditEvent(value) {
      queue(value.ownerId, `${SUBCOLLECTIONS.auditEvents}/${value.eventId}`, value);
    },
    async putIdempotency(value) {
      queue(value.ownerId, `${SUBCOLLECTIONS.idempotency}/${value.idempotencyKey}`, value);
    },
  };

  return {
    adapter,
    flush() {
      current.forEach((value, ownerId) => transaction.set(root.doc(ownerId), clone(value)));
      additions.forEach((records, ownerId) => {
        records.forEach((value, path) => {
          const [collectionName, documentId] = path.split("/");
          transaction.create(
            root.doc(ownerId).collection(collectionName).doc(documentId),
            clone(value)
          );
        });
      });
    },
  };
}

export class FirestoreOperationalFinancePaymentContactRepository
  implements OperationalFinancePaymentContactRepository
{
  constructor(private readonly database: Firestore) {}

  async runTransaction<T>(
    operation: (transaction: OperationalFinancePaymentContactTransaction) => Promise<T>
  ) {
    return this.database.runTransaction(async (transaction) => {
      const buffered = adapterFor(this.database, transaction);
      const result = await operation(buffered.adapter);
      buffered.flush();
      return result;
    });
  }

  async getSnapshot(): Promise<OperationalFinancePaymentContactSnapshot> {
    const root = await this.database
      .collection(OPERATIONAL_FINANCE_PAYMENT_CONTACTS_COLLECTION)
      .get();
    const contacts = root.docs.map(
      (entry) => entry.data() as OperationalFinancePaymentContact
    );
    const nested = await Promise.all(
      root.docs.map(async (document) => {
        const [revisions, auditEvents, idempotencyRecords] = await Promise.all([
          document.ref.collection(SUBCOLLECTIONS.revisions).get(),
          document.ref.collection(SUBCOLLECTIONS.auditEvents).get(),
          document.ref.collection(SUBCOLLECTIONS.idempotency).get(),
        ]);
        return {
          revisions: revisions.docs.map(
            (entry) => entry.data() as OperationalFinancePaymentContactRevision
          ),
          auditEvents: auditEvents.docs.map(
            (entry) => entry.data() as OperationalFinancePaymentContactAuditEvent
          ),
          idempotencyRecords: idempotencyRecords.docs.map(
            (entry) => entry.data() as OperationalFinancePaymentContactIdempotency
          ),
        };
      })
    );
    return clone({
      contacts,
      revisions: nested.flatMap((entry) => entry.revisions),
      auditEvents: nested.flatMap((entry) => entry.auditEvents),
      idempotencyRecords: nested.flatMap((entry) => entry.idempotencyRecords),
    });
  }
}

export function getOperationalFinancePaymentContactRepository() {
  return new FirestoreOperationalFinancePaymentContactRepository(firestore);
}
