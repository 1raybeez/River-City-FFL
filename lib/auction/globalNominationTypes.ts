export const GLOBAL_NOMINATION_ROOT_COLLECTION = "auction_draft_runs";
export const GLOBAL_NOMINATION_DOCUMENT = "current_nomination";

export type GlobalNominationState = "active" | "cleared";

export type GlobalNominationRecord = {
  season: number;
  state: GlobalNominationState;
  playerId: string | null;
  playerName: string | null;
  position: string | null;
  nflTeam: string | null;
  nominatedByFranchiseId: string | null;
  nominatedByRosterId: number | null;
  openingBid: number | null;
  currentBid: number | null;
  updatedAt: string;
  updatedByOwnerId: string;
  version: number;
};

export type GlobalNominationReadResult = {
  status: "available" | "unavailable";
  nomination: GlobalNominationRecord | null;
  error?: string;
};

export function getGlobalNominationPath(season = 2026) {
  return `${GLOBAL_NOMINATION_ROOT_COLLECTION}/${season}/state/${GLOBAL_NOMINATION_DOCUMENT}`;
}
