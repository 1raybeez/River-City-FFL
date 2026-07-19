export const AUCTION_OWNER_PREFERENCES_COLLECTION =
  "auction_owner_preferences";
export {
  AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY as AUCTION_OWNER_PROFILE_LABEL,
  AUCTION_OWNER_PROFILE_RAY_JEFFREY as AUCTION_OWNER_PROFILE_ID,
} from "@/lib/auction/ownerProfiles";

export type AuctionOwnerPreferenceTag = "open" | "target" | "watch" | "fade";

export type AuctionOwnerPlayerPreference = {
  season: number;
  ownerProfileId: string;
  sleeperPlayerId: string;
  tag: AuctionOwnerPreferenceTag;
  preferredEntry: number | null;
  plannedCap: number | null;
  note: string | null;
  updatedAt: string;
  updatedBy: string;
  schemaVersion: 2;
};

export function getAuctionOwnerPreferenceScopeId(
  season: number,
  ownerProfileId: string
) {
  return `${season}_${ownerProfileId}`;
}
