import "server-only";

import { requireAuctionAccess, requireAuctionWarRoomAccess } from "@/lib/auth/auctionAccess";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { calculatePublicDraftGrades, type PublicDraftGradeRecord } from "@/lib/draftGrade";
import { buildCommissionerPostDraftIndex } from "@/lib/commissionerPostDraftIndex";
import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";
import { calculatePostDraftMetrics, loadPostDraftMetricsInput, type PostDraftPublicRecord } from "@/lib/postDraftMetrics";
import { buildPostDraftTeamAnalysis, type PostDraftTeamAnalysis } from "@/lib/postDraftTeamAnalysis";
import { postDraftReportFranchiseId, postDraftSourceFranchiseId } from "@/lib/postDraftFranchiseIdentity";

export type DraftReportCard = {
  accessMode: "OWNER" | "COMMISSIONER_PREVIEW";
  publicRecord: PostDraftPublicRecord;
  grade: PublicDraftGradeRecord | null;
  analysis: PostDraftTeamAnalysis;
  rank: number | null;
  ownerNames: readonly string[];
  keepers: readonly { playerName: string; price: number | null }[];
};

function findTeam(franchiseId: string) {
  const sourceId = postDraftSourceFranchiseId(franchiseId);
  return canonicalAuctionTeams.find((team) => team.franchiseId === sourceId) ?? null;
}

export function buildDraftReportCard(
  franchiseId: string,
  input: Awaited<ReturnType<typeof loadPostDraftMetricsInput>>,
  accessMode: DraftReportCard["accessMode"],
  identities?: ReadonlyMap<string, { currentTeamName: string }>
): DraftReportCard {
  const metrics = calculatePostDraftMetrics(input);
  const grades = calculatePublicDraftGrades(metrics);
  const reportId = postDraftReportFranchiseId(franchiseId);
  const publicRecord = metrics.records.find((record) => record.franchiseId === reportId);
  if (!publicRecord) throw new Error("Draft report data is unavailable for this franchise.");
  const grade = grades.records.find((record) => record.franchiseId === reportId) ?? null;
  const analysis = buildPostDraftTeamAnalysis(publicRecord, input, metrics);
  const row = buildCommissionerPostDraftIndex(metrics, grades).find((candidate) => candidate.franchiseId === reportId);
  const team = findTeam(reportId);
  const currentTeamName = identities?.get(team?.franchiseId ?? "")?.currentTeamName ?? team?.teamName ?? publicRecord.teamName;
  const roster = input.rosters.find((candidate) => candidate.rosterId === publicRecord.rosterId);
  const keepers = input.acquisitions
    .filter((acquisition) => acquisition.rosterId === publicRecord.rosterId && acquisition.isKeeper)
    .map((acquisition) => ({ playerName: acquisition.playerName, price: acquisition.purchasePrice ?? acquisition.keeperCost }));
  return {
    accessMode,
    publicRecord: { ...publicRecord, teamName: currentTeamName },
    grade,
    analysis,
    rank: row?.draftScore === null || row?.draftScore === undefined ? null : buildCommissionerPostDraftIndex(metrics, grades).filter((candidate) => candidate.draftScore !== null).sort((a, b) => (b.draftScore ?? -Infinity) - (a.draftScore ?? -Infinity)).findIndex((candidate) => candidate.franchiseId === reportId) + 1,
    ownerNames: team?.ownerNames ?? (roster?.ownerIds ?? []),
    keepers,
  };
}

async function loadCard(franchiseId: string, accessMode: DraftReportCard["accessMode"]) {
  const [input, identities] = await Promise.all([loadPostDraftMetricsInput(2026), getCurrentSeasonTeamIdentityMap()]);
  return buildDraftReportCard(franchiseId, input, accessMode, identities);
}

export async function getOwnerDraftReportCard() {
  const session = await requireAuctionWarRoomAccess();
  if (session.access.role === "commissioner") return null;
  if (!session.access.authorizedFranchiseId) throw new Error("Your account is authenticated, but no River City franchise is linked to it.");
  return loadCard(session.access.authorizedFranchiseId, "OWNER");
}

export async function getCommissionerDraftReportCard(franchiseId: string) {
  const session = await requireAuctionAccess("maintenance");
  if (session.access.role !== "commissioner") throw new Error("Commissioner access required.");
  return loadCard(franchiseId, "COMMISSIONER_PREVIEW");
}

export async function getDraftReportCardOverview() {
  const session = await requireAuctionAccess("maintenance");
  if (session.access.role !== "commissioner") throw new Error("Commissioner access required.");
  const [input, identities] = await Promise.all([loadPostDraftMetricsInput(2026), getCurrentSeasonTeamIdentityMap()]);
  const metrics = calculatePostDraftMetrics(input);
  const grades = calculatePublicDraftGrades(metrics);
  return buildCommissionerPostDraftIndex(metrics, grades, identities);
}

export async function getOwnerDraftReportCardOverview() {
  const session = await requireAuctionWarRoomAccess();
  if (!session.access.authorizedFranchiseId && session.access.role !== "commissioner") throw new Error("Your account is authenticated, but no River City franchise is linked to it.");
  const [input, identities] = await Promise.all([loadPostDraftMetricsInput(2026), getCurrentSeasonTeamIdentityMap()]);
  const metrics = calculatePostDraftMetrics(input);
  return buildCommissionerPostDraftIndex(metrics, calculatePublicDraftGrades(metrics), identities);
}
