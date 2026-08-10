import "server-only";

import {
  HISTORICAL_FINANCIAL_SOURCE,
  HISTORICAL_FINANCIAL_TRANSACTIONS,
} from "@/lib/history/historicalFinancialData";
import { buildFinancialHistory } from "@/lib/history/financialHistory";
import {
  franchises,
  ownerProfiles,
  ownershipTenures,
} from "@/lib/managers/identityData";
import {
  buildFinancialHistoryPresentation,
  type FinancialHistoryPresentation,
} from "@/lib/managers/financialHistoryPresentation";

let financialPresentation: FinancialHistoryPresentation | null = null;

export function loadFinancialHistoryPresentation() {
  if (financialPresentation) return financialPresentation;

  const aggregate = buildFinancialHistory({
    source: HISTORICAL_FINANCIAL_SOURCE,
    transactions: HISTORICAL_FINANCIAL_TRANSACTIONS,
  });

  financialPresentation = buildFinancialHistoryPresentation({
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

  return financialPresentation;
}
