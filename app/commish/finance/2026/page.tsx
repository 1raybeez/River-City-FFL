import { loadOperationalFinanceDashboardFromFirestore } from "@/lib/finance/operationalFinanceDashboardLoader";
import OperationalFinanceDashboardClient from "./OperationalFinanceDashboardClient";

export const dynamic = "force-dynamic";

export default async function OperationalFinance2026Page() {
  const dashboard = await loadOperationalFinanceDashboardFromFirestore(2026);
  return <OperationalFinanceDashboardClient initialDashboard={dashboard} />;
}
