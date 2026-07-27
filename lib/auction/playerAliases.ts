import rawPlayerAliases from "../../data/auction/player-aliases.json";

export const AUCTION_PLAYER_ALIASES_FILE = "data/auction/player-aliases.json";

function cleanAliasText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const AUCTION_PLAYER_ALIASES = Object.freeze(
  Object.entries(rawPlayerAliases as Record<string, unknown>).reduce<
    Record<string, string>
  >((aliases, [sourceName, sleeperName]) => {
    const cleanSourceName = cleanAliasText(sourceName);
    const cleanSleeperName = cleanAliasText(sleeperName);

    if (cleanSourceName && cleanSleeperName) {
      aliases[cleanSourceName] = cleanSleeperName;
    }

    return aliases;
  }, {})
);

export function getAuctionPlayerAliases() {
  return { ...AUCTION_PLAYER_ALIASES };
}
