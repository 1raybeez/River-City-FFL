import crypto from "node:crypto";
import { SIMULATION_COUNTS } from "@/lib/seasonSimulator/prerequisites";
import type { ProjectedScheduleGame, ProjectedStandingTeam } from "./projectedStandings";
import { qualifyCanonicalPlayoffs, simulateCanonicalPlayoffBracket } from "./playoffEngine";
import type { CalibratedVarianceContract } from "./calibratedVariance";

export const SHADOW_SIMULATION_COUNT = SIMULATION_COUNTS.commissionerShadow;
export const SHADOW_RESULT_SCHEMA = "river-city-predictor-shadow-v1" as const;
export type ShadowTeamResult = Readonly<{ franchiseId: string; teamName: string; projectedWins: number; averageProjectedWins: number; projectedLosses: number; projectedFinish: number; playoffProbability: number; championshipProbability: number | null; averagePoints: number; simulationDiagnostics: Readonly<{ winCount: number; playoffCount: number; championshipCount: number }> }>;
export type ShadowResult = Readonly<{ schemaVersion: typeof SHADOW_RESULT_SCHEMA; season: number; throughWeek: number; generatedAt: string; simulationCount: number; inputEvidenceChecksums: readonly string[]; inputIdentities: Readonly<{ standings: string | null; schedule: string | null; expectedScores: string | null; playoffExpectedScores: string | null; calibration: string | null; varianceModel: string }>; varianceSource: "CALIBRATED" | "LEGACY_FIXTURE"; varianceEvidenceIdentity: string | null; varianceEligibleResidualWeeks: readonly number[]; varianceTeamSampleCount: number; readinessState: "SHADOW_READY"; championshipStatus: "READY" | "UNAVAILABLE_EXPECTED_SCORES"; tieResolution: "CANONICAL_NUMERIC" | "SIMULATION_ONLY_STABLE_FRANCHISE_ID"; teamResults: readonly ShadowTeamResult[]; resultId: string }>;
export type ShadowResultStore = { read(resultId: string): Promise<ShadowResult | null>; create(result: ShadowResult): Promise<"CREATED" | "DUPLICATE">; findByInput(input: Pick<ShadowResult, "season" | "throughWeek" | "simulationCount" | "inputEvidenceChecksums">): Promise<ShadowResult | null> };

export class MemoryShadowResultStore implements ShadowResultStore {
  private readonly results = new Map<string, ShadowResult>();
  async read(resultId: string) { return this.results.get(resultId) ?? null; }
  async findByInput(input: Pick<ShadowResult, "season" | "throughWeek" | "simulationCount" | "inputEvidenceChecksums">) { return [...this.results.values()].find(result => result.season === input.season && result.throughWeek === input.throughWeek && result.simulationCount === input.simulationCount && [...result.inputEvidenceChecksums].sort().join("|") === [...input.inputEvidenceChecksums].sort().join("|")) ?? null; }
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

export function runCommissionerShadowSimulation(input: { season: number; throughWeek: number; teams: readonly ProjectedStandingTeam[]; remaining: readonly ProjectedScheduleGame[]; inputEvidenceChecksums: readonly string[]; generatedAt: string; seed?: string; playoffExpectedScores?: Readonly<Record<string, Readonly<Record<string, number>>>>; inputIdentities?: Partial<ShadowResult["inputIdentities"]>; variance?: CalibratedVarianceContract; allowLegacyFixtureVariance?: boolean }): ShadowResult {
  if (input.variance?.status === "UNAVAILABLE") throw new Error("CALIBRATED_VARIANCE_REQUIRED");
  if (!input.variance && !input.allowLegacyFixtureVariance) throw new Error("CALIBRATED_VARIANCE_REQUIRED");
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
    const scores = new Map(input.teams.map(team => [team.franchiseId, { wins: team.wins, losses: team.losses, ties: team.ties ?? 0, points: team.pointsFor, against: team.pointsAgainst }]));
    for (const game of input.remaining) {
      const drawIndex = run * 100 + input.remaining.indexOf(game) * 2;
      const first = input.variance?.sample(game.firstExpectedScore, `${input.seed ?? "shadow"}:regular`, drawIndex) ?? (game.firstExpectedScore + (rand() - 0.5) * Math.max(1, Math.abs(game.firstExpectedScore) * 0.1));
      const second = input.variance?.sample(game.secondExpectedScore, `${input.seed ?? "shadow"}:regular`, drawIndex + 1) ?? (game.secondExpectedScore + (rand() - 0.5) * Math.max(1, Math.abs(game.secondExpectedScore) * 0.1));
      const firstState = scores.get(game.firstFranchiseId)!; const secondState = scores.get(game.secondFranchiseId)!;
      firstState.points += first; secondState.points += second; firstState.against += second; secondState.against += first;
      if (first === second) { firstState.ties += 1; secondState.ties += 1; } else if (first > second) { firstState.wins += 1; secondState.losses += 1; } else { secondState.wins += 1; firstState.losses += 1; }
    }
    const finalStandings = input.teams.map(team => { const score = scores.get(team.franchiseId)!; return { ...team, wins: score.wins, losses: score.losses, ties: score.ties, pointsFor: score.points, pointsAgainst: score.against }; });
    const qualification = qualifyCanonicalPlayoffs(finalStandings, { simulationOnlyStableFranchiseFallback: true });
    const ordered = [...finalStandings].sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor || b.pointsAgainst - a.pointsAgainst || a.franchiseId.localeCompare(b.franchiseId));
    const playoffIds = new Set(qualification.seeds.map(team => team.franchiseId));
    let championId: string | null = null;
    if (input.playoffExpectedScores) {
      let playoffDrawIndex = 0;
      const bracket = simulateCanonicalPlayoffBracket({ qualification: { ...qualification, status: "READY" }, scoreFor: ({ week, first, second }) => { const firstExpected = input.playoffExpectedScores?.[String(week)]?.[first.franchiseId]; const secondExpected = input.playoffExpectedScores?.[String(week)]?.[second.franchiseId]; if (!Number.isFinite(firstExpected) || !Number.isFinite(secondExpected)) throw new Error("Playoff expected scores are unavailable."); const drawIndex = run * 100 + 50 + playoffDrawIndex++ * 2; const firstScore = input.variance?.sample(firstExpected!, `${input.seed ?? "shadow"}:playoff`, drawIndex) ?? (firstExpected! + (rand() - 0.5) * Math.max(1, Math.abs(firstExpected!) * 0.1)); const secondScore = input.variance?.sample(secondExpected!, `${input.seed ?? "shadow"}:playoff`, drawIndex + 1) ?? (secondExpected! + (rand() - 0.5) * Math.max(1, Math.abs(secondExpected!) * 0.1)); return { firstScore, secondScore }; } });
      championId = bracket.champion.franchiseId;
    }
    ordered.forEach((team, index) => { const stat = stats.get(team.franchiseId)!; stat.wins += team.wins; stat.points += team.pointsFor; stat.finishes.push(index + 1); if (playoffIds.has(team.franchiseId)) stat.playoffs += 1; if (championId === team.franchiseId) stat.championships += 1; });
  }
  const championshipStatus = input.playoffExpectedScores ? "READY" as const : "UNAVAILABLE_EXPECTED_SCORES" as const;
  const teamResults = input.teams.map(team => { const stat = stats.get(team.franchiseId)!; const finish = [...stat.finishes].sort((a, b) => a - b)[Math.floor(stat.finishes.length / 2)]; const averageProjectedWins = stat.wins / SHADOW_SIMULATION_COUNT; const projectedWins = Number(averageProjectedWins.toFixed(3)); const projectedLosses = Number((team.losses + (remainingGames.get(team.franchiseId) ?? 0) - averageProjectedWins).toFixed(3)); return { franchiseId: team.franchiseId, teamName: team.teamName, projectedWins, averageProjectedWins, projectedLosses, projectedFinish: finish, playoffProbability: stat.playoffs / SHADOW_SIMULATION_COUNT, championshipProbability: championshipStatus === "READY" ? stat.championships / SHADOW_SIMULATION_COUNT : null, averagePoints: stat.points / SHADOW_SIMULATION_COUNT, simulationDiagnostics: { winCount: stat.wins, playoffCount: stat.playoffs, championshipCount: stat.championships } }; });
  const resultBase = { schemaVersion: SHADOW_RESULT_SCHEMA, season: input.season, throughWeek: input.throughWeek, generatedAt: input.generatedAt, simulationCount: SHADOW_SIMULATION_COUNT, inputEvidenceChecksums: [...input.inputEvidenceChecksums].sort(), inputIdentities: { standings: input.inputIdentities?.standings ?? null, schedule: input.inputIdentities?.schedule ?? null, expectedScores: input.inputIdentities?.expectedScores ?? null, playoffExpectedScores: input.inputIdentities?.playoffExpectedScores ?? null, calibration: input.inputIdentities?.calibration ?? null, varianceModel: input.inputIdentities?.varianceModel ?? input.variance?.modelVersion ?? "legacy-fixture" }, varianceSource: input.variance ? "CALIBRATED" as const : "LEGACY_FIXTURE" as const, varianceEvidenceIdentity: input.variance?.evidenceIdentity ?? null, varianceEligibleResidualWeeks: input.variance?.eligibleResidualWeeks ?? [], varianceTeamSampleCount: input.variance?.teamSampleCount ?? 0, readinessState: "SHADOW_READY" as const, championshipStatus, tieResolution: "SIMULATION_ONLY_STABLE_FRANCHISE_ID" as const, teamResults };
  const stableResultIdentity = Object.fromEntries(Object.entries(resultBase).filter(([key]) => key !== "generatedAt"));
  return { ...resultBase, resultId: crypto.createHash("sha256").update(JSON.stringify(stableResultIdentity)).digest("hex") };
}
