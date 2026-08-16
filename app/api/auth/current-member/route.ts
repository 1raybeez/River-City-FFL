import { NextResponse } from "next/server";
import {
  anonymousCurrentMember,
  getCurrentMember,
} from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const member = await getCurrentMember();
    return NextResponse.json(member, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(anonymousCurrentMember, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
