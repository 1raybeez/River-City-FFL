import type {
  PostDraftPrivateRecord,
  PostDraftPrivateResult,
  PostDraftPublicRecord,
  PostDraftPublicResult,
} from "@/lib/postDraftMetrics";
import {
  calculatePublicDraftGrades,
  type PublicDraftGradeRecord,
  type PublicDraftGradeResult,
} from "@/lib/draftGrade";
import {
  calculateStrategyExecution,
  STRATEGY_EXECUTION_MODEL_VERSION,
  type StrategyExecutionResult,
} from "@/lib/strategyExecution";
import type { AuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettingsTypes";

export const WAR_ROOM_POST_DRAFT_REPORT_VERSION = "river-city-war-room-post-draft-report-v1";

type ReportBase = {
  season: number;
  franchiseId: string;
  warRoomId: string;
  rosterId: number | null;
  teamName: string | null;
  generatedAt: string;
  sourceDraftId: string | null;
  sourceDraftStatus: string;
  reportVersion: typeof WAR_ROOM_POST_DRAFT_REPORT_VERSION;
};

export type WarRoomPostDraftReport = ReportBase & {
  status: "ready" | "partial" | "not-ready";
  coverageWarnings: string[];
  report: {
    publicRecord: PostDraftPublicRecord;
    privateCapPurchases: PostDraftPrivateRecord["privateMetrics"]["capDiscipline"]["capPurchases"];
    draftGrade: PublicDraftGradeRecord | null;
    strategyExecution: StrategyExecutionResult | null;
    positionPriorities: string[];
    canonicalPowerRanking: PostDraftPrivateRecord["metrics"]["powerRanking"];
  } | null;
};

function reportBase({
  publicResult,
  franchiseId,
  warRoomId,
  record,
}: {
  publicResult: PostDraftPublicResult;
  franchiseId: string;
  warRoomId: string;
  record?: PostDraftPrivateRecord | null;
}): ReportBase {
  return {
    season: publicResult.season,
    franchiseId,
    warRoomId,
    rosterId: record?.rosterId ?? null,
    teamName: record?.teamName ?? null,
    generatedAt: publicResult.generatedAt,
    sourceDraftId: publicResult.sourceDraftId,
    sourceDraftStatus: publicResult.sourceDraftStatus,
    reportVersion: WAR_ROOM_POST_DRAFT_REPORT_VERSION,
  };
}

export function assembleWarRoomPostDraftReport({
  publicResult,
  privateResult,
  gradeResult,
  strategyExecution,
  settings,
  franchiseId,
  warRoomId,
}: {
  publicResult: PostDraftPublicResult;
  privateResult: PostDraftPrivateResult;
  gradeResult: PublicDraftGradeResult;
  strategyExecution: StrategyExecutionResult | null;
  settings: Pick<AuctionOwnerProfileSettings, "positionPriorities"> | null;
  franchiseId: string;
  warRoomId: string;
}): WarRoomPostDraftReport {
  const privateRecord = privateResult.records.find((record) => record.franchiseId === franchiseId) ?? null;
  const publicRecord = publicResult.records.find((record) => record.franchiseId === franchiseId) ?? null;
  const base = reportBase({ publicResult, franchiseId, warRoomId, record: privateRecord });

  if (
    publicResult.status === "not-ready" ||
    publicResult.sourceDraftStatus !== "complete" ||
    !privateRecord ||
    !publicRecord
  ) {
    return {
      ...base,
      status: "not-ready",
      coverageWarnings: Array.from(new Set([
        ...publicResult.warnings,
        ...privateResult.warnings,
        "Final Sleeper auction draft completion is required before this report is available.",
      ])),
      report: null,
    };
  }

  const draftGrade = gradeResult.records.find((record) => record.franchiseId === franchiseId) ?? null;
  const coverageWarnings = Array.from(new Set([
    ...publicRecord.coverage.warnings,
    ...(draftGrade?.coverageWarnings ?? []),
    ...(strategyExecution?.privateWarnings ?? []),
    ...privateResult.warnings,
  ]));
  return {
    ...base,
    status: coverageWarnings.length > 0 || draftGrade?.status === "partial" || strategyExecution?.status === "partial"
      ? "partial"
      : "ready",
    coverageWarnings,
    report: {
      publicRecord,
      privateCapPurchases: privateRecord.privateMetrics.capDiscipline.capPurchases,
      draftGrade,
      strategyExecution,
      positionPriorities: settings?.positionPriorities ?? [],
      canonicalPowerRanking: privateRecord.metrics.powerRanking,
    },
  };
}

export async function getAuthorizedWarRoomPostDraftReport(): Promise<WarRoomPostDraftReport> {
  const [
    { requireAuctionWarRoomAccess },
    { getPostDraftMetrics, getAuthorizedPrivatePostDraftMetrics },
    { readAuctionOwnerProfileSettings },
  ] = await Promise.all([
    import("@/lib/auth/auctionAccess"),
    import("@/lib/postDraftMetrics"),
    import("@/lib/auction/ownerProfileSettings"),
  ]);
  const session = await requireAuctionWarRoomAccess();
  const franchiseId = session.access.authorizedFranchiseId;
  const warRoomId = session.access.warRoomId;
  if (!franchiseId || !warRoomId) {
    throw new Error("Authenticated War Room scope is required.");
  }

  const publicResult = await getPostDraftMetrics();
  if (publicResult.status === "not-ready" || publicResult.sourceDraftStatus !== "complete") {
    return assembleWarRoomPostDraftReport({
      publicResult,
      privateResult: { status: "not-ready", records: [], warnings: [] },
      gradeResult: calculatePublicDraftGrades(publicResult),
      strategyExecution: null,
      settings: null,
      franchiseId,
      warRoomId,
    });
  }

  const privateResult = await getAuthorizedPrivatePostDraftMetrics({ franchiseId });
  const privateRecord = privateResult.records.find((record) => record.franchiseId === franchiseId);
  const settings = await readAuctionOwnerProfileSettings({
    season: publicResult.season,
    ownerProfileId: session.access.canonicalOwnerId ?? session.access.ownerProfileId ?? "",
    warRoomId,
  });
  const strategyExecution = privateRecord
    ? calculateStrategyExecution({ privateRecord, settings })
    : null;
  return assembleWarRoomPostDraftReport({
    publicResult,
    privateResult,
    gradeResult: calculatePublicDraftGrades(publicResult),
    strategyExecution,
    settings,
    franchiseId,
    warRoomId,
  });
}

export { STRATEGY_EXECUTION_MODEL_VERSION };
