import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  OPERATIONAL_FINANCE_SEASON_2026,
} from "../lib/finance/operationalFinanceRules";
import {
  buildOperationalFinanceProposals,
  type OperationalFinanceBracketResultInput,
  type OperationalFinanceDivisionResultInput,
  type OperationalFinanceProposal,
  type OperationalFinanceProposalInput,
  type OperationalFinanceWeeklyResultInput,
} from "../lib/finance/operationalFinanceProposals";

const rules = OPERATIONAL_FINANCE_SEASON_2026;
const rosterMappings = rules.financialOwnerMappings.map((mapping, index) => ({
  rosterId: index + 1,
  franchiseId: mapping.franchiseId,
  sourceRef: `fixture:roster-${index + 1}`,
}));

function divisions(
  finalityState: OperationalFinanceDivisionResultInput["finalityState"] = "not-started"
): OperationalFinanceDivisionResultInput[] {
  return [1, 2, 3].map((divisionId) => ({
    divisionId: String(divisionId),
    divisionName: `Division ${divisionId}`,
    finalityState,
    sourceRef: `fixture:division-${divisionId}`,
    finalityEvidence: `Fixture division ${divisionId} evidence.`,
  }));
}

function baseInput(
  overrides: Partial<OperationalFinanceProposalInput> = {}
): OperationalFinanceProposalInput {
  return {
    rules,
    season: 2026,
    leagueId: "fixture-2026",
    currentWeek: 1,
    leagueState: "preseason",
    rosterMappings,
    weeklyResults: [],
    divisions: divisions(),
    snapshotTimestamp: "2026-08-11T12:00:00.000Z",
    ...overrides,
  };
}

function weekly(
  week: number,
  finalityState: OperationalFinanceWeeklyResultInput["finalityState"],
  officialWinnerRosterId?: number | null,
  tiedRosterIds: readonly number[] = []
): OperationalFinanceWeeklyResultInput {
  return {
    week,
    finalityState,
    officialWinnerRosterId,
    tiedRosterIds,
    officialWinnerPoints: 123.45,
    matchupId: 4,
    sourceRef: `fixture:week-${week}`,
    finalityEvidence: `Fixture Week ${week} finality.`,
  };
}

function bracket(
  finalityState: OperationalFinanceBracketResultInput["finalityState"],
  winnerRosterId?: number | null,
  loserRosterId?: number | null,
  label = "championship"
): OperationalFinanceBracketResultInput {
  return {
    finalityState,
    winnerRosterId,
    loserRosterId,
    bracketMatchId: label === "championship" ? 1 : 3,
    round: 3,
    sourceRef: `fixture:${label}`,
    finalityEvidence: `Fixture ${label} finality.`,
  };
}

function proposal(
  proposals: readonly OperationalFinanceProposal[],
  category: OperationalFinanceProposal["category"],
  suffix?: string
) {
  return proposals.find(
    (entry) =>
      entry.category === category &&
      (suffix === undefined || entry.proposalKey.endsWith(suffix))
  );
}

const root = process.cwd();
const corePath = path.join(root, "lib/finance/operationalFinanceProposals.ts");
const adapterPath = path.join(
  root,
  "lib/finance/operationalFinanceSleeperAdapter.ts"
);
const coreSource = fs.readFileSync(corePath, "utf8");
const adapterSource = fs.readFileSync(adapterPath, "utf8");

assert.doesNotMatch(coreSource, /\bfetch\s*\(|https?:\/\/|@\/lib\/sleeper/);
assert.doesNotMatch(
  coreSource,
  /firebase-admin|firebase\/firestore|firestore\.|\.collection\(|\.doc\(/
);
assert.doesNotMatch(
  adapterSource,
  /firebase-admin|firebase\/firestore|firestore\.|\.collection\(|\.doc\(/
);
assert.doesNotMatch(coreSource, /venmo|settlement|outstanding balance|payment date/i);

const preseason = buildOperationalFinanceProposals(baseInput());
const weeklySlots = preseason.proposals.filter(
  (entry) => entry.category === "weekly-high-score"
);
assert.equal(weeklySlots.length, 14);
assert.deepEqual(
  weeklySlots
    .map((entry) => Number(entry.proposalKey.split("week-")[1]))
    .sort((first, second) => first - second),
  Array.from({ length: 14 }, (_, index) => index + 1)
);
assert.ok(weeklySlots.every((entry) => entry.coverage === "not-yet-applicable"));
assert.ok(weeklySlots.every((entry) => entry.amountCents === null));

const week15 = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 16,
    leagueState: "regular-season",
    weeklyResults: [weekly(15, "sleeper-final", 1)],
  })
);
assert.ok(!week15.proposals.some((entry) => entry.proposalKey.endsWith("week-15")));

const incompleteWeek = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 1,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "in-progress")],
  })
);
assert.equal(proposal(incompleteWeek.proposals, "weekly-high-score", "week-1")?.proposalState, "pending-finality");
assert.equal(proposal(incompleteWeek.proposals, "weekly-high-score", "week-1")?.amountCents, null);

const finalWeek = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 2,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "sleeper-final", 1)],
  })
);
const weekOne = proposal(finalWeek.proposals, "weekly-high-score", "week-1");
assert.equal(weekOne?.proposalState, "proposed");
assert.equal(weekOne?.amountCents, 1_000);
assert.equal(weekOne?.financialOwnerId, "ray-long");
assert.equal(weekOne?.franchiseId, "prestigio-mundial");
assert.equal(weekOne?.sourceRef, "fixture:week-1");
assert.equal(weekOne?.sourceFacts.finalityEvidence, "Fixture Week 1 finality.");

const sleeperTieResolved = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 2,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "sleeper-final", 2, [1, 2])],
  })
);
assert.equal(
  proposal(sleeperTieResolved.proposals, "weekly-high-score", "week-1")?.financialOwnerId,
  "jd-dowling"
);

const unresolvedTie = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 2,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "sleeper-final", null, [1, 2])],
  })
);
assert.equal(proposal(unresolvedTie.proposals, "weekly-high-score", "week-1")?.coverage, "unresolved-sleeper-tie");
assert.equal(proposal(unresolvedTie.proposals, "weekly-high-score", "week-1")?.amountCents, null);
assert.ok(unresolvedTie.issues.some((entry) => entry.code === "unresolved-sleeper-weekly-tie"));
assert.ok(
  unresolvedTie.issues.some((entry) =>
    entry.message.includes("Sleeper's authoritative displayed winner must be commissioner-confirmed")
  )
);
assert.match(
  proposal(unresolvedTie.proposals, "weekly-high-score", "week-1")?.notes.join(" ") ?? "",
  /not split.*no River City fallback tiebreak/
);
assert.equal(
  finalWeek.proposals.filter((entry) => entry.proposalKey.endsWith("week-1")).length,
  1
);

const finalDivisions = divisions("sleeper-final").map((division, index) => ({
  ...division,
  sleeperOrderedRosterIds: [index + 1, index + 4, index + 7, index + 10],
}));
const divisionSet = buildOperationalFinanceProposals(
  baseInput({ leagueState: "postseason", divisions: finalDivisions })
);
const divisionProposals = divisionSet.proposals.filter(
  (entry) => entry.category === "division-winner"
);
assert.equal(divisionProposals.length, 3);
assert.ok(divisionProposals.every((entry) => entry.proposalState === "proposed"));
assert.ok(divisionProposals.every((entry) => entry.amountCents === 2_500));
assert.deepEqual(
  divisionProposals.map((entry) => entry.financialOwnerId),
  ["ray-long", "jd-dowling", "jordan-maslyn"]
);
assert.ok(divisionProposals.every((entry) => entry.reason.includes("Sleeper")));

const missingDivisionOrder = buildOperationalFinanceProposals(
  baseInput({ leagueState: "postseason", divisions: divisions("sleeper-final") })
);
assert.ok(
  missingDivisionOrder.proposals
    .filter((entry) => entry.category === "division-winner")
    .every((entry) => entry.coverage === "source-unavailable")
);

const placementSet = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "complete",
    thirdPlaceResult: bracket("sleeper-final", 4, 5, "third-place"),
    championshipResult: bracket("sleeper-final", 1, 2),
    approvedRingCostCents: 1_600,
  })
);
assert.equal(proposal(placementSet.proposals, "third-place")?.amountCents, 5_000);
assert.equal(proposal(placementSet.proposals, "third-place")?.financialOwnerId, "tommy-moore");
assert.equal(proposal(placementSet.proposals, "runner-up")?.amountCents, 10_000);
assert.equal(proposal(placementSet.proposals, "runner-up")?.financialOwnerId, "jd-dowling");

const forbiddenCategories = [
  "fourth-place",
  "lower-bracket",
  "toilet-bowl",
  "season-high-score",
  "recap-forfeiture",
  "rollover",
  "dues",
];
assert.ok(
  placementSet.proposals.every(
    (entry) => !forbiddenCategories.includes(entry.category)
  )
);

const championPending = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "postseason",
    championshipResult: bracket("in-progress", 1, 2),
  })
);
assert.equal(proposal(championPending.proposals, "champion")?.proposalState, "pending-finality");
assert.equal(proposal(championPending.proposals, "champion")?.amountCents, null);

const ambiguousBracket = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "postseason",
    thirdPlaceResult: bracket("unresolved", null, null, "third-place"),
    championshipResult: bracket("unresolved"),
  })
);
assert.equal(proposal(ambiguousBracket.proposals, "third-place")?.proposalState, "unresolved");
assert.equal(proposal(ambiguousBracket.proposals, "runner-up")?.proposalState, "unresolved");
assert.equal(proposal(ambiguousBracket.proposals, "champion")?.proposalState, "unresolved");
assert.ok(
  ambiguousBracket.proposals
    .filter((entry) => ["third-place", "runner-up", "champion"].includes(entry.category))
    .every((entry) => entry.amountCents === null && entry.coverage === "source-unavailable")
);
assert.ok(
  ambiguousBracket.issues.some(
    (entry) => entry.code === "ambiguous-championship-source"
  )
);

const pendingRing = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "complete",
    championshipResult: bracket("sleeper-final", 1, 2),
  })
);
assert.equal(proposal(pendingRing.proposals, "champion")?.coverage, "pending-ring-cost");
assert.equal(proposal(pendingRing.proposals, "champion")?.amountCents, null);
assert.equal(proposal(pendingRing.proposals, "championship-ring-expense"), undefined);

for (const [ringCostCents, championCashCents] of [
  [1_600, 21_900],
  [4_000, 19_500],
  [8_000, 15_500],
] as const) {
  const result = buildOperationalFinanceProposals(
    baseInput({
      leagueState: "complete",
      championshipResult: bracket("sleeper-final", 1, 2),
      approvedRingCostCents: ringCostCents,
    })
  );
  const champion = proposal(result.proposals, "champion");
  const ring = proposal(result.proposals, "championship-ring-expense");
  assert.equal(champion?.amountCents, championCashCents);
  assert.equal(ring?.amountCents, ringCostCents);
  assert.equal((champion?.amountCents ?? 0) + (ring?.amountCents ?? 0), 23_500);
  assert.equal(ring?.financialOwnerId, null);
  assert.ok(ring?.notes.includes("This is a league expense, not owner cash winnings."));
}

const overCap = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "complete",
    championshipResult: bracket("sleeper-final", 1, 2),
    approvedRingCostCents: 8_600,
  })
);
assert.equal(proposal(overCap.proposals, "champion")?.amountCents, null);
assert.equal(proposal(overCap.proposals, "champion")?.coverage, "ring-cap-override-required");
assert.equal(proposal(overCap.proposals, "championship-ring-expense")?.amountCents, null);

const overCapApproved = buildOperationalFinanceProposals(
  baseInput({
    leagueState: "complete",
    championshipResult: bracket("sleeper-final", 1, 2),
    approvedRingCostCents: 8_600,
    approvedRingCapOverrideCents: 8_600,
  })
);
assert.equal(proposal(overCapApproved.proposals, "champion")?.amountCents, 14_900);
assert.equal(proposal(overCapApproved.proposals, "championship-ring-expense")?.amountCents, 8_600);

const rayAward = proposal(finalWeek.proposals, "weekly-high-score", "week-1");
assert.equal(rayAward?.financialOwnerId, "ray-long");
assert.ok(!finalWeek.proposals.some((entry) => entry.financialOwnerId === "jeffrey-hudgins"));

const jordanAward = buildOperationalFinanceProposals(
  baseInput({
    currentWeek: 2,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "sleeper-final", 3)],
  })
);
assert.equal(proposal(jordanAward.proposals, "weekly-high-score", "week-1")?.financialOwnerId, "jordan-maslyn");
assert.ok(!jordanAward.proposals.some((entry) => entry.financialOwnerId === "landon-elliott"));

for (const unsafeFranchiseId of ["unresolved-franchise", "commissioner-helper"]) {
  const unsafeMappings = rosterMappings.map((mapping) =>
    mapping.rosterId === 1 ? { ...mapping, franchiseId: unsafeFranchiseId } : mapping
  );
  const unsafe = buildOperationalFinanceProposals(
    baseInput({
      currentWeek: 2,
      leagueState: "regular-season",
      rosterMappings: unsafeMappings,
      weeklyResults: [weekly(1, "sleeper-final", 1)],
    })
  );
  assert.equal(proposal(unsafe.proposals, "weekly-high-score", "week-1")?.coverage, "unresolved-identity");
  assert.equal(proposal(unsafe.proposals, "weekly-high-score", "week-1")?.amountCents, null);
}

const keys = placementSet.proposals.map((entry) => entry.proposalKey);
assert.equal(new Set(keys).size, keys.length);
assert.ok(keys.includes("operational-finance-proposal:2026:weekly-high-score:week-1"));
assert.ok(keys.includes("operational-finance-proposal:2026:division-winner:1"));
assert.ok(keys.includes("operational-finance-proposal:2026:third-place"));
assert.ok(keys.includes("operational-finance-proposal:2026:runner-up"));
assert.ok(keys.includes("operational-finance-proposal:2026:champion"));
assert.ok(keys.includes("operational-finance-proposal:2026:championship-ring-expense"));

const duplicateDivisionInput = buildOperationalFinanceProposals(
  baseInput({ divisions: [divisions()[0], divisions()[0], ...divisions().slice(1)] })
);
const duplicateSafeKeys = duplicateDivisionInput.proposals.map(
  (entry) => entry.proposalKey
);
assert.equal(new Set(duplicateSafeKeys).size, duplicateSafeKeys.length);
assert.ok(
  duplicateDivisionInput.issues.some(
    (entry) => entry.code === "duplicate-proposal-key"
  )
);

const deterministicInput = baseInput({
  currentWeek: 2,
  leagueState: "regular-season",
  weeklyResults: [weekly(1, "sleeper-final", 1)],
});
const inputBefore = JSON.stringify(deterministicInput);
const firstBuild = buildOperationalFinanceProposals(deterministicInput);
const secondBuild = buildOperationalFinanceProposals(deterministicInput);
assert.deepEqual(firstBuild, secondBuild);
assert.equal(JSON.stringify(deterministicInput), inputBefore);
assert.equal(Object.isFrozen(firstBuild), true);
assert.equal(Object.isFrozen(firstBuild.proposals), true);
assert.equal(Object.isFrozen(firstBuild.proposals[0]), true);
assert.equal(Object.isFrozen(firstBuild.proposals[0].sourceFacts), true);

assert.ok(
  firstBuild.proposals.every(
    (entry) => !(["approved", "paid", "settled"] as string[]).includes(entry.proposalState)
  )
);
assert.ok(
  firstBuild.proposals
    .filter((entry) => entry.proposalState !== "proposed")
    .every((entry) => entry.amountCents === null)
);
assert.ok(firstBuild.proposals.every((entry) => entry.ruleRef && entry.sourceRef));
assert.ok(
  firstBuild.proposals.every(
    (entry) => Object.keys(entry.sourceFacts).length > 0
  )
);

console.log("Operational finance proposal engine fixture checks passed.");
