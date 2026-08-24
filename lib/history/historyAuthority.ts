import {
  getAllHistoricalSeasonResults,
  getHistoricalSeasonResultsCoverage,
  type HistoricalSeasonResult,
} from "@/lib/history/historicalSeasonResults";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { ownerProfilesById } from "@/lib/managers/identityData";
import type { ManagerStats } from "@/lib/stats";

const coverage = getHistoricalSeasonResultsCoverage();

export const HISTORY_CURRENT_SEASON = riverCityAuctionLeagueSettings.season;
export const HISTORY_FIRST_COMPLETED_SEASON =
  coverage.firstSeason;
export const HISTORY_LAST_COMPLETED_SEASON =
  coverage.latestSeason;

export const HISTORY_MATCHUP_COVERAGE_START_SEASON = 2018 as const;

export type HistoricalPostseasonEra =
  | "Consolation Bracket era"
  | "Toilet Bowl era";

export function getCompletedHistoryResults(): HistoricalSeasonResult[] {
  return getAllHistoricalSeasonResults().filter(
    (result) =>
      result.season >= HISTORY_FIRST_COMPLETED_SEASON &&
      result.season <= HISTORY_LAST_COMPLETED_SEASON &&
      result.season < HISTORY_CURRENT_SEASON
  );
}

export function getCanonicalChampionshipResults(): HistoricalSeasonResult[] {
  return getCompletedHistoryResults()
    .filter((result) => result.isHistoricalChampion)
    .sort(
      (first, second) =>
        second.season - first.season ||
        first.finalPlacement - second.finalPlacement
    );
}

export function getCanonicalChampionshipResultsForSeason(
  season: number
): HistoricalSeasonResult[] {
  return getCanonicalChampionshipResults().filter(
    (result) => result.season === season
  );
}

export function getCanonicalChampionOwnerIds(): string[] {
  return [
    ...new Set(
      getCanonicalChampionshipResults().flatMap((result) => result.ownerIds)
    ),
  ];
}

export function getCanonicalChampionNames(): string[] {
  return getCanonicalChampionOwnerIds().map(
    (ownerId) => ownerProfilesById[ownerId]?.fullName ?? ownerId
  );
}

/**
 * Keeps the existing Hall of Fame snapshot metrics while replacing its title
 * count/years and primary sort with canonical championship credits.
 */
export function reconcileHallOfFameStats(
  stats: ManagerStats[]
): ManagerStats[] {
  const credits = new Map<string, number[]>();
  for (const result of getCanonicalChampionshipResults()) {
    for (const ownerId of result.ownerIds) {
      const name = ownerProfilesById[ownerId]?.fullName ?? ownerId;
      credits.set(name, [...(credits.get(name) ?? []), result.season]);
    }
  }

  return stats
    .map((stat) => {
      const titles = credits.get(stat.manager) ?? [];
      return { ...stat, wins: titles.length, titles };
    })
    .sort((first, second) => {
      if (second.wins !== first.wins) return second.wins - first.wins;
      if (first.avgRank !== second.avgRank) return first.avgRank - second.avgRank;
      return second.top3 - first.top3;
    });
}

export function getHistoricalPostseasonEra(
  season: number
): HistoricalPostseasonEra {
  return season <= 2021 ? "Consolation Bracket era" : "Toilet Bowl era";
}

export function hasCanonicalMatchupCoverage(season: number): boolean {
  return season >= HISTORY_MATCHUP_COVERAGE_START_SEASON && season < HISTORY_CURRENT_SEASON;
}

export function getHistoryMatchupCoverageNote(): string {
  return "Detailed matchup records begin with the Sleeper-era source coverage in 2018.";
}
