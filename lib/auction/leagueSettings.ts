import type { AuctionSeasonYear } from "@/lib/auction/types";

export type RiverCityAuctionLeagueSettings = {
  leagueName: "River City FFL";
  season: AuctionSeasonYear;
  teamCount: number;
  auctionBudgetPerTeam: number;
  totalLeagueBudget: number;
  preferredEarlyKickerMax: number;
  preferredEarlyDefenseMax: number;
};

export const riverCityAuctionLeagueSettings = {
  leagueName: "River City FFL",
  season: 2026,
  teamCount: 12,
  auctionBudgetPerTeam: 200,
  totalLeagueBudget: 2400,
  preferredEarlyKickerMax: 3,
  preferredEarlyDefenseMax: 4,
} as const satisfies RiverCityAuctionLeagueSettings;
