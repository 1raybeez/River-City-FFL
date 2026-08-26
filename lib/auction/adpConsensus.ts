import type {
  AuctionAdpConfidence,
  AuctionAdpConsensusFile,
  AuctionAdpConsensusRow,
  AuctionAdpDemandTier,
  AuctionAdpQualityGate,
  AuctionAdpSourceValuesFile,
  AuctionAdpWaitRisk,
} from "./adpTypes";

function average(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: readonly number[]) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getAuctionAdpDemandTier(score: number): AuctionAdpDemandTier {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "VERY HIGH";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  if (score >= 0) return "VERY LOW";
  return "UNKNOWN";
}

export function getAuctionAdpWaitRisk(score: number): AuctionAdpWaitRisk {
  if (score >= 90) return "severe";
  if (score >= 75) return "high";
  if (score >= 50) return "moderate";
  if (score >= 0) return "low";
  return "unknown";
}

function getConfidence({
  sourceCount,
  spread,
  matchedRows,
}: {
  sourceCount: number;
  spread: number;
  matchedRows: number;
}): AuctionAdpConfidence {
  const sourceScore = sourceCount >= 2 ? 45 : 24;
  const spreadScore = spread <= 5 ? 35 : spread <= 12 ? 24 : spread <= 24 ? 12 : 4;
  const matchScore = matchedRows >= sourceCount ? 20 : 10;
  const score = sourceScore + spreadScore + matchScore;

  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

function getConfidenceAdjustment(confidence: AuctionAdpConfidence) {
  if (confidence === "HIGH") return 3;
  if (confidence === "LOW") return -5;
  return 0;
}

function buildDemandScore({
  rankIndex,
  playerCount,
  sourceCount,
  spread,
  confidence,
}: {
  rankIndex: number;
  playerCount: number;
  sourceCount: number;
  spread: number;
  confidence: AuctionAdpConfidence;
}) {
  const percentileScore =
    playerCount <= 1 ? 50 : 100 - (rankIndex / (playerCount - 1)) * 100;
  const sourceAdjustment = sourceCount >= 2 ? 2 : -4;
  const spreadAdjustment = spread <= 5 ? 3 : spread <= 12 ? 0 : spread <= 24 ? -3 : -7;
  const confidenceAdjustment = getConfidenceAdjustment(confidence);

  return Math.round(
    clamp(percentileScore + sourceAdjustment + spreadAdjustment + confidenceAdjustment, 0, 100)
  );
}

export function generateAuctionAdpConsensus({
  sourceFiles,
  generatedAt = new Date().toISOString(),
}: {
  sourceFiles: readonly AuctionAdpSourceValuesFile[];
  generatedAt?: string;
}): AuctionAdpConsensusFile {
  const groupedRows = new Map<string, AuctionAdpSourceValuesFile["rows"]>();
  const seenSourceKeys = new Set<string>();
  let skippedSourceValueCount = 0;

  for (const sourceFile of sourceFiles) {
    if (seenSourceKeys.has(sourceFile.sourceKey)) continue;
    seenSourceKeys.add(sourceFile.sourceKey);
    for (const row of sourceFile.rows) {
      if (row.sentinelReason) {
        skippedSourceValueCount += 1;
        continue;
      }
      const hasValidAdp = Number.isFinite(row.overallAdp) && row.overallAdp > 0;
      const hasMatch =
        row.playerId !== null &&
        row.matchType !== "unmatched" &&
        row.matchType !== "ambiguous" &&
        row.errors.length === 0;

      if (!hasValidAdp || !hasMatch) {
        skippedSourceValueCount += 1;
        continue;
      }
      if (row.playerId === null) {
        skippedSourceValueCount += 1;
        continue;
      }

      const playerId = row.playerId;
      const existingRows = groupedRows.get(playerId) ?? [];
      if (existingRows.some((existingRow) => existingRow.sourceKey === row.sourceKey)) {
        skippedSourceValueCount += 1;
        continue;
      }
      groupedRows.set(playerId, [...existingRows, row]);
    }
  }

  const baseRows: Omit<
    AuctionAdpConsensusRow,
    "demandScore" | "demandTier" | "waitRisk"
  >[] = Array.from(groupedRows.entries()).map(([, rows]) => {
    const firstRow = rows[0];
    const overallValues = rows.map((row) => row.overallAdp);
    const positionValues = rows
      .map((row) => row.positionAdp)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const minOverallAdp = Math.min(...overallValues);
    const maxOverallAdp = Math.max(...overallValues);
    const adpSpread = maxOverallAdp - minOverallAdp;
    const warnings = [
      ...(rows.length <= 1 ? ["Only one ADP source supports this player."] : []),
      ...(adpSpread > 18 ? ["ADP sources disagree widely."] : []),
    ];

    return {
      season: firstRow.season,
      playerId: firstRow.playerId ?? "",
      playerName: firstRow.playerName,
      position: firstRow.position,
      nflTeam: firstRow.nflTeam,
      sourceCount: rows.length,
      consensusOverallAdp: roundOne(average(overallValues)),
      medianOverallAdp: roundOne(median(overallValues)),
      consensusPositionAdp:
        positionValues.length > 0 ? roundOne(average(positionValues)) : null,
      minOverallAdp: roundOne(minOverallAdp),
      maxOverallAdp: roundOne(maxOverallAdp),
      adpSpread: roundOne(adpSpread),
      confidence: getConfidence({
        sourceCount: rows.length,
        spread: adpSpread,
        matchedRows: rows.length,
      }),
      warnings,
    };
  });

  const rankedRows = [...baseRows].sort(
    (first, second) => first.consensusOverallAdp - second.consensusOverallAdp
  );
  const rows: AuctionAdpConsensusRow[] = rankedRows.map((row, rankIndex) => {
    const demandScore = buildDemandScore({
      rankIndex,
      playerCount: rankedRows.length,
      sourceCount: row.sourceCount,
      spread: row.adpSpread,
      confidence: row.confidence,
    });

    return {
      ...row,
      demandScore,
      demandTier: getAuctionAdpDemandTier(demandScore),
      waitRisk: getAuctionAdpWaitRisk(demandScore),
    };
  });

  return {
    generatedAt,
    season: sourceFiles[0]?.season ?? 2026,
    sourceFiles: sourceFiles.map((sourceFile) => sourceFile.sourceKey),
    rowCount: rows.length,
    sourceValueCount: sourceFiles.reduce(
      (sum, sourceFile) =>
        sum + sourceFile.rows.filter((row) => !row.sentinelReason).length,
      0
    ),
    skippedSourceValueCount,
    rows,
  };
}

export function buildAuctionAdpQualityReport({
  sourceFiles,
  consensus,
}: {
  sourceFiles: readonly AuctionAdpSourceValuesFile[];
  consensus: AuctionAdpConsensusFile;
}) {
  const sourceSummaries = sourceFiles.map((sourceFile) => ({
    sourceKey: sourceFile.sourceKey,
    sourceName: sourceFile.sourceName,
    rows: sourceFile.rowCount,
    matched: sourceFile.matchedRowCount,
    unmatched: sourceFile.unmatchedRowCount,
    warnings: sourceFile.warningCount,
    errors: sourceFile.errorCount,
  }));
  const warningCounts = consensus.rows.reduce<Record<string, number>>((counts, row) => {
    for (const warning of row.warnings) {
      counts[warning] = (counts[warning] ?? 0) + 1;
    }
    return counts;
  }, {});

  return {
    generatedAt: consensus.generatedAt,
    season: consensus.season,
    sources: sourceSummaries,
    consensus: {
      players: consensus.rowCount,
      sourceValues: consensus.sourceValueCount,
      skippedSourceValues: consensus.skippedSourceValueCount,
      demandTiers: consensus.rows.reduce<Record<string, number>>((counts, row) => {
        counts[row.demandTier] = (counts[row.demandTier] ?? 0) + 1;
        return counts;
      }, {}),
      warnings: warningCounts,
    },
  };
}

export function buildAuctionAdpQualityGates({
  sourceFiles,
  consensus,
  requiredSourceKeys,
  activePlayerCount,
}: {
  sourceFiles: readonly AuctionAdpSourceValuesFile[];
  consensus: AuctionAdpConsensusFile | null;
  requiredSourceKeys: readonly string[];
  activePlayerCount?: number | null;
}): AuctionAdpQualityGate[] {
  const gates: AuctionAdpQualityGate[] = [];
  const uploadedSourceKeys = sourceFiles.map((sourceFile) => sourceFile.sourceKey);
  const missingSources = requiredSourceKeys.filter(
    (sourceKey) => !uploadedSourceKeys.includes(sourceKey as never)
  );

  if (missingSources.length > 0) {
    gates.push({
      id: "missing-required-source",
      level: "fail",
      label: "Missing required ADP source",
      detail: `Missing: ${missingSources.join(", ")}.`,
    });
  }

  for (const sourceFile of sourceFiles) {
    if (sourceFile.errorCount > 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-errors`,
        level: "fail",
        label: `${sourceFile.sourceName} import errors`,
        detail: `${sourceFile.errorCount} import error(s).`,
      });
    }
    if (sourceFile.rowCount <= 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-zero-rows`,
        level: "fail",
        label: `${sourceFile.sourceName} zero rows`,
        detail: "Uploaded ADP source normalized to zero rows.",
      });
    }
    if (sourceFile.matchedRowCount <= 0) {
      gates.push({
        id: `${sourceFile.sourceKey}-zero-matches`,
        level: "fail",
        label: `${sourceFile.sourceName} zero matches`,
        detail: "Uploaded ADP source produced no matched players.",
      });
    }
  }

  if (!consensus || consensus.rowCount <= 0) {
    gates.push({
      id: "empty-consensus",
      level: "fail",
      label: "Empty ADP consensus",
      detail: "Consensus output produced no matched players.",
    });
  }

  if (consensus) {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const row of consensus.rows) {
      if (seenIds.has(row.playerId)) duplicateIds.add(row.playerId);
      seenIds.add(row.playerId);
      const values = [
        row.consensusOverallAdp,
        row.medianOverallAdp,
        row.minOverallAdp,
        row.maxOverallAdp,
        row.adpSpread,
        row.demandScore,
      ];
      if (values.some((value) => !Number.isFinite(value) || value < 0)) {
        gates.push({
          id: `invalid-adp-${row.playerId}`,
          level: "fail",
          label: "Invalid ADP value",
          detail: `${row.playerName} has an invalid ADP value.`,
        });
      }
    }

    if (duplicateIds.size > 0) {
      gates.push({
        id: "duplicate-player-ids",
        level: "fail",
        label: "Duplicate generated player IDs",
        detail: `${duplicateIds.size} duplicate player ID(s).`,
      });
    }

    if (activePlayerCount && consensus.rowCount < activePlayerCount * 0.75) {
      gates.push({
        id: "coverage-collapse",
        level: "fail",
        label: "Major ADP coverage collapse",
        detail: `Generated ${consensus.rowCount} players vs active ${activePlayerCount}.`,
      });
    }
  }

  if (gates.length === 0) {
    gates.push({
      id: "quality-pass",
      level: "pass",
      label: "ADP quality gates passed",
      detail: "ADP consensus is ready to publish.",
    });
  }

  return gates;
}
