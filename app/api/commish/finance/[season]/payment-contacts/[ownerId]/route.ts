import { NextResponse } from "next/server";

import { AuctionAccessError } from "@/lib/auth/auctionAccess";
import { requireOperationalFinanceCommissioner } from "@/lib/finance/operationalFinanceDashboardAuth";
import { loadOperationalFinanceDashboardFromFirestore } from "@/lib/finance/operationalFinanceDashboardLoader";
import {
  deactivateOperationalFinancePaymentContact,
  setOperationalFinancePaymentContact,
} from "@/lib/finance/operationalFinancePaymentContacts";
import { getOperationalFinancePaymentContactRepository } from "@/lib/finance/operationalFinancePaymentContactsFirestore";

export const runtime = "nodejs";

function isSameOrigin(req: Request) {
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

async function authorize() {
  try {
    return await requireOperationalFinanceCommissioner();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ season: string; ownerId: string }> }
) {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
  }
  const { season: seasonValue, ownerId } = await context.params;
  if (Number(seasonValue) !== 2026) {
    return NextResponse.json({ error: "Payment contacts currently support 2026 only." }, { status: 404 });
  }
  const contact = (await getOperationalFinancePaymentContactRepository().getSnapshot()).contacts.find(
    (entry) => entry.ownerId === ownerId
  );
  return NextResponse.json({
    contact: contact
      ? { method: contact.method, handle: contact.handle, status: contact.status }
      : null,
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ season: string; ownerId: string }> }
) {
  const authorization = await authorize();
  if (!authorization) {
    return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  }
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  }
  const { season: seasonValue, ownerId } = await context.params;
  const season = Number(seasonValue);
  if (season !== 2026) {
    return NextResponse.json({ error: "Payment contacts currently support 2026 only." }, { status: 404 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;
    const allowedFields = action === "deactivate"
      ? new Set(["action", "idempotencyKey"])
      : new Set(["action", "method", "handle", "status", "notes", "idempotencyKey"]);
    const unsupported = Object.keys(body).find((key) => !allowedFields.has(key));
    if (unsupported) throw new Error(`Unsupported payment-contact field: ${unsupported}.`);
    const idempotencyKey = body.idempotencyKey;
    if (typeof idempotencyKey !== "string") {
      throw new Error("Payment-contact idempotency key is required.");
    }
    const repository = getOperationalFinancePaymentContactRepository();
    const now = new Date().toISOString();
    const result = action === "deactivate"
      ? await deactivateOperationalFinancePaymentContact(
          repository,
          ownerId,
          authorization.actor,
          idempotencyKey,
          now
        )
      : action === "set"
        ? await setOperationalFinancePaymentContact(
            repository,
            {
              ownerId,
              method: body.method === "venmo" ? "venmo" : (body.method as never),
              handle: typeof body.handle === "string" ? body.handle : "",
              status:
                body.status === undefined || body.status === "unverified"
                  ? "unverified"
                  : body.status === "active"
                    ? "active"
                    : (() => { throw new Error("Payment-contact status must be active or unverified."); })(),
              notes: typeof body.notes === "string" ? body.notes : null,
            },
            authorization.actor,
            idempotencyKey,
            now
          )
        : (() => { throw new Error("Payment-contact action must be set or deactivate."); })();
    return NextResponse.json(
      {
        created: result.created,
        dashboard: await loadOperationalFinanceDashboardFromFirestore(season),
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment contact could not be saved.";
    const status = /Idempotency/.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
