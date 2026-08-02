import type { AuctionOwnerPreferenceTag } from "@/lib/auction/ownerPreferenceTypes";

export type AuctionPreferenceFallbackTag = Exclude<
  AuctionOwnerPreferenceTag,
  "open"
>;

export type AuctionPreferenceFallbacks = Readonly<{
  targetPlayerNames: readonly string[];
  fadePlayerNames: readonly string[];
  watchlistPlayerNames: readonly string[];
}>;

export const neutralAuctionPreferenceFallbacks: AuctionPreferenceFallbacks = {
  targetPlayerNames: [],
  fadePlayerNames: [],
  watchlistPlayerNames: [],
};

function normalizePlayerName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function includesPlayerName(
  fallbackNames: readonly string[],
  normalizedPlayerNames: ReadonlySet<string>
) {
  return fallbackNames.some((name) =>
    normalizedPlayerNames.has(normalizePlayerName(name))
  );
}

export function getAuctionFallbackPreferenceTags({
  fallbacks,
  playerNames,
}: {
  fallbacks: AuctionPreferenceFallbacks;
  playerNames: readonly (string | null | undefined)[];
}): AuctionPreferenceFallbackTag[] {
  const normalizedPlayerNames = new Set(
    playerNames.map(normalizePlayerName).filter(Boolean)
  );
  const tags: AuctionPreferenceFallbackTag[] = [];

  if (
    includesPlayerName(fallbacks.targetPlayerNames, normalizedPlayerNames)
  ) {
    tags.push("target");
  }

  if (includesPlayerName(fallbacks.fadePlayerNames, normalizedPlayerNames)) {
    tags.push("fade");
  }

  if (
    includesPlayerName(fallbacks.watchlistPlayerNames, normalizedPlayerNames)
  ) {
    tags.push("watch");
  }

  return tags;
}

export function resolveAuctionPreferenceTags({
  fallbacks,
  playerNames,
  savedTag,
}: {
  fallbacks: AuctionPreferenceFallbacks;
  playerNames: readonly (string | null | undefined)[];
  savedTag: AuctionOwnerPreferenceTag | null | undefined;
}): AuctionPreferenceFallbackTag[] {
  if (savedTag) {
    return savedTag === "open" ? [] : [savedTag];
  }

  return getAuctionFallbackPreferenceTags({ fallbacks, playerNames });
}

export function resolveAuctionPreferenceTag({
  fallbacks,
  playerNames,
  savedTag,
}: {
  fallbacks: AuctionPreferenceFallbacks;
  playerNames: readonly (string | null | undefined)[];
  savedTag: AuctionOwnerPreferenceTag | null | undefined;
}): AuctionOwnerPreferenceTag {
  return (
    resolveAuctionPreferenceTags({ fallbacks, playerNames, savedTag })[0] ??
    "open"
  );
}
