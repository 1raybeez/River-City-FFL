// app/api/normalize-trades/route.ts

import { NextResponse } from "next/server";
import { normalizeAllHistoricalTrades } from "@/lib/history/normalizeAllTrades";

const SECRET_KEY = process.env.SCRAPER_SECRET_KEY;
const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Warning: '299 - "GET is deprecated for this maintenance route; use POST."',
};

async function runNormalizer(key: string | null, headers?: HeadersInit) {
  if (!SECRET_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_SECRET_KEY is not set in environment variables." },
      { status: 500, headers }
    );
  }

  if (key !== SECRET_KEY) {
    return NextResponse.json(
      { error: "Unauthorized. Missing or invalid key." },
      { status: 401, headers }
    );
  }

  try {
    const results = await normalizeAllHistoricalTrades();
    return NextResponse.json(
      {
        status: "success",
        message: "Normalized trades built and stored successfully.",
        results,
      },
      { headers }
    );
  } catch (err: any) {
    console.error("Error normalizing historical trades:", err);
    return NextResponse.json(
      { status: "error", message: err?.message ?? "Unknown error" },
      { status: 500, headers }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  return runNormalizer(key, DEPRECATION_HEADERS);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = request.headers.get("x-scraper-key") ?? searchParams.get("key");

  return runNormalizer(key);
}
