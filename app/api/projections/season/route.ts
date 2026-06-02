import { getSeasonProjections } from "@/lib/projections";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const projections = await getSeasonProjections();

    return NextResponse.json({ projections });
  } catch (err) {
    console.error("FantasyData API Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch season projections" },
      { status: 500 }
    );
  }
}
