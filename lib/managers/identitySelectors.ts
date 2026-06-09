import {
  franchisesById,
  franchiseStatSummaries,
  leagueServiceTenures,
  ownerProfiles,
  ownerProfilesById,
  ownershipTenures,
} from "@/lib/managers/identityData";
import {
  AccomplishmentAttribution,
  ManagerLandingGroup,
  OwnershipRole,
  type Franchise,
  type FranchiseStatSummary,
  type LeagueServiceTenure,
  type OwnerProfile,
  type OwnershipTenure,
} from "@/lib/managers/identityTypes";

const CURRENT_SEASON = 2026;

export type ProfileTenure = OwnershipTenure & {
  franchise?: Franchise;
  roleLabel: string;
  yearLabel: string;
  relatedOwnerLabels: string[];
  statSummary?: FranchiseStatSummary;
};

export type ProfileTimelineItem = {
  year: string;
  title: string;
  detail?: string;
};

export type ProfileRelationship = {
  ownerId: string;
  fullName: string;
  roleLabel: string;
  detail: string;
  franchiseName: string;
  href?: string;
};

export type OwnerProfileViewModel = {
  owner: OwnerProfile;
  heroFranchise?: Franchise;
  currentFranchises: Franchise[];
  legacyFranchises: Franchise[];
  currentTenures: ProfileTenure[];
  legacyTenures: ProfileTenure[];
  statSummaries: FranchiseStatSummary[];
  statusLabel: string;
  primaryTeamLabel: string;
  coOwnerDisplay: ProfileRelationship[];
  rivalProfilePath?: string;
  yearsActiveLabel: string;
  timeline: ProfileTimelineItem[];
};

const ownerProfilesBySlug: Record<string, OwnerProfile> = Object.fromEntries(
  ownerProfiles.map((owner) => [owner.slug, owner])
);

function getOwnerName(ownerId: string) {
  return ownerProfilesById[ownerId]?.fullName ?? ownerId;
}

function formatOwnerList(ownerIds: string[]) {
  if (ownerIds.length === 0) return "";
  if (ownerIds.length === 1) return getOwnerName(ownerIds[0]);

  return `${ownerIds.slice(0, -1).map(getOwnerName).join(", ")} and ${getOwnerName(
    ownerIds[ownerIds.length - 1]
  )}`;
}

function formatRole(role: OwnershipRole) {
  if (role === OwnershipRole.Primary) return "Primary Owner";
  if (role === OwnershipRole.CoOwner) return "Co-owner";
  if (role === OwnershipRole.LegacyOwner) return "Retired Owner Legacy";
  return "League Staff";
}

function formatRoleForTenure(tenure: OwnershipTenure) {
  if (tenure.role === OwnershipRole.LegacyOwner) {
    return "Owner";
  }

  return formatRole(tenure.role);
}

function getOwnerProfilePath(ownerId: string) {
  const owner = ownerProfilesById[ownerId];
  return owner ? `/managers/owners/${owner.slug}` : undefined;
}

function formatTenureYears(tenure: OwnershipTenure) {
  if (tenure.startLabel) return tenure.startLabel;
  if (tenure.isActive) return `${tenure.startSeason}-present`;
  if (tenure.endLabel) {
    return tenure.endLabel === `${tenure.startSeason}`
      ? `${tenure.startSeason}`
      : `${tenure.startSeason}-${tenure.endLabel}`;
  }
  if (tenure.endSeason) {
    return tenure.endSeason === tenure.startSeason
      ? `${tenure.startSeason}`
      : `${tenure.startSeason}-${tenure.endSeason}`;
  }
  return `${tenure.startSeason}`;
}

function getStatSummaryForOwnerAndFranchise(
  ownerId: string,
  franchiseId: string
) {
  return franchiseStatSummaries.find(
    (summary) =>
      summary.franchiseId === franchiseId &&
      (summary.attributedOwnerIds.includes(ownerId) ||
        summary.sharedByOwnerIds.includes(ownerId))
  );
}

function getOwnerStatSummaries(ownerId: string) {
  return franchiseStatSummaries.filter(
    (summary) =>
      summary.attributedOwnerIds.includes(ownerId) ||
      summary.sharedByOwnerIds.includes(ownerId)
  );
}

function buildRelatedOwnerLabels(ownerId: string, franchise?: Franchise) {
  if (!franchise) return [];

  const labels: string[] = [];

  if (ownerId === "jordan-maslyn" && franchise.id === "shake-n-bakers") {
    labels.push("Primary owner");
    return labels;
  }

  const otherCoOwners = franchise.coOwnerIds.filter((id) => id !== ownerId);
  const otherPrimaryOwners = franchise.primaryOwnerIds.filter(
    (id) => id !== ownerId
  );

  if (franchise.primaryOwnerIds.includes(ownerId)) {
    labels.push("Primary owner");
    if (otherCoOwners.length > 0) {
      labels.push(`Co-owner: ${formatOwnerList(otherCoOwners)}`);
    }
  } else if (franchise.coOwnerIds.includes(ownerId)) {
    if (otherPrimaryOwners.length > 0) {
      labels.push(`Co-owner with ${formatOwnerList(otherPrimaryOwners)}`);
    } else if (otherCoOwners.length > 0) {
      labels.push(`Co-owner: ${formatOwnerList(otherCoOwners)}`);
    } else {
      labels.push("Co-owner");
    }
  } else if (franchise.legacyOwnerIds.includes(ownerId)) {
    labels.push("Retired owner legacy");
  }

  return labels;
}

function getRelationshipTiming(franchiseId: string) {
  if (franchiseId === "prestigio-mundial") return "Co-owners since 2013";
  if (franchiseId === "shake-n-bakers") return "Co-owner since 2025";
  return "Current ownership relationship";
}

function buildCoOwnerRelationships(
  ownerId: string,
  currentTenures: ProfileTenure[]
) {
  const relationships = new Map<string, ProfileRelationship>();

  currentTenures.forEach((tenure) => {
    const franchise = tenure.franchise;
    if (!franchise) return;

    const franchiseName = franchise.currentTeamName;
    const addRelationship = (relatedOwnerId: string, roleLabel: string) => {
      const relatedOwner = ownerProfilesById[relatedOwnerId];
      if (!relatedOwner) return;

      relationships.set(`${tenure.franchiseId}-${relatedOwnerId}`, {
        ownerId: relatedOwnerId,
        fullName: relatedOwner.fullName,
        roleLabel,
        detail: getRelationshipTiming(tenure.franchiseId),
        franchiseName,
        href: getOwnerProfilePath(relatedOwnerId),
      });
    };

    if (franchise.primaryOwnerIds.includes(ownerId)) {
      franchise.coOwnerIds
        .filter((relatedOwnerId) => relatedOwnerId !== ownerId)
        .forEach((relatedOwnerId) => addRelationship(relatedOwnerId, "Co-owner"));
      return;
    }

    if (franchise.coOwnerIds.includes(ownerId)) {
      franchise.primaryOwnerIds
        .filter((relatedOwnerId) => relatedOwnerId !== ownerId)
        .forEach((relatedOwnerId) =>
          addRelationship(relatedOwnerId, "Primary owner")
        );

      franchise.coOwnerIds
        .filter((relatedOwnerId) => relatedOwnerId !== ownerId)
        .forEach((relatedOwnerId) => addRelationship(relatedOwnerId, "Co-owner"));
    }
  });

  return Array.from(relationships.values());
}

function buildProfileTenure(ownerId: string, tenure: OwnershipTenure) {
  const franchise = franchisesById[tenure.franchiseId];

  return {
    ...tenure,
    franchise,
    roleLabel: formatRoleForTenure(tenure),
    yearLabel: formatTenureYears(tenure),
    relatedOwnerLabels: buildRelatedOwnerLabels(ownerId, franchise),
    statSummary: getStatSummaryForOwnerAndFranchise(
      ownerId,
      tenure.franchiseId
    ),
  };
}

function getStatusLabel(owner: OwnerProfile, currentTenures: ProfileTenure[]) {
  const hasRetiredLegacy = owner.landingGroups.includes(
    ManagerLandingGroup.RetiredOwners
  );
  const hasCurrentCoOwnerRole = currentTenures.some(
    (tenure) => tenure.role === OwnershipRole.CoOwner
  );
  const hasCurrentPrimaryRole = currentTenures.some(
    (tenure) => tenure.role === OwnershipRole.Primary
  );

  if (owner.status === "staff") return "League Staff";
  if (hasCurrentCoOwnerRole && hasRetiredLegacy) {
    return "Active Co-owner / Retired Owner Legacy";
  }
  if (hasCurrentCoOwnerRole) return "Active Co-owner";
  if (hasCurrentPrimaryRole) return "Active Owner";
  if (hasRetiredLegacy) return "Retired Owner";
  return "Owner";
}

function formatSeasonRange(startSeason: number, endSeason: number) {
  return startSeason === endSeason
    ? `${startSeason}`
    : `${startSeason}-${endSeason}`;
}

function formatServiceYears(service: LeagueServiceTenure) {
  if (service.isActive) return `${service.startSeason}-present`;
  if (service.endSeason) {
    return formatSeasonRange(service.startSeason, service.endSeason);
  }
  return `${service.startSeason}`;
}

function getYearsActiveLabel(owner: OwnerProfile, tenures: ProfileTenure[]) {
  if (tenures.length === 0) return "N/A";

  if (owner.id === "ray-long") {
    const seasons = 1 + (CURRENT_SEASON - 2013 + 1);
    return `2011, 2013-present (${seasons} seasons)`;
  }

  const startSeason = Math.min(...tenures.map((tenure) => tenure.startSeason));
  const active = tenures.some((tenure) => tenure.isActive);
  const formatSeasonCount = (endSeason: number) => {
    const seasons = Math.max(1, endSeason - startSeason + 1);
    return `${seasons} season${seasons === 1 ? "" : "s"}`;
  };

  if (active) {
    return `${startSeason}-present (${formatSeasonCount(CURRENT_SEASON)})`;
  }

  const endSeasons = tenures
    .map((tenure) => tenure.endSeason)
    .filter((season): season is number => typeof season === "number");

  if (endSeasons.length > 0) {
    const endSeason = Math.max(...endSeasons);
    return `${formatSeasonRange(startSeason, endSeason)} (${formatSeasonCount(
      endSeason
    )})`;
  }
  return `${startSeason}`;
}

function buildTimeline(
  owner: OwnerProfile,
  tenures: ProfileTenure[],
  statSummaries: FranchiseStatSummary[]
) {
  const items: ProfileTimelineItem[] = [];

  if (owner.fantasyStart) {
    items.push({
      year: `${owner.fantasyStart}`,
      title: "Fantasy era begins",
      detail: `${owner.shortName} started playing fantasy football.`,
    });
  }

  if (owner.id === "ray-long") {
    items.push({
      year: "2012",
      title: "Season away from league",
      detail: "Ray took off 2012 before rejoining in 2013.",
    });
  }

  tenures.forEach((tenure) => {
    const franchiseName = tenure.franchise?.currentTeamName ?? tenure.franchiseId;

    if (owner.id === "landon-elliott" && tenure.franchiseId === "special-brownies") {
      items.push({
        year: tenure.startLabel ?? `${tenure.startSeason}`,
        title: "Special Brownies ownership begins",
        detail: "Active owner through the 2024 season.",
      });

      items.push({
        year: tenure.endLabel ?? `${tenure.endSeason ?? 2024}`,
        title: "Final season as Special Brownies owner",
        detail: "Retired Owner legacy begins after 2024.",
      });
      return;
    }

    if (owner.id === "landon-elliott" && tenure.franchiseId === "shake-n-bakers") {
      items.push({
        year: tenure.startLabel ?? `${tenure.startSeason}`,
        title: "Joins The Shake-N-Bakers as co-owner",
        detail: tenure.relatedOwnerLabels.join(" | ") || undefined,
      });
      return;
    }

    items.push({
      year: tenure.startLabel ?? `${tenure.startSeason}`,
      title: `${tenure.roleLabel} of ${franchiseName}`,
      detail: tenure.relatedOwnerLabels.join(" | ") || undefined,
    });

    if (tenure.endSeason || tenure.endLabel) {
      items.push({
        year: tenure.endLabel ?? `${tenure.endSeason}`,
        title: `${franchiseName} legacy archived`,
        detail: tenure.showUnderRetiredOwners
          ? "Shown under Retired Owners."
          : undefined,
      });
    }
  });

  if (owner.id === "jordan-maslyn") {
    items.push({
      year: "2025",
      title: "Landon Elliott joins as co-owner",
      detail: "Jordan remains primary owner of The Shake-N-Bakers.",
    });
  }

  const ownerServiceTenures = leagueServiceTenures.filter(
    (service) => service.ownerId === owner.id
  );

  ownerServiceTenures.forEach((service) => {
    items.push({
      year: formatServiceYears(service),
      title: service.title,
      detail: service.notes?.[0] ?? "League service.",
    });
  });

  statSummaries.forEach((summary) => {
    const franchise = franchisesById[summary.franchiseId];
    const franchiseName = franchise?.currentTeamName ?? summary.franchiseId;

    if (summary.championships > 0) {
      items.push({
        year: "Career",
        title: `${summary.championships} championship${summary.championships === 1 ? "" : "s"}`,
        detail: franchiseName,
      });
    }

    if (summary.podiums > 0) {
      items.push({
        year: "Career",
        title: `${summary.podiums} podium finish${summary.podiums === 1 ? "" : "es"}`,
        detail:
          summary.accomplishmentAttribution ===
          AccomplishmentAttribution.SharedFranchise
            ? `${franchiseName} shared franchise record.`
            : franchiseName,
      });
    }
  });

  const serviceTitles = new Set(
    ownerServiceTenures.map((service) => service.title)
  );

  owner.roles
    .filter((role) => !serviceTitles.has(role))
    .forEach((role) => {
      items.push({
        year: "League",
        title: role,
        detail: "League contribution on file.",
      });
    });

  return items.sort((a, b) => {
    const aYear = Number.parseInt(a.year, 10);
    const bYear = Number.parseInt(b.year, 10);

    if (Number.isNaN(aYear) && Number.isNaN(bYear)) return 0;
    if (Number.isNaN(aYear)) return 1;
    if (Number.isNaN(bYear)) return -1;
    return aYear - bYear;
  });
}

function getPrimaryTeamLabel(
  heroFranchise: Franchise | undefined,
  profileTenures: ProfileTenure[]
) {
  if (heroFranchise) return heroFranchise.currentTeamName;

  const firstFranchise = profileTenures.find((tenure) => tenure.franchise)
    ?.franchise;

  return firstFranchise?.currentTeamName ?? "River City FFL";
}

export function getOwnerProfileBySlug(slug: string) {
  return ownerProfilesBySlug[slug];
}

export function getOwnerSlugByFullName(fullName: string) {
  return ownerProfiles.find((owner) => owner.fullName === fullName)?.slug;
}

export function getOwnerProfilePathByFullName(fullName: string) {
  const slug = getOwnerSlugByFullName(fullName);
  return slug ? `/managers/owners/${slug}` : undefined;
}

export function getOwnerCurrentTeamNameByFullName(fullName: string) {
  const slug = getOwnerSlugByFullName(fullName);
  if (!slug) return undefined;

  return getOwnerProfileViewModelBySlug(slug)?.primaryTeamLabel;
}

export function getOwnerProfileStaticParams() {
  return ownerProfiles.map((owner) => ({ slug: owner.slug }));
}

export function getOwnerProfileViewModelBySlug(
  slug: string
): OwnerProfileViewModel | undefined {
  const owner = getOwnerProfileBySlug(slug);
  if (!owner) return undefined;

  const tenures = ownershipTenures
    .filter((tenure) => tenure.ownerId === owner.id)
    .map((tenure) => buildProfileTenure(owner.id, tenure));

  const currentTenures = tenures.filter((tenure) => tenure.isActive);
  const legacyTenures = tenures.filter((tenure) => !tenure.isActive);
  const currentFranchises = owner.currentFranchiseIds
    .map((franchiseId) => franchisesById[franchiseId])
    .filter((franchise): franchise is Franchise => Boolean(franchise));
  const legacyFranchises = owner.legacyFranchiseIds
    .map((franchiseId) => franchisesById[franchiseId])
    .filter((franchise): franchise is Franchise => Boolean(franchise));
  const statSummaries = getOwnerStatSummaries(owner.id);
  const heroFranchise = currentFranchises[0] ?? legacyFranchises[0];
  const rivalProfilePath = owner.survey.rivalOwnerId
    ? getOwnerProfilePath(owner.survey.rivalOwnerId)
    : undefined;

  return {
    owner,
    heroFranchise,
    currentFranchises,
    legacyFranchises,
    currentTenures,
    legacyTenures,
    statSummaries,
    statusLabel: getStatusLabel(owner, currentTenures),
    primaryTeamLabel: getPrimaryTeamLabel(heroFranchise, tenures),
    coOwnerDisplay: buildCoOwnerRelationships(owner.id, currentTenures),
    rivalProfilePath,
    yearsActiveLabel: getYearsActiveLabel(owner, tenures),
    timeline: buildTimeline(owner, tenures, statSummaries),
  };
}
