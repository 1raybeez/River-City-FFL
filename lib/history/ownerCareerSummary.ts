import {
  getAllOwnerSeasonHistory,
  getUnresolvedOwnerSeasonHistory,
  type OwnerSeasonHistoryRecord,
} from "@/lib/history/ownerSeasonHistory";
import { ownerProfiles } from "@/lib/managers/identityData";
import {
  OwnerProfileStatus,
  OwnershipRole,
  type OwnerProfile,
} from "@/lib/managers/identityTypes";

export type OwnerCareerSeasonSummary = {
  firstSeason: number | null;
  latestSeason: number | null;
  seasonsRepresented: number;
  seasonsWithKnownPlacement: number;
  seasonsAsPrimaryOwner: number;
  seasonsAsCoOwner: number;
  seasonsAsLegacyOwner: number;
};

export type OwnerCareerPlacementSummary = {
  platformChampionships: number;
  historicalChampionships: number;
  runnerUpFinishes: number;
  thirdPlaceFinishes: number;
  podiums: number;
  bestFinish: number | null;
  worstFinish: number | null;
  averageFinish: number | null;
  lastPlaceFinishes: number;
};

export type OwnerCareerLatestFranchise = {
  franchiseId: string;
  franchiseName: string | null;
  season: number;
  ownershipRole: OwnershipRole | null;
};

export type OwnerCareerFranchiseSummary = {
  franchiseId: string;
  franchiseName: string | null;
  firstSeason: number;
  latestSeason: number;
  seasonsRepresented: number;
  ownershipRoles: OwnershipRole[];
  platformChampionships: number;
  historicalChampionships: number;
  runnerUpFinishes: number;
  thirdPlaceFinishes: number;
  podiums: number;
  lastPlaceFinishes: number;
};

export type OwnerCareerFutureEnrichment = {
  regularSeasonRecord: {
    wins: number;
    losses: number;
    ties: number;
  } | null;
  playoffRecord: {
    wins: number;
    losses: number;
  } | null;
  winningPercentage: number | null;
  playoffAppearances: number | null;
  pointsFor: number | null;
  pointsAgainst: number | null;
  careerWinnings: number | null;
  netEarnings: number | null;
  favoriteVictimOwnerId: string | null;
  nemesisOwnerId: string | null;
  mostPlayedOpponentOwnerId: string | null;
  statisticalRivalryOwnerId: string | null;
  draftPerformance: null;
  tradePerformance: null;
};

export type OwnerCareerCoverage = {
  ownerSeasonRecords: number;
  recordsWithPlacement: number;
  recordsWithoutPlacement: number;
  placementCoverage: number | null;
  recordsWithFranchise: number;
  missingFranchiseRecords: number;
  unresolvedRecordsAttributed: number;
  sourceUnresolvedRecordsExcluded: number;
};

export type OwnerCareerSummary = {
  summaryId: string;
  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  ownerStatus: OwnerProfileStatus;
  seasons: OwnerCareerSeasonSummary;
  placements: OwnerCareerPlacementSummary;
  latestFranchise: OwnerCareerLatestFranchise | null;
  franchiseHistory: OwnerCareerFranchiseSummary[];
  futureEnrichment: OwnerCareerFutureEnrichment;
  coverage: OwnerCareerCoverage;
  notes: string[];
};

export type OwnerCareerSummaryCoverage = {
  summariesCreated: number;
  activeOwners: number;
  retiredOwners: number;
  staffSummaries: number;
  staffHandling: "empty-summary";
  totalSourceOwnerSeasonRecords: number;
  totalOwnerSeasonRecordsConsumed: number;
  recordsWithPlacement: number;
  recordsWithoutPlacement: number;
  missingFranchiseRecords: number;
  unresolvedHistoricalRecords: number;
  ownersWithMultipleFranchises: number;
  ownerIdsWithMultipleFranchises: string[];
  ownersWithCoOwnerSeasons: number;
  ownerIdsWithCoOwnerSeasons: string[];
  duplicateSummaryIds: string[];
  duplicateConsumedOwnerSeasonKeys: string[];
};

const OWNERSHIP_ROLE_ORDER: OwnershipRole[] = [
  OwnershipRole.Primary,
  OwnershipRole.CoOwner,
  OwnershipRole.LegacyOwner,
  OwnershipRole.Staff,
];

const EMPTY_FUTURE_ENRICHMENT: OwnerCareerFutureEnrichment = {
  regularSeasonRecord: null,
  playoffRecord: null,
  winningPercentage: null,
  playoffAppearances: null,
  pointsFor: null,
  pointsAgainst: null,
  careerWinnings: null,
  netEarnings: null,
  favoriteVictimOwnerId: null,
  nemesisOwnerId: null,
  mostPlayedOpponentOwnerId: null,
  statisticalRivalryOwnerId: null,
  draftPerformance: null,
  tradePerformance: null,
};

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((first, second) => first - second);
}

function countByKey(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return counts;
}

function getDuplicateValues(values: string[]) {
  return [...countByKey(values).entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort();
}

function dedupeOwnerSeasonRecords(records: OwnerSeasonHistoryRecord[]) {
  const recordsByKey = new Map<string, OwnerSeasonHistoryRecord>();

  records.forEach((record) => {
    if (!recordsByKey.has(record.ownerSeasonKey)) {
      recordsByKey.set(record.ownerSeasonKey, record);
    }
  });

  return [...recordsByKey.values()];
}

function getPlacementSummary(
  records: OwnerSeasonHistoryRecord[]
): OwnerCareerPlacementSummary {
  const knownPlacements = records.flatMap((record) =>
    record.finalPlacement === null ? [] : [record.finalPlacement]
  );
  const platformChampionships = records.filter(
    (record) => record.isPlatformChampion
  ).length;
  const historicalChampionships = records.filter(
    (record) => record.isHistoricalChampion
  ).length;
  const runnerUpFinishes = records.filter(
    (record) => record.isPlatformRunnerUp
  ).length;
  const thirdPlaceFinishes = records.filter(
    (record) => record.isThirdPlace
  ).length;

  return {
    platformChampionships,
    historicalChampionships,
    runnerUpFinishes,
    thirdPlaceFinishes,
    podiums: records.filter((record) => record.isPodium).length,
    bestFinish:
      knownPlacements.length > 0 ? Math.min(...knownPlacements) : null,
    worstFinish:
      knownPlacements.length > 0 ? Math.max(...knownPlacements) : null,
    averageFinish:
      knownPlacements.length > 0
        ? knownPlacements.reduce((sum, placement) => sum + placement, 0) /
          knownPlacements.length
        : null,
    lastPlaceFinishes: records.filter((record) => record.isLastPlace).length,
  };
}

function getSeasonSummary(
  records: OwnerSeasonHistoryRecord[]
): OwnerCareerSeasonSummary {
  const representedSeasons = uniqueNumbers(
    records.map((record) => record.season)
  );

  return {
    firstSeason: representedSeasons[0] ?? null,
    latestSeason: representedSeasons.at(-1) ?? null,
    seasonsRepresented: representedSeasons.length,
    seasonsWithKnownPlacement: uniqueNumbers(
      records.flatMap((record) =>
        record.finalPlacement === null ? [] : [record.season]
      )
    ).length,
    seasonsAsPrimaryOwner: uniqueNumbers(
      records.flatMap((record) =>
        record.ownershipRole === OwnershipRole.Primary ? [record.season] : []
      )
    ).length,
    seasonsAsCoOwner: uniqueNumbers(
      records.flatMap((record) =>
        record.ownershipRole === OwnershipRole.CoOwner ? [record.season] : []
      )
    ).length,
    seasonsAsLegacyOwner: uniqueNumbers(
      records.flatMap((record) =>
        record.ownershipRole === OwnershipRole.LegacyOwner
          ? [record.season]
          : []
      )
    ).length,
  };
}

function getFranchiseHistory(
  records: OwnerSeasonHistoryRecord[]
): OwnerCareerFranchiseSummary[] {
  const recordsByFranchise = new Map<string, OwnerSeasonHistoryRecord[]>();

  records.forEach((record) => {
    if (!record.franchiseId) return;

    const franchiseRecords =
      recordsByFranchise.get(record.franchiseId) ?? [];
    franchiseRecords.push(record);
    recordsByFranchise.set(record.franchiseId, franchiseRecords);
  });

  return [...recordsByFranchise.entries()]
    .map(([franchiseId, franchiseRecords]) => {
      const seasons = uniqueNumbers(
        franchiseRecords.map((record) => record.season)
      );
      const ownershipRoles = OWNERSHIP_ROLE_ORDER.filter((role) =>
        franchiseRecords.some((record) => record.ownershipRole === role)
      );
      const placements = getPlacementSummary(franchiseRecords);
      const latestRecord = [...franchiseRecords].sort(
        (first, second) =>
          second.season - first.season ||
          first.ownerSeasonKey.localeCompare(second.ownerSeasonKey)
      )[0];

      return {
        franchiseId,
        franchiseName: latestRecord?.franchiseName ?? null,
        firstSeason: seasons[0],
        latestSeason: seasons.at(-1) as number,
        seasonsRepresented: seasons.length,
        ownershipRoles,
        platformChampionships: placements.platformChampionships,
        historicalChampionships: placements.historicalChampionships,
        runnerUpFinishes: placements.runnerUpFinishes,
        thirdPlaceFinishes: placements.thirdPlaceFinishes,
        podiums: placements.podiums,
        lastPlaceFinishes: placements.lastPlaceFinishes,
      };
    })
    .sort(
      (first, second) =>
        second.latestSeason - first.latestSeason ||
        first.franchiseId.localeCompare(second.franchiseId)
    );
}

function getLatestFranchise(
  records: OwnerSeasonHistoryRecord[]
): OwnerCareerLatestFranchise | null {
  const latestRecord = records
    .filter((record) => record.franchiseId !== null)
    .sort(
      (first, second) =>
        second.season - first.season ||
        first.ownerSeasonKey.localeCompare(second.ownerSeasonKey)
    )[0];

  if (!latestRecord?.franchiseId) return null;

  return {
    franchiseId: latestRecord.franchiseId,
    franchiseName: latestRecord.franchiseName,
    season: latestRecord.season,
    ownershipRole: latestRecord.ownershipRole,
  };
}

function getCoverage(
  records: OwnerSeasonHistoryRecord[],
  sourceUnresolvedRecordsExcluded: number
): OwnerCareerCoverage {
  const recordsWithPlacement = records.filter(
    (record) => record.finalPlacement !== null
  ).length;
  const recordsWithoutPlacement = records.length - recordsWithPlacement;

  return {
    ownerSeasonRecords: records.length,
    recordsWithPlacement,
    recordsWithoutPlacement,
    placementCoverage:
      records.length > 0 ? recordsWithPlacement / records.length : null,
    recordsWithFranchise: records.filter(
      (record) => record.franchiseId !== null
    ).length,
    missingFranchiseRecords: records.filter(
      (record) => record.franchiseId === null
    ).length,
    unresolvedRecordsAttributed: 0,
    sourceUnresolvedRecordsExcluded,
  };
}

function getSummaryNotes(
  owner: OwnerProfile,
  coverage: OwnerCareerCoverage
) {
  const notes: string[] = [];

  if (coverage.ownerSeasonRecords === 0) {
    notes.push(
      owner.status === OwnerProfileStatus.Staff
        ? "Staff identity has no competitive owner-season records."
        : "No competitive owner-season records are currently available."
    );
  }

  if (coverage.recordsWithoutPlacement > 0) {
    notes.push(
      "One or more represented seasons do not have a known final placement."
    );
  }

  if (coverage.missingFranchiseRecords > 0) {
    notes.push(
      "One or more owner-season records do not have a resolved franchise assignment."
    );
  }

  return notes;
}

function buildOwnerSummary({
  owner,
  records,
  unresolvedRecordCount,
}: {
  owner: OwnerProfile;
  records: OwnerSeasonHistoryRecord[];
  unresolvedRecordCount: number;
}): OwnerCareerSummary {
  const dedupedRecords = dedupeOwnerSeasonRecords(records);
  const coverage = getCoverage(dedupedRecords, unresolvedRecordCount);

  return {
    summaryId: owner.id,
    ownerId: owner.id,
    ownerSlug: owner.slug,
    ownerName: owner.fullName,
    ownerStatus: owner.status,
    seasons: getSeasonSummary(dedupedRecords),
    placements: getPlacementSummary(dedupedRecords),
    latestFranchise: getLatestFranchise(dedupedRecords),
    franchiseHistory: getFranchiseHistory(dedupedRecords),
    futureEnrichment: { ...EMPTY_FUTURE_ENRICHMENT },
    coverage,
    notes: getSummaryNotes(owner, coverage),
  };
}

export function buildOwnerCareerSummaries(): OwnerCareerSummary[] {
  const allSeasonRecords = getAllOwnerSeasonHistory();
  const unresolvedRecordCount = allSeasonRecords.filter(
    (record) => record.ownerId === null
  ).length;
  const resolvedRecords = allSeasonRecords.filter(
    (record): record is OwnerSeasonHistoryRecord & { ownerId: string } =>
      record.ownerId !== null
  );

  return ownerProfiles
    .map((owner) =>
      buildOwnerSummary({
        owner,
        records: resolvedRecords.filter(
          (record) => record.ownerId === owner.id
        ),
        unresolvedRecordCount,
      })
    )
    .sort((first, second) => first.ownerName.localeCompare(second.ownerName));
}

const ownerCareerSummaries = buildOwnerCareerSummaries();

function cloneCareerSummary(summary: OwnerCareerSummary): OwnerCareerSummary {
  return {
    ...summary,
    seasons: { ...summary.seasons },
    placements: { ...summary.placements },
    latestFranchise: summary.latestFranchise
      ? { ...summary.latestFranchise }
      : null,
    franchiseHistory: summary.franchiseHistory.map((franchise) => ({
      ...franchise,
      ownershipRoles: [...franchise.ownershipRoles],
    })),
    futureEnrichment: {
      ...summary.futureEnrichment,
      regularSeasonRecord: summary.futureEnrichment.regularSeasonRecord
        ? { ...summary.futureEnrichment.regularSeasonRecord }
        : null,
      playoffRecord: summary.futureEnrichment.playoffRecord
        ? { ...summary.futureEnrichment.playoffRecord }
        : null,
    },
    coverage: { ...summary.coverage },
    notes: [...summary.notes],
  };
}

export function getAllOwnerCareerSummaries() {
  return ownerCareerSummaries.map(cloneCareerSummary);
}

export function getOwnerCareerSummary(ownerIdOrSlug: string) {
  const normalizedKey = ownerIdOrSlug.trim().toLowerCase();
  const summary = ownerCareerSummaries.find(
    (candidate) =>
      candidate.ownerId === normalizedKey ||
      candidate.ownerSlug === normalizedKey
  );

  return summary ? cloneCareerSummary(summary) : null;
}

export function getActiveOwnerCareerSummaries() {
  return ownerCareerSummaries
    .filter((summary) => summary.ownerStatus === OwnerProfileStatus.Active)
    .map(cloneCareerSummary);
}

export function getRetiredOwnerCareerSummaries() {
  return ownerCareerSummaries
    .filter((summary) => summary.ownerStatus === OwnerProfileStatus.Retired)
    .map(cloneCareerSummary);
}

export function getOwnerCareerSummaryCoverage(): OwnerCareerSummaryCoverage {
  const sourceRecords = getAllOwnerSeasonHistory();
  const unresolvedRecords = getUnresolvedOwnerSeasonHistory();
  const resolvedRecords = sourceRecords.filter(
    (record) => record.ownerId !== null
  );
  const summaries = getAllOwnerCareerSummaries();
  const ownerIdsWithMultipleFranchises = summaries
    .filter((summary) => summary.franchiseHistory.length > 1)
    .map((summary) => summary.ownerId)
    .sort();
  const ownerIdsWithCoOwnerSeasons = summaries
    .filter((summary) =>
      resolvedRecords.some(
        (record) =>
          record.ownerId === summary.ownerId && record.coOwners.length > 0
      )
    )
    .map((summary) => summary.ownerId)
    .sort();

  return {
    summariesCreated: summaries.length,
    activeOwners: summaries.filter(
      (summary) => summary.ownerStatus === OwnerProfileStatus.Active
    ).length,
    retiredOwners: summaries.filter(
      (summary) => summary.ownerStatus === OwnerProfileStatus.Retired
    ).length,
    staffSummaries: summaries.filter(
      (summary) => summary.ownerStatus === OwnerProfileStatus.Staff
    ).length,
    staffHandling: "empty-summary",
    totalSourceOwnerSeasonRecords: sourceRecords.length,
    totalOwnerSeasonRecordsConsumed: resolvedRecords.length,
    recordsWithPlacement: resolvedRecords.filter(
      (record) => record.finalPlacement !== null
    ).length,
    recordsWithoutPlacement: resolvedRecords.filter(
      (record) => record.finalPlacement === null
    ).length,
    missingFranchiseRecords: resolvedRecords.filter(
      (record) => record.franchiseId === null
    ).length,
    unresolvedHistoricalRecords: unresolvedRecords.length,
    ownersWithMultipleFranchises: ownerIdsWithMultipleFranchises.length,
    ownerIdsWithMultipleFranchises,
    ownersWithCoOwnerSeasons: ownerIdsWithCoOwnerSeasons.length,
    ownerIdsWithCoOwnerSeasons,
    duplicateSummaryIds: getDuplicateValues(
      summaries.map((summary) => summary.summaryId)
    ),
    duplicateConsumedOwnerSeasonKeys: getDuplicateValues(
      resolvedRecords.map((record) => record.ownerSeasonKey)
    ),
  };
}
