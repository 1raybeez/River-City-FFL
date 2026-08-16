import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { requireAuctionAccess } from "@/lib/auth/auctionAccess";
import {
  POST_DRAFT_FIRESTORE_PATHS,
  POST_DRAFT_PUBLICATION_SCHEMA_VERSION,
  type PostDraftPublication,
  type PostDraftPublicationPointer,
} from "@/lib/postDraftPublicationTypes";
import {
  serializePublicTeamOutlook,
  type FranchiseNarrativeDraft,
  type PublicTeamOutlook,
} from "@/lib/postDraftNarrativeTypes";
import type { PostDraftSnapshot } from "@/lib/postDraftSnapshotTypes";

export class PostDraftPublicationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "PostDraftPublicationError";
  }
}

export function isPostDraftPublicationError(error: unknown): error is PostDraftPublicationError {
  return error instanceof PostDraftPublicationError;
}

function now() {
  return new Date().toISOString();
}

function publicationRef(publicationId: string) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.publications).doc(publicationId);
}

function pointerRef(season: number) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.activePublicationPointers).doc(String(season));
}

function snapshotRef(snapshotId: string) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.snapshots).doc(snapshotId);
}

function narrativeRef(narrativeId: string) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.narratives).doc(narrativeId);
}

function requireApprovedSource(snapshot: PostDraftSnapshot, narrative: FranchiseNarrativeDraft) {
  if (snapshot.snapshotStatus !== "locked") {
    throw new PostDraftPublicationError("Only locked snapshots can be published.");
  }
  if (narrative.snapshotId !== snapshot.snapshotId || narrative.status !== "approved") {
    throw new PostDraftPublicationError("Only an approved narrative for this locked snapshot can be published.");
  }
  if (!narrative.approvedAt || !narrative.approvedBy || narrative.revision < 1) {
    throw new PostDraftPublicationError("The approved narrative revision is incomplete.");
  }
}

function publicOutlook(snapshot: PostDraftSnapshot, narrative: FranchiseNarrativeDraft, publicationVersion: string, publishedAt: string) {
  const record = snapshot.publicRecords.find((item) => item.publicRecord.franchiseId === narrative.franchiseId);
  if (!record) throw new PostDraftPublicationError("The franchise has no public snapshot record.");
  return serializePublicTeamOutlook({ snapshot, record, narrative, publicationVersion, publishedAt });
}

export async function publishNarrative({ narrativeId, expectedRevision }: { narrativeId: string; expectedRevision: number }) {
  const session = await requireAuctionAccess("maintenance");
  const narrativeDoc = await narrativeRef(narrativeId).get();
  if (!narrativeDoc.exists) throw new PostDraftPublicationError("Narrative was not found.", 404);
  const narrative = narrativeDoc.data() as FranchiseNarrativeDraft;
  if (narrative.revision !== expectedRevision) throw new PostDraftPublicationError("Narrative changed since it was loaded. Refresh before publishing.", 409);
  const snapshotDoc = await snapshotRef(narrative.snapshotId).get();
  if (!snapshotDoc.exists) throw new PostDraftPublicationError("Snapshot was not found.", 404);
  const snapshot = snapshotDoc.data() as PostDraftSnapshot;
  requireApprovedSource(snapshot, narrative);
  const pointer = pointerRef(snapshot.season);
  const publication = await firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const currentPointer = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    const previousId = currentPointer?.activeByFranchise?.[narrative.franchiseId] ?? null;
    const previousDoc = previousId ? await transaction.get(publicationRef(previousId)) : null;
    const createdAt = now();
    const revision = (currentPointer?.revision ?? 0) + 1;
    const publicationId = `${snapshot.season}:${narrative.franchiseId}:v${revision}`;
    const version = `${snapshot.season}-${narrative.franchiseId}-v${revision}`;
    const outlook = publicOutlook(snapshot, narrative, version, createdAt);
    const next: PostDraftPublication = {
      publicationId,
      schemaVersion: POST_DRAFT_PUBLICATION_SCHEMA_VERSION,
      season: snapshot.season,
      snapshotId: snapshot.snapshotId,
      narrativeId,
      narrativeRevision: narrative.revision,
      revision,
      status: "published",
      createdAt,
      updatedAt: createdAt,
      approvedAt: narrative.approvedAt,
      publishedAt: createdAt,
      supersedes: previousId,
      previousVersionId: previousId,
      approval: { approvedBy: narrative.approvedBy!, approvedAt: narrative.approvedAt!, approvalNote: null },
      createdBy: session.access.canonicalOwnerId ?? "commissioner",
      sourceMetadata: {
        snapshotGeneratedAt: snapshot.generatedAt,
        metricsModelVersion: snapshot.modelVersions.metrics,
        draftGradeModelVersion: snapshot.modelVersions.draftGrade,
        strategyExecutionModelVersion: snapshot.modelVersions.strategyExecution,
        powerRankingsVersion: snapshot.modelVersions.powerRankings,
      },
      rollbackFrom: null,
      rollbackAt: null,
      publicTeamOutlooks: [outlook],
      publicLeagueRecap: null,
    };
    if (previousDoc?.exists) {
      transaction.update(previousDoc.ref, { status: "superseded", updatedAt: createdAt });
    }
    transaction.create(publicationRef(publicationId), next);
    transaction.set(pointer, {
      season: snapshot.season,
      revision,
      updatedAt: createdAt,
      activeByFranchise: { ...(currentPointer?.activeByFranchise ?? {}), [narrative.franchiseId]: publicationId },
    } satisfies PostDraftPublicationPointer);
    return next;
  });
  return publication;
}

export async function unpublishNarrativePublication({ publicationId }: { publicationId: string }) {
  const session = await requireAuctionAccess("maintenance");
  const publication = await publicationRef(publicationId).get();
  if (!publication.exists) throw new PostDraftPublicationError("Publication was not found.", 404);
  const current = publication.data() as PostDraftPublication;
  const pointer = pointerRef(current.season);
  return firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const currentPointer = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    if (currentPointer?.activeByFranchise?.[current.publicTeamOutlooks[0]?.franchiseId] !== publicationId) {
      throw new PostDraftPublicationError("Publication is no longer the active revision.", 409);
    }
    const updatedAt = now();
    const franchiseId = current.publicTeamOutlooks[0]?.franchiseId;
    if (!franchiseId) throw new PostDraftPublicationError("Publication has no franchise identity.");
    const activeByFranchise = { ...(currentPointer?.activeByFranchise ?? {}) };
    delete activeByFranchise[franchiseId];
    transaction.update(publicationRef(publicationId), { status: "unpublished", updatedAt, updatedBy: session.access.canonicalOwnerId ?? "commissioner" });
    transaction.set(pointer, { ...currentPointer, season: current.season, revision: (currentPointer?.revision ?? 0) + 1, updatedAt, activeByFranchise }, { merge: true });
    return { ...current, status: "unpublished" as const, updatedAt };
  });
}

export async function rollbackPublication({ publicationId }: { publicationId: string }) {
  const session = await requireAuctionAccess("maintenance");
  const targetDoc = await publicationRef(publicationId).get();
  if (!targetDoc.exists) throw new PostDraftPublicationError("Rollback publication was not found.", 404);
  const target = targetDoc.data() as PostDraftPublication;
  if (!target.approval || !["published", "unpublished", "superseded"].includes(target.status)) throw new PostDraftPublicationError("Only an approved historical publication can be restored.");
  const franchiseId = target.publicTeamOutlooks[0]?.franchiseId;
  if (!franchiseId) throw new PostDraftPublicationError("Publication has no franchise identity.");
  const pointer = pointerRef(target.season);
  return firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const currentPointer = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    const currentId = currentPointer?.activeByFranchise?.[franchiseId] ?? null;
    if (currentId === publicationId) return target;
    const currentDoc = currentId ? await transaction.get(publicationRef(currentId)) : null;
    const updatedAt = now();
    if (currentDoc?.exists) transaction.update(currentDoc.ref, { status: "superseded", updatedAt, rollbackTo: publicationId });
    transaction.update(targetDoc.ref, { status: "published", publishedAt: target.publishedAt ?? updatedAt, updatedAt, rollbackFrom: currentId, rollbackAt: updatedAt, rolledBackBy: session.access.canonicalOwnerId ?? "commissioner" });
    transaction.set(pointer, { season: target.season, revision: (currentPointer?.revision ?? 0) + 1, updatedAt, activeByFranchise: { ...(currentPointer?.activeByFranchise ?? {}), [franchiseId]: publicationId } }, { merge: true });
    return { ...target, status: "published" as const, updatedAt, rollbackFrom: currentId, rollbackAt: updatedAt };
  });
}

export async function listPostDraftPublications() {
  await requireAuctionAccess("maintenance");
  const result = await firestore.collection(POST_DRAFT_FIRESTORE_PATHS.publications).orderBy("createdAt", "desc").limit(100).get();
  return result.docs.map((doc) => doc.data() as PostDraftPublication);
}

export async function getPublishedTeamOutlook(season: number, franchiseId: string): Promise<PublicTeamOutlook | null> {
  const pointerDoc = await pointerRef(season).get();
  if (!pointerDoc.exists) return null;
  const pointer = pointerDoc.data() as PostDraftPublicationPointer;
  const publicationId = pointer.activeByFranchise?.[franchiseId];
  if (!publicationId) return null;
  const publicationDoc = await publicationRef(publicationId).get();
  if (!publicationDoc.exists) return null;
  const publication = publicationDoc.data() as PostDraftPublication;
  if (publication.status !== "published" || publication.season !== season) return null;
  return publication.publicTeamOutlooks.find((outlook) => outlook.franchiseId === franchiseId) ?? null;
}

export async function getPublishedTeamOutlookPublication(season: number, franchiseId: string): Promise<{ publicationId: string; outlook: PublicTeamOutlook } | null> {
  const pointerDoc = await pointerRef(season).get();
  if (!pointerDoc.exists) return null;
  const pointer = pointerDoc.data() as PostDraftPublicationPointer;
  const publicationId = pointer.activeByFranchise?.[franchiseId];
  if (!publicationId) return null;
  const publicationDoc = await publicationRef(publicationId).get();
  if (!publicationDoc.exists) return null;
  const publication = publicationDoc.data() as PostDraftPublication;
  if (publication.status !== "published" || publication.publicationKind === "league") return null;
  const outlook = publication.publicTeamOutlooks.find((item) => item.franchiseId === franchiseId);
  return outlook ? { publicationId, outlook } : null;
}
