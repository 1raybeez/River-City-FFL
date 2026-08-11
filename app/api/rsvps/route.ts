import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const PUBLIC_RSVP_MANAGERS: Record<string, string> = {
  "583513420586848256": "Aaron Dogg",
  "343129212162523136": "Brian Stevens",
  "466663208728391680": "David Besedich",
  "73400761740312576": "Doug Fordham",
  "342850391018356736": "JD Dowling",
  "341412060426436608": "Jordan Maslyn",
  "864186418971418624": "Rashad Gresham",
  "342828350391230464": "Ray Long",
  "1260048448384667648": "Stan Schoppe",
  "342849293037608960": "Tommy Moore",
  "342831451382841344": "Travis Miller",
  "342838548870762496": "Wade Cameron",
};

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

  const managerId = await readManagerId(req);
  const managerName = PUBLIC_RSVP_MANAGERS[managerId];
  if (!managerName) {
    return NextResponse.json({ error: "Unknown RSVP manager." }, { status: 400 });
  }

  await firestore.collection("rsvps").doc(managerId).set({
    name: managerName,
    timestamp: FieldValue.serverTimestamp(),
    status: "Attending",
  });

  return NextResponse.json({ id: managerId, name: managerName, status: "Attending" });
}
