import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";
import {
  DuplicateFeedbackError,
  normalizeFeedbackTitle,
  validateOwnerFeedbackInput,
  type OwnerFeedbackInput,
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
