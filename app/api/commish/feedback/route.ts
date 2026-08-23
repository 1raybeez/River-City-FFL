import { NextResponse } from "next/server";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { validateJsonMutationRequest } from "@/lib/auth/requestSecurity";
import {
  CommissionerFeedbackValidationError,
  readCommissionerFeedback,
  updateCommissionerFeedback,
} from "@/lib/feedbackServer";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Commissioner access is required." }, { status: 401 });
}

async function commissionerAccess() {
  try {
    return await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

export async function GET() {
  if (!(await commissionerAccess())) return unauthorized();
  return NextResponse.json({ feedback: await readCommissionerFeedback() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const actor = await commissionerAccess();
  if (!actor) return unauthorized();
  const securityError = validateJsonMutationRequest(request);
  if (securityError) return securityError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A JSON object is required." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const allowed = new Set(["feedbackId", "status", "commissionerNote"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    return NextResponse.json({ error: "Only feedbackId, status, and commissionerNote may be changed." }, { status: 400 });
  }

  try {
    const feedback = await updateCommissionerFeedback(input as {
      feedbackId: unknown;
      status?: unknown;
      commissionerNote?: unknown;
    }, actor);
    return NextResponse.json({ feedback });
  } catch (error) {
    if (error instanceof CommissionerFeedbackValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
