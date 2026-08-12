import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { buildOperationalFinanceAwardReviewPresentation, acquireOperationalFinanceAwardProposalSource } from "@/lib/finance/operationalFinanceAwardReview";
import { closeOperationalFinanceSeason, reviewOperationalFinanceSeasonClose } from "@/lib/finance/operationalFinanceArchive";
import { getApprovedOperationalRingInput } from "@/lib/finance/operationalFinanceExpenses";
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
async function contextFor(repository: ReturnType<typeof getOperationalFinanceLedgerRepository>) {
  const snapshot = await repository.getSnapshot();
  const source = await acquireOperationalFinanceAwardProposalSource(getApprovedOperationalRingInput(snapshot));
  const awardReview = buildOperationalFinanceAwardReviewPresentation(snapshot, source, []);
  return {
    snapshot,
    source,
    context: {
      seasonState: source.acquisition?.leagueState ?? "preseason" as const,
      proposalSet: source.proposalSet,
      unresolvedAwardCorrection: awardReview.approvedAwards.some((entry) => entry.discrepancy !== null),
    },
  };
}

export async function GET(req: Request, context: { params: Promise<{ season: string }> }) {
  let authorization;
  try { authorization = await requireOperationalFinanceCommissioner(); } catch (error) {
    if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
    throw error;
  }
  void authorization;
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  const season = Number((await context.params).season);
  if (season !== 2026) return NextResponse.json({ error: "Season close currently supports 2026 only." }, { status: 404 });
  try {
    const result = await contextFor(getOperationalFinanceLedgerRepository(season));
    return NextResponse.json(reviewOperationalFinanceSeasonClose(result.snapshot, result.context));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Close review failed." }, { status: 503 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ season: string }> }) {
  let authorization;
  try { authorization = await requireOperationalFinanceCommissioner(); } catch (error) {
    if (error instanceof AuctionAccessError) return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
    throw error;
  }
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  const season = Number((await context.params).season);
  if (season !== 2026) return NextResponse.json({ error: "Season close currently supports 2026 only." }, { status: 404 });
  try {
    const body = await req.json() as Record<string, unknown>;
    if (Object.keys(body).some((key) => !["confirmed", "idempotencyKey"].includes(key))) throw new Error("Unsupported season close field.");
    const idempotencyKey = body.idempotencyKey;
    if (typeof idempotencyKey !== "string") throw new Error("A close idempotency key is required.");
    const result = await contextFor(getOperationalFinanceLedgerRepository(season));
    const closed = await closeOperationalFinanceSeason(
      getOperationalFinanceLedgerRepository(season), result.context, authorization.actor,
      idempotencyKey, new Date().toISOString(), body.confirmed === true
    );
    return NextResponse.json({ created: closed.created, archiveHash: closed.archive.archiveHash }, { status: closed.created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Season close failed.";
    return NextResponse.json({ error: message }, { status: /Idempotency|already closed|already exists/i.test(message) ? 409 : 400 });
  }
}
