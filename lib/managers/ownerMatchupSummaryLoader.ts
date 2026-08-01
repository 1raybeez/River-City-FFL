import "server-only";

import { applyFranchiseRosterMappings } from "@/lib/history/franchiseRosterMappings";
import { acquireCanonicalMatchupInput } from "@/lib/history/canonicalMatchupAcquisition";
import { buildCanonicalMatchups } from "@/lib/history/canonicalMatchupHistory";
import {
  buildOwnerMatchupProjections,
  getOwnerMatchupProjectionCoverage,
} from "@/lib/history/ownerMatchupProjection";
import {
  buildOwnerMatchupSummaries,
  getOwnerCareerMatchupSummary,
  getOwnerOpponentMatchupSummaries,
  getOwnerSeasonMatchupSummaries,
  type OwnerCareerMatchupSummary,
  type OwnerOpponentMatchupSummary,
  type OwnerSeasonMatchupSummary,
} from "@/lib/history/ownerMatchupSummary";
import {
  getAllOwnerSeasonHistory,
  getOwnerSeasonHistory,
  type OwnerSeasonHistoryRecord,
} from "@/lib/history/ownerSeasonHistory";
import { ownerProfiles } from "@/lib/managers/identityData";

let initialization: Promise<void> | null = null;

export type OwnerProfileSeasonHistoryEntry = Readonly<{
  season: number;
  ownerId: string;
  ownerSeason: OwnerSeasonHistoryRecord | null;
  matchupSummary: OwnerSeasonMatchupSummary | null;
}>;

function initializeOwnerMatchupSummaries() {
  if (initialization) return initialization;

  initialization = (async () => {
    const acquiredInput = await acquireCanonicalMatchupInput();
    const canonicalMatchups = buildCanonicalMatchups(
      applyFranchiseRosterMappings(acquiredInput)
    );
    const ownerSeasonRecords = getAllOwnerSeasonHistory();
    const projections = buildOwnerMatchupProjections({
      canonicalMatchups,
      ownerSeasonRecords,
    });

    buildOwnerMatchupSummaries({
      projections,
      ownerSeasonRecords,
      ownerProfiles: ownerProfiles.map(({ id, slug, status }) => ({
        id,
        slug,
        status,
      })),
      projectionCoverage: getOwnerMatchupProjectionCoverage(),
    });
  })();

  return initialization;
}

export async function loadOwnerCareerMatchupSummary(
  ownerIdOrSlug: string
): Promise<OwnerCareerMatchupSummary | null> {
  await initializeOwnerMatchupSummaries();
  return getOwnerCareerMatchupSummary(ownerIdOrSlug);
}

export async function loadOwnerSeasonMatchupSummaries(
  ownerIdOrSlug: string
): Promise<readonly OwnerSeasonMatchupSummary[]> {
  await initializeOwnerMatchupSummaries();
  return getOwnerSeasonMatchupSummaries(ownerIdOrSlug);
}

export async function loadOwnerProfileSeasonHistory(
  ownerIdOrSlug: string
): Promise<readonly OwnerProfileSeasonHistoryEntry[]> {
  await initializeOwnerMatchupSummaries();

  const seasonResults = getOwnerSeasonHistory(ownerIdOrSlug);
  const matchupSummaries = getOwnerSeasonMatchupSummaries(ownerIdOrSlug);
  const canonicalOwnerIds = new Set([
    ...seasonResults.flatMap((record) =>
      record.ownerId === null ? [] : [record.ownerId]
    ),
    ...matchupSummaries.map((summary) => summary.ownerId),
  ]);

  if (canonicalOwnerIds.size === 0) return [];
  if (canonicalOwnerIds.size > 1) {
    throw new Error(
      `Season history resolved ${ownerIdOrSlug} to multiple canonical owners.`
    );
  }

  const ownerId = [...canonicalOwnerIds][0];
  const resultsBySeason = new Map<number, OwnerSeasonHistoryRecord>();
  seasonResults.forEach((record) => {
    if (record.ownerId !== ownerId) return;
    if (resultsBySeason.has(record.season)) {
      throw new Error(
        `Owner ${ownerId} has multiple season-result records for ${record.season}.`
      );
    }
    resultsBySeason.set(record.season, record);
  });
  const matchupsBySeason = new Map(
    matchupSummaries.map((summary) => [summary.season, summary])
  );
  const seasons = [
    ...new Set([...resultsBySeason.keys(), ...matchupsBySeason.keys()]),
  ].sort((first, second) => first - second);

  return seasons.map((season) => ({
    season,
    ownerId,
    ownerSeason: resultsBySeason.get(season) ?? null,
    matchupSummary: matchupsBySeason.get(season) ?? null,
  }));
}

export async function loadOwnerOpponentMatchupSummaries(
  ownerIdOrSlug: string
): Promise<readonly OwnerOpponentMatchupSummary[]> {
  await initializeOwnerMatchupSummaries();
  return getOwnerOpponentMatchupSummaries(ownerIdOrSlug);
}
