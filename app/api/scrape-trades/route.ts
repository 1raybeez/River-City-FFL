import { NextResponse } from "next/server";
import { scrapeAllHistoricalTrades } from "@/lib/history/sleeperTradeScraper";

const SECRET_KEY = process.env.SCRAPER_SECRET_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  // Protect the scraper so it cannot be run accidentally
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
    await scrapeAllHistoricalTrades();
    return NextResponse.json({
      status: "success",
      message: "Historical trades scraped and stored successfully."
    });
  } catch (err: any) {
    console.error("Scraper error:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
