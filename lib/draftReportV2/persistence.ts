import "server-only";
import { firestore } from "@/lib/firebaseAdmin";
import { requireAuctionAccess, requireAuctionWarRoomAccess } from "@/lib/auth/auctionAccess";
import { buildLiveDraftReportV2Review } from "@/lib/draftReportV2/review";
import type { DraftReportV2Snapshot } from "@/lib/draftReportV2/types";

export const DRAFT_REPORT_V2_REVIEW_COLLECTION = "draft_report_v2_review_snapshots" as const;
export type DraftReportV2ReviewSnapshot = Awaited<ReturnType<typeof buildLiveDraftReportV2Review>> & { persistedAt: string; persistedBy: string; persistedSnapshot: true };
function ref(snapshotId: string) { return firestore.collection(DRAFT_REPORT_V2_REVIEW_COLLECTION).doc(snapshotId); }

export async function readDraftReportV2ReviewSnapshot(snapshotId: string) {
  await requireAuctionAccess("maintenance");
  const doc = await ref(snapshotId).get();
  return doc.exists ? doc.data() as DraftReportV2ReviewSnapshot : null;
}

/** Read-only owner publication reader. The route must pass the owner access check first. */
export async function readDraftReportV2ReviewSnapshotForOwner(snapshotId: string) {
  await requireAuctionWarRoomAccess();
  const doc = await ref(snapshotId).get();
  return doc.exists ? doc.data() as DraftReportV2ReviewSnapshot : null;
}

export async function listDraftReportV2ReviewSnapshots() {
  await requireAuctionAccess("maintenance");
  const docs = await firestore.collection(DRAFT_REPORT_V2_REVIEW_COLLECTION).orderBy("persistedAt", "desc").limit(25).get();
  return docs.docs.map((doc) => doc.data() as DraftReportV2ReviewSnapshot);
}

export async function freezeDraftReportV2ReviewSnapshot() {
  const actor = await requireAuctionAccess("maintenance");
  const review = await buildLiveDraftReportV2Review();
  const existing = await ref(review.snapshot.snapshotId).get();
  if (existing.exists) return { action: "RETURNED_EXISTING" as const, snapshot: existing.data() as DraftReportV2ReviewSnapshot };
  const snapshot: DraftReportV2ReviewSnapshot = { ...review, persistedAt: new Date().toISOString(), persistedBy: actor.access.canonicalOwnerId ?? actor.email, persistedSnapshot: true };
  await ref(review.snapshot.snapshotId).create(snapshot);
  return { action: "CREATED" as const, snapshot };
}

export function isPersistedV2Review(value: unknown): value is DraftReportV2ReviewSnapshot { return Boolean(value && typeof value === "object" && (value as { persistedSnapshot?: unknown }).persistedSnapshot === true); }
