export type AuctionAdpSourceKey = "fantasypros-adp" | "rotowire-adp";

export type AuctionAdpParserKey = "fantasypros-adp-csv" | "rotowire-adp-csv";

export type AuctionAdpRefreshStatus =
  | "uploaded"
  | "validating"
  | "validated"
  | "blocked"
  | "published"
  | "superseded"
  | "failed";

export type AuctionAdpMatchType =
  | "sleeper-id"
  | "name-position"
  | "alias-name-position"
  | "unmatched"
  | "ambiguous";

export type AuctionAdpDemandTier =
  | "ELITE"
  | "VERY HIGH"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "VERY LOW"
  | "UNKNOWN";

export type AuctionAdpWaitRisk =
  | "severe"
  | "high"
  | "moderate"
  | "low"
  | "unknown";

export type AuctionAdpConfidence = "HIGH" | "MEDIUM" | "LOW";

export type AuctionUnmatchedPlayerReason =
  | "no-sleeper-match"
  | "ambiguous-name-position"
  | "missing-position"
  | "invalid-team"
  | "duplicate-player"
  | "skipped-defense"
  | "other-safe-reason";

export type AuctionUnmatchedSuggestionConfidence = "HIGH" | "MEDIUM" | "LOW";

export type AuctionUnmatchedReviewCandidate = {
  sleeperPlayerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
};

export type AuctionUnmatchedSuggestedMatch = AuctionUnmatchedReviewCandidate & {
  confidence: AuctionUnmatchedSuggestionConfidence;
  evidence: string[];
};

export type AuctionUnmatchedPlayerSummary = {
  sourceKey: string;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  reason: AuctionUnmatchedPlayerReason;
  suggestedMatch?: AuctionUnmatchedSuggestedMatch;
  candidateCount?: number;
  candidates?: AuctionUnmatchedReviewCandidate[];
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

export type AuctionAdpRegistryEntry = {
  sourceKey: AuctionAdpSourceKey;
  displayName: string;
  season: number;
  enabled: boolean;
  required: boolean;
  parserKey: AuctionAdpParserKey;
  expectedFileName: string;
};

export type AuctionAdpSourceRow = {
  season: number;
  sourceKey: AuctionAdpSourceKey;
  sourceName: string;
  sourceRowId: string;
  rowNumber: number;
  playerId: string | null;
  playerName: string;
  position: string;
  nflTeam: string | null;
  overallAdp: number;
  positionAdp: number | null;
  matchType: AuctionAdpMatchType;
  matchCandidates?: AuctionUnmatchedReviewCandidate[];
  importedAt: string;
  warnings: string[];
  errors: string[];
};

export type AuctionAdpSourceValuesFile = {
  generatedAt: string;
  season: number;
  sourceKey: AuctionAdpSourceKey;
  sourceName: string;
  sourceFile: string;
  rowCount: number;
  matchedRowCount: number;
  unmatchedRowCount: number;
  warningCount: number;
  errorCount: number;
  rows: AuctionAdpSourceRow[];
};

export type AuctionAdpConsensusRow = {
  season: number;
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  sourceCount: number;
  consensusOverallAdp: number;
  medianOverallAdp: number;
  consensusPositionAdp: number | null;
  minOverallAdp: number;
  maxOverallAdp: number;
  adpSpread: number;
  demandScore: number;
  demandTier: AuctionAdpDemandTier;
  waitRisk: AuctionAdpWaitRisk;
  confidence: AuctionAdpConfidence;
  warnings: string[];
};

export type AuctionAdpConsensusFile = {
  generatedAt: string;
  season: number;
  sourceFiles: string[];
  rowCount: number;
  sourceValueCount: number;
  skippedSourceValueCount: number;
  rows: AuctionAdpConsensusRow[];
};

export type AuctionAdpQualityGate = {
  id: string;
  level: "pass" | "warning" | "fail";
  label: string;
  detail: string;
};

export type AuctionAdpSourceSummary = {
  sourceKey: AuctionAdpSourceKey;
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
  contentHash?: string | null;
  sizeBytes?: number | null;
  storagePath: string | null;
  status: "empty" | "uploaded" | "validated" | "blocked";
  uploadedAt?: string | null;
  validatedAt?: string | null;
  validatedContentHash?: string | null;
  validationError?: {
    sourceKey: string;
    fileName: string | null;
    contentHash: string | null;
    validatedAt: string;
    message: string;
  } | null;
  unmatchedPlayers?: AuctionUnmatchedPlayerSummary[] | null;
  unmatchedDetailsStored?: boolean;
};

export type AuctionAdpRefreshRunSummary = {
  runId: string;
  season: number;
  status: AuctionAdpRefreshStatus;
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
  qualityGateStatus: "pass" | "fail" | "pending";
  qualityGates: AuctionAdpQualityGate[];
};

export type AuctionAdpStatusResponse = {
  season: number;
  configuredSources: AuctionAdpRegistryEntry[];
  activeRun: AuctionAdpRefreshRunSummary | null;
  previousRun: AuctionAdpRefreshRunSummary | null;
  pendingRun: AuctionAdpRefreshRunSummary | null;
  sources: AuctionAdpSourceSummary[];
  updatedAt: string | null;
  updatedBy: string | null;
  fallbackWarning: string | null;
};

export type AuctionAdpConsensusChunk = {
  chunkId: string;
  runId: string;
  season: number;
  offset: number;
  count: number;
  rows: AuctionAdpConsensusRow[];
  createdAt: string;
};
