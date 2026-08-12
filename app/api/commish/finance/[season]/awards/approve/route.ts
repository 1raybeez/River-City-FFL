import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import {
  acquireOperationalFinanceAwardProposalSource,
  approveOperationalFinanceAward,
} from "@/lib/finance/operationalFinanceAwardReview";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { getOperationalFinanceLedgerRepository } from "@/lib/finance/operationalFinanceLedgerFirestore";
import { getApprovedOperationalRingInput } from "@/lib/finance/operationalFinanceExpenses";

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
    throw new Error("A valid JSON award approval request is required.");
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ season: string }> }
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
  const season = Number((await context.params).season);
  if (season !== 2026) {
    return NextResponse.json({ error: "Award approval currently supports 2026 only." }, { status: 404 });
  }

  try {
    const repository = getOperationalFinanceLedgerRepository(season);
    const result = await approveOperationalFinanceAward(
      repository,
      season,
      await readJsonBody(req),
      authorization.actor,
      new Date().toISOString(),
      async () =>
        acquireOperationalFinanceAwardProposalSource(
          getApprovedOperationalRingInput(await repository.getSnapshot())
        )
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Award approval failed.";
    const status = /changed|Idempotency|conflict|no longer/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
