import type {
  OperationalFinanceAuditEvent,
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

type MemoryState = {
  seasons: Map<number, OperationalFinanceSeasonLedger>;
  obligations: Map<string, OperationalFinanceObligation>;
  settlements: Map<string, OperationalFinanceSettlement>;
  reversals: Map<string, OperationalFinanceReversal>;
  auditEvents: Map<string, OperationalFinanceAuditEvent>;
  migrationRecords: Map<string, OperationalFinanceMigrationRecord>;
  idempotencyRecords: Map<string, OperationalFinanceIdempotencyRecord>;
  archive: OperationalFinanceArchive | null;
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneState(state: MemoryState): MemoryState {
  return {
    seasons: new Map([...state.seasons].map(([key, value]) => [key, clone(value)])),
    obligations: new Map([...state.obligations].map(([key, value]) => [key, clone(value)])),
    settlements: new Map([...state.settlements].map(([key, value]) => [key, clone(value)])),
    reversals: new Map([...state.reversals].map(([key, value]) => [key, clone(value)])),
    auditEvents: new Map([...state.auditEvents].map(([key, value]) => [key, clone(value)])),
    migrationRecords: new Map([...state.migrationRecords].map(([key, value]) => [key, clone(value)])),
    idempotencyRecords: new Map([...state.idempotencyRecords].map(([key, value]) => [key, clone(value)])),
    archive: clone(state.archive),
  };
}

function putUnique<T>(map: Map<string, T>, key: string, value: T, label: string) {
  if (map.has(key)) throw new Error(`${label} ${key} already exists; ledger records are append-only.`);
  map.set(key, clone(value));
}

function transactionFor(state: MemoryState): OperationalFinanceLedgerTransaction {
  return {
    async getSeason(season) {
      return clone(state.seasons.get(season) ?? null);
    },
    async getObligation(id) {
      return clone(state.obligations.get(id) ?? null);
    },
    async getSettlement(id) {
      return clone(state.settlements.get(id) ?? null);
    },
    async getMigrationRecord(id) {
      return clone(state.migrationRecords.get(id) ?? null);
    },
    async getIdempotency(key) {
      return clone(state.idempotencyRecords.get(key) ?? null);
    },
    async getArchive(season) {
      return season === state.archive?.season ? clone(state.archive) : null;
    },
    async getAllObligations(season) {
      return clone([...state.obligations.values()].filter((entry) => entry.season === season));
    },
    async getAllSettlements(season) {
      return clone([...state.settlements.values()].filter((entry) => entry.season === season));
    },
    async getAllReversals(season) {
      return clone([...state.reversals.values()].filter((entry) => entry.season === season));
    },
    async putSeason(value) {
      if (state.seasons.has(value.season)) throw new Error(`Season ${value.season} already exists.`);
      state.seasons.set(value.season, clone(value));
    },
    async updateSeason(value) {
      if (!state.seasons.has(value.season)) throw new Error(`Season ${value.season} does not exist.`);
      state.seasons.set(value.season, clone(value));
    },
    async putObligation(value) {
      putUnique(state.obligations, value.obligationId, value, "Obligation");
    },
    async putSettlement(value) {
      putUnique(state.settlements, value.settlementId, value, "Settlement");
    },
    async putReversal(value) {
      putUnique(state.reversals, value.reversalId, value, "Reversal");
    },
    async putAuditEvent(value) {
      putUnique(state.auditEvents, value.eventId, value, "Audit event");
    },
    async putMigrationRecord(value) {
      putUnique(state.migrationRecords, value.migrationId, value, "Migration record");
    },
    async putIdempotency(value) {
      putUnique(state.idempotencyRecords, value.idempotencyKey, value, "Idempotency record");
    },
    async putArchive(value) {
      if (state.archive) throw new Error(`Season archive ${value.season} already exists.`);
      state.archive = clone(value);
    },
  };
}

export class InMemoryOperationalFinanceLedgerRepository
  implements OperationalFinanceLedgerRepository
{
  private state: MemoryState = {
    seasons: new Map(),
    obligations: new Map(),
    settlements: new Map(),
    reversals: new Map(),
    auditEvents: new Map(),
    migrationRecords: new Map(),
    idempotencyRecords: new Map(),
    archive: null,
  };

  async runTransaction<T>(
    operation: (transaction: OperationalFinanceLedgerTransaction) => Promise<T>
  ) {
    const working = cloneState(this.state);
    const result = await operation(transactionFor(working));
    this.state = working;
    return deepFreeze(clone(result));
  }

  async getSnapshot(): Promise<OperationalFinanceLedgerSnapshot> {
    return deepFreeze({
      seasons: clone([...this.state.seasons.values()]),
      obligations: clone([...this.state.obligations.values()]),
      settlements: clone([...this.state.settlements.values()]),
      reversals: clone([...this.state.reversals.values()]),
      auditEvents: clone([...this.state.auditEvents.values()]),
      migrationRecords: clone([...this.state.migrationRecords.values()]),
      idempotencyRecords: clone([...this.state.idempotencyRecords.values()]),
    });
  }

  async getArchive(season: number) {
    return deepFreeze(clone(this.state.archive?.season === season ? this.state.archive : null));
  }
}
