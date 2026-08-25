import type { AuctionPlayerId, AuctionSeasonYear, AuctionTimestamp } from "./types";

export type AuctionFreshness = {
  valueGeneratedAt: AuctionTimestamp;
  adpGeneratedAt: AuctionTimestamp;
  sourceRunId: string | null;
  refreshedAt: AuctionTimestamp;
};

export type AuctionWarRoomEventType =
  | "SEASON_ENDING_INJURY"
  | "OUT"
  | "INJURY_RISK"
  | "RETIREMENT"
  | "SUSPENSION"
  | "PUP_IR"
  | "HOLDOUT_ABSENCE"
  | "ROSTER_CUT"
  | "TEAM_CHANGE"
  | "ROLE_UP"
  | "ROLE_DOWN"
  | "OPPORTUNITY_UP"
  | "OPPORTUNITY_DOWN"
  | "WATCH";

export type AuctionEventAvailabilityImpact = "NONE" | "WARNING" | "UNAVAILABLE";
export type AuctionEventConfidence = "HIGH" | "MEDIUM" | "LOW";

export type AuctionWarRoomEvent = {
  id: string;
  season: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId;
  eventType: AuctionWarRoomEventType;
  headline: string;
  summary: string;
  sourceLabel: string;
  sourceUrl: string | null;
  observedAt: AuctionTimestamp;
  effectiveAt: AuctionTimestamp | null;
  expiresAt: AuctionTimestamp | null;
  confidence: AuctionEventConfidence;
  availabilityImpact: AuctionEventAvailabilityImpact;
  relatedPlayerIds: AuctionPlayerId[];
  team: string | null;
  active: boolean;
};
