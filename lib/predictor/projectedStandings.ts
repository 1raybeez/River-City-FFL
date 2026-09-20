export type ProjectedStandingTeam = Readonly<{ franchiseId: string; teamName: string; wins: number; losses: number; pointsFor: number; pointsAgainst: number }>;
export type ProjectedScheduleGame = Readonly<{ week: number; firstFranchiseId: string; secondFranchiseId: string; firstExpectedScore: number; secondExpectedScore: number }>;
export type ProjectedStanding = Readonly<{ franchiseId: string; teamName: string; currentWins: number; currentLosses: number; projectedWins: number; projectedLosses: number; projectedPointsFor: number; projectedPointsAgainst: number; projectedFinish: number }>;

function compare(a: ProjectedStanding, b: ProjectedStanding) {
  return b.projectedWins - a.projectedWins || b.projectedPointsFor - a.projectedPointsFor || b.projectedPointsAgainst - a.projectedPointsAgainst || a.teamName.localeCompare(b.teamName);
}

export function buildDeterministicProjectedStandings(teams: readonly ProjectedStandingTeam[], remaining: readonly ProjectedScheduleGame[]): readonly ProjectedStanding[] {
  if (teams.length !== 12 || new Set(teams.map(team => team.franchiseId)).size !== 12) throw new Error("Projected standings require exactly 12 unique teams.");
  const byId = new Map(teams.map(team => [team.franchiseId, team]));
  const totals = new Map(teams.map(team => [team.franchiseId, { ...team, projectedWins: team.wins, projectedLosses: team.losses, projectedPointsFor: team.pointsFor, projectedPointsAgainst: team.pointsAgainst }]));
  for (const game of remaining) {
    const first = totals.get(game.firstFranchiseId);
    const second = totals.get(game.secondFranchiseId);
    if (!first || !second || !Number.isFinite(game.firstExpectedScore) || !Number.isFinite(game.secondExpectedScore)) throw new Error("Projected standings require complete canonical expected scores.");
    first.projectedPointsFor += game.firstExpectedScore;
    first.projectedPointsAgainst += game.secondExpectedScore;
    second.projectedPointsFor += game.secondExpectedScore;
    second.projectedPointsAgainst += game.firstExpectedScore;
    if (game.firstExpectedScore >= game.secondExpectedScore) {
      first.projectedWins += 1;
      second.projectedLosses += 1;
    } else {
      second.projectedWins += 1;
      first.projectedLosses += 1;
    }
  }
  const ordered = [...totals.values()].map(team => ({ franchiseId: team.franchiseId, teamName: byId.get(team.franchiseId)!.teamName, currentWins: team.wins, currentLosses: team.losses, projectedWins: team.projectedWins, projectedLosses: team.projectedLosses, projectedPointsFor: Number(team.projectedPointsFor.toFixed(2)), projectedPointsAgainst: Number(team.projectedPointsAgainst.toFixed(2)), projectedFinish: 0 })).sort(compare);
  return ordered.map((team, index) => ({ ...team, projectedFinish: index + 1 }));
}

export function projectedStandingsEligible(input: { teams: readonly ProjectedStandingTeam[]; remaining: readonly ProjectedScheduleGame[] }) {
  return input.teams.length === 12 && new Set(input.teams.map(team => team.franchiseId)).size === 12 && input.remaining.every(game => [game.firstFranchiseId, game.secondFranchiseId].every(id => input.teams.some(team => team.franchiseId === id)) && Number.isFinite(game.firstExpectedScore) && Number.isFinite(game.secondExpectedScore));
}
