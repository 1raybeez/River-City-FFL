import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";

export type CurrentSeasonTeamIdentity = {
  franchiseId: string;
  ownerId: string;
  rosterId: number;
  sleeperUserId: string;
  canonicalTeamName: string;
  currentTeamName: string;
  avatar: string | null;
};

type TeamIdentityInput = {
  users: readonly {
    user_id?: string | number | null;
    display_name?: string | null;
    avatar?: string | null;
    metadata?: { team_name?: string | null } | null;
  }[];
  rosters: readonly {
    roster_id?: string | number | null;
    owner_id?: string | number | null;
  }[];
};

function text(value: string | number | null | undefined) {
  return value === null || value === undefined ? null : String(value).trim() || null;
}

export function buildCurrentSeasonTeamIdentityMap(input: TeamIdentityInput) {
  const usersById = new Map(input.users.flatMap((user) => {
    const id = text(user.user_id);
    return id ? [[id, user] as const] : [];
  }));
  const rostersById = new Map(input.rosters.flatMap((roster) => {
    const id = text(roster.roster_id);
    return id ? [[id, roster] as const] : [];
  }));

  return new Map<string, CurrentSeasonTeamIdentity>(canonicalAuctionTeams.flatMap((team) => {
    const roster = rostersById.get(String(team.rosterId));
    const sleeperUserId = text(roster?.owner_id) ?? String(team.managerId);
    const user = usersById.get(sleeperUserId);
    const currentTeamName = user?.metadata?.team_name?.trim() || user?.display_name?.trim() || team.teamName;
    return [[team.franchiseId, {
      franchiseId: team.franchiseId,
      ownerId: team.ownerIds[0] ?? team.managerId,
      rosterId: team.rosterId,
      sleeperUserId,
      canonicalTeamName: team.teamName,
      currentTeamName,
      avatar: user?.avatar?.trim() || null,
    }]] as const;
  }));
}
