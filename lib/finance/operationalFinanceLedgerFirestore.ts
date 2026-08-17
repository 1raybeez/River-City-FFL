import type {
  Firestore,
  Transaction,
} from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";
import { OPERATIONAL_FINANCE_COLLECTION } from "@/lib/finance/operationalFinanceLedger";
import {
  getDuesStatus as deriveDuesStatusFromRepository,
  getOperationalFinanceTotals as deriveTotalsFromRepository,
} from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceAuditEvent,
  OperationalFinanceAdjustment,
  OperationalFinanceArchive,
  OperationalFinanceIdempotencyRecord,
  OperationalFinanceLedgerRepository,
  OperationalFinanceLedgerSnapshot,
  OperationalFinanceLedgerTransaction,
  OperationalFinanceMigrationRecord,
  OperationalFinanceObligation,
  OperationalFinanceReversal,
  OperationalFinanceSeasonLedger,
  OperationalFinanceSettlement,
} from "@/lib/finance/operationalFinanceLedgerTypes";

type LedgerRecord =
  | OperationalFinanceSeasonLedger
  | OperationalFinanceObligation
  | OperationalFinanceSettlement
  | OperationalFinanceReversal
  | OperationalFinanceAdjustment
  | OperationalFinanceAuditEvent
  | OperationalFinanceMigrationRecord
  | OperationalFinanceIdempotencyRecord
  | OperationalFinanceArchive;


const SUBCOLLECTIONS = {
  obligations: "obligations",
  settlements: "settlements",
  reversals: "reversals",
  adjustments: "adjustments",
  auditEvents: "audit_events",
  reconciliation: "reconciliation",
  migrationRecords: "migration_records",
  idempotency: "idempotency",
} as const;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function seasonFromLedgerId(id: string) {
  const value = Number(id.split(":")[1]);
  if (!Number.isInteger(value)) throw new Error(`Cannot derive season from ledger ID ${id}.`);
  return value;
}

function transactionAdapter(
  database: Firestore,
  transaction: Transaction,
  season: number
) {
  const seasonRef = database.collection(OPERATIONAL_FINANCE_COLLECTION).doc(String(season));
  const collection = (name: string) => seasonRef.collection(name);
  const pending = new Map<string, Map<string, LedgerRecord>>();
  let pendingSeason: OperationalFinanceSeasonLedger | null = null;
  let pendingSeasonUpdate: OperationalFinanceSeasonLedger | null = null;
  const pendingCollection = (name: string) => {
    const existing = pending.get(name);
    if (existing) return existing;
    const created = new Map<string, LedgerRecord>();
    pending.set(name, created);
    return created;
  };
  const readAll = async <T>(name: string) => {
    const persisted = (await transaction.get(collection(name))).docs.map(
      (document) => clone(document.data() as T)
    );
    const additions = [...(pending.get(name)?.values() ?? [])].map(
      (value) => clone(value as T)
    );
    return [...persisted, ...additions];
  };
  const create = async (name: string, id: string, value: LedgerRecord) => {
    const values = pendingCollection(name);
    if (values.has(id)) throw new Error(`Pending ledger document ${name}/${id} already exists.`);
    values.set(id, clone(value));
  };

  const adapter: OperationalFinanceLedgerTransaction = {
    async getSeason(requestedSeason) {
      if (requestedSeason !== season) return null;
      if (pendingSeason) return clone(pendingSeason);
      const snapshot = await transaction.get(seasonRef);
      return snapshot.exists
        ? clone(snapshot.data() as OperationalFinanceSeasonLedger)
        : null;
    },
    async getObligation(id) {
      const queued = pending.get(SUBCOLLECTIONS.obligations)?.get(id);
      if (queued) return clone(queued as OperationalFinanceObligation);
      const snapshot = await transaction.get(collection(SUBCOLLECTIONS.obligations).doc(id));
      return snapshot.exists ? clone(snapshot.data() as OperationalFinanceObligation) : null;
    },
    async getSettlement(id) {
      const queued = pending.get(SUBCOLLECTIONS.settlements)?.get(id);
      if (queued) return clone(queued as OperationalFinanceSettlement);
      const snapshot = await transaction.get(collection(SUBCOLLECTIONS.settlements).doc(id));
      return snapshot.exists ? clone(snapshot.data() as OperationalFinanceSettlement) : null;
    },
    async getMigrationRecord(id) {
      const queued = pending.get(SUBCOLLECTIONS.migrationRecords)?.get(id);
      if (queued) return clone(queued as OperationalFinanceMigrationRecord);
      const snapshot = await transaction.get(collection(SUBCOLLECTIONS.migrationRecords).doc(id));
      return snapshot.exists ? clone(snapshot.data() as OperationalFinanceMigrationRecord) : null;
    },
    async getIdempotency(key) {
      const queued = pending.get(SUBCOLLECTIONS.idempotency)?.get(key);
      if (queued) return clone(queued as OperationalFinanceIdempotencyRecord);
      const snapshot = await transaction.get(collection(SUBCOLLECTIONS.idempotency).doc(key));
      return snapshot.exists ? clone(snapshot.data() as OperationalFinanceIdempotencyRecord) : null;
    },
    async getArchive(requestedSeason) {
      if (requestedSeason !== season) return null;
      const queued = pending.get("archive")?.get("closed");
      if (queued) return clone(queued as OperationalFinanceArchive);
      const snapshot = await transaction.get(seasonRef.collection("archives").doc("closed"));
      return snapshot.exists ? clone(snapshot.data() as OperationalFinanceArchive) : null;
    },
    async getAllObligations(requestedSeason) {
      return requestedSeason === season
        ? readAll<OperationalFinanceObligation>(SUBCOLLECTIONS.obligations)
        : [];
    },
    async getAllSettlements(requestedSeason) {
      return requestedSeason === season
        ? readAll<OperationalFinanceSettlement>(SUBCOLLECTIONS.settlements)
        : [];
    },
    async getAllReversals(requestedSeason) {
      return requestedSeason === season
        ? readAll<OperationalFinanceReversal>(SUBCOLLECTIONS.reversals)
        : [];
    },
    async getAllAdjustments(requestedSeason) {
      return requestedSeason === season
        ? readAll<OperationalFinanceAdjustment>(SUBCOLLECTIONS.adjustments)
        : [];
    },
    async putSeason(value) {
      if (pendingSeason) throw new Error(`Season ${value.season} is already queued.`);
      pendingSeason = clone(value);
    },
    async updateSeason(value) {
      if (pendingSeason || pendingSeasonUpdate) throw new Error(`Season ${value.season} has already been queued.`);
      pendingSeasonUpdate = clone(value);
    },
    async putObligation(value) {
      await create(SUBCOLLECTIONS.obligations, value.obligationId, value);
    },
    async putSettlement(value) {
      await create(SUBCOLLECTIONS.settlements, value.settlementId, value);
    },
    async putReversal(value) {
      await create(SUBCOLLECTIONS.reversals, value.reversalId, value);
    },
    async putAdjustment(value) {
      await create(SUBCOLLECTIONS.adjustments, value.adjustmentId, value);
    },
    async putAuditEvent(value) {
      await create(SUBCOLLECTIONS.auditEvents, value.eventId, value);
    },
    async putMigrationRecord(value) {
      await create(SUBCOLLECTIONS.migrationRecords, value.migrationId, value);
    },
    async putIdempotency(value) {
      await create(SUBCOLLECTIONS.idempotency, value.idempotencyKey, value);
    },
    async putArchive(value) {
      await create("archive", "closed", value);
    },
  };

  return {
    adapter,
    flush() {
      if (pendingSeason) transaction.create(seasonRef, clone(pendingSeason));
      if (pendingSeasonUpdate) transaction.update(seasonRef, clone(pendingSeasonUpdate) as never);
      pending.forEach((values, name) =>
        values.forEach((value, id) => {
          const ref = name === "archive"
            ? seasonRef.collection("archives").doc(id)
            : collection(name).doc(id);
          transaction.create(ref, clone(value));
        })
      );
    },
  };
}

export class FirestoreOperationalFinanceLedgerRepository
  implements OperationalFinanceLedgerRepository
{
  constructor(
    private readonly database: Firestore,
    private readonly season: number
  ) {}

  async runTransaction<T>(
    operation: (transaction: OperationalFinanceLedgerTransaction) => Promise<T>
  ) {
    return this.database.runTransaction(async (transaction) => {
      const buffered = transactionAdapter(this.database, transaction, this.season);
      const result = await operation(buffered.adapter);
      buffered.flush();
      return result;
    });
  }

  async getSnapshot(): Promise<OperationalFinanceLedgerSnapshot> {
    const seasonRef = this.database
      .collection(OPERATIONAL_FINANCE_COLLECTION)
      .doc(String(this.season));
    const [season, obligations, settlements, reversals, adjustments, auditEvents, migrationRecords, idempotencyRecords] =
      await Promise.all([
        seasonRef.get(),
        seasonRef.collection(SUBCOLLECTIONS.obligations).get(),
        seasonRef.collection(SUBCOLLECTIONS.settlements).get(),
        seasonRef.collection(SUBCOLLECTIONS.reversals).get(),
        seasonRef.collection(SUBCOLLECTIONS.adjustments).get(),
        seasonRef.collection(SUBCOLLECTIONS.auditEvents).get(),
        seasonRef.collection(SUBCOLLECTIONS.migrationRecords).get(),
        seasonRef.collection(SUBCOLLECTIONS.idempotency).get(),
      ]);
    return clone({
      seasons: season.exists ? [season.data() as OperationalFinanceSeasonLedger] : [],
      obligations: obligations.docs.map((entry) => entry.data() as OperationalFinanceObligation),
      settlements: settlements.docs.map((entry) => entry.data() as OperationalFinanceSettlement),
      reversals: reversals.docs.map((entry) => entry.data() as OperationalFinanceReversal),
      adjustments: adjustments.docs.map((entry) => entry.data() as OperationalFinanceAdjustment),
      auditEvents: auditEvents.docs.map((entry) => entry.data() as OperationalFinanceAuditEvent),
      migrationRecords: migrationRecords.docs.map((entry) => entry.data() as OperationalFinanceMigrationRecord),
      idempotencyRecords: idempotencyRecords.docs.map((entry) => entry.data() as OperationalFinanceIdempotencyRecord),
    });
  }

  async getArchive(season: number) {
    if (season !== this.season) return null;
    const snapshot = await this.database
      .collection(OPERATIONAL_FINANCE_COLLECTION)
      .doc(String(season))
      .collection("archives")
      .doc("closed")
      .get();
    return snapshot.exists ? clone(snapshot.data() as OperationalFinanceArchive) : null;
  }
}

export function getOperationalFinanceLedgerRepository(season: number) {
  return new FirestoreOperationalFinanceLedgerRepository(firestore, season);
}

export async function getOperationalFinanceSeason(season: number) {
  return (await getOperationalFinanceLedgerRepository(season).getSnapshot()).seasons[0] ?? null;
}

export async function getObligation(obligationId: string) {
  const snapshot = await getOperationalFinanceLedgerRepository(seasonFromLedgerId(obligationId)).getSnapshot();
  return snapshot.obligations.find((entry) => entry.obligationId === obligationId) ?? null;
}

export async function getAllObligations(season: number) {
  return (await getOperationalFinanceLedgerRepository(season).getSnapshot()).obligations;
}

export async function getSettlementsForObligation(obligationId: string) {
  const snapshot = await getOperationalFinanceLedgerRepository(seasonFromLedgerId(obligationId)).getSnapshot();
  return snapshot.settlements.filter((entry) => entry.obligationId === obligationId);
}

export async function getAllSettlements(season: number) {
  return (await getOperationalFinanceLedgerRepository(season).getSnapshot()).settlements;
}

export async function getAuditEvents(season: number) {
  return (await getOperationalFinanceLedgerRepository(season).getSnapshot()).auditEvents;
}

export async function getDuesStatus(season: number) {
  return deriveDuesStatusFromRepository(getOperationalFinanceLedgerRepository(season), season);
}

export async function getOperationalFinanceTotals(season: number) {
  return deriveTotalsFromRepository(getOperationalFinanceLedgerRepository(season), season);
}
