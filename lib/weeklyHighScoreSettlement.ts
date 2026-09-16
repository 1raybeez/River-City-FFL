import { createHash } from "node:crypto";
import { OPERATIONAL_FINANCE_SEASON_2026 } from "@/lib/finance/operationalFinanceRules";
import { activeManagers } from "@/lib/managers/activeManagers";
import { franchisesById } from "@/lib/managers/identityData";

export const WEEKLY_HIGH_SCORE_SETTLEMENTS = "weekly_high_score_settlements" as const;
export const WEEKLY_HIGH_SCORE_SETTLEMENT_SCHEMA = "river-city-weekly-high-score-settlement-v1" as const;
const TEAM_COUNT = 12;

export type WeeklyHighScoreSettlement = Readonly<{
  schemaVersion: typeof WEEKLY_HIGH_SCORE_SETTLEMENT_SCHEMA;
  season: number;
  week: number;
  status: "settled";
  settledAt: string;
  finalityEvidence: Readonly<Record<string, unknown>>;
  winnerFranchiseIds: readonly string[];
  winnerOwnerIds: readonly string[];
  highScore: number;
  prizePool: number;
  prizePerWinner: number;
  tieCount: number;
  source: "SLEEPER";
  sourceAsOf: string;
  checksum: string;
}>;

export type WeeklyHighScoreSettlementCandidate = Readonly<{
  eligible: boolean;
  reason: string | null;
  settlementId: string;
  settlement: WeeklyHighScoreSettlement | null;
  sourceAsOf: string;
  finalityEvidence: Readonly<Record<string, unknown>>;
}>;

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

function checksum(value: unknown) {
  return createHash("sha256").update(stable(value)).digest("hex");
}

export function weeklyHighScoreSettlementId(season: number, week: number) {
  return `${season}:week-${String(week).padStart(2, "0")}`;
}

export function isTuesdayEasternWindow(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long" }).format(now) === "Tuesday";
}

function canonicalRosterMap() {
  return new Map<number, { franchiseId: string; ownerId: string }>(activeManagers.map((manager) => {
    const match = OPERATIONAL_FINANCE_SEASON_2026.financialOwnerMappings.find((mapping) => franchisesById[mapping.franchiseId]?.currentTeamName === manager.teamName);
    if (!match) throw new Error(`No canonical finance mapping exists for roster ${manager.roster}.`);
    return [manager.roster, { franchiseId: match.franchiseId, ownerId: match.financialOwnerId }];
  }));
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sleeper returned HTTP ${response.status} for ${url}.`);
  return await response.json() as T;
}

type SleeperState = { week?: number; season?: string };
type SleeperLeague = { status?: string; season?: string; settings?: { last_scored_leg?: number; leg?: number } };
type SleeperRoster = { roster_id: number; settings?: { wins?: number; losses?: number; ties?: number } };
type SleeperMatchup = { roster_id: number; matchup_id?: number; points?: number };

export async function buildWeeklyHighScoreSettlementCandidate({ season, week, now = new Date() }: { season: number; week: number; now?: Date }): Promise<WeeklyHighScoreSettlementCandidate> {
  if (season !== 2026 || week < 1 || week > 14) throw new Error("Only 2026 Weeks 1–14 support weekly high-score settlement.");
  const leagueId = "1312149033254416384";
  const sourceAsOf = new Date().toISOString();
  const [state, league, rosters, rows] = await Promise.all([
    json<SleeperState>("https://api.sleeper.app/v1/state/nfl"),
    json<SleeperLeague>(`https://api.sleeper.app/v1/league/${leagueId}`),
    json<SleeperRoster[]>(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    json<SleeperMatchup[]>(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
  ]);
  const rosterIds = new Set(rosters.map((roster) => roster.roster_id));
  const scoresComplete = rows.length === TEAM_COUNT && new Set(rows.map((row) => row.roster_id)).size === TEAM_COUNT && rows.every((row) => rosterIds.has(row.roster_id) && typeof row.points === "number" && Number.isFinite(row.points));
  const advanced = league.status === "complete" || (typeof state.week === "number" && state.week > week);
  const lastScoredLeg = league.settings?.last_scored_leg ?? null;
  const canonicalFinal = advanced && scoresComplete && (league.status === "complete" || lastScoredLeg === week);
  const finalityEvidence = { source: "SLEEPER", leagueStatus: league.status ?? null, nflWeek: state.week ?? null, leagueWeek: league.settings?.leg ?? null, lastScoredLeg, expectedTeamCount: TEAM_COUNT, matchupRows: rows.length, numericTeamScores: rows.filter((row) => typeof row.points === "number" && Number.isFinite(row.points)).length, advanced, canonicalFinal, tuesdayEasternWindow: isTuesdayEasternWindow(now) };
  const base = { settlementId: weeklyHighScoreSettlementId(season, week), sourceAsOf, finalityEvidence };
  if (!canonicalFinal) return { ...base, eligible: false, reason: "Week is not supported by advanced Sleeper state, complete 12-team scores, and the canonical finality signal.", settlement: null };
  if (!isTuesdayEasternWindow(now)) return { ...base, eligible: false, reason: "Settlement is restricted to the Tuesday America/New_York review window.", settlement: null };
  const highScore = Math.max(...rows.map((row) => row.points as number));
  const leaders = rows.filter((row) => row.points === highScore);
  if (leaders.length !== 1) return { ...base, eligible: false, reason: "Sleeper supplied a tied top score without a unique official weekly winner; no River City tie fallback is permitted.", settlement: null };
  const identity = canonicalRosterMap().get(leaders[0].roster_id);
  if (!identity) return { ...base, eligible: false, reason: `Roster ${leaders[0].roster_id} has no canonical River City identity.`, settlement: null };
  const recordBase = { schemaVersion: WEEKLY_HIGH_SCORE_SETTLEMENT_SCHEMA, season, week, status: "settled" as const, settledAt: sourceAsOf, finalityEvidence, winnerFranchiseIds: [identity.franchiseId], winnerOwnerIds: [identity.ownerId], highScore, prizePool: 1_000, prizePerWinner: 1_000, tieCount: 0, source: "SLEEPER" as const, sourceAsOf };
  const settlement = { ...recordBase, checksum: checksum(recordBase) };
  return { ...base, eligible: true, reason: null, settlement };
}

export function validateWeeklyHighScoreSettlement(record: WeeklyHighScoreSettlement) {
  const { checksum: actual, ...base } = record;
  if (record.schemaVersion !== WEEKLY_HIGH_SCORE_SETTLEMENT_SCHEMA || record.status !== "settled" || record.prizePool !== 1_000 || record.prizePerWinner !== 1_000 || record.tieCount !== 0 || actual !== checksum(base)) throw new Error("Weekly high-score settlement checksum or policy validation failed.");
  return record;
}

export async function writeWeeklyHighScoreSettlement(candidate: WeeklyHighScoreSettlement) {
  const { firestore } = await import("@/lib/firebaseAdmin");
  validateWeeklyHighScoreSettlement(candidate);
  const ref = firestore.collection(WEEKLY_HIGH_SCORE_SETTLEMENTS).doc(weeklyHighScoreSettlementId(candidate.season, candidate.week));
  return firestore.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) {
      const current = existing.data() as WeeklyHighScoreSettlement;
      if (current.checksum !== candidate.checksum) throw new Error("A conflicting weekly high-score settlement already exists.");
      return { created: false, settlement: current };
    }
    transaction.create(ref, candidate);
    return { created: true, settlement: candidate };
  });
}

export async function getWeeklyHighScoreSettlement(season: number, week: number) {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const snapshot = await firestore.collection(WEEKLY_HIGH_SCORE_SETTLEMENTS).doc(weeklyHighScoreSettlementId(season, week)).get();
  return snapshot.exists ? validateWeeklyHighScoreSettlement(snapshot.data() as WeeklyHighScoreSettlement) : null;
}

export async function listWeeklyHighScoreSettlements(season: number) {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const snapshot = await firestore.collection(WEEKLY_HIGH_SCORE_SETTLEMENTS).where("season", "==", season).get();
  return snapshot.docs
    .map((document) => validateWeeklyHighScoreSettlement(document.data() as WeeklyHighScoreSettlement))
    .sort((first, second) => second.week - first.week);
}
