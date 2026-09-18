import type { WeeklyOperationRunRecord } from "@/lib/weeklyOperationsOrchestrator";

export const WEEKLY_OPERATION_RUNS = "weekly_operation_runs" as const;
export const WEEKLY_OPERATION_RUN_SCHEMA = "river-city-weekly-operation-run-v1" as const;

export type WeeklyOperationRunDocument = WeeklyOperationRunRecord & { schemaVersion: typeof WEEKLY_OPERATION_RUN_SCHEMA; writePerformed: boolean; sourceAsOf: string | null; evidenceChecksums: readonly string[]; issueCodes: readonly string[]; recommendedAction: string | null; schedulerInvocationId: string | null };

export function weeklyOperationRunPath(record: Pick<WeeklyOperationRunRecord, "operationId">) { return `${WEEKLY_OPERATION_RUNS}/${record.operationId}`; }

export class FirestoreWeeklyOperationRunStore {
  async create(record: WeeklyOperationRunDocument) {
    const { firestore } = await import("@/lib/firebaseAdmin");
    const ref = firestore.doc(weeklyOperationRunPath(record));
    return firestore.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        const current = existing.data() as WeeklyOperationRunDocument;
        if (current.result !== record.result || current.completedAt !== record.completedAt) throw new Error("Operational run record conflict.");
        return "DUPLICATE" as const;
      }
      transaction.create(ref, { ...record, schemaVersion: WEEKLY_OPERATION_RUN_SCHEMA });
      return "CREATED" as const;
    });
  }
}
