import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BASE_DUES_POOL_CENTS,
  CHAMPIONSHIP_ALLOCATION_CENTS,
  DEFAULT_RING_CAP_CENTS,
  DIVISION_COUNT,
  DIVISION_WINNER_CENTS,
  ENTRY_FEE_CENTS,
  LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS,
  OPERATIONAL_FINANCE_RECONCILIATION_2026,
  OPERATIONAL_FINANCE_RULES,
  OPERATIONAL_FINANCE_SCHEMA_VERSION,
  OPERATIONAL_FINANCE_SEASON_2026,
  OPERATIONAL_FINANCIAL_OWNER_MAPPINGS_2026,
  RUNNER_UP_CENTS,
  THIRD_PLACE_CENTS,
  WEEKLY_HIGH_SCORE_CENTS,
  WEEKLY_HIGH_SCORE_WEEKS_2026,
  calculateChampionPayout,
  getChampionshipAllocation,
  getExpectedDivisionAllocation,
  getExpectedDuesPool,
  getExpectedTotalAllocation,
  getExpectedWeeklyAllocation,
  getFixedPlacementAllocation,
  validateOperationalFinanceRules,
  validateRingExpense,
} from "../lib/finance/operationalFinanceRules";
import type { OperationalFinanceSeasonConfig } from "../lib/finance/operationalFinanceTypes";

const config = OPERATIONAL_FINANCE_SEASON_2026;
const placementByCategory = new Map(
  config.placementAwards.map((award) => [award.category, award])
);
const mappingByFranchise = new Map(
  config.financialOwnerMappings.map((mapping) => [mapping.franchiseId, mapping])
);

assert.ok(OPERATIONAL_FINANCE_SCHEMA_VERSION);
assert.equal(OPERATIONAL_FINANCE_RULES.schemaVersion, OPERATIONAL_FINANCE_SCHEMA_VERSION);
assert.equal(config.schemaVersion, OPERATIONAL_FINANCE_SCHEMA_VERSION);
assert.equal(config.season, 2026);
assert.equal(config.competitiveFranchiseCount, 12);
assert.equal(config.entryFeeCents, ENTRY_FEE_CENTS);
assert.equal(ENTRY_FEE_CENTS, 5_000);
assert.equal(getExpectedDuesPool(), BASE_DUES_POOL_CENTS);
assert.equal(BASE_DUES_POOL_CENTS, 60_000);

assert.deepEqual(WEEKLY_HIGH_SCORE_WEEKS_2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
assert.deepEqual(config.weeklyAward.eligibleWeeks, WEEKLY_HIGH_SCORE_WEEKS_2026);
assert.equal(config.weeklyAward.amountCents, WEEKLY_HIGH_SCORE_CENTS);
assert.equal(WEEKLY_HIGH_SCORE_CENTS, 1_000);
assert.equal(getExpectedWeeklyAllocation(), 14_000);
assert.equal(config.weeklyAward.recapRequired, false);
assert.equal(config.weeklyAward.forfeitureOrRollover, false);

assert.equal(config.divisionAwards.awardCount, DIVISION_COUNT);
assert.equal(DIVISION_COUNT, 3);
assert.equal(config.divisionAwards.amountCents, DIVISION_WINNER_CENTS);
assert.equal(DIVISION_WINNER_CENTS, 2_500);
assert.equal(getExpectedDivisionAllocation(), 7_500);

assert.equal(placementByCategory.get("third-place")?.amountCents, THIRD_PLACE_CENTS);
assert.equal(THIRD_PLACE_CENTS, 5_000);
assert.equal(placementByCategory.get("runner-up")?.amountCents, RUNNER_UP_CENTS);
assert.equal(RUNNER_UP_CENTS, 10_000);
assert.equal(config.placementAwards.length, 2);
assert.equal(getFixedPlacementAllocation(), 15_000);
assert.ok(!JSON.stringify(config).includes("fourth-place"));
assert.ok(!JSON.stringify(config).includes("lower-bracket"));
assert.ok(!JSON.stringify(config).includes("toilet-bowl"));
assert.ok(!JSON.stringify(config).includes("season-high-score"));

assert.equal(getChampionshipAllocation(), CHAMPIONSHIP_ALLOCATION_CENTS);
assert.equal(CHAMPIONSHIP_ALLOCATION_CENTS, 23_500);
assert.equal(config.ringPolicy.defaultCapCents, DEFAULT_RING_CAP_CENTS);
assert.equal(DEFAULT_RING_CAP_CENTS, 8_000);

for (const [ringCents, championCents] of [
  [1_600, 21_900],
  [4_000, 19_500],
  [8_000, 15_500],
] as const) {
  const payout = calculateChampionPayout(ringCents);
  assert.equal(payout.resolved, true);
  assert.equal(payout.effectiveRingExpenseCents, ringCents);
  assert.equal(payout.championCashCents, championCents);
  assert.equal(
    (payout.championCashCents ?? 0) + (payout.effectiveRingExpenseCents ?? 0),
    CHAMPIONSHIP_ALLOCATION_CENTS
  );
}

const overCap = calculateChampionPayout(8_600);
assert.equal(overCap.resolved, false);
assert.equal(overCap.championCashCents, null);
assert.equal(overCap.effectiveRingExpenseCents, null);
assert.equal(overCap.ringValidation.overCapCents, 600);
assert.ok(overCap.ringValidation.errors.some((error) => error.code === "ring-over-approved-cap"));

const approvedOverride = calculateChampionPayout(8_600, 8_600);
assert.equal(approvedOverride.resolved, true);
assert.equal(approvedOverride.effectiveRingExpenseCents, 8_600);
assert.equal(approvedOverride.championCashCents, 14_900);
assert.equal(validateRingExpense(-1).valid, false);
assert.equal(validateRingExpense(8_600, 8_500).resolved, false);

assert.equal(getExpectedTotalAllocation(), BASE_DUES_POOL_CENTS);
assert.deepEqual(OPERATIONAL_FINANCE_RECONCILIATION_2026, {
  season: 2026,
  expectedDuesPoolCents: 60_000,
  expectedWeeklyAllocationCents: 14_000,
  expectedDivisionAllocationCents: 7_500,
  expectedFixedPlacementAllocationCents: 15_000,
  expectedChampionshipAllocationCents: 23_500,
  expectedTotalAllocationCents: 60_000,
  separatelyFundedExpensesReduceDuesPool: false,
  reconciles: true,
});

assert.deepEqual(config.expensePolicies.map((expense) => expense.category), ["auctioneer-food"]);
assert.equal(config.expensePolicies[0]?.fundingSource, "separately-funded");
assert.equal(config.expensePolicies[0]?.requiredEverySeason, false);
assert.ok(!JSON.stringify(config).includes("nameplate"));
assert.equal(config.commissionerFeeCents, 0);

assert.equal(config.paymentMethod, "venmo");
assert.equal(config.duesDeadlinePolicy.type, "before-draft");
assert.equal(config.duesDeadlinePolicy.fixedTimestamp, null);
assert.equal(config.duesDeadlinePolicy.resolvedFrom, "approved-draft-event");

assert.equal(config.weeklyAward.finality.officialResolver, "sleeper");
assert.equal(config.weeklyAward.finality.customTiebreaker, false);
assert.equal(config.weeklyAward.finality.requiredState, "sleeper-final");
assert.equal(config.divisionAwards.finality.officialResolver, "sleeper");
assert.equal(config.divisionAwards.finality.customTiebreaker, false);
assert.equal(config.divisionAwards.finality.requiredState, "sleeper-final");
assert.equal(config.championshipAllocation.finality.officialResolver, "sleeper");
assert.equal(config.championshipAllocation.finality.customTiebreaker, false);
assert.equal(config.championshipAllocation.finality.requiredState, "sleeper-final");

assert.equal(OPERATIONAL_FINANCIAL_OWNER_MAPPINGS_2026.length, 12);
assert.equal(new Set(config.financialOwnerMappings.map((mapping) => mapping.franchiseId)).size, 12);
assert.equal(mappingByFranchise.get("prestigio-mundial")?.financialOwnerId, "ray-long");
assert.deepEqual(mappingByFranchise.get("prestigio-mundial")?.excludedCoOwnerIds, ["jeffrey-hudgins"]);
assert.equal(mappingByFranchise.get("shake-n-bakers")?.financialOwnerId, "jordan-maslyn");
assert.deepEqual(mappingByFranchise.get("shake-n-bakers")?.excludedCoOwnerIds, ["landon-elliott"]);
assert.ok(!config.financialOwnerMappings.some((mapping) => mapping.financialOwnerId === "jeffrey-hudgins"));
assert.ok(!config.financialOwnerMappings.some((mapping) => mapping.financialOwnerId === "landon-elliott"));
assert.equal(config.identityRule.oneAssessmentPerCompetitiveFranchise, true);
assert.equal(config.identityRule.coOwnerSplitsOutsideLeagueLedger, true);

assert.deepEqual(config.publicDuesPolicy.visibleOwnerState, ["paid", "not-paid"]);
assert.deepEqual(config.publicDuesPolicy.publicFields, ["financialOwnerId", "paymentState"]);
assert.equal(config.publicDuesPolicy.aggregateDuesTotalsVisible, true);
assert.equal(config.publicDuesPolicy.approvedWinningsVisible, true);
assert.equal(config.publicDuesPolicy.approvedExpensesVisible, true);
assert.ok(config.publicDuesPolicy.privateFields.includes("amountOwedCents"));
assert.ok(config.publicDuesPolicy.privateFields.includes("paymentHandle"));
assert.ok(config.publicDuesPolicy.privateFields.includes("paymentTimestamp"));

assert.deepEqual(
  LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS.map((input) => input.financialOwnerId),
  ["david-besedich", "jd-dowling", "rashad-gresham", "ray-long", "wade-cameron"]
);
assert.ok(
  LEGACY_2026_CONFIRMED_PAID_MIGRATION_INPUTS.every(
    (input) =>
      input.migrationStatus === "future-input-only" &&
      input.authoritativePaidAt === null &&
      input.legacyTimestampAuthoritative === false
  )
);

function assertCentFieldsAreIntegers(value: unknown, pathParts: string[] = []) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key.endsWith("Cents") && child !== null) {
      assert.equal(Number.isSafeInteger(child), true, `${[...pathParts, key].join(".")} must be integer cents`);
    }
    assertCentFieldsAreIntegers(child, [...pathParts, key]);
  }
}
assertCentFieldsAreIntegers(config);

const mutableClone = JSON.parse(JSON.stringify(config)) as OperationalFinanceSeasonConfig;
const before = JSON.stringify(mutableClone);
assert.equal(validateOperationalFinanceRules(mutableClone).valid, true);
assert.equal(getExpectedTotalAllocation(mutableClone), 60_000);
assert.equal(JSON.stringify(mutableClone), before);
assert.equal(Object.isFrozen(config), true);
assert.equal(Object.isFrozen(config.financialOwnerMappings), true);
assert.equal(Object.isFrozen(calculateChampionPayout(1_600)), true);
assert.equal(Object.isFrozen(calculateChampionPayout(1_600).ringValidation.errors), true);

const rulesValidation = validateOperationalFinanceRules();
assert.equal(rulesValidation.valid, true);
assert.deepEqual(rulesValidation.errors, []);

const root = process.cwd();
const rulesSource = fs.readFileSync(
  path.join(root, "lib/finance/operationalFinanceRules.ts"),
  "utf8"
);
assert.doesNotMatch(rulesSource, /firebase-admin|firebase\/firestore|firestore\.|\.collection\(|\.doc\(/);
assert.match(rulesSource, /future-input-only/);

const firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
assert.match(
  firestoreRules,
  /match \/finance_rules\/\{document\}[\s\S]*?allow read, write: if false;/
);
assert.match(
  firestoreRules,
  /match \/finance_seasons\/\{season\}[\s\S]*?allow read, write: if false;/
);

console.log("Operational finance rules/types deterministic checks passed.");
