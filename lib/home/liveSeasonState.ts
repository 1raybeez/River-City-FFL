import "server-only";

import { franchisesById, ownerProfilesById } from "@/lib/managers/identityData";
import { getLeagueInfo, getLeagueRosters, getLeagueUsers, getMatchups, getNFLState } from "@/lib/sleeper";
import { buildCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentity";
import { resolveWeeklyFinality, type WeeklyFinality, type WeeklyScoreEvidence } from "@/lib/home/weeklyFinality";
import { selectWeeklyHighScore, type WeeklyHighScoreCandidate } from "@/lib/home/weeklyHighScore";
import { getWeeklyHighScoreSettlement } from "@/lib/weeklyHighScoreSettlement";

export type HomeWeeklyHighScoreWinner = WeeklyHighScoreCandidate;

export type HomeLiveSeasonState = {
  activeWeek: number;
  phase: "PRESEASON" | "WEEK_ACTIVE" | "PLAYOFFS" | "CHAMPIONSHIP_WEEK";
  finality: WeeklyFinality;
  weeklyHighScore: HomeWeeklyHighScoreWinner[];
  weeklyHighScorePrizeCents: number | null;
  playoffWeekStart: number | null;
  seasonType: string | null;
};

function sleeperAvatar(avatar: string | null | undefined) {
  return avatar?.trim() ? `https://sleepercdn.com/avatars/thumbs/${avatar.trim()}` : null;
}

function ownerDisplay(franchiseId: string) {
  const franchise = franchisesById[franchiseId];
  if (!franchise) return { ownerNames: [] as string[], ownerPhoto: null as string | null };
  const owners = franchise.activeOwnerIds.flatMap((ownerId) => {
    const owner = ownerProfilesById[ownerId];
    return owner ? [{ name: owner.fullName, photo: owner.photo ?? null }] : [];
  });
  return {
    ownerNames: owners.map((owner) => owner.name),
    ownerPhoto: owners.find((owner) => owner.photo)?.photo ?? null,
  };
}

export async function getHomeLiveSeasonState(): Promise<HomeLiveSeasonState> {
  const [state, league] = await Promise.all([getNFLState(), getLeagueInfo()]);
  const activeWeek = Math.max(1, Math.floor(Number(state.week) || 1));
  const configuredPlayoffWeekStart = league.settings.playoff_week_start;
  const playoffWeekStart = typeof configuredPlayoffWeekStart === "number" && Number.isInteger(configuredPlayoffWeekStart)
    ? configuredPlayoffWeekStart
    : null;
  const seasonType = (state as { season_type?: string }).season_type ?? null;
  const phase = seasonType === "post" || (playoffWeekStart !== null && activeWeek >= playoffWeekStart) ? "PLAYOFFS" as const : "WEEK_ACTIVE" as const;
  const settledWeek = activeWeek - 1;
  if (settledWeek > 0) {
    const settlement = await getWeeklyHighScoreSettlement(2026, settledWeek).catch(() => null);
    if (settlement) {
      const [rosters, users] = await Promise.all([getLeagueRosters(), getLeagueUsers()]);
      const identities = buildCurrentSeasonTeamIdentityMap({ users, rosters });
      const winners = settlement.winnerFranchiseIds.flatMap((franchiseId) => {
        const identity = identities.get(franchiseId);
        const franchise = franchisesById[franchiseId];
        if (!identity || !franchise) return [];
        const display = ownerDisplay(franchiseId);
        const user = users.find((entry) => String(entry.user_id) === identity.sleeperUserId);
        return [{ franchiseId, teamName: identity.currentTeamName, ownerNames: display.ownerNames.length ? display.ownerNames : [user?.display_name ?? "River City owner"], ownerPhoto: display.ownerPhoto, sleeperAvatar: sleeperAvatar(user?.avatar), points: settlement.highScore, week: settlement.week } satisfies HomeWeeklyHighScoreWinner];
      });
      if (winners.length === settlement.winnerFranchiseIds.length) {
        return { activeWeek, phase, finality: { activeWeek, finalizedWeek: settlement.week, finalizedWeeks: [settlement.week], statCorrectionBufferWeeks: 1 }, weeklyHighScore: winners, weeklyHighScorePrizeCents: settlement.prizePerWinner, playoffWeekStart, seasonType };
      }
    }
  }
  const candidateWeeks = Array.from({ length: Math.max(0, activeWeek - 2) }, (_, index) => index + 1);
  const matchupSets = await Promise.all(candidateWeeks.map(async (week) => ({ week, matchups: await getMatchups(week) })));
  const evidence: WeeklyScoreEvidence[] = matchupSets.map(({ week, matchups }) => ({
    week,
    matchupCount: matchups.length,
    scoredMatchupCount: matchups.filter((matchup) => typeof matchup.points === "number" && Number.isFinite(matchup.points)).length,
  }));
  const finality = resolveWeeklyFinality(activeWeek, evidence);
  if (finality.finalizedWeek === null) {
    return { activeWeek, phase, finality, weeklyHighScore: [], weeklyHighScorePrizeCents: null, playoffWeekStart, seasonType };
  }

  const finalizedWeek = finality.finalizedWeek;
  const finalizedMatchups = matchupSets.find(({ week }) => week === finalizedWeek)?.matchups ?? [];
  const [rosters, users] = await Promise.all([getLeagueRosters(), getLeagueUsers()]);
  const identities = buildCurrentSeasonTeamIdentityMap({ users, rosters });
  const usersById = new Map(users.map((user) => [String(user.user_id), user]));
  const candidates: HomeWeeklyHighScoreWinner[] = finalizedMatchups
    .filter((matchup) => typeof matchup.points === "number" && Number.isFinite(matchup.points))
    .flatMap((matchup) => {
      const identity = identities.get([...identities.entries()].find(([, value]) => value.rosterId === matchup.roster_id)?.[0] ?? "");
      const franchise = identity ? franchisesById[identity.franchiseId] : null;
      const user = usersById.get(identity?.sleeperUserId ?? "");
      const display: { ownerNames: string[]; ownerPhoto: string | null } = identity
        ? ownerDisplay(identity.franchiseId)
        : { ownerNames: [], ownerPhoto: null };
      if (!identity || !franchise) return [];
      return [{
        franchiseId: identity.franchiseId,
        teamName: identity.currentTeamName,
        ownerNames: display.ownerNames.length ? display.ownerNames : [user?.display_name ?? "River City owner"],
        ownerPhoto: display.ownerPhoto,
        sleeperAvatar: sleeperAvatar(user?.avatar),
        points: matchup.points as number,
        week: finalizedWeek,
      } satisfies HomeWeeklyHighScoreWinner];
    });
  const winner = selectWeeklyHighScore(candidates);

  return { activeWeek, phase, finality, weeklyHighScore: winner, weeklyHighScorePrizeCents: null, playoffWeekStart, seasonType };
}
