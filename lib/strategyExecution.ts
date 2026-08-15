import type { AuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettingsTypes";
import type {
  PostDraftPrivateRecord,
  PostDraftPrivateResult,
} from "@/lib/postDraftMetrics";

export const STRATEGY_EXECUTION_MODEL_VERSION = "river-city-strategy-execution-v1";

const BASE_WEIGHTS = {
  targetExecution: 40,
  capDiscipline: 35,
  rosterPlanExecution: 25,
} as const;

type ComponentStatus = "complete" | "partial" | "unavailable";

export type StrategyExecutionComponent = {
  score: number | null;
  baseWeight: number;
  effectiveWeight: number;
  status: ComponentStatus;
  explanation: Record<string, number | null>;
};

export type StrategyExecutionResult = {
  season: number;
  franchiseId: string;
  warRoomId: string;
  rosterId: number;
  teamName: string;
  generatedAt: string;
  source: {
    draftId: string | null;
    draftStatus: string;
  };
  strategyModelVersion: typeof STRATEGY_EXECUTION_MODEL_VERSION;
  status: "ready" | "partial" | "unavailable";
  strategyExecutionScore: number | null;
  executionLabel: string | null;
  targetExecution: StrategyExecutionComponent;
  capDiscipline: StrategyExecutionComponent;
  rosterPlanExecution: StrategyExecutionComponent;
  explanation: {
    targetedCount: number;
    acquiredTargetCount: number;
    missedTargetCount: number;
    acquiredTargets: Array<{ playerId: string; playerName: string }>;
    missedTargets: Array<{ playerId: string; playerName: string }>;
    cappedAcquisitionCount: number;
    underOrAtCapCount: number;
    overCapCount: number;
    totalDollarsOverCap: number;
    averageCapVariance: number | null;
    structuredPlanFieldsEvaluated: string[];
    notesPresent: boolean;
  };
  privateWarnings: string[];
};

export type StrategyExecutionInput = {
  privateRecord: PostDraftPrivateRecord;
  settings: Pick<
    AuctionOwnerProfileSettings,
    "positionPriorities" | "additionalNotes" | "rosterConstruction" | "riskTolerance"
  > | null;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function component(
  score: number | null,
  baseWeight: number,
  status: ComponentStatus,
  explanation: Record<string, number | null>
): StrategyExecutionComponent {
  return {
    score: score === null ? null : round(clamp(score)),
    baseWeight,
    effectiveWeight: 0,
    status,
    explanation,
  };
}

function executionLabel(score: number) {
  if (score >= 90) return "Excellent Execution";
  if (score >= 80) return "Strong Execution";
  if (score >= 70) return "Solid Execution";
  if (score >= 60) return "Mixed Execution";
  return "Plan Went Sideways";
}

function targetComponent(privateMetrics: PostDraftPrivateRecord["privateMetrics"]) {
  if (privateMetrics.targetCount <= 0) {
    return component(null, BASE_WEIGHTS.targetExecution, "unavailable", {
      targetCount: 0,
      acquiredTargetCount: 0,
      targetHitRate: null,
    });
  }
  return component((privateMetrics.targetHitRate ?? 0) * 100, BASE_WEIGHTS.targetExecution, "complete", {
    targetCount: privateMetrics.targetCount,
    acquiredTargetCount: privateMetrics.acquiredTargetCount,
    targetHitRate: privateMetrics.targetHitRate,
  });
}

function capComponent(privateMetrics: PostDraftPrivateRecord["privateMetrics"]) {
  const discipline = privateMetrics.capDiscipline;
  if (discipline.purchaseCapScores.length === 0) {
    return component(null, BASE_WEIGHTS.capDiscipline, "unavailable", {
      cappedPurchases: 0,
      overCapCount: 0,
      totalDollarsOverCap: 0,
    });
  }
  const score = discipline.purchaseCapScores.reduce((sum, value) => sum + value, 0) /
    discipline.purchaseCapScores.length;
  return component(score, BASE_WEIGHTS.capDiscipline, "complete", {
    cappedPurchases: discipline.cappedPurchases,
    underOrAtCapCount: discipline.underOrAtCapCount,
    overCapCount: discipline.overCapCount,
    totalDollarsOverCap: discipline.totalDollarsOverCap,
    averageCapVariance: discipline.averageCapVariance,
    averagePurchaseCapScore: round(score),
  });
}

function rosterPlanComponent(
  privateRecord: PostDraftPrivateRecord,
  settings: StrategyExecutionInput["settings"]
) {
  const priorities = settings?.positionPriorities ?? [];
  if (priorities.length === 0 || privateRecord.metrics.totalSpend <= 0) {
    return component(null, BASE_WEIGHTS.rosterPlanExecution, "unavailable", {
      priorityCount: priorities.length,
      totalSpend: privateRecord.metrics.totalSpend,
    });
  }
  const positionSpend = privateRecord.metrics.positionSpend;
  const priorityWeights = priorities.map((_, index) => priorities.length - index);
  const weightedPrioritySpend = priorities.reduce(
    (sum, position, index) => sum + (positionSpend[position]?.totalSpend ?? 0) * priorityWeights[index],
    0
  );
  const maxWeightedSpend = privateRecord.metrics.totalSpend * priorityWeights[0];
  const score = maxWeightedSpend > 0 ? (weightedPrioritySpend / maxWeightedSpend) * 100 : 0;
  return component(score, BASE_WEIGHTS.rosterPlanExecution, "complete", {
    priorityCount: priorities.length,
    matchedPriorityCount: priorities.filter((position) => (positionSpend[position]?.totalSpend ?? 0) > 0).length,
    prioritySpendShare: round(priorities.reduce((sum, position) => sum + (positionSpend[position]?.totalSpend ?? 0), 0) / privateRecord.metrics.totalSpend),
  });
}

export function calculateStrategyExecution(input: StrategyExecutionInput): StrategyExecutionResult {
  const { privateRecord, settings } = input;
  if (!privateRecord.privateMetrics?.warRoomId) {
    throw new Error("Authorized private War Room metrics are required.");
  }
  const privateMetrics = privateRecord.privateMetrics;
  const target = targetComponent(privateMetrics);
  const cap = capComponent(privateMetrics);
  const roster = rosterPlanComponent(privateRecord, settings);
  const components = [target, cap, roster];
  const validComponents = components.filter((part) => part.score !== null);
  const validWeight = validComponents.reduce((sum, part) => sum + part.baseWeight, 0);
  components.forEach((part) => {
    part.effectiveWeight = part.score === null || validWeight === 0
      ? 0
      : round((part.baseWeight / validWeight) * 100);
  });
  const enoughCoverage = validComponents.length >= 2 && validWeight >= 50;
  const score = enoughCoverage
    ? round(components.reduce((sum, part) => sum + (part.score ?? 0) * (part.effectiveWeight / 100), 0))
    : null;
  const status = score === null ? "unavailable" : validComponents.length < components.length ? "partial" : "ready";
  const structuredPlanFieldsEvaluated = settings?.positionPriorities?.length ? ["positionPriorities"] : [];
  return {
    season: privateRecord.season,
    franchiseId: privateRecord.franchiseId,
    warRoomId: privateMetrics.warRoomId,
    rosterId: privateRecord.rosterId,
    teamName: privateRecord.teamName,
    generatedAt: privateRecord.generatedAt,
    source: privateRecord.source,
    strategyModelVersion: STRATEGY_EXECUTION_MODEL_VERSION,
    status,
    strategyExecutionScore: score,
    executionLabel: score === null ? null : executionLabel(score),
    targetExecution: target,
    capDiscipline: cap,
    rosterPlanExecution: roster,
    explanation: {
      targetedCount: privateMetrics.targetCount,
      acquiredTargetCount: privateMetrics.acquiredTargetCount,
      missedTargetCount: privateMetrics.missedTargets.length,
      acquiredTargets: privateMetrics.acquiredTargets,
      missedTargets: privateMetrics.missedTargets,
      cappedAcquisitionCount: privateMetrics.capDiscipline.cappedPurchases,
      underOrAtCapCount: privateMetrics.capDiscipline.underOrAtCapCount,
      overCapCount: privateMetrics.capDiscipline.overCapCount,
      totalDollarsOverCap: privateMetrics.capDiscipline.totalDollarsOverCap,
      averageCapVariance: privateMetrics.capDiscipline.averageCapVariance,
      structuredPlanFieldsEvaluated,
      notesPresent: Boolean(settings?.additionalNotes),
    },
    privateWarnings: validComponents.length < components.length ? ["Some private strategy components are unavailable and were reweighted."] : [],
  };
}

export async function getAuthorizedStrategyExecution({
  franchiseId,
}: {
  franchiseId: string;
}): Promise<StrategyExecutionResult> {
  const [{ requireAuctionWarRoomAccess }, { assertAuthorizedWarRoomRequest }, { readAuctionOwnerProfileSettings }, { getAuthorizedPrivatePostDraftMetrics }] = await Promise.all([
    import("@/lib/auth/auctionAccess"),
    import("@/lib/auction/warRoomScope"),
    import("@/lib/auction/ownerProfileSettings"),
    import("@/lib/postDraftMetrics"),
  ]);
  const session = await requireAuctionWarRoomAccess();
  assertAuthorizedWarRoomRequest(session.access, { franchiseId });
  const privateResult: PostDraftPrivateResult = await getAuthorizedPrivatePostDraftMetrics({ franchiseId });
  const privateRecord = privateResult.records[0];
  if (!privateRecord) throw new Error("Authorized private post-draft metrics are unavailable.");
  const settings = await readAuctionOwnerProfileSettings({
    season: privateRecord.season,
    ownerProfileId: session.access.canonicalOwnerId ?? session.access.ownerProfileId ?? "",
    warRoomId: session.access.warRoomId ?? undefined,
  });
  return calculateStrategyExecution({ privateRecord, settings });
}

export { BASE_WEIGHTS, executionLabel };
