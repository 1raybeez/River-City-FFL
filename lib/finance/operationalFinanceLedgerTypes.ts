import type { OperationalFinanceRuleProvenance } from "@/lib/finance/operationalFinanceTypes";

export type OperationalFinanceActor = Readonly<{
  actorId: string;
  role: "commissioner" | "system";
}>;

export type OperationalFinanceArchive = Readonly<{
  archiveId: string;
  season: number;
  schemaVersion: string;
  rulesVersion: string;
  sourceLeagueId: string;
  closedAt: string;
  closedBy: OperationalFinanceActor;
  reconciliation: Readonly<Record<string, unknown>>;
  obligations: readonly Readonly<Record<string, unknown>>[];
  settlements: readonly Readonly<Record<string, unknown>>[];
  reversals: readonly Readonly<Record<string, unknown>>[];
  adjustments: readonly Readonly<Record<string, unknown>>[];
  expenses: readonly Readonly<Record<string, unknown>>[];
  contributions: readonly Readonly<Record<string, unknown>>[];
  coverage: Readonly<Record<string, unknown>> | null;
  archiveHash: string;
}>;

export type OperationalFinanceObligationCategory =
  | "dues-assessment"
  | "weekly-high-score"
  | "division-winner"
  | "third-place"
  | "runner-up"
  | "champion"
  | "championship-ring"
  | "auctioneer-food";

export type OperationalFinanceSettlementDirection =
  | "incoming-dues"
  | "outgoing-award"
  | "outgoing-expense"
  | "incoming-separate-contribution";

export type OperationalFinancePaymentMethod = "venmo" | "card" | "cash" | "other";
export type OperationalFinanceFundingSource =
  | "dues-funded"
  | "separately-funded";

export interface OperationalFinanceSeasonLedger {
  readonly season: number;
  readonly schemaVersion: string;
  readonly rulesVersion: string;
  readonly status: "open" | "reconciling" | "closed";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly closedBy: string | null;
  readonly archiveId?: string | null;
  readonly archiveHash?: string | null;
  readonly rulesSnapshotHash: string;
  readonly financialOwnerMappingVersion: string;
  readonly sourceLeagueId: string;
}

export type OperationalFinanceProposalEvidence = Readonly<{
  proposalVersion: string;
  sourceType: string;
  sourceRef: string;
  sourceSnapshotAt: string | null;
  leagueId: string | null;
  eventKey: string;
  finalityState: "sleeper-final";
  facts: Readonly<Record<string, string | number | boolean | null>>;
}>;

export type OperationalFinanceExpenseEvidence = Readonly<{
  actualCostCents: number;
  effectiveDate?: string | null;
  description?: string | null;
  evidenceReference?: string | null;
  defaultFundingCapCents: number | null;
  approvedFundingCapCents: number | null;
  overCapCents: number;
  overrideApproved: boolean;
  commissionerNote: string | null;
}>;

export type OperationalFinanceAdjustment = Readonly<{
  adjustmentId: string;
  season: number;
  category: "cash_variance" | "bank_fee" | "refund" | "rounding_correction" | "other_approved";
  amountCents: number;
  reason: string;
  effectiveDate: string;
  createdAt: string;
  createdBy: OperationalFinanceActor;
  idempotencyKey: string;
}>;

export interface OperationalFinanceObligation {
  readonly obligationId: string;
  readonly season: number;
  readonly category: OperationalFinanceObligationCategory;
  readonly amountCents: number;
  readonly fundingSource: OperationalFinanceFundingSource;
  readonly franchiseId: string | null;
  readonly financialOwnerId: string | null;
  readonly proposalKey: string | null;
  readonly proposalEvidence: OperationalFinanceProposalEvidence | null;
  readonly expenseEvidence?: OperationalFinanceExpenseEvidence | null;
  readonly duePolicy: "before-draft" | null;
  readonly dueAt: string | null;
  readonly ruleRef: string;
  readonly ruleProvenance: readonly OperationalFinanceRuleProvenance[];
  readonly sourceRef: string;
  readonly createdAt: string;
  readonly createdBy: OperationalFinanceActor;
  readonly idempotencyKey: string;
  readonly replacesObligationId: string | null;
  readonly replacementForReversalId: string | null;
}

export interface OperationalFinanceSettlement {
  readonly settlementId: string;
  readonly season: number;
  readonly obligationId: string;
  readonly direction: OperationalFinanceSettlementDirection;
  readonly amountCents: number;
  readonly paymentMethod: OperationalFinancePaymentMethod;
  readonly actualPaidAt: string | null;
  readonly recordedAt: string;
  readonly externalReference: string | null;
  readonly commissionerNote: string | null;
  readonly contributorOwnerId?: string | null;
  readonly contributorFranchiseId?: string | null;
  readonly sourceRef: string;
  readonly createdBy: OperationalFinanceActor;
  readonly idempotencyKey: string;
}

export interface OperationalFinanceReversal {
  readonly reversalId: string;
  readonly season: number;
  readonly targetType: "obligation" | "settlement";
  readonly targetId: string;
  readonly replacementObligationId: string | null;
  readonly reason: string;
  readonly createdAt: string;
  readonly createdBy: OperationalFinanceActor;
  readonly idempotencyKey: string;
}

export type OperationalFinanceAuditEventType =
  | "season-metadata-created"
  | "obligation-created"
  | "settlement-created"
  | "award-settlement-recorded"
  | "expense-obligation-created"
  | "expense-settlement-recorded"
  | "separate-contribution-recorded"
  | "obligation-reversed"
  | "obligation-replaced"
  | "settlement-reversed"
  | "adjustment-recorded"
  | "migration-recorded"
  | "season-closed";

export interface OperationalFinanceAuditEvent {
  readonly eventId: string;
  readonly season: number;
  readonly eventType: OperationalFinanceAuditEventType;
  readonly actorId: string;
  readonly actorRole: OperationalFinanceActor["role"];
  readonly targetType:
    | "season"
    | "obligation"
    | "settlement"
    | "reversal"
    | "adjustment"
    | "migration";
  readonly targetId: string;
  readonly createdAt: string;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly beforeRef: string | null;
  readonly afterRef: string | null;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}

export interface OperationalFinanceMigrationRecord {
  readonly migrationId: string;
  readonly season: number;
  readonly migrationType: "2026-opening-dues";
  readonly status: "recorded";
  readonly assessmentCount: number;
  readonly settlementCount: number;
  readonly assessedCents: number;
  readonly collectedCents: number;
  readonly legacyMutations: 0;
  readonly deletes: 0;
  readonly recordedAt: string;
  readonly recordedBy: OperationalFinanceActor;
  readonly sourceRef: string;
  readonly idempotencyKey: string;
}

export interface OperationalFinanceIdempotencyRecord {
  readonly idempotencyKey: string;
  readonly season: number;
  readonly operation: string;
  readonly targetType: "season" | "obligation" | "settlement" | "reversal" | "adjustment" | "migration";
  readonly targetId: string;
  readonly createdAt: string;
}

export interface OperationalFinanceDuesStatus {
  readonly obligationId: string;
  readonly franchiseId: string;
  readonly financialOwnerId: string;
  readonly assessedCents: number;
  readonly settledCents: number;
  readonly outstandingCents: number;
  readonly state: "unpaid" | "partially-paid" | "paid";
}

export interface OperationalFinanceTotals {
  readonly duesAssessedCents: number;
  readonly duesCollectedCents: number;
  readonly duesOutstandingCents: number;
  readonly approvedAwardsCents: number;
  readonly awardSettlementsCents: number;
  readonly awardOutstandingCents: number;
  readonly approvedExpensesCents: number;
  readonly expenseSettlementsCents: number;
  readonly expenseOutstandingCents: number;
  readonly separatelyFundedContributionsCents: number;
  readonly poolAllocatedCents: number;
  readonly poolRemainingCents: number;
}

export interface OperationalFinanceReconciliationSnapshot {
  readonly snapshotId: string;
  readonly season: number;
  readonly createdAt: string;
  readonly totals: OperationalFinanceTotals;
  readonly duesFundedPoolCents: number;
  readonly reconciledAtClose: boolean;
}

export interface OperationalFinanceLedgerSnapshot {
  readonly seasons: readonly OperationalFinanceSeasonLedger[];
  readonly obligations: readonly OperationalFinanceObligation[];
  readonly settlements: readonly OperationalFinanceSettlement[];
  readonly reversals: readonly OperationalFinanceReversal[];
  readonly adjustments: readonly OperationalFinanceAdjustment[];
  readonly auditEvents: readonly OperationalFinanceAuditEvent[];
  readonly migrationRecords: readonly OperationalFinanceMigrationRecord[];
  readonly idempotencyRecords: readonly OperationalFinanceIdempotencyRecord[];
}

export interface OperationalFinanceLedgerTransaction {
  getSeason(season: number): Promise<OperationalFinanceSeasonLedger | null>;
  getObligation(obligationId: string): Promise<OperationalFinanceObligation | null>;
  getSettlement(settlementId: string): Promise<OperationalFinanceSettlement | null>;
  getMigrationRecord(migrationId: string): Promise<OperationalFinanceMigrationRecord | null>;
  getIdempotency(key: string): Promise<OperationalFinanceIdempotencyRecord | null>;
  getArchive(season: number): Promise<OperationalFinanceArchive | null>;
  getAllObligations(season: number): Promise<readonly OperationalFinanceObligation[]>;
  getAllSettlements(season: number): Promise<readonly OperationalFinanceSettlement[]>;
  getAllReversals(season: number): Promise<readonly OperationalFinanceReversal[]>;
  getAllAdjustments(season: number): Promise<readonly OperationalFinanceAdjustment[]>;
  updateSeason(value: OperationalFinanceSeasonLedger): Promise<void>;
  putSeason(value: OperationalFinanceSeasonLedger): Promise<void>;
  putObligation(value: OperationalFinanceObligation): Promise<void>;
  putSettlement(value: OperationalFinanceSettlement): Promise<void>;
  putReversal(value: OperationalFinanceReversal): Promise<void>;
  putAdjustment(value: OperationalFinanceAdjustment): Promise<void>;
  putAuditEvent(value: OperationalFinanceAuditEvent): Promise<void>;
  putMigrationRecord(value: OperationalFinanceMigrationRecord): Promise<void>;
  putIdempotency(value: OperationalFinanceIdempotencyRecord): Promise<void>;
  putArchive(value: OperationalFinanceArchive): Promise<void>;
}

export interface OperationalFinanceLedgerRepository {
  runTransaction<T>(
    operation: (transaction: OperationalFinanceLedgerTransaction) => Promise<T>
  ): Promise<T>;
  getSnapshot(): Promise<OperationalFinanceLedgerSnapshot>;
  getArchive(season: number): Promise<OperationalFinanceArchive | null>;
}
