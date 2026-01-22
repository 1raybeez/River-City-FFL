// lib/sleeper.ts

export const LEAGUE_ID = '1199749375539027968';

// --- MULTI-YEAR LEAGUE ID MAP ---
export const LEAGUE_IDS: Record<number, string> = {
  2026: "1312149033254416384",
  2025: "1199749375539027968",
  2024: "1072545817749331968",
  2023: "997510104398315520",
  2022: "784542934581256192",
  2021: "677751457528762368",
  2020: "530115541505298432",
  2019: "466632190273253376",
  2018: "342868033913540608"
};

// --- TYPES ---
export interface Transaction {
  transaction_id: string;
  created: number;
  type: string;
  status: string;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: any[];
  creator: string;
}

export interface Player {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
}

export interface RecordEntry {
  manager: string;
  avatar: string;
  score: number;
  year: number;
  week: number;
}

export interface CareerEntry {
  manager: string;
  userId?: string;
  avatar: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  potentialPoints: number;
  seasons: number;
}

export interface Award {
  year: number;
  type: 'champion' | 'runner_up' | 'third_place' | 'toilet_bowl';
  manager: string;
  avatar?: string;
}

// --- CACHE BUSTING CONSTANT ---
const CACHE_OPTIONS = { cache: 'no-store' } as const;

// --- CORE FETCH HELPERS ---

async function sleeperFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, CACHE_OPTIONS);
    if (!res.ok) {
      console.error(`Sleeper fetch failed: ${url} - ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Sleeper fetch error: ${url}`, error);
    return null;
  }
}

// --- API FUNCTIONS ---

export async function getNFLState() {
  const fallback = { week: 1, season: '2025' };
  const data = await sleeperFetch<{ week: number; season: string }>(
    'https://api.sleeper.app/v1/state/nfl'
  );
  if (!data) return fallback;
  if (!data.week || !data.season) return fallback;
  return data;
}

export async function getRecentTransactions(): Promise<Transaction[]> {
  try {
    const state = await getNFLState();
    const currentWeek = state.week > 0 ? state.week : 1;

    const promises: Promise<Transaction[]>[] = [];
    for (let i = 1; i <= currentWeek; i++) {
      const url = `https://api.sleeper.app/v1/league/${LEAGUE_ID}/transactions/${i}`;
      const p = sleeperFetch<Transaction[]>(url).then((res) => res ?? []);
      promises.push(p);
    }

    const results = await Promise.all(promises);
    const allTransactions = results.flat();
    return allTransactions.sort((a, b) => b.created - a.created);
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
}

export async function getAllPlayers() {
  const data = await sleeperFetch<Record<string, Player>>(
    'https://api.sleeper.app/v1/players/nfl'
  );
  return data ?? {};
}

export async function getLeagueRosters(leagueId: string = LEAGUE_ID) {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`
  );
  return data ?? [];
}

export async function getLeagueUsers(leagueId: string = LEAGUE_ID) {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/users`
  );
  return data ?? [];
}

export const getRosters = getLeagueRosters;
export const getUsers = getLeagueUsers;

export const getWinnersBracket = async (leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`
  );
  if (!data) throw new Error('Failed to fetch winners bracket');
  return data;
};

export const getLosersBracket = async (leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`
  );
  if (!data) throw new Error('Failed to fetch losers bracket');
  return data;
};

export const getMatchups = async (week: number, leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  if (!data) throw new Error(`Failed to fetch matchups for week ${week}`);
  return data;
};

export const getTransactions = async (week: number, leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
  );
  if (!data) throw new Error(`Failed to fetch transactions for week ${week}`);
  return data;
};

async function fetchUserAvatar(userId: string) {
  if (!userId) return "";
  const data = await sleeperFetch<{ avatar?: string }>(
    `https://api.sleeper.app/v1/user/${userId}`
  );
  if (!data || !data.avatar) return "";
  return `https://sleepercdn.com/avatars/thumbs/${data.avatar}`;
}

// --- HARDCODED STATS ---

export async function fetchAllTimeStats() {
  const highScores: RecordEntry[] = [
    { manager: "Jordan Maslyn", avatar: "", score: 184.44, year: 2024, week: 7 },
    { manager: "Jordan Maslyn", avatar: "", score: 168.08, year: 2024, week: 12 },
    { manager: "MadPanda", avatar: "", score: 162.80, year: 2022, week: 9 },
    { manager: "Tommy Moore", avatar: "", score: 161.42, year: 2021, week: 14 },
    { manager: "drschoppejr", avatar: "", score: 158.20, year: 2023, week: 5 },
    { manager: "Thugnificent", avatar: "", score: 155.10, year: 2019, week: 10 },
  ];

  const lowScores: RecordEntry[] = [
    { manager: "Jordan Maslyn", avatar: "", score: 65.08, year: 2024, week: 8 },
    { manager: "MadPanda", avatar: "", score: 65.10, year: 2022, week: 3 },
    { manager: "stevens247", avatar: "", score: 62.40, year: 2021, week: 6 },
    { manager: "Tommy Moore", avatar: "", score: 58.90, year: 2020, week: 2 },
  ];

  let careerStatsRaw: CareerEntry[] = [
    { manager: "Tommy Moore", userId: "342849293037608960", avatar: "", wins: 68, losses: 35, ties: 0, pointsFor: 11450.50, pointsAgainst: 10200.10, potentialPoints: 12500, seasons: 7 },
    { manager: "Jordan Maslyn", userId: "341412060426436608", avatar: "", wins: 62, losses: 40, ties: 1, pointsFor: 11100.20, pointsAgainst: 10500.40, potentialPoints: 12100, seasons: 7 },
    { manager: "Brian Stevens", userId: "343129212162523136", avatar: "", wins: 59, losses: 44, ties: 0, pointsFor: 10987.65, pointsAgainst: 10100.20, potentialPoints: 11800, seasons: 7 },
    { manager: "Rashad Gresham", userId: "864186418971418624", avatar: "", wins: 55, losses: 48, ties: 0, pointsFor: 10648.78, pointsAgainst: 10400.12, potentialPoints: 11500, seasons: 6 },
    { manager: "Aaron Dogg", userId: "583513420586848256", avatar: "", wins: 53, losses: 50, ties: 0, pointsFor: 10500.10, pointsAgainst: 10600.50, potentialPoints: 11200, seasons: 7 },
    { manager: "Travis Miller", userId: "342831451382841344", avatar: "", wins: 50, losses: 53, ties: 0, pointsFor: 10200.45, pointsAgainst: 10300.22, potentialPoints: 10900, seasons: 7 },
    { manager: "Stan Schoppe", userId: "1260048448384667648", avatar: "", wins: 48, losses: 55, ties: 0, pointsFor: 10150.30, pointsAgainst: 10250.80, potentialPoints: 10850, seasons: 7 },
    { manager: "Doug Fordham", userId: "73400761740312576", avatar: "", wins: 45, losses: 58, ties: 0, pointsFor: 9900.20, pointsAgainst: 10800.10, potentialPoints: 10600, seasons: 7 },
    { manager: "Wade Cameron", userId: "342838548870762496", avatar: "", wins: 42, losses: 61, ties: 0, pointsFor: 9850.10, pointsAgainst: 10950.40, potentialPoints: 10500, seasons: 7 },
    { manager: "JD Dowling", userId: "342850391018356736", avatar: "", wins: 40, losses: 63, ties: 0, pointsFor: 9700.50, pointsAgainst: 11100.60, potentialPoints: 10400, seasons: 7 },
    { manager: "David Besedich", userId: "466663208728391680", avatar: "", wins: 38, losses: 65, ties: 0, pointsFor: 9600.80, pointsAgainst: 11200.90, potentialPoints: 10300, seasons: 7 },
    { manager: "Ray Long", userId: "342828350391230464", avatar: "", wins: 35, losses: 68, ties: 0, pointsFor: 9400.20, pointsAgainst: 11350.50, potentialPoints: 10100, seasons: 7 },
  ];

  const careerStats = await Promise.all(
    careerStatsRaw.map(async (entry) => {
      if (entry.userId) {
        const realAvatar = await fetchUserAvatar(entry.userId);
        return { ...entry, avatar: realAvatar };
      }
      return entry;
    })
  );

  return { highScores, lowScores, careerStats };
}

// --- HISTORICAL WINNERS ENGINE ---

async function fetchLeagueYear(leagueId: string) {
  const leagueData = await sleeperFetch<any>(
    `https://api.sleeper.app/v1/league/${leagueId}`
  );
  if (!leagueData) return null;

  const [winnersBracket, losersBracket, rosters, users] = await Promise.all([
    sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`),
    sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`),
    sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
    sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/users`),
  ]);

  return {
    leagueData,
    winnersBracket: winnersBracket ?? [],
    losersBracket: losersBracket ?? [],
    rosters: rosters ?? [],
    users: users ?? [],
  };
}

export async function getLeagueHistoryAwards() {
  let currentId: string | null = LEAGUE_ID;
  const awards: Award[] = [];

  while (currentId) {
    try {
      const data = await fetchLeagueYear(currentId);
      if (!data) break;

      const { leagueData, winnersBracket, losersBracket, rosters, users } = data;
      const year = parseInt(leagueData.season);

      const ownerMap: Record<number, { name: string; avatar: string | null }> = {};
      rosters.forEach((r: any) => {
        const user = users.find((u: any) => u.user_id === r.owner_id);
        ownerMap[r.roster_id] = {
          name: user ? (user.display_name || "Unknown") : "Unknown",
          avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
        };
      });

      const champMatch = winnersBracket.find((m: any) => m.p === 1);
      if (champMatch) {
        const winner = ownerMap[champMatch.w] || { name: "Unknown", avatar: null };
        const runner = ownerMap[champMatch.l] || { name: "Unknown", avatar: null };
        awards.push({ year, type: 'champion', manager: winner.name, avatar: winner.avatar || undefined });
        awards.push({ year, type: 'runner_up', manager: runner.name, avatar: runner.avatar || undefined });
      }

      const thirdMatch = winnersBracket.find((m: any) => m.p === 3);
      if (thirdMatch) {
        const third = ownerMap[thirdMatch.w] || { name: "Unknown", avatar: null };
        awards.push({ year, type: 'third_place', manager: third.name, avatar: third.avatar || undefined });
      }

      const toiletMatch = losersBracket.find((m: any) => m.p === 1);
      if (toiletMatch) {
        const toilet = ownerMap[toiletMatch.w] || { name: "Unknown", avatar: null };
        awards.push({ year, type: 'toilet_bowl', manager: toilet.name, avatar: toilet.avatar || undefined });
      }

      currentId = leagueData.previous_league_id || null;
      if (year < 2018) break;
    } catch (e) {
      console.error("Error fetching history for league " + currentId, e);
      break;
    }
  }

  return awards;
}

// --- DRAFT HISTORY FETCHING (UPDATED FOR BOARD) ---

export async function getAllDrafts() {
  let currentLeagueId: string | null = LEAGUE_ID;
  const draftsData: {
    year: string;
    draft_id: string;
    settings: any;
    picks: any[];
    teams: Record<number, { name: string; avatar: string | null }>;
    slot_to_roster: Record<number, number>;
  }[] = [];

  while (currentLeagueId) {
    try {
      const league: any = await sleeperFetch<any>(  
        `https://api.sleeper.app/v1/league/${currentLeagueId}`
      );
      if (!league) break;

      const year: string = league.season;

      const drafts = await sleeperFetch<any[]>(
        `https://api.sleeper.app/v1/league/${currentLeagueId}/drafts`
      );
      if (!drafts || drafts.length === 0) {
        if (!league.previous_league_id || year === '2018') break;
        currentLeagueId = league.previous_league_id;
        continue;
      }

      const mainDraft =
        drafts.find((d: any) => d.status === 'complete' && d.settings?.rounds > 3) ||
        drafts[0];

      if (mainDraft) {
        const picks = await sleeperFetch<any[]>(
          `https://api.sleeper.app/v1/draft/${mainDraft.draft_id}/picks`
        ) ?? [];

        const users = await sleeperFetch<any[]>(
          `https://api.sleeper.app/v1/league/${currentLeagueId}/users`
        ) ?? [];

        const rosters = await sleeperFetch<any[]>(
          `https://api.sleeper.app/v1/league/${currentLeagueId}/rosters`
        ) ?? [];

        const userMap: Record<string, any> = {};
        users.forEach((u: any) => {
          userMap[u.user_id] = u;
        });

        const ownerMap: Record<number, { name: string; avatar: string | null }> = {};
        rosters.forEach((r: any) => {
          const user = userMap[r.owner_id];
          ownerMap[r.roster_id] = {
            name: user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`,
            avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
          };
        });

        const slotToRoster: Record<number, number> = {};
        if (mainDraft.draft_order) {
          Object.entries(mainDraft.draft_order).forEach(([rosterIdStr, slot]) => {
            const rId = parseInt(rosterIdStr, 10);
            const s = slot as number;
            slotToRoster[s] = rId;
          });
        }

        draftsData.push({
          year,
          draft_id: mainDraft.draft_id,
          settings: mainDraft.settings,
          picks,
          teams: ownerMap,
          slot_to_roster: slotToRoster,
        });
      }

      if (year === '2018' || !league.previous_league_id) break;
      currentLeagueId = league.previous_league_id;
    } catch (error) {
      console.error(`Error fetching draft for league ${currentLeagueId}:`, error);
      break;
    }
  }

  return draftsData.sort((a, b) => b.year.localeCompare(a.year));
}
