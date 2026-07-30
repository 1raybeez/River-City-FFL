import { LEAGUE_HISTORY_IDS } from "@/lib/leagueAlgorithm";
import {
  franchisesById,
  ownerProfiles,
  ownerProfilesById,
  ownershipTenures,
} from "@/lib/managers/identityData";
import {
  OwnerProfileStatus,
  OwnershipRole,
  type OwnerProfile,
  type OwnershipTenure,
} from "@/lib/managers/identityTypes";
import { MANUAL_HISTORY } from "@/lib/manual-history";

type ManualPlacement = {
  rank: number;
  manager: string;
};

export type OwnerSeasonCoverageState =
  | "resolved"
  | "missing"
  | "unresolved"
  | "not-available";

export type OwnerSeasonPlacementAttribution =
  | "direct"
  | "shared-franchise"
  | null;

export type OwnerSeasonCoOwner = {
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownershipRole: OwnershipRole;
};

export type OwnerSeasonHistoryRecord = {
  /**
   * Immutable identity for this owner-season attribution.
   * Resolved records use season + canonical owner ID + franchise ID; unresolved
   * manual-history rows use season + "unresolved" + their source placement rank.
   */
  ownerSeasonKey: string;
  recordId: string;
  season: number;
  ownerId: string | null;
  ownerSlug: string | null;
  ownerName: string | null;
  ownerStatus: OwnerProfileStatus | null;
  sourceManagerName: string | null;
  franchiseId: string | null;
  franchiseName: string | null;
  teamName: string | null;
  ownershipRole: OwnershipRole | null;
  isPrimaryOwner: boolean | null;
  isCoOwner: boolean | null;
  coOwners: OwnerSeasonCoOwner[];
  isActiveForSeason: boolean | null;
  isCurrentSeason: boolean;
  finalPlacement: number | null;
  isChampion: boolean;
  isRunnerUp: boolean;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  placementAttribution: OwnerSeasonPlacementAttribution;
  placementSourceOwnerId: string | null;
  sleeperLeagueId: string | null;
  coverage: {
    identity: OwnerSeasonCoverageState;
    ownership: OwnerSeasonCoverageState;
    franchise: OwnerSeasonCoverageState;
    placement: OwnerSeasonCoverageState;
    teamName: OwnerSeasonCoverageState;
    sleeperLeague: OwnerSeasonCoverageState;
  };
  sources: {
    identity: "identity-data" | "unresolved";
    ownership: "ownership-tenure" | "unresolved";
    placement: "manual-history" | "not-available";
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
};

type MutableOwnerSeasonHistoryRecord = OwnerSeasonHistoryRecord;

const manualHistoryEntries = Object.entries(MANUAL_HISTORY) as Array<
  [string, readonly ManualPlacement[]]
>;

const MANUAL_HISTORY_SEASONS = manualHistoryEntries
  .map(([season]) => Number(season))
  .sort((first, second) => first - second);

export const OWNER_SEASON_HISTORY_FIRST_SEASON =
  MANUAL_HISTORY_SEASONS[0] ?? 2011;

export const OWNER_SEASON_HISTORY_CURRENT_SEASON = Math.max(
  MANUAL_HISTORY_SEASONS.at(-1) ?? OWNER_SEASON_HISTORY_FIRST_SEASON,
  ...Object.keys(LEAGUE_HISTORY_IDS).map(Number)
);

const ownerByNormalizedName = new Map(
  ownerProfiles.map((owner) => [normalizeName(owner.fullName), owner])
);

const manualPlacementsByOwnerId = buildManualPlacementsByOwnerId();

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildManualPlacementsByOwnerId() {
  const placements = new Map<string, number[]>();

  manualHistoryEntries.forEach(([seasonValue, standings]) => {
    const season = Number(seasonValue);

    standings.forEach((standing) => {
      const owner = ownerByNormalizedName.get(normalizeName(standing.manager));
      if (!owner) return;

      const seasons = placements.get(owner.id) ?? [];
      seasons.push(season);
      placements.set(owner.id, seasons);
    });
  });

  return placements;
}

function getManualSeasonPlacements(season: number) {
  return (
    manualHistoryEntries.find(
      ([seasonValue]) => Number(seasonValue) === season
    )?.[1] ?? []
  );
}

function getLastPlaceRank(season: number) {
  const placements = getManualSeasonPlacements(season);
  if (placements.length === 0) return null;

  return Math.max(...placements.map((placement) => placement.rank));
}

function getSleeperLeagueId(season: number) {
  return LEAGUE_HISTORY_IDS[season] ?? null;
}

function isTenureActiveInSeason(tenure: OwnershipTenure, season: number) {
  if (season < tenure.startSeason) return false;
  if (tenure.endSeason !== undefined) return season <= tenure.endSeason;
  if (tenure.isActive) return season <= OWNER_SEASON_HISTORY_CURRENT_SEASON;

  return manualPlacementsByOwnerId.get(tenure.ownerId)?.includes(season) ?? false;
}

function getTenureSeasons(tenure: OwnershipTenure) {
  if (tenure.endSeason !== undefined || tenure.isActive) {
    const endSeason =
      tenure.endSeason ?? OWNER_SEASON_HISTORY_CURRENT_SEASON;

    return Array.from(
      { length: Math.max(0, endSeason - tenure.startSeason + 1) },
      (_, index) => tenure.startSeason + index
    );
  }

  return (manualPlacementsByOwnerId.get(tenure.ownerId) ?? []).filter(
    (season) => season >= tenure.startSeason
  );
}

function buildRecordId({
  season,
  ownerId,
  franchiseId,
  unresolvedRank,
}: {
  season: number;
  ownerId: string | null;
  franchiseId: string | null;
  unresolvedRank?: number;
}) {
  if (!ownerId) return `${season}:unresolved:${unresolvedRank ?? "unknown"}`;
  return `${season}:${ownerId}:${franchiseId ?? "unassigned"}`;
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

function createOwnerRecord({
  season,
  owner,
  tenure,
  notes = [],
}: {
  season: number;
  owner: OwnerProfile;
  tenure: OwnershipTenure | null;
  notes?: string[];
}): MutableOwnerSeasonHistoryRecord {
  const franchise = tenure ? franchisesById[tenure.franchiseId] : undefined;
  const sleeperLeagueId = getSleeperLeagueId(season);
  const isCurrentSeason = season === OWNER_SEASON_HISTORY_CURRENT_SEASON;
  const role = tenure?.role ?? null;
  const roleFlags = getRoleFlags(role);

  return {
    ownerSeasonKey: buildRecordId({
      season,
      ownerId: owner.id,
      franchiseId: franchise?.id ?? null,
    }),
    recordId: buildRecordId({
      season,
      ownerId: owner.id,
      franchiseId: franchise?.id ?? null,
    }),
    season,
    ownerId: owner.id,
    ownerSlug: owner.slug,
    ownerName: owner.fullName,
    ownerStatus: owner.status,
    sourceManagerName: owner.fullName,
    franchiseId: franchise?.id ?? null,
    franchiseName: franchise?.currentTeamName ?? null,
    teamName:
      isCurrentSeason && franchise ? franchise.currentTeamName : null,
    ownershipRole: role,
    ...roleFlags,
    coOwners: [],
    isActiveForSeason: tenure ? isTenureActiveInSeason(tenure, season) : null,
    isCurrentSeason,
    finalPlacement: null,
    isChampion: false,
    isRunnerUp: false,
    isThirdPlace: false,
    isPodium: false,
    isLastPlace: false,
    placementAttribution: null,
    placementSourceOwnerId: null,
    sleeperLeagueId,
    coverage: {
      identity: "resolved",
      ownership: tenure ? "resolved" : "missing",
      franchise: franchise ? "resolved" : "missing",
      placement: "not-available",
      teamName: isCurrentSeason && franchise ? "resolved" : "not-available",
      sleeperLeague: sleeperLeagueId ? "resolved" : "not-available",
    },
    sources: {
      identity: "identity-data",
      ownership: tenure ? "ownership-tenure" : "unresolved",
      placement: "not-available",
      sleeperLeague: sleeperLeagueId
        ? "league-history-ids"
        : "not-available",
    },
    notes: [...(tenure?.notes ?? []), ...notes],
  };
}

function createUnresolvedPlacementRecord({
  season,
  placement,
}: {
  season: number;
  placement: ManualPlacement;
}): MutableOwnerSeasonHistoryRecord {
  const sleeperLeagueId = getSleeperLeagueId(season);
  const lastPlaceRank = getLastPlaceRank(season);

  return {
    ownerSeasonKey: buildRecordId({
      season,
      ownerId: null,
      franchiseId: null,
      unresolvedRank: placement.rank,
    }),
    recordId: buildRecordId({
      season,
      ownerId: null,
      franchiseId: null,
      unresolvedRank: placement.rank,
    }),
    season,
    ownerId: null,
    ownerSlug: null,
    ownerName: null,
    ownerStatus: null,
    sourceManagerName: placement.manager,
    franchiseId: null,
    franchiseName: null,
    teamName: null,
    ownershipRole: null,
    isPrimaryOwner: null,
    isCoOwner: null,
    coOwners: [],
    isActiveForSeason: null,
    isCurrentSeason: season === OWNER_SEASON_HISTORY_CURRENT_SEASON,
    finalPlacement: placement.rank,
    isChampion: placement.rank === 1,
    isRunnerUp: placement.rank === 2,
    isThirdPlace: placement.rank === 3,
    isPodium: placement.rank <= 3,
    isLastPlace: lastPlaceRank !== null && placement.rank === lastPlaceRank,
    placementAttribution: null,
    placementSourceOwnerId: null,
    sleeperLeagueId,
    coverage: {
      identity: "unresolved",
      ownership: "unresolved",
      franchise: "unresolved",
      placement: "resolved",
      teamName: "not-available",
      sleeperLeague: sleeperLeagueId ? "resolved" : "not-available",
    },
    sources: {
      identity: "unresolved",
      ownership: "unresolved",
      placement: "manual-history",
      sleeperLeague: sleeperLeagueId
        ? "league-history-ids"
        : "not-available",
    },
    notes: [
      `Manual history identifies the ${season} rank ${placement.rank} entry as "${placement.manager}", but no canonical River City owner can be resolved.`,
    ],
  };
}

function applyPlacement({
  record,
  placement,
  sourceOwnerId,
  attribution,
}: {
  record: MutableOwnerSeasonHistoryRecord;
  placement: ManualPlacement;
  sourceOwnerId: string;
  attribution: Exclude<OwnerSeasonPlacementAttribution, null>;
}) {
  const lastPlaceRank = getLastPlaceRank(record.season);

  if (
    record.finalPlacement !== null &&
    record.finalPlacement !== placement.rank
  ) {
    record.notes.push(
      `Conflicting manual placements found: ${record.finalPlacement} and ${placement.rank}.`
    );
    return;
  }

  record.finalPlacement = placement.rank;
  record.isChampion = placement.rank === 1;
  record.isRunnerUp = placement.rank === 2;
  record.isThirdPlace = placement.rank === 3;
  record.isPodium = placement.rank <= 3;
  record.isLastPlace =
    lastPlaceRank !== null && placement.rank === lastPlaceRank;
  record.placementAttribution = attribution;
  record.placementSourceOwnerId = sourceOwnerId;
  record.coverage.placement = "resolved";
  record.sources.placement = "manual-history";

  if (attribution === "shared-franchise") {
    record.notes.push(
      `Placement shared from ${placement.manager}'s manual-history row through the season's franchise ownership.`
    );
  }
}

function populateCoOwners(records: MutableOwnerSeasonHistoryRecord[]) {
  const recordsBySeasonFranchise = new Map<
    string,
    MutableOwnerSeasonHistoryRecord[]
  >();

  records.forEach((record) => {
    if (!record.franchiseId || !record.ownerId) return;

    const key = `${record.season}:${record.franchiseId}`;
    const groupedRecords = recordsBySeasonFranchise.get(key) ?? [];
    groupedRecords.push(record);
    recordsBySeasonFranchise.set(key, groupedRecords);
  });

  recordsBySeasonFranchise.forEach((groupedRecords) => {
    groupedRecords.forEach((record) => {
      record.coOwners = groupedRecords
        .filter(
          (candidate) =>
            candidate.ownerId !== record.ownerId &&
            candidate.ownerId !== null &&
            candidate.ownerSlug !== null &&
            candidate.ownerName !== null &&
            candidate.ownershipRole !== null
        )
        .map((candidate) => ({
          ownerId: candidate.ownerId as string,
          ownerSlug: candidate.ownerSlug as string,
          ownerName: candidate.ownerName as string,
          ownershipRole: candidate.ownershipRole as OwnershipRole,
        }));
    });
  });
}

export function buildOwnerSeasonHistory(): OwnerSeasonHistoryRecord[] {
  const records: MutableOwnerSeasonHistoryRecord[] = [];

  ownershipTenures.forEach((tenure) => {
    const owner = ownerProfilesById[tenure.ownerId];
    if (!owner || owner.status === OwnerProfileStatus.Staff) return;

    const hasOpenInactiveBoundary =
      !tenure.isActive && tenure.endSeason === undefined;

    getTenureSeasons(tenure).forEach((season) => {
      records.push(
        createOwnerRecord({
          season,
          owner,
          tenure,
          notes: hasOpenInactiveBoundary
            ? [
                "This inactive tenure has no explicit end season; only seasons with a matching manual placement are included.",
              ]
            : [],
        })
      );
    });
  });

  manualHistoryEntries.forEach(([seasonValue, standings]) => {
    const season = Number(seasonValue);

    standings.forEach((placement) => {
      const owner = ownerByNormalizedName.get(normalizeName(placement.manager));

      if (!owner) {
        records.push(createUnresolvedPlacementRecord({ season, placement }));
        return;
      }

      let ownerSeasonRecords = records.filter(
        (record) => record.season === season && record.ownerId === owner.id
      );

      if (ownerSeasonRecords.length === 0) {
        const missingTenureRecord = createOwnerRecord({
          season,
          owner,
          tenure: null,
          notes: [
            `Manual history includes ${owner.fullName} in ${season}, but no ownership tenure covers that season.`,
          ],
        });
        records.push(missingTenureRecord);
        ownerSeasonRecords = [missingTenureRecord];
      }

      ownerSeasonRecords.forEach((ownerRecord) => {
        const sharedFranchiseRecords = ownerRecord.franchiseId
          ? records.filter(
              (record) =>
                record.season === season &&
                record.franchiseId === ownerRecord.franchiseId
            )
          : [ownerRecord];

        sharedFranchiseRecords.forEach((record) => {
          applyPlacement({
            record,
            placement,
            sourceOwnerId: owner.id,
            attribution:
              record.ownerId === owner.id ? "direct" : "shared-franchise",
          });
        });
      });
    });
  });

  populateCoOwners(records);

  return records.sort(
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
        record.ownerId === normalizedKey ||
        record.ownerSlug === normalizedKey
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
  };
}
