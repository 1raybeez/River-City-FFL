import { NextResponse } from "next/server";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { buildLiveDraftReportV2Review } from "@/lib/draftReportV2/review";
import { freezeDraftReportV2ReviewSnapshot, listDraftReportV2ReviewSnapshots, readDraftReportV2ReviewSnapshot } from "@/lib/draftReportV2/persistence";

export const runtime = "nodejs";
function unauthorized() { return NextResponse.json({ error: "Commissioner access required." }, { status: 401 }); }
async function guard() { try { return await requireAuctionAccess("maintenance"); } catch (error) { if (error instanceof AuctionAccessError) return null; throw error; } }
export async function GET(request: Request) {
  if (!(await guard())) return unauthorized();
  try { const id = new URL(request.url).searchParams.get("snapshotId"); return NextResponse.json({ review: id ? await readDraftReportV2ReviewSnapshot(id) : await buildLiveDraftReportV2Review(), snapshots: await listDraftReportV2ReviewSnapshots() }, { headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "V2 preview failed." }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!(await guard())) return unauthorized();
  try { const body = await request.json() as { action?: unknown }; if (body.action !== "freeze-v2-snapshot") return NextResponse.json({ error: "Explicit freeze action required." }, { status: 400 }); return NextResponse.json(await freezeDraftReportV2ReviewSnapshot(), { status: 201, headers: { "Cache-Control": "private, no-store" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "V2 snapshot freeze failed." }, { status: 500 }); }
}
