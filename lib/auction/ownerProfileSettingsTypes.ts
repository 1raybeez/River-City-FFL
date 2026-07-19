export type AuctionRosterConstruction =
  | "balanced"
  | "stars-and-scrubs"
  | "value-heavy"
  | "hero-rb"
  | "zero-rb"
  | "custom";

export type AuctionRiskTolerance =
  | "conservative"
  | "balanced"
  | "aggressive";

export type AuctionKeeperFocus = "low" | "medium" | "high";
export type AuctionRookiePreference = "low" | "medium" | "high";
export type AuctionPositionPriority = "QB" | "RB" | "WR" | "TE";

export type AuctionNominationStyle =
  | "targets"
  | "decoys"
  | "mixed"
  | "ai";

export type AuctionKickerDefenseStrategy =
  | "minimum"
  | "elite-small-premium"
  | "flexible";

export type AuctionDraftGoal =
  | "win-now"
  | "balanced"
  | "keeper-build"
  | "learning";

export type AuctionOwnerProfileSettings = {
  season: number;
  ownerProfileId: string;
  sleeperTeamName: string | null;
  rosterConstruction: AuctionRosterConstruction;
  riskTolerance: AuctionRiskTolerance;
  keeperFocus: AuctionKeeperFocus;
  rookiePreference: AuctionRookiePreference;
  positionPriorities: AuctionPositionPriority[];
  nominationStyle: AuctionNominationStyle;
  kickerDefenseStrategy: AuctionKickerDefenseStrategy;
  draftGoal: AuctionDraftGoal;
  additionalNotes: string | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  updatedAt: string;
  updatedBy: string;
  schemaVersion: 1;
};
