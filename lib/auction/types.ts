import type { activeManagers } from "@/lib/managers/activeManagers";

export type AuctionSeasonYear =
  | 2018
  | 2019
  | 2020
  | 2021
  | 2022
  | 2023
  | 2024
  | 2025
  | 2026;

export type ActiveAuctionManager = (typeof activeManagers)[number];
export type AuctionManagerId = ActiveAuctionManager["sleeperId"];
export type AuctionRosterId = ActiveAuctionManager["roster"];
export type AuctionManagerName = ActiveAuctionManager["fullName"];
export type AuctionTeamName = ActiveAuctionManager["teamName"];

export type AuctionTimestamp = string;
export type AuctionSeasonId = `${AuctionSeasonYear}`;
export type AuctionTeamId = `${AuctionSeasonYear}:${AuctionRosterId}`;
export type AuctionPlayerId = string;
export type AuctionKeeperId = `${AuctionSeasonYear}:${AuctionTeamId}:${AuctionPlayerId}`;
export type AuctionPlayerValueId = `${AuctionSeasonYear}:${AuctionPlayerId}`;
export type AuctionNominationId = string;
export type AuctionBidId = string;
export type AuctionPurchaseId = string;
export type AuctionAuditLogEntryId = string;

export type AuctionSeasonStatus =
  | "setup"
  | "keeper-review"
  | "keeper-locked"
  | "pre-draft"
  | "live"
  | "complete"
  | "archived";

export type AuctionKeeperStatus =
  | "projected"
  | "declared"
  | "locked"
  | "released"
  | "voided";

export type AuctionNominationStatus =
  | "queued"
  | "active"
  | "sold"
  | "passed"
  | "canceled";

export type AuctionBidStatus = "active" | "winning" | "outbid" | "voided";
export type AuctionPurchaseStatus = "active" | "voided";

export type AuctionAuditEntityType =
  | "season"
  | "team"
  | "keeper"
  | "player-value"
  | "nomination"
  | "bid"
  | "purchase";

export type AuctionAuditAction =
  | "created"
  | "updated"
  | "locked"
  | "unlocked"
  | "nominated"
  | "bid-placed"
  | "sold"
  | "passed"
  | "canceled"
  | "voided"
  | "imported"
  | "note-added";

export type AuctionPlayerPosition =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "K"
  | "DEF"
  | "DL"
  | "LB"
  | "DB"
  | "IDP"
  | "UNK";

export interface AuctionAuditTimestamps {
  createdAt: AuctionTimestamp;
  updatedAt: AuctionTimestamp;
}

export interface AuctionPlayerIdentity {
  playerId: AuctionPlayerId;
  playerName: string;
  position: AuctionPlayerPosition;
  nflTeam: string | null;
}

export interface AuctionRosterSlots {
  total: number;
  filled: number;
  remaining: number;
  keeperSlotsUsed: number;
  starterSlots?: number;
  benchSlots?: number;
}

export interface AuctionSeason extends AuctionAuditTimestamps {
  id: AuctionSeasonId;
  seasonYear: AuctionSeasonYear;
  status: AuctionSeasonStatus;
  defaultTeamBudget: number;
  defaultRosterSlots: number;
  nominationStatus: AuctionNominationStatus | "inactive";
  currentNominationId: AuctionNominationId | null;
  keeperLockAt: AuctionTimestamp | null;
  draftStartsAt: AuctionTimestamp | null;
  teamIds: AuctionTeamId[];
  notes: string[];
}

export interface AuctionTeam extends AuctionAuditTimestamps {
  id: AuctionTeamId;
  seasonYear: AuctionSeasonYear;
  rosterId: AuctionRosterId;
  managerId: AuctionManagerId;
  managerName: AuctionManagerName;
  teamName: AuctionTeamName;
  coManagerIds: AuctionManagerId[];
  teamBudget: number;
  keeperCostTotal: number;
  spentBudget: number;
  remainingBudget: number;
  maxBid: number;
  rosterSlots: AuctionRosterSlots;
  keeperIds: AuctionKeeperId[];
  purchaseIds: AuctionPurchaseId[];
}

export interface AuctionKeeper extends AuctionAuditTimestamps, AuctionPlayerIdentity {
  id: AuctionKeeperId;
  seasonYear: AuctionSeasonYear;
  teamId: AuctionTeamId;
  rosterId: AuctionRosterId;
  managerId: AuctionManagerId;
  keeperCost: number;
  previousCost: number | null;
  yearsKept: number;
  status: AuctionKeeperStatus;
  declaredAt: AuctionTimestamp | null;
  lockedAt: AuctionTimestamp | null;
  source: "manual" | "sleeper" | "import" | "projection";
}

export interface AuctionPlayerValue extends AuctionAuditTimestamps, AuctionPlayerIdentity {
  id: AuctionPlayerValueId;
  seasonYear: AuctionSeasonYear;
  projectedValue: number;
  keeperCost: number | null;
  rayMaxBid: number;
  valueTier: string | null;
  valueSource: "manual" | "projection" | "import" | "historical" | "unverified";
  sourceUpdatedAt: AuctionTimestamp | null;
}

export interface AuctionNomination extends AuctionAuditTimestamps, AuctionPlayerIdentity {
  id: AuctionNominationId;
  seasonYear: AuctionSeasonYear;
  nominationNumber: number;
  nominatedByTeamId: AuctionTeamId;
  nominatedByRosterId: AuctionRosterId;
  nominatedByManagerId: AuctionManagerId;
  status: AuctionNominationStatus;
  openingBid: number;
  currentBid: number;
  currentHighBidTeamId: AuctionTeamId | null;
  currentHighBidId: AuctionBidId | null;
  winningBidId: AuctionBidId | null;
  purchaseId: AuctionPurchaseId | null;
  bidHistory: AuctionBid[];
  nominatedAt: AuctionTimestamp;
  soldAt: AuctionTimestamp | null;
  passedAt: AuctionTimestamp | null;
  canceledAt: AuctionTimestamp | null;
}

export interface AuctionBid extends AuctionAuditTimestamps {
  id: AuctionBidId;
  seasonYear: AuctionSeasonYear;
  nominationId: AuctionNominationId;
  teamId: AuctionTeamId;
  rosterId: AuctionRosterId;
  managerId: AuctionManagerId;
  amount: number;
  status: AuctionBidStatus;
  placedAt: AuctionTimestamp;
  voidedAt: AuctionTimestamp | null;
}

export interface AuctionPurchase extends AuctionAuditTimestamps, AuctionPlayerIdentity {
  id: AuctionPurchaseId;
  seasonYear: AuctionSeasonYear;
  nominationId: AuctionNominationId;
  winningBidId: AuctionBidId;
  teamId: AuctionTeamId;
  rosterId: AuctionRosterId;
  managerId: AuctionManagerId;
  purchasePrice: number;
  projectedValue: number | null;
  rayMaxBid: number | null;
  keeperEligible: boolean;
  status: AuctionPurchaseStatus;
  purchasedAt: AuctionTimestamp;
  voidedAt: AuctionTimestamp | null;
}

export interface AuctionAuditLogEntry {
  id: AuctionAuditLogEntryId;
  seasonYear: AuctionSeasonYear;
  entityType: AuctionAuditEntityType;
  entityId: string;
  action: AuctionAuditAction;
  actorManagerId: AuctionManagerId | null;
  actorName: string | null;
  teamId: AuctionTeamId | null;
  message: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: AuctionTimestamp;
  createdAt: AuctionTimestamp;
}
