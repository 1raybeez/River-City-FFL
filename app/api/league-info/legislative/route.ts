import { NextResponse } from "next/server";
import { getLegislativeOwnerSession, requireLegislativeOwner } from "@/lib/auth/legislativeAccess";
import { validateJsonMutationRequest } from "@/lib/auth/requestSecurity";
import {
  createOwnerLegislativeProposal,
  readOwnerLegislativeState,
} from "@/lib/legislativeServer";

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  const session = await getLegislativeOwnerSession();
  return NextResponse.json(
    await readOwnerLegislativeState(session?.access.canonicalOwnerId ?? null)
  );
}

export async function POST(request: Request) {
  const invalidRequest = validateJsonMutationRequest(request);
  if (invalidRequest) return invalidRequest;
  try {
    const session = await requireLegislativeOwner();
    const canonicalOwnerId = session.access.canonicalOwnerId;
    if (!canonicalOwnerId) throw new Error("Authenticated River City owner access is required.");
    const body = await readBody(request);
    const proposalId = await createOwnerLegislativeProposal(
      body,
      canonicalOwnerId,
      session.email
    );
    return NextResponse.json({ proposalId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit proposal.";
    const status = message.includes("access is required") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
