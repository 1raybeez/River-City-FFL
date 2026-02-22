import { LEAGUE_HISTORY_IDS } from "../leagueAlgorithm";
import { saveHistoricalTrade, HistoricalTrade } from "./tradeHistory";

/**
 * Fetch all trades for a given league + year from Sleeper.
 * Sleeper stores trades under /transactions/{week}.
 */
async function fetchTradesForLeagueYear(
  leagueId: string,
  year: number
): Promise<HistoricalTrade[]> {
  const allTrades: HistoricalTrade[] = [];

  // Sleeper weeks range from 1–18 (regular season)
  for (let week = 1; week <= 18; week++) {
    try {
      const url = `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) continue;

      const transactions = await res.json();

      // Filter for trades only
      const trades = transactions.filter((t: any) => t.type === "trade");

      for (const t of trades) {
        const tradeId = String(t.transaction_id);

        const trade: HistoricalTrade = {
          tradeId,
          year,
          week,
          createdAt: t.created ?? Date.now(),
          leagueId,
          teamIdsInvolved: t.roster_ids ?? [],
          valueGap: null,          // computed later
          fairnessScore: null,     // computed later
          rawSleeperTransaction: t,
          metadata: {}
        };

        allTrades.push(trade);
      }
    } catch (err) {
      console.error(`Error fetching trades for ${leagueId} week ${week}`, err);
    }
  }

  return allTrades;
}

/**
 * Main function:
 * Loops through all historical league IDs (2018 → present),
 * fetches all trades, and stores them in Firebase.
 */
export async function scrapeAllHistoricalTrades(): Promise<void> {
  for (const yearStr of Object.keys(LEAGUE_HISTORY_IDS)) {
    const year = Number(yearStr);
    const leagueId = LEAGUE_HISTORY_IDS[year];

    console.log(`Scraping trades for ${year} (League ${leagueId})...`);

    const trades = await fetchTradesForLeagueYear(leagueId, year);

    for (const trade of trades) {
      await saveHistoricalTrade(year, trade);
    }

    console.log(`✔ Completed ${year}: ${trades.length} trades saved.`);
  }

  console.log("✔ All historical trades scraped and stored.");
}
