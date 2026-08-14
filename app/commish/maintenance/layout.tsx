import { redirect } from "next/navigation";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";

export default async function CommishMaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/login?returnTo=%2Fcommish%2Fmaintenance");
    }

    throw error;
  }

  return children;
}
