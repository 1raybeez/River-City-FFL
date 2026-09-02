import { redirect } from "next/navigation";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { loadTradeComparisonContext } from "@/lib/tradeComparison/serverAdapter";
import { buildServerDiagnosticPresets } from "@/lib/tradeComparison/serverRecommendationAdapter";
import TradeRecommendationDiagnosticClient from "./TradeRecommendationDiagnosticClient";

export const dynamic = "force-dynamic";

export default async function TradeRecommendationDiagnosticPage() {
  try {
    await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) redirect("/commish/login?returnTo=%2Fcommish%2Ftrade-recommendation-diagnostic");
    throw error;
  }

  const context = await loadTradeComparisonContext({ includeAcquisitionSnapshot: true });
  return <TradeRecommendationDiagnosticClient presets={buildServerDiagnosticPresets(context)} />;
}
