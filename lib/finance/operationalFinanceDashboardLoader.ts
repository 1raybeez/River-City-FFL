import "server-only";

import {
  acquireOperationalFinanceAwardProposalSource,
  buildOperationalFinanceCommissionerDashboardPresentation,
  unavailableOperationalFinanceAwardProposalSource,
} from "@/lib/finance/operationalFinanceAwardReview";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export async function loadOperationalFinanceDashboardFromFirestore(
  season: number
) {
  const repository = getOperationalFinanceLedgerRepository(season);
  const [snapshot, awardSource] = await Promise.all([
    repository.getSnapshot(),
    acquireOperationalFinanceAwardProposalSource().catch(() =>
      unavailableOperationalFinanceAwardProposalSource(
        "Sleeper award data could not be refreshed. Try again before approving an award."
      )
    ),
  ]);
  return buildOperationalFinanceCommissionerDashboardPresentation(
    snapshot,
    season,
    awardSource
  );
}
