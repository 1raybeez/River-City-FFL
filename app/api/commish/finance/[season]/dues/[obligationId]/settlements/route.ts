import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { recordCommissionerDuesPayment } from "@/lib/finance/operationalFinanceDashboard";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";

export const runtime = "nodejs";

function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const requestOrigins = new Set([new URL(req.url).origin]);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProtocol = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) requestOrigins.add(`${forwardedProtocol || "https"}://${forwardedHost}`);
  const publicHost = process.env.VERCEL_URL?.trim();
  if (publicHost) requestOrigins.add(publicHost.startsWith("http") ? publicHost : `https://${publicHost}`);
  return requestOrigins.has(origin);
}

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new Error("A valid JSON payment request is required.");
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ season: string; obligationId: string }> }
) {
  let authorization;
  try {
    authorization = await requireOperationalFinanceCommissioner();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
    }
    throw error;
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  }

  const params = await context.params;
  const season = Number(params.season);
  if (season !== 2026) {
    return NextResponse.json({ error: "Operational finance mutations currently support 2026 only." }, { status: 404 });
  }

  try {
    const body = await readJsonBody(req);
    if (body.obligationId !== undefined && body.obligationId !== params.obligationId) {
      throw new Error("Payment obligation does not match the protected route.");
    }
    const result = await recordCommissionerDuesPayment(
      getOperationalFinanceLedgerRepository(season),
      season,
      { ...body, obligationId: params.obligationId },
      authorization.actor,
      new Date().toISOString()
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment could not be recorded.";
    const status = /Idempotency key was already used/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
