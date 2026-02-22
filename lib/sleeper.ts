import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { MANUAL_HISTORY } from "./manual-history";

// --- CORE CONFIGURATION ---
export const LEAGUE_ID = '1312149033254416384'; // 2026 Season

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

const CACHE_OPTIONS = { next: { revalidate: 3600 } } as const;

// --- API FETCH HELPERS ---

async function sleeperFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, CACHE_OPTIONS);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Sleeper fetch error: ${url}`, error);
    return null;
  }
}

// --- API FUNCTIONS ---

export async function getNFLState() {
  const fallback = { week: 1, season: '2026' }; // Updated to 2026
  const data = await sleeperFetch<{ week: number; season: string }>(
    'https://api.sleeper.app/v1/state/nfl'
  );
  return data ?? fallback;
}

/**
 * MERGED PLAYER DATA
 * Combines Sleeper API with Firestore 'player_stats' for valuation.
 */
export async function getAllPlayers() {
  try {
    const response = await fetch("https://api.sleeper.app/v1/players/nfl", CACHE_OPTIONS);
    const sleeperPlayers = await response.json();

    const valuationSnap = await getDocs(collection(db, "player_stats"));
    const valuations: Record<string, any> = {};
    valuationSnap.forEach((doc) => {
      valuations[doc.id] = doc.data();
    });

    const mergedPlayers: Record<string, any> = {};
    Object.keys(sleeperPlayers).forEach((id) => {
      const s = sleeperPlayers[id];
      const v = valuations[id] || {};
      mergedPlayers[id] = {
        ...s,
        totalValueScore: v.totalValueScore || 0,
        keeperCost: v.keeperCost || 0,
        full_name: s.full_name || `${s.first_name} ${s.last_name}`
      };
    });
    return mergedPlayers;
  } catch (error) {
    console.error("Error fetching/merging players:", error);
    return {};
  }
}

// --- LEAGUE COMPONENT FETCHERS ---

export async function getLeagueRosters(leagueId: string = LEAGUE_ID) {
  const data = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  return data ?? [];
}

export async function getLeagueUsers(leagueId: string = LEAGUE_ID) {
  const data = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/users`);
  return data ?? [];
}

// NEW: Fetches draft picks for a specific season (Crucial for Keeper Cost)
export async function getLeagueDrafts(year: number = 2026) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];
  const drafts = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/drafts`);
  if (!drafts || drafts.length === 0) return [];
  
  // Get the picks for the first draft found in that season
  return await sleeperFetch<any[]>(`https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`) ?? [];
}

// NEW: Fetches transactions for FAAB analysis
export async function getLeagueTransactions(week: number, year: number = 2026) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];
  return await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`) ?? [];
}

// Aliases for backward compatibility
export const getRosters = getLeagueRosters;
export const getUsers = getLeagueUsers;

export const getMatchups = async (week: number, leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
  return data ?? [];
};

// --- BRACKETS & HISTORY ---

export const getWinnersBracket = async (leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`);
  return data ?? [];
};

export const getLosersBracket = async (leagueId: string = LEAGUE_ID) => {
  const data = await sleeperFetch<any[]>(`https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`);
  return data ?? [];
};