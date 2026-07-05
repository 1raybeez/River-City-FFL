import type {
  AuctionKeeper,
  AuctionPurchase,
  AuctionRosterSlots,
  AuctionTeam,
  AuctionTeamId,
} from "@/lib/auction/types";

export type AuctionTeamMoneyMap = Partial<Record<AuctionTeamId, number>>;

type KeeperCostInput = Pick<AuctionKeeper, "keeperCost">;
type TeamKeeperCostInput = Pick<AuctionKeeper, "keeperCost" | "teamId">;
type PurchaseSpendInput = Pick<AuctionPurchase, "purchasePrice" | "status">;
type TeamPurchaseSpendInput = Pick<
  AuctionPurchase,
  "purchasePrice" | "status" | "teamId"
>;
type TeamBudgetInput = Pick<
  AuctionTeam,
  "keeperCostTotal" | "spentBudget" | "teamBudget"
>;

function safeNonNegativeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function safeNonNegativeInteger(value: number | null | undefined): number {
  return Math.floor(safeNonNegativeNumber(value));
}

export function calculateTotalKeeperCost(
  keepers: readonly KeeperCostInput[]
): number {
  return keepers.reduce(
    (total, keeper) => total + safeNonNegativeNumber(keeper.keeperCost),
    0
  );
}

export function calculateKeeperCostByTeam(
  keepers: readonly TeamKeeperCostInput[]
): AuctionTeamMoneyMap {
  return keepers.reduce<AuctionTeamMoneyMap>((totals, keeper) => {
    totals[keeper.teamId] =
      (totals[keeper.teamId] ?? 0) +
      safeNonNegativeNumber(keeper.keeperCost);
    return totals;
  }, {});
}

export function calculateKeeperCostForTeam(
  keepers: readonly TeamKeeperCostInput[],
  teamId: AuctionTeamId
): number {
  return calculateTotalKeeperCost(
    keepers.filter((keeper) => keeper.teamId === teamId)
  );
}

export function calculatePurchaseSpend(
  purchases: readonly PurchaseSpendInput[]
): number {
  return purchases.reduce((total, purchase) => {
    if (purchase.status === "voided") return total;
    return total + safeNonNegativeNumber(purchase.purchasePrice);
  }, 0);
}

export function calculatePurchaseSpendByTeam(
  purchases: readonly TeamPurchaseSpendInput[]
): AuctionTeamMoneyMap {
  return purchases.reduce<AuctionTeamMoneyMap>((totals, purchase) => {
    if (purchase.status === "voided") return totals;

    totals[purchase.teamId] =
      (totals[purchase.teamId] ?? 0) +
      safeNonNegativeNumber(purchase.purchasePrice);
    return totals;
  }, {});
}

export function calculateTotalSpent(team: TeamBudgetInput): number {
  return (
    safeNonNegativeNumber(team.keeperCostTotal) +
    safeNonNegativeNumber(team.spentBudget)
  );
}

export function calculateRemainingBudget(team: TeamBudgetInput): number {
  return Math.max(
    0,
    safeNonNegativeNumber(team.teamBudget) - calculateTotalSpent(team)
  );
}

export function calculateRosterSpotsRemaining(
  rosterSlots: Partial<
    Pick<AuctionRosterSlots, "filled" | "remaining" | "total">
  >
): number {
  const total = safeNonNegativeInteger(rosterSlots.total);
  const filled = safeNonNegativeInteger(rosterSlots.filled);

  if (total > 0) {
    return Math.max(0, total - Math.min(filled, total));
  }

  return safeNonNegativeInteger(rosterSlots.remaining);
}

export function calculateMaxBid(
  remainingBudget: number | null | undefined,
  openRosterSlots: number | null | undefined
): number {
  const budget = safeNonNegativeNumber(remainingBudget);
  const slots = safeNonNegativeInteger(openRosterSlots);

  if (slots <= 0) return 0;

  return Math.max(0, budget - Math.max(slots - 1, 0));
}

export function calculateMaxBidForTeam(
  team: TeamBudgetInput & Pick<AuctionTeam, "rosterSlots">
): number {
  return calculateMaxBid(
    calculateRemainingBudget(team),
    calculateRosterSpotsRemaining(team.rosterSlots)
  );
}

export function calculateAverageDollarsPerOpenRosterSpot(
  remainingBudget: number | null | undefined,
  openRosterSlots: number | null | undefined
): number {
  const slots = safeNonNegativeInteger(openRosterSlots);
  if (slots <= 0) return 0;

  return safeNonNegativeNumber(remainingBudget) / slots;
}

export function calculateAverageDollarsPerOpenRosterSpotForTeam(
  team: TeamBudgetInput & Pick<AuctionTeam, "rosterSlots">
): number {
  return calculateAverageDollarsPerOpenRosterSpot(
    calculateRemainingBudget(team),
    calculateRosterSpotsRemaining(team.rosterSlots)
  );
}
