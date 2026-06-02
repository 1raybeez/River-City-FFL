// ---------------------------------------------------------
// File: /app/api/projections/active/route.ts
// Purpose: Smart switch between weekly → derived → season
// ---------------------------------------------------------

import { NextResponse } from "next/server";

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

    // 2) Fall back to derived weekly projections
    const derivedUrl = `http://localhost:3000/api/projections/week?week=${week}`;
    const derivedRes = await fetch(derivedUrl, { cache: "no-store" });

    if (derivedRes.ok) {
      const derived = await derivedRes.json();
      return NextResponse.json({
        source: "derived",
        week,
        projections: derived.projections,
      });
    }

    // 3) Final fallback: season projections
    const seasonUrl = `http://localhost:3000/api/projections/season`;
    const seasonRes = await fetch(seasonUrl, { cache: "no-store" });

    if (seasonRes.ok) {
      const season = await seasonRes.json();
      return NextResponse.json({
        source: "season",
        week,
        projections: season.projections,
      });
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
