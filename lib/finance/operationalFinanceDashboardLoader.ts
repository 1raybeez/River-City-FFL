import "server-only";

import { loadOperationalFinanceDashboard } from "@/lib/finance/operationalFinanceDashboard";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export async function loadOperationalFinanceDashboardFromFirestore(
  season: number
) {
  return loadOperationalFinanceDashboard(
    getOperationalFinanceLedgerRepository(season),
    season
  );
}
