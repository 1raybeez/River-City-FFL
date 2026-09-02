import type {
  CurrentFranchiseRoster,
  PublishedAuctionValue,
  TradeComparisonPlayer,
  TradeComparisonPositionCounts,
} from "./types";
import type { SandboxMarketFairnessResult } from "./sandboxMarketFairnessCalibration";
import type { TradeFairnessActivation } from "./fairness/activation";
import type { CurrentSeasonPlayerValue } from "./currentValue";
import type { LineupImpactResult } from "./lineupImpact";
import type { ExpertRosEvidence, KeeperEvidence } from "./recommendationEngine";
import type { RecommendationSeasonMode } from "./recommendationEngine";
import type { AcquisitionSnapshotRecord } from "./fairness/acquisitionSnapshot";

export const MULTI_TEAM_CONTRACT_VERSION = "m10" as const;
export const MULTI_TEAM_MIN_PARTICIPANTS = 2;
export const MULTI_TEAM_MAX_PARTICIPANTS = 4;

export type MultiTeamTradeMode = "LEAGUE_TRADE" | "SANDBOX";

export type MultiTeamOutgoingAssetInput = {
  playerId: string;
  destinationFranchiseId: string;
};

export type MultiTeamFaabInput = {
  amount: number;
  destinationFranchiseId: string;
};

export type MultiTeamParticipantInput = {
  participantId: string;
  franchiseId: string;
  outgoing: MultiTeamOutgoingAssetInput[];
  faab?: MultiTeamFaabInput | null;
};

export type MultiTeamTradeRequest = {
  version: typeof MULTI_TEAM_CONTRACT_VERSION;
  mode: MultiTeamTradeMode;
  season: number;
  participants: MultiTeamParticipantInput[];
};

export type MultiTeamValidationErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_MODE"
  | "INVALID_SEASON"
  | "INVALID_PARTICIPANT_COUNT"
  | "DUPLICATE_PARTICIPANT"
  | "DUPLICATE_FRANCHISE"
  | "UNKNOWN_FRANCHISE"
  | "EMPTY_PACKAGE"
  | "UNKNOWN_PLAYER"
  | "DUPLICATE_PLAYER"
  | "INVALID_DESTINATION"
  | "DESTINATION_NOT_PARTICIPANT"
  | "PLAYER_NOT_ROSTERED"
  | "CLIENT_VALUATION_FORBIDDEN"
  | "INVALID_FAAB"
  | "FAAB_DESTINATION_REQUIRED"
  | "FAAB_BALANCE_UNAVAILABLE"
  | "FAAB_BALANCE_EXCEEDED";

export type MultiTeamValidationError = {
  code: MultiTeamValidationErrorCode;
  message: string;
};

export type MultiTeamMarketEntry = PublishedAuctionValue & {
  averageAdp: number | null;
  adpSourceCount?: number;
  overallRank?: number | null;
  positionalRank?: number | null;
  trend30Day?: number | null;
  generatedAt?: string | null;
};

export type MultiTeamServerContext = {
  rosters: readonly CurrentFranchiseRoster[];
  playerDirectory: ReadonlyMap<string, TradeComparisonPlayer>;
  marketByPlayer: ReadonlyMap<string, MultiTeamMarketEntry>;
  currentValueByPlayer?: ReadonlyMap<string, CurrentSeasonPlayerValue>;
  starterSlots?: readonly string[];
  expertRosByPlayer?: ReadonlyMap<string, ExpertRosEvidence>;
  keeperByPlayer?: ReadonlyMap<string, KeeperEvidence>;
  acquisitionSnapshot?: ReadonlyMap<string, AcquisitionSnapshotRecord> | null;
  draftStatus?: string;
  seasonMode?: RecommendationSeasonMode;
  week?: number | null;
  fantasyCalcByPlayer?: ReadonlyMap<string, { playerId: string; rawSourceValue: number; fantasycalcOverallRank: number | null; fantasycalcPositionRank: number | null; fantasycalcTrend30Day: number | null; generatedAt: string; fantasycalcName?: string | null; fantasycalcId?: string | null; fantasycalcSleeperId?: string | null }>;
};

export type MultiTeamRoutedAsset = {
  player: TradeComparisonPlayer;
  sourceFranchiseId: string;
  destinationFranchiseId: string;
};

export type MultiTeamPackageMarketContext = {
  totalAuctionConsensus: number | null;
  auctionCoverage: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  medianAdp: number | null;
  bestAdp: number | null;
  adpCoverage: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
};

export type MultiTeamParticipantResult = {
  participantId: string;
  franchiseId: string;
  sends: MultiTeamRoutedAsset[];
  receives: MultiTeamRoutedAsset[];
  rosterContext: "CURRENT_FACT" | "HYPOTHETICAL_RESULT";
  positionalBefore: Partial<TradeComparisonPositionCounts>;
  positionalAfter: Partial<TradeComparisonPositionCounts>;
  market: {
    sent: MultiTeamPackageMarketContext;
    received: MultiTeamPackageMarketContext;
  };
  reasoning: string[];
  faabSent: MultiTeamFaabTransfer | null;
  faabReceived: MultiTeamFaabTransfer[];
  currentValueAnalysis?: CurrentSeasonPlayerValue[];
  lineupImpact?: LineupImpactResult;
};

export type MultiTeamFaabTransfer = {
  senderFranchiseId: string;
  receiverFranchiseId: string;
  amount: number;
};

export type MultiTeamRoutingResult = {
  status: "READY" | "INVALID";
  errors: MultiTeamValidationError[];
  mode: MultiTeamTradeMode;
  participants: MultiTeamParticipantResult[];
  sandboxMarketFairness?: SandboxMarketFairnessResult | null;
  riverCityFairness?: TradeFairnessActivation | null;
};

export type MultiTeamModelAsset = {
  playerId: string;
  modelValue: number | null;
  acquisitionCost: number | null;
  acquisitionCostStatus: "KNOWN" | "PENDING" | "MISSING";
  acquisitionCostProvenance?: "CURRENT_RIVER_CITY_COST_BASIS" | "UNAVAILABLE";
};

export type MultiTeamModelPackageInput = {
  participantId: string;
  playersSent: MultiTeamModelAsset[];
  playersReceived: MultiTeamModelAsset[];
  faabSent?: number | null;
  faabReceived?: number | null;
};

export type MultiTeamModelParticipantResult = {
  participantId: string;
  talentSent: number;
  talentReceived: number;
  surplusSent: number;
  surplusReceived: number;
  deltaTalent: number;
  deltaSurplus: number;
  deltaFaab: number;
  rosterTax: number;
  netValue: number;
};

export type MultiTeamModelSummary = {
  status: "READY" | "UNAVAILABLE";
  participantResults: MultiTeamModelParticipantResult[];
  globalGap: number | null;
  modelSpread: number | null;
  highestNetParticipantId: string | null;
  largestModelEdgeParticipantId: string | null;
  calibrationApplicability: "TWO_TEAM_CALIBRATED" | "MULTI_TEAM_UNCALIBRATED";
  historicalFairnessScore: number | null;
  historicalFairnessBand: "P25" | "P50" | "P75" | "P90" | "ABOVE_P90" | null;
  limitations: string[];
};

export type MultiTeamSignalLeader = {
  signal: "MODEL_TALENT" | "ACQUISITION_SURPLUS" | "AUCTION_CONSENSUS" | "ADP";
  status: "LEADING_PARTICIPANT" | "TIE" | "UNAVAILABLE";
  leadingParticipantId: string | null;
};
