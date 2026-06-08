import type {
  DraftPreference,
  TeamCode,
  ValuePosition,
} from "@/lib/types/Manager";

export const OwnerProfileStatus = {
  Active: "active",
  Retired: "retired",
  Staff: "staff",
} as const;
export type OwnerProfileStatus =
  (typeof OwnerProfileStatus)[keyof typeof OwnerProfileStatus];

export const ManagerLandingGroup = {
  Active: "active",
  RetiredOwners: "retired-owners",
  Staff: "staff",
} as const;
export type ManagerLandingGroup =
  (typeof ManagerLandingGroup)[keyof typeof ManagerLandingGroup];

export const FranchiseStatus = {
  Active: "active",
  Retired: "retired",
} as const;
export type FranchiseStatus =
  (typeof FranchiseStatus)[keyof typeof FranchiseStatus];

export const OwnershipRole = {
  Primary: "primary",
  CoOwner: "co-owner",
  LegacyOwner: "legacy-owner",
  Staff: "staff",
} as const;
export type OwnershipRole =
  (typeof OwnershipRole)[keyof typeof OwnershipRole];

export const AccomplishmentAttribution = {
  SharedFranchise: "shared-franchise",
  PrimaryFranchise: "primary-franchise",
  LegacyOwner: "legacy-owner",
  Staff: "staff",
} as const;
export type AccomplishmentAttribution =
  (typeof AccomplishmentAttribution)[keyof typeof AccomplishmentAttribution];

export interface OwnerSurveyProfile {
  surveyComplete: boolean;
  bio?: string;
  philosophy?: string;
  favoriteNflTeam?: TeamCode;
  favoritePlayerId?: number;
  rivalOwnerId?: string;
  rivalName?: string;
  valuePosition?: ValuePosition;
  draftPreference?: DraftPreference;
  teamBuildingMode?: string;
  tradeAggression?: number;
  preferredContact?: string;
}

export interface OwnerProfile {
  id: string;
  slug: string;
  fullName: string;
  shortName: string;
  status: OwnerProfileStatus;
  photo: string | null;
  sleeperIds: string[];
  location?: string;
  fantasyStart?: number;
  roles: string[];
  landingGroups: ManagerLandingGroup[];
  currentFranchiseIds: string[];
  legacyFranchiseIds: string[];
  survey: OwnerSurveyProfile;
  notes?: string[];
}

export interface Franchise {
  id: string;
  slug: string;
  currentTeamName: string;
  status: FranchiseStatus;
  colorTeamCode?: TeamCode;
  currentSleeperRosterId?: number;
  activeOwnerIds: string[];
  primaryOwnerIds: string[];
  coOwnerIds: string[];
  legacyOwnerIds: string[];
  statOwnerIds: string[];
  notes?: string[];
}

export interface OwnershipTenure {
  id: string;
  ownerId: string;
  franchiseId: string;
  role: OwnershipRole;
  startSeason: number;
  startLabel?: string;
  endSeason?: number;
  endLabel?: string;
  isActive: boolean;
  showOnActiveLanding: boolean;
  showUnderRetiredOwners: boolean;
  accomplishmentAttribution: AccomplishmentAttribution;
  notes?: string[];
}

export interface SeasonResult {
  season: number;
  franchiseId: string;
  teamName: string;
  ownerIds: string[];
  primaryOwnerIds: string[];
  coOwnerIds: string[];
  finish?: number;
  record?: string;
  notes?: string[];
}

export interface FranchiseStatSummary {
  id: string;
  franchiseId: string;
  summaryType: "career";
  source: "active-manager-data" | "retired-manager-data";
  displayedRecord?: string;
  championships: number;
  podiums: number;
  bestFinish: string;
  toiletBowls?: number;
  attributedOwnerIds: string[];
  sharedByOwnerIds: string[];
  accomplishmentAttribution: AccomplishmentAttribution;
  notes?: string[];
}
