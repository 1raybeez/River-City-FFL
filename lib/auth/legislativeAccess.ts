import "server-only";

import {
  AuctionAccessError,
  verifyAuctionSession,
  type AuctionAccessSession,
} from "@/lib/auth/auctionAccess";

export async function getLegislativeOwnerSession() {
  const session = await verifyAuctionSession();
  return session?.access.canonicalOwnerId ? session : null;
}

export async function requireLegislativeOwner(): Promise<AuctionAccessSession> {
  const session = await getLegislativeOwnerSession();
  if (!session) {
    throw new AuctionAccessError("Authenticated River City owner access is required.");
  }
  return session;
}
