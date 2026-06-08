import { activeManagers } from "@/lib/managers/activeManagers";
import { retiredManagers } from "@/lib/managers/retiredManagers";
import { staffManagers } from "@/lib/managers/staff";
import { RETIRED_TRADE_SCORES } from "@/lib/tradeScores";
import type {
  DraftPreference,
  TeamCode,
  ValuePosition,
} from "@/lib/types/Manager";
import {
  AccomplishmentAttribution,
  FranchiseStatus,
  ManagerLandingGroup,
  OwnerProfileStatus,
  OwnershipRole,
  type Franchise,
  type FranchiseStatSummary,
  type OwnerProfile,
  type OwnerSurveyProfile,
  type OwnershipTenure,
} from "@/lib/managers/identityTypes";

type RawManagerRecord =
  | (typeof activeManagers)[number]
  | (typeof retiredManagers)[number]
  | (typeof staffManagers)[number];

type OwnerProfileOverride = Omit<
  Partial<OwnerProfile>,
  "landingGroups" | "roles" | "sleeperIds" | "survey" | "notes"
> & {
  landingGroups?: ManagerLandingGroup[];
  roles?: string[];
  sleeperIds?: string[];
  survey?: Partial<OwnerSurveyProfile>;
  notes?: string[];
};

const FRANCHISE_ID_OVERRIDES: Record<string, string> = {
  "Prestigio Mundial": "prestigio-mundial",
  "The Shake-N-Bakers": "shake-n-bakers",
  "Special Brownies": "special-brownies",
};

const JEFFREY_SLEEPER_ID = "356621920969555968";
const LANDON_SHAKE_START_SEASON = 2025;

const rawManagerRecords: RawManagerRecord[] = [
  ...activeManagers,
  ...retiredManagers,
  ...staffManagers,
];

const fullNameByShortName = new Map<string, string>(
  rawManagerRecords.map((manager) => [manager.shortName, manager.fullName])
);
fullNameByShortName.set("Jeffrey", "Jeffrey Hudgins");

const FAVORITE_PLAYER_NAMES: Record<number, string> = {
  254: "Darrelle Revis",
  1181: "Luke Kuechly",
  3973: "Myles Garrett",
  4073: "Taco Charlton",
  4137: "James Conner",
  5991: "Maxx Crosby",
  6794: "Justin Jefferson",
  8161: "Malik Willis",
  9509: "Bijan Robinson",
  12481: "Cam Skattebo",
  12508: "Jaxson Dart",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ownerIdFromName(fullName: string) {
  return slugify(fullName);
}

function ownerIdFromShortName(shortName: string) {
  const fullName = fullNameByShortName.get(shortName);
  return fullName ? ownerIdFromName(fullName) : undefined;
}

function franchiseIdFromTeamName(teamName: string) {
  return FRANCHISE_ID_OVERRIDES[teamName] ?? slugify(teamName);
}

function asRecord(manager: RawManagerRecord) {
  return manager as unknown as Record<string, unknown>;
}

function getString(manager: RawManagerRecord, key: string) {
  const value = asRecord(manager)[key];
  return typeof value === "string" ? value : undefined;
}

function getNumber(manager: RawManagerRecord, key: string) {
  const value = asRecord(manager)[key];
  return typeof value === "number" ? value : undefined;
}

function getNullableString(manager: RawManagerRecord, key: string) {
  const value = asRecord(manager)[key];
  return typeof value === "string" ? value : null;
}

function getRivalName(manager: RawManagerRecord) {
  const rival = asRecord(manager).rival;

  if (!rival || typeof rival !== "object") return undefined;

  const name = (rival as Record<string, unknown>).name;
  return typeof name === "string" ? name : undefined;
}

function getRivalImage(manager: RawManagerRecord) {
  const rival = asRecord(manager).rival;

  if (!rival || typeof rival !== "object") return undefined;

  const image = (rival as Record<string, unknown>).image;
  return typeof image === "string" ? image : undefined;
}

function getStartSeason(manager: RawManagerRecord) {
  return getNumber(manager, "tookOver") ?? getNumber(manager, "fantasyStart") ?? 2011;
}

function buildSurveyProfile(manager: RawManagerRecord): OwnerSurveyProfile {
  const rivalName = getRivalName(manager);
  const favoritePlayerId = getNumber(manager, "favoritePlayer");
  const tradeAggression =
    getNumber(manager, "tradeAggression") ??
    RETIRED_TRADE_SCORES[manager.fullName];

  return {
    surveyComplete: Boolean(
      manager.bio ||
        manager.philosophy ||
        getString(manager, "favoriteTeam") ||
        getNumber(manager, "favoritePlayer")
    ),
    bio: manager.bio,
    philosophy: manager.philosophy,
    favoriteNflTeam: getString(manager, "favoriteTeam") as TeamCode | undefined,
    favoritePlayerId,
    favoritePlayerName: favoritePlayerId
      ? FAVORITE_PLAYER_NAMES[favoritePlayerId]
      : undefined,
    rivalOwnerId: rivalName ? ownerIdFromShortName(rivalName) : undefined,
    rivalName,
    rivalImage: getRivalImage(manager),
    valuePosition: getString(manager, "valuePosition") as ValuePosition | undefined,
    draftPreference: getString(manager, "rookieOrVets") as
      | DraftPreference
      | undefined,
    teamBuildingMode: getString(manager, "mode"),
    tradeAggression,
    preferredContact: getString(manager, "preferredContact"),
  };
}

function buildOwnerProfile(
  manager: RawManagerRecord,
  status: OwnerProfileStatus,
  landingGroups: ManagerLandingGroup[]
): OwnerProfile {
  const id = ownerIdFromName(manager.fullName);
  const role = getString(manager, "role");
  const franchiseId = franchiseIdFromTeamName(manager.teamName);

  return {
    id,
    slug: id,
    fullName: manager.fullName,
    shortName: manager.shortName,
    status,
    photo: getNullableString(manager, "photo"),
    sleeperIds: getString(manager, "sleeperId")
      ? [getString(manager, "sleeperId") as string]
      : [],
    location: getString(manager, "location"),
    fantasyStart: getNumber(manager, "fantasyStart"),
    roles: role ? [role] : [],
    landingGroups,
    currentFranchiseIds:
      status === OwnerProfileStatus.Active ? [franchiseId] : [],
    legacyFranchiseIds:
      status === OwnerProfileStatus.Retired ? [franchiseId] : [],
    survey: buildSurveyProfile(manager),
  };
}

const jeffreyOwnerProfile: OwnerProfile = {
  id: "jeffrey-hudgins",
  slug: "jeffrey-hudgins",
  fullName: "Jeffrey Hudgins",
  shortName: "Jeffrey",
  status: OwnerProfileStatus.Active,
  photo: "/managers/Jeffrey.png",
  sleeperIds: [JEFFREY_SLEEPER_ID],
  fantasyStart: 2011,
  roles: [],
  landingGroups: [ManagerLandingGroup.Active],
  currentFranchiseIds: ["prestigio-mundial"],
  legacyFranchiseIds: [],
  survey: {
    surveyComplete: true,
    favoriteNflTeam: "SF" as TeamCode,
  },
  notes: [
    "Jeffrey completed the owner survey and should receive a personal owner profile/story.",
    "Prestigio Mundial stats remain shared with Ray Long instead of copied into a separate Jeffrey-only record.",
  ],
};

const OWNER_PROFILE_OVERRIDES: Record<string, OwnerProfileOverride> = {
  "ray-long": {
    currentFranchiseIds: ["prestigio-mundial"],
    survey: {
      favoriteNflTeam: "ATL" as TeamCode,
    },
    notes: [
      "Ray has co-owned Prestigio Mundial with Jeffrey Hudgins for the full history of the franchise.",
      "Ray's favorite NFL team is the Atlanta Falcons.",
    ],
  },
  "jordan-maslyn": {
    currentFranchiseIds: ["shake-n-bakers"],
    notes: [
      "Jordan is the primary owner of The Shake-N-Bakers.",
      "Landon Elliott's Special Brownies legacy should not be merged into Jordan's franchise record.",
    ],
  },
  "landon-elliott": {
    status: OwnerProfileStatus.Active,
    landingGroups: [
      ManagerLandingGroup.Active,
      ManagerLandingGroup.RetiredOwners,
    ],
    currentFranchiseIds: ["shake-n-bakers"],
    legacyFranchiseIds: ["special-brownies"],
    notes: [
      "Landon joined Jordan Maslyn as co-owner of The Shake-N-Bakers beginning with the 2025-2026 season.",
      "Landon's historical Special Brownies accomplishments remain a separate retired-owner legacy.",
    ],
  },
};

function applyOwnerOverride(profile: OwnerProfile): OwnerProfile {
  const override = OWNER_PROFILE_OVERRIDES[profile.id];
  if (!override) return profile;

  return {
    ...profile,
    ...override,
    roles: override.roles ?? profile.roles,
    sleeperIds: override.sleeperIds ?? profile.sleeperIds,
    landingGroups: override.landingGroups ?? profile.landingGroups,
    survey: {
      ...profile.survey,
      ...override.survey,
    },
    notes: [...(profile.notes ?? []), ...(override.notes ?? [])],
  };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();

  items.forEach((item) => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });

  return Array.from(byId.values());
}

const generatedOwnerProfiles = [
  ...activeManagers.map((manager) =>
    buildOwnerProfile(manager, OwnerProfileStatus.Active, [
      ManagerLandingGroup.Active,
    ])
  ),
  ...retiredManagers.map((manager) =>
    buildOwnerProfile(manager, OwnerProfileStatus.Retired, [
      ManagerLandingGroup.RetiredOwners,
    ])
  ),
  ...staffManagers.map((manager) =>
    buildOwnerProfile(manager, OwnerProfileStatus.Staff, [
      ManagerLandingGroup.Staff,
    ])
  ),
  jeffreyOwnerProfile,
];

export const ownerProfiles: OwnerProfile[] = uniqueById(
  generatedOwnerProfiles.map(applyOwnerOverride)
);

export const ownerProfilesById: Record<string, OwnerProfile> =
  Object.fromEntries(ownerProfiles.map((profile) => [profile.id, profile]));

function getSpecialFranchiseOwnerRules(ownerId: string, franchiseId: string) {
  if (franchiseId === "prestigio-mundial") {
    return {
      activeOwnerIds: ["ray-long", "jeffrey-hudgins"],
      primaryOwnerIds: [],
      coOwnerIds: ["ray-long", "jeffrey-hudgins"],
      statOwnerIds: ["ray-long", "jeffrey-hudgins"],
      notes: [
        "Prestigio Mundial has been co-owned by Ray Long and Jeffrey Hudgins for the full franchise history.",
        "Career stats for this franchise are shared by both owners.",
      ],
    };
  }

  if (franchiseId === "shake-n-bakers") {
    return {
      activeOwnerIds: ["jordan-maslyn", "landon-elliott"],
      primaryOwnerIds: ["jordan-maslyn"],
      coOwnerIds: ["landon-elliott"],
      statOwnerIds: ["jordan-maslyn"],
      notes: [
        "Jordan Maslyn is the primary owner of The Shake-N-Bakers.",
        "Landon Elliott joined as co-owner beginning with the 2025-2026 season.",
        "Landon's prior Special Brownies accomplishments stay separate from this franchise record.",
      ],
    };
  }

  return {
    activeOwnerIds: [ownerId],
    primaryOwnerIds: [ownerId],
    coOwnerIds: [],
    statOwnerIds: [ownerId],
    notes: undefined,
  };
}

function buildActiveFranchise(manager: (typeof activeManagers)[number]): Franchise {
  const ownerId = ownerIdFromName(manager.fullName);
  const franchiseId = franchiseIdFromTeamName(manager.teamName);
  const ownerRules = getSpecialFranchiseOwnerRules(ownerId, franchiseId);

  return {
    id: franchiseId,
    slug: franchiseId,
    currentTeamName: manager.teamName,
    status: FranchiseStatus.Active,
    colorTeamCode: getString(manager, "favoriteTeam") as TeamCode | undefined,
    currentSleeperRosterId: getNumber(manager, "roster"),
    activeOwnerIds: ownerRules.activeOwnerIds,
    primaryOwnerIds: ownerRules.primaryOwnerIds,
    coOwnerIds: ownerRules.coOwnerIds,
    legacyOwnerIds: [],
    statOwnerIds: ownerRules.statOwnerIds,
    notes: ownerRules.notes,
  };
}

function buildRetiredFranchise(
  manager: (typeof retiredManagers)[number]
): Franchise {
  const ownerId = ownerIdFromName(manager.fullName);
  const franchiseId = franchiseIdFromTeamName(manager.teamName);

  return {
    id: franchiseId,
    slug: franchiseId,
    currentTeamName: manager.teamName,
    status: FranchiseStatus.Retired,
    colorTeamCode: getString(manager, "favoriteTeam") as TeamCode | undefined,
    activeOwnerIds: [],
    primaryOwnerIds: [],
    coOwnerIds: [],
    legacyOwnerIds: [ownerId],
    statOwnerIds: [ownerId],
  };
}

export const franchises: Franchise[] = uniqueById([
  ...activeManagers.map(buildActiveFranchise),
  ...retiredManagers.map(buildRetiredFranchise),
]);

export const franchisesById: Record<string, Franchise> = Object.fromEntries(
  franchises.map((franchise) => [franchise.id, franchise])
);

function buildStandardActiveTenure(
  manager: (typeof activeManagers)[number]
): OwnershipTenure {
  const ownerId = ownerIdFromName(manager.fullName);
  const franchiseId = franchiseIdFromTeamName(manager.teamName);

  return {
    id: `${ownerId}-${franchiseId}-${getStartSeason(manager)}`,
    ownerId,
    franchiseId,
    role: OwnershipRole.Primary,
    startSeason: getStartSeason(manager),
    isActive: true,
    showOnActiveLanding: true,
    showUnderRetiredOwners: false,
    accomplishmentAttribution: AccomplishmentAttribution.PrimaryFranchise,
  };
}

const activeOwnershipTenures: OwnershipTenure[] = activeManagers.flatMap(
  (manager) => {
    const franchiseId = franchiseIdFromTeamName(manager.teamName);

    if (franchiseId === "prestigio-mundial") {
      return [
        {
          id: "ray-long-prestigio-mundial-2011",
          ownerId: "ray-long",
          franchiseId,
          role: OwnershipRole.CoOwner,
          startSeason: 2011,
          isActive: true,
          showOnActiveLanding: true,
          showUnderRetiredOwners: false,
          accomplishmentAttribution:
            AccomplishmentAttribution.SharedFranchise,
          notes: [
            "Ray and Jeffrey share the full Prestigio Mundial franchise history.",
          ],
        },
        {
          id: "jeffrey-hudgins-prestigio-mundial-2011",
          ownerId: "jeffrey-hudgins",
          franchiseId,
          role: OwnershipRole.CoOwner,
          startSeason: 2011,
          isActive: true,
          showOnActiveLanding: true,
          showUnderRetiredOwners: false,
          accomplishmentAttribution:
            AccomplishmentAttribution.SharedFranchise,
          notes: [
            "Jeffrey gets a personal owner profile, while Prestigio Mundial stats remain shared with Ray.",
          ],
        },
      ];
    }

    if (franchiseId === "shake-n-bakers") {
      return [
        {
          ...buildStandardActiveTenure(manager),
          id: "jordan-maslyn-shake-n-bakers-2017",
          ownerId: "jordan-maslyn",
          role: OwnershipRole.Primary,
          startSeason: 2017,
          notes: ["Jordan is the primary owner of The Shake-N-Bakers."],
        },
        {
          id: "landon-elliott-shake-n-bakers-2025",
          ownerId: "landon-elliott",
          franchiseId,
          role: OwnershipRole.CoOwner,
          startSeason: LANDON_SHAKE_START_SEASON,
          startLabel: "2025-2026",
          isActive: true,
          showOnActiveLanding: true,
          showUnderRetiredOwners: false,
          accomplishmentAttribution:
            AccomplishmentAttribution.SharedFranchise,
          notes: [
            "Landon's Shake-N-Bakers co-owner tenure begins in 2025 and does not import his Special Brownies legacy.",
          ],
        },
      ];
    }

    return [buildStandardActiveTenure(manager)];
  }
);

const retiredOwnershipTenures: OwnershipTenure[] = retiredManagers.map(
  (manager) => {
    const ownerId = ownerIdFromName(manager.fullName);
    const franchiseId = franchiseIdFromTeamName(manager.teamName);
    const isLandonSpecialBrownies =
      ownerId === "landon-elliott" && franchiseId === "special-brownies";

    return {
      id: `${ownerId}-${franchiseId}-legacy`,
      ownerId,
      franchiseId,
      role: OwnershipRole.LegacyOwner,
      startSeason: getStartSeason(manager),
      endSeason: isLandonSpecialBrownies ? 2024 : undefined,
      endLabel: isLandonSpecialBrownies ? "2024" : undefined,
      isActive: false,
      showOnActiveLanding: false,
      showUnderRetiredOwners: true,
      accomplishmentAttribution: AccomplishmentAttribution.LegacyOwner,
      notes: isLandonSpecialBrownies
        ? [
            "Special Brownies remains Landon's retired-owner legacy and should not be merged into The Shake-N-Bakers.",
          ]
        : undefined,
    };
  }
);

export const ownershipTenures: OwnershipTenure[] = [
  ...activeOwnershipTenures,
  ...retiredOwnershipTenures,
];

export const ownershipTenuresByOwnerId: Record<string, OwnershipTenure[]> =
  ownerProfiles.reduce<Record<string, OwnershipTenure[]>>((lookup, owner) => {
    lookup[owner.id] = ownershipTenures.filter(
      (tenure) => tenure.ownerId === owner.id
    );
    return lookup;
  }, {});

function buildStatSummary(
  manager: (typeof activeManagers)[number] | (typeof retiredManagers)[number],
  source: FranchiseStatSummary["source"]
): FranchiseStatSummary {
  const ownerId = ownerIdFromName(manager.fullName);
  const franchiseId = franchiseIdFromTeamName(manager.teamName);
  const franchise = franchisesById[franchiseId];
  const isPrestigio = franchiseId === "prestigio-mundial";
  const isShake = franchiseId === "shake-n-bakers";
  const isLandonSpecialBrownies =
    ownerId === "landon-elliott" && franchiseId === "special-brownies";

  return {
    id: `${franchiseId}-career`,
    franchiseId,
    summaryType: "career",
    source,
    displayedRecord: getString(manager, "record"),
    championships: manager.championships,
    podiums: manager.podiums,
    bestFinish: manager.bestFinish,
    toiletBowls: getNumber(manager, "toiletBowls"),
    attributedOwnerIds: isPrestigio
      ? ["ray-long", "jeffrey-hudgins"]
      : franchise?.statOwnerIds ?? [ownerId],
    sharedByOwnerIds: isPrestigio
      ? ["ray-long", "jeffrey-hudgins"]
      : franchise?.statOwnerIds ?? [ownerId],
    accomplishmentAttribution: isPrestigio
      ? AccomplishmentAttribution.SharedFranchise
      : source === "retired-manager-data"
        ? AccomplishmentAttribution.LegacyOwner
        : AccomplishmentAttribution.PrimaryFranchise,
    notes: [
      ...(isPrestigio
        ? ["Prestigio Mundial stats are shared by Ray Long and Jeffrey Hudgins."]
        : []),
      ...(isShake
        ? [
            "This Shake-N-Bakers summary is attached to Jordan's franchise record; Landon's Special Brownies legacy stays separate.",
          ]
        : []),
      ...(isLandonSpecialBrownies
        ? [
            "This is Landon's retired-owner legacy summary and should not roll into Jordan's Shake-N-Bakers record.",
          ]
        : []),
    ],
  };
}

export const franchiseStatSummaries: FranchiseStatSummary[] = [
  ...activeManagers.map((manager) =>
    buildStatSummary(manager, "active-manager-data")
  ),
  ...retiredManagers.map((manager) =>
    buildStatSummary(manager, "retired-manager-data")
  ),
];

export const franchiseStatSummariesByFranchiseId: Record<
  string,
  FranchiseStatSummary
> = Object.fromEntries(
  franchiseStatSummaries.map((summary) => [summary.franchiseId, summary])
);

export function getOwnerProfileById(ownerId: string) {
  return ownerProfilesById[ownerId];
}

export function getFranchiseById(franchiseId: string) {
  return franchisesById[franchiseId];
}

export function getOwnershipTenuresForOwner(ownerId: string) {
  return ownershipTenuresByOwnerId[ownerId] ?? [];
}

export function getFranchiseStatSummary(franchiseId: string) {
  return franchiseStatSummariesByFranchiseId[franchiseId];
}

function includesAll(values: string[] | undefined, expected: string[]) {
  return expected.every((value) => values?.includes(value));
}

export function validateManagerIdentityModel() {
  const messages: string[] = [];
  const prestigio = franchisesById["prestigio-mundial"];
  const prestigioStats =
    franchiseStatSummariesByFranchiseId["prestigio-mundial"];
  const shake = franchisesById["shake-n-bakers"];
  const landonSpecialBrowniesTenure = ownershipTenures.find(
    (tenure) =>
      tenure.ownerId === "landon-elliott" &&
      tenure.franchiseId === "special-brownies"
  );
  const shakeStats = franchiseStatSummariesByFranchiseId["shake-n-bakers"];

  if (!includesAll(prestigio?.activeOwnerIds, ["ray-long", "jeffrey-hudgins"])) {
    messages.push("Prestigio Mundial must include Ray and Jeffrey as owners.");
  }

  if (
    !includesAll(prestigioStats?.sharedByOwnerIds, [
      "ray-long",
      "jeffrey-hudgins",
    ])
  ) {
    messages.push("Prestigio Mundial stats must be shared by Ray and Jeffrey.");
  }

  if (ownerProfilesById["ray-long"]?.survey.favoriteNflTeam !== "ATL") {
    messages.push("Ray Long must remain mapped as an Atlanta Falcons fan.");
  }

  if (!ownerProfilesById["jeffrey-hudgins"]?.survey.surveyComplete) {
    messages.push("Jeffrey Hudgins must have an owner profile/story source.");
  }

  if (!includesAll(shake?.primaryOwnerIds, ["jordan-maslyn"])) {
    messages.push("The Shake-N-Bakers must keep Jordan as primary owner.");
  }

  if (!includesAll(shake?.coOwnerIds, ["landon-elliott"])) {
    messages.push("The Shake-N-Bakers must include Landon as co-owner.");
  }

  if (!landonSpecialBrowniesTenure) {
    messages.push("Landon's Special Brownies legacy tenure must remain present.");
  }

  if (shakeStats?.attributedOwnerIds.includes("landon-elliott")) {
    messages.push(
      "Landon's historical accomplishments must not merge into Jordan's Shake-N-Bakers record."
    );
  }

  return messages;
}

const managerIdentityValidationMessages = validateManagerIdentityModel();

export const managerIdentityValidation = {
  messages: managerIdentityValidationMessages,
  passed: managerIdentityValidationMessages.length === 0,
};
