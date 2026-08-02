import type { OwnerProfileViewModel } from "@/lib/managers/identitySelectors";

/**
 * Removes private identity evidence before a Manager Profile view model crosses
 * the server-to-client presentation boundary. Current division resolution still
 * uses the canonical public roster slot already present on the franchise model.
 */
export function toPublicOwnerProfileViewModel(
  profile: OwnerProfileViewModel
): OwnerProfileViewModel {
  return {
    ...profile,
    owner: {
      ...profile.owner,
      sleeperIds: [],
      notes: undefined,
    },
  };
}
