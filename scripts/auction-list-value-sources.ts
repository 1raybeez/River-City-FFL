import {
  getAuctionValueSourceRegistryByPriority,
  type AuctionValueSourceRegistryEntry,
} from "../lib/auction/valueSourceRegistry";

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function formatSource(source: AuctionValueSourceRegistryEntry) {
  return [
    `${source.recommendedPriority}. ${source.displayName} (${source.id})`,
    `type: ${source.type}`,
    `access: ${source.accessLevel}`,
    `auction values: ${formatBoolean(source.supportsAuctionValues)}`,
    `custom settings: ${formatBoolean(source.supportsCustomLeagueSettings)}`,
    `status: ${source.implementationStatus}`,
    `notes: ${source.notes}`,
  ].join("\n   ");
}

function main() {
  const sources = getAuctionValueSourceRegistryByPriority();

  console.log("River City Auction Value Sources");
  console.log("Recommended implementation order:");
  console.log("");
  sources.forEach((source) => {
    console.log(formatSource(source));
    console.log("");
  });
}

main();
