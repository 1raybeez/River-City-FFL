import fs from "node:fs/promises";
import path from "node:path";
import { evaluateFreezeWindow, getApprovedFreezeWindow } from "@/lib/seasonSimulator/freezeWindow";
import { listWeeklyHighScoreSettlements } from "@/lib/weeklyHighScoreSettlement";
import { listPublishedWeeklyRecaps } from "@/lib/weeklyRecapPublication";
import { getLeagueInfo, getMatchups, getNFLState, LEAGUE_ID } from "@/lib/sleeper";
import { MATCHUP_POLL_INTERVAL_MS } from "@/lib/matchupsPolling";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { getPredictorCalibrationProgress } from "@/lib/predictor/calibrationStatus";
import { readWeeklyOperationRunHealth, type WeeklyOperationRunHealth } from "@/lib/weeklyOperationRunStore";

export const OPERATIONS_SEASON = 2026;
export const SETTLEMENT_FUNCTION_NAME = "settleWeeklyHighScore";
export const SETTLEMENT_SCHEDULE = "15 11-15 * * 2";
export const SETTLEMENT_TIMEZONE = "America/New_York";
export const ACTUAL_CAPTURE_COMMAND = "npm run season-simulator:capture-actuals -- --season 2026 --week <WEEK> --dry-run";
export const PROJECTION_FREEZE_COMMAND = "npm run season-simulator:freeze-projections -- --season 2026 --week 2";

export type OperationStatus = "GREEN" | "BLUE" | "YELLOW" | "RED" | "GRAY";
export type WeeklyOperationIssue = { code: string; severity: "INFO" | "WARNING" | "ERROR"; workstream: string; season: number; week: number | null; message: string; recommendedAction: string };

export type WeeklyOperationsSnapshot = {
  season: number; currentWeek: number | null; displayWeek: number | null; lastScoredLeg: number | null; leagueStatus: string; generatedAtEastern: string;
  matchups: { week: number | null; status: string; statusLevel: OperationStatus; teamCount: number; numericScores: number; polling: boolean; intervalSeconds: number; message: string };
  settlement: { week: number | null; status: string; statusLevel: OperationStatus; winner: string | null; score: number | null; prize: number | null; documentId: string | null; schedule: string; timezone: string; message: string };
  recap: { week: number | null; status: string; statusLevel: OperationStatus; title: string | null; excerpt: string | null; message: string };
  actuals: { week: number; status: string; path: string | null; playerRows: number; teamRows: number; calibration: string; message: string };
  postFinality: { residual: string; calibration: string; recapDraft: string; message: string };
  freeze: { week: number; status: string; statusLevel: OperationStatus; windowOpen: string | null; firstKickoff: string | null; command: string; message: string };
  predictor: { status: string; readiness: string; shadowStatus: string; baselineWeek1: boolean; actualWeek1: boolean; residualWeek1: boolean; baselineWeek2: boolean; actualWeek2: boolean; message: string };
  health: { headline: string; lifecycle: string; actionRequired: boolean; durableEvidence: string; scheduler: string; schedulerStatus: WeeklyOperationRunHealth["status"]; lastSuccessfulRunAt: string | null; lastFailedRunAt: string | null; failureReason: string | null; affectedSystems: readonly string[] };
  issues: WeeklyOperationIssue[]; checklist: Array<{ status: OperationStatus; label: string; detail: string; command?: string }>;
};

function easternNow(now: Date) { return new Intl.DateTimeFormat("en-US", { timeZone: SETTLEMENT_TIMEZONE, dateStyle: "full", timeStyle: "short" }).format(now); }
async function actualArtifact(week: number) {
  const directory = path.join(process.cwd(), ".local-calibration");
  const prefix = `${OPERATIONS_SEASON}-week-${String(week).padStart(2, "0")}-actual-evidence-`;
  const files = await fs.readdir(directory).catch(() => [] as string[]);
  const file = files.find(name => name.startsWith(prefix) && name.endsWith(".json"));
  if (!file) return null;
  try { return { file: path.join(directory, file), data: JSON.parse(await fs.readFile(path.join(directory, file), "utf8")) as Record<string, unknown> }; } catch { return null; }
}
async function authoritativeProjectionArtifact(week: number) {
  const directory = path.join(process.cwd(), ".local-calibration");
  const prefix = `${OPERATIONS_SEASON}-week-${String(week).padStart(2, "0")}-projection-evidence-`;
  const files = await fs.readdir(directory).catch(() => [] as string[]);
  for (const file of files.filter(name => name.startsWith(prefix) && name.endsWith(".json"))) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(directory, file), "utf8")) as Record<string, unknown>;
      if (data.capturePurpose === "CALIBRATION_BASELINE" && data.capturedWithinApprovedWindow === true && data.season === OPERATIONS_SEASON && data.week === week) return { file: path.join(directory, file), data };
    } catch { /* malformed diagnostics are not authoritative */ }
  }
  return null;
}

export async function buildWeeklyOperationsSnapshot(now = new Date()): Promise<WeeklyOperationsSnapshot> {
  const [state, league] = await Promise.all([getNFLState(), getLeagueInfo(LEAGUE_ID, { fresh: true })]);
  const currentWeekValue = Number.isInteger(state.week) ? state.week : 2;
  const [currentRows, settlements, publishedRecaps, artifact, baseline] = await Promise.all([
    getMatchups(currentWeekValue, LEAGUE_ID),
    listWeeklyHighScoreSettlements(OPERATIONS_SEASON), listPublishedWeeklyRecaps(OPERATIONS_SEASON), actualArtifact(1), authoritativeProjectionArtifact(2),
  ]);
  const predictorProgress = await getPredictorCalibrationProgress().catch(() => null);
  const schedulerHealth = await readWeeklyOperationRunHealth(OPERATIONS_SEASON).catch((): WeeklyOperationRunHealth => ({ status: "UNKNOWN", latestRun: null, lastSuccessfulRunAt: null, lastFailedRunAt: null, failureReason: null, affectedSystems: [] }));
  const currentWeek = Number.isInteger(state.week) ? state.week : null;
  const displayWeek = Number.isInteger((state as { display_week?: number }).display_week) ? (state as { display_week?: number }).display_week! : null;
  const lastScoredLeg = typeof league.settings?.last_scored_leg === "number" ? league.settings.last_scored_leg : null;
  const finalizedWeek = lastScoredLeg ?? (currentWeek && currentWeek > 1 ? currentWeek - 1 : null);
  const settled = settlements.sort((a, b) => b.week - a.week)[0] ?? null;
  const recap = publishedRecaps.sort((a, b) => b.week - a.week)[0] ?? null;
  const numericScores = currentRows.filter(row => typeof row.points === "number" && Number.isFinite(row.points)).length;
  const currentComplete = league.status === "complete" || (currentWeek !== null && lastScoredLeg === currentWeek);
  const winnerTeam = settled ? canonicalAuctionTeams.find(team => settled.winnerFranchiseIds.includes(team.franchiseId)) : null;
  const freezeDecision = evaluateFreezeWindow(OPERATIONS_SEASON, 2, now);
  const freezeWindow = getApprovedFreezeWindow(OPERATIONS_SEASON, 2);
  const issues: WeeklyOperationIssue[] = [];
  if (!currentComplete) issues.push({ code: "MATCHUPS_INCOMPLETE", severity: "INFO", workstream: "MATCHUPS", season: OPERATIONS_SEASON, week: currentWeek, message: `Week ${currentWeek ?? "current"} remains provisional; ${numericScores}/${currentRows.length || 12} score rows are numeric.`, recommendedAction: "Monitor the live Matchups page; no commissioner action is required." });
  if (!baseline && !freezeDecision.eligible) issues.push({ code: freezeDecision.reason, severity: freezeDecision.reason === "BEFORE_APPROVED_FREEZE_WINDOW" ? "INFO" : "WARNING", workstream: "PREDICTOR", season: OPERATIONS_SEASON, week: 2, message: `Week 2 projection freeze is ${freezeDecision.reason === "BEFORE_APPROVED_FREEZE_WINDOW" ? "not open" : "not eligible"}.`, recommendedAction: "Do not run the freeze command until the approved window and evidence checks pass." });
  if (schedulerHealth.status === "ERROR") issues.push({ code: "SCHEDULER_RUNTIME_FAILURE", severity: "ERROR", workstream: "AUTOMATION", season: OPERATIONS_SEASON, week: schedulerHealth.latestRun?.week ?? null, message: `Latest persisted ${schedulerHealth.latestRun?.operation ?? "weekly operation"} run failed: ${schedulerHealth.failureReason ?? schedulerHealth.latestRun?.result ?? "unknown failure"}.`, recommendedAction: "Repair the scheduler/runtime path; no manual settlement or publication is authorized." });
  const lifecycle = baseline ? (currentComplete ? "FINALIZED" : "WEEK_LIVE") : freezeDecision.eligible ? "PROJECTION_FREEZE_READY" : "PRE_WEEK";
  const schedulerLabel = schedulerHealth.status === "ERROR"
    ? `${SETTLEMENT_FUNCTION_NAME} configured · runtime failure detected · last failed ${schedulerHealth.lastFailedRunAt ?? "unknown"}`
    : schedulerHealth.status === "UNKNOWN"
      ? `${SETTLEMENT_FUNCTION_NAME} configured · scheduler run history unavailable`
    : `${SETTLEMENT_FUNCTION_NAME} configured · ${SETTLEMENT_SCHEDULE} · ${SETTLEMENT_TIMEZONE}`;
  return {
    season: OPERATIONS_SEASON, currentWeek, displayWeek, lastScoredLeg, leagueStatus: league.status ?? "unknown", generatedAtEastern: easternNow(now),
    matchups: { week: currentWeek, status: currentComplete ? "FINALIZED" : numericScores ? "LIVE / PROVISIONAL" : "PRE-GAME / PROVISIONAL", statusLevel: currentComplete ? "GREEN" : "YELLOW", teamCount: currentRows.length, numericScores, polling: !currentComplete, intervalSeconds: MATCHUP_POLL_INTERVAL_MS / 1000, message: currentComplete ? "Finalized weeks do not poll." : "The active incomplete week polls every 60 seconds; hidden tabs skip scheduled refreshes." },
    settlement: { week: settled?.week ?? null, status: settled ? "SETTLED" : "NOT_SETTLED", statusLevel: settled ? "GREEN" : "YELLOW", winner: winnerTeam ? `${winnerTeam.teamName} · ${winnerTeam.ownerNames.join(" / ")}` : settled?.winnerFranchiseIds.join(", ") ?? null, score: settled?.highScore ?? null, prize: settled?.prizePerWinner ?? null, documentId: settled ? `${settled.season}:week-${String(settled.week).padStart(2, "0")}` : null, schedule: SETTLEMENT_SCHEDULE, timezone: SETTLEMENT_TIMEZONE, message: settled ? "Persisted settlement is the source of truth; scheduler is idempotent." : "No persisted settlement is available." },
    recap: { week: recap?.week ?? finalizedWeek, status: recap ? "PUBLISHED" : finalizedWeek ? "READY TO GENERATE DRAFT" : "NOT_READY", statusLevel: recap ? "GREEN" : finalizedWeek ? "BLUE" : "GRAY", title: recap?.title ?? null, excerpt: recap?.excerpt ?? null, message: recap ? "Published recap is read-only here. Editorial approval and publication remain manual." : "Draft generation remains a separate commissioner action; no page-load write is performed." },
    actuals: { week: 1, status: artifact ? "CAPTURED" : "READY TO CAPTURE", path: artifact?.file ?? null, playerRows: Array.isArray(artifact?.data.playerActuals) ? artifact!.data.playerActuals.length : 0, teamRows: Array.isArray(artifact?.data.matchupResults) ? artifact!.data.matchupResults.length : 0, calibration: artifact?.data.calibrationEligibility === "INELIGIBLE_PATH_C" ? "INELIGIBLE / PATH C" : "UNKNOWN", message: artifact ? "Week 1 actual player and team evidence exists; it cannot form a residual calibration pair." : "Capture is read-only/dry-run capable; use the command below only when authorized." },
    postFinality: { residual: artifact?.data.calibrationEligibility === "INELIGIBLE_PATH_C" ? "NOT APPLICABLE / PATH C" : "WAITING", calibration: "CALIBRATING", recapDraft: recap ? "PUBLISHED RECAP EXISTS" : finalizedWeek ? "REVIEW DRAFT PENDING" : "NOT_READY", message: artifact?.data.calibrationEligibility === "INELIGIBLE_PATH_C" ? "Week 1 is protected: no reconstructed projection, residual, or calibration pair is permitted." : "Finalized weeks progress automatically; editorial recap publication remains manual." },
    freeze: { week: 2, status: baseline ? "COMPLETE" : freezeDecision.eligible ? "READY TO FREEZE" : freezeDecision.reason === "BEFORE_APPROVED_FREEZE_WINDOW" ? "NOT OPEN" : "CLOSED / NOT ELIGIBLE", statusLevel: baseline ? "GREEN" : freezeDecision.eligible ? "BLUE" : "YELLOW", windowOpen: freezeWindow?.windowOpen ?? null, firstKickoff: freezeWindow?.firstKickoff ?? null, command: PROJECTION_FREEZE_COMMAND, message: baseline ? `Authoritative baseline recognized: ${baseline.file}` : freezeDecision.eligible ? "Window is open, but this control plane never runs the freeze." : "No authoritative Week 2 baseline currently exists; the Sep 11 diagnostic remains non-authoritative." },
    predictor: { status: predictorProgress?.readiness ?? "CALIBRATING", readiness: predictorProgress?.readiness ?? "CALIBRATING", shadowStatus: predictorProgress?.readiness === "SHADOW_READY" ? "10,000-run validation ready/current" : predictorProgress?.readiness === "PRODUCTION_READY" ? "PRODUCTION READY" : "No shadow result eligible", baselineWeek1: false, actualWeek1: Boolean(artifact), residualWeek1: false, baselineWeek2: Boolean(baseline), actualWeek2: false, message: predictorProgress?.projectedStandingsReason ?? "Week 1 PATH C actuals are historical-only. Week 2 probabilities remain gated until valid residual evidence exists." },
    health: { headline: schedulerHealth.status === "ERROR" ? "SCHEDULER NEEDS ATTENTION" : schedulerHealth.status === "UNKNOWN" ? "SCHEDULER STATUS UNKNOWN" : "ALL SYSTEMS GREEN", lifecycle, actionRequired: false, durableEvidence: "DESIGN READY · PRODUCTION STORAGE NOT YET ACTIVATED", scheduler: schedulerLabel, schedulerStatus: schedulerHealth.status, lastSuccessfulRunAt: schedulerHealth.lastSuccessfulRunAt, lastFailedRunAt: schedulerHealth.lastFailedRunAt, failureReason: schedulerHealth.failureReason, affectedSystems: schedulerHealth.affectedSystems },
    issues, checklist: [
      { status: currentComplete ? "GREEN" : "GREEN", label: "Monitor current Matchups", detail: currentComplete ? "Final scores are available; polling is off." : "Week 2 is provisional and polling is configured." },
      { status: settled ? "GREEN" : "YELLOW", label: "Weekly high-score settlement", detail: settled ? "Week 1 settlement is already persisted." : "Await finalized scoring and the Tuesday automation window." },
      { status: recap ? "GREEN" : finalizedWeek ? "BLUE" : "GRAY", label: "Commissioner recap", detail: recap ? "Week 1 publication exists." : "Generate a read-only draft preview, then approve manually." },
      { status: baseline ? "GREEN" : "YELLOW", label: "Week 2 projection freeze", detail: baseline ? "Authoritative baseline is complete and immutable; no refreeze." : "No authoritative baseline exists; execute only in the approved window after all checks pass.", command: baseline ? undefined : PROJECTION_FREEZE_COMMAND },
      { status: artifact ? "GREEN" : "BLUE", label: "Capture finalized actuals", detail: artifact ? "Week 1 actual evidence is captured as Path C." : "Capture after finality; do not pair Week 1 with reconstructed projections.", command: ACTUAL_CAPTURE_COMMAND },
    ],
  };
}
