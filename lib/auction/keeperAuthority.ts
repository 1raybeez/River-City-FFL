import { findRiverCityAuctionDraft } from "@/lib/sleeper";
import {
  KEEPER_EDIT_MESSAGES,
  type KeeperAuthority,
  resolveKeeperEditState,
} from "@/lib/auction/keeperAuthorityTypes";
export { KEEPER_EDIT_MESSAGES, resolveKeeperEditState } from "@/lib/auction/keeperAuthorityTypes";
export type { KeeperAuthority, KeeperEditState } from "@/lib/auction/keeperAuthorityTypes";

export async function readKeeperAuthority(season = 2026): Promise<KeeperAuthority> {
  const draft = await findRiverCityAuctionDraft(season, { fresh: true });
  const draftId = typeof draft?.draft_id === "string" ? draft.draft_id : null;
  const draftStatus = typeof draft?.status === "string" ? draft.status : null;
  const state = resolveKeeperEditState(draftStatus);

  return {
    state,
    draftId,
    draftStatus,
    message: KEEPER_EDIT_MESSAGES[state],
  };
}
