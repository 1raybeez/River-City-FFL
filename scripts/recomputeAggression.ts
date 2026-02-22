// scripts/recomputeAggression.ts
//
// Recomputes Trade Aggression for all active managers using ALL historical trades
// from 2018 → currentYear. Automatically includes new years as trades occur.
// Writes updated aggression scores back into lib/managers/activeManagers.ts.

import { firestore as db } from "../lib/firebaseAdmin";
import { getHistoricalTradesForYear } from "../lib/history/tradeHistory";
import { normalizeSingleTrade } from "../lib/history/normalizeTrade";
import { computeTradeAggression } from "../lib/tradeAggressionEngine";
import { activeManagers } from "../lib/managers/activeManagers";

import * as fs from "fs";
import * as path from "path";

// Path to active managers file
const ACTIVE_MANAGERS_PATH = path.join(
  process.cwd(),
  "lib",
  "managers",
  "activeManagers.ts"
);

// Determine year range dynamically
const START_YEAR = 2018;
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - START_YEAR + 1 },
  (_, i) => START_YEAR + i
);

async function loadAllTrades() {
  const allTrades: any[] = [];

  for (const year of YEARS) {
    console.log(`📘 Loading trades for ${year}...`);
    const rawTrades = await getHistoricalTradesForYear(year);

    for (const t of rawTrades) {
      const { trade } = await normalizeSingleTrade(
        year,
        t.tradeId,
        {
          createdAt: t.createdAt,
          leagueId: t.leagueId,
          metadata: t.metadata,
          rawSleeperTransaction: t.rawSleeperTransaction
        }
      );

      if (!trade) {
        console.log(`⚠️ Skipping trade ${t.tradeId} (missing raw data)`);
        continue;
      }

      // Convert normalized TradeRecord → TradeDoc shape expected by aggression engine
      allTrades.push({
        tradeId: trade.id,
        year: trade.year,
        week: t.week ?? null,
        teamIdsInvolved: t.teamIdsInvolved ?? [],
        valueGap: t.valueGap ?? null,
        waiver_budget: t.rawSleeperTransaction?.waiver_budget ?? null,
        rawSleeperTransaction: t.rawSleeperTransaction
      });
    }
  }

  console.log(`📦 Loaded ${allTrades.length} normalized trades total.`);
  return allTrades;
}

async function recomputeAggression() {
  console.log("🔄 Recomputing Trade Aggression...");

  const allTrades = await loadAllTrades();

  const updatedManagers = activeManagers.map((mgr: any) => {
    // ⭐ FIXED — use mgr.roster, not mgr.rosterId
    const rosterId = Number(mgr.roster);

    const aggression = computeTradeAggression(allTrades, rosterId);

    return {
      ...mgr,
      tradeAggression: aggression
    };
  });

  // Write updated file
  const fileContents = `// AUTO-GENERATED FILE — DO NOT EDIT
// Updated: ${new Date().toISOString()}

export const activeManagers = ${JSON.stringify(updatedManagers, null, 2)} as const;
`;

  fs.writeFileSync(ACTIVE_MANAGERS_PATH, fileContents, "utf8");

  console.log("✅ Trade Aggression updated successfully!");
  console.log(`📁 Written to: ${ACTIVE_MANAGERS_PATH}`);
}

recomputeAggression().catch((err) => {
  console.error("❌ Error recomputing aggression:", err);
  process.exit(1);
});
