// ---------------------------------------------------------
// File: /app/api/projections/active/route.ts
// Purpose: Smart switch between weekly → derived → season
// ---------------------------------------------------------

import { NextResponse } from "next/server";
import {
  getDerivedWeeklyProjections,
  getSeasonProjections,
} from "@/lib/projections";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week") || "1";
  const week = Number(weekParam);

  try {
    // 1) Try REAL weekly projections (future source)
    const weeklyUrl = `https://api.sleeper.com/projections/nfl/ppr/${week}`;
    const weeklyRes = await fetch(weeklyUrl, { cache: "no-store" });

    let weeklyData: any[] = [];

    if (weeklyRes.ok) {
      const raw = await weeklyRes.json();
      if (Array.isArray(raw) && raw.length > 0) {
        weeklyData = raw;
      }
    }

    if (weeklyData.length > 0) {
      return NextResponse.json({
        source: "weekly",
        week,
        projections: weeklyData,
      });
    }

    try {
      const projections = await getDerivedWeeklyProjections(week);
      return NextResponse.json({
        source: "derived",
        week,
        projections,
      });
    } catch (err) {
      console.error("Derived weekly projections fallback failed:", err);
    }

    try {
      const projections = await getSeasonProjections();
      return NextResponse.json({
        source: "season",
        week,
        projections,
      });
    } catch (err) {
      console.error("Season projections fallback failed:", err);
    }

    return NextResponse.json(
      { error: "No projection sources available" },
      { status: 500 }
    );
  } catch (err) {
    console.error("Active projection switch error:", err);
    return NextResponse.json(
      { error: "Failed to load active projections" },
      { status: 500 }
    );
  }
}
