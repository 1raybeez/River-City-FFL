import type { AuctionAccessResult } from "@/lib/auction/ownerProfiles";

export type CurrentMember = {
  authenticated: boolean;
  displayName: string | null;
  franchiseName: string | null;
  canAccessWarRoom: boolean;
  canAccessMaintenance: boolean;
};

export const anonymousCurrentMember: CurrentMember = {
  authenticated: false,
  displayName: null,
  franchiseName: null,
  canAccessWarRoom: false,
  canAccessMaintenance: false,
};

export function toSafeCurrentMember(
  access: AuctionAccessResult | null | undefined
): CurrentMember {
  if (!access?.authenticated) return anonymousCurrentMember;

  return {
    authenticated: true,
    displayName: access.ownerDisplayName,
    franchiseName: access.sleeperTeamName ?? access.ownerProfileLabel,
    canAccessWarRoom: access.canAccessWarRoom,
    canAccessMaintenance: access.canAccessMaintenance,
  };
}
