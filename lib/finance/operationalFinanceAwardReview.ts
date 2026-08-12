import { createHash } from "node:crypto";

import {
  buildOperationalFinanceDashboardPresentation,
  type OperationalFinanceDashboardPresentation,
} from "@/lib/finance/operationalFinanceDashboardPresentation";
import {
  proposalKeyToObligationId,
  recordApprovedAwardProposal,
} from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceActor,
  OperationalFinanceLedgerRepository,
  OperationalFinanceLedgerSnapshot,
  OperationalFinanceObligation,
} from "@/lib/finance/operationalFinanceLedgerTypes";
import {
  buildOperationalFinanceProposals,
  type OperationalFinanceProposal,
  type OperationalFinanceProposalCategory,
  type OperationalFinanceProposalSet,
} from "@/lib/finance/operationalFinanceProposals";
import {
  acquireOperationalFinanceSleeperSnapshot,
  type OperationalFinanceSleeperAcquisitionSummary,
} from "@/lib/finance/operationalFinanceSleeperAdapter";
import { getFranchiseById, getOwnerProfileById } from "@/lib/managers/identityData";
import type { OperationalFinancePaymentContact } from "@/lib/finance/operationalFinancePaymentContacts";
import {
  reconcileOperationalFinance,
  type OperationalFinanceReconciliation,
} from "@/lib/finance/operationalFinanceReconciliation";

const APPROVABLE_CATEGORIES = new Set<OperationalFinanceProposalCategory>([
  "weekly-high-score",
  "division-winner",
  "third-place",
  "runner-up",
  "champion",
]);

type AwardPaymentState = "unpaid" | "partially-paid" | "paid";

export type OperationalFinanceAwardReviewItem = Readonly<{
  proposalKey: string;
  proposalFingerprint: string;
  category: Exclude<OperationalFinanceProposalCategory, "championship-ring-expense">;
  categoryLabel: string;
  eventLabel: string;
  financialOwnerId: string;
  financialOwnerName: string;
  franchiseId: string;
  franchiseName: string;
  amountCents: number;
  score: number | null;
  sourceLabel: string;
  statusLabel: "NEEDS REVIEW";
}>;

export type OperationalFinanceApprovedAwardItem = Readonly<{
  obligationId: string;
  proposalKey: string;
  financialOwnerId: string;
  categoryLabel: string;
  eventLabel: string;
  financialOwnerName: string;
  franchiseName: string;
  amountCents: number;
  settledCents: number;
  remainingCents: number;
  paymentState: AwardPaymentState;
  paymentStatusLabel: "UNPAID" | "PARTIAL" | "PAID";
  approvedAt: string;
  discrepancy: string | null;
  paymentContact: Readonly<{
    method: "venmo";
    handle: string;
    status: "active" | "unverified" | "inactive";
  }> | null;
}>;

export type OperationalFinanceAwardIssue = Readonly<{
  proposalKey: string | null;
  title: string;
  message: string;
}>;

export type OperationalFinanceAwardReviewPresentation = Readonly<{
  sourceStatus: "available" | "unavailable";
  sourceLabel: string;
  acquiredAt: string | null;
  summary: Readonly<{
    needsReviewCount: number;
    waitingCount: number;
    approvedCount: number;
    paidCount: number;
    issuesCount: number;
  }>;
  needsReview: readonly OperationalFinanceAwardReviewItem[];
  approvedAwards: readonly OperationalFinanceApprovedAwardItem[];
  issues: readonly OperationalFinanceAwardIssue[];
  weeklySummary: Readonly<{
    totalCount: number;
    approvedCount: number;
    needsReviewCount: number;
    waitingCount: number;
    issuesCount: number;
  }>;
  waitingByCategory: readonly Readonly<{
    categoryLabel: string;
    count: number;
  }>[];
  emptyStateTitle: string | null;
  emptyStateDetail: string | null;
}>;

export type OperationalFinanceCommissionerDashboardPresentation =
  OperationalFinanceDashboardPresentation &
    Readonly<{
      awardReview: OperationalFinanceAwardReviewPresentation;
      reconciliation: OperationalFinanceReconciliation;
    }>;

export type OperationalFinanceAwardProposalSource = Readonly<{
  proposalSet: OperationalFinanceProposalSet;
  acquisition: OperationalFinanceSleeperAcquisitionSummary | null;
  sourceError: string | null;
}>;

export type CommissionerAwardApprovalRequest = Readonly<{
  proposalKey: string;
  proposalFingerprint: string;
  idempotencyKey: string;
}>;

const ALLOWED_APPROVAL_FIELDS = new Set([
  "proposalKey",
  "proposalFingerprint",
  "idempotencyKey",
]);

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, child]) => [key, stableValue(child)])
    );
  }
  return value;
}

export function getOperationalFinanceProposalFingerprint(
  proposal: OperationalFinanceProposal
) {
  const authoritativeReviewFacts = {
    proposalKey: proposal.proposalKey,
    season: proposal.season,
    category: proposal.category,
    amountCents: proposal.amountCents,
    financialOwnerId: proposal.financialOwnerId,
    franchiseId: proposal.franchiseId,
    sourceType: proposal.sourceType,
    sourceRef: proposal.sourceRef,
    sourceFacts: proposal.sourceFacts,
    finalityState: proposal.finalityState,
    proposalState: proposal.proposalState,
    ruleRef: proposal.ruleRef,
  };
  return createHash("sha256")
    .update(JSON.stringify(stableValue(authoritativeReviewFacts)))
    .digest("hex");
}

export function parseCommissionerAwardApprovalRequest(
  input: unknown
): CommissionerAwardApprovalRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("An award approval request object is required.");
  }
  const record = input as Record<string, unknown>;
  const unsupported = Object.keys(record).filter(
    (key) => !ALLOWED_APPROVAL_FIELDS.has(key)
  );
  if (unsupported.length > 0) {
    throw new Error(`Unsupported award approval field: ${unsupported[0]}.`);
  }
  if (
    typeof record.proposalKey !== "string" ||
    !/^operational-finance-proposal:2026:[a-z0-9-]+(?::[a-z0-9-]+)?$/.test(
      record.proposalKey
    )
  ) {
    throw new Error("A valid 2026 award proposal key is required.");
  }
  if (
    typeof record.proposalFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/.test(record.proposalFingerprint)
  ) {
    throw new Error("A valid award review fingerprint is required.");
  }
  if (
    typeof record.idempotencyKey !== "string" ||
    !/^[a-zA-Z0-9:._-]{8,240}$/.test(record.idempotencyKey)
  ) {
    throw new Error("A valid award approval idempotency key is required.");
  }
  return {
    proposalKey: record.proposalKey,
    proposalFingerprint: record.proposalFingerprint,
    idempotencyKey: record.idempotencyKey,
  };
}

function categoryLabel(category: OperationalFinanceProposalCategory) {
  if (category === "weekly-high-score") return "Weekly High Score";
  if (category === "division-winner") return "Division Winner";
  if (category === "third-place") return "Third Place";
  if (category === "runner-up") return "Runner-Up";
  if (category === "champion") return "Champion";
  return "Championship Ring";
}

function eventLabelFromProposal(proposal: OperationalFinanceProposal) {
  if (proposal.category === "weekly-high-score") {
    const week = proposal.sourceFacts.week;
    return typeof week === "number" ? `Week ${week}` : "Weekly Award";
  }
  if (proposal.category === "division-winner") {
    const name = proposal.sourceFacts.divisionName;
    return typeof name === "string" && name ? name : "Division Award";
  }
  return categoryLabel(proposal.category);
}

function eventLabelFromObligation(obligation: OperationalFinanceObligation) {
  const week = obligation.proposalEvidence?.facts.week;
  if (obligation.category === "weekly-high-score" && typeof week === "number") {
    return `Week ${week}`;
  }
  const divisionName = obligation.proposalEvidence?.facts.divisionName;
  if (obligation.category === "division-winner" && typeof divisionName === "string") {
    return divisionName;
  }
  return categoryLabel(obligation.category as OperationalFinanceProposalCategory);
}

function obligationMatchesProposal(
  obligation: OperationalFinanceObligation,
  proposal: OperationalFinanceProposal
) {
  return (
    obligation.proposalKey === proposal.proposalKey &&
    obligation.category === proposal.category &&
    obligation.amountCents === proposal.amountCents &&
    obligation.financialOwnerId === proposal.financialOwnerId &&
    obligation.franchiseId === proposal.franchiseId &&
    obligation.ruleRef === proposal.ruleRef &&
    obligation.sourceRef === proposal.sourceRef
  );
}

function awardPaymentState(
  obligation: OperationalFinanceObligation,
  snapshot: OperationalFinanceLedgerSnapshot,
  reversedSettlementIds: ReadonlySet<string>
) {
  const settledCents = snapshot.settlements
    .filter(
      (entry) =>
        entry.obligationId === obligation.obligationId &&
        entry.direction === "outgoing-award" &&
        !reversedSettlementIds.has(entry.settlementId)
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const state: AwardPaymentState =
    settledCents === 0
      ? "unpaid"
      : settledCents === obligation.amountCents
        ? "paid"
        : "partially-paid";
  return { settledCents, state };
}

export function buildOperationalFinanceAwardReviewPresentation(
  snapshot: OperationalFinanceLedgerSnapshot,
  source: OperationalFinanceAwardProposalSource,
  paymentContacts: readonly OperationalFinancePaymentContact[] = []
): OperationalFinanceAwardReviewPresentation {
  const reversedObligationIds = new Set(
    snapshot.reversals
      .filter((entry) => entry.targetType === "obligation")
      .map((entry) => entry.targetId)
  );
  const reversedSettlementIds = new Set(
    snapshot.reversals
      .filter((entry) => entry.targetType === "settlement")
      .map((entry) => entry.targetId)
  );
  const activeAwards = snapshot.obligations.filter(
    (entry) =>
      entry.season === 2026 &&
      entry.proposalKey &&
      APPROVABLE_CATEGORIES.has(entry.category as OperationalFinanceProposalCategory) &&
      !reversedObligationIds.has(entry.obligationId)
  );
  const activeByProposal = new Map(
    activeAwards.map((entry) => [entry.proposalKey as string, entry])
  );

  const needsReview = source.proposalSet.proposals
    .filter(
      (proposal) =>
        proposal.proposalState === "proposed" &&
        APPROVABLE_CATEGORIES.has(proposal.category) &&
        !activeByProposal.has(proposal.proposalKey)
    )
    .map((proposal): OperationalFinanceAwardReviewItem => {
      if (
        proposal.amountCents === null ||
        !proposal.financialOwnerId ||
        !proposal.franchiseId ||
        proposal.category === "championship-ring-expense"
      ) {
        throw new Error("An approvable award proposal is missing authoritative facts.");
      }
      return {
        proposalKey: proposal.proposalKey,
        proposalFingerprint: getOperationalFinanceProposalFingerprint(proposal),
        category: proposal.category,
        categoryLabel: categoryLabel(proposal.category),
        eventLabel: eventLabelFromProposal(proposal),
        financialOwnerId: proposal.financialOwnerId,
        financialOwnerName:
          getOwnerProfileById(proposal.financialOwnerId)?.fullName ??
          proposal.financialOwnerId,
        franchiseId: proposal.franchiseId,
        franchiseName:
          getFranchiseById(proposal.franchiseId)?.currentTeamName ??
          proposal.franchiseId,
        amountCents: proposal.amountCents,
        score:
          typeof proposal.sourceFacts.winnerPoints === "number"
            ? proposal.sourceFacts.winnerPoints
            : null,
        sourceLabel: "Sleeper finalized result",
        statusLabel: "NEEDS REVIEW",
      };
    });

  const approvedAwards = activeAwards
    .map((obligation): OperationalFinanceApprovedAwardItem => {
      const currentProposal = obligation.proposalKey
        ? source.proposalSet.proposals.find(
            (entry) => entry.proposalKey === obligation.proposalKey
          )
        : null;
      const payment = awardPaymentState(
        obligation,
        snapshot,
        reversedSettlementIds
      );
      const discrepancy =
        currentProposal &&
        currentProposal.proposalState === "proposed" &&
        obligationMatchesProposal(obligation, currentProposal)
          ? null
          : currentProposal
            ? "Sleeper's current result no longer matches this approved obligation. No ledger record was changed."
            : "The current Sleeper proposal set no longer contains this approved result. No ledger record was changed.";
      return {
        obligationId: obligation.obligationId,
        proposalKey: obligation.proposalKey as string,
        financialOwnerId: obligation.financialOwnerId as string,
        categoryLabel: categoryLabel(
          obligation.category as OperationalFinanceProposalCategory
        ),
        eventLabel: eventLabelFromObligation(obligation),
        financialOwnerName: obligation.financialOwnerId
          ? getOwnerProfileById(obligation.financialOwnerId)?.fullName ??
            obligation.financialOwnerId
          : "Unassigned",
        franchiseName: obligation.franchiseId
          ? getFranchiseById(obligation.franchiseId)?.currentTeamName ??
            obligation.franchiseId
          : "League",
        amountCents: obligation.amountCents,
        settledCents: payment.settledCents,
        remainingCents: Math.max(0, obligation.amountCents - payment.settledCents),
        paymentState: payment.state,
        paymentStatusLabel:
          payment.state === "paid"
            ? "PAID"
            : payment.state === "partially-paid"
              ? "PARTIAL"
              : "UNPAID",
        approvedAt: obligation.createdAt,
        discrepancy,
        paymentContact: obligation.financialOwnerId
          ? (() => {
              const contact = paymentContacts.find(
                (entry) => entry.ownerId === obligation.financialOwnerId
              );
              return contact
                ? {
                    method: contact.method,
                    handle: contact.handle,
                    status: contact.status,
                  }
                : null;
            })()
          : null,
      };
    })
    .sort((first, second) => second.approvedAt.localeCompare(first.approvedAt));

  const unresolvedIssues: OperationalFinanceAwardIssue[] =
    source.proposalSet.proposals
      .filter(
        (proposal) =>
          proposal.proposalState === "unresolved" &&
          proposal.category !== "championship-ring-expense"
      )
      .map((proposal) => ({
        proposalKey: proposal.proposalKey,
        title: `${eventLabelFromProposal(proposal)} · ${categoryLabel(proposal.category)}`,
        message:
          proposal.coverage === "pending-ring-cost"
            ? "Ring cost required before champion payout can be approved."
            : proposal.reason,
      }));
  const discrepancyIssues = approvedAwards
    .filter((entry) => entry.discrepancy)
    .map((entry) => ({
      proposalKey: entry.proposalKey,
      title: `${entry.eventLabel} · Approved result changed`,
      message: entry.discrepancy as string,
    }));
  const sourceIssues: OperationalFinanceAwardIssue[] = source.sourceError
    ? [{ proposalKey: null, title: "Sleeper source unavailable", message: source.sourceError }]
    : [];
  const issues = [...sourceIssues, ...unresolvedIssues, ...discrepancyIssues];
  const waiting = source.proposalSet.proposals.filter(
    (proposal) =>
      proposal.category !== "championship-ring-expense" &&
      (proposal.proposalState === "pending-finality" ||
        proposal.proposalState === "not-eligible")
  );
  const waitingCategoryOrder: OperationalFinanceProposalCategory[] = [
    "weekly-high-score",
    "division-winner",
    "third-place",
    "runner-up",
    "champion",
  ];
  const waitingByCategory = waitingCategoryOrder
    .map((category) => ({
      categoryLabel: categoryLabel(category),
      count: waiting.filter((entry) => entry.category === category).length,
    }))
    .filter((entry) => entry.count > 0);
  const weeklyProposals = source.proposalSet.proposals.filter(
    (entry) => entry.category === "weekly-high-score"
  );
  const weeklyApproved = approvedAwards.filter((entry) =>
    entry.proposalKey.includes(":weekly-high-score:")
  );
  const weeklyIssues = issues.filter((entry) =>
    entry.proposalKey?.includes(":weekly-high-score:")
  );

  return {
    sourceStatus: source.sourceError ? "unavailable" : "available",
    sourceLabel: source.acquisition
      ? `Sleeper ${source.acquisition.leagueStatus.replaceAll("_", " ")} · League Week ${source.acquisition.leagueWeek}`
      : "Sleeper status unavailable",
    acquiredAt: source.acquisition?.acquiredAt ?? null,
    summary: {
      needsReviewCount: needsReview.length,
      waitingCount: waiting.length,
      approvedCount: approvedAwards.length,
      paidCount: approvedAwards.filter((entry) => entry.paymentState === "paid").length,
      issuesCount: issues.length,
    },
    needsReview,
    approvedAwards,
    issues,
    weeklySummary: {
      totalCount: weeklyProposals.length,
      approvedCount: weeklyApproved.length,
      needsReviewCount: needsReview.filter(
        (entry) => entry.category === "weekly-high-score"
      ).length,
      waitingCount: waiting.filter(
        (entry) => entry.category === "weekly-high-score"
      ).length,
      issuesCount: weeklyIssues.length,
    },
    waitingByCategory,
    emptyStateTitle:
      needsReview.length === 0 ? "No awards need your review right now." : null,
    emptyStateDetail:
      needsReview.length === 0
        ? "Weekly high-score awards become available after Sleeper finalizes each scoring week."
        : null,
  };
}

export function buildOperationalFinanceCommissionerDashboardPresentation(
  snapshot: OperationalFinanceLedgerSnapshot,
  season: number,
  source: OperationalFinanceAwardProposalSource,
  paymentContacts: readonly OperationalFinancePaymentContact[] = []
): OperationalFinanceCommissionerDashboardPresentation {
  const awardReview = buildOperationalFinanceAwardReviewPresentation(
    snapshot,
    source,
    paymentContacts
  );
  return {
    ...buildOperationalFinanceDashboardPresentation(snapshot, season),
    awardReview,
    reconciliation: reconcileOperationalFinance(snapshot, {
      seasonState: source.acquisition?.leagueState ?? "preseason",
      proposalSet: source.proposalSet,
      unresolvedAwardCorrection: awardReview.approvedAwards.some(
        (entry) => entry.discrepancy !== null
      ),
    }),
  };
}

export async function acquireOperationalFinanceAwardProposalSource(
  ringInput: Readonly<{
    approvedRingCostCents: number;
    approvedRingCapOverrideCents?: number;
  }> | null = null
): Promise<OperationalFinanceAwardProposalSource> {
  const snapshot = await acquireOperationalFinanceSleeperSnapshot();
  return {
    proposalSet: buildOperationalFinanceProposals({
      ...snapshot.proposalInput,
      ...(ringInput ?? {}),
    }),
    acquisition: snapshot.acquisition,
    sourceError: null,
  };
}

export function unavailableOperationalFinanceAwardProposalSource(
  message: string
): OperationalFinanceAwardProposalSource {
  return {
    proposalSet: {
      season: 2026,
      leagueId: "1312149033254416384",
      proposals: [],
      issues: [],
      coverage: {
        proposed: 0,
        pending: 0,
        unresolved: 0,
        notYetApplicable: 0,
        totalProposalSlots: 0,
        coverageByState: {
          available: 0,
          "pending-finality": 0,
          "unresolved-sleeper-tie": 0,
          "unresolved-identity": 0,
          "pending-ring-cost": 0,
          "ring-cap-override-required": 0,
          "not-yet-applicable": 0,
          "source-unavailable": 0,
        },
      },
      snapshotTimestamp: null,
    },
    acquisition: null,
    sourceError: message,
  };
}

function assertCommissioner(actor: OperationalFinanceActor) {
  if (actor.role !== "commissioner" || !actor.actorId.trim()) {
    throw new Error("Commissioner authorization is required.");
  }
}

function equivalentApprovedObligation(
  obligation: OperationalFinanceObligation,
  proposal: OperationalFinanceProposal
) {
  return obligationMatchesProposal(obligation, proposal);
}

export async function approveOperationalFinanceAward(
  repository: OperationalFinanceLedgerRepository,
  season: number,
  rawRequest: unknown,
  actor: OperationalFinanceActor,
  recordedAt: string,
  reacquire: () => Promise<OperationalFinanceAwardProposalSource>
) {
  assertCommissioner(actor);
  if (season !== 2026) {
    throw new Error("Award approval currently supports 2026 only.");
  }
  const request = parseCommissionerAwardApprovalRequest(rawRequest);
  const source = await reacquire();
  const proposal = source.proposalSet.proposals.find(
    (entry) => entry.proposalKey === request.proposalKey
  );
  if (!proposal) {
    throw new Error("Sleeper's result changed. Review the updated proposal before approving.");
  }
  if (
    getOperationalFinanceProposalFingerprint(proposal) !==
    request.proposalFingerprint
  ) {
    throw new Error("Sleeper's result changed. Review the updated proposal before approving.");
  }
  if (proposal.proposalState !== "proposed") {
    throw new Error("This award is no longer ready for approval. Review the updated Sleeper state.");
  }
  if (!APPROVABLE_CATEGORIES.has(proposal.category)) {
    throw new Error("This proposal category cannot be approved as an owner award.");
  }
  if (
    proposal.finalityState !== "sleeper-final" ||
    proposal.amountCents === null ||
    !proposal.financialOwnerId ||
    !proposal.franchiseId
  ) {
    throw new Error("The current Sleeper proposal lacks final award evidence.");
  }

  const before = await repository.getSnapshot();
  const expectedObligationId = proposalKeyToObligationId(proposal.proposalKey);
  const idempotency = before.idempotencyRecords.find(
    (entry) => entry.idempotencyKey === request.idempotencyKey
  );
  if (
    idempotency &&
    (idempotency.operation !== "obligation-created" ||
      idempotency.targetId !== expectedObligationId)
  ) {
    throw new Error("Idempotency key was already used for a different award approval.");
  }
  const reversed = before.reversals.some(
    (entry) =>
      entry.targetType === "obligation" && entry.targetId === expectedObligationId
  );
  const existing = before.obligations.find(
    (entry) => entry.obligationId === expectedObligationId
  );
  if (existing) {
    if (reversed) {
      throw new Error("A prior award obligation exists and requires the future correction workflow.");
    }
    if (!equivalentApprovedObligation(existing, proposal)) {
      throw new Error("The existing award obligation conflicts with the current Sleeper proposal.");
    }
    return {
      created: false,
      obligation: existing,
      dashboard: buildOperationalFinanceCommissionerDashboardPresentation(
        before,
        season,
        source
      ),
    };
  }

  const mutation = await recordApprovedAwardProposal(
    repository,
    proposal,
    actor,
    request.idempotencyKey,
    recordedAt
  );
  return {
    created: mutation.created,
    obligation: mutation.value,
    dashboard: buildOperationalFinanceCommissionerDashboardPresentation(
      await repository.getSnapshot(),
      season,
      source
    ),
  };
}
