import {
  buildWeeklyHighScoreSettlementCandidate,
  getWeeklyHighScoreSettlement,
  writeWeeklyHighScoreSettlement,
  type WeeklyHighScoreSettlement,
  type WeeklyHighScoreSettlementCandidate,
} from "@/lib/weeklyHighScoreSettlement";

export const WEEKLY_SETTLEMENT_TIMEZONE = "America/New_York" as const;
export const WEEKLY_SETTLEMENT_WINDOW_START_MINUTES = 11 * 60 + 15;
export const WEEKLY_SETTLEMENT_ATTEMPT_MINUTES = [
  11 * 60 + 15,
  12 * 60 + 15,
  13 * 60 + 15,
  14 * 60 + 15,
  15 * 60 + 15,
] as const;

export type WeeklySettlementAutomationState =
  | "SETTLED"
  | "ALREADY_SETTLED"
  | "NOT_READY"
  | "UNRESOLVED_TIE"
  | "INVALID_WEEK"
  | "CONFLICT"
  | "ERROR";

type SleeperState = { week?: number; season?: string };
type SleeperLeague = { status?: string; season?: string; settings?: { last_scored_leg?: number; leg?: number } };

export type WeeklySettlementAutomationResult = Readonly<{
  state: WeeklySettlementAutomationState;
  season: number;
  targetWeek: number | null;
  runAtEastern: string;
  sleeperCurrentWeek: number | null;
  lastScoredLeg: number | null;
  eligibilityState: string;
  winner: string | null;
  score: number | null;
  settlementResult: string;
  documentId: string | null;
  writePerformed: boolean;
}>;

export function easternClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: WEEKLY_SETTLEMENT_TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { weekday: value("weekday"), hour: Number(value("hour")), minute: Number(value("minute")) };
}

export function isWithinTuesdaySettlementWindow(now = new Date()) {
  const clock = easternClock(now);
  const minutes = clock.hour * 60 + clock.minute;
  return clock.weekday === "Tuesday" && minutes >= WEEKLY_SETTLEMENT_WINDOW_START_MINUTES && minutes <= WEEKLY_SETTLEMENT_ATTEMPT_MINUTES.at(-1)!;
}

export function isTuesdaySettlementAttempt(now = new Date()) {
  const clock = easternClock(now);
  return clock.weekday === "Tuesday" && WEEKLY_SETTLEMENT_ATTEMPT_MINUTES.includes(clock.hour * 60 + clock.minute as typeof WEEKLY_SETTLEMENT_ATTEMPT_MINUTES[number]);
}

export function formatEasternRunTimestamp(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: WEEKLY_SETTLEMENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(now);
}

export function resolvePreviousScoringWeek({ season, state, league }: { season: number; state: SleeperState; league: SleeperLeague }) {
  const currentWeek = state.week;
  const currentWeekNumber = typeof currentWeek === "number" && Number.isInteger(currentWeek) ? currentWeek : null;
  if (state.season && Number(state.season) !== season) return { valid: false as const, reason: "Sleeper state season does not match the requested season.", targetWeek: null, currentWeek: currentWeek ?? null, lastScoredLeg: league.settings?.last_scored_leg ?? null };
  if (league.season && Number(league.season) !== season) return { valid: false as const, reason: "Sleeper league season does not match the requested season.", targetWeek: null, currentWeek: currentWeek ?? null, lastScoredLeg: league.settings?.last_scored_leg ?? null };
  if (currentWeekNumber === null || currentWeekNumber < 2) return { valid: false as const, reason: "No prior scoring week is available from the current Sleeper week.", targetWeek: null, currentWeek: currentWeekNumber, lastScoredLeg: league.settings?.last_scored_leg ?? null };
  const targetWeek = currentWeekNumber - 1;
  if (targetWeek < 1 || targetWeek > 14) return { valid: false as const, reason: "The resolved prior week is outside the supported regular-season award window.", targetWeek: null, currentWeek: currentWeekNumber, lastScoredLeg: league.settings?.last_scored_leg ?? null };
  return { valid: true as const, reason: null, targetWeek, currentWeek: currentWeekNumber, lastScoredLeg: league.settings?.last_scored_leg ?? null };
}

function baseResult(season: number, now: Date, values: Partial<WeeklySettlementAutomationResult>): WeeklySettlementAutomationResult {
  return {
    state: "ERROR",
    season,
    targetWeek: null,
    runAtEastern: formatEasternRunTimestamp(now),
    sleeperCurrentWeek: null,
    lastScoredLeg: null,
    eligibilityState: "NOT_EVALUATED",
    winner: null,
    score: null,
    settlementResult: "NOT_RUN",
    documentId: null,
    writePerformed: false,
    ...values,
  };
}

export async function runWeeklySettlementAutomation(options: {
  season: number;
  now?: Date;
  dryRun?: boolean;
  readLeagueState?: () => Promise<{ state: SleeperState; league: SleeperLeague }>;
  readSettlement?: (season: number, week: number) => Promise<WeeklyHighScoreSettlement | null>;
  buildCandidate?: (input: { season: number; week: number; now: Date }) => Promise<WeeklyHighScoreSettlementCandidate>;
  writeSettlement?: (settlement: WeeklyHighScoreSettlement) => Promise<{ created: boolean; settlement: WeeklyHighScoreSettlement }>;
}) {
  const now = options.now ?? new Date();
  if (!isTuesdaySettlementAttempt(now)) return baseResult(options.season, now, { state: "NOT_READY", eligibilityState: "OUTSIDE_TUESDAY_ATTEMPT", settlementResult: "NO_OP" });

  try {
    const readLeagueState = options.readLeagueState ?? (async () => {
      const [stateResponse, leagueResponse] = await Promise.all([
        fetch("https://api.sleeper.app/v1/state/nfl", { cache: "no-store" }),
        fetch("https://api.sleeper.app/v1/league/1312149033254416384", { cache: "no-store" }),
      ]);
      if (!stateResponse.ok || !leagueResponse.ok) throw new Error("Sleeper state read failed.");
      return { state: await stateResponse.json() as SleeperState, league: await leagueResponse.json() as SleeperLeague };
    });
    const { state, league } = await readLeagueState();
    const resolved = resolvePreviousScoringWeek({ season: options.season, state, league });
    if (!resolved.valid) return baseResult(options.season, now, { state: "INVALID_WEEK", eligibilityState: resolved.reason, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, settlementResult: "NO_OP" });
    if (league.status !== "complete" && resolved.lastScoredLeg !== resolved.targetWeek) return baseResult(options.season, now, { state: "NOT_READY", targetWeek: resolved.targetWeek, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, eligibilityState: "FINALITY_NOT_READY", settlementResult: "NO_OP", documentId: `${options.season}:week-${String(resolved.targetWeek).padStart(2, "0")}` });

    const readSettlement = options.readSettlement ?? getWeeklyHighScoreSettlement;
    const existing = await readSettlement(options.season, resolved.targetWeek);
    if (existing) return baseResult(options.season, now, { state: "ALREADY_SETTLED", targetWeek: resolved.targetWeek, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, eligibilityState: "ALREADY_SETTLED", winner: existing.winnerFranchiseIds.join(","), score: existing.highScore, settlementResult: "NO_OP", documentId: `${options.season}:week-${String(resolved.targetWeek).padStart(2, "0")}` });

    const buildCandidate = options.buildCandidate ?? buildWeeklyHighScoreSettlementCandidate;
    const candidate = await buildCandidate({ season: options.season, week: resolved.targetWeek, now });
    if (!candidate.eligible || !candidate.settlement) {
      const tie = candidate.reason?.includes("tied top score") ?? false;
      return baseResult(options.season, now, { state: tie ? "UNRESOLVED_TIE" : "NOT_READY", targetWeek: resolved.targetWeek, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, eligibilityState: candidate.reason ?? "NOT_ELIGIBLE", settlementResult: "NO_OP", documentId: candidate.settlementId });
    }
    const settlement = candidate.settlement;
    if (options.dryRun) return baseResult(options.season, now, { state: "SETTLED", targetWeek: resolved.targetWeek, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, eligibilityState: "ELIGIBLE", winner: settlement.winnerFranchiseIds.join(","), score: settlement.highScore, settlementResult: "DRY_RUN", documentId: candidate.settlementId });
    const result = await (options.writeSettlement ?? writeWeeklyHighScoreSettlement)(settlement);
    return baseResult(options.season, now, { state: result.created ? "SETTLED" : "ALREADY_SETTLED", targetWeek: resolved.targetWeek, sleeperCurrentWeek: resolved.currentWeek, lastScoredLeg: resolved.lastScoredLeg, eligibilityState: "ELIGIBLE", winner: settlement.winnerFranchiseIds.join(","), score: settlement.highScore, settlementResult: result.created ? "CREATED" : "NO_OP", documentId: candidate.settlementId, writePerformed: result.created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation failed.";
    return baseResult(options.season, now, { state: message.includes("conflicting") ? "CONFLICT" : "ERROR", eligibilityState: message, settlementResult: "NO_OP" });
  }
}
