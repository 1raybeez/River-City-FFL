import type { PublicDraftGradeResult } from "@/lib/draftGrade";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import type { PostDraftPublicResult } from "@/lib/postDraftMetrics";

export type CommissionerPostDraftReportRow = {
  franchiseId: string;
  teamName: string;
  draftGrade: string | null;
  draftScore: number | null;
  strategyExecution: number | null;
  strategyStatus: "owner-scoped";
  powerRank: number | null;
  totalSpend: number | null;
  remainingBudget: number | null;
  reportStatus: "READY" | "PARTIAL COVERAGE" | "GRADE NOT READY" | "DATA UNAVAILABLE";
};

export function buildCommissionerPostDraftIndex(
  metrics: PostDraftPublicResult,
  grades: PublicDraftGradeResult
): CommissionerPostDraftReportRow[] {
  return canonicalAuctionTeams.map((team) => {
    const publicRecord = metrics.records.find((record) => record.franchiseId === team.franchiseId);
    const grade = grades.records.find((record) => record.franchiseId === team.franchiseId);
    const reportStatus = !publicRecord
      ? "DATA UNAVAILABLE"
      : grade?.status === "ready"
        ? "READY"
        : grade?.status === "partial"
          ? "PARTIAL COVERAGE"
          : "GRADE NOT READY";
    return {
      franchiseId: team.franchiseId,
      teamName: team.teamName,
      draftGrade: grade?.letterGrade ?? null,
      draftScore: grade?.draftScore ?? null,
      strategyExecution: null,
      strategyStatus: "owner-scoped",
      powerRank: publicRecord?.metrics.powerRanking.rank ?? null,
      totalSpend: publicRecord?.metrics.totalSpend ?? null,
      remainingBudget: publicRecord?.metrics.remainingBudget ?? null,
      reportStatus,
    };
  });
}
