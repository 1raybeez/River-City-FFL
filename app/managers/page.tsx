"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Home, Sun, Moon, Monitor } from "lucide-react";
import ManagerCards from "@/components/ManagerCardsNEW";
import { activeManagers } from "@/lib/managers/activeManagers";
import { retiredManagers } from "@/lib/managers/retiredManagers";

export default function ManagersPage() {
  const [view, setView] = useState<"active" | "retired">("active");
  const [activeData, setActiveData] = useState(activeManagers);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch for theme-specific UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // SLEEPER API: Pull real-time Team Names for Active Managers
  useEffect(() => {
    async function fetchSleeperNames() {
      try {
        const leagueId = "1312149033254416384"; // 2026 League ID
        const response = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`);
        const sleeperUsers = await response.json();

        const updatedActive = activeManagers.map((manager) => {
          const sleeperUser = sleeperUsers.find((u: any) => u.user_id === manager.sleeperId);
          return {
            ...manager,
            teamName: sleeperUser?.metadata?.team_name || sleeperUser?.display_name || manager.teamName
          };
        });
        setActiveData(updatedActive);
      } catch (error) {
        console.error("Sleeper fetch failed:", error);
      }
    }
    if (view === "active") fetchSleeperNames();
  }, [view]);

  if (!mounted) return null;

  // Logic to separate Damon into the Staff section
  const activeOwners = activeData.filter(m => m.shortName !== "Damon");
  const staffMember = activeData.filter(m => m.shortName === "Damon");

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300">
      
      {/* NAVIGATION BAR - Updated with Home Button and 3-Way Theme Switcher */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          {/* HOME BUTTON */}
          <Link 
            href="/" 
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
          >
            <Home size={18} />
          </Link>
          
          {/* THEME SWITCHER (Light, Dark, Auto) */}
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}
              title="Light Mode"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}
              title="Dark Mode"
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}
              title="Auto/System"
            >
              <Monitor size={14} />
            </button>
          </div>
        </div>
        
        {/* VIEW TOGGLE */}
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
          <button 
            onClick={() => setView("active")}
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
              view === 'active' ? 'bg-red-600 text-white shadow-lg' : 'opacity-40'
            }`}
          >
            Active Owners
          </button>
          <button 
            onClick={() => setView("retired")}
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
              view === 'retired' ? 'bg-gray-600 text-white shadow-lg' : 'opacity-40'
            }`}
          >
            Hall of Fame
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="px-6 py-10 max-w-7xl mx-auto">
        {view === "active" ? (
          <>
            <section className="mb-20">
              <h2 className="text-4xl font-black uppercase italic mb-10 border-l-4 border-red-600 pl-4 tracking-tighter">
                League Owners
              </h2>
              <ManagerCards managers={activeOwners} isRetired={false} />
            </section>

            <section>
              <h2 className="text-4xl font-black uppercase italic mb-10 border-l-4 border-yellow-500 pl-4 tracking-tighter">
                Staff
              </h2>
              <ManagerCards managers={staffMember} isRetired={false} />
            </section>
          </>
        ) : (
          <>
            <section className="mb-20">
              <h2 className="text-4xl font-black uppercase italic mb-10 border-l-4 border-gray-600 pl-4 tracking-tighter">
                Retired Legends
              </h2>
              <ManagerCards managers={retiredManagers} isRetired={true} />
            </section>

            <section>
              <h2 className="text-4xl font-black uppercase italic mb-10 border-l-4 border-yellow-500 pl-4 tracking-tighter">
                Staff
              </h2>
              <ManagerCards managers={staffMember} isRetired={false} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}