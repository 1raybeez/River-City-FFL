import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebaseAdmin";
import {
  buildCommissionerAccessResult,
  buildPilotAccessResult,
  getAuctionPilotAllowedEmails,
  getAuctionPilotProfileByEmail,
  type AuctionAccessResult,
} from "@/lib/auction/ownerProfiles";
import { resolveAuthorizedEmailFromFirestore } from "@/lib/auth/canonicalAuctionEmailMapping";
import type { CanonicalAuctionOwnerAuthorization } from "@/lib/auth/canonicalAuctionAuthorization";

export { getAuctionPilotAllowedEmails };

const DEFAULT_SESSION_COOKIE_NAME = "__session";
const DEFAULT_SESSION_MAX_AGE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type AuctionAuthDiagnosticRoute = "commish" | "proposal-api";

function diagnosticIdentity(email: string | null | undefined) {
  return email
    ? createHash("sha256").update(email).digest("hex").slice(0, 12)
    : null;
}

function logAuctionAuthDiagnostic({
  route,
  cookiePresent,
  sessionVerified,
  identityHash,
  access,
  finalAuthorized,
  status,
}: {
  route: AuctionAuthDiagnosticRoute;
  cookiePresent: boolean;
  sessionVerified: boolean;
  identityHash: string | null;
  access: AuctionAccessResult | null;
  finalAuthorized: boolean;
  status: number;
}) {
  console.info("[temporary-auction-auth-diagnostic]", {
    revision:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GIT_COMMIT_SHA ??
      "unknown",
    route,
    cookiePresent,
    sessionVerified,
    identityHash,
    canonicalMappingFound: Boolean(access?.canonicalOwnerId),
    explicitCommissionerAuthorization: access?.role === "commissioner",
    role: access?.role ?? null,
    canAccessWarRoom: access?.canAccessWarRoom ?? false,
    canAccessMaintenance: access?.canAccessMaintenance ?? false,
    canRecordSales: access?.canRecordSales ?? false,
    finalAuthorized,
    status,
  });
}

export type AuctionAccessSession = {
  email: string;
  decodedToken: DecodedIdToken;
  access: AuctionAccessResult;
};

export class AuctionAccessError extends Error {
  constructor(message = "Auction War Room access denied.") {
    super(message);
    this.name = "AuctionAccessError";
  }
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

function buildCanonicalManagerAccessResult(
  email: string,
  authorization: CanonicalAuctionOwnerAuthorization
): AuctionAccessResult {
  return {
    authenticated: true,
    email,
    role: "pilot-owner",
    ownerProfileId: authorization.canonicalOwnerId,
    canonicalOwnerId: authorization.canonicalOwnerId,
    authorizedFranchiseId: authorization.authorizedFranchiseId,
    warRoomId: authorization.warRoomId,
    ownerProfileLabel: authorization.teamName,
    ownerDisplayName: authorization.ownerDisplayName,
    sleeperTeamName: authorization.teamName,
    sleeperRosterId: authorization.sleeperRosterId,
    sleeperUserId: authorization.sleeperUserId,
    canAccessWarRoom: true,
    canAccessMaintenance: false,
    canRecordSales: false,
    canViewCommissionerPreferences: false,
  };
}

function parsePositiveNumber(value: string | undefined) {
  if (!value) return null;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

export function getAuctionAllowedEmails() {
  return Array.from(
    new Set(
      (process.env.AUCTION_ALLOWED_EMAILS ?? "")
        .split(",")
        .map(normalizeEmail)
        .filter(Boolean)
    )
  );
}

export function isAuctionAllowedEmail(email: string | null | undefined) {
  return getAuctionAccessForEmail(email).canAccessWarRoom;
}

export function isAuctionCommissionerEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  return getAuctionAllowedEmails().includes(normalizedEmail);
}

export function getAuctionAccessForEmail(
  email: string | null | undefined,
  emailVerified = true
): AuctionAccessResult {
  const normalizedEmail = normalizeEmail(email);

  if (!emailVerified || !normalizedEmail) {
    return {
      authenticated: false,
      email: normalizedEmail || null,
      role: null,
      ownerProfileId: null,
      canonicalOwnerId: null,
      authorizedFranchiseId: null,
      warRoomId: null,
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
  }

  if (isAuctionCommissionerEmail(normalizedEmail)) {
    return buildCommissionerAccessResult(normalizedEmail);
  }

  const pilotProfile = getAuctionPilotProfileByEmail(normalizedEmail);
  if (pilotProfile) {
    return buildPilotAccessResult(pilotProfile, normalizedEmail);
  }

  return {
    authenticated: true,
    email: normalizedEmail,
    role: null,
    ownerProfileId: null,
    canonicalOwnerId: null,
    authorizedFranchiseId: null,
    warRoomId: null,
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
}

export async function getAuctionAccessForVerifiedEmail(
  email: string | null | undefined
) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return getAuctionAccessForEmail(email, false);

  const isExplicitCommissioner = isAuctionCommissionerEmail(normalizedEmail);
  const canonicalAuthorization =
    await resolveAuthorizedEmailFromFirestore(normalizedEmail);

  if (isExplicitCommissioner) {
    const commissionerAccess = buildCommissionerAccessResult(normalizedEmail);
    if (!canonicalAuthorization) return commissionerAccess;

    const managerAccess = buildCanonicalManagerAccessResult(
      normalizedEmail,
      canonicalAuthorization
    );
    return {
      ...managerAccess,
      role: "commissioner",
      canAccessMaintenance: commissionerAccess.canAccessMaintenance,
      canRecordSales: commissionerAccess.canRecordSales,
      canViewCommissionerPreferences:
        commissionerAccess.canViewCommissionerPreferences,
    } satisfies AuctionAccessResult;
  }

  if (canonicalAuthorization) {
    return buildCanonicalManagerAccessResult(
      normalizedEmail,
      canonicalAuthorization
    );
  }

  return getAuctionAccessForEmail(normalizedEmail, true);
}

export function getAuctionSessionCookieName() {
  return (
    process.env.AUCTION_SESSION_COOKIE_NAME?.trim() ||
    DEFAULT_SESSION_COOKIE_NAME
  );
}

export function getAuctionSessionMaxAgeMs() {
  const maxAgeDays =
    parsePositiveNumber(process.env.AUCTION_SESSION_MAX_AGE_DAYS) ??
    DEFAULT_SESSION_MAX_AGE_DAYS;

  return Math.floor(maxAgeDays * MS_PER_DAY);
}

export async function verifyAuctionSession(
  diagnosticRoute?: AuctionAuthDiagnosticRoute
): Promise<AuctionAccessSession | null> {
  const cookieStore = await cookies();
  const cookieName = getAuctionSessionCookieName();
  const sessionCookie = cookieStore.get(cookieName)?.value;
  const allowedEmails = getAuctionAllowedEmails();
  const pilotEmails = getAuctionPilotAllowedEmails();

  console.info("[auction-auth] Session cookie read", {
    cookieName,
    cookieExists: Boolean(sessionCookie),
    cookieLength: sessionCookie?.length ?? 0,
    allowedEmails,
    pilotEmails,
  });

  if (!sessionCookie) {
    if (diagnosticRoute) {
      logAuctionAuthDiagnostic({
        route: diagnosticRoute,
        cookiePresent: false,
        sessionVerified: false,
        identityHash: null,
        access: null,
        finalAuthorized: false,
        status: 401,
      });
    }
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const email = normalizeEmail(decodedToken.email);
    const access = decodedToken.email_verified
      ? await getAuctionAccessForVerifiedEmail(email)
      : getAuctionAccessForEmail(email, false);

    console.info("[auction-auth] Session cookie verified", {
      email,
      emailVerified: Boolean(decodedToken.email_verified),
      allowedEmails,
      pilotEmails,
      role: access.role,
      ownerProfileId: access.ownerProfileId,
      canAccessWarRoom: access.canAccessWarRoom,
      canAccessMaintenance: access.canAccessMaintenance,
    });

    if (!access.canAccessWarRoom && !access.canAccessMaintenance) {
      if (diagnosticRoute) {
        logAuctionAuthDiagnostic({
          route: diagnosticRoute,
          cookiePresent: true,
          sessionVerified: true,
          identityHash: diagnosticIdentity(email),
          access,
          finalAuthorized: false,
          status: 401,
        });
      }
      return null;
    }

    if (diagnosticRoute) {
      logAuctionAuthDiagnostic({
        route: diagnosticRoute,
        cookiePresent: true,
        sessionVerified: true,
        identityHash: diagnosticIdentity(email),
        access,
        finalAuthorized: true,
        status: 200,
      });
    }

    return {
      email,
      decodedToken,
      access,
    };
  } catch (error) {
    if (diagnosticRoute) {
      logAuctionAuthDiagnostic({
        route: diagnosticRoute,
        cookiePresent: true,
        sessionVerified: false,
        identityHash: null,
        access: null,
        finalAuthorized: false,
        status: 401,
      });
    }
    console.info("[auction-auth] Session cookie verification failed", {
      cookieName,
      error:
        error instanceof Error
          ? error.message
          : "Unknown session cookie verification error.",
    });

    return null;
  }
}

export async function requireAuctionAccess(
  requirement: "maintenance" | "war-room" | "sales" = "maintenance",
  diagnosticRoute?: AuctionAuthDiagnosticRoute
) {
  const session = await verifyAuctionSession(diagnosticRoute);

  const hasRequiredAccess =
    requirement === "war-room"
      ? session?.access.canAccessWarRoom
      : requirement === "sales"
        ? session?.access.canRecordSales
        : session?.access.canAccessMaintenance;

  if (diagnosticRoute && session && !hasRequiredAccess) {
    logAuctionAuthDiagnostic({
      route: diagnosticRoute,
      cookiePresent: true,
      sessionVerified: true,
      identityHash: diagnosticIdentity(session.email),
      access: session.access,
      finalAuthorized: false,
      status: 401,
    });
  }

  if (!session || !hasRequiredAccess) {
    throw new AuctionAccessError();
  }

  return session;
}

export async function requireAuctionWarRoomAccess() {
  return requireAuctionAccess("war-room");
}

export async function requireAuctionSalesAccess() {
  return requireAuctionAccess("sales");
}
