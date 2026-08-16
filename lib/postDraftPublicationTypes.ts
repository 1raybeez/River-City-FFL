import type {
  FranchiseNarrativeDraft,
  LeagueRecapDraft,
  PublicLeagueRecap,
  PublicTeamOutlook,
} from "@/lib/postDraftNarrativeTypes";

export const POST_DRAFT_PUBLICATION_SCHEMA_VERSION = "post-draft-publication-v1";

export type PostDraftPublicationStatus =
  | "approved"
  | "published"
  | "unpublished"
  | "superseded";

export type PostDraftApproval = {
  approvedBy: string;
  approvedAt: string;
  approvalNote: string | null;
};

export type PostDraftPublication = {
  publicationId: string;
  schemaVersion: typeof POST_DRAFT_PUBLICATION_SCHEMA_VERSION;
  season: number;
  snapshotId: string;
  revision: number;
  status: PostDraftPublicationStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
  supersedes: string | null;
  previousVersionId: string | null;
  approval: PostDraftApproval | null;
  publicTeamOutlooks: PublicTeamOutlook[];
  publicLeagueRecap: PublicLeagueRecap | null;
};

export const POST_DRAFT_FIRESTORE_PATHS = {
  snapshots: "post_draft_snapshots",
  narratives: "post_draft_narratives",
  publications: "post_draft_publications",
  activePublicationPointers: "post_draft_publication_pointers",
} as const;

export function canTransitionPublication(
  from: PostDraftPublicationStatus,
  to: PostDraftPublicationStatus
) {
  return (
    (from === "approved" && to === "published") ||
    (from === "published" && to === "unpublished") ||
    (from === "published" && to === "superseded") ||
    (from === "approved" && to === "superseded")
  );
}

export function createSupersedingPublication({
  previous,
  publicationId,
  snapshotId,
  createdAt,
  content,
}: {
  previous: PostDraftPublication;
  publicationId: string;
  snapshotId: string;
  createdAt: string;
  content: Pick<PostDraftPublication, "publicTeamOutlooks" | "publicLeagueRecap">;
}): PostDraftPublication {
  return {
    publicationId,
    schemaVersion: POST_DRAFT_PUBLICATION_SCHEMA_VERSION,
    season: previous.season,
    snapshotId,
    revision: previous.revision + 1,
    status: "approved",
    createdAt,
    updatedAt: createdAt,
    approvedAt: null,
    publishedAt: null,
    supersedes: previous.publicationId,
    previousVersionId: previous.publicationId,
    approval: null,
    publicTeamOutlooks: content.publicTeamOutlooks,
    publicLeagueRecap: content.publicLeagueRecap,
  };
}

export type NarrativeStorageInput = FranchiseNarrativeDraft | LeagueRecapDraft;
