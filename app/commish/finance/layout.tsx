import { redirect } from "next/navigation";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";

export default async function CommissionerFinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireOperationalFinanceCommissioner();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/auction/login?returnTo=%2Fcommish%2Ffinance%2F2026");
    }
    throw error;
  }

  return children;
}
