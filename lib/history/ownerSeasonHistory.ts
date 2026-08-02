import {
  getAllHistoricalSeasonResults,
  getHistoricalSeasonResultsCoverage,
  type HistoricalMatchupSourceAvailability,
  type HistoricalSeasonResult,
} from "@/lib/history/historicalSeasonResults";
import { LEAGUE_HISTORY_IDS } from "@/lib/leagueAlgorithm";
import {
  franchisesById,
  ownerProfilesById,
  ownershipTenures,
} from "@/lib/managers/identityData";
import {
  OwnerProfileStatus,
  OwnershipRole,
  type OwnerProfile,
  type OwnershipTenure,
} from "@/lib/managers/identityTypes";

export type OwnerSeasonCoverageState =
  | "resolved"
  | "missing"
  | "unresolved"
  | "not-available";

export type OwnerSeasonPlacementAttribution =
  | "direct"
  | "shared-franchise"
  | null;

export type HistoricalChampionshipType = "sole" | "co-champion" | null;

export type OwnerSeasonCoOwner = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownershipRole: OwnershipRole;
};

export type OwnerSeasonHistoryRecord = {
  /** Immutable season + owner + franchise attribution key. */
  ownerSeasonKey: string;
  /** Backward-compatible alias for ownerSeasonKey. */
  recordId: string;
  season: number;
  ownerId: string | null;
  ownerSlug: string | null;
  ownerName: string | null;
  ownerStatus: OwnerProfileStatus | null;
  sourceManagerName: string | null;
  franchiseId: string | null;
  franchiseName: string | null;
  /** Raw historical team name when the approved source provides one. */
  historicalTeamName: string | null;
  /** Backward-compatible season team-name field. */
  teamName: string | null;
  ownershipRole: OwnershipRole | null;
  isPrimaryOwner: boolean | null;
  isCoOwner: boolean | null;
  coOwners: OwnerSeasonCoOwner[];
  isActiveForSeason: boolean | null;
  isCurrentSeason: boolean;
  finalPlacement: number | null;
  isPlatformChampion: boolean;
  isPlatformRunnerUp: boolean;
  isHistoricalChampion: boolean;
  historicalChampionshipType: HistoricalChampionshipType;
  championshipNote: string | null;
  /** @deprecated Use isPlatformChampion. */
  isChampion: boolean;
  /** @deprecated Use isPlatformRunnerUp. */
  isRunnerUp: boolean;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  placementAttribution: OwnerSeasonPlacementAttribution;
  placementSourceOwnerId: string | null;
  historicalSeasonResultKey: string | null;
  sleeperLeagueId: string | null;
  coverage: {
    identity: OwnerSeasonCoverageState;
    ownership: OwnerSeasonCoverageState;
    franchise: OwnerSeasonCoverageState;
    seasonResult: OwnerSeasonCoverageState;
    placement: OwnerSeasonCoverageState;
    historicalTeamName: OwnerSeasonCoverageState;
    teamName: OwnerSeasonCoverageState;
    matchupSource: HistoricalMatchupSourceAvailability;
    sleeperLeague: OwnerSeasonCoverageState;
  };
  sources: {
    identity: "identity-data" | "unresolved";
    ownership: "ownership-tenure" | "historical-season-results" | "unresolved";
    placement: "historical-season-results" | "not-available";
    seasonResult: "historical-season-results" | "not-available";
    sleeperLeague: "league-history-ids" | "not-available";
  };
  notes: string[];
};

export type OwnerSeasonHistoryCoverageSummary = {
  ownersRepresented: number;
  totalRecords: number;
  seasons: number[];
  unresolvedRecords: number;
  duplicateRecordKeys: string[];
  missingFranchiseAssignments: number;
  recordsWithSeasonResult: number;
  recordsWithoutSeasonResult: number;
  recordsWithHistoricalTeamName: number;
  recordsWithUnavailableMatchupSource: number;
};

const historicalCoverage = getHistoricalSeasonResultsCoverage();

export const OWNER_SEASON_HISTORY_FIRST_SEASON =
  historicalCoverage.firstSeason;

export const OWNER_SEASON_HISTORY_CURRENT_SEASON = Math.max(
  historicalCoverage.latestSeason,
  ...Object.keys(LEAGUE_HISTORY_IDS).map(Number)
);

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildRecordId(
  season: number,
  ownerId: string,
  franchiseId: string | null
) {
  return `${season}:${ownerId}:${franchiseId ?? "unassigned"}`;
}

function getSleeperLeagueId(season: number) {
  return LEAGUE_HISTORY_IDS[season] ?? null;
}

function tenureIncludesSeason(tenure: OwnershipTenure, season: number) {
  return (
    season >= tenure.startSeason &&
    (tenure.endSeason === undefined || season <= tenure.endSeason)
  );
}

function findTenure(
  ownerId: string,
  franchiseId: string | null,
  season: number
) {
  const ownerTenures = ownershipTenures.filter(
    (tenure) => tenure.ownerId === ownerId
  );
  const exactTenure = ownerTenures.find(
    (tenure) =>
      tenure.franchiseId === franchiseId && tenureIncludesSeason(tenure, season)
  );
  if (exactTenure) return exactTenure;

  if (franchiseId) {
    const matchingFranchiseTenures = ownerTenures.filter(
      (tenure) => tenure.franchiseId === franchiseId
    );
    if (matchingFranchiseTenures.length === 1) {
      return matchingFranchiseTenures[0];
    }
  }

  return null;
}

function getRoleFlags(role: OwnershipRole | null) {
  if (role === null) {
    return { isPrimaryOwner: null, isCoOwner: null };
  }

  return {
    isPrimaryOwner:
      role === OwnershipRole.Primary || role === OwnershipRole.LegacyOwner,
    isCoOwner: role === OwnershipRole.CoOwner,
  };
}

function getHistoricalChampionshipType(
  result: HistoricalSeasonResult
): HistoricalChampionshipType {
  if (!result.isHistoricalChampion) return null;
  return result.season === 2022 ? "co-champion" : "sole";
}

function getCoOwners(
  result: HistoricalSeasonResult,
  ownerId: string
): OwnerSeasonCoOwner[] {
  return result.ownerIds.flatMap((coOwnerId) => {
    if (coOwnerId === ownerId) return [];
    const owner = ownerProfilesById[coOwnerId];
    if (!owner) return [];
    const tenure = findTenure(coOwnerId, result.franchiseId, result.season);
    if (!tenure) return [];

    return [
      {
        ownerId: owner.id,
        ownerSlug: owner.slug,
        ownerName: owner.fullName,
        ownershipRole: tenure.role,
      },
    ];
  });
}

function createHistoricalOwnerRecord(
  result: HistoricalSeasonResult,
  ownerId: string,
  ownerCreditIndex: number
): OwnerSeasonHistoryRecord {
  const owner = ownerProfilesById[ownerId];
  if (!owner) {
    throw new Error(
      `Historical season result ${result.seasonResultKey} references unknown owner ${ownerId}.`
    );
  }

  const tenure = findTenure(ownerId, result.franchiseId, result.season);
  const franchise = result.franchiseId
    ? franchisesById[result.franchiseId]
    : undefined;
  const role = tenure?.role ?? null;
  const roleFlags = getRoleFlags(role);
  const sleeperLeagueId = getSleeperLeagueId(result.season);
  const ownerSeasonKey = buildRecordId(
    result.season,
    owner.id,
    result.franchiseId
  );
  const historicalTeamNameCoverage = result.rawTeamName
    ? "resolved"
    : "not-available";

  return {
    ownerSeasonKey,
    recordId: ownerSeasonKey,
    season: result.season,
    ownerId: owner.id,
    ownerSlug: owner.slug,
    ownerName: owner.fullName,
    ownerStatus: owner.status,
    sourceManagerName: result.rawOwnerLabel,
    franchiseId: result.franchiseId,
    franchiseName: franchise?.currentTeamName ?? null,
    historicalTeamName: result.rawTeamName,
    teamName: result.rawTeamName,
    ownershipRole: role,
    ...roleFlags,
    coOwners: getCoOwners(result, owner.id),
    isActiveForSeason: true,
    isCurrentSeason: false,
    finalPlacement: result.finalPlacement,
    isPlatformChampion: result.isPlatformChampion,
    isPlatformRunnerUp: result.isPlatformRunnerUp,
    isHistoricalChampion: result.isHistoricalChampion,
    historicalChampionshipType: getHistoricalChampionshipType(result),
    championshipNote: result.championshipNote,
    isChampion: result.isPlatformChampion,
    isRunnerUp: result.isPlatformRunnerUp,
    isThirdPlace: result.isThirdPlace,
    isPodium: result.isPodium,
    isLastPlace: result.isLastPlace,
    placementAttribution: ownerCreditIndex === 0 ? "direct" : "shared-franchise",
    placementSourceOwnerId: result.ownerIds[0] ?? null,
    historicalSeasonResultKey: result.seasonResultKey,
    sleeperLeagueId,
    coverage: {
      identity: "resolved",
      ownership: tenure ? "resolved" : "missing",
      franchise: result.franchiseId ? "resolved" : "unresolved",
      seasonResult: "resolved",
      placement: "resolved",
      historicalTeamName: historicalTeamNameCoverage,
      teamName: historicalTeamNameCoverage,
      matchupSource: result.coverage.matchupSource,
      sleeperLeague: sleeperLeagueId ? "resolved" : "not-available",
    },
    sources: {
      identity: "identity-data",
      ownership: tenure ? "ownership-tenure" : "historical-season-results",
      placement: "historical-season-results",
      seasonResult: "historical-season-results",
      sleeperLeague: sleeperLeagueId
        ? "league-history-ids"
        : "not-available",
    },
    notes: [...(tenure?.notes ?? []), ...result.notes],
  };
}

function getCurrentCoOwners(
  tenure: OwnershipTenure,
  activeTenures: readonly OwnershipTenure[]
) {
  return activeTenures.flatMap((candidate) => {
    if (
      candidate.ownerId === tenure.ownerId ||
      candidate.franchiseId !== tenure.franchiseId
    ) {
      return [];
    }
    const owner = ownerProfilesById[candidate.ownerId];
    if (!owner) return [];
    return [
      {
        ownerId: owner.id,
        ownerSlug: owner.slug,
        ownerName: owner.fullName,
        ownershipRole: candidate.role,
      },
    ];
  });
}

function createCurrentOwnerRecord(
  owner: OwnerProfile,
  tenure: OwnershipTenure,
  activeTenures: readonly OwnershipTenure[]
): OwnerSeasonHistoryRecord {
  const season = OWNER_SEASON_HISTORY_CURRENT_SEASON;
  const franchise = franchisesById[tenure.franchiseId];
  const sleeperLeagueId = getSleeperLeagueId(season);
  const ownerSeasonKey = buildRecordId(season, owner.id, tenure.franchiseId);
  const roleFlags = getRoleFlags(tenure.role);

  return {
    ownerSeasonKey,
    recordId: ownerSeasonKey,
    season,
    ownerId: owner.id,
    ownerSlug: owner.slug,
    ownerName: owner.fullName,
    ownerStatus: owner.status,
    sourceManagerName: owner.fullName,
    franchiseId: tenure.franchiseId,
    franchiseName: franchise?.currentTeamName ?? null,
    historicalTeamName: null,
    teamName: franchise?.currentTeamName ?? null,
    ownershipRole: tenure.role,
    ...roleFlags,
    coOwners: getCurrentCoOwners(tenure, activeTenures),
    isActiveForSeason: true,
    isCurrentSeason: true,
    finalPlacement: null,
    isPlatformChampion: false,
    isPlatformRunnerUp: false,
    isHistoricalChampion: false,
    historicalChampionshipType: null,
    championshipNote: null,
    isChampion: false,
    isRunnerUp: false,
    isThirdPlace: false,
    isPodium: false,
    isLastPlace: false,
    placementAttribution: null,
    placementSourceOwnerId: null,
    historicalSeasonResultKey: null,
    sleeperLeagueId,
    coverage: {
      identity: "resolved",
      ownership: "resolved",
      franchise: franchise ? "resolved" : "missing",
      seasonResult: "not-available",
      placement: "not-available",
      historicalTeamName: "not-available",
      teamName: franchise ? "resolved" : "not-available",
      matchupSource: sleeperLeagueId
        ? "available-in-separate-engine"
        : "unavailable-no-source",
      sleeperLeague: sleeperLeagueId ? "resolved" : "not-available",
    },
    sources: {
      identity: "identity-data",
      ownership: "ownership-tenure",
      placement: "not-available",
      seasonResult: "not-available",
      sleeperLeague: sleeperLeagueId
        ? "league-history-ids"
        : "not-available",
    },
    notes: [...(tenure.notes ?? [])],
  };
}

export function buildOwnerSeasonHistory(): OwnerSeasonHistoryRecord[] {
  const historicalRecords = getAllHistoricalSeasonResults().flatMap((result) =>
    result.ownerIds.map((ownerId, index) =>
      createHistoricalOwnerRecord(result, ownerId, index)
    )
  );
  const activeTenures = ownershipTenures.filter(
    (tenure) =>
      tenure.isActive &&
      tenureIncludesSeason(tenure, OWNER_SEASON_HISTORY_CURRENT_SEASON)
  );
  const currentRecords = activeTenures.flatMap((tenure) => {
    const owner = ownerProfilesById[tenure.ownerId];
    if (!owner || owner.status === OwnerProfileStatus.Staff) return [];
    return [createCurrentOwnerRecord(owner, tenure, activeTenures)];
  });

  return [...historicalRecords, ...currentRecords].sort(
    (first, second) =>
      second.season - first.season ||
      (first.finalPlacement ?? Number.MAX_SAFE_INTEGER) -
        (second.finalPlacement ?? Number.MAX_SAFE_INTEGER) ||
      (first.ownerName ?? first.sourceManagerName ?? "").localeCompare(
        second.ownerName ?? second.sourceManagerName ?? ""
      )
  );
}

const ownerSeasonHistory = buildOwnerSeasonHistory();

function cloneRecord(record: OwnerSeasonHistoryRecord) {
  return {
    ...record,
    coOwners: record.coOwners.map((coOwner) => ({ ...coOwner })),
    coverage: { ...record.coverage },
    sources: { ...record.sources },
    notes: [...record.notes],
  };
}

export function getAllOwnerSeasonHistory() {
  return ownerSeasonHistory.map(cloneRecord);
}

export function getOwnerSeasonHistory(ownerIdOrSlug: string) {
  const normalizedKey = normalizeName(ownerIdOrSlug);

  return ownerSeasonHistory
    .filter(
      (record) =>
        record.ownerId === normalizedKey || record.ownerSlug === normalizedKey
    )
    .map(cloneRecord);
}

export function getOwnerSeasonHistoryForSeason(season: number) {
  return ownerSeasonHistory
    .filter((record) => record.season === season)
    .map(cloneRecord);
}

export function getUnresolvedOwnerSeasonHistory() {
  return ownerSeasonHistory
    .filter((record) => record.ownerId === null)
    .map(cloneRecord);
}

export function getOwnerSeasonHistoryCoverageSummary(
  records: readonly OwnerSeasonHistoryRecord[] = ownerSeasonHistory
): OwnerSeasonHistoryCoverageSummary {
  const duplicateCounts = new Map<string, number>();

  records.forEach((record) => {
    duplicateCounts.set(
      record.recordId,
      (duplicateCounts.get(record.recordId) ?? 0) + 1
    );
  });

  return {
    ownersRepresented: new Set(
      records.flatMap((record) => (record.ownerId ? [record.ownerId] : []))
    ).size,
    totalRecords: records.length,
    seasons: [...new Set(records.map((record) => record.season))].sort(
      (first, second) => first - second
    ),
    unresolvedRecords: records.filter((record) => record.ownerId === null)
      .length,
    duplicateRecordKeys: [...duplicateCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([recordId]) => recordId)
      .sort(),
    missingFranchiseAssignments: records.filter(
      (record) => record.ownerId !== null && record.franchiseId === null
    ).length,
    recordsWithSeasonResult: records.filter(
      (record) => record.coverage.seasonResult === "resolved"
    ).length,
    recordsWithoutSeasonResult: records.filter(
      (record) => record.coverage.seasonResult === "not-available"
    ).length,
    recordsWithHistoricalTeamName: records.filter(
      (record) => record.coverage.historicalTeamName === "resolved"
    ).length,
    recordsWithUnavailableMatchupSource: records.filter(
      (record) => record.coverage.matchupSource === "unavailable-no-source"
    ).length,
  };
}
