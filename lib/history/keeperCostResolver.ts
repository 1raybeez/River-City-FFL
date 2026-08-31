// lib/history/keeperCostResolver.ts

export interface SleeperTransaction {
  type: "draft" | "keeper" | "waiver" | "free_agent" | "trade" | string;
  amount?: number;          // auction $ or FAAB bid
  created: number;          // timestamp (ms or s, we’ll normalize)
}

export type KeeperAcquisitionType = "draft" | "keeper" | "waiver" | "free_agent";

export interface KeeperAcquisitionEvent {
  type: KeeperAcquisitionType;
  amount: number;
  created?: number;
  transactionId?: string;
}

export interface KeeperCostResult {
  playerId: string;
  status: "KNOWN" | "UNKNOWN";
  highestAcquisitionPrice: number | null;
  currentCost: number | null;
  nextSeasonCost: number | null;
  acquisitionEvents: KeeperAcquisitionEvent[];
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

function isKeeperAcquisitionType(value: unknown): value is KeeperAcquisitionType {
  return value === "draft" || value === "keeper" || value === "waiver" || value === "free_agent";
}

function normalizeAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Current-season highest auction/FAAB acquisition price plus $10. */
export function resolveNextSeasonKeeperCost({
  playerId,
  acquisitionEvents,
}: {
  playerId: string;
  acquisitionEvents: readonly KeeperAcquisitionEvent[];
}): KeeperCostResult {
  const events = acquisitionEvents
    .filter((event) => isKeeperAcquisitionType(event.type) && normalizeAmount(event.amount) !== null)
    .map((event) => ({ ...event, amount: normalizeAmount(event.amount)! }));

  if (events.length === 0) {
    return { playerId, status: "UNKNOWN", highestAcquisitionPrice: null, currentCost: null, nextSeasonCost: null, acquisitionEvents: [] };
  }

  const highestAcquisitionPrice = Math.max(...events.map((event) => event.amount));
  return {
    playerId,
    status: "KNOWN",
    highestAcquisitionPrice,
    currentCost: highestAcquisitionPrice,
    nextSeasonCost: highestAcquisitionPrice + 10,
    acquisitionEvents: events,
  };
}

/**
 * Core resolver:
 * Compatibility wrapper for the older raw-transaction caller.
 */
export function resolveKeeperCostForPlayer(
  playerId: string,
  rawTransactions: any[]
): KeeperCostResult {
  const transactions = normalizeTransactions(rawTransactions);
  return resolveNextSeasonKeeperCost({
    playerId,
    acquisitionEvents: transactions.flatMap((transaction) => {
      const type = transaction.type === "free-agent" ? "free_agent" : transaction.type;
      return isKeeperAcquisitionType(type) && normalizeAmount(transaction.amount) !== null
        ? [{ type, amount: normalizeAmount(transaction.amount)!, created: transaction.created }]
        : [];
    }),
  });
}
