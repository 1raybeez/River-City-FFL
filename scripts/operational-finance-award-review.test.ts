import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  approveOperationalFinanceAward,
  buildOperationalFinanceCommissionerDashboardPresentation,
  getOperationalFinanceProposalFingerprint,
  parseCommissionerAwardApprovalRequest,
  type OperationalFinanceAwardProposalSource,
} from "../lib/finance/operationalFinanceAwardReview";
import { apply2026OpeningDuesMigration } from "../lib/finance/operationalFinanceLedger";
import { InMemoryOperationalFinanceLedgerRepository } from "../lib/finance/operationalFinanceLedgerMemory";
import type { OperationalFinanceActor } from "../lib/finance/operationalFinanceLedgerTypes";
import {
  buildOperationalFinanceProposals,
  type OperationalFinanceBracketResultInput,
  type OperationalFinanceDivisionResultInput,
  type OperationalFinanceProposal,
  type OperationalFinanceProposalInput,
  type OperationalFinanceWeeklyResultInput,
} from "../lib/finance/operationalFinanceProposals";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "../lib/finance/operationalFinanceRules";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const rules = OPERATIONAL_FINANCE_SEASON_2026;
const recordedAt = "2026-09-20T14:00:00.000Z";
const commissioner: OperationalFinanceActor = {
  actorId: "commissioner:test@example.com",
  role: "commissioner",
};
const systemActor: OperationalFinanceActor = {
  actorId: "system:test",
  role: "system",
};
const rosterMappings = rules.financialOwnerMappings.map((mapping, index) => ({
  rosterId: index + 1,
  franchiseId: mapping.franchiseId,
  sourceRef: `fixture:roster-${index + 1}`,
}));

function divisions(
  finalityState: OperationalFinanceDivisionResultInput["finalityState"] = "not-started",
  withOrder = false
): OperationalFinanceDivisionResultInput[] {
  return [1, 2, 3].map((divisionId) => ({
    divisionId: String(divisionId),
    divisionName: `Division ${divisionId}`,
    finalityState,
    sleeperOrderedRosterIds: withOrder
      ? [divisionId, divisionId + 3, divisionId + 6, divisionId + 9]
      : undefined,
    sourceRef: `fixture:division-${divisionId}`,
    finalityEvidence: `Fixture Division ${divisionId} Sleeper evidence.`,
  }));
}

function weekly(
  week: number,
  finalityState: OperationalFinanceWeeklyResultInput["finalityState"],
  winnerRosterId?: number | null,
  tiedRosterIds: readonly number[] = []
): OperationalFinanceWeeklyResultInput {
  return {
    week,
    finalityState,
    officialWinnerRosterId: winnerRosterId,
    tiedRosterIds,
    officialWinnerPoints: 144.32,
    matchupId: 4,
    sourceRef: `sleeper:league:fixture-2026:matchups:week-${week}`,
    finalityEvidence: `Sleeper finalized fixture Week ${week}.`,
  };
}

function bracket(
  finalityState: OperationalFinanceBracketResultInput["finalityState"],
  winnerRosterId?: number | null,
  loserRosterId?: number | null,
  label: "championship" | "third-place" = "championship"
): OperationalFinanceBracketResultInput {
  return {
    finalityState,
    winnerRosterId,
    loserRosterId,
    bracketMatchId: label === "championship" ? 1 : 3,
    round: 3,
    sourceRef: `sleeper:league:fixture-2026:winners-bracket:${label}`,
    finalityEvidence: `Sleeper finalized fixture ${label}.`,
  };
}

function input(
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
    snapshotTimestamp: "2026-09-20T13:59:00.000Z",
    ...overrides,
  };
}

function source(proposalInput: OperationalFinanceProposalInput): OperationalFinanceAwardProposalSource {
  return {
    proposalSet: buildOperationalFinanceProposals(proposalInput),
    acquisition: {
      leagueId: proposalInput.leagueId,
      leagueStatus: proposalInput.leagueState === "preseason" ? "pre_draft" : "in_season",
      leagueState: proposalInput.leagueState,
      nflSeason: "2026",
      nflSeasonType: proposalInput.leagueState === "preseason" ? "pre" : "regular",
      nflWeek: proposalInput.currentWeek,
      leagueWeek: proposalInput.currentWeek,
      playoffWeekStart: 15,
      rosterCount: 12,
      userCount: 16,
      divisionCount: 3,
      fetchedMatchupWeeks: proposalInput.weeklyResults.map((entry) => entry.week),
      winnersBracketRows: 7,
      losersBracketRows: 7,
      acquiredAt: proposalInput.snapshotTimestamp ?? recordedAt,
    },
    sourceError: null,
  };
}

function findProposal(
  proposalSource: OperationalFinanceAwardProposalSource,
  category: OperationalFinanceProposal["category"],
  suffix?: string
) {
  return proposalSource.proposalSet.proposals.find(
    (entry) =>
      entry.category === category &&
      (suffix === undefined || entry.proposalKey.endsWith(suffix))
  )!;
}

function approvalRequest(proposal: OperationalFinanceProposal, key: string) {
  return {
    proposalKey: proposal.proposalKey,
    proposalFingerprint: getOperationalFinanceProposalFingerprint(proposal),
    idempotencyKey: key,
  };
}

async function rejects(operation: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(operation, pattern);
}

async function main() {
  const repository = new InMemoryOperationalFinanceLedgerRepository();
  await apply2026OpeningDuesMigration(repository, systemActor, recordedAt);

  const preseasonSource = source(input());
  const preseasonDashboard = buildOperationalFinanceCommissionerDashboardPresentation(
    await repository.getSnapshot(),
    2026,
    preseasonSource
  );
  assert.equal(preseasonSource.proposalSet.coverage.proposed, 0);
  assert.equal(preseasonSource.proposalSet.coverage.notYetApplicable, 20);
  assert.equal(preseasonDashboard.awardReview.summary.needsReviewCount, 0);
  assert.equal(preseasonDashboard.awardReview.summary.waitingCount, 20);
  assert.equal(preseasonDashboard.awardReview.weeklySummary.totalCount, 14);
  assert.equal(preseasonDashboard.awardReview.weeklySummary.waitingCount, 14);
  assert.equal(preseasonDashboard.awardReview.emptyStateTitle, "No awards need your review right now.");
  assert.match(preseasonDashboard.awardReview.emptyStateDetail ?? "", /Sleeper finalizes/);

  const proposedSource = source(
    input({
      currentWeek: 2,
      leagueState: "regular-season",
      weeklyResults: [weekly(1, "sleeper-final", 4)],
      divisions: divisions("in-progress"),
    })
  );
  const weekOne = findProposal(proposedSource, "weekly-high-score", "week-1");
  assert.equal(weekOne.proposalState, "proposed");
  assert.equal(weekOne.amountCents, 1_000);
  assert.equal(weekOne.financialOwnerId, "tommy-moore");
  assert.equal(weekOne.franchiseId, "the-shepherd");
  const proposedDashboard = buildOperationalFinanceCommissionerDashboardPresentation(
    await repository.getSnapshot(),
    2026,
    proposedSource
  );
  assert.equal(proposedDashboard.awardReview.needsReview.length, 1);
  assert.equal(proposedDashboard.awardReview.needsReview[0].statusLabel, "NEEDS REVIEW");
  assert.equal(proposedDashboard.awardReview.needsReview[0].score, 144.32);
  assert.equal(proposedDashboard.awardReview.needsReview[0].financialOwnerName, "Tommy Moore");

  const raySource = source(input({ currentWeek: 2, leagueState: "regular-season", weeklyResults: [weekly(1, "sleeper-final", 1)] }));
  assert.equal(findProposal(raySource, "weekly-high-score", "week-1").financialOwnerId, "ray-long");
  assert.ok(!raySource.proposalSet.proposals.some((entry) => entry.financialOwnerId === "jeffrey-hudgins"));
  const jordanSource = source(input({ currentWeek: 2, leagueState: "regular-season", weeklyResults: [weekly(1, "sleeper-final", 3)] }));
  assert.equal(findProposal(jordanSource, "weekly-high-score", "week-1").financialOwnerId, "jordan-maslyn");
  assert.ok(!jordanSource.proposalSet.proposals.some((entry) => entry.financialOwnerId === "landon-elliott"));

  assert.throws(
    () => parseCommissionerAwardApprovalRequest({ ...approvalRequest(weekOne, "award:test:override"), amountCents: 1 }),
    /Unsupported award approval field: amountCents/
  );
  assert.throws(
    () => parseCommissionerAwardApprovalRequest({ ...approvalRequest(weekOne, "award:test:owner"), financialOwnerId: "ray-long" }),
    /Unsupported award approval field: financialOwnerId/
  );
  assert.throws(
    () => parseCommissionerAwardApprovalRequest({ ...approvalRequest(weekOne, "award:test:category"), category: "champion" }),
    /Unsupported award approval field: category/
  );

  let reacquisitions = 0;
  const reacquireProposed = async () => {
    reacquisitions += 1;
    return proposedSource;
  };
  const beforeApproval = await repository.getSnapshot();
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(weekOne, "award:test:unauthorized"), systemActor, recordedAt, reacquireProposed),
    /Commissioner authorization/
  );
  assert.equal(reacquisitions, 0);

  const pendingSource = source(input({ currentWeek: 1, leagueState: "regular-season", weeklyResults: [weekly(1, "in-progress")] }));
  const pendingWeek = findProposal(pendingSource, "weekly-high-score", "week-1");
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(pendingWeek, "award:test:pending"), commissioner, recordedAt, async () => pendingSource),
    /no longer ready/
  );
  const unresolvedSource = source(input({ currentWeek: 2, leagueState: "regular-season", weeklyResults: [weekly(1, "sleeper-final", null, [1, 2])] }));
  const unresolvedWeek = findProposal(unresolvedSource, "weekly-high-score", "week-1");
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(unresolvedWeek, "award:test:unresolved"), commissioner, recordedAt, async () => unresolvedSource),
    /no longer ready/
  );
  const notApplicableWeek = findProposal(preseasonSource, "weekly-high-score", "week-1");
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(notApplicableWeek, "award:test:not-applicable"), commissioner, recordedAt, async () => preseasonSource),
    /no longer ready/
  );

  const changedSource = source(input({ currentWeek: 2, leagueState: "regular-season", weeklyResults: [weekly(1, "sleeper-final", 5)] }));
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(weekOne, "award:test:stale"), commissioner, recordedAt, async () => changedSource),
    /Sleeper's result changed/
  );

  const approval = await approveOperationalFinanceAward(
    repository,
    2026,
    approvalRequest(weekOne, "award:test:week-1"),
    commissioner,
    recordedAt,
    reacquireProposed
  );
  assert.equal(reacquisitions, 1);
  assert.equal(approval.created, true);
  assert.equal(approval.obligation.amountCents, 1_000);
  assert.equal(approval.obligation.financialOwnerId, "tommy-moore");
  assert.equal(approval.obligation.franchiseId, "the-shepherd");
  assert.equal(approval.obligation.proposalKey, weekOne.proposalKey);
  assert.equal(approval.obligation.proposalEvidence?.leagueId, "fixture-2026");
  assert.equal(approval.obligation.proposalEvidence?.facts.week, 1);
  assert.equal(approval.obligation.proposalEvidence?.facts.winnerPoints, 144.32);
  assert.equal(approval.dashboard.awardReview.needsReview.length, 0);
  assert.equal(approval.dashboard.awardReview.approvedAwards.length, 1);
  assert.equal(approval.dashboard.awardReview.approvedAwards[0].paymentStatusLabel, "UNPAID");
  assert.equal(approval.dashboard.summary.approvedAwardsCents, 1_000);
  assert.equal(approval.dashboard.summary.paidAwardsCents, 0);
  assert.ok(approval.dashboard.recentActivity.some((entry) => entry.eventLabel === "Weekly High Score approved"));

  const afterApproval = await repository.getSnapshot();
  assert.equal(afterApproval.obligations.length, beforeApproval.obligations.length + 1);
  assert.equal(afterApproval.settlements.length, beforeApproval.settlements.length);
  assert.equal(afterApproval.auditEvents.length, beforeApproval.auditEvents.length + 1);
  const duplicate = await approveOperationalFinanceAward(
    repository,
    2026,
    approvalRequest(weekOne, "award:test:week-1"),
    commissioner,
    "2026-09-20T14:01:00.000Z",
    async () => proposedSource
  );
  assert.equal(duplicate.created, false);
  assert.equal((await repository.getSnapshot()).obligations.length, afterApproval.obligations.length);

  const twoAwardsSource = source(input({
    currentWeek: 3,
    leagueState: "regular-season",
    weeklyResults: [weekly(1, "sleeper-final", 4), weekly(2, "sleeper-final", 5)],
  }));
  const weekTwo = findProposal(twoAwardsSource, "weekly-high-score", "week-2");
  await rejects(
    () => approveOperationalFinanceAward(repository, 2026, approvalRequest(weekTwo, "award:test:week-1"), commissioner, recordedAt, async () => twoAwardsSource),
    /Idempotency key was already used/
  );

  const discrepancy = buildOperationalFinanceCommissionerDashboardPresentation(
    await repository.getSnapshot(),
    2026,
    changedSource
  );
  assert.equal(discrepancy.awardReview.approvedAwards.length, 1);
  assert.match(discrepancy.awardReview.approvedAwards[0].discrepancy ?? "", /no ledger record was changed/i);
  assert.equal((await repository.getSnapshot()).obligations.find((entry) => entry.proposalKey === weekOne.proposalKey)?.financialOwnerId, "tommy-moore");

  const finalDivisions = source(input({ leagueState: "postseason", divisions: divisions("sleeper-final", true) }));
  assert.ok(finalDivisions.proposalSet.proposals.filter((entry) => entry.category === "division-winner").every((entry) => entry.proposalState === "proposed"));
  const missingDivision = source(input({ leagueState: "postseason", divisions: divisions("sleeper-final") }));
  assert.ok(missingDivision.proposalSet.proposals.filter((entry) => entry.category === "division-winner").every((entry) => entry.proposalState === "unresolved"));

  const placements = source(input({
    leagueState: "complete",
    thirdPlaceResult: bracket("sleeper-final", 4, 5, "third-place"),
    championshipResult: bracket("sleeper-final", 1, 2),
    approvedRingCostCents: 1_600,
  }));
  assert.equal(findProposal(placements, "third-place").amountCents, 5_000);
  assert.equal(findProposal(placements, "third-place").financialOwnerId, "tommy-moore");
  assert.equal(findProposal(placements, "runner-up").amountCents, 10_000);
  assert.equal(findProposal(placements, "runner-up").financialOwnerId, "jd-dowling");
  assert.equal(findProposal(placements, "champion").financialOwnerId, "ray-long");
  assert.ok(!placements.proposalSet.proposals.some((entry) => ["fourth-place", "lower-bracket", "season-high-score"].includes(entry.category)));
  const ambiguous = source(input({ leagueState: "postseason", championshipResult: bracket("unresolved"), thirdPlaceResult: bracket("unresolved", null, null, "third-place") }));
  assert.ok(ambiguous.proposalSet.proposals.filter((entry) => ["third-place", "runner-up", "champion"].includes(entry.category)).every((entry) => entry.proposalState === "unresolved"));
  const championWithoutRing = source(input({ leagueState: "complete", championshipResult: bracket("sleeper-final", 1, 2) }));
  assert.equal(findProposal(championWithoutRing, "champion").coverage, "pending-ring-cost");
  assert.equal(findProposal(championWithoutRing, "champion").amountCents, null);
  assert.equal(championWithoutRing.proposalSet.proposals.find((entry) => entry.category === "championship-ring-expense"), undefined);

  const route = read("app/api/commish/finance/[season]/awards/approve/route.ts");
  assert.match(route, /requireOperationalFinanceCommissioner/);
  assert.match(route, /Commissioner access required/);
  assert.match(route, /Cross-origin request denied/);
  assert.match(route, /acquireOperationalFinanceAwardProposalSource/);
  assert.match(route, /approveOperationalFinanceAward/);
  assert.doesNotMatch(route, /firebase\/firestore|@\/lib\/firebase(?:"|')/);
  const client = read("app/commish/finance/2026/OperationalFinanceAwardReviewSection.tsx");
  assert.doesNotMatch(client, /firebase\/firestore|@\/lib\/firebase/);
  assert.match(client, /aria-expanded/);
  assert.match(client, /Confirm Award/);
  assert.match(client, /It does not mark the award as paid/);
  assert.match(client, /crypto\.randomUUID/);
  assert.doesNotMatch(client, /Mark Paid|Reverse|Delete|ring cost input/i);
  assert.doesNotMatch(client, /amountCents,\s*financialOwnerId|franchiseId,\s*amountCents/);
  assert.ok(!fs.existsSync(path.join(root, "app/api/commish/finance/2026/awards/pay")));
  assert.ok(!fs.existsSync(path.join(root, "app/finance/2026/page.tsx")));
  assert.ok(!fs.existsSync(path.join(root, "app/league-info/finance/2026/page.tsx")));
  const awardCore = read("lib/finance/operationalFinanceAwardReview.ts");
  assert.doesNotMatch(awardCore, /firebase-admin|firebase\/firestore|\.collection\(/);
  assert.match(awardCore, /Sleeper's result changed/);
  assert.match(awardCore, /recordApprovedAwardProposal/);

  console.log("Operational finance award review checks passed (fixtures/in-memory only; production untouched).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
