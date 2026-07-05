import type {
  AuctionImportManifest,
  AuctionImportPreview,
  AuctionImportRow,
  AuctionImportValidationIssue,
} from "@/lib/auction/importTypes";
import type { AuctionSeasonYear, AuctionTimestamp } from "@/lib/auction/types";

const SUPPORTED_AUCTION_SEASONS = [
  2018,
  2019,
  2020,
  2021,
  2022,
  2023,
  2024,
  2025,
  2026,
] as const satisfies readonly AuctionSeasonYear[];

type ParsedImportRow = Partial<AuctionImportRow> & {
  seasonYear?: AuctionSeasonYear | number | null;
};

type ValidationContext = {
  buyerRequired?: boolean;
  expectedSeasonYear?: AuctionSeasonYear | number | null;
};

type PreviewInput = {
  id: string;
  manifestId: string;
  seasonYear: AuctionSeasonYear;
  sourceFilename: string;
  rows: readonly ParsedImportRow[];
  generatedAt: AuctionTimestamp;
  buyerRequired?: boolean;
};

function isSupportedSeason(
  seasonYear: AuctionSeasonYear | number | null | undefined
): seasonYear is AuctionSeasonYear {
  return SUPPORTED_AUCTION_SEASONS.includes(seasonYear as AuctionSeasonYear);
}

function isBlankString(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isEmptyImportRow(row: ParsedImportRow) {
  const hasRawValues =
    row.raw &&
    Object.values(row.raw).some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      return true;
    });

  return (
    !hasRawValues &&
    isBlankString(row.playerName) &&
    row.position == null &&
    isBlankString(row.nflTeam) &&
    row.auctionPrice == null &&
    isBlankString(row.buyerName) &&
    row.buyerManagerId == null &&
    row.buyerTeamId == null &&
    isBlankString(row.buyerTeamName)
  );
}

function createIssue(
  row: ParsedImportRow | null,
  code: string,
  message: string,
  field: string | null = null,
  severity: AuctionImportValidationIssue["severity"] = "error"
): AuctionImportValidationIssue {
  const rowKey = row?.id ?? row?.rowNumber ?? "manifest";

  return {
    id: `${rowKey}:${code}`,
    severity,
    code,
    message,
    sourceId: row?.sourceId ?? null,
    rowId: row?.id ?? null,
    rowNumber: row?.rowNumber ?? null,
    field,
  };
}

function getDuplicateKey(row: ParsedImportRow) {
  if (!row.seasonYear || !row.sourceId) return null;

  const playerKey =
    row.playerId ??
    (typeof row.playerName === "string"
      ? row.playerName.trim().toLowerCase()
      : "");

  return playerKey ? `${row.seasonYear}:${row.sourceId}:${playerKey}` : null;
}

export function validateAuctionImportRow(
  row: ParsedImportRow,
  context: ValidationContext = {}
): AuctionImportValidationIssue[] {
  const issues: AuctionImportValidationIssue[] = [];

  if (isEmptyImportRow(row)) {
    return [
      createIssue(
        row,
        "empty-row",
        "Row is empty and will be ignored.",
        null,
        "warning"
      ),
    ];
  }

  if (!row.seasonYear) {
    issues.push(
      createIssue(row, "missing-season", "Season is required.", "seasonYear")
    );
  } else if (!isSupportedSeason(row.seasonYear)) {
    issues.push(
      createIssue(
        row,
        "unsupported-season",
        `Season ${row.seasonYear} is not supported.`,
        "seasonYear"
      )
    );
  } else if (
    context.expectedSeasonYear &&
    row.seasonYear !== context.expectedSeasonYear
  ) {
    issues.push(
      createIssue(
        row,
        "season-mismatch",
        `Row season ${row.seasonYear} does not match expected season ${context.expectedSeasonYear}.`,
        "seasonYear",
        "warning"
      )
    );
  }

  if (isBlankString(row.playerName)) {
    issues.push(
      createIssue(
        row,
        "missing-player-name",
        "Player name is required.",
        "playerName"
      )
    );
  }

  if (!row.position) {
    issues.push(
      createIssue(row, "missing-position", "Position is required.", "position")
    );
  }

  if (
    row.auctionPrice === null ||
    row.auctionPrice === undefined ||
    !Number.isFinite(row.auctionPrice) ||
    row.auctionPrice < 0
  ) {
    issues.push(
      createIssue(
        row,
        "invalid-auction-price",
        "Auction price must be a non-negative finite number.",
        "auctionPrice"
      )
    );
  }

  if (
    context.buyerRequired &&
    isBlankString(row.buyerName) &&
    row.buyerManagerId == null &&
    row.buyerTeamId == null &&
    isBlankString(row.buyerTeamName)
  ) {
    issues.push(
      createIssue(
        row,
        "missing-buyer",
        "Buyer, manager, or team is required for this import.",
        "buyer"
      )
    );
  }

  return issues;
}

export function validateDuplicateAuctionImportRows(
  rows: readonly ParsedImportRow[]
): AuctionImportValidationIssue[] {
  const seen = new Set<string>();
  const duplicates: AuctionImportValidationIssue[] = [];

  rows.forEach((row) => {
    if (isEmptyImportRow(row)) return;

    const key = getDuplicateKey(row);
    if (!key) return;

    if (seen.has(key)) {
      duplicates.push(
        createIssue(
          row,
          "duplicate-player-row",
          "Duplicate player row found for the same season and source.",
          "playerName"
        )
      );
      return;
    }

    seen.add(key);
  });

  return duplicates;
}

export function validateAuctionImportRows(
  rows: readonly ParsedImportRow[],
  context: ValidationContext = {}
): AuctionImportValidationIssue[] {
  return [
    ...rows.flatMap((row) => validateAuctionImportRow(row, context)),
    ...validateDuplicateAuctionImportRows(rows),
  ];
}

export function validateAuctionImportManifest(
  manifest: AuctionImportManifest
): AuctionImportValidationIssue[] {
  const issues: AuctionImportValidationIssue[] = [];

  if (!isSupportedSeason(manifest.seasonYear)) {
    issues.push(
      createIssue(
        null,
        "unsupported-season",
        `Season ${manifest.seasonYear} is not supported.`,
        "seasonYear"
      )
    );
  }

  if (isBlankString(manifest.sourceFilename)) {
    issues.push(
      createIssue(
        null,
        "missing-source-filename",
        "Source filename is required.",
        "sourceFilename"
      )
    );
  }

  if (!Number.isFinite(manifest.totalRowCount) || manifest.totalRowCount < 0) {
    issues.push(
      createIssue(
        null,
        "invalid-row-count",
        "Manifest row count must be a non-negative finite number.",
        "totalRowCount"
      )
    );
  }

  return issues;
}

export function buildAuctionImportPreview(
  input: PreviewInput
): AuctionImportPreview {
  const rowIssues = validateAuctionImportRows(input.rows, {
    buyerRequired: input.buyerRequired,
    expectedSeasonYear: input.seasonYear,
  });
  const validationIssues = [...rowIssues];
  const warningCount = validationIssues.filter(
    (issue) => issue.severity === "warning"
  ).length;
  const errorCount = validationIssues.filter(
    (issue) => issue.severity === "error"
  ).length;
  const rows: AuctionImportRow[] = input.rows.map((row): AuctionImportRow => ({
    ...row,
    id: row.id ?? `row-${row.rowNumber ?? "unknown"}`,
    sourceId: row.sourceId ?? input.manifestId,
    seasonYear: isSupportedSeason(row.seasonYear)
      ? row.seasonYear
      : input.seasonYear,
    sourceFilename: row.sourceFilename ?? input.sourceFilename,
    rowNumber: row.rowNumber ?? 0,
    rowKind: row.rowKind ?? "unknown",
    raw: row.raw ?? {},
    playerName: row.playerName ?? null,
    position: row.position ?? null,
    nflTeam: row.nflTeam ?? null,
    auctionPrice: row.auctionPrice ?? null,
    buyerName: row.buyerName ?? null,
    buyerManagerId: row.buyerManagerId ?? null,
    buyerTeamId: row.buyerTeamId ?? null,
    buyerTeamName: row.buyerTeamName ?? null,
    confidence:
      typeof row.confidence === "number" && Number.isFinite(row.confidence)
        ? row.confidence
        : 0,
    matchStatus: row.matchStatus ?? "unmatched",
    validationIssues: validateAuctionImportRow(row, {
      buyerRequired: input.buyerRequired,
      expectedSeasonYear: input.seasonYear,
    }),
  }));

  return {
    id: input.id,
    manifestId: input.manifestId,
    seasonYear: input.seasonYear,
    sourceFilename: input.sourceFilename,
    rowCount: rows.length,
    matchedRowCount: rows.filter((row) => row.matchStatus === "matched").length,
    probableMatchRowCount: rows.filter((row) => row.matchStatus === "probable")
      .length,
    ambiguousRowCount: rows.filter((row) => row.matchStatus === "ambiguous")
      .length,
    unmatchedRowCount: rows.filter((row) => row.matchStatus === "unmatched")
      .length,
    ignoredRowCount: rows.filter((row) => row.matchStatus === "ignored").length,
    warningCount,
    errorCount,
    rows,
    validationIssues,
    generatedAt: input.generatedAt,
    isReadyForReview: rows.length > 0 && errorCount === 0,
    isApprovedForImport: false,
  };
}
