import "server-only";

import { getLeagueRosters, getLeagueUsers } from "@/lib/sleeper";
import { buildCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentity";

export async function getCurrentSeasonTeamIdentityMap() {
  const [rosters, users] = await Promise.all([
    getLeagueRosters(undefined, { revalidateSeconds: 300 }),
    getLeagueUsers(undefined, { revalidateSeconds: 300 }),
  ]);
  return buildCurrentSeasonTeamIdentityMap({ rosters, users });
}

export async function getCurrentSeasonTeamIdentity(franchiseId: string) {
  return (await getCurrentSeasonTeamIdentityMap()).get(franchiseId) ?? null;
}
