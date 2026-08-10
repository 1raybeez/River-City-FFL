import "server-only";

import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "@/lib/history/historicalFinancialData";
import {
  buildFinancialHistory,
  getFinancialCoverage,
  getOwnerFinancialSummary,
} from "@/lib/history/financialHistory";
import type { OwnerProfileStatus } from "@/lib/managers/identityTypes";
import { buildOwnerFinancialSnapshotPresentation } from "@/lib/managers/ownerFinancialSnapshotPresentation";

let financialHistoryInitialized = false;

function initializeFinancialHistory() {
  if (financialHistoryInitialized) return;
  buildFinancialHistory({
    source: HISTORICAL_FINANCIAL_SOURCE,
    transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
  });
  financialHistoryInitialized = true;
}

export function loadOwnerFinancialSnapshot(input: {
  ownerId: string;
  ownerStatus: OwnerProfileStatus;
  careerFirstSeason: number | null;
  careerLatestSeason: number | null;
}) {
  initializeFinancialHistory();
  return buildOwnerFinancialSnapshotPresentation({
    ownerId: input.ownerId,
    ownerStatus: input.ownerStatus,
    careerFirstSeason: input.careerFirstSeason,
    careerLatestSeason: input.careerLatestSeason,
    summary: getOwnerFinancialSummary(input.ownerId),
    coverage: getFinancialCoverage(),
  });
}
