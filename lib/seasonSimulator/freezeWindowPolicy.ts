import { getFirstKickoff, type NflKickoffSchedule } from "@/lib/nflKickoffSchedule";

export const APPROVED_WEEK_2_FREEZE_LEAD_TIME_MINUTES = 315;
export const FREEZE_TIMEZONE = "America/New_York";

export type FreezePolicy = Readonly<{ leadTimeMinutes: number; timezone: string }>;
export const defaultFreezePolicy: FreezePolicy = { leadTimeMinutes: APPROVED_WEEK_2_FREEZE_LEAD_TIME_MINUTES, timezone: FREEZE_TIMEZONE };

export async function resolveFreezeWindow(schedule: NflKickoffSchedule, season: number, week: number, policy: FreezePolicy = defaultFreezePolicy) {
  const first = await getFirstKickoff(schedule, season, week);
  const kickoff = Date.parse(first.kickoffAt);
  return { season, week, firstKickoff: first.kickoffAt, windowOpen: new Date(kickoff - policy.leadTimeMinutes * 60_000).toISOString(), timezone: policy.timezone, source: first.source, gameId: first.gameId };
}
