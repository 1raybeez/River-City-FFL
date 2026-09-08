import type {
  PostDraftAcquisitionInput,
  PostDraftRosterInput,
  PostDraftRosterRequirements,
} from "@/lib/postDraftMetrics";

export const DRAFT_REPORT_V2_VERSION = "draft-report-v2" as const;
export const DRAFT_QUALITY_MODEL_VERSION = "draft-quality-v1" as const;
export const AUCTION_EFFICIENCY_MODEL_VERSION = "auction-efficiency-v1" as const;
export const DRAFT_QUALITY_WEIGHTS = { startingLineup: 0.5, positionGroup: 0.35, depth: 0.15 } as const;
export const POSITION_GROUP_WEIGHTS = { QB: 0.1, RB: 0.3, WR: 0.4, TE: 0.2 } as const;

export type V2PlayerEvidence = {
  publishedValue: number | null;
  adp: number | null;
  qualityScore: number | null;
  source: "published-player-value" | "missing";
};

export type V2Player = {
  playerId: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  evidence: V2PlayerEvidence;
};

export type V2Team = {
  franchiseId: string;
  rosterId: number;
  ownerIds: readonly string[];
  historicalDraftTimeTeamName: string;
  currentDisplayName: string;
  playerIds: readonly string[];
  acquisitions: readonly PostDraftAcquisitionInput[];
};

export type V2EvidenceSource = {
  source: string;
  runId: string | null;
  generatedAt: string | null;
};

export type DraftReportV2Snapshot = {
  snapshotId: string;
  schemaVersion: typeof DRAFT_REPORT_V2_VERSION;
  season: number;
  draftId: string | null;
  draftStatus: string;
  generatedAt: string;
  evidenceAsOf: string;
  rosterRequirements: PostDraftRosterRequirements;
  teams: readonly V2Team[];
  players: readonly V2Player[];
  evidenceSources: readonly V2EvidenceSource[];
  coverage: {
    playerCount: number;
    qualityEvidenceCount: number;
    adpEvidenceCount: number;
    warnings: readonly string[];
  };
  modelVersions: {
    report: typeof DRAFT_REPORT_V2_VERSION;
    draftQuality: typeof DRAFT_QUALITY_MODEL_VERSION;
    auctionEfficiency: typeof AUCTION_EFFICIENCY_MODEL_VERSION;
  };
  inputChecksum: string;
};

export type DraftReportV2SnapshotBuildInput = {
  season: number;
  draftId: string | null;
  draftStatus: string;
  generatedAt: string;
  rosters: readonly PostDraftRosterInput[];
  acquisitions: readonly PostDraftAcquisitionInput[];
  players: ReadonlyMap<string, { playerName: string; position: string | null; nflTeam: string | null; publishedValue: number | null; adp: number | null }>;
  rosterRequirements: PostDraftRosterRequirements | null;
};

export type DraftReportV2SnapshotOptions = {
  snapshotId?: string;
  evidenceAsOf: string;
  evidenceSources: readonly V2EvidenceSource[];
  currentDisplayNames?: ReadonlyMap<string, string>;
};

export type RankedComponent = {
  score: number | null;
  leagueRank: number | null;
};

export type DraftQualityTeam = {
  franchiseId: string;
  rosterId: number;
  teamName: string;
  startingLineup: readonly { slot: string; playerId: string | null; playerName: string | null; qualityScore: number | null }[];
  components: {
    startingLineup: RankedComponent;
    qbRoom: RankedComponent;
    rbRoom: RankedComponent;
    wrRoom: RankedComponent;
    teRoom: RankedComponent;
    flex: RankedComponent;
    depth: RankedComponent;
  };
  draftQuality: RankedComponent;
  coverage: "COMPLETE" | "PARTIAL" | "MISSING";
  biggestStrength: string;
  biggestWeakness: string;
};

export type AuctionEfficiencyTeam = {
  franchiseId: string;
  rosterId: number;
  teamName: string;
  auctionEfficiency: RankedComponent;
  totalSpend: number;
  budgetRemaining: number;
  referenceSurplus: number | null;
  bestBuy: { playerId: string; playerName: string; surplus: number } | null;
  biggestReach: { playerId: string; playerName: string; surplus: number } | null;
  keeperEconomicSurplus: number | null;
  warnings: readonly string[];
};
