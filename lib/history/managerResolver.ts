// lib/history/managerResolver.ts

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export type ResolvedManager = {
  managerId: string;
  managerName?: string;
};

/**
 * TEMP IMPLEMENTATION:
 * Resolves a Sleeper roster/team ID to a manager.
 * Wire this to your real owner/manager mapping later.
 */
export async function resolveManagerForTeam(
  leagueId: string,
  teamId: number
): Promise<ResolvedManager> {
  // TODO: Replace with your real league/owner mapping.
  // Example (if you later store owners under `leagues/{leagueId}/teams/{teamId}`):
  //
  // const ref = doc(db, "leagues", leagueId, "teams", String(teamId));
  // const snap = await getDoc(ref);
  // if (!snap.exists()) {
  //   return { managerId: String(teamId), managerName: `Team ${teamId}` };
  // }
  // const data = snap.data();
  // return {
  //   managerId: data.managerId ?? String(teamId),
  //   managerName: data.managerName ?? data.teamName ?? `Team ${teamId}`,
  // };

  return {
    managerId: `${leagueId}_team_${teamId}`,
    managerName: `Team ${teamId}`,
  };
}
