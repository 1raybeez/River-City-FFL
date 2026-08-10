import "server-only";

import {
  buildRivalries,
  getAllRivalries,
  getRecognizedRivalries,
  getRivalryBuildCoverage,
  getRivalryScoreMethodology,
  getTopRivalries,
} from "@/lib/history/rivalryHistory";
import { ownerProfiles } from "@/lib/managers/identityData";
import { getOwnerProfileViewModelBySlug } from "@/lib/managers/identitySelectors";
import { initializeOwnerMatchupHistory } from "@/lib/managers/ownerMatchupSummaryLoader";
import {
  buildRivalryHubPresentation,
  type RivalryHubPresentation,
} from "@/lib/managers/rivalryHubPresentation";

let hubInitialization: Promise<RivalryHubPresentation> | null = null;

export function loadRivalryHubPresentation() {
  if (hubInitialization) return hubInitialization;

  hubInitialization = (async () => {
    const headToHeadBuild = await initializeOwnerMatchupHistory();

    buildRivalries({
      headToHeadDetails: headToHeadBuild.details,
      headToHeadMeetings: headToHeadBuild.meetings,
      ownerProfiles: ownerProfiles.map(({ id, slug, status }) => ({
        id,
        slug,
        status,
      })),
    });

    return buildRivalryHubPresentation({
      rivalries: getAllRivalries(),
      topRivalries: getTopRivalries(),
      recognizedRivalries: getRecognizedRivalries(),
      methodology: getRivalryScoreMethodology(),
      buildCoverage: getRivalryBuildCoverage(),
      ownerDisplays: ownerProfiles.map((owner) => ({
        ownerId: owner.id,
        slug: owner.slug,
        fullName: owner.fullName,
        shortName: owner.shortName,
        photo: owner.photo,
        teamName:
          getOwnerProfileViewModelBySlug(owner.slug)?.primaryTeamLabel ??
          "River City FFL",
        status: owner.status,
      })),
      headToHeadDetails: headToHeadBuild.details,
    });
  })();

  return hubInitialization;
}
