import { NextResponse } from "next/server";
import {
  getAuctionSessionCookieName,
  getAuctionSessionMaxAgeMs,
  isAuctionAllowedEmail,
} from "@/lib/auth/auctionAccess";
import { adminAuth } from "@/lib/firebaseAdmin";

type SessionRequestBody = {
  idToken?: unknown;
};

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

async function readIdToken(req: Request) {
  try {
    const body = (await req.json()) as SessionRequestBody;
    return typeof body.idToken === "string" ? body.idToken.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  const idToken = await readIdToken(req);

  if (!idToken) {
    return NextResponse.json(
      { error: "Missing Firebase ID token." },
      { status: 400 }
    );
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);
    const email = normalizeEmail(decodedToken.email);

    if (!decodedToken.email_verified) {
      return NextResponse.json(
        { error: "Google account email must be verified." },
        { status: 403 }
      );
    }

    if (!isAuctionAllowedEmail(email)) {
      return NextResponse.json(
        { error: "Email is not allowed to access Auction War Room." },
        { status: 403 }
      );
    }

    const maxAgeMs = getAuctionSessionMaxAgeMs();
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: maxAgeMs,
    });
    const response = NextResponse.json({
      success: true,
      email,
    });

    response.cookies.set({
      name: getAuctionSessionCookieName(),
      value: sessionCookie,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: Math.floor(maxAgeMs / 1000),
      expires: new Date(Date.now() + maxAgeMs),
    });

    return response;
  } catch (error) {
    console.error("Auction session creation failed:", error);
    return NextResponse.json(
      { error: "Invalid Firebase ID token." },
      { status: 401 }
    );
  }
}
