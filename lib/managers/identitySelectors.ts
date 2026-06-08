import {
  franchisesById,
  franchiseStatSummaries,
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
  coOwnerDisplay: string[];
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

function formatTenureYears(tenure: OwnershipTenure) {
  if (tenure.startLabel) return tenure.startLabel;
  if (tenure.isActive) return `${tenure.startSeason}-present`;
  if (tenure.endLabel) return `${tenure.startSeason}-${tenure.endLabel}`;
  if (tenure.endSeason) return `${tenure.startSeason}-${tenure.endSeason}`;
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

function buildProfileTenure(ownerId: string, tenure: OwnershipTenure) {
  const franchise = franchisesById[tenure.franchiseId];

  return {
    ...tenure,
    franchise,
    roleLabel: formatRole(tenure.role),
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

function getYearsActiveLabel(tenures: ProfileTenure[]) {
  if (tenures.length === 0) return "N/A";

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
    return `${startSeason}-${endSeason} (${formatSeasonCount(endSeason)})`;
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

  tenures.forEach((tenure) => {
    const franchiseName = tenure.franchise?.currentTeamName ?? tenure.franchiseId;

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

  owner.roles.forEach((role) => {
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
    coOwnerDisplay: currentTenures.flatMap((tenure) => tenure.relatedOwnerLabels),
    yearsActiveLabel: getYearsActiveLabel(tenures),
    timeline: buildTimeline(owner, tenures, statSummaries),
  };
}
