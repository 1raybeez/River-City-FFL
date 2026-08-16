import { loadFinancialHistoryPresentation } from "@/lib/managers/financialHistoryLoader";
import FinancialHistoryClient from "@/components/league-info/FinancialHistoryClient";
import { loadPublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinanceLoader";
import {
  buildPublicPayoutCurrentSeason,
  buildPublicPayoutHistory,
} from "@/lib/finance/publicPayoutPresentation";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const presentation = buildPublicPayoutHistory(loadFinancialHistoryPresentation());
  const currentSeason = buildPublicPayoutCurrentSeason(
    await loadPublicOperationalFinancePresentation()
  );

  return <FinancialHistoryClient presentation={presentation} currentSeason={currentSeason} />;
}
