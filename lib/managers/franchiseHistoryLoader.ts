import "server-only";

import { acquireCanonicalMatchupInput } from "@/lib/history/canonicalMatchupAcquisition";
import { buildCanonicalMatchups } from "@/lib/history/canonicalMatchupHistory";
import {
  APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
  buildFranchiseHistories,
  getAllFranchiseHistories,
} from "@/lib/history/franchiseHistory";
import {
  applyFranchiseRosterMappings,
  getAllFranchiseRosterMappings,
} from "@/lib/history/franchiseRosterMappings";
import { getAllHistoricalSeasonResults } from "@/lib/history/historicalSeasonResults";
import { getAllOwnerSeasonHistory } from "@/lib/history/ownerSeasonHistory";
import {
  franchises,
  ownerProfiles,
  ownershipTenures,
} from "@/lib/managers/identityData";
import { getOwnerProfileBySlug } from "@/lib/managers/identitySelectors";
import { buildOwnerFranchiseLegacyPresentation } from "@/lib/managers/franchiseLegacyPresentation";

let initialization: Promise<void> | null = null;

function initializeFranchiseHistory() {
  if (initialization) return initialization;

  initialization = (async () => {
    const acquiredInput = await acquireCanonicalMatchupInput();
    const canonicalMatchups = buildCanonicalMatchups(
      applyFranchiseRosterMappings(acquiredInput)
    );

    buildFranchiseHistories({
      franchises,
      ownershipTenures,
      historicalSeasonResults: getAllHistoricalSeasonResults(),
      ownerSeasonRecords: getAllOwnerSeasonHistory(),
      canonicalMatchups,
      franchiseRosterMappings: getAllFranchiseRosterMappings(),
      statusOverrides: APPROVED_FRANCHISE_HISTORY_STATUS_OVERRIDES,
    });
  })();

  return initialization;
}

export async function loadOwnerFranchiseLegacy(ownerIdOrSlug: string) {
  const owner =
    ownerProfiles.find((candidate) => candidate.id === ownerIdOrSlug) ??
    getOwnerProfileBySlug(ownerIdOrSlug);
  if (!owner) return null;

  await initializeFranchiseHistory();
  return buildOwnerFranchiseLegacyPresentation({
    ownerId: owner.id,
    histories: getAllFranchiseHistories(),
    owners: ownerProfiles.map(({ id, fullName, status }) => ({
      id,
      fullName,
      status,
    })),
  });
}
