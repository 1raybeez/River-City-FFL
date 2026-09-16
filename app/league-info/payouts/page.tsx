import { loadFinancialHistoryPresentationWithOperationalArchive } from "@/lib/managers/financialHistoryLoader";
import FinancialHistoryClient from "@/components/league-info/FinancialHistoryClient";
import { loadPublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinanceLoader";
import {
  buildPublicPayoutCurrentSeason,
  buildPublicPayoutHistory,
} from "@/lib/finance/publicPayoutPresentation";
import { listWeeklyHighScoreSettlements } from "@/lib/weeklyHighScoreSettlement";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const presentation = buildPublicPayoutHistory(
    await loadFinancialHistoryPresentationWithOperationalArchive()
  );
  const currentSeason = buildPublicPayoutCurrentSeason(
    await loadPublicOperationalFinancePresentation(),
    await listWeeklyHighScoreSettlements(2026)
  );

  return <FinancialHistoryClient presentation={presentation} currentSeason={currentSeason} />;
}
