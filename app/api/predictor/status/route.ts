import { NextResponse } from "next/server";
import { getPredictorCalibrationProgress } from "@/lib/predictor/calibrationStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json(await getPredictorCalibrationProgress(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Predictor calibration status is temporarily unavailable." }, { status: 503 }); }
}
