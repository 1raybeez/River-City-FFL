import "server-only";

import {
  acquireOperationalFinanceAwardProposalSource,
  buildOperationalFinanceCommissionerDashboardPresentation,
  unavailableOperationalFinanceAwardProposalSource,
} from "@/lib/finance/operationalFinanceAwardReview";
import { getApprovedOperationalRingInput } from "@/lib/finance/operationalFinanceExpenses";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";
import { getOperationalFinancePaymentContactRepository } from "@/lib/finance/operationalFinancePaymentContactsFirestore";

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
  return buildOperationalFinanceCommissionerDashboardPresentation(
    snapshot,
    season,
    awardSource,
    paymentContactSnapshot.contacts
  );
}
