import "server-only";

import { verifyAuctionSession } from "@/lib/auth/auctionAccess";
import {
  toSafeCurrentMember,
  type CurrentMember,
} from "@/lib/auth/currentMemberContract";

export { anonymousCurrentMember, toSafeCurrentMember } from "@/lib/auth/currentMemberContract";
export type { CurrentMember } from "@/lib/auth/currentMemberContract";

export async function getCurrentMember(): Promise<CurrentMember> {
  const session = await verifyAuctionSession();
  return toSafeCurrentMember(session?.access);
}
