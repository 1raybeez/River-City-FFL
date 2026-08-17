// app/api/history/trades/route.ts

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import { firestore } from "@/lib/firebaseAdmin";
import { LEAGUE_IDS } from "@/lib/sleeper";
import { NextResponse } from "next/server";

const CURRENT_SEASON = 2026;

type TradeTransaction = {
  transaction_id?: string | number | null;
  type?: string;
  status?: string;
  add?: Record<string, string | number> | null;
  [key: string]: unknown;
};

type WeekSourceResult = {
  week: number;
  status: "success" | "failure";
  transactions: TradeTransaction[];
  transactionCount: number;
  error?: string;
};

class TradeRefreshIncompleteError extends Error {
  constructor(
    readonly season: number,
    readonly requiredWeeks: number[],
    readonly successfulWeeks: number[],
    readonly failedWeeks: number[],
    readonly sourceFailure?: string
  ) {
    super("Trade refresh aborted: Sleeper source coverage incomplete.");
    this.name = "TradeRefreshIncompleteError";
  }
}

// Helper to fetch NFL state (week + season)
async function fetchNFLState() {
  try {
    const res = await fetch("https://api.sleeper.app/v1/state/nfl", { cache: "no-store" });
    if (!res.ok) return null;
    const state = await res.json();
    if (!state || !Number.isInteger(state.week) || state.week < 1) return null;
    return state as { week: number; season?: string };
  } catch {
    return null;
  }
}

async function fetchTradeWeek(leagueId: string, week: number): Promise<WeekSourceResult> {
  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return {
        week,
        status: "failure",
        transactions: [],
        transactionCount: 0,
        error: `Sleeper returned HTTP ${res.status}`,
      };
    }

    const payload: unknown = await res.json();
    if (
      !Array.isArray(payload) ||
      payload.some(
        (transaction) =>
          !transaction ||
          typeof transaction !== "object" ||
          !("transaction_id" in transaction) ||
          (typeof transaction.transaction_id !== "string" &&
            typeof transaction.transaction_id !== "number")
      )
    ) {
      return {
        week,
        status: "failure",
        transactions: [],
        transactionCount: 0,
        error: "Malformed Sleeper transaction payload",
      };
    }

    return {
      week,
      status: "success",
      transactions: payload as TradeTransaction[],
      transactionCount: payload.length,
    };
  } catch {
    return {
      week,
      status: "failure",
      transactions: [],
      transactionCount: 0,
      error: "Sleeper request failed",
    };
  }
}

async function refreshCurrentSeasonTrades(season: number, leagueId: string) {
  const nflState = await fetchNFLState();
  if (!nflState) {
    throw new TradeRefreshIncompleteError(season, [], [], [], "nfl-state");
  }

  const requiredWeeks = Array.from({ length: nflState.week }, (_, index) => index + 1);
  const weekResults = await Promise.all(
    requiredWeeks.map((week) => fetchTradeWeek(leagueId, week))
  );
  const successfulWeeks = weekResults
    .filter((result) => result.status === "success")
    .map((result) => result.week);
  const failedResults = weekResults.filter((result) => result.status === "failure");

  if (failedResults.length > 0) {
    throw new TradeRefreshIncompleteError(
      season,
      requiredWeeks,
      successfulWeeks,
      failedResults.map((result) => result.week),
      failedResults.map((result) => `${result.week}: ${result.error ?? "source failure"}`).join("; ")
    );
  }

  const allTransactions = weekResults.flatMap((result) => result.transactions);

  const acceptedTrades = allTransactions.filter(
    (tx) => tx.type === "trade" && tx.status === "complete"
  );

  const trades = acceptedTrades.map((tx) => {
    const teams = Object.entries(tx.add || {}).map(([playerId, teamId]) => ({
      teamId,
      playersIn: [playerId],
      playersOut: [],
      faabIn: 0,
      faabOut: 0,
    }));

    return {
      id: String(tx.transaction_id),
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

  return {
    season,
    requiredWeeks,
    successfulWeeks,
    normalizedTradeCount: trades.length,
    writtenCount: trades.length,
    trades,
  };
}

export async function GET() {
  return NextResponse.json(
    {
      error: "GET is deprecated and never performs trade refreshes. Use authorized POST.",
    },
    {
      status: 410,
      headers: {
        Deprecation: "true",
        Allow: "POST",
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    await requireAuctionAccess("maintenance");

    const { searchParams } = new URL(req.url);
    const rawSeason = searchParams.get("season");
    const season = rawSeason === null ? CURRENT_SEASON : Number(rawSeason);
    const leagueId = LEAGUE_IDS[season];

    if (!Number.isInteger(season) || season !== CURRENT_SEASON || !leagueId) {
      return NextResponse.json(
        { error: "Only the supported current season may be refreshed." },
        { status: 400 }
      );
    }

    const result = await refreshCurrentSeasonTrades(season, leagueId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json(
        { error: "Commissioner maintenance authorization required." },
        { status: 401 }
      );
    }

    if (error instanceof TradeRefreshIncompleteError) {
      return NextResponse.json(
        {
          error: error.message,
          season: error.season,
          requiredWeeks: error.requiredWeeks,
          successfulWeeks: error.successfulWeeks,
          failedWeeks: error.failedWeeks,
          sourceFailure: error.sourceFailure,
        },
        { status: 502 }
      );
    }

    console.error("Trade history route error:", error);
    return NextResponse.json(
      { error: "Failed to load trade history." },
      { status: 500 }
    );
  }
}
