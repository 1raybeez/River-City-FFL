import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { loadOperationalFinanceDashboardFromFirestore } from "@/lib/finance/operationalFinanceDashboardLoader";
import { recordOperationalFinanceExpenseSettlement } from "@/lib/finance/operationalFinanceExpenses";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export const runtime = "nodejs";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set([new URL(req.url).origin]);
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) allowed.add(`${protocol || "https"}://${host}`);
  const publicHost = process.env.VERCEL_URL?.trim();
  if (publicHost) allowed.add(publicHost.startsWith("http") ? publicHost : `https://${publicHost}`);
  return allowed.has(origin);
}

export async function POST(req: Request, context: { params: Promise<{ season: string; obligationId: string }> }) {
  let authorization;
  try {
    authorization = await requireOperationalFinanceCommissioner();
  } catch (error) {
    if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
    throw error;
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  const params = await context.params;
  const season = Number(params.season);
  if (season !== 2026) return NextResponse.json({ error: "Expense payment currently supports 2026 only." }, { status: 404 });
  try {
    const mutation = await recordOperationalFinanceExpenseSettlement(
      getOperationalFinanceLedgerRepository(season), season, decodeURIComponent(params.obligationId), await req.json(), authorization.actor, new Date().toISOString()
    );
    return NextResponse.json({ created: mutation.created, dashboard: await loadOperationalFinanceDashboardFromFirestore(season) }, { status: mutation.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expense payment failed.";
    return NextResponse.json({ error: message }, { status: /already|Idempotency/.test(message) ? 409 : 400 });
  }
}
