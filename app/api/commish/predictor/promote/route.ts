import { NextResponse } from "next/server";
import { AuctionAccessError, requireAuctionAccess } from "@/lib/auth/auctionAccess";
import { getPredictorCalibrationProgress } from "@/lib/predictor/calibrationStatus";
import { CloudStorageShadowResultStore } from "@/lib/predictor/durableShadowStore";
import { validatePromotion } from "@/lib/predictor/promotion";
import { CloudStoragePromotionStore } from "@/lib/predictor/promotionStore";

export const runtime = "nodejs";

async function actor() { try { return await requireAuctionAccess("maintenance"); } catch (error) { if (error instanceof AuctionAccessError) return null; throw error; } }
function unauthorized() { return NextResponse.json({ error: "Commissioner access required." }, { status: 401 }); }

export async function POST(request: Request) {
  const session = await actor();
  if (!session) return unauthorized();
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return NextResponse.json({ error: "JSON request required." }, { status: 415 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: "A valid JSON body is required." }, { status: 400 }); }
  if (body.confirm !== true || typeof body.shadowResultId !== "string" || !Array.isArray(body.inputEvidenceChecksums)) return NextResponse.json({ error: "Explicit confirmation, shadowResultId, and inputEvidenceChecksums are required." }, { status: 400 });
  try {
    const progress = await getPredictorCalibrationProgress();
    const shadow = await new CloudStorageShadowResultStore().read(body.shadowResultId);
    if (!shadow) throw new Error("The requested durable shadow result does not exist.");
    const requestedChecksums = body.inputEvidenceChecksums.filter((value): value is string => typeof value === "string").sort();
    if (requestedChecksums.join("|") !== [...shadow.inputEvidenceChecksums].sort().join("|")) throw new Error("Shadow evidence checksums are stale or do not match the requested promotion.");
    const promotion = validatePromotion({ readiness: progress.readiness, shadow, approvedBy: session.decodedToken.uid, note: typeof body.note === "string" ? body.note : null });
    const result = await new CloudStoragePromotionStore().create(shadow.season, promotion);
    return NextResponse.json({ promotion, persistence: result }, { status: result === "CREATED" ? 201 : 200 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Promotion failed." }, { status: 400 }); }
}
