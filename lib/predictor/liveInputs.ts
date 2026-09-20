import { getLeagueInfo, getLeagueRosters, getMatchups, getNFLState, type Matchup } from "@/lib/sleeper";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { RIVER_CITY_2026_RULES, normalizeSimulationSchedule, type ScheduleIntegrity } from "@/lib/seasonSimulator/prerequisites";
import type { ProjectedScheduleGame, ProjectedStandingTeam } from "./projectedStandings";

export type LiveStandingInput = Readonly<ProjectedStandingTeam & { rosterId: number }>;
export type LiveScheduleInput = Readonly<{ season: number; throughWeek: number; schedule: ScheduleIntegrity; remaining: readonly ProjectedScheduleGame[]; expectedScoreSource: "DURABLE_CANONICAL" | "UNAVAILABLE" }>;
export type LivePredictorInputs = Readonly<{ season: number; currentWeek: number; lastScoredLeg: number | null; standings: readonly LiveStandingInput[]; schedule: LiveScheduleInput }>;

function numberValue(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function points(settings: Record<string, unknown> | undefined, ...keys: string[]) { for (const key of keys) { const value = Number(settings?.[key]); if (Number.isFinite(value)) return value; } return 0; }
function matchupRows(rows: readonly Matchup[], week: number) { return rows.map(row => ({ week, matchupId: Number.isInteger(row.matchup_id) ? row.matchup_id! : null, rosterId: Number.isInteger(row.roster_id) ? row.roster_id : null, opponentRosterId: null, points: typeof row.points === "number" && Number.isFinite(row.points) ? row.points : null })); }

export async function loadCanonicalLivePredictorInputs(): Promise<LivePredictorInputs> {
  const [state, league, rosters] = await Promise.all([getNFLState(), getLeagueInfo(undefined, { fresh: true }), getLeagueRosters(undefined, { fresh: true })]);
  const season = Number(league.season ?? state.season);
  const currentWeek = Number(state.week);
  if (season !== RIVER_CITY_2026_RULES.season || !Number.isInteger(currentWeek)) throw new Error("Unsupported or unresolved River City season/week.");
  const byRoster = new Map<number, (typeof canonicalAuctionTeams)[number]>(canonicalAuctionTeams.map(team => [Number(team.rosterId), team]));
  const standings = rosters.map(roster => {
    const rosterId = Number(roster.roster_id);
    const team = byRoster.get(rosterId);
    if (!team) throw new Error(`Missing canonical franchise identity for roster ${rosterId}.`);
    const settings = (roster.settings ?? {}) as Record<string, unknown>;
    return { rosterId, franchiseId: team.franchiseId, teamName: team.teamName, wins: numberValue(settings.wins), losses: numberValue(settings.losses), ties: numberValue(settings.ties), pointsFor: points(settings, "fpts", "fpts_decimal"), pointsAgainst: points(settings, "fpts_against", "fpts_against_decimal") };
  }).sort((a, b) => a.rosterId - b.rosterId);
  if (standings.length !== RIVER_CITY_2026_RULES.teams || new Set(standings.map(team => team.franchiseId)).size !== RIVER_CITY_2026_RULES.teams) throw new Error("Canonical live standings require exactly 12 unique River City teams.");
  const rawRows = [];
  for (let week = RIVER_CITY_2026_RULES.regularSeasonStartWeek; week <= RIVER_CITY_2026_RULES.regularSeasonEndWeek; week += 1) rawRows.push(...matchupRows(await getMatchups(week), week));
  const schedule = normalizeSimulationSchedule(rawRows, new Map(standings.map(team => [team.rosterId, team.franchiseId])));
  if (!schedule.valid) throw new Error(`Canonical schedule integrity failed: ${schedule.errors.join("; ")}`);
  const remaining = schedule.matchups.filter(game => game.week > currentWeek && game.status === "FUTURE").map(game => ({ week: game.week, firstFranchiseId: game.franchiseA, secondFranchiseId: game.franchiseB, firstExpectedScore: Number.NaN, secondExpectedScore: Number.NaN }));
  return { season, currentWeek, lastScoredLeg: Number.isInteger(Number(league.settings?.last_scored_leg)) ? Number(league.settings.last_scored_leg) : null, standings, schedule: { season, throughWeek: currentWeek, schedule, remaining, expectedScoreSource: "UNAVAILABLE" } };
}
