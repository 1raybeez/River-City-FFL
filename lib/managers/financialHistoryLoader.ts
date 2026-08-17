import "server-only";

import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "@/lib/history/historicalFinancialData";
import { buildFinancialHistory } from "@/lib/history/financialHistory";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";
import {
  franchises,
  ownerProfiles,
  ownershipTenures,
} from "@/lib/managers/identityData";
import {
  buildFinancialHistoryPresentation,
  type FinancialHistoryPresentation,
} from "@/lib/managers/financialHistoryPresentation";
import type { OperationalFinanceArchive } from "@/lib/finance/operationalFinanceLedgerTypes";

let financialPresentation: FinancialHistoryPresentation | null = null;

function buildPresentation(operationalArchives: readonly OperationalFinanceArchive[] = []) {
  const aggregate = buildFinancialHistory({
    source: HISTORICAL_FINANCIAL_SOURCE,
    transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
    operationalArchives,
  });

  return buildFinancialHistoryPresentation({
    aggregate,
    ownerDisplays: ownerProfiles.map((owner) => ({
      id: owner.id,
      name: owner.fullName,
    })),
    franchiseDisplays: franchises.map((franchise) => ({
      id: franchise.id,
      name: franchise.currentTeamName,
      ownerIdsBySeason: Object.fromEntries(
        aggregate.coverage.seasons.map((season) => [
          season,
          ownershipTenures
            .filter(
              (tenure) =>
                tenure.franchiseId === franchise.id &&
                tenure.startSeason <= season &&
                (tenure.endSeason === undefined || tenure.endSeason >= season)
            )
            .map((tenure) => tenure.ownerId),
        ])
      ),
    })),
  });
}

export function loadFinancialHistoryPresentation() {
  if (financialPresentation) return financialPresentation;
  financialPresentation = buildPresentation();
  return financialPresentation;
}

export async function loadFinancialHistoryPresentationWithOperationalArchive() {
  const archive = await getOperationalFinanceLedgerRepository(2026).getArchive(2026);
  return buildPresentation(archive ? [archive] : []);
}
