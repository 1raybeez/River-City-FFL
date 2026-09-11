export type ApprovedFreezeWindow = {
  season: number;
  week: number;
  windowOpen: string;
  firstKickoff: string;
  timezone: string;
};

const APPROVED_WINDOWS: readonly ApprovedFreezeWindow[] = [
  {
    season: 2026,
    week: 2,
    windowOpen: "2026-09-17T15:00:00-04:00",
    firstKickoff: "2026-09-17T20:15:00-04:00",
    timezone: "America/New_York",
  },
];

export function getApprovedFreezeWindow(season: number, week: number): ApprovedFreezeWindow | null {
  return APPROVED_WINDOWS.find(window => window.season === season && window.week === week) ?? null;
}

export type FreezeWindowDecision =
  | { eligible: true; window: ApprovedFreezeWindow; reason: null }
  | { eligible: false; window: ApprovedFreezeWindow | null; reason: "MISSING_APPROVED_FREEZE_WINDOW" | "BEFORE_APPROVED_FREEZE_WINDOW" | "AT_OR_AFTER_FIRST_KICKOFF" };

export function evaluateFreezeWindow(season: number, week: number, captureTime: Date): FreezeWindowDecision {
  const window = getApprovedFreezeWindow(season, week);
  if (!window) return { eligible: false, window: null, reason: "MISSING_APPROVED_FREEZE_WINDOW" };
  const timestamp = captureTime.getTime();
  if (timestamp < Date.parse(window.windowOpen)) return { eligible: false, window, reason: "BEFORE_APPROVED_FREEZE_WINDOW" };
  if (timestamp >= Date.parse(window.firstKickoff)) return { eligible: false, window, reason: "AT_OR_AFTER_FIRST_KICKOFF" };
  return { eligible: true, window, reason: null };
}
