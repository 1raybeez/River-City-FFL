import { activeManagers } from "@/lib/managers/activeManagers";
import {
  franchises,
  ownerProfilesById,
} from "@/lib/managers/identityData";
import { FranchiseStatus } from "@/lib/managers/identityTypes";
import type { AuctionTeam, AuctionTeamId } from "@/lib/auction/types";

const season = 2026 as const;
const rosterSlots = {
  total: 16,
  filled: 0,
  remaining: 16,
  keeperSlotsUsed: 0,
  starterSlots: 9,
  benchSlots: 7,
} as const;

export type CanonicalAuctionTeam = AuctionTeam & {
  franchiseId: string;
  warRoomId: string;
  ownerIds: readonly string[];
  ownerNames: readonly string[];
  ownerLabel: string;
};

function getRosterId(franchiseId: string, teamName: string) {
  return (
    franchises.find((franchise) => franchise.id === franchiseId)
      ?.currentSleeperRosterId ??
    activeManagers.find((manager) => manager.teamName === teamName)?.roster ??
    null
  );
}

function getOwnerIds(franchiseId: string) {
  return franchises.find((franchise) => franchise.id === franchiseId)
    ?.activeOwnerIds ?? [];
}

function buildTeam(franchiseId: string): CanonicalAuctionTeam | null {
  const franchise = franchises.find(
    (candidate) =>
      candidate.id === franchiseId && candidate.status === FranchiseStatus.Active
  );
  if (!franchise) return null;

  const rosterId = getRosterId(franchise.id, franchise.currentTeamName);
  const ownerIds = getOwnerIds(franchise.id);
  const ownerNames = ownerIds.flatMap((ownerId) => {
    const owner = ownerProfilesById[ownerId];
    return owner ? [owner.fullName] : [];
  });
  const primaryOwnerId = ownerIds[0];
  const primaryOwner = primaryOwnerId
    ? ownerProfilesById[primaryOwnerId]
    : undefined;
  const primarySleeperId = primaryOwner?.sleeperIds[0] ?? null;

  if (rosterId === null || !primaryOwner || !primarySleeperId) return null;

  const teamId = `${season}:${rosterId}` as AuctionTeamId;
  const ownerLabel = ownerNames.join(" / ");

  return {
    id: teamId,
    seasonYear: season,
    rosterId: rosterId as AuctionTeam["rosterId"],
    managerId: primarySleeperId as AuctionTeam["managerId"],
    managerName: primaryOwner.fullName as AuctionTeam["managerName"],
    teamName: franchise.currentTeamName as AuctionTeam["teamName"],
    coManagerIds: ownerIds
      .slice(1)
      .flatMap((ownerId) => ownerProfilesById[ownerId]?.sleeperIds[0] ?? []) as AuctionTeam["coManagerIds"],
    teamBudget: 200,
    keeperCostTotal: 0,
    spentBudget: 0,
    remainingBudget: 200,
    maxBid: 200,
    rosterSlots,
    keeperIds: [],
    purchaseIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    franchiseId: franchise.id,
    warRoomId: `2026:${franchise.id}`,
    ownerIds,
    ownerNames,
    ownerLabel,
  };
}

export const canonicalAuctionTeams: readonly CanonicalAuctionTeam[] = franchises
  .filter((franchise) => franchise.status === FranchiseStatus.Active)
  .map((franchise) => buildTeam(franchise.id))
  .filter((team): team is CanonicalAuctionTeam => team !== null)
  .sort((first, second) => first.rosterId - second.rosterId);

export function getCanonicalAuctionTeamById(teamId: string | null | undefined) {
  return canonicalAuctionTeams.find((team) => team.id === teamId) ?? null;
}

export function getCanonicalAuctionTeamByRosterId(
  rosterId: number | null | undefined
) {
  return canonicalAuctionTeams.find((team) => team.rosterId === rosterId) ?? null;
}
