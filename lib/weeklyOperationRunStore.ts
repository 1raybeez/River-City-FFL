import type { WeeklyOperationRunRecord } from "@/lib/weeklyOperationsOrchestrator";

export const WEEKLY_OPERATION_RUNS = "weekly_operation_runs" as const;
export const WEEKLY_OPERATION_RUN_SCHEMA = "river-city-weekly-operation-run-v1" as const;

export type WeeklyOperationRunDocument = WeeklyOperationRunRecord & { schemaVersion: typeof WEEKLY_OPERATION_RUN_SCHEMA; writePerformed: boolean; sourceAsOf: string | null; evidenceChecksums: readonly string[]; issueCodes: readonly string[]; recommendedAction: string | null; schedulerInvocationId: string | null };

export function weeklyOperationRunPath(record: Pick<WeeklyOperationRunRecord, "operationId">) { return `${WEEKLY_OPERATION_RUNS}/${record.operationId}`; }

/**
 * Timestamps and scheduler event IDs describe an invocation, not the logical
 * operation. They must not make a safe retry look like a conflicting run.
 */
export function isEquivalentWeeklyOperationRun(first: WeeklyOperationRunDocument, second: WeeklyOperationRunDocument) {
  const fingerprint = (record: WeeklyOperationRunDocument) => JSON.stringify({
    operationId: record.operationId,
    season: record.season,
    week: record.week,
    operation: record.operation,
    result: record.result,
    error: record.error,
    writePerformed: record.writePerformed,
    sourceAsOf: record.sourceAsOf,
    evidenceChecksums: [...record.evidenceChecksums].sort(),
    issueCodes: [...record.issueCodes].sort(),
    recommendedAction: record.recommendedAction,
  });
  return fingerprint(first) === fingerprint(second);
}

export class FirestoreWeeklyOperationRunStore {
  async create(record: WeeklyOperationRunDocument) {
    const { firestore } = await import("@/lib/firebaseAdmin");
    const ref = firestore.doc(weeklyOperationRunPath(record));
    return firestore.runTransaction(async transaction => {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        const current = existing.data() as WeeklyOperationRunDocument;
        if (!isEquivalentWeeklyOperationRun(current, record)) throw new Error("Operational run record conflict.");
        return "DUPLICATE" as const;
      }
      transaction.create(ref, { ...record, schemaVersion: WEEKLY_OPERATION_RUN_SCHEMA });
      return "CREATED" as const;
    });
  }
}

export type WeeklyOperationRunHealth = Readonly<{
  status: "HEALTHY" | "WARNING" | "ERROR" | "UNKNOWN";
  latestRun: WeeklyOperationRunDocument | null;
  lastSuccessfulRunAt: string | null;
  lastFailedRunAt: string | null;
  failureReason: string | null;
  affectedSystems: readonly string[];
}>;

const FAILED_RUN_RESULTS = new Set(["ERROR", "CONFLICT", "MISSED", "FREEZE_COVERAGE_INCOMPLETE", "PROVIDER_UNAVAILABLE"]);

/** Read-only operational health projection; it never creates or updates runs. */
export async function readWeeklyOperationRunHealth(season: number): Promise<WeeklyOperationRunHealth> {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const snapshot = await firestore.collection(WEEKLY_OPERATION_RUNS).get();
  const runs = snapshot.docs
    .map((doc) => doc.data() as WeeklyOperationRunDocument)
    .filter((run) => run.season === season)
    .sort((first, second) => (second.completedAt ?? second.startedAt).localeCompare(first.completedAt ?? first.startedAt));
  const latestRun = runs[0] ?? null;
  const successful = runs.find((run) => !FAILED_RUN_RESULTS.has(run.result));
  const failed = runs.find((run) => FAILED_RUN_RESULTS.has(run.result));
  if (!latestRun) return { status: "UNKNOWN", latestRun: null, lastSuccessfulRunAt: null, lastFailedRunAt: null, failureReason: null, affectedSystems: [] };
  const failedLatest = FAILED_RUN_RESULTS.has(latestRun.result);
  return {
    status: failedLatest ? "ERROR" : "HEALTHY",
    latestRun,
    lastSuccessfulRunAt: successful?.completedAt ?? null,
    lastFailedRunAt: failed?.completedAt ?? null,
    failureReason: failed?.error ?? null,
    affectedSystems: failed ? [failed.operation, ...(failed.issueCodes ?? [])] : [],
  };
}
