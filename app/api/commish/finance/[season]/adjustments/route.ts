import { NextResponse } from "next/server";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { loadOperationalFinanceDashboardFromFirestore } from "@/lib/finance/operationalFinanceDashboardLoader";
import { recordOperationalFinanceAdjustment } from "@/lib/finance/operationalFinanceExpenses";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export const runtime = "nodejs";

export async function POST(req: Request, context: { params: Promise<{ season: string }> }) {
  let authorization;
  try { authorization = await requireOperationalFinanceCommissioner(); }
  catch (error) { if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 }); throw error; }
  if (Number((await context.params).season) !== 2026) return NextResponse.json({ error: "Reconciliation adjustments currently support 2026 only." }, { status: 404 });
  try {
    const mutation = await recordOperationalFinanceAdjustment(getOperationalFinanceLedgerRepository(2026), 2026, await req.json(), authorization.actor, new Date().toISOString());
    return NextResponse.json({ created: mutation.created, dashboard: await loadOperationalFinanceDashboardFromFirestore(2026) }, { status: mutation.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adjustment failed.";
    return NextResponse.json({ error: message }, { status: /Idempotency/i.test(message) ? 409 : 400 });
  }
}
