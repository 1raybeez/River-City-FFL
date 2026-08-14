import { NextResponse } from "next/server";
import { requireLegislativeOwner } from "@/lib/auth/legislativeAccess";
import { recordOwnerLegislativeVote } from "@/lib/legislativeServer";

export async function POST(request: Request) {
  try {
    const session = await requireLegislativeOwner();
    const canonicalOwnerId = session.access.canonicalOwnerId;
    if (!canonicalOwnerId) throw new Error("Authenticated River City owner access is required.");
    const body = (await request.json()) as Record<string, unknown>;
    await recordOwnerLegislativeVote(
      body.proposalId,
      body.voteType,
      canonicalOwnerId
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record vote.";
    const status = message.includes("access is required") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
