import { NextResponse } from "next/server";
import { getAuctionSessionCookieName } from "@/lib/auth/auctionAccess";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  response.cookies.set({
    name: getAuctionSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
