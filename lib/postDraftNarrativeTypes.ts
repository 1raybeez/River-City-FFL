import type {
  PostDraftPrivateSnapshotRecord,
  PostDraftPublicSnapshotRecord,
  PostDraftSnapshot,
} from "@/lib/postDraftSnapshotTypes";

export const POST_DRAFT_NARRATIVE_SCHEMA_VERSION = "post-draft-narrative-v1";
// V1 private narrative drafts are commissioner-only. Franchise members retain
// the existing factual War Room report; no narrative reader is defined here.
export const POST_DRAFT_PRIVATE_NARRATIVE_VISIBILITY = "commissioner-only" as const;

export type PostDraftNarrativeStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "unpublished"
  | "superseded";

export type NarrativeText = string;

export type FranchiseNarrativeDraft = {
  franchiseId: string;
  season: number;
  snapshotId: string;
  status: PostDraftNarrativeStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  strengths: NarrativeText[];
  concerns: NarrativeText[];
  bestBuyCommentary: NarrativeText | null;
  biggestReachCommentary: NarrativeText | null;
  xFactor: NarrativeText | null;
  rosterOutlook: NarrativeText | null;
  commissionerTake: NarrativeText | null;
  privateStrategyTake: NarrativeText | null;
  trashTalk: NarrativeText | null;
  internalNotes: NarrativeText | null;
};

export type LeagueRecapDraft = {
  season: number;
  snapshotId: string;
  status: PostDraftNarrativeStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  title: string | null;
  dek: string | null;
  openingCommissionerTake: string | null;
  draftGradeLeaderboard: Array<{ franchiseId: string; teamName: string; grade: string | null; draftScore: number | null }>;
  biggestBargains: Array<{ franchiseId: string; teamName: string; playerName: string }>;
  biggestReaches: Array<{ franchiseId: string; teamName: string; playerName: string }>;
  spendingTrends: string[];
  positionTrends: string[];
  earlyPowerRankings: Array<{ franchiseId: string; teamName: string; rank: number | null }>;
  teamOneLiners: Array<{ franchiseId: string; teamName: string; text: string }>;
  notableDraftDecisions: string[];
  closingTake: string | null;
  teamOutlookLinks: Array<{ franchiseId: string; teamName: string; publicationId: string; href: string }>;
  privateStrategyLeaderboard: never[];
  internalNotes: string | null;
};

export type PublicNarrativeFields = Pick<
  FranchiseNarrativeDraft,
  | "strengths"
  | "concerns"
  | "bestBuyCommentary"
  | "biggestReachCommentary"
  | "xFactor"
  | "rosterOutlook"
  | "commissionerTake"
>;

export type PublicTeamOutlook = {
  season: number;
  franchiseId: string;
  teamName: string;
  publicationVersion: string;
  publishedAt: string;
  draftGrade: string | null;
  draftScore: number | null;
  powerRank: number | null;
  powerRankingStatus: string | null;
  rosterStrengthSummary: string;
  strengths: string[];
  concerns: string[];
  bestBuy: string | null;
  biggestReach: string | null;
  xFactor: string | null;
  commissionerTake: string | null;
  coverage: PostDraftPublicSnapshotRecord["publicRecord"]["coverage"];
  sourceTimestamp: string;
};

export type PublicLeagueRecap = {
  season: number;
  publicationVersion: string;
  publishedAt: string;
  title: string | null;
  dek: string | null;
  openingCommissionerTake: string | null;
  draftGradeLeaderboard: LeagueRecapDraft["draftGradeLeaderboard"];
  biggestBargains: LeagueRecapDraft["biggestBargains"];
  biggestReaches: LeagueRecapDraft["biggestReaches"];
  spendingTrends: string[];
  positionTrends: string[];
  earlyPowerRankings: LeagueRecapDraft["earlyPowerRankings"];
  teamOneLiners: LeagueRecapDraft["teamOneLiners"];
  notableDraftDecisions: string[];
  closingTake: string | null;
  teamOutlookLinks: Array<{ teamName: string; href: string }>;
};

export function serializePublicTeamOutlook({
  snapshot,
  record,
  narrative,
  publicationVersion,
  publishedAt,
}: {
  snapshot: PostDraftSnapshot;
  record: PostDraftPublicSnapshotRecord;
  narrative: PublicNarrativeFields;
  publicationVersion: string;
  publishedAt: string;
}): PublicTeamOutlook {
  const metrics = record.publicRecord.metrics;
  const grade = record.draftGrade;
  const ranking = record.powerRanking;
  return {
    season: snapshot.season,
    franchiseId: record.publicRecord.franchiseId,
    teamName: record.publicRecord.teamName,
    publicationVersion,
    publishedAt,
    draftGrade: grade?.letterGrade ?? null,
    draftScore: grade?.draftScore ?? null,
    powerRank: ranking?.rank ?? metrics.powerRanking.rank,
    powerRankingStatus: ranking?.status ?? metrics.powerRanking.status,
    rosterStrengthSummary: `Roster value ${metrics.rosterValue ?? "N/A"}; starter coverage ${metrics.coveredStarterSlots}/${Object.values(metrics.requiredStarterSlots).reduce((sum, count) => sum + count, 0)}.`,
    strengths: [...narrative.strengths],
    concerns: [...narrative.concerns],
    bestBuy: metrics.bestBuy?.playerName ?? null,
    biggestReach: metrics.biggestReach?.playerName ?? null,
    xFactor: narrative.xFactor,
    commissionerTake: narrative.commissionerTake,
    coverage: record.publicRecord.coverage,
    sourceTimestamp: snapshot.generatedAt,
  };
}

export function serializePublicLeagueRecap(
  draft: LeagueRecapDraft,
  publicationVersion: string,
  publishedAt: string
): PublicLeagueRecap {
  return {
    season: draft.season,
    publicationVersion,
    publishedAt,
    title: draft.title,
    dek: draft.dek,
    openingCommissionerTake: draft.openingCommissionerTake,
    draftGradeLeaderboard: draft.draftGradeLeaderboard.map(({ franchiseId, teamName, grade, draftScore }) => ({ franchiseId, teamName, grade, draftScore })),
    biggestBargains: [...draft.biggestBargains],
    biggestReaches: [...draft.biggestReaches],
    spendingTrends: [...draft.spendingTrends],
    positionTrends: [...draft.positionTrends],
    earlyPowerRankings: [...draft.earlyPowerRankings],
    teamOneLiners: [...draft.teamOneLiners],
    notableDraftDecisions: [...draft.notableDraftDecisions],
    closingTake: draft.closingTake,
    teamOutlookLinks: draft.teamOutlookLinks.map(({ teamName, href }) => ({ teamName, href })),
  };
}

export type NarrativeSourceParts = {
  snapshot: PostDraftSnapshot;
  publicRecord: PostDraftPublicSnapshotRecord;
  privateRecord?: PostDraftPrivateSnapshotRecord;
};
