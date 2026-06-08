"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  Monitor,
  Moon,
  Sun,
  Trophy,
} from "lucide-react";
import {
  getLeagueRosters,
  getLeagueUsers,
  getMatchups,
  getNFLState,
  type Matchup,
} from "@/lib/sleeper";

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
  };
};

type MatchupGroup = {
  id: string;
  teams: Matchup[];
  note?: string;
};

type TeamDisplay = {
  name: string;
  avatar: string;
  record: string;
  score: string;
  rosterLabel: string;
  isPlaceholder: boolean;
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

function ThemeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-all ${
        active ? "bg-white text-black shadow-sm dark:bg-white/10 dark:text-white" : "opacity-40"
      }`}
    >
      {children}
    </button>
  );
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

function MatchupCard({
  group,
  rosters,
  users,
}: {
  group: MatchupGroup;
  rosters: SleeperRoster[];
  users: SleeperUser[];
}) {
  const team1 = resolveTeam(group.teams[0], rosters, users, "Team 1");
  const team2 = resolveTeam(group.teams[1], rosters, users, "Team 2");

  return (
    <article className="rounded-3xl border border-black/10 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <TeamPanel team={team1} side="left" />
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-black/[0.04] px-3 py-1 text-[10px] font-black uppercase italic tracking-widest text-black/25 dark:bg-white/[0.06] dark:text-white/25">
            VS
          </span>
        </div>
        <TeamPanel team={team2} side="right" />
      </div>

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
    <div className="rounded-3xl border border-dashed border-black/10 bg-black/[0.03] px-6 py-16 text-center dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm dark:bg-black/20">
        {icon}
      </div>
      <p className="font-black uppercase italic">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-7 text-black/45 dark:text-white/45">
        {copy}
      </p>
    </div>
  );
}

export default function MatchupsPage() {
  const [activeTab, setActiveTab] = useState<"regular" | "playoffs">("regular");
  const [week, setWeek] = useState<number | null>(null);
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [users, setUsers] = useState<SleeperUser[]>([]);
  const [rosters, setRosters] = useState<SleeperRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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
        const [userData, rosterData, matchupData] = await Promise.all([
          getLeagueUsers(),
          getLeagueRosters(),
          getMatchups(activeWeek),
        ]);

        if (cancelled) return;

        setUsers(userData);
        setRosters(rosterData);
        setMatchups(Array.isArray(matchupData) ? matchupData : []);
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

  const matchupGroups = useMemo(() => buildMatchupGroups(matchups), [matchups]);
  const displayWeek = week ?? MIN_WEEK;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-black transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 flex flex-col gap-3 border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/80 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
          <Link
            href="/"
            aria-label="Back to Home"
            className="rounded-lg border border-black/10 bg-black/5 p-2 transition-all hover:scale-105 dark:border-white/10 dark:bg-white/5"
          >
            <Home size={18} />
          </Link>

          <div className="flex rounded-lg border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5">
            <ThemeButton
              active={theme === "light"}
              label="Use light theme"
              onClick={() => setTheme("light")}
            >
              <Sun size={14} />
            </ThemeButton>
            <ThemeButton
              active={theme === "dark"}
              label="Use dark theme"
              onClick={() => setTheme("dark")}
            >
              <Moon size={14} />
            </ThemeButton>
            <ThemeButton
              active={theme === "system"}
              label="Use system theme"
              onClick={() => setTheme("system")}
            >
              <Monitor size={14} />
            </ThemeButton>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 rounded-lg border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5 sm:flex sm:w-auto">
          <Link
            href="/managers"
            className="min-w-0 rounded-md px-2 py-2 text-center text-[9px] font-black uppercase opacity-40 transition-all hover:opacity-100 sm:px-4 sm:py-1.5 sm:text-[10px]"
          >
            Managers
          </Link>
          <Link
            href="/league-info"
            className="min-w-0 rounded-md px-2 py-2 text-center text-[9px] font-black uppercase opacity-40 transition-all hover:opacity-100 sm:px-4 sm:py-1.5 sm:text-[10px]"
          >
            Info Hub
          </Link>
          <Link
            href="/matchups"
            aria-current="page"
            className="min-w-0 rounded-md bg-red-600 px-2 py-2 text-center text-[9px] font-black uppercase text-white shadow-lg shadow-red-900/30 sm:px-4 sm:py-1.5 sm:text-[10px]"
          >
            Matchups
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="mb-8 text-center text-4xl font-black uppercase italic tracking-tighter sm:mb-10 sm:text-5xl">
          Matchup Center
        </h1>

        <div className="mb-6 grid w-full grid-cols-2 rounded-lg border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5 sm:mx-auto sm:max-w-sm">
          <button
            type="button"
            aria-pressed={activeTab === "regular"}
            onClick={() => setActiveTab("regular")}
            className={`rounded-md px-4 py-2 text-[10px] font-black uppercase transition-all ${
              activeTab === "regular"
                ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                : "opacity-40"
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
                ? "bg-yellow-500 text-black shadow-lg shadow-yellow-900/30"
                : "opacity-40"
            }`}
          >
            Playoffs
          </button>
        </div>

        {activeTab === "regular" ? (
          <>
            <div className="mb-8 flex items-center justify-between rounded-2xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5 sm:mb-10">
              <button
                type="button"
                aria-label="Go to previous week"
                onClick={() => setWeek((current) => normalizeWeek((current ?? displayWeek) - 1))}
                disabled={displayWeek <= MIN_WEEK}
                className="rounded-full p-2 transition-all hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
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
                className="rounded-full p-2 transition-all hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/10"
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
                  <MatchupCard
                    key={group.id}
                    group={group}
                    rosters={rosters}
                    users={users}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <PageState
            icon={<Trophy size={28} />}
            title="Playoff Bracket Coming Next"
            copy="Regular-season matchup reliability is the MVP focus for this pass. Bracket support remains queued for Step 2."
          />
        )}
      </main>
    </div>
  );
}
