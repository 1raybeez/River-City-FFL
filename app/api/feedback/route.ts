import { NextResponse } from "next/server";
import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireLegislativeOwner } from "@/lib/auth/legislativeAccess";
import { validateJsonMutationRequest } from "@/lib/auth/requestSecurity";
import { createOwnerFeedback } from "@/lib/feedbackServer";
import { DuplicateFeedbackError, FeedbackValidationError } from "@/lib/feedback";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const invalidRequest = validateJsonMutationRequest(request);
  if (invalidRequest) return invalidRequest;

  let session;
  try {
    session = await requireLegislativeOwner();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json({ error: "Authenticated River City owner access is required." }, { status: 401 });
    }
    throw error;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const feedbackId = await createOwnerFeedback(body, session);
    return NextResponse.json({ success: true, feedbackId }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateFeedbackError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof FeedbackValidationError || error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Feedback could not be submitted." }, { status: 400 });
  }
}
