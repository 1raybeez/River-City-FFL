import "server-only";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import type { OperationalFinanceActor } from "@/lib/finance/operationalFinanceLedgerTypes";

export async function requireOperationalFinanceCommissioner() {
  const session = await requireAuctionAccess("maintenance");
  if (session.access.role !== "commissioner") {
    throw new AuctionAccessError("Commissioner finance access denied.");
  }
  const actor: OperationalFinanceActor = {
    actorId: `commissioner:${session.email}`,
    role: "commissioner",
  };
  return { session, actor };
}
