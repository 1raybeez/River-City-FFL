export type OperationalFinanceRuleSourceType =
  | "constitution"
  | "legislative-ruling"
  | "commissioner-approved"
  | "repository-config";

export type OperationalFinancePaymentMethod = "venmo";
export type OperationalFinanceFundingSource =
  | "dues-funded"
  | "separately-funded";
export type OperationalFinanceFinalityState =
  | "in-progress"
  | "provisional"
  | "sleeper-final";
export type OperationalFinanceAwardCategory =
  | "weekly-high-score"
  | "division-winner"
  | "third-place"
  | "runner-up";
export type OperationalFinanceExpenseCategory =
  | "championship-ring"
  | "auctioneer-food";

export interface OperationalFinanceRuleProvenance {
  readonly sourceType: OperationalFinanceRuleSourceType;
  readonly sourceRef: string;
  readonly effectiveSeason?: number;
  readonly approvedAt?: string;
  readonly notes?: string;
}

export interface OperationalFinanceFinalityRule {
  readonly requiredState: "sleeper-final";
  readonly allowedPreFinalStates: readonly (
    | "in-progress"
    | "provisional"
  )[];
  readonly officialResolver: "sleeper";
  readonly customTiebreaker: false;
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceAwardRule {
  readonly id: string;
  readonly category: OperationalFinanceAwardCategory;
  readonly amountCents: number;
  readonly awardCount: number;
  readonly fundingSource: "dues-funded";
  readonly eligibleWeeks?: readonly number[];
  readonly recapRequired?: false;
  readonly forfeitureOrRollover?: false;
  readonly finality: OperationalFinanceFinalityRule;
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceExpenseRule {
  readonly id: string;
  readonly category: OperationalFinanceExpenseCategory;
  readonly fundingSource: OperationalFinanceFundingSource;
  readonly requiredEverySeason: boolean;
  readonly defaultCapCents?: number;
  readonly overCapRequiresCommissionerOverride?: true;
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceIdentityRule {
  readonly oneAssessmentPerCompetitiveFranchise: true;
  readonly oneFinancialOwnerPerCompetitiveFranchise: true;
  readonly coOwnerSplitsOutsideLeagueLedger: true;
  readonly keyType: "canonical-owner-and-franchise-ids";
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinancialOwnerMapping {
  readonly season: number;
  readonly franchiseId: string;
  readonly financialOwnerId: string;
  readonly excludedCoOwnerIds: readonly string[];
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceDuesDeadlinePolicy {
  readonly type: "before-draft";
  readonly fixedTimestamp: null;
  readonly resolvedFrom: "approved-draft-event";
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinancePublicDuesPolicy {
  readonly visibleOwnerState: readonly ["paid", "not-paid"];
  readonly aggregateDuesTotalsVisible: true;
  readonly approvedWinningsVisible: true;
  readonly approvedExpensesVisible: true;
  readonly publicFields: readonly ["financialOwnerId", "paymentState"];
  readonly privateFields: readonly [
    "amountOwedCents",
    "paymentHandle",
    "transactionReference",
    "paymentTimestamp",
    "commissionerNotes",
  ];
  readonly provenance: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceSeasonConfig {
  readonly schemaVersion: string;
  readonly season: number;
  readonly competitiveFranchiseCount: number;
  readonly entryFeeCents: number;
  readonly weeklyAward: OperationalFinanceAwardRule;
  readonly divisionAwards: OperationalFinanceAwardRule;
  readonly placementAwards: readonly OperationalFinanceAwardRule[];
  readonly championshipAllocation: {
    readonly allocationCents: number;
    readonly fundingSource: "dues-funded";
    readonly finality: OperationalFinanceFinalityRule;
    readonly provenance: readonly OperationalFinanceRuleProvenance[];
  };
  readonly ringPolicy: OperationalFinanceExpenseRule & {
    readonly category: "championship-ring";
    readonly fundingSource: "dues-funded";
    readonly defaultCapCents: number;
    readonly overCapRequiresCommissionerOverride: true;
  };
  readonly expensePolicies: readonly OperationalFinanceExpenseRule[];
  readonly duesDeadlinePolicy: OperationalFinanceDuesDeadlinePolicy;
  readonly paymentMethod: OperationalFinancePaymentMethod;
  readonly identityRule: OperationalFinanceIdentityRule;
  readonly financialOwnerMappings: readonly OperationalFinancialOwnerMapping[];
  readonly publicDuesPolicy: OperationalFinancePublicDuesPolicy;
  readonly commissionerFeeCents: 0;
  readonly source: readonly OperationalFinanceRuleProvenance[];
}

export interface OperationalFinanceRules {
  readonly schemaVersion: string;
  readonly seasons: Readonly<Record<2026, OperationalFinanceSeasonConfig>>;
}

export interface OperationalFinanceValidationIssue {
  readonly code: string;
  readonly message: string;
}

export interface OperationalFinanceValidationResult {
  readonly valid: boolean;
  readonly resolved: boolean;
  readonly errors: readonly OperationalFinanceValidationIssue[];
  readonly warnings: readonly OperationalFinanceValidationIssue[];
}

export interface OperationalFinanceRingValidationResult
  extends OperationalFinanceValidationResult {
  readonly actualApprovedRingCostCents: number;
  readonly approvedRingFundingCapCents: number;
  readonly effectiveRingExpenseCents: number | null;
  readonly overCapCents: number;
}

export interface OperationalFinanceChampionPayoutResult {
  readonly resolved: boolean;
  readonly championshipAllocationCents: number;
  readonly championCashCents: number | null;
  readonly effectiveRingExpenseCents: number | null;
  readonly ringValidation: OperationalFinanceRingValidationResult;
}

export interface OperationalFinanceReconciliationExpectation {
  readonly season: number;
  readonly expectedDuesPoolCents: number;
  readonly expectedWeeklyAllocationCents: number;
  readonly expectedDivisionAllocationCents: number;
  readonly expectedFixedPlacementAllocationCents: number;
  readonly expectedChampionshipAllocationCents: number;
  readonly expectedTotalAllocationCents: number;
  readonly separatelyFundedExpensesReduceDuesPool: false;
  readonly reconciles: boolean;
}

export interface OperationalFinanceLegacyPaidMigrationInput {
  readonly season: 2026;
  readonly financialOwnerId: string;
  readonly paymentState: "paid";
  readonly amountCents: 5000;
  readonly commissionerConfirmed: true;
  readonly authoritativePaidAt: null;
  readonly legacyTimestampAuthoritative: false;
  readonly migrationStatus: "future-input-only";
}
