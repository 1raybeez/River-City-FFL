import type {
  AuctionPurchaseDecisionSnapshot,
  AuctionPurchaseDecisionStatus,
} from "@/lib/auction/purchaseDecisionTypes";
import type { WarRoomPurchaseState } from "@/lib/auction/warRoomLiveState";
import type { SleeperAuctionCompletedPurchaseRow } from "@/lib/auction/sleeperAuctionSync";

export type NormalizedAuctionPurchaseStatus = "ACTIVE" | "VOIDED";
export type NormalizedAuctionPurchaseSource =
  | "sleeper-draft"
  | "operational-decision"
  | "war-room-state";

export type NormalizedAuctionPurchase = {
  season: number;
  purchaseId: string | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  rosterId: number | null;
  amount: number;
  source: NormalizedAuctionPurchaseSource;
  status: NormalizedAuctionPurchaseStatus;
  acquiredAt: string | null;
};

export type PurchaseReconciliationConflict = {
  playerId: string | null;
  playerName: string;
  rosterId: number | null;
  selectedSource: NormalizedAuctionPurchaseSource;
  selectedAmount: number;
  competingSources: NormalizedAuctionPurchaseSource[];
  message: string;
};

export type PurchaseReconciliationResult = {
  records: NormalizedAuctionPurchase[];
  activePurchases: NormalizedAuctionPurchase[];
  voidedPurchases: NormalizedAuctionPurchase[];
  conflicts: PurchaseReconciliationConflict[];
  sourceCounts: {
    sleeperPurchaseCount: number;
    operationalPurchaseCount: number;
    warRoomPurchaseCount: number;
  };
};

type Candidate = NormalizedAuctionPurchase;

const sourcePriority: Record<NormalizedAuctionPurchaseSource, number> = {
  "sleeper-draft": 3,
  "operational-decision": 2,
  "war-room-state": 1,
};

function normalizeId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePosition(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() || null;
  return normalized === "DST" || normalized === "D/ST" ? "DEF" : normalized;
}

function normalizeAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizeStatus(status: AuctionPurchaseDecisionStatus | WarRoomPurchaseState["status"]): NormalizedAuctionPurchaseStatus {
  return status === "active" ? "ACTIVE" : "VOIDED";
}

function candidateKey(candidate: Pick<Candidate, "playerId" | "playerName" | "rosterId">) {
  return `${candidate.playerId ?? `name:${normalizeName(candidate.playerName)}`}::${candidate.rosterId ?? "unknown"}`;
}

function toOperationalPurchase(purchase: AuctionPurchaseDecisionSnapshot): Candidate {
  return {
    season: purchase.season,
    purchaseId: purchase.purchaseId,
    playerId: normalizeId(purchase.sleeperPlayerId),
    playerName: purchase.playerName,
    position: normalizePosition(purchase.position),
    rosterId: purchase.buyerRosterId,
    amount: normalizeAmount(purchase.salePrice),
    source: "operational-decision",
    status: normalizeStatus(purchase.status),
    acquiredAt: purchase.purchasedAt ?? purchase.capturedAt,
  };
}

function toSleeperPurchase(purchase: SleeperAuctionCompletedPurchaseRow, season: number): Candidate {
  return {
    season,
    purchaseId: purchase.playerId ? `sleeper:${season}:${purchase.rosterId ?? "unknown"}:${purchase.playerId}` : null,
    playerId: normalizeId(purchase.playerId),
    playerName: purchase.playerName,
    position: normalizePosition(purchase.position),
    rosterId: purchase.rosterId,
    amount: normalizeAmount(purchase.salePrice),
    source: "sleeper-draft",
    status: "ACTIVE",
    acquiredAt: null,
  };
}

function toWarRoomPurchase(purchase: WarRoomPurchaseState, season: number, rosterId: number | null): Candidate {
  return {
    season,
    purchaseId: purchase.purchaseId,
    playerId: normalizeId(purchase.playerId),
    playerName: purchase.playerName,
    position: null,
    rosterId,
    amount: normalizeAmount(purchase.salePrice),
    source: "war-room-state",
    status: normalizeStatus(purchase.status),
    acquiredAt: null,
  };
}

function selectCandidate(candidates: Candidate[]) {
  return [...candidates].sort(
    (first, second) =>
      sourcePriority[second.source] - sourcePriority[first.source] ||
      Number(second.status === "ACTIVE") - Number(first.status === "ACTIVE") ||
      (second.acquiredAt ?? "").localeCompare(first.acquiredAt ?? "") ||
      (second.purchaseId ?? "").localeCompare(first.purchaseId ?? "")
  )[0];
}

export function reconcileAuctionPurchases({
  season,
  sleeperPurchases = [],
  operationalPurchases = [],
  warRoomPurchases = [],
  warRoomRosterId = null,
}: {
  season: number;
  sleeperPurchases?: readonly SleeperAuctionCompletedPurchaseRow[];
  operationalPurchases?: readonly AuctionPurchaseDecisionSnapshot[];
  warRoomPurchases?: readonly WarRoomPurchaseState[];
  warRoomRosterId?: number | null;
}): PurchaseReconciliationResult {
  const candidates = [
    ...sleeperPurchases.map((purchase) => toSleeperPurchase(purchase, season)),
    ...operationalPurchases.map(toOperationalPurchase),
    ...warRoomPurchases.map((purchase) => toWarRoomPurchase(purchase, season, warRoomRosterId)),
  ];
  const groups = new Map<string, Candidate[]>();
  candidates.forEach((candidate) => {
    const key = candidateKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  });

  const conflicts: PurchaseReconciliationConflict[] = [];
  const records = [...groups.values()].flatMap((group) => {
    const selected = selectCandidate(group);
    if (!selected) return [];
    const competingSources = [...new Set(group.map((candidate) => candidate.source))];
    const amountsDiffer = new Set(group.map((candidate) => candidate.amount)).size > 1;
    const statusesDiffer = new Set(group.map((candidate) => candidate.status)).size > 1;
    if (competingSources.length > 1 && (amountsDiffer || statusesDiffer)) {
      conflicts.push({
        playerId: selected.playerId,
        playerName: selected.playerName,
        rosterId: selected.rosterId,
        selectedSource: selected.source,
        selectedAmount: selected.amount,
        competingSources,
        message: `Purchase sources disagree for ${selected.playerName}; ${selected.source} was selected by source priority.`,
      });
    }
    return [selected];
  });

  return {
    records,
    activePurchases: records.filter((purchase) => purchase.status === "ACTIVE"),
    voidedPurchases: records.filter((purchase) => purchase.status === "VOIDED"),
    conflicts,
    sourceCounts: {
      sleeperPurchaseCount: sleeperPurchases.length,
      operationalPurchaseCount: operationalPurchases.length,
      warRoomPurchaseCount: warRoomPurchases.length,
    },
  };
}
