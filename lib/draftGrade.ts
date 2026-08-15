import type {
  PostDraftPublicMetrics,
  PostDraftPublicRecord,
  PostDraftPublicResult,
} from "@/lib/postDraftMetrics";

export const DRAFT_GRADE_MODEL_VERSION = "river-city-draft-grade-v1";
export const DRAFT_GRADE_MIN_VALUE_COVERAGE = 0.8;

export type DraftGradeComponent = {
  score: number | null;
  baseWeight: number;
  effectiveWeight: number;
  status: "complete" | "partial" | "not-applicable" | "not-ready";
  warnings: string[];
  explanation: Record<string, number | null>;
};

export type PublicDraftGradeRecord = {
  season: number;
  franchiseId: string;
  rosterId: number;
  teamName: string;
  generatedAt: string;
  metricsSchemaVersion: string;
  gradeModelVersion: typeof DRAFT_GRADE_MODEL_VERSION;
  source: {
    draftId: string | null;
    draftStatus: string;
  };
  status: "ready" | "partial" | "not-ready";
  draftScore: number | null;
  letterGrade: string | null;
  valueEfficiency: DraftGradeComponent;
  rosterConstruction: DraftGradeComponent;
  budgetManagement: DraftGradeComponent;
  keeperEfficiency: DraftGradeComponent;
  coverageWarnings: string[];
};

export type PublicDraftGradeResult = {
  season: number;
  generatedAt: string;
  gradeModelVersion: typeof DRAFT_GRADE_MODEL_VERSION;
  records: PublicDraftGradeRecord[];
  warnings: string[];
};

const BASE_WEIGHTS = {
  valueEfficiency: 35,
  rosterConstruction: 30,
  budgetManagement: 20,
  keeperEfficiency: 15,
} as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function relativeScore(value: number, peerValues: readonly number[]) {
  const peers = peerValues.filter(Number.isFinite).sort((a, b) => a - b);
  if (peers.length <= 1) return 50;
  const lower = peers.filter((peer) => peer < value).length;
  const equal = peers.filter((peer) => peer === value).length;
  return round(((lower + Math.max(equal, 1) / 2) / (peers.length - 1)) * 100);
}

function component(
  score: number | null,
  baseWeight: number,
  status: DraftGradeComponent["status"],
  warnings: string[],
  explanation: Record<string, number | null>
): DraftGradeComponent {
  return {
    score: score === null ? null : round(clamp(score)),
    baseWeight,
    effectiveWeight: 0,
    status,
    warnings,
    explanation,
  };
}

function valueEfficiency(metrics: PostDraftPublicMetrics, peers: readonly PostDraftPublicMetrics[]) {
  const differential = metrics.valueDifferential.total;
  if (differential === null || metrics.valueDifferential.comparablePlayerCount === 0) {
    return component(null, BASE_WEIGHTS.valueEfficiency, "not-ready", ["Published value and purchase-price coverage is insufficient."], {
      valueDifferential: differential,
      comparablePlayerCount: metrics.valueDifferential.comparablePlayerCount,
    });
  }
  const peerSurplus = peers.flatMap((peer) => {
    if (peer.valueDifferential.total === null || peer.valueDifferential.comparablePlayerCount === 0) return [];
    return [peer.valueDifferential.total];
  });
  return component(relativeScore(differential, peerSurplus), BASE_WEIGHTS.valueEfficiency, "complete", [], {
    valueDifferential: differential,
    leagueRelativePosition: relativeScore(differential, peerSurplus),
  });
}

function rosterConstruction(metrics: PostDraftPublicMetrics) {
  const requiredSlots = Object.entries(metrics.requiredStarterSlots);
  const requiredStarterSlotCount = requiredSlots.reduce((sum, [, count]) => sum + count, 0);
  if (requiredStarterSlotCount <= 0 || metrics.rosterSlotCapacity === null || metrics.rosterCompleteness.ratio === null) {
    return component(null, BASE_WEIGHTS.rosterConstruction, "not-ready", ["League roster requirements are unavailable."], {});
  }
  if (metrics.depthCoverageStatus === "unavailable") {
    return component(null, BASE_WEIGHTS.rosterConstruction, "not-ready", ["Starter/depth roster structure is unavailable."], {});
  }
  const starterCoverage = metrics.coveredStarterSlots / requiredStarterSlotCount;
  const offensivePositions = ["QB", "RB", "WR", "TE"];
  const depthTargets = offensivePositions.reduce((sum, position) => sum + (metrics.requiredStarterSlots[position] ?? 0), 0);
  const depthCovered = offensivePositions.reduce((sum, position) => {
    return sum + Math.min(metrics.depthByPosition[position] ?? 0, metrics.requiredStarterSlots[position] ?? 0);
  }, 0);
  const benchCapacity = Math.max(metrics.rosterSlotCapacity - requiredStarterSlotCount, 0);
  const usefulDepthTarget = Math.min(depthTargets, benchCapacity);
  const depthCoverage = usefulDepthTarget === 0 ? 1 : Math.min(depthCovered, usefulDepthTarget) / usefulDepthTarget;
  const rosterCompleteness = metrics.rosterCompleteness.ratio;
  const score = (starterCoverage * 0.5 + depthCoverage * 0.3 + rosterCompleteness * 0.2) * 100;
  return component(score, BASE_WEIGHTS.rosterConstruction, metrics.rosterCompleteness.status === "partial" || metrics.depthCoverageStatus === "partial" ? "partial" : "complete", [], {
    coveredStartingSlots: metrics.coveredStarterSlots,
    requiredStartingSlots: requiredStarterSlotCount,
    starterCoverage: round(starterCoverage * 100),
    usefulDepthCovered: depthCovered,
    usefulDepthTarget,
    depthCoverage: round(depthCoverage * 100),
    rosterCompleteness: round(rosterCompleteness * 100),
  });
}

function budgetManagement(metrics: PostDraftPublicMetrics) {
  const remaining = metrics.remainingBudget;
  if (!Number.isFinite(remaining) || metrics.totalSpend < 0) {
    return component(null, BASE_WEIGHTS.budgetManagement, "not-ready", ["Budget coverage is unavailable."], {});
  }
  if (remaining < 0) {
    return component(0, BASE_WEIGHTS.budgetManagement, "partial", ["Recorded spend exceeds the authoritative budget."], {
      totalSpend: metrics.totalSpend,
      remainingBudget: remaining,
    });
  }
  const score = remaining <= 5
    ? 100
    : remaining <= 10
      ? 100 - ((remaining - 5) / 5) * 10
      : remaining <= 20
        ? 90 - ((remaining - 10) / 10) * 20
        : remaining <= 30
          ? 70 - ((remaining - 20) / 10) * 30
          : Math.max(0, 40 - ((remaining - 30) / 170) * 40);
  return component(score, BASE_WEIGHTS.budgetManagement, "complete", [], {
    totalSpend: metrics.totalSpend,
    remainingBudget: remaining,
  });
}

function keeperEfficiency(metrics: PostDraftPublicMetrics, peers: readonly PostDraftPublicMetrics[]) {
  if (metrics.keeperCount === 0) {
    return component(null, BASE_WEIGHTS.keeperEfficiency, "not-applicable", [], {
      keeperCount: 0,
      keeperValueDifferential: 0,
    });
  }
  if (metrics.keeperValueDifferential === null || metrics.totalKeeperCost < 0) {
    return component(null, BASE_WEIGHTS.keeperEfficiency, "not-ready", ["Keeper value and cost coverage is insufficient."], {
      keeperCount: metrics.keeperCount,
      keeperValueDifferential: metrics.keeperValueDifferential,
      totalKeeperCost: metrics.totalKeeperCost,
    });
  }
  const efficiency = metrics.keeperValueDifferential / Math.max(metrics.totalKeeperCost, 1);
  const peerSurplus = peers.flatMap((peer) => {
    if (peer.keeperCount === 0 || peer.keeperValueDifferential === null) return [];
    return [peer.keeperValueDifferential];
  });
  const peerEfficiency = peers.flatMap((peer) => {
    if (peer.keeperCount === 0 || peer.keeperValueDifferential === null || peer.totalKeeperCost < 0) return [];
    return [peer.keeperValueDifferential / Math.max(peer.totalKeeperCost, 1)];
  });
  const surplusScore = relativeScore(metrics.keeperValueDifferential, peerSurplus);
  const efficiencyScore = relativeScore(efficiency, peerEfficiency);
  return component((surplusScore * 0.7) + (efficiencyScore * 0.3), BASE_WEIGHTS.keeperEfficiency, "complete", [], {
    keeperCount: metrics.keeperCount,
    keeperValueDifferential: metrics.keeperValueDifferential,
    keeperEfficiency: round(efficiency),
    keeperSurplusScore: surplusScore,
    keeperEfficiencyScore: efficiencyScore,
  });
}

function letterGrade(score: number) {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  if (score >= 60) return "D-";
  return "F";
}

function hasCriticalCoverage(record: PostDraftPublicRecord) {
  const metrics = record.metrics;
  const valueCoverage = metrics.rosterSize > 0
    ? (record.coverage.rosterValueCount / metrics.rosterSize)
    : 0;
  return record.source.draftStatus === "complete" &&
    metrics.rosterSize > 0 &&
    record.coverage.positionCount === metrics.rosterSize &&
    valueCoverage >= DRAFT_GRADE_MIN_VALUE_COVERAGE &&
    metrics.valueDifferential.comparablePlayerCount > 0 &&
    metrics.rosterSlotCapacity !== null &&
    metrics.rosterCompleteness.status !== "unavailable" &&
    metrics.depthCoverageStatus !== "unavailable" &&
    Object.keys(metrics.requiredStarterSlots).length > 0;
}

function buildRecord(
  record: PostDraftPublicRecord,
  allMetrics: readonly PostDraftPublicMetrics[]
): PublicDraftGradeRecord {
  const peers = allMetrics;
  const value = valueEfficiency(record.metrics, peers);
  const roster = rosterConstruction(record.metrics);
  const budget = budgetManagement(record.metrics);
  const keeper = keeperEfficiency(record.metrics, peers);
  const components = [value, roster, budget, keeper];
  const criticalReady = hasCriticalCoverage(record) && roster.score !== null && budget.score !== null && value.score !== null;
  const warnings = [
    ...record.coverage.warnings,
    ...components.flatMap((part) => part.warnings),
    ...(hasCriticalCoverage(record) ? [] : ["Critical public metric coverage is insufficient for a final grade."]),
  ];
  const availableWeight = components.reduce((sum, part) => sum + (part.score === null ? 0 : part.baseWeight), 0);
  components.forEach((part) => {
    part.effectiveWeight = part.score === null || availableWeight === 0
      ? 0
      : round((part.baseWeight / availableWeight) * 100);
  });
  const score = criticalReady && availableWeight > 0
    ? round(components.reduce((sum, part) => sum + (part.score ?? 0) * (part.effectiveWeight / 100), 0))
    : null;
  const status = !criticalReady ? "not-ready" : warnings.length > 0 ? "partial" : "ready";
  return {
    season: record.season,
    franchiseId: record.franchiseId,
    rosterId: record.rosterId,
    teamName: record.teamName,
    generatedAt: record.generatedAt,
    metricsSchemaVersion: record.source.metricsSchemaVersion,
    gradeModelVersion: DRAFT_GRADE_MODEL_VERSION,
    source: {
      draftId: record.source.draftId,
      draftStatus: record.source.draftStatus,
    },
    status,
    draftScore: score,
    letterGrade: score === null ? null : letterGrade(score),
    valueEfficiency: value,
    rosterConstruction: roster,
    budgetManagement: budget,
    keeperEfficiency: keeper,
    coverageWarnings: Array.from(new Set(warnings)),
  };
}

export function calculatePublicDraftGrades(
  input: PostDraftPublicResult
): PublicDraftGradeResult {
  const allMetrics = input.records.map((record) => record.metrics);
  const records = input.records.map((record) => buildRecord(record, allMetrics));
  return {
    season: input.season,
    generatedAt: input.generatedAt,
    gradeModelVersion: DRAFT_GRADE_MODEL_VERSION,
    records,
    warnings: input.status === "not-ready" ? ["Post-draft public metrics are not ready.", ...input.warnings] : [],
  };
}

export { BASE_WEIGHTS, letterGrade };
