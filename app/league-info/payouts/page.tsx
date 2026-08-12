import { loadFinancialHistoryPresentation } from "@/lib/managers/financialHistoryLoader";
import FinancialHistoryClient from "@/components/league-info/FinancialHistoryClient";
import { loadPublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinanceLoader";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const presentation = loadFinancialHistoryPresentation();
  const currentSeason = await loadPublicOperationalFinancePresentation();

  return <FinancialHistoryClient presentation={presentation} currentSeason={currentSeason} />;
}
