import type { CanonicalPowerRankingTeam } from "@/lib/powerRankings";
import type {
  PostDraftPrivateRecord,
  PostDraftPublicRecord,
} from "@/lib/postDraftMetrics";
import type { PublicDraftGradeRecord } from "@/lib/draftGrade";
import type { StrategyExecutionResult } from "@/lib/strategyExecution";
import type { PostDraftTeamAnalysis } from "@/lib/postDraftTeamAnalysis";

export const POST_DRAFT_SNAPSHOT_SCHEMA_VERSION = "post-draft-snapshot-v1";

export type PostDraftSnapshotStatus = "draft" | "validated" | "locked";

export type PostDraftSourceProvenance = {
  sleeperDraftId: string | null;
  sleeperDraftStatus: string;
  sleeperGeneratedAt: string | null;
  auctionValueRunId: string | null;
  auctionValueGeneratedAt: string | null;
  adpRunId: string | null;
  adpGeneratedAt: string | null;
  draftGradeModelVersion: string;
  strategyExecutionModelVersion: string;
  powerRankingsGeneratedAt: string | null;
  powerRankingsVersion: string;
};

export type PostDraftSnapshotCoverage = {
  status: "complete" | "partial" | "not-ready";
  warnings: string[];
};

export type PostDraftPublicSnapshotRecord = {
  publicRecord: PostDraftPublicRecord;
  draftGrade: PublicDraftGradeRecord | null;
  powerRanking: CanonicalPowerRankingTeam | null;
  teamAnalysis?: PostDraftTeamAnalysis;
};

export type PostDraftPrivateSnapshotRecord = {
  privateRecord: PostDraftPrivateRecord;
  strategyExecution: StrategyExecutionResult | null;
};

export type PostDraftSnapshot = {
  snapshotId: string;
  schemaVersion: typeof POST_DRAFT_SNAPSHOT_SCHEMA_VERSION;
  snapshotStatus: PostDraftSnapshotStatus;
  season: number;
  draftId: string | null;
  sleeperDraftStatus: string;
  generatedAt: string;
  sourceTimestamps: string[];
  modelVersions: {
    metrics: string;
    draftGrade: string;
    strategyExecution: string;
    powerRankings: string;
  };
  provenance: PostDraftSourceProvenance;
  publicRecords: PostDraftPublicSnapshotRecord[];
  privateRecords: PostDraftPrivateSnapshotRecord[];
  coverage: PostDraftSnapshotCoverage;
};

export type SnapshotSourceState = {
  sleeperDraftComplete: boolean;
  activeAuctionValueRunId: string | null;
  activeAdpRunId: string | null;
  requiredValueCoverage: "complete" | "partial" | "unavailable";
  franchiseMapping: "consistent" | "inconsistent" | "unavailable";
  sourceTimestamps: string[];
};

export type SnapshotStaleSourcePolicy = {
  sleeperDraftIncomplete: "fail";
  activeRunChanged: "fail";
  requiredValueCoverageDegraded: "warn";
  franchiseMappingChanged: "fail";
  inconsistentSourceTimestamps: "warn";
};

export const POST_DRAFT_SNAPSHOT_STALE_SOURCE_POLICY: SnapshotStaleSourcePolicy = {
  sleeperDraftIncomplete: "fail",
  activeRunChanged: "fail",
  requiredValueCoverageDegraded: "warn",
  franchiseMappingChanged: "fail",
  inconsistentSourceTimestamps: "warn",
};

export function canTransitionSnapshot(
  from: PostDraftSnapshotStatus,
  to: PostDraftSnapshotStatus
) {
  return (
    (from === "draft" && to === "validated") ||
    (from === "validated" && to === "locked")
  );
}
