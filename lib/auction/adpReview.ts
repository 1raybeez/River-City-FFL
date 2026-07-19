import type {
  AuctionAdpSourceRow,
  AuctionAdpSourceValuesFile,
  AuctionUnmatchedPlayerSummary,
  AuctionSourceUnmatchedReview,
  AuctionUnmatchedPlayerReason,
  AuctionUnmatchedReviewCandidate,
  AuctionUnmatchedSuggestedMatch,
} from "./adpTypes";

function getAdpUnmatchedReason(
  row: AuctionAdpSourceRow
): AuctionUnmatchedPlayerReason {
  if (row.errors.some((error) => error.toLowerCase().includes("position"))) {
    return "missing-position";
  }
  if (row.matchType === "ambiguous") return "ambiguous-name-position";
  if (row.matchType === "unmatched" || row.playerId === null) {
    return "no-sleeper-match";
  }

  return "other-safe-reason";
}

function normalizeReviewIdentityName(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/['’`]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ") ?? ""
  );
}

function normalizeReviewSuggestionName(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/\b(jr|sr|ii|iii|iv|v)\.?$/i, "")
      .replace(/['’`]/g, "")
      .replace(/\./g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ") ?? ""
  );
}

function stripTerminalSuffix(value: string) {
  return value.replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "");
}

function buildNameVariantEvidence(sourceName: string, candidateName: string) {
  const sourceIdentity = normalizeReviewIdentityName(sourceName);
  const candidateIdentity = normalizeReviewIdentityName(candidateName);
  const sourceLoose = normalizeReviewSuggestionName(sourceName);
  const candidateLoose = normalizeReviewSuggestionName(candidateName);
  const sourceWithoutSuffix = stripTerminalSuffix(sourceIdentity);
  const candidateWithoutSuffix = stripTerminalSuffix(candidateIdentity);

  if (
    sourceLoose === candidateLoose &&
    sourceIdentity !== candidateIdentity &&
    sourceWithoutSuffix === candidateWithoutSuffix &&
    (sourceIdentity !== sourceWithoutSuffix ||
      candidateIdentity !== candidateWithoutSuffix)
  ) {
    return "suffix-only difference";
  }

  if (sourceLoose === candidateLoose && sourceIdentity !== candidateIdentity) {
    return "punctuation-only difference";
  }

  return "exact normalized name + position in another uploaded source";
}

function getReviewCandidateKey(candidate: AuctionUnmatchedReviewCandidate) {
  return [
    candidate.sleeperPlayerId ?? "no-id",
    normalizeReviewSuggestionName(candidate.playerName),
    candidate.position ?? "",
    candidate.nflTeam ?? "",
  ].join("|");
}

function dedupeReviewCandidates(candidates: AuctionUnmatchedReviewCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = getReviewCandidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sanitizeAdpFirestoreData<T>(value: T): T {
  if (value === undefined) return undefined as T;
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeAdpFirestoreData(item)) as T;
  }
  if (!isPlainObject(value)) return value;

  const cleaned: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (nestedValue === undefined) continue;
    cleaned[key] = sanitizeAdpFirestoreData(nestedValue);
  }

  return cleaned as T;
}

function getCrossSourceSuggestedMatch({
  row,
  sourceFile,
  sourceFiles,
}: {
  row: AuctionAdpSourceRow;
  sourceFile: AuctionAdpSourceValuesFile;
  sourceFiles: readonly AuctionAdpSourceValuesFile[];
}): AuctionUnmatchedSuggestedMatch | null {
  const normalizedName = normalizeReviewSuggestionName(row.playerName);
  if (!normalizedName || !row.position) return null;

  const candidates = dedupeReviewCandidates(
    sourceFiles
      .filter((candidateSourceFile) => candidateSourceFile.sourceKey !== sourceFile.sourceKey)
      .flatMap((candidateSourceFile) =>
        candidateSourceFile.rows
          .filter(
            (candidateRow) =>
              candidateRow.playerId &&
              candidateRow.position === row.position &&
              normalizeReviewSuggestionName(candidateRow.playerName) === normalizedName
          )
          .map((candidateRow) => ({
            sleeperPlayerId: candidateRow.playerId,
            playerName: candidateRow.playerName,
            position: candidateRow.position,
            nflTeam: candidateRow.nflTeam,
          }))
      )
  );

  if (candidates.length !== 1) return null;

  const candidate = candidates[0];
  return {
    ...candidate,
    confidence: "HIGH",
    evidence: [buildNameVariantEvidence(row.playerName, candidate.playerName)],
  };
}

export function buildAdpUnmatchedReview(
  sourceFile: AuctionAdpSourceValuesFile,
  sourceFiles: readonly AuctionAdpSourceValuesFile[]
): AuctionSourceUnmatchedReview {
  const unmatchedPlayers = sourceFile.rows
    .filter(
      (row) =>
        row.playerId === null ||
        row.matchType === "unmatched" ||
        row.matchType === "ambiguous"
    )
    .map((row) => {
      const candidates = dedupeReviewCandidates(row.matchCandidates ?? []);
      const suggestedMatch =
        candidates.length === 1
          ? {
              ...candidates[0],
              confidence: "HIGH" as const,
              evidence: [buildNameVariantEvidence(row.playerName, candidates[0].playerName)],
            }
          : getCrossSourceSuggestedMatch({ row, sourceFile, sourceFiles }) ?? undefined;

      const summary: AuctionUnmatchedPlayerSummary = {
        sourceKey: row.sourceKey,
        playerName: row.playerName,
        position: row.position || null,
        nflTeam: row.nflTeam ?? null,
        reason: getAdpUnmatchedReason(row),
      };

      if (suggestedMatch) summary.suggestedMatch = suggestedMatch;
      if (candidates.length > 1) {
        summary.candidateCount = candidates.length;
        summary.candidates = candidates;
      }

      return summary;
    });

  return {
    sourceKey: sourceFile.sourceKey,
    unmatchedCount: sourceFile.unmatchedRowCount,
    unmatchedPlayers,
  };
}
