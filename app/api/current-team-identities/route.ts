import { NextResponse } from "next/server";

import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const identities = await getCurrentSeasonTeamIdentityMap();
  return NextResponse.json(Array.from(identities.values()), {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=300" },
  });
}
