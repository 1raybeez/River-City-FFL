import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import CommissionerFeedbackQueue from "./CommissionerFeedbackQueue";

export default async function CommissionerFeedbackPage() {
  try {
    await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/login?returnTo=%2Fcommish%2Ffeedback");
    }
    throw error;
  }

  return (
    <SiteShell activePath="/commish">
      <CommissionerFeedbackQueue />
    </SiteShell>
  );
}
