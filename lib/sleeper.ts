import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { MANUAL_HISTORY } from "./manual-history";

// --- CORE CONFIGURATION ---
export const LEAGUE_ID = "1312149033254416384"; // 2026 Season

export const LEAGUE_IDS: Record<number, string> = {
  2026: "1312149033254416384",
  2025: "1199749375539027968",
  2024: "1072545817749331968",
  2023: "997510104398315520",
  2022: "784542934581256192",
  2021: "677751457528762368",
  2020: "530115541505298432",
  2019: "466632190273253376",
  2018: "342868033913540608",
};

const CACHE_OPTIONS = { next: { revalidate: 3600 } } as const;

export interface Transaction {
  transaction_id: string;
  type: string;
  status?: string;
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  draft_picks?: unknown[];
  roster_ids: number[];
  status_updated?: number;
  [key: string]: unknown;
}

export interface Matchup {
  roster_id: number;
  matchup_id?: number;
  points: number;
  starters?: string[];
  players?: string[];
  [key: string]: unknown;
}

export interface BracketSource {
  w?: number | null;
  l?: number | null;
}

export interface BracketMatch {
  r?: number;
  m?: number;
  t1?: number | null;
  t2?: number | null;
  w?: number | null;
  l?: number | null;
  p?: number;
  t1_from?: BracketSource | null;
  t2_from?: BracketSource | null;
  [key: string]: unknown;
}

export interface LeagueInfo {
  settings: {
    leg: number;
    playoff_week_start?: number;
    playoff_teams?: number;
    playoff_seed_type?: number | null;
    playoff_round_type?: number | null;
    playoff_type?: number | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

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
  const fallback = { week: 1, season: "2026" };
  const data = await sleeperFetch<{ week: number; season: string }>(
    "https://api.sleeper.app/v1/state/nfl"
  );
  return data ?? fallback;
}

export async function getLeagueInfo(leagueId: string = LEAGUE_ID) {
  const fallback: LeagueInfo = { settings: { leg: 1 } };
  const data = await sleeperFetch<LeagueInfo>(
    `https://api.sleeper.app/v1/league/${leagueId}`
  );
  return data ?? fallback;
}

export async function getAllPlayers() {
  try {
    const response = await fetch(
      "https://api.sleeper.app/v1/players/nfl",
      CACHE_OPTIONS
    );
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
      const firestoreValue = Number(v.totalValueScore || 0);
      const hasFirestoreValue = firestoreValue > 0;
      mergedPlayers[id] = {
        ...s,
        totalValueScore: firestoreValue,
        keeperCost: v.keeperCost || 0,
        valueSource: hasFirestoreValue ? "Firestore" : "Missing",
        generatedAt: v.generatedAt ?? null,
        sourceDetail: v.sourceDetail ?? null,
        sourceVersion: v.sourceVersion ?? null,
        full_name: s.full_name || `${s.first_name} ${s.last_name}`,
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

export async function getLeagueDrafts(year: number = 2026) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];
  const drafts = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/drafts`
  );
  if (!drafts || drafts.length === 0) return [];

  return (
    (await sleeperFetch<any[]>(
      `https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`
    )) ?? []
  );
}

// ---------------------------------------------------------
// ⭐ FIXED: Canonical getTransactions function
// ---------------------------------------------------------
export async function getTransactions(week: number, leagueId: string) {
  const data = await sleeperFetch<Transaction[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`
  );
  return data ?? [];
}

export async function getRecentTransactions(
  leagueId: string = LEAGUE_ID
): Promise<Transaction[]> {
  const state = await getNFLState();
  const week = Math.max(1, Number(state.week) || 1);
  return getTransactions(week, leagueId);
}

// Legacy year-based version (kept for compatibility)
export async function getLeagueTransactions(
  week: number,
  year: number = 2026
) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];
  return getTransactions(week, leagueId);
}

// ---------------------------------------------------------
// ⭐ Awards / Manual History
// ---------------------------------------------------------
export async function getLeagueHistoryAwards() {
  return MANUAL_HISTORY || [];
}

export async function getFullLeagueHistory() {
  return MANUAL_HISTORY || [];
}

// ---------------------------------------------------------
// ⭐ Aliases (safe, no duplicates)
// ---------------------------------------------------------
export const getRosters = getLeagueRosters;
export const getUsers = getLeagueUsers;
export const getAllDrafts = getLeagueDrafts;
export const getLeagueManagers = getLeagueUsers;

// ---------------------------------------------------------
// ⭐ Matchups & Brackets
// ---------------------------------------------------------
export const getMatchups = async (
  week: number,
  leagueId: string = LEAGUE_ID
) => {
  const data = await sleeperFetch<Matchup[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`
  );
  return data ?? [];
};

export const getMatchupsForWeek = getMatchups;

export const getWinnersBracket = async (
  leagueId: string = LEAGUE_ID
) => {
  const data = await sleeperFetch<BracketMatch[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`
  );
  return data ?? [];
};

export const getLosersBracket = async (
  leagueId: string = LEAGUE_ID
) => {
  const data = await sleeperFetch<BracketMatch[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/losers_bracket`
  );
  return data ?? [];
};

export async function getPlayoffBrackets(leagueId: string = LEAGUE_ID) {
  const [winners, losers] = await Promise.all([
    getWinnersBracket(leagueId),
    getLosersBracket(leagueId),
  ]);
  return { winners, losers };
}

export async function getChampionDetails(
  leagueId: string = LEAGUE_ID,
  seasonYear: number = 2025
) {
  const [users, rosters, bracket] = await Promise.all([
    getLeagueUsers(leagueId),
    getLeagueRosters(leagueId),
    getWinnersBracket(leagueId),
  ]);

  const final = bracket.find((match) => match.p === 1);
  const championRosterId = final?.w;
  const championRoster = rosters.find(
    (roster) => roster.roster_id === championRosterId
  );
  const championUser = users.find(
    (user) => user.user_id === championRoster?.owner_id
  );

  if (!championUser) return null;

  return {
    name: championUser.display_name ?? `Champion ${seasonYear}`,
    teamName:
      championUser.metadata?.team_name ??
      championUser.display_name ??
      `Champion ${seasonYear}`,
    avatar: championUser.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${championUser.avatar}`
      : "/River City FFL Logo.JPG",
  };
}
