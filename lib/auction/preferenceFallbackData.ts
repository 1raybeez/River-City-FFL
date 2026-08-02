import {
  fadePlayerNames,
  targetPlayerNames,
  watchlistPlayerNames,
} from "@/lib/auction/draftPreferences";
import { AUCTION_OWNER_PROFILE_RAY_JEFFREY } from "@/lib/auction/ownerProfileIds";
import {
  neutralAuctionPreferenceFallbacks,
  type AuctionPreferenceFallbacks,
} from "@/lib/auction/preferenceFallbacks";

const rayJeffreyPreferenceFallbacks: AuctionPreferenceFallbacks = {
  targetPlayerNames,
  fadePlayerNames,
  watchlistPlayerNames,
};

export function getAuctionPreferenceFallbacksForProfile(
  ownerProfileId: string | null | undefined
): AuctionPreferenceFallbacks {
  return ownerProfileId === AUCTION_OWNER_PROFILE_RAY_JEFFREY
    ? rayJeffreyPreferenceFallbacks
    : neutralAuctionPreferenceFallbacks;
}
