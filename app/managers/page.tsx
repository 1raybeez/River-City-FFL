"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Home, Sun, Moon, Monitor } from "lucide-react";

import ManagerPortraitCard from "@/components/ManagerPortraitCard";
import { activeManagers } from "@/lib/managers/activeManagers";
import { retiredManagers } from "@/lib/managers/retiredManagers";
import { staffManagers } from "@/lib/managers/staff";
import type { ActiveManager } from "@/lib/types/Manager";

export default function ManagersPage() {
  const [view, setView] = useState<"active" | "retired" | "staff">("active");

  // ⭐ THE FIX: Use "as unknown as any[]" to strip the Read-Only status
  // Then cast it back to ActiveManager[] so your cards still work.
  const [activeData, setActiveData] = useState<ActiveManager[]>(() =>
    ((activeManagers as unknown) as any[]).map((m) => ({ ...m })) as ActiveManager[]
  );

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchSleeperNames() {
      try {
        const leagueId = "1312149033254416384";
        const response = await fetch(
          `https://api.sleeper.app/v1/league/${leagueId}/users`
        );
        const sleeperUsers = await response.json();

        setActiveData((currentData) =>
          currentData.map((manager) => {
            const sleeperUser = sleeperUsers.find(
              (u: any) => u.user_id === manager.sleeperId
            );

            return {
              ...manager,
              teamName:
                sleeperUser?.metadata?.team_name ||
                sleeperUser?.display_name ||
                manager.teamName,
            };
          })
        );
      } catch (error) {
        console.error("Sleeper fetch failed:", error);
      }
    }

    if (view === "active" && mounted) fetchSleeperNames();
  }, [view, mounted]);

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
    group: "active" | "retired" | "staff"
  ) => {
    const section = sectionCopy[group];

    return (
      <section>
        <div className={`mb-10 border-l-4 ${section.accent} pl-4`}>
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {managers.map((manager) => (
            <ManagerPortraitCard
              key={manager.shortName}
              manager={manager}
              group={group}
            />
          ))}
        </div>
      </section>
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
