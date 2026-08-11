import type {
  OperationalFinanceChampionPayoutResult,
  OperationalFinanceLegacyPaidMigrationInput,
  OperationalFinanceReconciliationExpectation,
  OperationalFinanceRingValidationResult,
  OperationalFinanceRuleProvenance,
  OperationalFinanceRules,
  OperationalFinanceSeasonConfig,
  OperationalFinanceValidationIssue,
  OperationalFinanceValidationResult,
  OperationalFinancialOwnerMapping,
} from "@/lib/finance/operationalFinanceTypes";

export const OPERATIONAL_FINANCE_SCHEMA_VERSION = "2026.1";
export const ENTRY_FEE_CENTS = 5_000;
export const BASE_DUES_POOL_CENTS = 60_000;
export const WEEKLY_HIGH_SCORE_CENTS = 1_000;
export const DIVISION_WINNER_CENTS = 2_500;
export const THIRD_PLACE_CENTS = 5_000;
export const RUNNER_UP_CENTS = 10_000;
export const CHAMPIONSHIP_ALLOCATION_CENTS = 23_500;
export const DEFAULT_RING_CAP_CENTS = 8_000;
export const DIVISION_COUNT = 3;
export const WEEKLY_HIGH_SCORE_WEEKS_2026 = Object.freeze(
  Array.from({ length: 14 }, (_, index) => index + 1)
);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

const commissioner2026 = deepFreeze<OperationalFinanceRuleProvenance>({
  sourceType: "commissioner-approved",
  sourceRef: "Phase 6.2 — 2026 Operational Finance Rules & Types Foundation",
  effectiveSeason: 2026,
  notes: "Approved current policy; approval date was not asserted in source evidence.",
});

const constitutionMembership = deepFreeze<OperationalFinanceRuleProvenance>({
  sourceType: "constitution",
  sourceRef: "lib/constitutionData.ts §1.3 League Membership",
  notes: "Constitution states that the league consists of 12 owners.",
});

const constitutionFinance = deepFreeze<OperationalFinanceRuleProvenance>({
  sourceType: "constitution",
  sourceRef: "lib/constitutionData.ts §§11.1–11.2 Financial Transparency",
  notes:
    "The Constitution delegates current financial amounts to the Payouts source and intentionally omits fixed amounts.",
});

const currentLeagueConfig = deepFreeze<OperationalFinanceRuleProvenance>({
  sourceType: "repository-config",
  sourceRef: "lib/managers/activeManagers.ts and lib/managers/identityData.ts",
  effectiveSeason: 2026,
  notes: "Repository configuration contains 12 active competitive franchises.",
});

const currentFinanceConfig = deepFreeze<OperationalFinanceRuleProvenance>({
  sourceType: "repository-config",
  sourceRef: "lib/league-finance.ts",
  notes:
    "Corroborates $50 dues, $10 weekly, $25 division, $100 runner-up, and $50 third; its fixed $219 champion value is not authoritative for variable ring costs.",
});

const legislative2024 = (id: string, notes: string) =>
  deepFreeze<OperationalFinanceRuleProvenance>({
    sourceType: "legislative-ruling",
    sourceRef: `lib/legislativeArchive.ts ${id}`,
    notes,
  });

const sleeperFinality = deepFreeze({
  requiredState: "sleeper-final" as const,
  allowedPreFinalStates: ["in-progress", "provisional"] as const,
  officialResolver: "sleeper" as const,
  customTiebreaker: false as const,
  provenance: [commissioner2026],
});

const ACTIVE_2026_FINANCIAL_OWNER_PAIRS = [
  ["prestigio-mundial", "ray-long", ["jeffrey-hudgins"]],
  ["the-art-of-war", "jd-dowling", []],
  ["shake-n-bakers", "jordan-maslyn", ["landon-elliott"]],
  ["the-shepherd", "tommy-moore", []],
  ["tax-season", "stan-schoppe", []],
  ["the-wildcard", "wade-cameron", []],
  ["hall-pass", "doug-fordham", []],
  ["kissed-by-a-freckle", "travis-miller", []],
  ["the-gresham-empire", "rashad-gresham", []],
  ["buckeye-nation", "brian-stevens", []],
  ["hawkins-heroes", "aaron-hawkins", []],
  ["the-bearded-one", "david-besedich", []],
] as const;

export const OPERATIONAL_FINANCIAL_OWNER_MAPPINGS_2026 = deepFreeze(
  ACTIVE_2026_FINANCIAL_OWNER_PAIRS.map(
    ([franchiseId, financialOwnerId, excludedCoOwnerIds]) =>
      ({
        season: 2026,
        franchiseId,
        financialOwnerId,
        excludedCoOwnerIds: [...excludedCoOwnerIds],
        provenance: [commissioner2026, currentLeagueConfig],
      }) satisfies OperationalFinancialOwnerMapping
  )
);

export const OPERATIONAL_FINANCE_SEASON_2026 =
  deepFreeze<OperationalFinanceSeasonConfig>({
    schemaVersion: OPERATIONAL_FINANCE_SCHEMA_VERSION,
    season: 2026,
    competitiveFranchiseCount: 12,
    entryFeeCents: ENTRY_FEE_CENTS,
    weeklyAward: {
      id: "2026-weekly-high-score",
      category: "weekly-high-score",
      amountCents: WEEKLY_HIGH_SCORE_CENTS,
      awardCount: 14,
      fundingSource: "dues-funded",
      eligibleWeeks: WEEKLY_HIGH_SCORE_WEEKS_2026,
      recapRequired: false,
      forfeitureOrRollover: false,
      finality: sleeperFinality,
      provenance: [
        commissioner2026,
        currentFinanceConfig,
        legislative2024(
          "2024-high-score-regardless-recap",
          "Passed 11–1; weekly high score is paid regardless of recap status."
        ),
      ],
    },
    divisionAwards: {
      id: "2026-division-winners",
      category: "division-winner",
      amountCents: DIVISION_WINNER_CENTS,
      awardCount: DIVISION_COUNT,
      fundingSource: "dues-funded",
      finality: sleeperFinality,
      provenance: [
        commissioner2026,
        currentFinanceConfig,
        legislative2024(
          "2024-division-winner-payout",
          "Passed 9–3; each division winner receives $25."
        ),
      ],
    },
    placementAwards: [
      {
        id: "2026-third-place",
        category: "third-place",
        amountCents: THIRD_PLACE_CENTS,
        awardCount: 1,
        fundingSource: "dues-funded",
        finality: sleeperFinality,
        provenance: [
          commissioner2026,
          currentFinanceConfig,
          legislative2024(
            "2024-fourth-third-place-payouts",
            "Passed 12–0; fourth place was removed and third place reduced to the entry fee."
          ),
        ],
      },
      {
        id: "2026-runner-up",
        category: "runner-up",
        amountCents: RUNNER_UP_CENTS,
        awardCount: 1,
        fundingSource: "dues-funded",
        finality: sleeperFinality,
        provenance: [commissioner2026, currentFinanceConfig],
      },
    ],
    championshipAllocation: {
      allocationCents: CHAMPIONSHIP_ALLOCATION_CENTS,
      fundingSource: "dues-funded",
      finality: sleeperFinality,
      provenance: [commissioner2026, constitutionFinance],
    },
    ringPolicy: {
      id: "2026-championship-ring",
      category: "championship-ring",
      fundingSource: "dues-funded",
      requiredEverySeason: true,
      defaultCapCents: DEFAULT_RING_CAP_CENTS,
      overCapRequiresCommissionerOverride: true,
      provenance: [commissioner2026, constitutionFinance],
    },
    expensePolicies: [
      {
        id: "2026-auctioneer-food",
        category: "auctioneer-food",
        fundingSource: "separately-funded",
        requiredEverySeason: false,
        provenance: [
          commissioner2026,
          legislative2024(
            "2024-auctioneer-dinner-split",
            "Passed 12–0; owners separately split auctioneer dinner and drinks."
          ),
        ],
      },
    ],
    duesDeadlinePolicy: {
      type: "before-draft",
      fixedTimestamp: null,
      resolvedFrom: "approved-draft-event",
      provenance: [commissioner2026, currentLeagueConfig],
    },
    paymentMethod: "venmo",
    identityRule: {
      oneAssessmentPerCompetitiveFranchise: true,
      oneFinancialOwnerPerCompetitiveFranchise: true,
      coOwnerSplitsOutsideLeagueLedger: true,
      keyType: "canonical-owner-and-franchise-ids",
      provenance: [commissioner2026, currentLeagueConfig],
    },
    financialOwnerMappings: OPERATIONAL_FINANCIAL_OWNER_MAPPINGS_2026,
    publicDuesPolicy: {
      visibleOwnerState: ["paid", "not-paid"],
      aggregateDuesTotalsVisible: true,
      approvedWinningsVisible: true,
      approvedExpensesVisible: true,
      publicFields: ["financialOwnerId", "paymentState"],
      privateFields: [
        "amountOwedCents",
        "paymentHandle",
        "transactionReference",
        "paymentTimestamp",
        "commissionerNotes",
      ],
      provenance: [commissioner2026],
    },
    commissionerFeeCents: 0,
    source: [
      commissioner2026,
      constitutionMembership,
      constitutionFinance,
      currentLeagueConfig,
      currentFinanceConfig,
    ],
  });

export const OPERATIONAL_FINANCE_RULES = deepFreeze<OperationalFinanceRules>({
  schemaVersion: OPERATIONAL_FINANCE_SCHEMA_VERSION,
  seasons: { 2026: OPERATIONAL_FINANCE_SEASON_2026 },
});

export const LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS = deepFreeze<
  readonly OperationalFinanceLegacyPaidMigrationInput[]
>(
  [
    "david-besedich",
    "jd-dowling",
    "rashad-gresham",
    "ray-long",
    "wade-cameron",
  ].map((financialOwnerId) => ({
    season: 2026,
    financialOwnerId,
    paymentState: "paid",
    amountCents: ENTRY_FEE_CENTS,
    commissionerConfirmed: true,
    authoritativePaidAt: null,
    legacyTimestampAuthoritative: false,
    migrationStatus: "future-input-only",
  }))
);

export const OPERATIONAL_FINANCE_RECONCILIATION_2026 =
  deepFreeze<OperationalFinanceReconciliationExpectation>({
    season: 2026,
    expectedDuesPoolCents: BASE_DUES_POOL_CENTS,
    expectedWeeklyAllocationCents: 14_000,
    expectedDivisionAllocationCents: 7_500,
    expectedFixedPlacementAllocationCents: 15_000,
    expectedChampionshipAllocationCents: CHAMPIONSHIP_ALLOCATION_CENTS,
    expectedTotalAllocationCents: BASE_DUES_POOL_CENTS,
    separatelyFundedExpensesReduceDuesPool: false,
    reconciles: true,
  });

export function getExpectedDuesPool(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return config.competitiveFranchiseCount * config.entryFeeCents;
}

export function getExpectedWeeklyAllocation(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return config.weeklyAward.awardCount * config.weeklyAward.amountCents;
}

export function getExpectedDivisionAllocation(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return config.divisionAwards.awardCount * config.divisionAwards.amountCents;
}

export function getFixedPlacementAllocation(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return config.placementAwards.reduce(
    (total, award) => total + award.amountCents * award.awardCount,
    0
  );
}

export function getChampionshipAllocation(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return config.championshipAllocation.allocationCents;
}

export function getExpectedTotalAllocation(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
) {
  return (
    getExpectedWeeklyAllocation(config) +
    getExpectedDivisionAllocation(config) +
    getFixedPlacementAllocation(config) +
    getChampionshipAllocation(config)
  );
}

function issue(code: string, message: string): OperationalFinanceValidationIssue {
  return Object.freeze({ code, message });
}

function isNonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function validateRingExpense(
  actualApprovedRingCostCents: number,
  approvedRingFundingCapOverrideCents?: number,
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
): OperationalFinanceRingValidationResult {
  const errors: OperationalFinanceValidationIssue[] = [];
  const warnings: OperationalFinanceValidationIssue[] = [];
  const overrideProvided = approvedRingFundingCapOverrideCents !== undefined;

  if (!isNonNegativeInteger(actualApprovedRingCostCents)) {
    errors.push(
      issue("invalid-ring-cost", "Ring cost must be a non-negative integer number of cents.")
    );
  }

  if (
    overrideProvided &&
    (!isNonNegativeInteger(approvedRingFundingCapOverrideCents) ||
      approvedRingFundingCapOverrideCents < config.ringPolicy.defaultCapCents)
  ) {
    errors.push(
      issue(
        "invalid-ring-cap-override",
        "An approved ring cap override must be an integer at or above the default cap."
      )
    );
  }

  const approvedCapCents =
    overrideProvided && errors.length === 0
      ? approvedRingFundingCapOverrideCents
      : config.ringPolicy.defaultCapCents;
  const overCapCents = isNonNegativeInteger(actualApprovedRingCostCents)
    ? Math.max(0, actualApprovedRingCostCents - approvedCapCents)
    : 0;

  if (overCapCents > 0) {
    errors.push(
      issue(
        "ring-over-approved-cap",
        `Ring cost exceeds the approved dues-funded cap by ${overCapCents} cents.`
      )
    );
    warnings.push(
      issue(
        "commissioner-override-required",
        "The championship allocation remains unresolved until a sufficient commissioner-approved cap override exists."
      )
    );
  }

  const resolved = errors.length === 0;
  return deepFreeze({
    valid: resolved,
    resolved,
    errors,
    warnings,
    actualApprovedRingCostCents,
    approvedRingFundingCapCents: approvedCapCents,
    effectiveRingExpenseCents: resolved
      ? Math.min(actualApprovedRingCostCents, approvedCapCents)
      : null,
    overCapCents,
  });
}

export function calculateChampionPayout(
  actualApprovedRingCostCents: number,
  approvedRingFundingCapOverrideCents?: number,
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
): OperationalFinanceChampionPayoutResult {
  const ringValidation = validateRingExpense(
    actualApprovedRingCostCents,
    approvedRingFundingCapOverrideCents,
    config
  );
  const effectiveRingExpenseCents = ringValidation.effectiveRingExpenseCents;
  return deepFreeze({
    resolved: ringValidation.resolved,
    championshipAllocationCents: getChampionshipAllocation(config),
    championCashCents:
      effectiveRingExpenseCents === null
        ? null
        : getChampionshipAllocation(config) - effectiveRingExpenseCents,
    effectiveRingExpenseCents,
    ringValidation,
  });
}

export function validateOperationalFinanceRules(
  config: OperationalFinanceSeasonConfig = OPERATIONAL_FINANCE_SEASON_2026
): OperationalFinanceValidationResult {
  const errors: OperationalFinanceValidationIssue[] = [];
  const warnings: OperationalFinanceValidationIssue[] = [];
  const expect = (condition: boolean, code: string, message: string) => {
    if (!condition) errors.push(issue(code, message));
  };

  expect(config.season === 2026, "season", "Season must be 2026.");
  expect(config.competitiveFranchiseCount === 12, "franchise-count", "Expected 12 franchises.");
  expect(config.entryFeeCents === ENTRY_FEE_CENTS, "entry-fee", "Expected a $50 entry fee.");
  expect(getExpectedDuesPool(config) === BASE_DUES_POOL_CENTS, "dues-pool", "Expected a $600 dues pool.");
  expect(
    config.weeklyAward.eligibleWeeks?.join(",") === WEEKLY_HIGH_SCORE_WEEKS_2026.join(","),
    "weekly-weeks",
    "Weekly awards must cover Weeks 1–14 exactly."
  );
  expect(config.weeklyAward.amountCents === WEEKLY_HIGH_SCORE_CENTS, "weekly-amount", "Expected $10 weekly awards.");
  expect(getExpectedWeeklyAllocation(config) === 14_000, "weekly-allocation", "Expected $140 weekly allocation.");
  expect(config.weeklyAward.recapRequired === false, "recap", "A recap cannot be required.");
  expect(config.weeklyAward.forfeitureOrRollover === false, "forfeiture", "No forfeiture or rollover is allowed.");
  expect(config.divisionAwards.awardCount === DIVISION_COUNT, "division-count", "Expected three divisions.");
  expect(config.divisionAwards.amountCents === DIVISION_WINNER_CENTS, "division-amount", "Expected $25 per division.");
  expect(getExpectedDivisionAllocation(config) === 7_500, "division-allocation", "Expected $75 division allocation.");
  expect(
    config.placementAwards.some(
      (award) => award.category === "third-place" && award.amountCents === THIRD_PLACE_CENTS
    ),
    "third-place",
    "Expected a $50 third-place award."
  );
  expect(
    config.placementAwards.some(
      (award) => award.category === "runner-up" && award.amountCents === RUNNER_UP_CENTS
    ),
    "runner-up",
    "Expected a $100 runner-up award."
  );
  expect(config.placementAwards.length === 2, "extra-placement", "No other placement awards are allowed.");
  expect(getChampionshipAllocation(config) === CHAMPIONSHIP_ALLOCATION_CENTS, "championship", "Expected a $235 championship allocation.");
  expect(config.ringPolicy.defaultCapCents === DEFAULT_RING_CAP_CENTS, "ring-cap", "Expected an $80 default ring cap.");
  expect(config.commissionerFeeCents === 0, "commissioner-fee", "Commissioner fee must be zero.");
  expect(config.paymentMethod === "venmo", "payment-method", "Venmo is the only approved method.");
  expect(config.duesDeadlinePolicy.type === "before-draft", "dues-deadline", "Dues must be due before the draft.");
  expect(config.financialOwnerMappings.length === 12, "owner-count", "Each franchise needs one financial owner.");
  expect(
    new Set(config.financialOwnerMappings.map((mapping) => mapping.franchiseId)).size === 12,
    "duplicate-franchise",
    "Financial-owner mappings cannot duplicate franchises."
  );
  expect(
    config.expensePolicies.every((expense) => expense.fundingSource === "separately-funded"),
    "expense-funding",
    "Non-ring expenses must be separately funded."
  );
  expect(getExpectedTotalAllocation(config) === getExpectedDuesPool(config), "reconciliation", "Dues-funded allocations must reconcile exactly.");

  const finalityRules = [
    config.weeklyAward.finality,
    config.divisionAwards.finality,
    ...config.placementAwards.map((award) => award.finality),
    config.championshipAllocation.finality,
  ];
  expect(
    finalityRules.every(
      (finality) =>
        finality.officialResolver === "sleeper" &&
        finality.customTiebreaker === false &&
        finality.requiredState === "sleeper-final"
    ),
    "finality",
    "Sleeper must resolve results and tiebreakers before awards are final."
  );

  const valid = errors.length === 0;
  return deepFreeze({ valid, resolved: valid, errors, warnings });
}
