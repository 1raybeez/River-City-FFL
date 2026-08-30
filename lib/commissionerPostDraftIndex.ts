import type { PublicDraftGradeResult } from "@/lib/draftGrade";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import type { PostDraftPublicResult } from "@/lib/postDraftMetrics";
import type { CurrentSeasonTeamIdentity } from "@/lib/currentSeasonTeamIdentity";
import { postDraftReportFranchiseId } from "@/lib/postDraftFranchiseIdentity";

export type CommissionerPostDraftReportRow = {
  franchiseId: string;
  teamName: string;
  ownerName: string;
  valueEfficiency: number | null;
  rosterConstruction: number | null;
  budgetManagement: number | null;
  keeperEfficiency: number | null;
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
  grades: PublicDraftGradeResult,
  identities?: ReadonlyMap<string, CurrentSeasonTeamIdentity>
): CommissionerPostDraftReportRow[] {
  return canonicalAuctionTeams.map((team) => {
    const reportFranchiseId = postDraftReportFranchiseId(team.franchiseId);
    const publicRecord = metrics.records.find((record) => record.franchiseId === reportFranchiseId);
    const grade = grades.records.find((record) => record.franchiseId === reportFranchiseId);
    const reportStatus = !publicRecord
      ? "DATA UNAVAILABLE"
      : grade?.status === "ready"
        ? "READY"
        : grade?.status === "partial"
          ? "PARTIAL COVERAGE"
          : "GRADE NOT READY";
    return {
      franchiseId: reportFranchiseId,
      teamName: identities?.get(team.franchiseId)?.currentTeamName ?? team.teamName,
      ownerName: team.ownerLabel,
      valueEfficiency: grade?.valueEfficiency?.score ?? null,
      rosterConstruction: grade?.rosterConstruction?.score ?? null,
      budgetManagement: grade?.budgetManagement?.score ?? null,
      keeperEfficiency: grade?.keeperEfficiency?.score ?? null,
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
