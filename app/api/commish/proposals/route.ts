import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  createLegislativeProposal,
  finalizeLegislativeVoting,
  readLegislativeState,
  recordLegislativeVote,
  setLegislativeVotingOverride,
} from "@/lib/legislativeServer";

export const runtime = "nodejs";

async function getCommissionerActor() {
  try {
    return await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const requestOrigins = new Set([new URL(req.url).origin]);
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProtocol = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost) {
    requestOrigins.add(`${forwardedProtocol || "https"}://${forwardedHost}`);
  }

  const publicHost = process.env.VERCEL_URL?.trim();
  if (publicHost) {
    requestOrigins.add(
      publicHost.startsWith("http") ? publicHost : `https://${publicHost}`
    );
  }

  return requestOrigins.has(origin);
}

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
}

function invalidMutationRequest(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  }
  return null;
}

export async function GET() {
  const actor = await getCommissionerActor();
  if (!actor) return unauthorized();
  return NextResponse.json(await readLegislativeState());
}

export async function POST(req: Request) {
  const actor = await getCommissionerActor();
  if (!actor) return unauthorized();
  const invalidRequest = invalidMutationRequest(req);
  if (invalidRequest) return invalidRequest;

  try {
    const proposalId = await createLegislativeProposal(
      await readJsonBody(req),
      actor.email
    );
    return NextResponse.json({ proposalId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proposal creation failed." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const actor = await getCommissionerActor();
  if (!actor) return unauthorized();
  const invalidRequest = invalidMutationRequest(req);
  if (invalidRequest) return invalidRequest;
  const body = await readJsonBody(req);

  try {
    if (body.action === "set-voting-override") {
      if (typeof body.isOverrideOpen !== "boolean") {
        throw new Error("isOverrideOpen must be boolean.");
      }
      await setLegislativeVotingOverride(body.isOverrideOpen);
      return NextResponse.json(await readLegislativeState());
    }

    if (body.action === "vote") {
      await recordLegislativeVote(body.proposalId, body.managerId, body.voteType);
      return NextResponse.json(await readLegislativeState());
    }

    if (body.action === "finalize") {
      const result = await finalizeLegislativeVoting(actor.email);
      return NextResponse.json({ ...result, ...(await readLegislativeState()) });
    }

    throw new Error("Unknown legislative action.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Legislative update failed." },
      { status: 400 }
    );
  }
}
