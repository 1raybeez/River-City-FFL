import { loadPublicOperationalFinancePresentation } from "@/lib/finance/publicOperationalFinanceLoader";

export const dynamic = "force-dynamic";

function formatMoney(cents: number | null) {
  if (cents === null) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
}

export async function GET() {
  const presentation = await loadPublicOperationalFinancePresentation();
  return Response.json({
    season: presentation.season,
    duesPool: formatMoney(presentation.duesPoolCents),
    duesCollected: formatMoney(presentation.duesCollectedCents),
    duesOutstanding: formatMoney(presentation.duesOutstandingCents),
    paidCount: presentation.paidCount,
    notPaidCount: presentation.notPaidCount,
    championshipAllocation: formatMoney(presentation.championshipAllocationCents),
    projectedChampionCash: formatMoney(presentation.projectedChampionCashCents),
  });
}
