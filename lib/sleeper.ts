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
export type SleeperFetchOptions = { fresh?: boolean; revalidateSeconds?: number };

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
  points?: number;
  starters?: Array<string | null>;
  players?: string[];
  [key: string]: unknown;
}

export interface SleeperPlayerIdentity {
  playerId: string;
  displayName: string | null;
  position: string | null;
  nflTeam: string | null;
  injuryStatus?: string | null;
  avatar?: string | null;
}

type SleeperPlayerDirectoryEntry = {
  player_id?: string | number | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  team?: string | null;
  injury_status?: string | null;
  status?: string | null;
  avatar?: string | null;
};

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
  status?: string | null;
  sport?: string | null;
  season?: string | null;
  draft_id?: string | null;
  league_id?: string | null;
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

export interface SleeperDraft {
  draft_id?: string | null;
  type?: string | null;
  status?: string | null;
  sport?: string | null;
  season?: string | null;
  season_type?: string | null;
  league_id?: string | null;
  start_time?: number | null;
  created?: number | null;
  last_picked?: number | null;
  last_message_time?: number | null;
  draft_order?: Record<string, number> | null;
  slot_to_roster_id?: Record<string, number> | null;
  settings?: {
    budget?: number | null;
    rounds?: number | null;
    teams?: number | null;
    pick_timer?: number | null;
    [key: string]: unknown;
  } | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface SleeperDraftPickMetadata {
  amount?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  team?: string | null;
  position?: string | null;
  player_id?: string | number | null;
  [key: string]: unknown;
}

export interface SleeperDraftPick {
  draft_id?: string | null;
  player_id?: string | number | null;
  picked_by?: string | null;
  roster_id?: string | number | null;
  round?: number | null;
  draft_slot?: number | null;
  pick_no?: number | null;
  is_keeper?: boolean | null;
  metadata?: SleeperDraftPickMetadata | null;
  [key: string]: unknown;
}

export interface NormalizedSleeperAuctionPick {
  draftId: string | null;
  playerId: string | null;
  playerName: string;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  nflTeam: string | null;
  pickedByUserId: string | null;
  rosterId: number | null;
  round: number | null;
  draftSlot: number | null;
  pickNo: number | null;
  isKeeper: boolean | null;
  auctionPrice: number | null;
  rawAuctionAmount: string | number | null;
  hasAuctionPrice: boolean;
  needsAuctionPriceReview: boolean;
}

export interface SleeperAuctionDraftSnapshot {
  year: number;
  leagueId: string | null;
  draft: SleeperDraft | null;
  picks: NormalizedSleeperAuctionPick[];
  status:
    | "ready"
    | "no-league"
    | "no-auction-draft"
    | "missing-draft-id";
  warnings: string[];
  generatedAt: string;
}

// --- API FETCH HELPERS ---

async function sleeperFetch<T>(
  url: string,
  options: SleeperFetchOptions = {}
): Promise<T | null> {
  try {
    const res = await fetch(url, options.fresh ? { cache: "no-store" } : { next: { revalidate: options.revalidateSeconds ?? 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Sleeper fetch error: ${url}`, error);
    return null;
  }
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  const parsed = readNumber(value);
  return parsed === null ? null : Math.max(Math.floor(parsed), 0);
}

function parseSleeperAuctionAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") return null;

  const cleanedValue = value.replace(/[$,]/g, "").trim();
  if (cleanedValue === "") return null;

  const parsed = Number(cleanedValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isSleeperAuctionDraft(draft: SleeperDraft | null | undefined) {
  return draft?.type === "auction";
}

function getDraftTimestamp(draft: SleeperDraft) {
  return readNumber(draft.start_time) ?? readNumber(draft.created) ?? 0;
}

function sortDraftsByRecency(drafts: SleeperDraft[]) {
  return [...drafts].sort(
    (firstDraft, secondDraft) =>
      getDraftTimestamp(secondDraft) - getDraftTimestamp(firstDraft)
  );
}

async function hydrateSleeperDraft(
  draft: SleeperDraft,
  options: SleeperFetchOptions = {}
) {
  const draftId = readString(draft.draft_id);
  if (!draftId) return draft;

  return (await getSleeperDraft(draftId, options)) ?? draft;
}

// --- API FUNCTIONS ---

export async function getNFLState() {
  const fallback = { week: 1, season: "2026" };
  const data = await sleeperFetch<{ week: number; season: string }>(
    "https://api.sleeper.app/v1/state/nfl"
  );
  return data ?? fallback;
}

export async function getLeagueInfo(
  leagueId: string = LEAGUE_ID,
  options: SleeperFetchOptions = {}
) {
  const fallback: LeagueInfo = { settings: { leg: 1 } };
  const data = await sleeperFetch<LeagueInfo>(
    `https://api.sleeper.app/v1/league/${leagueId}`,
    options
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

export async function getSleeperPlayerIdentityDirectory(): Promise<Record<string, SleeperPlayerIdentity>> {
  const players = await sleeperFetch<Record<string, SleeperPlayerDirectoryEntry>>(
    "https://api.sleeper.app/v1/players/nfl"
  );
  if (!players) return {};

  return Object.fromEntries(
    Object.entries(players).map(([key, player]) => {
      const playerId = String(player.player_id ?? key);
      const composedName = [player.first_name, player.last_name]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(" ");
      return [playerId, {
        playerId,
        displayName: typeof player.full_name === "string" && player.full_name.trim()
          ? player.full_name.trim()
          : composedName || null,
        position: typeof player.position === "string" && player.position.trim() ? player.position.trim() : null,
        nflTeam: typeof player.team === "string" && player.team.trim() ? player.team.trim() : null,
        injuryStatus: typeof player.injury_status === "string" && player.injury_status.trim()
          ? player.injury_status.trim()
          : typeof player.status === "string" && /questionable|doubtful|out|ir/i.test(player.status)
            ? player.status.trim()
            : null,
        avatar: typeof player.avatar === "string" && player.avatar.trim() ? player.avatar.trim() : null,
      } satisfies SleeperPlayerIdentity];
    })
  );
}

// --- LEAGUE COMPONENT FETCHERS ---

export async function getLeagueRosters(leagueId: string = LEAGUE_ID, options: SleeperFetchOptions = {}) {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/rosters`,
    options
  );
  return data ?? [];
}

export async function getLeagueUsers(leagueId: string = LEAGUE_ID, options: SleeperFetchOptions = {}) {
  const data = await sleeperFetch<any[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/users`,
    options
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

export async function getSleeperLeagueDrafts(
  year: number = 2026,
  options: SleeperFetchOptions = {}
) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return [];

  const drafts = await sleeperFetch<SleeperDraft[]>(
    `https://api.sleeper.app/v1/league/${leagueId}/drafts`,
    options
  );

  return drafts ?? [];
}

export async function getSleeperDraft(
  draftId: string | null | undefined,
  options: SleeperFetchOptions = {}
) {
  const safeDraftId = readString(draftId);
  if (!safeDraftId) return null;

  return sleeperFetch<SleeperDraft>(
    `https://api.sleeper.app/v1/draft/${safeDraftId}`,
    options
  );
}

export type RiverCityDraftStatus = "pre_draft" | "drafting" | "paused" | "complete" | "unknown";

export async function getRiverCityAuctionDraftStatus(year: number = 2026, options: SleeperFetchOptions = {}) {
  const leagueId = LEAGUE_IDS[year] ?? null;
  if (!leagueId) return { season: year, draftId: null, draftStartAt: null, status: "unknown" as const };

  const league = await getLeagueInfo(leagueId, options);
  const draftId = readString(league.draft_id);
  if (!draftId) return { season: year, draftId: null, draftStartAt: null, status: "unknown" as const };

  const draft = await getSleeperDraft(draftId, options);
  const linkedLeagueMatches = draft?.league_id === leagueId;
  const seasonMatches = draft?.season === String(year);
  const isAuction = draft?.type === "auction";
  if (!draft || !linkedLeagueMatches || !seasonMatches || !isAuction) return { season: year, draftId, draftStartAt: null, status: "unknown" as const };

  const supportedStatus: RiverCityDraftStatus = draft.status === "pre_draft" || draft.status === "drafting" || draft.status === "paused" || draft.status === "complete" ? draft.status : "unknown";
  const draftStartAt = typeof draft.start_time === "number" && Number.isFinite(draft.start_time) ? new Date(draft.start_time).toISOString() : null;
  return { season: year, draftId, draftStartAt, status: supportedStatus };
}

export async function getSleeperDraftPicks(
  draftId: string | null | undefined
) {
  const safeDraftId = readString(draftId);
  if (!safeDraftId) return [];

  const picks = await sleeperFetch<SleeperDraftPick[]>(
    `https://api.sleeper.app/v1/draft/${safeDraftId}/picks`
  );

  return picks ?? [];
}

export async function findRiverCityAuctionDraft(
  year: number = 2026,
  options: SleeperFetchOptions = {}
) {
  const leagueId = LEAGUE_IDS[year];
  if (!leagueId) return null;

  const [league, drafts] = await Promise.all([
    getLeagueInfo(leagueId, options),
    getSleeperLeagueDrafts(year, options),
  ]);
  if (drafts.length === 0) return null;

  const leagueDraftId = readString(league.draft_id);
  const leagueDraft = leagueDraftId
    ? drafts.find((draft) => draft.draft_id === leagueDraftId) ?? null
    : null;

  if (leagueDraft && isSleeperAuctionDraft(leagueDraft)) {
    return hydrateSleeperDraft(leagueDraft, options);
  }

  const auctionDrafts = sortDraftsByRecency(
    drafts.filter(isSleeperAuctionDraft)
  );
  const preferredDraft =
    auctionDrafts.find((draft) => draft.status === "drafting") ??
    auctionDrafts.find((draft) => draft.status === "pre_draft") ??
    auctionDrafts.find((draft) => draft.status === "complete") ??
    auctionDrafts[0] ??
    null;

  return preferredDraft ? hydrateSleeperDraft(preferredDraft, options) : null;
}

export function normalizeSleeperAuctionPick(
  pick: SleeperDraftPick
): NormalizedSleeperAuctionPick {
  const metadata = pick.metadata ?? {};
  const firstName = readString(metadata.first_name);
  const lastName = readString(metadata.last_name);
  const playerId = readString(pick.player_id);
  const auctionPrice = parseSleeperAuctionAmount(metadata.amount);
  const playerName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    playerId ||
    "Unknown Player";

  return {
    draftId: readString(pick.draft_id),
    playerId,
    playerName,
    firstName,
    lastName,
    position: readString(metadata.position),
    nflTeam: readString(metadata.team),
    pickedByUserId: readString(pick.picked_by),
    rosterId: readNonNegativeInteger(pick.roster_id),
    round: readNonNegativeInteger(pick.round),
    draftSlot: readNonNegativeInteger(pick.draft_slot),
    pickNo: readNonNegativeInteger(pick.pick_no),
    isKeeper: pick.is_keeper ?? null,
    auctionPrice,
    rawAuctionAmount: metadata.amount ?? null,
    hasAuctionPrice: auctionPrice !== null,
    needsAuctionPriceReview: auctionPrice === null,
  };
}

export async function getSleeperAuctionDraftSnapshot(year: number = 2026) {
  const leagueId = LEAGUE_IDS[year] ?? null;
  const generatedAt = new Date().toISOString();

  if (!leagueId) {
    return {
      year,
      leagueId,
      draft: null,
      picks: [],
      status: "no-league",
      warnings: [`No River City Sleeper league ID is configured for ${year}.`],
      generatedAt,
    } satisfies SleeperAuctionDraftSnapshot;
  }

  const draft = await findRiverCityAuctionDraft(year);
  if (!draft) {
    return {
      year,
      leagueId,
      draft: null,
      picks: [],
      status: "no-auction-draft",
      warnings: [`No auction draft was found for the ${year} River City league.`],
      generatedAt,
    } satisfies SleeperAuctionDraftSnapshot;
  }

  const draftId = readString(draft.draft_id);
  if (!draftId) {
    return {
      year,
      leagueId,
      draft,
      picks: [],
      status: "missing-draft-id",
      warnings: ["Sleeper returned an auction draft without a draft_id."],
      generatedAt,
    } satisfies SleeperAuctionDraftSnapshot;
  }

  const rawPicks = await getSleeperDraftPicks(draftId);
  const picks = rawPicks.map(normalizeSleeperAuctionPick);
  const missingPriceCount = picks.filter(
    (pick) => pick.needsAuctionPriceReview
  ).length;
  const warnings = [
    ...(!isSleeperAuctionDraft(draft)
      ? ["Selected draft is not marked as an auction draft."]
      : []),
    ...(missingPriceCount > 0
      ? [`${missingPriceCount} draft picks are missing metadata.amount.`]
      : []),
  ];

  return {
    year,
    leagueId,
    draft,
    picks,
    status: "ready",
    warnings,
    generatedAt,
  } satisfies SleeperAuctionDraftSnapshot;
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
