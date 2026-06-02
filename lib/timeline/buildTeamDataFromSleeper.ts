// /lib/timeline/buildTeamDataFromSleeper.ts

import {
  getNFLState,
  getRosters as getLeagueRosters,
  getUsers as getLeagueUsers,
  getMatchups,
  getAllPlayers,
} from "@/lib/sleeper";

import { TeamData, TeamRecord } from "./teamTypes";
import { LeagueData } from "./leagueTypes";
import { buildTeamMeta } from "./buildTeamMeta";

import {
  buildTradeHistoryForLeague,
  NormalizedTrade,
} from "@/lib/timeline/tradeHistoryEngine";

import { calculatePlayerValue } from "@/lib/trade/playerValuations";

// -----------------------------------------------------
// Utility: Compute win percentage
// -----------------------------------------------------
function computeWinPct(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties;
  if (total === 0) return 0;
  return wins / total;
}

// -----------------------------------------------------
// Utility: Build TeamRecord from matchups
// -----------------------------------------------------
function buildTeamRecord(
  rosterId: number,
  matchups: any[]
): { record: TeamRecord; pointsFor: number; pointsAgainst: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  for (const m of matchups) {
    if (m.roster_id !== rosterId) continue;

    const pf = m.points ?? 0;
    const pa = m.opponent_points ?? 0;

    pointsFor += pf;
    pointsAgainst += pa;

    if (pf > pa) wins++;
    else if (pf < pa) losses++;
    else ties++;
  }

  const winPct = computeWinPct(wins, losses, ties);

  const record: TeamRecord = {
    wins,
    losses,
    ties,
    winPct,
    standing: 0,
  };

  return { record, pointsFor, pointsAgainst };
}

// -----------------------------------------------------
// Utility: Compute league-wide averages
// -----------------------------------------------------
function computeLeagueAverages(teams: TeamData[]): LeagueData {
  const teamCount = teams.length || 0;

  const avgPointsFor =
    teamCount > 0
      ? teams.reduce((sum, t) => sum + t.pointsFor, 0) / teamCount
      : 0;

  const avgRosterAge =
    teamCount > 0
      ? teams.reduce((sum, t) => sum + t.rosterAge.avgAge, 0) / teamCount
      : 0;

  return {
    teamCount,
    avgPointsFor,
    avgRosterAge,
  };
}

// -----------------------------------------------------
// Build unified player value map
// (roster players + historical trade players)
// -----------------------------------------------------
async function buildUnifiedPlayerValueMap(
  rosterPlayerIds: string[],
  historicalTrades: NormalizedTrade[]
): Promise<Map<string, number>> {
  const ids = new Set<string>();

  // Add roster players
  rosterPlayerIds.forEach((id) => ids.add(id));

  // Add players from historical trades
  for (const trade of historicalTrades) {
    for (const move of trade.moves) {
      ids.add(move.playerId);
    }
  }

  const valueMap = new Map<string, number>();

  for (const id of ids) {
    try {
      const val = await calculatePlayerValue(id);
      valueMap.set(id, val.totalValueScore);
    } catch {
      valueMap.set(id, 0);
    }
  }

  return valueMap;
}

// -----------------------------------------------------
// MAIN FUNCTION
// -----------------------------------------------------
export async function buildTeamDataFromSleeper(): Promise<{
  league: LeagueData;
  teams: TeamData[];
}> {
  const nflState = await getNFLState();
  const currentWeek = nflState.week ?? 1;

  const [rosters, users, allPlayers] = await Promise.all([
    getLeagueRosters(),
    getLeagueUsers(),
    getAllPlayers(),
  ]);

  const matchups = await getMatchups(currentWeek);

  // -----------------------------------------------------
  // 1. Load ALL historical trades (2018–2025)
  // -----------------------------------------------------
  const seasons = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const leagueId = "1312149033254416384"; // 2026 league ID

  const { trades: historicalTrades, perTeam: perTeamTradeHistory } =
    await buildTradeHistoryForLeague(leagueId, seasons, () => 0);

  // -----------------------------------------------------
  // 2. Build unified player value map
  // -----------------------------------------------------
  const rosterPlayerIds = rosters.flatMap((r: any) => r.players ?? []);
  const valueMap = await buildUnifiedPlayerValueMap(
    rosterPlayerIds,
    historicalTrades
  );

  const getPlayerValue = (id: string) => valueMap.get(id) ?? 0;

  // -----------------------------------------------------
  // 3. Recompute trade history with REAL player values
  // -----------------------------------------------------
  const { perTeam: realTradeHistory } = await buildTradeHistoryForLeague(
    leagueId,
    seasons,
    getPlayerValue
  );

  const tradeHistoryMap = new Map<number, any>();
  realTradeHistory.forEach((t) => tradeHistoryMap.set(t.teamId, t));

  // -----------------------------------------------------
  // 4. Build TeamData objects
  // -----------------------------------------------------
  const teams: TeamData[] = rosters.map((r: any) => {
    const user = users.find((u: any) => u.user_id === r.owner_id);

    const rosterPlayers = (r.players ?? []).map(
      (pid: string) => allPlayers[pid]
    );

    // Roster age
    const ages = rosterPlayers
      .map((p: any) => p?.age)
      .filter((a: any) => typeof a === "number");

    const avgAge =
      ages.length > 0
        ? ages.reduce((sum: number, a: number) => sum + a, 0) / ages.length
        : 0;

    const youthCount = rosterPlayers.filter(
      (p: any) => typeof p?.age === "number" && p.age <= 25
    ).length;

    const veteranCount = rosterPlayers.filter(
      (p: any) => typeof p?.age === "number" && p.age >= 30
    ).length;

    // KeeperValue placeholder (your keeper engine handles this)
    const keeperValue = {
      surplus: 0,
      count: 0,
      avgSurplus: 0,
    };

    // Injuries placeholder (your injury engine handles this)
    const injuries = {
      startersOut: 0,
      totalInjuries: 0,
      impactScore: 0,
    };

    // Real trade history
    const tradeHistory =
      tradeHistoryMap.get(r.roster_id) ?? {
        tradesLast12Months: 0,
        netTalentDelta: 0,
        consolidationMoves: 0,
        rebuildMoves: 0,
      };

    const multiYearFinishes: number[] = [];

    const { record, pointsFor, pointsAgainst } = buildTeamRecord(
      r.roster_id,
      matchups
    );

    const team: TeamData = {
      ownerId: r.owner_id,
      teamName: r.metadata?.team_name ?? user?.display_name ?? "Unknown Team",

      record,
      powerRank: 0,
      pointsFor,
      pointsAgainst,

      injuries,
      keeperValue,
      rosterAge: {
        avgAge,
        veteranCount,
        youthCount,
      },
      tradeHistory,
      multiYearFinishes,
    };

    return team;
  });

  // -----------------------------------------------------
  // 5. Compute league averages + meta
  // -----------------------------------------------------
  const league = computeLeagueAverages(teams);
  buildTeamMeta(teams, league);

  return { league, teams };
}
