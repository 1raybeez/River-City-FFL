import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { resolveRsvpAttendee } from "@/lib/rsvpAttendees";

export const runtime = "nodejs";

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

async function readManagerId(req: Request) {
  try {
    const body = (await req.json()) as { managerId?: unknown };
    return typeof body.managerId === "string" ? body.managerId.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request denied." }, { status: 403 });
  }

  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  }

  const requestedAttendeeId = await readManagerId(req);
  const attendee = resolveRsvpAttendee(requestedAttendeeId);
  if (!attendee) {
    return NextResponse.json({ error: "Unknown RSVP manager." }, { status: 400 });
  }

  await firestore.collection("rsvps").doc(attendee.id).set({
    name: attendee.name,
    timestamp: FieldValue.serverTimestamp(),
    status: "Attending",
  });

  return NextResponse.json({ id: attendee.id, name: attendee.name, status: "Attending" });
}
