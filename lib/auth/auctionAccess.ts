import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebaseAdmin";

const DEFAULT_SESSION_COOKIE_NAME = "river_city_auction_session";
const DEFAULT_SESSION_MAX_AGE_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AuctionAccessSession = {
  email: string;
  decodedToken: DecodedIdToken;
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
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  return getAuctionAllowedEmails().includes(normalizedEmail);
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

export async function verifyAuctionSession(): Promise<AuctionAccessSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(getAuctionSessionCookieName())?.value;

  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    const email = normalizeEmail(decodedToken.email);

    if (!decodedToken.email_verified || !isAuctionAllowedEmail(email)) {
      return null;
    }

    return {
      email,
      decodedToken,
    };
  } catch {
    return null;
  }
}

export async function requireAuctionAccess() {
  const session = await verifyAuctionSession();

  if (!session) {
    throw new AuctionAccessError();
  }

  return session;
}
