// app/api/history/trades/route.ts

import { db } from "@/lib/firebase";
import { LEAGUE_IDS } from "@/lib/sleeper";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const season = Number(searchParams.get("season")) || 2026;
    const leagueId = LEAGUE_IDS[season];

    if (!leagueId) {
      return NextResponse.json(
        { error: "Invalid season or missing league ID." },
        { status: 400 }
      );
    }

    let trades: any[] = [];

    // Load from Firebase for past seasons
    if (season < 2026) {
      const snapshot = await getDocs(
        collection(db, "trades", season.toString(), "entries")
      );
      trades = snapshot.docs.map((d) => d.data());
      return NextResponse.json(trades);
    }

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

    trades = acceptedTrades.map((tx: any) => {
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
      await setDoc(
        doc(db, "trades", season.toString(), "entries", trade.id),
        trade,
        { merge: true }
      );
    }

    return NextResponse.json(trades);
  } catch (error) {
    console.error("Trade history route error:", error);
    return NextResponse.json(
      { error: "Failed to load trade history." },
      { status: 500 }
    );
  }
}
