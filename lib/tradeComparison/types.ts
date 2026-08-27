export const TRADE_COMPARISON_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
export type TradeComparisonPosition = (typeof TRADE_COMPARISON_POSITIONS)[number];
export type TradeComparisonCoverage = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";

export type TradeComparisonSideInput = { franchiseId: string; playerIds: string[] };
export type TradeComparisonInput = { season: number; sideA: TradeComparisonSideInput; sideB: TradeComparisonSideInput };

export type TradeComparisonPlayer = {
  playerId: string;
  name: string | null;
  position: TradeComparisonPosition | null;
  nflTeam: string | null;
  injuryStatus?: string | null;
  avatar?: string | null;
  byeWeek?: number | null;
};

export type CurrentFranchiseRoster = {
  franchiseId: string;
  franchiseName: string;
  rosterId: number | null;
  available: boolean;
  players: TradeComparisonPlayer[];
  avatar?: string | null;
};

export type PublishedAuctionValue = {
  playerId: string;
  value: number | null;
  season: number | null;
  sourceLabel: string | null;
  sourceCount?: number;
};

export type TradeComparisonPlayerContext = TradeComparisonPlayer & { auctionValue: PublishedAuctionValue };
export type TradeComparisonPositionCounts = Record<TradeComparisonPosition | "UNKNOWN", number>;
export type TradeComparisonSideResult = {
  franchiseId: string;
  franchiseName: string;
  players: TradeComparisonPlayerContext[];
  positionalBefore: TradeComparisonPositionCounts;
  positionalAfter: TradeComparisonPositionCounts;
};

export type TradeComparisonValidationError = {
  code: "INVALID_SIDE_COUNT" | "UNKNOWN_FRANCHISE" | "SAME_FRANCHISE" | "ROSTER_UNAVAILABLE" | "EMPTY_PACKAGE" | "PLAYER_NOT_ROSTERED" | "DUPLICATE_PLAYER";
  message: string;
};

export type TradeComparisonResult = {
  status: "READY" | "INVALID" | "UNAVAILABLE";
  errors: TradeComparisonValidationError[];
  coverage: TradeComparisonCoverage;
  auctionValueContext: { sideA: number | null; sideB: number | null; season: number | null; sourceLabel: string | null };
  sides: [TradeComparisonSideResult, TradeComparisonSideResult] | null;
};
