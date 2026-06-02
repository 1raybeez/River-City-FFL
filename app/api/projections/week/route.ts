import { getDerivedWeeklyProjections } from "@/lib/projections";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get("week") || "1";
    const week = Number(weekParam);
    const projections = await getDerivedWeeklyProjections(week);

    return NextResponse.json({ week, projections });
  } catch (err) {
    console.error("Derived weekly projections error:", err);
    return NextResponse.json(
      { error: "Failed to build weekly projections" },
      { status: 500 }
    );
  }
}
