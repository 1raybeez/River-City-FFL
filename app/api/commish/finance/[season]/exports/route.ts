import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { buildOperationalFinanceCsv, buildOperationalFinanceExportContext, buildOperationalFinanceExportJson, buildOperationalFinanceReport, canonicalOperationalFinanceExportJson, type OperationalFinanceExportFormat } from "@/lib/finance/operationalFinanceExport";
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

const formats = new Set<OperationalFinanceExportFormat>(["json", "obligations", "settlements", "dues-status", "expenses", "contributions", "report"]);

export async function GET(req: Request, context: { params: Promise<{ season: string }> }) {
  try {
    await requireOperationalFinanceCommissioner();
  } catch (error) {
    if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
    throw error;
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  const season = Number((await context.params).season);
  const format = new URL(req.url).searchParams.get("format") as OperationalFinanceExportFormat | null;
  if (season !== 2026 || !format || !formats.has(format)) return NextResponse.json({ error: "A supported 2026 export format is required." }, { status: 400 });
  const exportContext = buildOperationalFinanceExportContext(await getOperationalFinanceLedgerRepository(2026).getSnapshot());
  const date = "2026";
  if (format === "json") return new Response(canonicalOperationalFinanceExportJson(buildOperationalFinanceExportJson(exportContext)) + "\n", { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="river-city-ffl-2026-finance.json"` } });
  if (format === "report") return new Response(buildOperationalFinanceReport(exportContext), { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="river-city-ffl-2026-reconciliation.txt"` } });
  return new Response(buildOperationalFinanceCsv(exportContext, format), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="river-city-ffl-${date}-${format}.csv"` } });
}
