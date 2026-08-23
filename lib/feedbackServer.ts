import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";
import {
  DuplicateFeedbackError,
  COMMISSIONER_NOTE_MAX_LENGTH,
  FEEDBACK_STATUSES,
  normalizeCommissionerFeedbackRecord,
  sortCommissionerFeedback,
  normalizeFeedbackTitle,
  validateOwnerFeedbackInput,
  type OwnerFeedbackInput,
  type CommissionerFeedbackRecord,
  type CommissionerFeedbackStatus,
} from "@/lib/feedback";
import type { AuctionAccessSession } from "@/lib/auth/auctionAccess";

export async function createOwnerFeedback(
  input: OwnerFeedbackInput,
  session: AuctionAccessSession
) {
  const ownerId = session.access.canonicalOwnerId;
  if (!ownerId) throw new Error("Authenticated River City owner access is required.");

  const feedback = validateOwnerFeedbackInput(input);
  const existing = await firestore
    .collection("site_feedback")
    .where("submittedByOwnerProfileId", "==", ownerId)
    .get();
  const normalizedTitle = normalizeFeedbackTitle(feedback.title);
  const duplicate = existing.docs.some((document) => {
    const data = document.data() as Record<string, unknown>;
    return data.type === feedback.type &&
      data.status === "OPEN" &&
      typeof data.title === "string" &&
      normalizeFeedbackTitle(data.title) === normalizedTitle;
  });
  if (duplicate) throw new DuplicateFeedbackError();

  const reference = firestore.collection("site_feedback").doc();
  const timestamp = FieldValue.serverTimestamp();
  await reference.create({
    type: feedback.type,
    title: feedback.title,
    description: feedback.description,
    pagePath: feedback.pagePath,
    area: feedback.area,
    submittedByOwnerProfileId: ownerId,
    submittedByDisplayName: session.access.ownerDisplayName ?? ownerId,
    submittedByFranchise: session.access.sleeperTeamName ?? session.access.ownerProfileLabel ?? null,
    submittedAt: timestamp,
    status: "OPEN",
    expectedBehavior: feedback.expectedBehavior,
    reproductionSteps: feedback.reproductionSteps,
    suggestionRationale: feedback.suggestionRationale,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return reference.id;
}

export class CommissionerFeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionerFeedbackValidationError";
  }
}

export async function readCommissionerFeedback(): Promise<CommissionerFeedbackRecord[]> {
  const snapshot = await firestore.collection("site_feedback").get();
  return sortCommissionerFeedback(snapshot.docs.map((document) =>
    normalizeCommissionerFeedbackRecord(document.id, document.data() as Record<string, unknown>)
  ));
}

export async function updateCommissionerFeedback(input: {
  feedbackId: unknown;
  status?: unknown;
  commissionerNote?: unknown;
}, actor: AuctionAccessSession): Promise<CommissionerFeedbackRecord> {
  if (typeof input.feedbackId !== "string" || !input.feedbackId.trim()) {
    throw new CommissionerFeedbackValidationError("A feedback ID is required.");
  }
  const hasStatus = input.status !== undefined;
  const hasNote = input.commissionerNote !== undefined;
  if (!hasStatus && !hasNote) throw new CommissionerFeedbackValidationError("Provide a status or commissioner note.");

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.email,
  };
  if (hasStatus) {
    if (typeof input.status !== "string" || !FEEDBACK_STATUSES.includes(input.status as CommissionerFeedbackStatus)) {
      throw new CommissionerFeedbackValidationError("Choose a valid feedback status.");
    }
    patch.status = input.status;
    patch.statusUpdatedAt = FieldValue.serverTimestamp();
    patch.statusUpdatedBy = actor.email;
  }
  if (hasNote) {
    if (input.commissionerNote !== null && typeof input.commissionerNote !== "string") {
      throw new CommissionerFeedbackValidationError("Commissioner note must be text.");
    }
    const note = typeof input.commissionerNote === "string" ? input.commissionerNote.trim() : "";
    if (note.length > COMMISSIONER_NOTE_MAX_LENGTH) {
      throw new CommissionerFeedbackValidationError(`Commissioner note must be ${COMMISSIONER_NOTE_MAX_LENGTH} characters or fewer.`);
    }
    patch.commissionerNote = note || null;
    patch.noteUpdatedAt = FieldValue.serverTimestamp();
    patch.noteUpdatedBy = actor.email;
  }

  const reference = firestore.collection("site_feedback").doc(input.feedbackId.trim());
  await reference.update(patch);
  const updated = await reference.get();
  return normalizeCommissionerFeedbackRecord(updated.id, updated.data() as Record<string, unknown>);
}
