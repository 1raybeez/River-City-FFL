// app/api/normalize-trades/route.ts

import { NextResponse } from "next/server";
import { normalizeAllHistoricalTrades } from "@/lib/history/normalizeAllTrades";

const SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!SECRET_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_SECRET_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  if (key !== SECRET_KEY) {
    return NextResponse.json(
      { error: "Unauthorized. Missing or invalid key." },
      { status: 401 }
    );
  }

  try {
    const results = await normalizeAllHistoricalTrades();
    return NextResponse.json({
      status: "success",
      message: "Normalized trades built and stored successfully.",
      results,
    });
  } catch (err: any) {
    console.error("Error normalizing historical trades:", err);
    return NextResponse.json(
      { status: "error", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
