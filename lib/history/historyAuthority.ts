import {
  getAllHistoricalSeasonResults,
  getHistoricalSeasonResultsCoverage,
  type HistoricalSeasonResult,
} from "@/lib/history/historicalSeasonResults";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { ownerProfilesById } from "@/lib/managers/identityData";

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

export type CanonicalHallOfFameResume = {
  ownerId: string;
  manager: string;
  championships: number;
  championshipYears: number[];
  runnerUpFinishes: number;
  thirdPlaceFinishes: number;
  podiumFinishes: number;
  averageFinish: number;
  seasonsPlayed: number;
};

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

export function getCanonicalHallOfFameResumes(): CanonicalHallOfFameResume[] {
  const resumeByOwner = new Map<string, CanonicalHallOfFameResume>();
  const ownerSeasonKeys = new Set<string>();
  const podiumSeasonKeys = new Set<string>();

  for (const result of getCompletedHistoryResults()) {
    for (const ownerId of new Set(result.ownerIds)) {
      const owner = ownerProfilesById[ownerId];
      if (!owner) continue;

      const ownerSeasonKey = `${ownerId}:${result.season}`;
      if (ownerSeasonKeys.has(ownerSeasonKey)) continue;
      ownerSeasonKeys.add(ownerSeasonKey);

      const resume = resumeByOwner.get(ownerId) ?? {
        ownerId,
        manager: owner.fullName,
        championships: 0,
        championshipYears: [],
        runnerUpFinishes: 0,
        thirdPlaceFinishes: 0,
        podiumFinishes: 0,
        averageFinish: 0,
        seasonsPlayed: 0,
      };

      resume.seasonsPlayed += 1;
      resume.averageFinish += result.finalPlacement;

      if (result.isHistoricalChampion) {
        resume.championships += 1;
        resume.championshipYears.push(result.season);
      } else if (result.finalPlacement === 2) {
        resume.runnerUpFinishes += 1;
      }

      if (result.finalPlacement === 3) {
        resume.thirdPlaceFinishes += 1;
      }

      if (result.finalPlacement <= 3) {
        const podiumKey = `${ownerId}:${result.season}`;
        if (!podiumSeasonKeys.has(podiumKey)) {
          podiumSeasonKeys.add(podiumKey);
          resume.podiumFinishes += 1;
        }
      }

      resumeByOwner.set(ownerId, resume);
    }
  }

  return [...resumeByOwner.values()]
    .map((resume) => ({
      ...resume,
      championshipYears: [...new Set(resume.championshipYears)].sort(
        (first, second) => first - second
      ),
      averageFinish: resume.averageFinish / resume.seasonsPlayed,
    }))
    .sort(
      (first, second) =>
        second.championships - first.championships ||
        first.averageFinish - second.averageFinish ||
        second.podiumFinishes - first.podiumFinishes ||
        first.manager.localeCompare(second.manager)
    );
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
