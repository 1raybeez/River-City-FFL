import crypto from "node:crypto";
import { SIMULATION_COUNTS } from "@/lib/seasonSimulator/prerequisites";
import type { ProjectedScheduleGame, ProjectedStandingTeam } from "./projectedStandings";

export const SHADOW_SIMULATION_COUNT = SIMULATION_COUNTS.commissionerShadow;
export const SHADOW_RESULT_SCHEMA = "river-city-predictor-shadow-v1" as const;
export type ShadowTeamResult = Readonly<{ franchiseId: string; teamName: string; projectedWins: number; projectedLosses: number; projectedFinish: number; playoffProbability: number; championshipProbability: number; averagePoints: number; simulationDiagnostics: Readonly<{ winCount: number; playoffCount: number; championshipCount: number }> }>;
export type ShadowResult = Readonly<{ schemaVersion: typeof SHADOW_RESULT_SCHEMA; season: number; throughWeek: number; generatedAt: string; simulationCount: number; inputEvidenceChecksums: readonly string[]; readinessState: "SHADOW_READY"; teamResults: readonly ShadowTeamResult[]; resultId: string }>;
export type ShadowResultStore = { read(resultId: string): Promise<ShadowResult | null>; create(result: ShadowResult): Promise<"CREATED" | "DUPLICATE"> };

export class MemoryShadowResultStore implements ShadowResultStore {
  private readonly results = new Map<string, ShadowResult>();
  async read(resultId: string) { return this.results.get(resultId) ?? null; }
  async create(result: ShadowResult) {
    const existing = this.results.get(result.resultId);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(result)) throw new Error("Shadow result conflict.");
      return "DUPLICATE" as const;
    }
    this.results.set(result.resultId, result);
    return "CREATED" as const;
  }
}

type Random = () => number;
function seededRandom(seed: string): Random { let state = crypto.createHash("sha256").update(seed).digest().readUInt32BE(0) || 1; return () => (state = Math.imul(1664525, state) + 1013904223, (state >>> 0) / 4294967296); }

export function runCommissionerShadowSimulation(input: { season: number; throughWeek: number; teams: readonly ProjectedStandingTeam[]; remaining: readonly ProjectedScheduleGame[]; inputEvidenceChecksums: readonly string[]; generatedAt: string; seed?: string }): ShadowResult {
  if (input.teams.length !== 12 || new Set(input.teams.map(team => team.franchiseId)).size !== 12) throw new Error("Shadow simulation requires exactly 12 unique teams.");
  if (input.remaining.some(game => !Number.isFinite(game.firstExpectedScore) || !Number.isFinite(game.secondExpectedScore))) throw new Error("Shadow simulation requires complete expected scores.");
  const rand = seededRandom(input.seed ?? `${input.season}:${input.throughWeek}:${input.inputEvidenceChecksums.join("|")}`);
  const stats = new Map(input.teams.map(team => [team.franchiseId, { wins: 0, points: 0, playoffs: 0, championships: 0, finishes: [] as number[] }]));
  const remainingGames = new Map(input.teams.map(team => [team.franchiseId, 0]));
  for (const game of input.remaining) {
    remainingGames.set(game.firstFranchiseId, (remainingGames.get(game.firstFranchiseId) ?? 0) + 1);
    remainingGames.set(game.secondFranchiseId, (remainingGames.get(game.secondFranchiseId) ?? 0) + 1);
  }
  for (let run = 0; run < SHADOW_SIMULATION_COUNT; run += 1) {
    const scores = new Map(input.teams.map(team => [team.franchiseId, { wins: team.wins, points: team.pointsFor }]));
    for (const game of input.remaining) {
      const first = game.firstExpectedScore + (rand() - 0.5) * Math.max(1, Math.abs(game.firstExpectedScore) * 0.1);
      const second = game.secondExpectedScore + (rand() - 0.5) * Math.max(1, Math.abs(game.secondExpectedScore) * 0.1);
      const firstState = scores.get(game.firstFranchiseId)!; const secondState = scores.get(game.secondFranchiseId)!;
      firstState.points += first; secondState.points += second;
      if (first >= second) firstState.wins += 1; else secondState.wins += 1;
    }
    const ordered = [...scores.entries()].sort((a, b) => b[1].wins - a[1].wins || b[1].points - a[1].points || a[0].localeCompare(b[0]));
    ordered.forEach(([id, score], index) => { const stat = stats.get(id)!; stat.wins += score.wins; stat.points += score.points; stat.finishes.push(index + 1); if (index < 6) stat.playoffs += 1; if (index === 0) stat.championships += 1; });
  }
  const teamResults = input.teams.map(team => { const stat = stats.get(team.franchiseId)!; const finish = [...stat.finishes].sort((a, b) => a - b)[Math.floor(stat.finishes.length / 2)]; const projectedWins = team.wins + stat.wins / SHADOW_SIMULATION_COUNT; const projectedLosses = team.losses + (remainingGames.get(team.franchiseId) ?? 0) - stat.wins / SHADOW_SIMULATION_COUNT; return { franchiseId: team.franchiseId, teamName: team.teamName, projectedWins: Number(projectedWins.toFixed(3)), projectedLosses: Number(projectedLosses.toFixed(3)), projectedFinish: finish, playoffProbability: stat.playoffs / SHADOW_SIMULATION_COUNT, championshipProbability: stat.championships / SHADOW_SIMULATION_COUNT, averagePoints: stat.points / SHADOW_SIMULATION_COUNT, simulationDiagnostics: { winCount: stat.wins, playoffCount: stat.playoffs, championshipCount: stat.championships } }; });
  const resultBase = { schemaVersion: SHADOW_RESULT_SCHEMA, season: input.season, throughWeek: input.throughWeek, generatedAt: input.generatedAt, simulationCount: SHADOW_SIMULATION_COUNT, inputEvidenceChecksums: [...input.inputEvidenceChecksums].sort(), readinessState: "SHADOW_READY" as const, teamResults };
  return { ...resultBase, resultId: crypto.createHash("sha256").update(JSON.stringify(resultBase)).digest("hex") };
}
