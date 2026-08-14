"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  Info,
  Loader2,
  Shield,
  Swords,
  Trophy,
} from "lucide-react";
import SiteShell from "@/components/SiteShell";
import {
  getLeagueInfo,
  getLeagueRosters,
  getLeagueUsers,
  getMatchups,
  getNFLState,
  getPlayoffBrackets,
  getSleeperPlayerIdentityDirectory,
  type BracketMatch,
  type LeagueInfo,
  type Matchup,
  type SleeperPlayerIdentity,
} from "@/lib/sleeper";
import { ownerProfiles } from "@/lib/managers/identityData";
import {
  aggregateStarterProjections,
  resolveStarterProjections,
  type MatchupsProjectionRecord,
  type MatchupsProjectionSource,
  type StarterProjectionAggregation,
} from "@/lib/projectionAdapter";

const MIN_WEEK = 1;
const MAX_WEEK = 18;
const SEASON_LABEL = "Sleeper Season 2026";
const FALLBACK_AVATAR = "/River City FFL Logo.JPG";

type SleeperUser = {
  user_id: string;
  display_name?: string;
  avatar?: string | null;
  metadata?: {
    team_name?: string;
  };
};

type SleeperRoster = {
  roster_id: number;
  owner_id?: string | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
};

type MatchupGroup = {
  id: string;
  teams: Matchup[];
  note?: string;
};

type MatchupHistory = {
  supported: boolean;
  owner?: string;
  opponent?: string;
  competitiveRecord?: string | null;
  completedMeetings?: string | null;
  latestMeeting?: {
    season: number;
    scoreLabel: string;
    contextLabel: string;
  } | null;
  href?: string;
};

type MatchupProjectionState = Readonly<{
  source: MatchupsProjectionSource;
  projections: readonly MatchupsProjectionRecord[];
}>;

type TeamDisplay = {
  name: string;
  avatar: string;
  record: string;
  score: string;
  rosterLabel: string;
  isPlaceholder: boolean;
};

type PlayoffBracketState = {
  winners: BracketMatch[];
  losers: BracketMatch[];
};

type BracketKind = "championship" | "toilet";

type BracketSlotSide = "t1" | "t2";

type BracketTeamDisplay = {
  rosterId: number;
  teamName: string;
  ownerName: string;
  avatar: string;
  record: string;
};

function normalizeWeek(value: unknown) {
  const week = Number(value);
  if (!Number.isFinite(week)) return MIN_WEEK;
  return Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.floor(week)));
}

function getRosterId(matchup?: Matchup) {
  const rosterId = matchup?.roster_id;
  return typeof rosterId === "number" && Number.isFinite(rosterId)
    ? rosterId
    : null;
}

function getMatchupId(matchup: Matchup) {
  const matchupId = matchup.matchup_id;
  return typeof matchupId === "number" && Number.isFinite(matchupId)
    ? matchupId
    : null;
}

function getScore(matchup?: Matchup) {
  return typeof matchup?.points === "number" ? matchup.points.toFixed(2) : "0.00";
}

function buildMatchupGroups(matchups: Matchup[]) {
  const grouped = new Map<number, Matchup[]>();
  const rows: MatchupGroup[] = [];

  matchups.forEach((matchup, index) => {
    const rosterId = getRosterId(matchup);
    const matchupId = getMatchupId(matchup);

    if (rosterId === null) {
      rows.push({
        id: `missing-roster-${index}`,
        teams: [],
        note: "Sleeper returned a matchup row without a roster.",
      });
      return;
    }

    if (matchupId === null) {
      rows.push({
        id: `unpaired-${rosterId}-${index}`,
        teams: [matchup],
        note: "Sleeper did not provide a matchup id for this roster.",
      });
      return;
    }

    grouped.set(matchupId, [...(grouped.get(matchupId) ?? []), matchup]);
  });

  grouped.forEach((teams, matchupId) => {
    const sortedTeams = [...teams].sort((a, b) => a.roster_id - b.roster_id);
    const note =
      sortedTeams.length === 1
        ? "Only one team is attached to this matchup. This may be a bye or incomplete Sleeper response."
        : sortedTeams.length > 2
          ? "Sleeper returned more than two teams for this matchup. Showing the first two."
          : undefined;

    rows.push({
      id: `matchup-${matchupId}`,
      teams: sortedTeams.slice(0, 2),
      note,
    });
  });

  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

function resolveTeam(
  matchup: Matchup | undefined,
  rosters: SleeperRoster[],
  users: SleeperUser[],
  sideLabel: string
): TeamDisplay {
  const rosterId = getRosterId(matchup);

  if (rosterId === null) {
    return {
      name: "Awaiting Opponent",
      avatar: FALLBACK_AVATAR,
      record: "Record unavailable",
      score: "0.00",
      rosterLabel: sideLabel,
      isPlaceholder: true,
    };
  }

  const roster = rosters.find((entry) => entry.roster_id === rosterId);
  const user = users.find((entry) => entry.user_id === roster?.owner_id);
  const wins = roster?.settings?.wins;
  const losses = roster?.settings?.losses;
  const ties = roster?.settings?.ties;
  const record =
    typeof wins === "number" && typeof losses === "number"
      ? `${wins}-${losses}${typeof ties === "number" && ties > 0 ? `-${ties}` : ""}`
      : "Record unavailable";
  const teamName =
    user?.metadata?.team_name ||
    user?.display_name ||
    (roster ? `Roster ${rosterId}` : `Unknown Roster ${rosterId}`);

  return {
    name: teamName,
    avatar: user?.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
      : FALLBACK_AVATAR,
    record,
    score: getScore(matchup),
    rosterLabel: `Roster ${rosterId}`,
    isPlaceholder: false,
  };
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveBracketTeam(
  rosterId: number,
  rosters: SleeperRoster[],
  users: SleeperUser[]
): BracketTeamDisplay {
  const roster = rosters.find((entry) => entry.roster_id === rosterId);
  const user = users.find((entry) => entry.user_id === roster?.owner_id);
  const wins = roster?.settings?.wins;
  const losses = roster?.settings?.losses;
  const ties = roster?.settings?.ties;
  const record =
    typeof wins === "number" && typeof losses === "number"
      ? `${wins}-${losses}${typeof ties === "number" && ties > 0 ? `-${ties}` : ""}`
      : "Record unavailable";
  const ownerName = user?.display_name ?? `Roster ${rosterId}`;

  return {
    rosterId,
    teamName: user?.metadata?.team_name || ownerName,
    ownerName,
    avatar: user?.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
      : FALLBACK_AVATAR,
    record,
  };
}

function sortBracketMatches(matches: BracketMatch[]) {
  return [...matches].sort((a, b) => {
    const roundA = getNumber(a.r) ?? 0;
    const roundB = getNumber(b.r) ?? 0;
    const matchA = getNumber(a.m) ?? 0;
    const matchB = getNumber(b.m) ?? 0;
    return roundA - roundB || matchA - matchB;
  });
}

function groupBracketRounds(matches: BracketMatch[]) {
  const groups = new Map<number, BracketMatch[]>();

  sortBracketMatches(matches).forEach((match) => {
    const round = getNumber(match.r) ?? 0;
    groups.set(round, [...(groups.get(round) ?? []), match]);
  });

  return [...groups.entries()]
    .sort(([roundA], [roundB]) => roundA - roundB)
    .map(([round, roundMatches]) => ({ round, matches: roundMatches }));
}

function getPlayoffWeekLabel(leagueInfo: LeagueInfo | null, round: number) {
  const playoffStart = getNumber(leagueInfo?.settings?.playoff_week_start);
  if (!playoffStart || round <= 0) return "Week TBD";
  return `Week ${playoffStart + round - 1}`;
}

function getRoundLabel(kind: BracketKind, round: number) {
  if (kind === "championship") {
    if (round === 1) return "Quarterfinals";
    if (round === 2) return "Semifinals";
    if (round === 3) return "Finals";
    return `Round ${round}`;
  }

  if (round === 1) return "Toilet Bowl Round 1";
  if (round === 2) return "Toilet Bowl Semis";
  if (round === 3) return "Toilet Bowl Finals";
  return `Toilet Bowl Round ${round}`;
}

function getGameTitle(match: BracketMatch, kind: BracketKind) {
  const placement = getNumber(match.p);
  const round = getNumber(match.r) ?? 0;

  if (kind === "toilet") {
    if (placement === 1) return "Last-Place Final";
    if (placement === 3) return "Safety Placement";
    if (placement === 5) return "Placement Game";
    return getRoundLabel(kind, round);
  }

  if (placement === 1) return "Championship";
  if (placement === 3) return "Third Place";
  if (placement === 5) return "Fifth Place";
  return getRoundLabel(kind, round);
}

function describeBracketSource(source: BracketMatch["t1_from"]) {
  const winnerSource = getNumber(source?.w);
  if (winnerSource !== null) return `Winner of Game ${winnerSource}`;

  const loserSource = getNumber(source?.l);
  if (loserSource !== null) return `Loser of Game ${loserSource}`;

  return "TBD";
}

function slotKey(match: BracketMatch, side: BracketSlotSide) {
  return `${getNumber(match.r) ?? "x"}-${getNumber(match.m) ?? "x"}-${side}`;
}

function buildSlotLabels(matches: BracketMatch[], kind: BracketKind) {
  const labels = new Map<string, string>();
  const sorted = sortBracketMatches(matches);

  if (kind === "championship") {
    const quarterfinals = sorted.filter((match) => getNumber(match.r) === 1);
    const semifinals = sorted.filter((match) => getNumber(match.r) === 2);

    if (quarterfinals[0]) {
      labels.set(slotKey(quarterfinals[0], "t1"), "Seed slot 4");
      labels.set(slotKey(quarterfinals[0], "t2"), "Seed slot 5");
    }

    if (quarterfinals[1]) {
      labels.set(slotKey(quarterfinals[1], "t1"), "Seed slot 3");
      labels.set(slotKey(quarterfinals[1], "t2"), "Seed slot 6");
    }

    if (semifinals[0]) labels.set(slotKey(semifinals[0], "t1"), "Seed slot 1 · bye");
    if (semifinals[1]) labels.set(slotKey(semifinals[1], "t1"), "Seed slot 2 · bye");

    return labels;
  }

  let slotNumber = 1;
  sorted.forEach((match) => {
    (["t1", "t2"] as BracketSlotSide[]).forEach((side) => {
      const rosterId = getNumber(match[side]);
      const source = side === "t1" ? match.t1_from : match.t2_from;
      const hasSource = getNumber(source?.w) !== null || getNumber(source?.l) !== null;
      const round = getNumber(match.r);

      if (rosterId !== null && !hasSource && round !== null && round <= 2) {
        labels.set(slotKey(match, side), `Toilet slot ${slotNumber}`);
        slotNumber += 1;
      }
    });
  });

  return labels;
}

function getSlotStatus(match: BracketMatch, rosterId: number, kind: BracketKind) {
  const winner = getNumber(match.w);
  const loser = getNumber(match.l);
  const placement = getNumber(match.p);

  if (winner === null && loser === null) return null;

  if (kind === "toilet") {
    if (winner === rosterId) {
      return {
        label: placement === 1 ? "Last Place" : "Advances",
        className:
          "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300",
      };
    }

    if (loser === rosterId) {
      return {
        label: placement === 1 ? "Escaped" : "Safe",
        className:
          "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
      };
    }

    return null;
  }

  if (winner === rosterId) {
    return {
      label: placement === 1 ? "Champion" : "Winner",
      className:
        "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (loser === rosterId) {
    return {
      label: placement === 1 ? "Runner-up" : "Eliminated",
      className: "border-black/10 bg-black/5 text-black/45 dark:border-white/10 dark:bg-white/5 dark:text-white/45",
    };
  }

  return null;
}

function hasCompletedBracketGame(matches: BracketMatch[]) {
  return matches.some((match) => getNumber(match.w) !== null || getNumber(match.l) !== null);
}

function TeamPanel({
  team,
  side,
}: {
  team: TeamDisplay;
  side: "left" | "right";
}) {
  const colorClass = side === "left" ? "text-red-600" : "text-blue-600";
  const borderClass = side === "left" ? "border-red-600" : "border-blue-600";

  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04] ${
        side === "right" ? "sm:flex-row-reverse sm:text-right" : ""
      }`}
    >
      <div
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 ${borderClass} bg-black/10 shadow-lg dark:bg-white/10 sm:h-16 sm:w-16`}
      >
        <Image
          src={team.avatar}
          alt={`${team.name} avatar`}
          fill
          sizes="64px"
          className={team.isPlaceholder ? "object-cover opacity-40" : "object-cover"}
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black uppercase leading-tight sm:text-[13px]">
          {team.name}
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
          {team.record}
        </p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/25 dark:text-white/25">
          {team.rosterLabel}
        </p>
      </div>

      <p className={`shrink-0 text-2xl font-black leading-none ${colorClass} sm:text-3xl`}>
        {team.score}
      </p>
    </div>
  );
}

function getStarterIds(matchup?: Matchup): readonly string[] {
  return matchup?.starters?.filter(
    (starterId): starterId is string =>
      typeof starterId === "string" && starterId.trim().length > 0
  ) ?? [];
}

function getOwnerId(user?: SleeperUser) {
  if (!user) return null;
  return ownerProfiles.find((profile) => profile.sleeperIds?.includes(user.user_id))?.id ?? null;
}

function normalizeProjectionRecords(value: unknown): MatchupsProjectionRecord[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const record = entry as Record<string, unknown>;
    const playerName = typeof record.playerName === "string"
      ? record.playerName
      : typeof record.player_name === "string"
        ? record.player_name
        : typeof record.full_name === "string"
          ? record.full_name
          : undefined;
    const pointsValue = record.points ?? record.fantasy_points ?? record.fpts;
    return {
      playerId: typeof record.playerId === "string" ? record.playerId : typeof record.player_id === "string" || typeof record.player_id === "number" ? String(record.player_id) : null,
      playerName,
      position: typeof record.position === "string" ? record.position : undefined,
      team: typeof record.team === "string" ? record.team : undefined,
      week: typeof record.week === "number" ? record.week : 0,
      points: typeof pointsValue === "number" && Number.isFinite(pointsValue) ? pointsValue : 0,
      passYds: 0,
      rushYds: 0,
      recYds: 0,
      passTd: 0,
      rushTd: 0,
      recTd: 0,
      receptions: 0,
    };
  });
}

function projectionSourceLabel(source: MatchupsProjectionSource) {
  return source === "weekly-live" ? "Weekly live" : source === "weekly-derived" ? "Weekly derived" : "Season fallback";
}

function projectTeam(
  matchup: Matchup | undefined,
  identities: Readonly<Record<string, SleeperPlayerIdentity>>,
  projectionState: MatchupProjectionState | null
): StarterProjectionAggregation | null {
  if (!projectionState) return null;
  const starterIds = getStarterIds(matchup);
  return aggregateStarterProjections(
    resolveStarterProjections(starterIds, identities, projectionState.projections, projectionState.source)
  );
}

function ownerSlug(ownerId: string | null) {
  return ownerProfiles.find((profile) => profile.id === ownerId)?.slug ?? null;
}

async function loadMatchupHistory(ownerId: string | null, opponentId: string | null) {
  const owner = ownerSlug(ownerId);
  const opponent = ownerSlug(opponentId);
  if (!owner || !opponent || owner === opponent) return { supported: false } as MatchupHistory;
  try {
    const response = await fetch(`/api/matchups/history?owner=${encodeURIComponent(owner)}&opponent=${encodeURIComponent(opponent)}`);
    if (!response.ok) return { supported: false };
    return await response.json() as MatchupHistory;
  } catch {
    return { supported: false };
  }
}

function StarterList({
  label,
  matchup,
  playerDirectory,
}: {
  label: string;
  matchup?: Matchup;
  playerDirectory: Readonly<Record<string, SleeperPlayerIdentity>>;
}) {
  const starterIds = getStarterIds(matchup);

  return (
    <section className="min-w-0 rounded-2xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label={`${label} starting lineup`}>
      <h3 className="text-xs font-black uppercase italic tracking-tight">{label}</h3>
      {starterIds.length === 0 ? (
        <p className="mt-3 text-sm font-semibold text-black/50 dark:text-white/50">
          Starting lineup not available yet.
        </p>
      ) : (
        <ol className="mt-3 min-w-0 space-y-2">
          {starterIds.map((starterId, index) => (
            <li key={`${starterId}-${index}`} className="min-w-0 rounded-xl bg-white px-3 py-2 text-sm font-semibold dark:bg-black/20">
              <span className="mr-2 text-black/40 dark:text-white/40">{index + 1}.</span>
              {playerDirectory[starterId] ? (
                <div className="min-w-0">
                  <p className="break-words">{playerDirectory[starterId].displayName ?? `Player ID: ${starterId}`}</p>
                  {(playerDirectory[starterId].position || playerDirectory[starterId].nflTeam) && (
                    <p className="mt-1 break-words text-xs font-medium text-black/55 dark:text-white/55">
                      {[playerDirectory[starterId].position, playerDirectory[starterId].nflTeam].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              ) : (
                <span className="break-all">Player ID: {starterId}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function HistoryContext({ history }: { history: MatchupHistory | null }) {
  if (!history || !history.supported) {
    return <p className="mt-4 rounded-2xl border border-black/10 px-3 py-3 text-sm font-semibold text-black/50 dark:border-white/10 dark:text-white/50">Historical Head-to-Head not available.</p>;
  }
  return (
    <section className="mt-4 min-w-0 rounded-2xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label="Series history">
      <h3 className="text-xs font-black uppercase italic tracking-tight">Series History</h3>
      <p className="mt-2 break-words text-sm font-black">{history.owner} leads {history.opponent} {history.competitiveRecord}</p>
      <p className="mt-1 text-xs font-semibold text-black/55 dark:text-white/55">{history.completedMeetings} completed meetings · competitive record excludes secondary classifications.</p>
      {history.latestMeeting && <p className="mt-2 break-words text-xs font-semibold">Last meeting: {history.latestMeeting.season} · {history.latestMeeting.scoreLabel}</p>}
      {history.href && <Link href={history.href} className="mt-3 inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-red-600/30 px-3 py-2 text-xs font-black uppercase text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:text-red-300">View Full Head-to-Head <ArrowRight size={14} aria-hidden="true" /></Link>}
    </section>
  );
}

function ProjectionContext({
  group,
  team1,
  team2,
  identities,
  projectionState,
}: {
  group: MatchupGroup;
  team1: TeamDisplay;
  team2: TeamDisplay;
  identities: Readonly<Record<string, SleeperPlayerIdentity>>;
  projectionState: MatchupProjectionState | null;
}) {
  const first = projectTeam(group.teams[0], identities, projectionState);
  const second = projectTeam(group.teams[1], identities, projectionState);
  const source = projectionState ? `Projection source: ${projectionSourceLabel(projectionState.source)}` : "Projection source unavailable";

  if (!first || !second) {
    return <section className="mt-4 rounded-2xl border border-black/10 p-3 text-sm font-semibold text-black/50 dark:border-white/10 dark:text-white/50" aria-label="Projected scores">Projected score unavailable — projections are not available yet. <span className="block mt-1 text-xs">{source}</span></section>;
  }

  const scoreLine = (team: TeamDisplay, aggregate: StarterProjectionAggregation) => aggregate.coverageComplete
    ? `${team.name}: ${aggregate.projectedTotalPoints?.toFixed(1)}`
    : `${team.name}: Projected score unavailable — ${aggregate.projectedStarterCount} of ${aggregate.totalStarterCount} starters have projections.`;
  const edge = first.coverageComplete && second.coverageComplete
    ? first.projectedTotalPoints === second.projectedTotalPoints
      ? "Projected Edge: Even"
      : `Projected Edge: ${(first.projectedTotalPoints ?? 0) > (second.projectedTotalPoints ?? 0) ? team1.name : team2.name} by ${Math.abs((first.projectedTotalPoints ?? 0) - (second.projectedTotalPoints ?? 0)).toFixed(1)}`
    : "Projected Edge unavailable — complete projection coverage required.";

  return (
    <section className="mt-4 min-w-0 rounded-2xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]" aria-label="Projected scores">
      <h3 className="text-xs font-black uppercase italic tracking-tight">Projected Scores <span className="font-semibold normal-case opacity-60">(estimates)</span></h3>
      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
        <p className="min-w-0 break-words rounded-xl bg-white px-3 py-2 text-sm font-black dark:bg-black/20">Projected Score · {scoreLine(team1, first)}</p>
        <p className="min-w-0 break-words rounded-xl bg-white px-3 py-2 text-sm font-black dark:bg-black/20">Projected Score · {scoreLine(team2, second)}</p>
      </div>
      <p className="mt-3 break-words text-sm font-black">{edge}</p>
      <p className="mt-1 break-words text-xs font-semibold text-black/55 dark:text-white/55">{source}</p>
    </section>
  );
}

function MatchupCard({
  group,
  rosters,
  users,
  playerDirectory,
  history,
  projectionState,
}: {
  group: MatchupGroup;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  playerDirectory: Readonly<Record<string, SleeperPlayerIdentity>>;
  history: MatchupHistory | null;
  projectionState: MatchupProjectionState | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const team1 = resolveTeam(group.teams[0], rosters, users, "Team 1");
  const team2 = resolveTeam(group.teams[1], rosters, users, "Team 2");
  const expandedRegionId = `${group.id}-expanded-content`;
  const matchupLabel = `${team1.name} versus ${team2.name}`;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <TeamPanel team={team1} side="left" />
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[10px] font-black uppercase italic tracking-widest text-black/25 dark:bg-white/[0.06] dark:text-white/25">
            VS
          </span>
        </div>
        <TeamPanel team={team2} side="right" />
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expandedRegionId}
        aria-label={`${expanded ? "Collapse" : "Expand"} starters for ${matchupLabel}`}
        onClick={() => setExpanded((current) => !current)}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-black/10 px-4 py-2 text-xs font-black uppercase tracking-widest transition hover:bg-black/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-white/10 dark:hover:bg-white/[0.06]"
      >
        {expanded ? "Hide starters" : "Show starters"}
      </button>

      {expanded && (
        <div id={expandedRegionId} className="min-w-0">
          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <StarterList label={team1.name} matchup={group.teams[0]} playerDirectory={playerDirectory} />
            <StarterList label={team2.name} matchup={group.teams[1]} playerDirectory={playerDirectory} />
          </div>

          <ProjectionContext group={group} team1={team1} team2={team2} identities={playerDirectory} projectionState={projectionState} />

          <HistoryContext history={history} />
        </div>
      )}

      {group.note && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs font-bold text-yellow-700 dark:text-yellow-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{group.note}</span>
        </div>
      )}
    </article>
  );
}

function PageState({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600 shadow-sm dark:bg-orange-600/15">
        {icon}
      </div>
      <p className="font-black uppercase italic">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-black/45 dark:text-white/45">
        {copy}
      </p>
    </div>
  );
}

function ExplainerCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone: "gold" | "red";
}) {
  const toneClass =
    tone === "gold"
      ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
      : "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClass}`}>
          {icon}
        </div>
        <h2 className="text-sm font-black uppercase italic tracking-tight">
          {title}
        </h2>
      </div>

      <ul className="space-y-2 text-sm font-semibold leading-6 text-black/60 dark:text-white/60">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayoffStateBanner({
  brackets,
  leagueInfo,
}: {
  brackets: PlayoffBracketState;
  leagueInfo: LeagueInfo | null;
}) {
  const allMatches = [...brackets.winners, ...brackets.losers];
  const hasCompleted = hasCompletedBracketGame(allMatches);
  const playoffStart = leagueInfo?.settings?.playoff_week_start;
  const currentLeg = leagueInfo?.settings?.leg;
  const statusCopy = hasCompleted
    ? "Sleeper is the source of truth for bracket advancement after commissioner seeding is finalized."
    : "Sleeper has generated the current-season bracket. Commissioner seeding is treated as canonical once finalized before Week 15.";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-600">
            <Info size={18} />
          </div>
          <div>
            <p className="text-sm font-black uppercase italic">
              {hasCompleted ? "Bracket live from Sleeper." : "Bracket seeded, playoffs not started."}
            </p>
            <p className="mt-1 text-sm font-medium leading-6 text-black/50 dark:text-white/50">
              {statusCopy}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:w-56">
          <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-center dark:border-white/10 dark:bg-black/20">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Current
            </p>
            <p className="text-sm font-black">Week {currentLeg ?? "TBD"}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-center dark:border-white/10 dark:bg-black/20">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Playoffs
            </p>
            <p className="text-sm font-black">Week {playoffStart ?? "TBD"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BracketSlot({
  match,
  side,
  kind,
  rosters,
  users,
  slotLabel,
}: {
  match: BracketMatch;
  side: BracketSlotSide;
  kind: BracketKind;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  slotLabel?: string;
}) {
  const rosterId = getNumber(match[side]);
  const source = side === "t1" ? match.t1_from : match.t2_from;

  if (rosterId === null) {
    return (
      <div className="flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30">
          <Shield size={17} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black uppercase italic">
            {describeBracketSource(source)}
          </p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            Unresolved slot
          </p>
        </div>
      </div>
    );
  }

  const team = resolveBracketTeam(rosterId, rosters, users);
  const status = getSlotStatus(match, rosterId, kind);

  return (
    <div className="flex min-h-24 min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/20">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
        <Image
          src={team.avatar}
          alt={`${team.teamName} avatar`}
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase leading-tight">
              {team.teamName}
            </p>
            <p className="mt-1 truncate text-[11px] font-bold text-black/45 dark:text-white/45">
              {team.ownerName}
            </p>
          </div>
          {status && (
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${status.className}`}>
              {status.label}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
          <span>{slotLabel ?? `Roster ${team.rosterId}`}</span>
          <span>{team.record}</span>
        </div>
      </div>
    </div>
  );
}

function BracketGame({
  match,
  kind,
  leagueInfo,
  rosters,
  users,
  slotLabels,
}: {
  match: BracketMatch;
  kind: BracketKind;
  leagueInfo: LeagueInfo | null;
  rosters: SleeperRoster[];
  users: SleeperUser[];
  slotLabels: Map<string, string>;
}) {
  const round = getNumber(match.r) ?? 0;
  const matchNumber = getNumber(match.m);

  return (
    <article className="rounded-2xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase italic">
            {getGameTitle(match, kind)}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            {getPlayoffWeekLabel(leagueInfo, round)}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase text-black/40 dark:bg-black/20 dark:text-white/40">
          Game {matchNumber ?? "TBD"}
        </span>
      </div>

      <div className="grid gap-2">
        <BracketSlot
          match={match}
          side="t1"
          kind={kind}
          rosters={rosters}
          users={users}
          slotLabel={slotLabels.get(slotKey(match, "t1"))}
        />
        <BracketSlot
          match={match}
          side="t2"
          kind={kind}
          rosters={rosters}
          users={users}
          slotLabel={slotLabels.get(slotKey(match, "t2"))}
        />
      </div>
    </article>
  );
}

function PlayoffBracketSection({
  title,
  subtitle,
  icon,
  kind,
  matches,
  leagueInfo,
  rosters,
  users,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  kind: BracketKind;
  matches: BracketMatch[];
  leagueInfo: LeagueInfo | null;
  rosters: SleeperRoster[];
  users: SleeperUser[];
}) {
  const rounds = groupBracketRounds(matches);
  const slotLabels = buildSlotLabels(matches, kind);

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/[0.04] text-red-600 dark:bg-white/[0.06]">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tight">
              {title}
            </h2>
            <p className="text-sm font-medium text-black/45 dark:text-white/45">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.03] px-5 py-10 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <p className="font-black uppercase italic">Bracket rows unavailable</p>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-black/45 dark:text-white/45">
            Sleeper did not return rows for this bracket yet.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[780px] grid-cols-3 gap-4 sm:min-w-0">
            {rounds.map(({ round, matches: roundMatches }) => (
              <div key={round} className="space-y-3">
                <div className="rounded-xl bg-black/[0.04] px-3 py-2 text-center dark:bg-white/[0.06]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                    {getPlayoffWeekLabel(leagueInfo, round)}
                  </p>
                  <p className="mt-1 text-sm font-black uppercase italic">
                    {getRoundLabel(kind, round)}
                  </p>
                </div>

                {roundMatches.map((match) => (
                  <BracketGame
                    key={`${round}-${match.m ?? "match"}`}
                    match={match}
                    kind={kind}
                    leagueInfo={leagueInfo}
                    rosters={rosters}
                    users={users}
                    slotLabels={slotLabels}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PlayoffsPanel({
  loading,
  error,
  brackets,
  leagueInfo,
  rosters,
  users,
}: {
  loading: boolean;
  error: string | null;
  brackets: PlayoffBracketState;
  leagueInfo: LeagueInfo | null;
  rosters: SleeperRoster[];
  users: SleeperUser[];
}) {
  const totalBracketRows = brackets.winners.length + brackets.losers.length;

  if (loading) {
    return (
      <PageState
        icon={<Loader2 className="animate-spin" size={28} />}
        title="Loading Brackets"
        copy="Pulling current-season playoff bracket data from Sleeper."
      />
    );
  }

  if (error) {
    return (
      <PageState
        icon={<AlertTriangle size={28} />}
        title="Playoffs Unavailable"
        copy={error}
      />
    );
  }

  if (totalBracketRows === 0) {
    return (
      <PageState
        icon={<Trophy size={28} />}
        title="No Playoff Bracket Found"
        copy="Sleeper has not returned current-season playoff or Toilet Bowl bracket rows yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PlayoffStateBanner brackets={brackets} leagueInfo={leagueInfo} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ExplainerCard
          title="River City Playoff Format"
          icon={<Crown size={19} />}
          tone="gold"
          items={[
            "6 playoff teams",
            "Seeds 1-3 are division winners",
            "Seeds 1-2 receive byes",
            "Seed 4 is best remaining record",
            "Seeds 5-6 qualify by highest Points For among remaining teams",
            "Commissioner finalizes seeding in Sleeper before Week 15",
            "Sleeper manages bracket progression afterward",
          ]}
        />

        <ExplainerCard
          title="Toilet Bowl Format"
          icon={<Shield size={19} />}
          tone="red"
          items={[
            "Seeds 7-12 enter the Toilet Bowl",
            "Seeding is based on Points For among non-playoff teams",
            "Lowest PF teams receive the Toilet Bowl byes",
            "In the Toilet Bowl, losers advance",
            "Winners are eliminated from last-place danger",
            "Final remaining loser is last place / Toilet Bowl loser",
          ]}
        />
      </div>

      <PlayoffBracketSection
        title="Championship Bracket"
        subtitle="Sleeper winners bracket, after commissioner seed edits."
        icon={<Trophy size={20} />}
        kind="championship"
        matches={brackets.winners}
        leagueInfo={leagueInfo}
        rosters={rosters}
        users={users}
      />

      <PlayoffBracketSection
        title="Toilet Bowl"
        subtitle="Sleeper losers bracket. Lower-scoring teams advance toward last place."
        icon={<AlertTriangle size={20} />}
        kind="toilet"
        matches={brackets.losers}
        leagueInfo={leagueInfo}
        rosters={rosters}
        users={users}
      />
    </div>
  );
}

function RivalryHubCard() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-600/10 text-orange-600">
            <Swords size={19} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase italic tracking-tight">
              Head-to-Head History
            </h2>
            <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-black/50 dark:text-white/50">
              Historical head-to-head records, rivalry summaries, and career matchup context live in Rivalry Hub.
            </p>
          </div>
        </div>

        <Link
          href="/league-info/rivalries"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-xs font-black uppercase text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          Rivalry Hub
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export default function MatchupsPage() {
  const [activeTab, setActiveTab] = useState<"regular" | "playoffs">("regular");
  const [week, setWeek] = useState<number | null>(null);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [users, setUsers] = useState<SleeperUser[]>([]);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [playerDirectory, setPlayerDirectory] = useState<Record<string, SleeperPlayerIdentity>>({});
  const [matchupHistory, setMatchupHistory] = useState<Record<string, MatchupHistory>>({});
  const [projectionState, setProjectionState] = useState<MatchupProjectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leagueInfo, setLeagueInfo] = useState<LeagueInfo | null>(null);
  const [playoffBrackets, setPlayoffBrackets] = useState<PlayoffBracketState>({
    winners: [],
    losers: [],
  });
  const [playoffLoading, setPlayoffLoading] = useState(false);
  const [playoffError, setPlayoffError] = useState<string | null>(null);
  const [playoffsLoaded, setPlayoffsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "playoffs") setActiveTab("playoffs");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function loadCurrentWeek() {
      setLoading(true);
      const state = await getNFLState();
      if (!cancelled) setWeek(normalizeWeek(state.week));
    }

    loadCurrentWeek();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || week === null) return;

    let cancelled = false;
    const activeWeek = week;

    async function loadData() {
      setLoading(true);
      setLoadError(null);

      try {
        const [userData, rosterData, matchupData, playerData, projectionResponse] = await Promise.all([
          getLeagueUsers(),
          getLeagueRosters(),
          getMatchups(activeWeek),
          getSleeperPlayerIdentityDirectory(),
          fetch(`/api/projections/active?week=${activeWeek}`),
        ]);

        if (cancelled) return;

        setUsers(userData);
        setRosters(rosterData);
        setMatchups(Array.isArray(matchupData) ? matchupData : []);
        setPlayerDirectory(playerData);
        const projectionPayload = projectionResponse.ok ? await projectionResponse.json() as { source?: MatchupsProjectionSource; projections?: unknown } : null;
        setProjectionState(
          projectionPayload?.source && projectionPayload.projections
            ? { source: projectionPayload.source, projections: normalizeProjectionRecords(projectionPayload.projections) }
            : null
        );
        const historyPairs = [...new Set(
          buildMatchupGroups(Array.isArray(matchupData) ? matchupData : [])
            .map((group) => {
              const firstUser = userData.find((user) => user.user_id === rosterData.find((roster) => roster.roster_id === group.teams[0]?.roster_id)?.owner_id);
              const secondUser = userData.find((user) => user.user_id === rosterData.find((roster) => roster.roster_id === group.teams[1]?.roster_id)?.owner_id);
              const first = getOwnerId(firstUser);
              const second = getOwnerId(secondUser);
              return first && second && first !== second ? `${first}:${second}` : null;
            })
            .filter((pair): pair is string => pair !== null)
        )];
        const loadedHistory = await Promise.all(historyPairs.map(async (pair) => {
          const [first, second] = pair.split(":");
          return [pair, await loadMatchupHistory(first, second)] as const;
        }));
        setMatchupHistory(Object.fromEntries(loadedHistory));
      } catch (error) {
        console.error("Error loading matchups:", error);
        if (!cancelled) {
          setMatchups([]);
          setLoadError("Sleeper matchup data could not be loaded. Try again in a moment.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [mounted, week]);

  useEffect(() => {
    if (!mounted || activeTab !== "playoffs" || playoffsLoaded) return;

    let cancelled = false;

    async function loadPlayoffs() {
      setPlayoffLoading(true);
      setPlayoffError(null);

      try {
        const [info, userData, rosterData, bracketData] = await Promise.all([
          getLeagueInfo(),
          getLeagueUsers(),
          getLeagueRosters(),
          getPlayoffBrackets(),
        ]);

        if (cancelled) return;

        setLeagueInfo(info);
        setUsers(userData);
        setRosters(rosterData);
        setPlayoffBrackets({
          winners: Array.isArray(bracketData.winners) ? bracketData.winners : [],
          losers: Array.isArray(bracketData.losers) ? bracketData.losers : [],
        });
        setPlayoffsLoaded(true);
      } catch (error) {
        console.error("Error loading playoff brackets:", error);
        if (!cancelled) {
          setPlayoffBrackets({ winners: [], losers: [] });
          setPlayoffError("Sleeper playoff bracket data could not be loaded. Try again in a moment.");
        }
      } finally {
        if (!cancelled) setPlayoffLoading(false);
      }
    }

    loadPlayoffs();

    return () => {
      cancelled = true;
    };
  }, [activeTab, mounted, playoffsLoaded]);

  const matchupGroups = useMemo(() => buildMatchupGroups(matchups), [matchups]);
  const displayWeek = week ?? MIN_WEEK;

  if (!mounted) return null;

  return (
    <SiteShell activePath="/matchups">
      <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">Matchups</p>
              <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter text-[#071a33] dark:text-white sm:text-5xl">
                2026 Matchup Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-gray-400">
                Weekly head-to-heads with starters, projected scores, Series History, and playoff context.
              </p>
            </div>
            <Link
              href="/league-info"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#071a33] transition hover:border-orange-600 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/20 dark:text-white"
            >
              Back to League Info
            </Link>
          </div>
        </header>

        <div className="mb-6 grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/5 sm:mx-auto sm:max-w-sm" role="group" aria-label="Matchup view">
          <button
            type="button"
            aria-pressed={activeTab === "regular"}
            onClick={() => setActiveTab("regular")}
            className={`rounded-md px-4 py-2 text-[10px] font-black uppercase transition-all ${
              activeTab === "regular"
                ? "bg-[#071a33] text-white shadow-sm"
                : "text-slate-500 hover:bg-white dark:text-white/60 dark:hover:bg-white/10"
            }`}
          >
            Regular
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "playoffs"}
            onClick={() => setActiveTab("playoffs")}
            className={`rounded-md px-4 py-2 text-[10px] font-black uppercase transition-all ${
              activeTab === "playoffs"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-white dark:text-white/60 dark:hover:bg-white/10"
            }`}
          >
            Playoffs
          </button>
        </div>

        {activeTab === "regular" ? (
          <>
            <div className="mb-8 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:mb-10 sm:p-4">
              <button
                type="button"
                aria-label="Go to previous week"
                onClick={() => setWeek((current) => normalizeWeek((current ?? displayWeek) - 1))}
                disabled={displayWeek <= MIN_WEEK}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full p-2 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <span className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
                  <Calendar size={13} /> {SEASON_LABEL}
                </span>
                <span className="mt-1 block text-2xl font-black italic">
                  WEEK {displayWeek}
                </span>
              </div>
              <button
                type="button"
                aria-label="Go to next week"
                onClick={() => setWeek((current) => normalizeWeek((current ?? displayWeek) + 1))}
                disabled={displayWeek >= MAX_WEEK}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full p-2 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
              >
                <ChevronRight />
              </button>
            </div>

            {loading ? (
              <PageState
                icon={<Loader2 className="animate-spin" size={28} />}
                title="Loading Scores"
                copy="Pulling the latest regular-season matchup data from Sleeper."
              />
            ) : loadError ? (
              <PageState
                icon={<AlertTriangle size={28} />}
                title="Matchups Unavailable"
                copy={loadError}
              />
            ) : matchupGroups.length === 0 ? (
              <PageState
                icon={<Calendar size={28} />}
                title="No Matchups Found"
                copy="Sleeper did not return matchup rows for this week yet."
              />
            ) : (
              <div className="grid gap-5 sm:gap-6">
                {matchupGroups.map((group) => (
                  (() => {
                    const firstUser = users.find((user) => user.user_id === rosters.find((roster) => roster.roster_id === group.teams[0]?.roster_id)?.owner_id);
                    const secondUser = users.find((user) => user.user_id === rosters.find((roster) => roster.roster_id === group.teams[1]?.roster_id)?.owner_id);
                    const pair = `${getOwnerId(firstUser) ?? ""}:${getOwnerId(secondUser) ?? ""}`;
                    return (
                  <MatchupCard
                    key={group.id}
                    group={group}
                    rosters={rosters}
                    users={users}
                    playerDirectory={playerDirectory}
                    history={matchupHistory[pair] ?? null}
                    projectionState={projectionState}
                  />
                    );
                  })()
                ))}
              </div>
            )}
          </>
        ) : (
          <PlayoffsPanel
            loading={playoffLoading || (!playoffsLoaded && !playoffError)}
            error={playoffError}
            brackets={playoffBrackets}
            leagueInfo={leagueInfo}
            rosters={rosters}
            users={users}
          />
        )}

        <RivalryHubCard />
      </main>
    </SiteShell>
  );
}
