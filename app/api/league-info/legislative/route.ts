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
  try {
    const invalidRequest = validateJsonMutationRequest(request);
    if (invalidRequest) {
      const payload = (await invalidRequest.json()) as { error?: string };
      return NextResponse.json(
        { ok: false, error: payload.error ?? "Invalid proposal request." },
        { status: invalidRequest.status }
      );
    }
    const session = await requireLegislativeOwner();
    const canonicalOwnerId = session.access.canonicalOwnerId;
    if (!canonicalOwnerId) throw new Error("Authenticated River City owner access is required.");
    const body = await readBody(request);
    const proposalId = await createOwnerLegislativeProposal(
      body,
      canonicalOwnerId,
      session.email
    );
    return NextResponse.json({ ok: true, proposalId }, { status: 201 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isUnauthorized = rawMessage.includes("access is required") || rawMessage.includes("authenticated owner");
    const isValidation = rawMessage.includes("valid proposer") || rawMessage.includes("session configuration");
    const message = isUnauthorized
      ? "Authenticated River City owner access is required."
      : isValidation
        ? rawMessage
        : "We couldn't submit your proposal right now. Please try again.";
    const status = isUnauthorized ? 401 : isValidation ? 400 : 500;
    if (status === 500) console.error("Legislative proposal submission failed.", error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
