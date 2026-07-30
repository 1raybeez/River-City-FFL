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
  type OwnerCareerMatchupSummary,
} from "@/lib/history/ownerMatchupSummary";
import { getAllOwnerSeasonHistory } from "@/lib/history/ownerSeasonHistory";
import { ownerProfiles } from "@/lib/managers/identityData";

let initialization: Promise<void> | null = null;

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
