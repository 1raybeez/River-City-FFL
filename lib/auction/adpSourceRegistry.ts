import type {
  AuctionAdpRegistryEntry,
  AuctionAdpSourceKey,
} from "./adpTypes";

export const auctionAdpSourceRegistry = [
  {
    sourceKey: "fantasypros-adp",
    displayName: "FantasyPros ADP",
    season: 2026,
    enabled: true,
    required: true,
    parserKey: "fantasypros-adp-csv",
    expectedFileName: "fantasypros-adp-2026.csv",
  },
  {
    sourceKey: "rotowire-adp",
    displayName: "RotoWire ADP",
    season: 2026,
    enabled: true,
    required: true,
    parserKey: "rotowire-adp-csv",
    expectedFileName: "rotowire-adp-2026.csv",
  },
] as const satisfies readonly AuctionAdpRegistryEntry[];

export function getAuctionAdpSourceRegistryEntries(
  season = 2026
): AuctionAdpRegistryEntry[] {
  return auctionAdpSourceRegistry.filter(
    (entry) => entry.season === season && entry.enabled
  ) as AuctionAdpRegistryEntry[];
}

export function getRequiredAuctionAdpSourceKeys(season = 2026) {
  return getAuctionAdpSourceRegistryEntries(season)
    .filter((entry) => entry.required)
    .map((entry) => entry.sourceKey);
}

export function getAuctionAdpSourceRegistryEntry(
  sourceKey: AuctionAdpSourceKey,
  season = 2026
) {
  return (
    getAuctionAdpSourceRegistryEntries(season).find(
      (entry) => entry.sourceKey === sourceKey
    ) ?? null
  );
}
