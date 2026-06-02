// lib/history/keeperCostResolver.ts

export interface SleeperTransaction {
  type: "draft" | "keeper" | "waiver" | "free_agent" | "trade" | string;
  amount?: number;          // auction $ or FAAB bid
  created: number;          // timestamp (ms or s, we’ll normalize)
}

export interface KeeperCostResult {
  playerId: string;
  currentCost: number;      // this season's cost (from Sleeper)
  nextSeasonCost: number;   // projected cost for next season (+$10)
}

/**
 * Normalize Sleeper transactions into a consistent shape.
 * You can adapt this to your actual Sleeper API response.
 */
function normalizeTransactions(raw: any[]): SleeperTransaction[] {
  return raw.map((tx) => ({
    type: tx.type,
    amount: typeof tx.amount === "number" ? tx.amount : undefined,
    created: typeof tx.created === "number" ? tx.created : Date.parse(tx.created),
  }));
}

/**
 * Find the most recent transaction with a dollar amount.
 * This is your league's source of truth for current keeper cost.
 */
function findLatestPricedTransaction(
  transactions: SleeperTransaction[]
): SleeperTransaction | null {
  const priced = transactions.filter((tx) => typeof tx.amount === "number");
  if (!priced.length) return null;

  return priced.sort((a, b) => b.created - a.created)[0];
}

/**
 * Core resolver:
 * - currentCost = latest Sleeper dollar value (draft / keeper / FAAB)
 * - nextSeasonCost = currentCost + 10
 */
export function resolveKeeperCostForPlayer(
  playerId: string,
  rawTransactions: any[]
): KeeperCostResult {
  const transactions = normalizeTransactions(rawTransactions);
  const latest = findLatestPricedTransaction(transactions);

  const currentCost = latest?.amount ?? 0;
  const nextSeasonCost = currentCost > 0 ? currentCost + 10 : 0;

  return {
    playerId,
    currentCost,
    nextSeasonCost,
  };
}
