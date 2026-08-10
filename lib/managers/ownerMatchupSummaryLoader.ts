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
  buildOwnerHeadToHeadDetails,
  getAllSupportedDirectionalHeadToHeadPairs,
} from "@/lib/history/ownerHeadToHeadDetail";
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

export function initializeOwnerMatchupHistory() {
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

    const summaryBuild = buildOwnerMatchupSummaries({
      projections,
      ownerSeasonRecords,
      ownerProfiles: ownerProfiles.map(({ id, slug, status }) => ({
        id,
        slug,
        status,
      })),
      projectionCoverage: getOwnerMatchupProjectionCoverage(),
    });

    buildOwnerHeadToHeadDetails({
      canonicalMatchups,
      projections,
      opponentSummaries: summaryBuild.opponentSummaries,
      careerSummaries: summaryBuild.careerSummaries,
      seasonSummaries: summaryBuild.seasonSummaries,
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
  await initializeOwnerMatchupHistory();
  return getOwnerCareerMatchupSummary(ownerIdOrSlug);
}

export async function loadOwnerSeasonMatchupSummaries(
  ownerIdOrSlug: string
): Promise<readonly OwnerSeasonMatchupSummary[]> {
  await initializeOwnerMatchupHistory();
  return getOwnerSeasonMatchupSummaries(ownerIdOrSlug);
}

export async function loadOwnerProfileSeasonHistory(
  ownerIdOrSlug: string
): Promise<readonly OwnerProfileSeasonHistoryEntry[]> {
  await initializeOwnerMatchupHistory();

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
  await initializeOwnerMatchupHistory();
  return getOwnerOpponentMatchupSummaries(ownerIdOrSlug);
}

export async function loadSupportedOwnerHeadToHeadOpponentIds(
  ownerIdOrSlug: string
): Promise<readonly string[]> {
  await initializeOwnerMatchupHistory();
  const normalized = ownerIdOrSlug.trim().toLowerCase();
  const ownerId =
    ownerProfiles.find(
      (profile) =>
        profile.id.toLowerCase() === normalized ||
        profile.slug.toLowerCase() === normalized
    )?.id ?? null;
  if (!ownerId) return [];

  return Object.freeze(
    getAllSupportedDirectionalHeadToHeadPairs()
      .filter((detail) => detail.ownerId === ownerId)
      .map((detail) => detail.opponentOwnerId)
      .sort()
  );
}
