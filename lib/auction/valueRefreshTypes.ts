import type {
  GeneratedMasterviewFile,
  GeneratedMasterviewManifest,
  GeneratedMasterviewRow,
} from "@/scripts/auction-generate-masterview-from-sources";
import type {
  AuctionValueSourceRegistryEntry,
  AuctionValueSourceRegistryId,
} from "@/lib/auction/valueSourceRegistry";

export type AuctionValueRefreshStatus =
  | "uploaded"
  | "validating"
  | "validated"
  | "blocked"
  | "published"
  | "superseded"
  | "failed";

export type AuctionValueQualityGateLevel = "pass" | "warning" | "fail";

export type AuctionValueQualityGate = {
  id: string;
  level: AuctionValueQualityGateLevel;
  label: string;
  detail: string;
};

export type AuctionUnmatchedPlayerReason =
  | "no-sleeper-match"
  | "ambiguous-name-position"
  | "missing-position"
  | "invalid-team"
  | "duplicate-player"
  | "skipped-defense"
  | "other-safe-reason";

export type AuctionUnmatchedPlayerSummary = {
  sourceKey: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  reason: AuctionUnmatchedPlayerReason;
  closestCandidate?: {
    playerName: string;
    position: string | null;
    nflTeam: string | null;
  };
};

export type AuctionSourceUnmatchedReview = {
  sourceKey: string;
  unmatchedCount: number;
  unmatchedPlayers: AuctionUnmatchedPlayerSummary[];
};

export type AuctionValueSourceSummary = {
  sourceKey: AuctionValueSourceRegistryId;
  displayName: string;
  season: number;
  enabled: boolean;
  importedAt: string | null;
  rowCount: number | null;
  matchedCount: number | null;
  unmatchedCount: number | null;
  warningCount: number | null;
  errorCount: number | null;
  parserVersion: string | null;
  fileName: string | null;
  fileHash: string | null;
  storagePath: string | null;
  status: "empty" | "uploaded" | "validated" | "blocked";
  unmatchedPlayers?: AuctionUnmatchedPlayerSummary[] | null;
  unmatchedDetailsStored?: boolean;
};

export type AuctionValueRefreshRunSummary = {
  runId: string;
  season: number;
  status: AuctionValueRefreshStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  publishedAt: string | null;
  sourceKeys: string[];
  includedSourceKeys: string[];
  excludedSourceKeys: string[];
  sourceCount: number;
  generatedPlayerCount: number | null;
  sourceValueCount: number | null;
  skippedSourceValueCount: number | null;
  warningLabelCount: number | null;
  qualityGateStatus: "pass" | "fail" | "pending";
  qualityGates: AuctionValueQualityGate[];
};

export type AuctionValueStatusResponse = {
  season: number;
  configuredSources: AuctionValueSourceRegistryEntry[];
  activeRun: AuctionValueRefreshRunSummary | null;
  previousRun: AuctionValueRefreshRunSummary | null;
  pendingRun: AuctionValueRefreshRunSummary | null;
  sources: AuctionValueSourceSummary[];
  updatedAt: string | null;
  updatedBy: string | null;
  fallbackWarning: string | null;
};

export type AuctionValueGeneratedChunk = {
  chunkId: string;
  runId: string;
  season: number;
  offset: number;
  count: number;
  rows: GeneratedMasterviewRow[];
  createdAt: string;
};

export type AuctionValueFirestoreMasterview = {
  manifest: GeneratedMasterviewManifest;
  masterview: GeneratedMasterviewFile;
  run: AuctionValueRefreshRunSummary;
};
