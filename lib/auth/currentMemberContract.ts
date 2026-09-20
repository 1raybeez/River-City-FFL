import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";
import { ownerProfiles } from "@/lib/managers/identityData";
import type { TeamCode } from "@/lib/types/Manager";

export type CurrentMember = {
  authenticated: boolean;
  displayName: string | null;
  franchiseName: string | null;
  favoriteNflTeam: TeamCode | null;
  canAccessWarRoom: boolean;
  canAccessMaintenance: boolean;
};

export const anonymousCurrentMember: CurrentMember = {
  authenticated: false,
  displayName: null,
  franchiseName: null,
  favoriteNflTeam: null,
  canAccessWarRoom: false,
  canAccessMaintenance: false,
};

export function toSafeCurrentMember(
  access: AuctionAccessResult | null | undefined
): CurrentMember {
  if (!access?.authenticated) return anonymousCurrentMember;

  const favoriteNflTeam = ownerProfiles.find((owner) =>
    access.sleeperUserId ? owner.sleeperIds.includes(access.sleeperUserId) : false
  )?.survey.favoriteNflTeam ?? null;

  return {
    authenticated: true,
    displayName: access.ownerDisplayName,
    franchiseName: access.sleeperTeamName ?? access.ownerProfileLabel,
    favoriteNflTeam,
    canAccessWarRoom: access.canAccessWarRoom,
    canAccessMaintenance: access.canAccessMaintenance,
  };
}
