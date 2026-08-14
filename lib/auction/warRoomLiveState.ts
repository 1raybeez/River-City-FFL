import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";
import { assertAuthorizedWarRoomRequest } from "@/lib/auction/warRoomScope";
import {
  calculateAverageDollarsPerOpenRosterSpot,
  calculateMaxBid,
  calculateRemainingBudget,
  calculateRosterSpotsRemaining,
  calculateTotalSpent,
} from "@/lib/auction/calculations";
import type { AuctionPurchaseDecisionSnapshot } from "@/lib/auction/purchaseDecisionTypes";

export const WAR_ROOM_LIVE_STATE_COLLECTION = "live";
export const WAR_ROOM_LIVE_STATE_DOCUMENT = "2026";

export type WarRoomKeeperState = {
  playerId: string;
  playerName: string;
  keeperCost: number | null;
  status: "declared" | "locked";
};

export type WarRoomPurchaseState = {
  purchaseId: string;
  playerId: string | null;
  playerName: string;
  salePrice: number;
  status: "active" | "undone";
};

export type WarRoomBudgetState = {
  teamBudget: number;
  keeperCostTotal: number;
  spentBudget: number;
};

export type WarRoomNominationState = {
  nominatedPlayerId: string | null;
  nominatedPlayerName: string | null;
  currentBid: number | null;
  nominatedByOwnerId: string | null;
};

export type WarRoomLiveAuctionState = {
  season: 2026;
  warRoomId: string;
  keepers: WarRoomKeeperState[];
  budget: WarRoomBudgetState;
  purchases: WarRoomPurchaseState[];
  nomination: WarRoomNominationState | null;
  updatedByOwnerId: string;
  updatedAt: string;
  schemaVersion: 1;
};

export function getWarRoomLiveStatePath(warRoomId: string) {
  return `auction_war_rooms/${warRoomId}/${WAR_ROOM_LIVE_STATE_COLLECTION}/${WAR_ROOM_LIVE_STATE_DOCUMENT}`;
}

export function assertWarRoomLiveStateScope(
  access: Pick<
    AuctionAccessResult,
    | "canonicalOwnerId"
    | "authorizedFranchiseId"
    | "warRoomId"
    | "sleeperRosterId"
  >,
  requested?: {
    ownerId?: string | null;
    ownerProfileId?: string | null;
    franchiseId?: string | null;
    warRoomId?: string | null;
    rosterId?: string | number | null;
  }
) {
  return assertAuthorizedWarRoomRequest(access, requested);
}

export type LegacyLiveAuctionStateClassification = {
  legacyPath: string;
  targetWarRoomId: string;
  stateTypes: readonly ("keeper" | "budget" | "purchase" | "nomination")[];
  classification: "legacy-profile" | "local-demo" | "commissioner-global";
  migrationAction: "review-before-migration" | "no-production-record" | "remain-global";
};

export const legacyLiveAuctionStateClassifications: readonly LegacyLiveAuctionStateClassification[] = [
  {
    legacyPath: "lib/auction/mockAuctionData.ts",
    targetWarRoomId: "2026:<derived franchise War Room>",
    stateTypes: ["keeper", "budget", "purchase", "nomination"],
    classification: "local-demo",
    migrationAction: "no-production-record",
  },
  {
    legacyPath: "auction_purchase_decisions/2026/purchases",
    targetWarRoomId: "2026:<buyer franchise, commissioner-validated>",
    stateTypes: ["purchase", "budget"],
    classification: "commissioner-global",
    migrationAction: "remain-global",
  },
  {
    legacyPath: "auction_owner_profiles/{ownerProfileId}/settings/2026",
    targetWarRoomId: "2026:<derived franchise War Room>",
    stateTypes: ["keeper", "budget", "nomination"],
    classification: "legacy-profile",
    migrationAction: "review-before-migration",
  },
];

export function isGlobalAuctionState(stateType: "current-nomination" | "published-values" | "adp") {
  return stateType === "current-nomination" || stateType === "published-values" || stateType === "adp";
}

export function createEmptyWarRoomLiveAuctionState(
  warRoomId: string,
  updatedByOwnerId: string,
  updatedAt: string
): WarRoomLiveAuctionState {
  return {
    season: 2026,
    warRoomId,
    keepers: [],
    budget: {
      teamBudget: 0,
      keeperCostTotal: 0,
      spentBudget: 0,
    },
    purchases: [],
    nomination: null,
    updatedByOwnerId,
    updatedAt,
    schemaVersion: 1,
  };
}

export type DerivedWarRoomBudgetState = WarRoomBudgetState & {
  totalSpent: number;
  remainingBudget: number;
  rosterSpotsRemaining: number;
  maxBid: number;
  averageDollarsPerOpenSlot: number;
};

export function deriveWarRoomBudgetState({
  teamBudget,
  rosterSlots,
  keepers,
  purchases,
}: {
  teamBudget: number;
  rosterSlots: number;
  keepers: readonly WarRoomKeeperState[];
  purchases: readonly WarRoomPurchaseState[];
}): DerivedWarRoomBudgetState {
  const keeperCostTotal = keepers.reduce(
    (sum, keeper) => sum + (keeper.keeperCost ?? 0),
    0
  );
  const spentBudget = purchases
    .filter((purchase) => purchase.status === "active")
    .reduce((sum, purchase) => sum + purchase.salePrice, 0);
  const remainingBudget = calculateRemainingBudget({
    teamBudget,
    keeperCostTotal,
    spentBudget,
  });
  const rosterSpotsRemaining = calculateRosterSpotsRemaining({
    total: rosterSlots,
    filled: keepers.length + purchases.filter((purchase) => purchase.status === "active").length,
    remaining: 0,
  });
  const maxBid = calculateMaxBid(remainingBudget, rosterSpotsRemaining);

  return {
    teamBudget,
    keeperCostTotal,
    spentBudget,
    totalSpent: calculateTotalSpent({ teamBudget, keeperCostTotal, spentBudget }),
    remainingBudget,
    rosterSpotsRemaining,
    maxBid,
    averageDollarsPerOpenSlot: calculateAverageDollarsPerOpenRosterSpot(
      remainingBudget,
      rosterSpotsRemaining
    ),
  };
}

export function filterPurchasesForWarRoom(
  snapshots: readonly AuctionPurchaseDecisionSnapshot[],
  rosterId: number,
  season = 2026
) {
  const teamId = `${season}:${rosterId}`;
  return snapshots.filter(
    (snapshot) =>
      snapshot.buyerRosterId === rosterId || snapshot.buyerTeamId === teamId
  );
}
