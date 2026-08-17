import { NextResponse } from "next/server";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { loadOperationalFinanceDashboardFromFirestore } from "@/lib/finance/operationalFinanceDashboardLoader";
import { correctOperationalFinanceExpense } from "@/lib/finance/operationalFinanceExpenses";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ season: string; obligationId: string }> }) {
  let authorization;
  try { authorization = await requireOperationalFinanceCommissioner(); }
  catch (error) { if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 }); throw error; }
  const params = await context.params;
  if (Number(params.season) !== 2026) return NextResponse.json({ error: "Expense correction currently supports 2026 only." }, { status: 404 });
  try {
    const mutation = await correctOperationalFinanceExpense(getOperationalFinanceLedgerRepository(2026), 2026, { ...(await req.json() as Record<string, unknown>), obligationId: decodeURIComponent(params.obligationId) }, authorization.actor, new Date().toISOString());
    return NextResponse.json({ created: mutation.created, dashboard: await loadOperationalFinanceDashboardFromFirestore(2026) }, { status: mutation.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expense correction failed.";
    return NextResponse.json({ error: message }, { status: /already|Idempotency/i.test(message) ? 409 : 400 });
  }
}
