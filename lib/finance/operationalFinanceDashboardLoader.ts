import "server-only";

import {
  acquireOperationalFinanceAwardProposalSource,
  buildOperationalFinanceCommissionerDashboardPresentation,
  unavailableOperationalFinanceAwardProposalSource,
} from "@/lib/finance/operationalFinanceAwardReview";
import { getApprovedOperationalRingInput } from "@/lib/finance/operationalFinanceExpenses";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";
import { getOperationalFinancePaymentContactRepository } from "@/lib/finance/operationalFinancePaymentContactsFirestore";
import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";

export async function loadOperationalFinanceDashboardFromFirestore(
  season: number
) {
  const repository = getOperationalFinanceLedgerRepository(season);
  const snapshot = await repository.getSnapshot();
  const [awardSource, paymentContactSnapshot] = await Promise.all([
    acquireOperationalFinanceAwardProposalSource(
      getApprovedOperationalRingInput(snapshot)
    ).catch(() =>
      unavailableOperationalFinanceAwardProposalSource(
        "Sleeper award data could not be refreshed. Try again before approving an award."
      )
    ),
    getOperationalFinancePaymentContactRepository().getSnapshot(),
  ]);
  const presentation = buildOperationalFinanceCommissionerDashboardPresentation(
    snapshot,
    season,
    awardSource,
    paymentContactSnapshot.contacts
  );
  if (season !== 2026) return presentation;
  const identities = await getCurrentSeasonTeamIdentityMap();
  return {
    ...presentation,
    duesRows: presentation.duesRows.map((row) => ({
      ...row,
      franchiseName: identities.get(row.franchiseId)?.currentTeamName ?? row.franchiseName,
    })),
  };
}
