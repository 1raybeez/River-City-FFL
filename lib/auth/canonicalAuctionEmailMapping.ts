import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  resolveAuthorizedEmailMapping,
  type AuthorizedOwnerEmailMapping,
} from "@/lib/auth/canonicalAuctionAuthorization";

export const AUCTION_AUTHORIZED_OWNER_EMAILS_COLLECTION =
  "auction_authorized_owner_emails";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

async function readEmailMappings(normalizedEmail: string) {
  const snapshot = await firestore
    .collection(AUCTION_AUTHORIZED_OWNER_EMAILS_COLLECTION)
    .where("normalizedEmail", "==", normalizedEmail)
    .get();

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      normalizedEmail:
        typeof data.normalizedEmail === "string"
          ? data.normalizedEmail
          : document.id,
      canonicalOwnerId:
        typeof data.canonicalOwnerId === "string" ? data.canonicalOwnerId : "",
    } satisfies AuthorizedOwnerEmailMapping;
  });
}

export async function resolveAuthorizedEmailFromFirestore(
  email: string | null | undefined
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const mappings = await readEmailMappings(normalizedEmail);
  return resolveAuthorizedEmailMapping(normalizedEmail, mappings);
}
