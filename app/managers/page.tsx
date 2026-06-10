"use client";

import { useMemo, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Home, Sun, Moon, Monitor } from "lucide-react";

import ManagerPortraitCard from "@/components/ManagerPortraitCard";
import { activeManagers } from "@/lib/managers/activeManagers";
import { retiredManagers } from "@/lib/managers/retiredManagers";
import { staffManagers } from "@/lib/managers/staff";
import type { ActiveManager } from "@/lib/types/Manager";

const SLEEPER_LEAGUE_ID = "1312149033254416384";

type ManagerTab = "active" | "retired" | "staff";
type ActiveOwnerLayout = "all" | "division";
type SleeperFetchStatus = "idle" | "loading" | "ready" | "error";

type SleeperUser = {
  user_id?: string;
  display_name?: string;
  metadata?: {
    team_name?: string;
  };
};

type SleeperRoster = {
  owner_id?: string;
  roster_id?: number;
  settings?: {
    division?: number | string | null;
  };
};

type SleeperLeagueInfo = {
  metadata?: Record<string, string | undefined>;
  settings?: {
    divisions?: number;
  };
};

type DivisionGroup = {
  id: string;
  name: string;
  managers: ActiveManager[];
};

function applySleeperTeamNames(
  managers: ActiveManager[],
  sleeperUsers: SleeperUser[]
) {
  return managers.map((manager) => {
    const sleeperUser = sleeperUsers.find(
      (user) => user.user_id === manager.sleeperId
    );

    return {
      ...manager,
      teamName:
        sleeperUser?.metadata?.team_name ||
        sleeperUser?.display_name ||
        manager.teamName,
    };
  });
}

function getDivisionName(
  leagueInfo: SleeperLeagueInfo | null,
  divisionId: number
) {
  const metadataName = leagueInfo?.metadata?.[`division_${divisionId}`]?.trim();
  return metadataName || `Division ${divisionId}`;
}

function getRosterDivisionId(roster: SleeperRoster) {
  const division = Number(roster.settings?.division);
  return Number.isFinite(division) && division > 0 ? division : null;
}

export default function ManagersPage() {
  const [view, setView] = useState<ManagerTab>("active");
  const [activeLayout, setActiveLayout] =
    useState<ActiveOwnerLayout>("all");

  // ⭐ THE FIX: Use "as unknown as any[]" to strip the Read-Only status
  // Then cast it back to ActiveManager[] so your cards still work.
  const [activeData, setActiveData] = useState<ActiveManager[]>(() =>
    ((activeManagers as unknown) as any[]).map((m) => ({ ...m })) as ActiveManager[]
  );
  const [leagueInfo, setLeagueInfo] = useState<SleeperLeagueInfo | null>(null);
  const [sleeperRosters, setSleeperRosters] = useState<SleeperRoster[]>([]);
  const [sleeperStatus, setSleeperStatus] =
    useState<SleeperFetchStatus>("idle");
  const [sleeperError, setSleeperError] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchSleeperData() {
      setSleeperStatus("loading");
      setSleeperError(null);

      try {
        const [leagueResponse, usersResponse, rostersResponse] =
          await Promise.all([
            fetch(`https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}`),
            fetch(
              `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/users`
            ),
            fetch(
              `https://api.sleeper.app/v1/league/${SLEEPER_LEAGUE_ID}/rosters`
            ),
          ]);

        if (!leagueResponse.ok || !usersResponse.ok || !rostersResponse.ok) {
          throw new Error("Sleeper division data is unavailable.");
        }

        const [nextLeagueInfo, sleeperUsers, nextRosters] =
          await Promise.all([
            leagueResponse.json() as Promise<SleeperLeagueInfo>,
            usersResponse.json() as Promise<SleeperUser[]>,
            rostersResponse.json() as Promise<SleeperRoster[]>,
          ]);

        if (cancelled) return;

        setLeagueInfo(nextLeagueInfo);
        setSleeperRosters(Array.isArray(nextRosters) ? nextRosters : []);
        setActiveData((currentData) =>
          applySleeperTeamNames(currentData, sleeperUsers)
        );
        setSleeperStatus("ready");
      } catch (error) {
        console.error("Sleeper managers fetch failed:", error);
        if (cancelled) return;
        setSleeperStatus("error");
        setSleeperError(
          error instanceof Error
            ? error.message
            : "Sleeper division data is unavailable."
        );
      }
    }

    if (view === "active" && mounted) fetchSleeperData();

    return () => {
      cancelled = true;
    };
  }, [view, mounted]);

  const divisionGroups = useMemo<DivisionGroup[]>(() => {
    const managerBySleeperId = new Map(
      activeData.map((manager) => [manager.sleeperId, manager])
    );
    const assignedSleeperIds = new Set<string>();
    const groupsById = new Map<string, DivisionGroup>();
    const divisionCount = Number(leagueInfo?.settings?.divisions) || 0;

    for (let divisionId = 1; divisionId <= divisionCount; divisionId += 1) {
      groupsById.set(String(divisionId), {
        id: String(divisionId),
        name: getDivisionName(leagueInfo, divisionId),
        managers: [],
      });
    }

    sleeperRosters.forEach((roster) => {
      if (!roster.owner_id) return;

      const manager = managerBySleeperId.get(roster.owner_id);
      if (!manager) return;

      const divisionId = getRosterDivisionId(roster);
      const groupId = divisionId ? String(divisionId) : "unassigned";

      if (!groupsById.has(groupId)) {
        groupsById.set(groupId, {
          id: groupId,
          name: divisionId ? getDivisionName(leagueInfo, divisionId) : "Unassigned",
          managers: [],
        });
      }

      groupsById.get(groupId)?.managers.push(manager);
      assignedSleeperIds.add(manager.sleeperId);
    });

    activeData.forEach((manager) => {
      if (assignedSleeperIds.has(manager.sleeperId)) return;

      if (!groupsById.has("unassigned")) {
        groupsById.set("unassigned", {
          id: "unassigned",
          name: "Unassigned",
          managers: [],
        });
      }

      groupsById.get("unassigned")?.managers.push(manager);
    });

    return Array.from(groupsById.values()).filter(
      (group) => group.id !== "unassigned" || group.managers.length > 0
    );
  }, [activeData, leagueInfo, sleeperRosters]);

  if (!mounted) return null;

  const sectionCopy = {
    active: {
      title: "League Owners",
      accent: "border-red-600",
      kicker: "Active Legends",
      copy: "Current keepers of River City legacy, rivalries, and weekly chaos.",
    },
    retired: {
      title: "Retired Owners",
      accent: "border-gray-600",
      kicker: "Legacy Wing",
      copy: "Former owners whose teams and seasons still live in the record books.",
    },
    staff: {
      title: "Staff",
      accent: "border-yellow-500",
      kicker: "League Office",
      copy: "The people who keep draft night, league culture, and the room moving.",
    },
  };

  const renderPortraitWall = (
    managers: any[],
    group: ManagerTab
  ) => {
    const section = sectionCopy[group];
    const showDivisionView = group === "active" && activeLayout === "division";

    return (
      <section>
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className={`border-l-4 ${section.accent} pl-4`}>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
              {section.kicker}
            </p>
            <h2 className="text-4xl font-black uppercase italic">
              {section.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
              {section.copy}
            </p>
          </div>

          {group === "active" && (
            <div className="grid w-full grid-cols-2 rounded-lg border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5 sm:w-auto">
              <button
                type="button"
                aria-pressed={activeLayout === "all"}
                onClick={() => setActiveLayout("all")}
                className={`rounded-md px-4 py-2 text-[10px] font-black uppercase transition-all ${
                  activeLayout === "all"
                    ? "bg-red-600 text-white shadow-lg"
                    : "opacity-45"
                }`}
              >
                All Owners
              </button>
              <button
                type="button"
                aria-pressed={activeLayout === "division"}
                onClick={() => setActiveLayout("division")}
                className={`rounded-md px-4 py-2 text-[10px] font-black uppercase transition-all ${
                  activeLayout === "division"
                    ? "bg-red-600 text-white shadow-lg"
                    : "opacity-45"
                }`}
              >
                By Division
              </button>
            </div>
          )}
        </div>

        {showDivisionView ? (
          renderDivisionView()
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {managers.map((manager) => (
              <ManagerPortraitCard
                key={manager.shortName}
                manager={manager}
                group={group}
              />
            ))}
          </div>
        )}
      </section>
    );
  };

  const renderDivisionView = () => {
    if (sleeperStatus === "loading" || sleeperStatus === "idle") {
      return (
        <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-6 text-sm font-bold text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
          Loading current Sleeper divisions...
        </div>
      );
    }

    if (sleeperStatus === "error") {
      return (
        <div className="rounded-2xl border border-red-600/25 bg-red-600/10 p-6">
          <p className="text-sm font-black uppercase tracking-widest text-red-600">
            Division data unavailable
          </p>
          <p className="mt-2 text-sm font-medium text-black/60 dark:text-white/60">
            {sleeperError ||
              "Sleeper could not load the current division assignments."}{" "}
            The All Owners view is still available.
          </p>
        </div>
      );
    }

    if (divisionGroups.length === 0) {
      return (
        <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-6 text-sm font-bold text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
          No current division assignments were found in Sleeper.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {divisionGroups.map((division) => (
          <section
            key={division.id}
            className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/10 pb-4 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/35 dark:text-white/35">
                  Current Division
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase italic">
                  {division.name}
                </h3>
              </div>
              <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase text-white">
                {division.managers.length}
              </span>
            </div>

            {division.managers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {division.managers.map((manager) => (
                  <ManagerPortraitCard
                    key={manager.shortName}
                    manager={manager}
                    group="active"
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-black/15 p-4 text-sm font-bold text-black/45 dark:border-white/15 dark:text-white/45">
                No active owner cards mapped to this division yet.
              </div>
            )}
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300">
      <nav className="border-b border-black/5 dark:border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-start">
          <Link
            href="/"
            aria-label="Back to Home"
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
          >
            <Home size={18} />
          </Link>

          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button type="button" aria-label="Use light theme" onClick={() => setTheme("light")} className={`p-1.5 rounded-md transition-all ${theme === "light" ? "bg-white text-black shadow-sm" : "opacity-40"}`}>
              <Sun size={14} />
            </button>
            <button type="button" aria-label="Use dark theme" onClick={() => setTheme("dark")} className={`p-1.5 rounded-md transition-all ${theme === "dark" ? "bg-white/10 text-white shadow-sm" : "opacity-40"}`}>
              <Moon size={14} />
            </button>
            <button type="button" aria-label="Use system theme" onClick={() => setTheme("system")} className={`p-1.5 rounded-md transition-all ${theme === "system" ? "bg-white/10 text-white shadow-sm" : "opacity-40"}`}>
              <Monitor size={14} />
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-3 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10 sm:flex sm:w-auto">
          <button type="button" aria-pressed={view === "active"} onClick={() => setView("active")} className={`min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all ${view === "active" ? "bg-red-600 text-white shadow-lg" : "opacity-40"}`}>
            Active Owners
          </button>
          <button type="button" aria-pressed={view === "retired"} onClick={() => setView("retired")} className={`min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all ${view === "retired" ? "bg-gray-600 text-white shadow-lg" : "opacity-40"}`}>
            Retired Owners
          </button>
          <button type="button" aria-pressed={view === "staff"} onClick={() => setView("staff")} className={`min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all ${view === "staff" ? "bg-yellow-600 text-white shadow-lg" : "opacity-40"}`}>
            Staff
          </button>
        </div>
      </nav>

      <main className="px-6 py-10 max-w-7xl mx-auto">
        {view === "active" && renderPortraitWall(activeData, "active")}
        {view === "retired" && renderPortraitWall(retiredManagers as any, "retired")}
        {view === "staff" && renderPortraitWall(staffManagers as any, "staff")}
      </main>
    </div>
  );
}
