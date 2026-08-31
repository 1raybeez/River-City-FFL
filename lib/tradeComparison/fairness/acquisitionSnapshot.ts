import type { NormalizedSleeperAuctionPick, Transaction } from "@/lib/sleeper";
import { resolveNextSeasonKeeperCost, type KeeperAcquisitionEvent } from "@/lib/history/keeperCostResolver";
import type { PublishedAuctionValue } from "../types";

export const POST_DRAFT_ACQUISITION_POLICY_UNDEFINED =
  "POST_DRAFT_ACQUISITION_POLICY_UNDEFINED" as const;
export const ACQUISITION_BASIS_UNAVAILABLE =
  "ACQUISITION_BASIS_UNAVAILABLE" as const;
export const MODEL_VALUE_UNAVAILABLE = "MODEL_VALUE_UNAVAILABLE" as const;

export type CurrentAcquisitionType =
  | "KEEPER"
  | "AUCTION_PURCHASE"
  | "POST_DRAFT_WAIVER"
  | "POST_DRAFT_FREE_AGENT"
  | "POST_DRAFT_TRADE"
  | "UNKNOWN";

export type AcquisitionFairnessEligibility = "ELIGIBLE" | "INELIGIBLE";

export type AcquisitionTransactionEvidence = {
  transactionId: string;
  type: string;
  status: string | null;
  statusUpdated: number | null;
  waiverBid: number | null;
};

export type AcquisitionSnapshotRecord = {
  season: number;
  franchiseId: string;
  playerId: string;
  originalFranchiseId: string | null;
  originalAcquisitionType: "KEEPER" | "AUCTION_PURCHASE" | null;
  originalAcquisitionCost: number | null;
  highestSeasonAcquisitionPrice: number | null;
  projectedNextSeasonKeeperCost: number | null;
  keeperCostStatus: "KNOWN" | "UNKNOWN";
  currentAcquisitionType: CurrentAcquisitionType;
  currentAcquisitionCost: number | null;
  transactionEvidence: AcquisitionTransactionEvidence | null;
  fairnessEligibility: AcquisitionFairnessEligibility;
  unavailableReason: string | null;
  source: "sleeper-finalized-draft" | "sleeper-post-draft-transactions";
  sourceVersion: string;
  generatedAt: string;
};

type SnapshotTeam = { franchiseId: string; rosterId: number | null };
type SnapshotRoster = { roster_id?: number | string | null; players?: unknown };

function playerIds(roster: SnapshotRoster | undefined) {
  return Array.isArray(roster?.players)
    ? roster.players.map((playerId) => String(playerId))
    : [];
}

function transactionRosterId(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function transactionAddsPlayer(transaction: Transaction, playerId: string, rosterId: number) {
  return transaction.adds?.[playerId] !== undefined &&
    transactionRosterId(transaction.adds[playerId]) === rosterId;
}

function acquisitionType(transaction: Transaction | null): CurrentAcquisitionType {
  if (!transaction) return "UNKNOWN";
  if (transaction.type === "trade") return "POST_DRAFT_TRADE";
  if (transaction.type === "waiver") return "POST_DRAFT_WAIVER";
  if (transaction.type === "free_agent" || transaction.type === "free-agent") {
    return "POST_DRAFT_FREE_AGENT";
  }
  return "UNKNOWN";
}

function waiverBid(transaction: Transaction | null) {
  if (!transaction || transaction.type !== "waiver") return null;
  const settings = transaction.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const value = (settings as Record<string, unknown>).waiver_bid;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function transactionAcquisitionEvent(transaction: Transaction, playerId: string): KeeperAcquisitionEvent | null {
  if (transaction.adds?.[playerId] === undefined) return null;
  if (transaction.type !== "waiver" && transaction.type !== "free_agent" && transaction.type !== "free-agent") return null;
  const settings = transaction.settings;
  const settingBid = settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>).waiver_bid
    : null;
  const amount = typeof settingBid === "number" ? settingBid : typeof transaction.amount === "number" ? transaction.amount : null;
  return amount !== null && Number.isFinite(amount) && amount >= 0
    ? { type: transaction.type === "waiver" ? "waiver" : "free_agent", amount, created: transaction.status_updated, transactionId: transaction.transaction_id }
    : null;
}

export function buildAcquisitionSnapshot({
  season,
  teams,
  rosters,
  picks,
  transactions,
  auctionValues,
  generatedAt = new Date().toISOString(),
}: {
  season: number;
  teams: readonly SnapshotTeam[];
  rosters: readonly SnapshotRoster[];
  picks: readonly NormalizedSleeperAuctionPick[];
  transactions: readonly Transaction[];
  auctionValues: ReadonlyMap<string, PublishedAuctionValue>;
  generatedAt?: string;
}): Map<string, AcquisitionSnapshotRecord> {
  const teamsByRoster = new Map(
    teams.flatMap((team) => team.rosterId === null ? [] : [[team.rosterId, team.franchiseId] as const]),
  );
  const rostersById = new Map(
    rosters.flatMap((roster) => {
      const rosterId = transactionRosterId(roster.roster_id);
      return rosterId === null ? [] : [[rosterId, roster] as const];
    }),
  );
  const originalPicksByPlayer = new Map<string, NormalizedSleeperAuctionPick>();
  picks.forEach((pick) => {
    if (pick.playerId) originalPicksByPlayer.set(pick.playerId, pick);
  });
  const orderedTransactions = [...transactions].sort(
    (first, second) => (first.status_updated ?? 0) - (second.status_updated ?? 0),
  );
  const result = new Map<string, AcquisitionSnapshotRecord>();

  teams.forEach((team) => {
    if (team.rosterId === null) return;
    const roster = rostersById.get(team.rosterId);
    playerIds(roster).forEach((playerId) => {
      const originalPick = originalPicksByPlayer.get(playerId) ?? null;
      const remainsWithOriginal = originalPick?.rosterId === team.rosterId;
      const currentTransaction = remainsWithOriginal
        ? null
        : [...orderedTransactions].reverse().find((transaction) =>
            transaction.status === "complete" && transactionAddsPlayer(transaction, playerId, team.rosterId!),
          ) ?? null;
      const currentType: CurrentAcquisitionType = remainsWithOriginal
        ? originalPick?.isKeeper === true ? "KEEPER" : "AUCTION_PURCHASE"
        : acquisitionType(currentTransaction);
      const acquisitionEvents: KeeperAcquisitionEvent[] = [];
      if (originalPick?.auctionPrice !== null && originalPick?.auctionPrice !== undefined) {
        acquisitionEvents.push({ type: originalPick.isKeeper === true ? "keeper" : "draft", amount: originalPick.auctionPrice });
      }
      orderedTransactions.forEach((transaction) => {
        if (transaction.status !== "complete") return;
        const event = transactionAcquisitionEvent(transaction, playerId);
        if (event) acquisitionEvents.push(event);
      });
      const keeperCost = resolveNextSeasonKeeperCost({ playerId, acquisitionEvents });
      const isOriginal = currentType === "KEEPER" || currentType === "AUCTION_PURCHASE";
      const hasModelValue = auctionValues.get(playerId)?.value !== null &&
        auctionValues.get(playerId)?.value !== undefined;
      const eligible = isOriginal && originalPick?.auctionPrice !== null && hasModelValue;
      const originalFranchiseId = originalPick?.rosterId === null || originalPick?.rosterId === undefined
        ? null
        : teamsByRoster.get(originalPick.rosterId) ?? null;
      const unavailableReason = eligible
        ? null
        : !isOriginal
          ? POST_DRAFT_ACQUISITION_POLICY_UNDEFINED
          : originalPick?.auctionPrice === null
            ? ACQUISITION_BASIS_UNAVAILABLE
            : MODEL_VALUE_UNAVAILABLE;
      const evidence = currentTransaction
        ? {
            transactionId: currentTransaction.transaction_id,
            type: currentTransaction.type,
            status: currentTransaction.status ?? null,
            statusUpdated: currentTransaction.status_updated ?? null,
            waiverBid: waiverBid(currentTransaction),
          }
        : null;
      result.set(`${season}:${team.franchiseId}:${playerId}`, {
        season,
        franchiseId: team.franchiseId,
        playerId,
        originalFranchiseId,
        originalAcquisitionType: originalPick
          ? originalPick.isKeeper === true ? "KEEPER" : "AUCTION_PURCHASE"
          : null,
        originalAcquisitionCost: originalPick?.auctionPrice ?? null,
        highestSeasonAcquisitionPrice: keeperCost.highestAcquisitionPrice,
        projectedNextSeasonKeeperCost: keeperCost.nextSeasonCost,
        keeperCostStatus: keeperCost.status,
        currentAcquisitionType: currentType,
        currentAcquisitionCost: eligible ? originalPick?.auctionPrice ?? null : null,
        transactionEvidence: evidence,
        fairnessEligibility: eligible ? "ELIGIBLE" : "INELIGIBLE",
        unavailableReason,
        source: currentTransaction ? "sleeper-post-draft-transactions" : "sleeper-finalized-draft",
        sourceVersion: "sleeper-2026-acquisition-provenance-v1",
        generatedAt,
      });
    });
  });
  return result;
}
