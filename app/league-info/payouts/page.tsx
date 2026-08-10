import { loadFinancialHistoryPresentation } from "@/lib/managers/financialHistoryLoader";
import FinancialHistoryClient from "@/components/league-info/FinancialHistoryClient";

export default function PayoutsPage() {
  const presentation = loadFinancialHistoryPresentation();

  return <FinancialHistoryClient presentation={presentation} />;
}
