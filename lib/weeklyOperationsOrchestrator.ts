export type WeeklyLifecycleState =
  | "PRE_WEEK"
  | "PROJECTION_FREEZE_READY"
  | "PROJECTION_FROZEN"
  | "WEEK_LIVE"
  | "AWAITING_FINALITY"
  | "FINALIZED"
  | "ACTUALS_CAPTURED"
  | "CALIBRATION_PAIRED"
  | "RECAP_DRAFT_READY"
  | "SETTLED"
  | "COMPLETE"
  | "ERROR"
  | "NEEDS_REVIEW";

export type WeeklyOrchestratorInput = Readonly<{
  season: number;
  week: number;
  beforeFirstKickoff: boolean;
  freezeEligible: boolean;
  projectionBaselineExists: boolean;
  finalityReady: boolean;
  actualEvidenceExists: boolean;
  actualEvidencePathC: boolean;
  residualDatasetExists: boolean;
  recapDraftExists: boolean;
  recapPublished: boolean;
  settlementState: "WAITING" | "SETTLED" | "ALREADY_SETTLED" | "UNRESOLVED_TIE" | "CONFLICT" | "ERROR";
  transactionsSynced?: boolean;
  blockingError?: string | null;
}>;

export type WeeklyOrchestratorDecision = Readonly<{
  state: WeeklyLifecycleState;
  season: number;
  week: number;
  actionRequired: boolean;
  automaticOperations: readonly string[];
  humanActions: readonly string[];
  reason: string;
}>;

export function classifyWeeklyLifecycle(input: WeeklyOrchestratorInput): WeeklyOrchestratorDecision {
  const base = { season: input.season, week: input.week };
  if (input.blockingError) return { ...base, state: "ERROR", actionRequired: true, automaticOperations: [], humanActions: [input.blockingError], reason: input.blockingError };
  if (input.settlementState === "CONFLICT" || input.settlementState === "UNRESOLVED_TIE") return { ...base, state: "NEEDS_REVIEW", actionRequired: true, automaticOperations: [], humanActions: [input.settlementState === "CONFLICT" ? "Review settlement conflict." : "Review unresolved Sleeper top-score tie."], reason: input.settlementState };
  if (input.recapPublished && (input.settlementState === "SETTLED" || input.settlementState === "ALREADY_SETTLED") && input.actualEvidenceExists) return { ...base, state: input.actualEvidencePathC || input.residualDatasetExists ? "COMPLETE" : "CALIBRATION_PAIRED", actionRequired: false, automaticOperations: input.actualEvidencePathC ? [] : ["Pair valid projection and actual evidence when both are present."], humanActions: [], reason: "Published recap, finalized actuals, and settlement are present." };
  if (input.settlementState === "SETTLED" || input.settlementState === "ALREADY_SETTLED") return { ...base, state: input.recapDraftExists ? "SETTLED" : "RECAP_DRAFT_READY", actionRequired: !input.recapDraftExists, automaticOperations: input.recapDraftExists ? [] : ["Generate an in-memory recap draft after finality."], humanActions: input.recapDraftExists ? [] : ["Review the generated recap before publication."], reason: "Settlement is complete; recap remains a manual publication gate." };
  if (input.actualEvidenceExists && input.residualDatasetExists) return { ...base, state: "CALIBRATION_PAIRED", actionRequired: false, automaticOperations: ["Refresh calibration readiness using approved sample thresholds."], humanActions: [], reason: "Valid projection and actual evidence are paired." };
  if (input.actualEvidenceExists) return { ...base, state: "ACTUALS_CAPTURED", actionRequired: false, automaticOperations: [input.actualEvidencePathC ? "Exclude PATH C evidence from residual calibration." : "Build residual dataset from the valid same-week projection."], humanActions: [], reason: "Finalized actual evidence is available." };
  if (input.finalityReady) return { ...base, state: "FINALIZED", actionRequired: false, automaticOperations: ["Capture immutable actual evidence.", "Generate a recap draft."], humanActions: [], reason: "Sleeper finality is authoritative and actual evidence is not yet captured." };
  if (input.projectionBaselineExists) return { ...base, state: "WEEK_LIVE", actionRequired: false, automaticOperations: [], humanActions: [], reason: "Authoritative projection baseline exists; week is not final." };
  if (input.freezeEligible && input.beforeFirstKickoff) return { ...base, state: "PROJECTION_FREEZE_READY", actionRequired: false, automaticOperations: ["Run the canonical freeze runner once, idempotently."], humanActions: [], reason: "Freeze window is open and no authoritative baseline exists." };
  return { ...base, state: input.beforeFirstKickoff ? "PRE_WEEK" : "AWAITING_FINALITY", actionRequired: false, automaticOperations: [], humanActions: [], reason: input.beforeFirstKickoff ? "Waiting for the approved first-kickoff-relative freeze window." : "Waiting for authoritative finality." };
}

export function operationId(season: number, week: number, operation: string) { return `${season}:week-${String(week).padStart(2, "0")}:${operation}`; }

export type WeeklyOperationRunRecord = Readonly<{ operationId: string; season: number; week: number; operation: string; result: string; startedAt: string; completedAt: string | null; retryCount: number; error: string | null }>;

export function buildRunRecord(input: Omit<WeeklyOperationRunRecord, "operationId">): WeeklyOperationRunRecord { return { ...input, operationId: operationId(input.season, input.week, input.operation) }; }
