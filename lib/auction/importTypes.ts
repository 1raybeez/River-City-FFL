import type {
  AuctionManagerId,
  AuctionPlayerId,
  AuctionPlayerPosition,
  AuctionSeasonYear,
  AuctionTeamId,
  AuctionTimestamp,
} from "@/lib/auction/types";

export type AuctionImportSourceKind =
  | "historical-auction-sheet"
  | "keeper-declarations"
  | "player-values"
  | "auction-purchases";

export type AuctionImportSourceStatus =
  | "planned"
  | "received"
  | "previewed"
  | "approved"
  | "imported"
  | "rejected";

export type AuctionImportRowKind =
  | "auction-purchase"
  | "keeper"
  | "player-value"
  | "unknown";

export type AuctionImportMatchStatus =
  | "matched"
  | "probable"
  | "ambiguous"
  | "unmatched"
  | "ignored";

export type AuctionImportValidationSeverity = "warning" | "error";

export interface AuctionImportSource {
  id: string;
  kind: AuctionImportSourceKind;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  sourceSheetName?: string | null;
  status: AuctionImportSourceStatus;
  rowCount: number;
  receivedAt: AuctionTimestamp | null;
  notes: string[];
}

export interface AuctionImportManifest {
  id: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  sources: AuctionImportSource[];
  totalRowCount: number;
  createdAt: AuctionTimestamp;
  reviewedAt: AuctionTimestamp | null;
  reviewedByManagerId: AuctionManagerId | null;
  warnings: AuctionImportValidationIssue[];
  errors: AuctionImportValidationIssue[];
}

export interface AuctionImportRow {
  id: string;
  sourceId: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  sourceSheetName?: string | null;
  rowNumber: number;
  rowKind: AuctionImportRowKind;
  raw: Record<string, unknown>;
  playerName: string | null;
  playerId?: AuctionPlayerId | null;
  position: AuctionPlayerPosition | null;
  nflTeam: string | null;
  auctionPrice: number | null;
  buyerName: string | null;
  buyerManagerId: AuctionManagerId | null;
  buyerTeamId: AuctionTeamId | null;
  buyerTeamName: string | null;
  confidence: number;
  matchStatus: AuctionImportMatchStatus;
  validationIssues: AuctionImportValidationIssue[];
}

export interface AuctionImportValidationIssue {
  id: string;
  severity: AuctionImportValidationSeverity;
  code: string;
  message: string;
  sourceId?: string | null;
  rowId?: string | null;
  rowNumber?: number | null;
  field?: string | null;
}

export interface AuctionImportPreview {
  id: string;
  manifestId: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  rowCount: number;
  matchedRowCount: number;
  probableMatchRowCount: number;
  ambiguousRowCount: number;
  unmatchedRowCount: number;
  ignoredRowCount: number;
  warningCount: number;
  errorCount: number;
  rows: AuctionImportRow[];
  validationIssues: AuctionImportValidationIssue[];
  generatedAt: AuctionTimestamp;
  isReadyForReview: boolean;
  isApprovedForImport: boolean;
}
