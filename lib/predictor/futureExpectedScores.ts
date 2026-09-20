import { buildProjectionCandidate, type ProjectionCandidateDependencies } from "@/lib/seasonSimulator/projectionCandidateService";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { checksum } from "@/lib/seasonSimulator/evidenceSnapshot";
import type { ProjectedScheduleGame } from "./projectedStandings";

export const FUTURE_EXPECTED_SCORE_MODEL = "river-city-future-expected-score-fantasypros-weekly-v1" as const;
export type FutureExpectedScore = Readonly<{ season: number; week: number; franchiseId: string; expectedScore: number | null; status: "AVAILABLE" | "UNAVAILABLE"; source: typeof FUTURE_EXPECTED_SCORE_MODEL; sourceAsOf: string | null; evidenceVersion: string | null; reason: string | null }>;
export type FutureExpectedScoreBuild = Readonly<{ rows: readonly FutureExpectedScore[]; inputChecksum: string; available: boolean; unavailableReasons: Readonly<Record<string, string>> }>;

export function buildFutureExpectedScores(input: { season: number; throughWeek: number; remaining: readonly Pick<ProjectedScheduleGame, "week" | "firstFranchiseId" | "secondFranchiseId">[]; scoreFor: (week: number, franchiseId: string) => FutureExpectedScore }): FutureExpectedScoreBuild {
  const keys = new Set<string>();
  const rows: FutureExpectedScore[] = [];
  for (const game of input.remaining) for (const franchiseId of [game.firstFranchiseId, game.secondFranchiseId]) {
    const key = `${game.week}:${franchiseId}`;
    if (keys.has(key)) continue;
    keys.add(key);
    const row = input.scoreFor(game.week, franchiseId);
    if (row.season !== input.season || row.week !== game.week || row.franchiseId !== franchiseId) throw new Error("Future expected-score identity mismatch.");
    rows.push(row);
  }
  const unavailableReasons = Object.fromEntries(rows.filter(row => row.status === "UNAVAILABLE").map(row => [`${row.week}:${row.franchiseId}`, row.reason ?? "UNAVAILABLE"]));
  return { rows, inputChecksum: checksum({ model: FUTURE_EXPECTED_SCORE_MODEL, season: input.season, throughWeek: input.throughWeek, rows }), available: rows.length > 0 && rows.every(row => row.status === "AVAILABLE" && typeof row.expectedScore === "number" && Number.isFinite(row.expectedScore)), unavailableReasons };
}

export async function buildFutureExpectedScoresFromFantasyPros(input: { season: number; throughWeek: number; remaining: readonly Pick<ProjectedScheduleGame, "week" | "firstFranchiseId" | "secondFranchiseId">[]; now: Date; apiKey: string; fetchImpl?: ProjectionCandidateDependencies["fetchImpl"]; sleep?: ProjectionCandidateDependencies["sleep"] }): Promise<FutureExpectedScoreBuild> {
  const weeks = [...new Set(input.remaining.map(game => game.week))].sort((a, b) => a - b);
  const candidates = new Map<number, Awaited<ReturnType<typeof buildProjectionCandidate>>>();
  for (const week of weeks) candidates.set(week, await buildProjectionCandidate({ season: input.season, week, now: input.now, apiKey: input.apiKey, fetchImpl: input.fetchImpl, sleep: input.sleep }));
  const rosterToFranchise = new Map(canonicalAuctionTeams.map(team => [String(team.rosterId), team.franchiseId]));
  const scoreMap = new Map<string, FutureExpectedScore>();
  for (const [week, candidate] of candidates) for (const [rosterId, raw] of Object.entries(candidate.artifact.expectedTeamScores)) {
    const franchiseId = rosterToFranchise.get(rosterId) ?? rosterId;
    const value = raw as { expectedScore?: unknown; status?: unknown; reason?: unknown; sourceAsOf?: unknown };
    const expectedScore = typeof value.expectedScore === "number" && Number.isFinite(value.expectedScore) ? value.expectedScore : null;
    scoreMap.set(`${week}:${franchiseId}`, { season: input.season, week, franchiseId, expectedScore, status: expectedScore === null ? "UNAVAILABLE" : "AVAILABLE", source: FUTURE_EXPECTED_SCORE_MODEL, sourceAsOf: typeof value.sourceAsOf === "string" ? value.sourceAsOf : candidate.sourceAsOf, evidenceVersion: candidate.artifact.checksum, reason: expectedScore === null ? String(value.reason ?? "EXPECTED_SCORE_UNAVAILABLE") : null });
  }
  return buildFutureExpectedScores({ season: input.season, throughWeek: input.throughWeek, remaining: input.remaining, scoreFor: (week, franchiseId) => scoreMap.get(`${week}:${franchiseId}`) ?? { season: input.season, week, franchiseId, expectedScore: null, status: "UNAVAILABLE", source: FUTURE_EXPECTED_SCORE_MODEL, sourceAsOf: null, evidenceVersion: null, reason: "NO_CANONICAL_PROJECTION_RECORD" } });
}

export function applyFutureExpectedScores(remaining: readonly ProjectedScheduleGame[], scores: FutureExpectedScoreBuild): readonly ProjectedScheduleGame[] {
  const byKey = new Map(scores.rows.map(row => [`${row.week}:${row.franchiseId}`, row]));
  return remaining.map(game => { const first = byKey.get(`${game.week}:${game.firstFranchiseId}`); const second = byKey.get(`${game.week}:${game.secondFranchiseId}`); return { ...game, firstExpectedScore: first?.expectedScore ?? Number.NaN, secondExpectedScore: second?.expectedScore ?? Number.NaN }; });
}
