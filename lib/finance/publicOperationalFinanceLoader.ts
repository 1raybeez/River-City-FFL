import "server-only";

import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";
import { buildPublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinancePresentation";

export async function loadPublicOperationalFinancePresentation() {
  const snapshot = await getOperationalFinanceLedgerRepository(2026).getSnapshot();
  return buildPublicOperationalFinancePresentation(snapshot);
}
