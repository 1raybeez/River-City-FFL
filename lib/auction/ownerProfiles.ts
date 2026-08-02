import { activeManagers } from "@/lib/managers/activeManagers";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import {
  AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY,
  AUCTION_OWNER_PROFILE_RAY_JEFFREY,
} from "@/lib/auction/ownerProfileIds";

export {
  AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY,
  AUCTION_OWNER_PROFILE_RAY_JEFFREY,
} from "@/lib/auction/ownerProfileIds";

export type AuctionOwnerRole =
  | "commissioner"
  | "co-commissioner"
  | "pilot-owner";

export type AuctionOwnerProfile = {
  ownerProfileId: string;
  season: number;
  displayName: string;
  email: string | null;
  normalizedEmail: string | null;
  sleeperUserId: string | null;
  sleeperRosterId: number | null;
  teamId: string | null;
  teamName: string;
  avatarUrl: string | null;
  role: AuctionOwnerRole;
  pilotEnabled: boolean;
  onboardingStatus: "not-started" | "invited" | "active" | "disabled";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuctionAccessResult = {
  authenticated: boolean;
  email: string | null;
  role: AuctionOwnerRole | null;
  ownerProfileId: string | null;
  ownerProfileLabel: string | null;
  ownerDisplayName: string | null;
  sleeperTeamName: string | null;
  sleeperRosterId: number | null;
  sleeperUserId: string | null;
  canAccessWarRoom: boolean;
  canAccessMaintenance: boolean;
  canRecordSales: boolean;
  canViewCommissionerPreferences: boolean;
};

const season = riverCityAuctionLeagueSettings.season;
const createdAt = "2026-07-14T00:00:00.000Z";
const updatedAt = "2026-07-14T00:00:00.000Z";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function findManager(fullName: string) {
  return activeManagers.find((manager) => manager.fullName === fullName) ?? null;
}

function profileFromManager({
  ownerProfileId,
  fullName,
  email,
  role,
  pilotEnabled,
}: {
  ownerProfileId: string;
  fullName: string;
  email: string;
  role: AuctionOwnerRole;
  pilotEnabled: boolean;
}): AuctionOwnerProfile {
  const manager = findManager(fullName);
  return {
    ownerProfileId,
    season,
    displayName: fullName,
    email,
    normalizedEmail: normalizeEmail(email),
    sleeperUserId: manager?.sleeperId ?? null,
    sleeperRosterId: manager?.roster ?? null,
    teamId: manager?.roster ? `${season}:${manager.roster}` : null,
    teamName: manager?.teamName ?? fullName,
    avatarUrl: manager?.photo ?? null,
    role,
    pilotEnabled,
    onboardingStatus: pilotEnabled ? "invited" : "disabled",
    active: true,
    createdAt,
    updatedAt,
  };
}

const rayManager = findManager("Ray Long");

export const auctionOwnerProfiles: readonly AuctionOwnerProfile[] = [
  {
    ownerProfileId: AUCTION_OWNER_PROFILE_RAY_JEFFREY,
    season,
    displayName: "Ray Long / Jeffrey Hudgins",
    email: null,
    normalizedEmail: null,
    sleeperUserId: rayManager?.sleeperId ?? null,
    sleeperRosterId: rayManager?.roster ?? null,
    teamId: rayManager?.roster ? `${season}:${rayManager.roster}` : null,
    teamName: AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY,
    avatarUrl: rayManager?.photo ?? null,
    role: "commissioner",
    pilotEnabled: true,
    onboardingStatus: "active",
    active: true,
    createdAt,
    updatedAt,
  },
  profileFromManager({
    ownerProfileId: "wade",
    fullName: "Wade Cameron",
    email: "r.wade.cameron@gmail.com",
    role: "pilot-owner",
    pilotEnabled: true,
  }),
  profileFromManager({
    ownerProfileId: "jd",
    fullName: "JD Dowling",
    email: "madpanda75@gmail.com",
    role: "pilot-owner",
    pilotEnabled: true,
  }),
  profileFromManager({
    ownerProfileId: "rashad",
    fullName: "Rashad Gresham",
    email: "Rashadgresham81@gmail.com",
    role: "pilot-owner",
    pilotEnabled: true,
  }),
];

export function getAuctionOwnerProfile(ownerProfileId: string | null | undefined) {
  return (
    auctionOwnerProfiles.find(
      (profile) => profile.ownerProfileId === ownerProfileId
    ) ?? null
  );
}

export function getAuctionPilotProfiles() {
  return auctionOwnerProfiles.filter((profile) => profile.role === "pilot-owner");
}

export function getAuctionPilotAllowedEmails() {
  return getAuctionPilotProfiles()
    .map((profile) => profile.normalizedEmail)
    .filter((email): email is string => Boolean(email));
}

export function getAuctionPilotProfileByEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return (
    auctionOwnerProfiles.find(
      (profile) =>
        profile.role === "pilot-owner" &&
        profile.active &&
        profile.pilotEnabled &&
        profile.normalizedEmail === normalizedEmail
    ) ?? null
  );
}

export function buildCommissionerAccessResult(
  email: string
): AuctionAccessResult {
  return {
    authenticated: true,
    email,
    role: "commissioner",
    ownerProfileId: AUCTION_OWNER_PROFILE_RAY_JEFFREY,
    ownerProfileLabel: AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY,
    ownerDisplayName: "Ray Long / Jeffrey Hudgins",
    sleeperTeamName: AUCTION_OWNER_PROFILE_LABEL_RAY_JEFFREY,
    sleeperRosterId: rayManager?.roster ?? null,
    sleeperUserId: rayManager?.sleeperId ?? null,
    canAccessWarRoom: true,
    canAccessMaintenance: true,
    canRecordSales: true,
    canViewCommissionerPreferences: true,
  };
}

export function buildPilotAccessResult(
  profile: AuctionOwnerProfile,
  email: string
): AuctionAccessResult {
  return {
    authenticated: true,
    email,
    role: profile.role,
    ownerProfileId: profile.ownerProfileId,
    ownerProfileLabel: profile.teamName,
    ownerDisplayName: profile.displayName,
    sleeperTeamName: profile.teamName,
    sleeperRosterId: profile.sleeperRosterId,
    sleeperUserId: profile.sleeperUserId,
    canAccessWarRoom: profile.active && profile.pilotEnabled,
    canAccessMaintenance: false,
    canRecordSales: false,
    canViewCommissionerPreferences: false,
  };
}

export const unauthenticatedAuctionAccess: AuctionAccessResult = {
  authenticated: false,
  email: null,
  role: null,
  ownerProfileId: null,
  ownerProfileLabel: null,
  ownerDisplayName: null,
  sleeperTeamName: null,
  sleeperRosterId: null,
  sleeperUserId: null,
  canAccessWarRoom: false,
  canAccessMaintenance: false,
  canRecordSales: false,
  canViewCommissionerPreferences: false,
};
