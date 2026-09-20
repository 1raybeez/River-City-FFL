import { RIVER_CITY_2026_RULES } from "@/lib/seasonSimulator/prerequisites";

export type PlayoffStandingInput = Readonly<{ franchiseId: string; teamName: string; wins: number; losses: number; ties?: number; pointsFor: number; pointsAgainst: number }>;
export type CanonicalSeed = Readonly<PlayoffStandingInput & { seed: number }>;
export type PlayoffQualification = Readonly<{ status: "READY" | "COMMISSIONER_PLATFORM_RESOLUTION_REQUIRED"; seeds: readonly CanonicalSeed[]; unresolvedGroups: readonly string[][]; playoffTeamCount: 6; regularSeasonEndWeek: 14; tiebreakers: typeof RIVER_CITY_2026_RULES.regularSeasonTiebreakers }>;
export type BracketGame = Readonly<{ week: 15 | 16 | 17; round: "WILD_CARD" | "SEMIFINAL" | "CHAMPIONSHIP"; firstSeed: number; secondSeed: number; firstFranchiseId: string; secondFranchiseId: string; firstScore: number; secondScore: number; winnerSeed: number }>;
export type PlayoffBracketResult = Readonly<{ status: "READY"; champion: CanonicalSeed; games: readonly BracketGame[] }>;

function compare(a: PlayoffStandingInput, b: PlayoffStandingInput) { return b.wins - a.wins || b.pointsFor - a.pointsFor || b.pointsAgainst - a.pointsAgainst || a.teamName.localeCompare(b.teamName) || a.franchiseId.localeCompare(b.franchiseId); }
function numericKey(team: PlayoffStandingInput) { return `${team.wins}|${team.pointsFor.toFixed(2)}|${team.pointsAgainst.toFixed(2)}`; }

export function qualifyCanonicalPlayoffs(teams: readonly PlayoffStandingInput[]): PlayoffQualification {
  if (teams.length !== 12 || new Set(teams.map(team => team.franchiseId)).size !== 12) throw new Error("Canonical playoff qualification requires exactly 12 unique teams.");
  const ordered = [...teams].sort(compare);
  const groups = [...new Set(ordered.map(numericKey))].map(key => ordered.filter(team => numericKey(team) === key));
  const unresolvedGroups = groups.filter(group => group.length > 1).map(group => group.map(team => team.franchiseId));
  const seeds = ordered.slice(0, 6).map((team, index) => ({ ...team, seed: index + 1 }));
  return { status: unresolvedGroups.length ? "COMMISSIONER_PLATFORM_RESOLUTION_REQUIRED" : "READY", seeds, unresolvedGroups, playoffTeamCount: 6, regularSeasonEndWeek: 14, tiebreakers: RIVER_CITY_2026_RULES.regularSeasonTiebreakers };
}

function winner(first: CanonicalSeed, second: CanonicalSeed, firstScore: number, secondScore: number) { return firstScore === secondScore ? (first.seed < second.seed ? first : second) : firstScore > secondScore ? first : second; }

export function simulateCanonicalPlayoffBracket(input: { qualification: PlayoffQualification; scoreFor: (game: { week: 15 | 16 | 17; round: BracketGame["round"]; first: CanonicalSeed; second: CanonicalSeed }) => Readonly<{ firstScore: number; secondScore: number }> }): PlayoffBracketResult {
  if (input.qualification.status !== "READY") throw new Error("Playoff bracket requires resolved canonical seeds.");
  const seeds = new Map(input.qualification.seeds.map(team => [team.seed, team]));
  const games: BracketGame[] = [];
  const play = (week: 15 | 16 | 17, round: BracketGame["round"], first: CanonicalSeed, second: CanonicalSeed) => { const score = input.scoreFor({ week, round, first, second }); if (!Number.isFinite(score.firstScore) || !Number.isFinite(score.secondScore)) throw new Error("Playoff bracket requires finite expected scores."); const game: BracketGame = { week, round, firstSeed: first.seed, secondSeed: second.seed, firstFranchiseId: first.franchiseId, secondFranchiseId: second.franchiseId, firstScore: score.firstScore, secondScore: score.secondScore, winnerSeed: winner(first, second, score.firstScore, score.secondScore).seed }; games.push(game); return winner(first, second, score.firstScore, score.secondScore); };
  const wildCardA = play(15, "WILD_CARD", seeds.get(3)!, seeds.get(6)!);
  const wildCardB = play(15, "WILD_CARD", seeds.get(4)!, seeds.get(5)!);
  const semifinalSeeds = [wildCardA.seed, wildCardB.seed].sort((a, b) => a - b);
  const semifinalA = play(16, "SEMIFINAL", seeds.get(1)!, seeds.get(semifinalSeeds[1])!);
  const semifinalB = play(16, "SEMIFINAL", seeds.get(2)!, seeds.get(semifinalSeeds[0])!);
  const championship = play(17, "CHAMPIONSHIP", semifinalA, semifinalB);
  return { status: "READY", champion: championship, games };
}
