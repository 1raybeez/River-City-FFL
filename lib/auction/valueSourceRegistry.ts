export type AuctionValueSourceRegistryId =
  | "fantasypros"
  | "rotowire"
  | "draftsharks"
  | "footballguys"
  | "fantasynerds"
  | "espn"
  | "manual-csv"
  | "historical-masterview";

export type AuctionValueSourceRegistryType =
  | "manual-csv"
  | "official-api"
  | "export"
  | "public-page"
  | "historical-excel";

export type AuctionValueSourceAccessLevel =
  | "free"
  | "paid"
  | "subscription"
  | "unknown";

export type AuctionValueSourceImplementationStatus =
  | "not-started"
  | "inspect-next"
  | "adapter-ready"
  | "reference-only"
  | "blocked";

export interface AuctionValueSourceRegistryEntry {
  id: AuctionValueSourceRegistryId;
  displayName: string;
  type: AuctionValueSourceRegistryType;
  accessLevel: AuctionValueSourceAccessLevel;
  recommendedPriority: number;
  notes: string;
  supportsAuctionValues: boolean;
  supportsCustomLeagueSettings: boolean;
  implementationStatus: AuctionValueSourceImplementationStatus;
}

export const auctionValueSourceRegistry = [
  {
    id: "manual-csv",
    displayName: "Manual CSV",
    type: "manual-csv",
    accessLevel: "free",
    recommendedPriority: 1,
    notes:
      "Safest immediate adapter. Ray can export or hand-enter values with no scraping, credentials, paid API calls, or runtime network dependency.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: true,
    implementationStatus: "adapter-ready",
  },
  {
    id: "fantasypros",
    displayName: "FantasyPros",
    type: "export",
    accessLevel: "unknown",
    recommendedPriority: 2,
    notes:
      "Best first official/API/export candidate to inspect because FantasyPros commonly supports fantasy value exports and custom scoring workflows. Use only permitted exports or official access.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: true,
    implementationStatus: "inspect-next",
  },
  {
    id: "fantasynerds",
    displayName: "FantasyNerds",
    type: "official-api",
    accessLevel: "free",
    recommendedPriority: 3,
    notes:
      "First free source to inspect for official/API access. Confirm auction dollar support and rate/terms before building an adapter.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: false,
    implementationStatus: "inspect-next",
  },
  {
    id: "rotowire",
    displayName: "RotoWire",
    type: "export",
    accessLevel: "subscription",
    recommendedPriority: 4,
    notes:
      "Strong alternate paid/subscription candidate if a clean export or licensed data path is available. Do not scrape protected pages.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: true,
    implementationStatus: "not-started",
  },
  {
    id: "draftsharks",
    displayName: "Draft Sharks",
    type: "export",
    accessLevel: "subscription",
    recommendedPriority: 5,
    notes:
      "Strong alternate paid/subscription candidate. Prefer official exports; do not bypass login or paid content controls.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: true,
    implementationStatus: "not-started",
  },
  {
    id: "footballguys",
    displayName: "Footballguys",
    type: "export",
    accessLevel: "subscription",
    recommendedPriority: 6,
    notes:
      "Strong alternate paid/subscription candidate if auction values are available through an allowed export or official tool.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: true,
    implementationStatus: "not-started",
  },
  {
    id: "espn",
    displayName: "ESPN",
    type: "public-page",
    accessLevel: "unknown",
    recommendedPriority: 7,
    notes:
      "Secondary candidate unless a clean export/API path exists. Avoid brittle scraping and any protected fantasy league data.",
    supportsAuctionValues: false,
    supportsCustomLeagueSettings: false,
    implementationStatus: "not-started",
  },
  {
    id: "historical-masterview",
    displayName: "Historical Masterview",
    type: "historical-excel",
    accessLevel: "free",
    recommendedPriority: 8,
    notes:
      "Baseline/reference only. Historical sheets should help validate generated consensus output, not remain the manual source of truth.",
    supportsAuctionValues: true,
    supportsCustomLeagueSettings: false,
    implementationStatus: "reference-only",
  },
] as const satisfies readonly AuctionValueSourceRegistryEntry[];

export function getAuctionValueSourceRegistryByPriority() {
  return [...auctionValueSourceRegistry].sort(
    (firstSource, secondSource) =>
      firstSource.recommendedPriority - secondSource.recommendedPriority
  );
}

export function getAuctionValueSourceRegistryEntry(
  sourceId: AuctionValueSourceRegistryId
) {
  return (
    auctionValueSourceRegistry.find((source) => source.id === sourceId) ?? null
  );
}
