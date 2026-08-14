import { NextResponse } from "next/server";
import { getCanonicalPowerRankings } from "@/lib/powerRankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getCanonicalPowerRankings());
  } catch (error) {
    console.error("Canonical power rankings request failed", error);
    return NextResponse.json(
      { error: "Power rankings data could not be loaded." },
      { status: 500 }
    );
  }
}
