export const KEEPER_EDIT_MESSAGES = {
  editable: "Keepers remain editable until the draft begins.",
  locked: "Keepers are locked because the draft has started.",
  unavailable:
    "Keeper edits are temporarily unavailable while draft status cannot be verified.",
} as const;

export type KeeperEditState = keyof typeof KEEPER_EDIT_MESSAGES;

export type KeeperAuthority = {
  state: KeeperEditState;
  draftId: string | null;
  draftStatus: string | null;
  message: string;
};

export function resolveKeeperEditState(status: unknown): KeeperEditState {
  if (status === "pre_draft") return "editable";
  if (status === "drafting" || status === "paused" || status === "complete") {
    return "locked";
  }
  return "unavailable";
}
