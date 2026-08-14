import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { franchisesById } from "@/lib/managers/identityData";

export const CANONICAL_POWER_RANKINGS_SEASON = 2026;
export const CANONICAL_POWER_RANKINGS_LEAGUE_ID = "1312149033254416384";

type SleeperRoster = {
  roster_id?: number | string | null;
  owner_id?: string | number | null;
  players?: unknown;
};

type SleeperUser = {
  user_id?: string | number | null;
  display_name?: string | null;
  avatar?: string | null;
  metadata?: { team_name?: string | null } | null;
};

type PlayerStats = {
  totalValueScore?: unknown;
  sosScore?: unknown;
};

export type CanonicalPowerRankingCoverage = {
  status: "complete" | "partial";
  rosterCount: number;
  playerCount: number;
  valuedPlayerCount: number;
  missingValuePlayerCount: number;
  sosPlayerCount: number;
  missingSosPlayerCount: number;
  unmappedFranchiseCount: number;
  message: string | null;
};

export type CanonicalPowerRankingTeam = {
  franchiseId: string;
  rosterId: number;
  teamName: string;
  avatar: string | null;
  rank: number;
  rosterValue: number;
  averageSOS: number;
  powerScore: number;
  normalizedIndex: number;
  coverage: "complete" | "partial";
  status: "Preseason Outlook";
};

export type CanonicalPowerRankings = {
  season: number;
  generatedAt: string;
  label: "Roster Strength Index";
  teams: CanonicalPowerRankingTeam[];
  coverage: CanonicalPowerRankingCoverage;
  sources: {
    rosters: "Sleeper";
    ownership: "Sleeper";
    playerValues: "Firestore player_stats";
  };
};

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readId(value: unknown) {
  return value === null || value === undefined ? null : String(value).trim() || null;
}

function readPlayers(value: unknown) {
  return Array.isArray(value)
    ? value.map(readId).filter((id): id is string => Boolean(id))
    : [];
}

function readTeamName(user: SleeperUser | undefined) {
  return user?.metadata?.team_name?.trim() || user?.display_name?.trim() || "Unknown Team";
}

function franchiseForRoster(rosterId: number, teamName: string) {
  return Object.values(franchisesById).find(
    (franchise) => franchise.currentSleeperRosterId === rosterId
  ) ?? Object.values(franchisesById).find(
    (franchise) => franchise.currentTeamName === teamName
  ) ?? null;
}

async function fetchSleeper<T>(path: string) {
  const response = await fetch(`https://api.sleeper.app/v1${path}`, {
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Sleeper request failed: ${path}`);
  return (await response.json()) as T;
}

async function readPlayerStats() {
  const snapshot = await firestore.collection("player_stats").get();
  return new Map(
    snapshot.docs.map((document) => [document.id, document.data() as PlayerStats])
  );
}

export function calculateCanonicalPowerRankings({
  rosters,
  users,
  playerStats,
  generatedAt = new Date(0).toISOString(),
}: {
  rosters: readonly SleeperRoster[];
  users: readonly SleeperUser[];
  playerStats: ReadonlyMap<string, PlayerStats>;
  generatedAt?: string;
}): CanonicalPowerRankings {
  const usersById = new Map(
    users.flatMap((user) => {
      const userId = readId(user.user_id);
      return userId ? [[userId, user] as const] : [];
    })
  );
  let playerCount = 0;
  let valuedPlayerCount = 0;
  let missingValuePlayerCount = 0;
  let sosPlayerCount = 0;
  let missingSosPlayerCount = 0;
  let unmappedFranchiseCount = 0;

  const teams = rosters.flatMap((roster) => {
    const rosterIdValue = readNumber(roster.roster_id);
    if (rosterIdValue === null) return [];
    const rosterId = Math.floor(rosterIdValue);
    const owner = usersById.get(readId(roster.owner_id) ?? "");
    const teamName = readTeamName(owner);
    const franchise = franchiseForRoster(rosterId, teamName);
    if (!franchise) unmappedFranchiseCount += 1;

    const playerIds = readPlayers(roster.players);
    playerCount += playerIds.length;
    let rosterValue = 0;
    let sosTotal = 0;
    let rosterMissingValueCount = 0;
    let rosterMissingSosCount = 0;

    playerIds.forEach((playerId) => {
      const stats = playerStats.get(playerId);
      const value = readNumber(stats?.totalValueScore);
      const sos = readNumber(stats?.sosScore);
      if (value === null) {
        missingValuePlayerCount += 1;
        rosterMissingValueCount += 1;
      } else {
        valuedPlayerCount += 1;
        rosterValue += value;
      }
      if (sos === null) {
        missingSosPlayerCount += 1;
        rosterMissingSosCount += 1;
      } else {
        sosPlayerCount += 1;
        sosTotal += sos;
      }
    });

    const averageSOS = playerIds.length > 0
      ? (sosPlayerCount > 0 && playerIds.length > rosterMissingSosCount
        ? sosTotal / (playerIds.length - rosterMissingSosCount)
        : 50)
      : 50;

    return [{
      franchiseId: franchise?.id ?? `sleeper-roster-${rosterId}`,
      rosterId,
      teamName,
      avatar: owner?.avatar ?? null,
      rank: 0,
      rosterValue,
      averageSOS,
      powerScore: (rosterValue * 0.8) + (averageSOS * 2),
      normalizedIndex: 0,
      coverage: rosterMissingValueCount === 0 && rosterMissingSosCount === 0 && Boolean(franchise)
        ? "complete" as const
        : "partial" as const,
      status: "Preseason Outlook" as const,
    }];
  });

  const totalPowerScore = teams.reduce((sum, team) => sum + team.powerScore, 0);
  const rankedTeams = teams
    .map((team) => ({
      ...team,
      normalizedIndex: totalPowerScore > 0
        ? (team.powerScore / totalPowerScore) * 100
        : 0,
    }))
    .sort((first, second) =>
      second.powerScore - first.powerScore || first.rosterId - second.rosterId
    )
    .map((team, index) => ({ ...team, rank: index + 1 }));

  const status = missingValuePlayerCount > 0 || missingSosPlayerCount > 0 || unmappedFranchiseCount > 0
    ? "partial" as const
    : "complete" as const;

  return {
    season: CANONICAL_POWER_RANKINGS_SEASON,
    generatedAt,
    label: "Roster Strength Index",
    teams: rankedTeams,
    coverage: {
      status,
      rosterCount: rosters.length,
      playerCount,
      valuedPlayerCount,
      missingValuePlayerCount,
      sosPlayerCount,
      missingSosPlayerCount,
      unmappedFranchiseCount,
      message: status === "complete"
        ? null
        : "Some player valuation, schedule-strength, or franchise mapping inputs are missing; neutral coverage handling is shown in this index.",
    },
    sources: {
      rosters: "Sleeper",
      ownership: "Sleeper",
      playerValues: "Firestore player_stats",
    },
  };
}

export async function getCanonicalPowerRankings(): Promise<CanonicalPowerRankings> {
  const generatedAt = new Date().toISOString();
  const [rosters, users, playerStats] = await Promise.all([
    fetchSleeper<SleeperRoster[]>(`/league/${CANONICAL_POWER_RANKINGS_LEAGUE_ID}/rosters`),
    fetchSleeper<SleeperUser[]>(`/league/${CANONICAL_POWER_RANKINGS_LEAGUE_ID}/users`),
    readPlayerStats(),
  ]);

  return calculateCanonicalPowerRankings({
    rosters,
    users,
    playerStats,
    generatedAt,
  });
}
