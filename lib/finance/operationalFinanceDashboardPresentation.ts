import {
  deriveDuesStatus,
  deriveOperationalFinanceTotals,
} from "@/lib/finance/operationalFinanceLedger";
import type {
  OperationalFinanceAuditEvent,
  OperationalFinanceLedgerSnapshot,
  OperationalFinanceSettlement,
} from "@/lib/finance/operationalFinanceLedgerTypes";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";
import {
  getFranchiseById,
  getOwnerProfileById,
} from "@/lib/managers/identityData";

export type OperationalFinanceDashboardSettlement = Readonly<{
  settlementId: string;
  amountCents: number;
  paymentMethod: "venmo";
  paymentMethodLabel: "Venmo";
  actualPaidAt: string | null;
  actualPaidAtLabel: string;
  recordedAt: string;
  commissionerNote: string | null;
}>;

export type OperationalFinanceDashboardDuesRow = Readonly<{
  obligationId: string;
  financialOwnerId: string;
  financialOwnerName: string;
  franchiseId: string;
  franchiseName: string;
  coOwnerContext: readonly string[];
  state: "unpaid" | "partially-paid" | "paid";
  statusLabel: "UNPAID" | "PARTIAL" | "PAID";
  assessedCents: number;
  settledCents: number;
  outstandingCents: number;
  canRecordPayment: boolean;
  settlements: readonly OperationalFinanceDashboardSettlement[];
}>;

export type OperationalFinanceDashboardActivity = Readonly<{
  eventId: string;
  eventLabel: string;
  targetLabel: string;
  actorLabel: string;
  createdAt: string;
  reason: string;
}>;

export type OperationalFinanceDashboardPresentation = Readonly<{
  season: 2026;
  heading: "2026 Finance";
  operationalStatusLabel: "Operational / Provisional";
  deadlineLabel: string;
  summary: Readonly<{
    duesAssessedCents: number;
    duesCollectedCents: number;
    duesOutstandingCents: number;
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
    approvedAwardsCents: number;
    paidAwardsCents: number;
    approvedExpensesCents: number;
    poolAllocatedCents: number;
    poolRemainingCents: number;
    reconciled: false;
  }>;
  duesRows: readonly OperationalFinanceDashboardDuesRow[];
  recentActivity: readonly OperationalFinanceDashboardActivity[];
  layout: "responsive-cards";
}>;

const EVENT_LABELS: Record<OperationalFinanceAuditEvent["eventType"], string> = {
  "season-metadata-created": "Season ledger created",
  "obligation-created": "Dues assessment created",
  "settlement-created": "Dues payment recorded",
  "obligation-reversed": "Obligation reversed",
  "obligation-replaced": "Obligation replaced",
  "settlement-reversed": "Payment reversed",
  "migration-recorded": "Opening migration recorded",
};

const EVENT_SORT_PRIORITY: Record<OperationalFinanceAuditEvent["eventType"], number> = {
  "migration-recorded": 7,
  "settlement-created": 6,
  "settlement-reversed": 5,
  "obligation-replaced": 4,
  "obligation-reversed": 3,
  "obligation-created": 2,
  "season-metadata-created": 1,
};

function formatRecordedDate(value: string | null) {
  if (!value) return "Unknown / Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function settlementPresentation(
  settlement: OperationalFinanceSettlement
): OperationalFinanceDashboardSettlement {
  return {
    settlementId: settlement.settlementId,
    amountCents: settlement.amountCents,
    paymentMethod: settlement.paymentMethod,
    paymentMethodLabel: "Venmo",
    actualPaidAt: settlement.actualPaidAt,
    actualPaidAtLabel: formatRecordedDate(settlement.actualPaidAt),
    recordedAt: settlement.recordedAt,
    commissionerNote: settlement.commissionerNote,
  };
}

function activityTargetLabel(
  event: OperationalFinanceAuditEvent,
  settlementObligations: ReadonlyMap<string, string>,
  obligationOwners: ReadonlyMap<string, string>
) {
  const obligationId =
    event.targetType === "settlement"
      ? settlementObligations.get(event.targetId)
      : event.targetType === "obligation"
        ? event.targetId
        : null;
  if (obligationId) return obligationOwners.get(obligationId) ?? "Finance record";
  if (event.targetType === "season") return `${event.season} season`;
  if (event.targetType === "migration") return `${event.season} opening ledger`;
  return "Finance record";
}

export function buildOperationalFinanceDashboardPresentation(
  snapshot: OperationalFinanceLedgerSnapshot,
  season: number
): OperationalFinanceDashboardPresentation {
  if (season !== 2026) {
    throw new Error("The commissioner operational finance dashboard currently supports 2026 only.");
  }
  if (!snapshot.seasons.some((entry) => entry.season === season)) {
    throw new Error("The 2026 operational finance ledger was not found.");
  }

  const obligations = snapshot.obligations.filter((entry) => entry.season === season);
  const settlements = snapshot.settlements.filter((entry) => entry.season === season);
  const reversals = snapshot.reversals.filter((entry) => entry.season === season);
  const reversedSettlements = new Set(
    reversals
      .filter((entry) => entry.targetType === "settlement")
      .map((entry) => entry.targetId)
  );
  const statuses = deriveDuesStatus(obligations, settlements, reversals);
  const totals = deriveOperationalFinanceTotals(obligations, settlements, reversals);
  const mappingByFranchise = new Map(
    OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.map((entry) => [
      entry.franchiseId,
      entry,
    ])
  );

  const duesRows = statuses
    .map((status): OperationalFinanceDashboardDuesRow => {
      const owner = getOwnerProfileById(status.financialOwnerId);
      const franchise = getFranchiseById(status.franchiseId);
      const mapping = mappingByFranchise.get(status.franchiseId);
      const rowSettlements = settlements
        .filter(
          (entry) =>
            entry.obligationId === status.obligationId &&
            entry.direction === "incoming-dues" &&
            !reversedSettlements.has(entry.settlementId)
        )
        .sort((first, second) => first.recordedAt.localeCompare(second.recordedAt))
        .map(settlementPresentation);
      return {
        obligationId: status.obligationId,
        financialOwnerId: status.financialOwnerId,
        financialOwnerName: owner?.fullName ?? status.financialOwnerId,
        franchiseId: status.franchiseId,
        franchiseName: franchise?.currentTeamName ?? status.franchiseId,
        coOwnerContext: (mapping?.excludedCoOwnerIds ?? []).map(
          (ownerId) => getOwnerProfileById(ownerId)?.fullName ?? ownerId
        ),
        state: status.state,
        statusLabel:
          status.state === "paid"
            ? "PAID"
            : status.state === "partially-paid"
              ? "PARTIAL"
              : "UNPAID",
        assessedCents: status.assessedCents,
        settledCents: status.settledCents,
        outstandingCents: status.outstandingCents,
        canRecordPayment: status.outstandingCents > 0,
        settlements: rowSettlements,
      };
    })
    .sort((first, second) =>
      first.financialOwnerName.localeCompare(second.financialOwnerName)
    );

  const obligationOwners = new Map(
    duesRows.map((entry) => [entry.obligationId, entry.financialOwnerName])
  );
  const settlementObligations = new Map(
    settlements.map((entry) => [entry.settlementId, entry.obligationId])
  );
  const recentActivity = snapshot.auditEvents
    .filter((entry) => entry.season === season)
    .sort(
      (first, second) =>
        second.createdAt.localeCompare(first.createdAt) ||
        EVENT_SORT_PRIORITY[second.eventType] - EVENT_SORT_PRIORITY[first.eventType] ||
        second.eventId.localeCompare(first.eventId)
    )
    .slice(0, 15)
    .map((event): OperationalFinanceDashboardActivity => ({
      eventId: event.eventId,
      eventLabel: EVENT_LABELS[event.eventType],
      targetLabel: activityTargetLabel(
        event,
        settlementObligations,
        obligationOwners
      ),
      actorLabel: event.actorRole === "commissioner" ? "Commissioner" : "System",
      createdAt: event.createdAt,
      reason: event.reason,
    }));

  return {
    season: 2026,
    heading: "2026 Finance",
    operationalStatusLabel: "Operational / Provisional",
    deadlineLabel: "Due before the 2026 draft",
    summary: {
      duesAssessedCents: totals.duesAssessedCents,
      duesCollectedCents: totals.duesCollectedCents,
      duesOutstandingCents: totals.duesOutstandingCents,
      paidCount: duesRows.filter((entry) => entry.state === "paid").length,
      unpaidCount: duesRows.filter((entry) => entry.state === "unpaid").length,
      partialCount: duesRows.filter((entry) => entry.state === "partially-paid").length,
      approvedAwardsCents: totals.approvedAwardsCents,
      paidAwardsCents: totals.awardSettlementsCents,
      approvedExpensesCents: totals.approvedExpensesCents,
      poolAllocatedCents: totals.poolAllocatedCents,
      poolRemainingCents: totals.poolRemainingCents,
      reconciled: false,
    },
    duesRows,
    recentActivity,
    layout: "responsive-cards",
  };
}
