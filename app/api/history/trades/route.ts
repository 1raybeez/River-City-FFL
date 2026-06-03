// app/api/history/trades/route.ts

import { firestore } from "@/lib/firebaseAdmin";
import { LEAGUE_IDS } from "@/lib/sleeper";
import { NextResponse } from "next/server";

const CURRENT_SEASON = 2026;
const DEPRECATION_HEADERS = {
  Deprecation: "true",
  Warning: '299 - "GET refresh/write behavior is deprecated; use POST."',
};

// Helper to fetch NFL state (week + season)
async function fetchNFLState() {
  try {
    const res = await fetch("https://api.sleeper.app/v1/state/nfl", { cache: "no-store" });
    if (!res.ok) return { week: 1, season: "2025" };
    return await res.json();
  } catch {
    return { week: 1, season: "2025" };
  }
}

async function readStoredTrades(season: number) {
  const snapshot = await firestore
    .collection("trades")
    .doc(season.toString())
    .collection("entries")
    .get();

  return snapshot.docs.map((d) => d.data());
}

async function refreshCurrentSeasonTrades(season: number, leagueId: string) {
  // Fetch from Sleeper for current season
  const nflState = await fetchNFLState();
  const currentWeek = nflState.week > 0 ? nflState.week : 1;

  const weekPromises: Promise<any[]>[] = [];

  for (let week = 1; week <= currentWeek; week++) {
    const url = `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`;
    const p = fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => []);
    weekPromises.push(p);
  }

  const weekResults = await Promise.all(weekPromises);
  const allTransactions = weekResults.flat();

  const acceptedTrades = allTransactions.filter(
    (tx: any) => tx.type === "trade" && tx.status === "complete"
  );

  const trades = acceptedTrades.map((tx: any) => {
    const teams = Object.entries(tx.add || {}).map(([playerId, teamId]) => ({
      teamId,
      playersIn: [playerId],
      playersOut: [],
      faabIn: 0,
      faabOut: 0,
    }));

    return {
      id: tx.transaction_id,
      season,
      timestamp: tx.status_updated,
      teams,
    };
  });

  // Auto-store in Firebase
  for (const trade of trades) {
    await firestore
      .collection("trades")
      .doc(season.toString())
      .collection("entries")
      .doc(trade.id)
      .set(trade, { merge: true });
  }

  return trades;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get("season")) || CURRENT_SEASON;
    const leagueId = LEAGUE_IDS[season];

    if (!leagueId) {
      return NextResponse.json(
        { error: "Invalid season or missing league ID." },
        { status: 400 }
      );
    }

    // Load from Firebase for past seasons
    if (season < CURRENT_SEASON) {
      const trades = await readStoredTrades(season);
      return NextResponse.json(trades);
    }

    const trades = await refreshCurrentSeasonTrades(season, leagueId);

    return NextResponse.json(trades, { headers: DEPRECATION_HEADERS });
  } catch (error) {
    console.error("Trade history route error:", error);
    return NextResponse.json(
      { error: "Failed to load trade history." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get("season")) || CURRENT_SEASON;
    const leagueId = LEAGUE_IDS[season];

    if (!leagueId) {
      return NextResponse.json(
        { error: "Invalid season or missing league ID." },
        { status: 400 }
      );
    }

    const trades = await refreshCurrentSeasonTrades(season, leagueId);

    return NextResponse.json(trades);
  } catch (error) {
    console.error("Trade history route error:", error);
    return NextResponse.json(
      { error: "Failed to load trade history." },
      { status: 500 }
    );
  }
}
