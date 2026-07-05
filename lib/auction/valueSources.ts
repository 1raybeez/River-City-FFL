import type {
  AuctionImportMatchStatus,
  AuctionImportValidationIssue,
} from "@/lib/auction/importTypes";
import type {
  AuctionPlayerId,
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTimestamp,
} from "@/lib/auction/types";

export type AuctionValueSourceKey =
  | "manual-csv"
  | "masterview-excel"
  | "fantasypros"
  | "fantasynerds"
  | "rotowire"
  | "draftsharks"
  | "footballguys"
  | "lineupexperts"
  | "espn"
  | "fantasy-footballers-udk"
  | "draft-sharks"
  | (string & {});

export type AuctionValueSourceKind =
  | "manual-csv"
  | "excel-masterview"
  | "csv"
  | "web-export"
  | "paid-api";

export type AuctionValueScoringFormat =
  | "standard"
  | "half-ppr"
  | "ppr"
  | "custom";

export type AuctionValueSourceStatus =
  | "raw"
  | "normalized"
  | "matched"
  | "review-needed"
  | "approved";

export type AuctionSourceMatchReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "ignored";

export interface AuctionValueSource {
  id: string;
  sourceKey: AuctionValueSourceKey;
  sourceName: string;
  sourceKind: AuctionValueSourceKind;
  seasonYear: AuctionSeasonYear;
  scoringFormat: AuctionValueScoringFormat;
  auctionBudget: number;
  teamCount: number;
  sourceFilename: string;
  sourceSheetName: string | null;
  sourceUrl: string | null;
  importedAt: AuctionTimestamp;
  importedBy: string | null;
  adapterVersion: string;
  status: AuctionValueSourceStatus;
  warnings: AuctionImportValidationIssue[];
  errors: AuctionImportValidationIssue[];
}

export interface AuctionSourceValueRow {
  id: string;
  sourceId: string;
  sourceKey: AuctionValueSourceKey;
  sourceName: string;
  sourceKind: AuctionValueSourceKind;
  seasonYear: AuctionSeasonYear;
  scoringFormat: AuctionValueScoringFormat;
  auctionBudget: number;
  teamCount: number;
  sourceFilename: string;
  rowNumber: number;
  playerNameFromSource: string;
  normalizedPlayerName: string;
  matchedSleeperId: AuctionPlayerId | null;
  matchedSleeperName: string | null;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  auctionValue: number | null;
  normalizedAuctionValue: number | null;
  rank: number | null;
  tier: string | null;
  sourceConfidence: number;
  matchConfidence: number;
  matchStatus: AuctionImportMatchStatus;
  matchMethod: string;
  warnings: AuctionImportValidationIssue[];
  errors: AuctionImportValidationIssue[];
  raw: Record<string, string | number | null>;
  importedAt: AuctionTimestamp;
}

export interface AuctionSourceMatchCandidate {
  sleeperPlayerId: AuctionPlayerId;
  sleeperName: string;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  active: boolean;
  status: string | null;
}

export interface AuctionSourceAliasSuggestion {
  sourcePlayerName: string;
  suggestedSleeperName: string;
  sleeperPlayerId: AuctionPlayerId;
  reason: string;
}

export interface AuctionSourceAppliedAlias {
  sourcePlayerName: string;
  sleeperSearchName: string;
}

export interface AuctionSourceMatchReviewRow {
  id: string;
  seasonYear: AuctionSeasonYear;
  sourceId: string;
  sourceRowId: string;
  sourceFilename: string;
  rowNumber: number;
  playerNameFromSource: string;
  normalizedPlayerName: string;
  matchedSearchName: string;
  appliedAlias: AuctionSourceAppliedAlias | null;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  auctionValue: number | null;
  matchedSleeperId: AuctionPlayerId | null;
  matchedSleeperName: string | null;
  matchStatus: AuctionImportMatchStatus;
  matchMethod: string;
  matchConfidence: number;
  candidates: AuctionSourceMatchCandidate[];
  aliasSuggestion: AuctionSourceAliasSuggestion | null;
  reviewStatus: AuctionSourceMatchReviewStatus;
  warnings: AuctionImportValidationIssue[];
  errors: AuctionImportValidationIssue[];
}

export interface AuctionSourceDuplicateMatch {
  sleeperPlayerId: AuctionPlayerId;
  sleeperName: string | null;
  rows: Array<{
    sourceRowId: string;
    rowNumber: number;
    playerNameFromSource: string;
    sourceFilename: string;
    position: AuctionPlayerPosition | null;
    nflTeam: string | null;
  }>;
}

export interface AuctionSourceValuesFile {
  generatedAt: AuctionTimestamp;
  sourceKey: AuctionValueSourceKey;
  seasonYear: AuctionSeasonYear;
  inputDirectory: string;
  outputDirectory: string;
  playerAliasesFile: string;
  sleeperPlayersUrl: string;
  sources: AuctionValueSource[];
  rowCount: number;
  matchedRowCount: number;
  probableMatchRowCount: number;
  ambiguousRowCount: number;
  unmatchedRowCount: number;
  ignoredRowCount: number;
  warningCount: number;
  errorCount: number;
  rows: AuctionSourceValueRow[];
}

export interface AuctionSourceMatchReviewFile {
  generatedAt: AuctionTimestamp;
  sourceKey: AuctionValueSourceKey;
  seasonYear: AuctionSeasonYear;
  sourceValuesFile: string;
  playerAliasesFile: string;
  sleeperPlayersUrl: string;
  rowCount: number;
  matchedRowCount: number;
  probableMatchRowCount: number;
  ambiguousRowCount: number;
  unmatchedRowCount: number;
  ignoredRowCount: number;
  duplicateMatchedSleeperIdCount: number;
  duplicateMatches: AuctionSourceDuplicateMatch[];
  suggestedAliases: AuctionSourceAliasSuggestion[];
  rows: AuctionSourceMatchReviewRow[];
}
