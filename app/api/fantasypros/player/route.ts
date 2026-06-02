// ---------------------------------------------------------
// File: /app/api/fantasypros/player/route.ts
// CURRENT VERSION + DEBUG LOGS
// ---------------------------------------------------------

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json(
      { error: "Player ID is required" },
      { status: 400 }
    );
  }

  try {
    // FantasyPros session token from .env.local
    const sessionToken = process.env.FANTASYPROS_SESSION;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "FantasyPros session token missing" },
        { status: 500 }
      );
    }

    // Fetch the full FantasyPros player dataset
    const fpRes = await fetch(
  "https://partners.fantasypros.com/api/v1/nfl/players",
  {
    headers: {
      Cookie: `fptoken=${sessionToken}`,
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  }
);

    if (!fpRes.ok) {
      console.error(
        "FantasyPros fetch failed:",
        fpRes.status,
        await fpRes.text()
      );
      return NextResponse.json(
        { error: "Failed to fetch FantasyPros data" },
        { status: 500 }
      );
    }

    const data = await fpRes.json();

    // FantasyPros returns a list of players under data.players
    const players = data?.players || [];

    // Find the specific player by FantasyPros ID
    const fpPlayer = players.find(
      (p: any) =>
        String(p.player_id) === String(playerId) ||
        String(p.id) === String(playerId)
    );

    if (!fpPlayer) {
      return NextResponse.json(
        { error: "Player not found in FantasyPros data" },
        { status: 404 }
      );
    }

    // Normalize the projection data for your analyzer
    const projections = {
      rosProjection: fpPlayer?.ros_points ?? null,
      playoffProjection: fpPlayer?.playoff_points ?? null,
      sosScore: fpPlayer?.sos ?? null,
      ecrRank: fpPlayer?.ecr ?? null,
      boomRate: fpPlayer?.boom ?? null,
      bustRate: fpPlayer?.bust ?? null,
    };

    return NextResponse.json(projections);
  } catch (error) {
    console.error("FantasyPros API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projections" },
      { status: 500 }
    );
  }
}
